import httpx
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.ai.models import DocumentChunk
from app.modules.ai.embeddings import embedding_service
from app.core.config import settings
from app.modules.workspace.models import WorkspaceMember
from app.modules.projects.models import Project, ProjectTask
from app.modules.meetings.models import Meeting
from sqlalchemy import func

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    """
    Splits text into chunks of length `chunk_size` with `overlap` characters.
    """
    chunks = []
    if not text:
        return chunks
        
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunks.append(text[start:end])
        # Increment by step size (chunk_size - overlap)
        if end == text_len:
            break
        start += (chunk_size - overlap)
        
    return chunks

def chunk_and_index_document(
    db: Session, 
    workspace_id: str, 
    document_id: int, 
    title: str, 
    content: str
) -> int:
    """
    Splits document text into overlapping chunks, generates embeddings,
    and indexes them in the database for semantic search.
    Removes any old indexed chunks for this document first.
    """
    # 1. Remove previous chunks for this document (to prevent duplicate entries on re-upload)
    db.query(DocumentChunk).filter(
        DocumentChunk.workspace_id == workspace_id,
        DocumentChunk.source_type == "document",
        DocumentChunk.source_id == str(document_id)
    ).delete()
    
    # Prepend document title to content to enrich context in chunks
    enriched_content = f"Document Title: {title}\n\nContent:\n{content}"
    
    # 2. Split text
    chunks = chunk_text(enriched_content, chunk_size=500, overlap=100)
    
    # 3. Create embeddings & save to DB
    for chunk in chunks:
        vector = embedding_service.get_embedding(chunk)
        db_chunk = DocumentChunk(
            workspace_id=workspace_id,
            source_type="document",
            source_id=str(document_id),
            content=chunk,
            embedding=vector
        )
        db.add(db_chunk)
        
    db.commit()
    return len(chunks)

def semantic_search(
    db: Session, 
    workspace_id: str, 
    query_text: str, 
    limit: int = 5
) -> List[DocumentChunk]:
    """
    Performs cosine similarity search using pgvector on document chunks.
    """
    # 1. Convert search query to embedding vector
    query_vector = embedding_service.get_embedding(query_text)
    
    # 2. Run similarity query on database using pgvector's cosine_distance operator (<=>)
    return db.query(DocumentChunk).filter(
        DocumentChunk.workspace_id == workspace_id
    ).order_by(
        DocumentChunk.embedding.cosine_distance(query_vector)
    ).limit(limit).all()

def get_workspace_live_context(db: Session, workspace_id: str) -> str:
    """
    Sweeps the live database to build a dynamic context of the workspace state.
    Includes: Members count, Team Head, Task counts, and Recent Meetings.
    """
    # 1. Members info
    members = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id).all()
    total_members = len(members)
    team_heads = [m.user.full_name for m in members if m.role in ["Owner", "Admin"]]
    heads_str = ", ".join(team_heads) if team_heads else "None"
    
    # 2. Task info
    projects = db.query(Project).filter(Project.workspace_id == workspace_id).all()
    project_ids = [p.id for p in projects]
    tasks = db.query(ProjectTask).filter(ProjectTask.project_id.in_(project_ids)).all() if project_ids else []
    
    todo_count = sum(1 for t in tasks if t.status == "To Do")
    in_progress_count = sum(1 for t in tasks if t.status == "In Progress")
    review_count = sum(1 for t in tasks if t.status == "In Review")
    done_count = sum(1 for t in tasks if t.status == "Done")
    
    task_details = ""
    for t in tasks:
        assignee_name = t.assignee.full_name if t.assignee else "Unassigned"
        task_details += f"- [{t.status}] {t.title} (Assigned to: {assignee_name})\n"
    
    # 3. Meetings info
    recent_meetings = db.query(Meeting).filter(Meeting.workspace_id == workspace_id).order_by(Meeting.scheduled_at.desc()).limit(3).all()
    meetings_context = ""
    for m in recent_meetings:
        meetings_context += f"- {m.title} (Status: {m.status})\n"
        if m.note and m.note.summary:
            meetings_context += f"  Summary: {m.note.summary}\n"
            
    # Combine
    live_context = (
        f"--- LIVE WORKSPACE STATE ---\n"
        f"Total Team Members: {total_members}\n"
        f"Team Heads / Admins: {heads_str}\n"
        f"Project Tasks State: {todo_count} To Do, {in_progress_count} In Progress, {review_count} In Review, {done_count} Done.\n"
        f"Detailed Task Assignments:\n{task_details if task_details else 'No tasks assigned yet.'}\n"
        f"Recent Meetings:\n{meetings_context if recent_meetings else 'No recent meetings.'}\n"
        f"----------------------------\n"
    )
    return live_context

def query_ai_brain(db: Session, workspace_id: str, question: str) -> Dict[str, Any]:
    """
    Retrieves relevant database context and calls Groq Llama 3 to generate a response (RAG).
    """
    # 1. Retrieve the top 5 context chunks
    matching_chunks = semantic_search(db, workspace_id, question, limit=5)
    
    # 2. Construct context string
    context_list = []
    sources = []
    if matching_chunks:
        for chunk in matching_chunks:
            context_list.append(chunk.content)
            sources.append({
                "source_type": chunk.source_type,
                "source_id": chunk.source_id,
                "content": chunk.content[:150] + "..." # Truncate for summary reference
            })
            
    context_str = "\n---\n".join(context_list) if context_list else "No document context available."
    
    # 3. Check if Groq API key is valid / set up
    is_mock = (settings.GROQ_API_KEY == "your_groq_api_key_here" or not settings.GROQ_API_KEY)
    
    if is_mock:
        print("[MOCK INTERACTION] Groq API key is unconfigured. Generating mock RAG answer...")
        mock_answer = (
            f"Mock AI Brain Answer:\nBased on the retrieved context, your question about '{question}' relates to "
            f"workspace documents. (Retrieved {len(matching_chunks)} chunks). In a real setup, Groq Llama 3 would parse this context."
        )
        return {
            "question": question,
            "answer": mock_answer,
            "sources": sources
        }
        
    # 4. Call Groq API
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    system_prompt = (
        "You are SynapseIQ, the AI Knowledge Brain of this organization. "
        "SynapseIQ is an advanced workspace collaboration platform. Features include: "
        "Dashboard Analytics, Channel Chats (real-time messaging), Projects & Kanban (task tracking), "
        "Document Storage (with pgvector AI indexing), and Intelligent Meetings (Jitsi video with AI transcription/summaries). "
        "Your task is to answer the user's question using ONLY the provided context. "
        "If you do not know the answer based on the context, state that you do not have enough information."
    )
    live_state_context = get_workspace_live_context(db, workspace_id)
    user_prompt = f"Live Database Metrics:\n{live_state_context}\n\nDocument Context:\n{context_str}\n\nQuestion: {question}\n\nAnswer:"
    
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2
    }
    
    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=15.0)
        if response.status_code != 200:
            raise ValueError(f"Groq API error: {response.text}")
            
        result = response.json()
        answer = result["choices"][0]["message"]["content"]
        
    except Exception as e:
        print(f"[ERROR calling Groq RAG]: {e}")
        answer = "I encountered an error trying to process the answer via Groq. Please verify API configurations."
        
    return {
        "question": question,
        "answer": answer,
        "sources": sources
    }
