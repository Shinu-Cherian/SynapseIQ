# Contributing to SynapseIQ

Welcome! We are building SynapseIQ as a high-performance, AI-driven modular monolith that transitions to microservices. 

## Development Workflow

1. **Local Infrastructure**:
   - Spin up PostgreSQL (with pgvector) and Redis using Docker Compose:
     ```bash
     docker-compose up -d
     ```
2. **Backend (FastAPI)**:
   - Create a Python virtual environment:
     ```bash
     cd backend
     python -m venv venv
     source venv/Scripts/activate # On Windows: venv\Scripts\activate
     pip install -r requirements.txt
     ```
   - Copy `.env.example` to `.env` and fill in local secrets.
   - Run local server:
     ```bash
     uvicorn app.main:app --reload
     ```
3. **Frontend (Next.js)**:
   - Go to frontend directory, install dependencies, and run dev server:
     ```bash
     cd frontend
     npm install
     npm run dev
     ```

## Coding Standards

- **TypeScript**: Use strict mode. Avoid `any` types.
- **Python**: Follow PEP 8 guidelines. Write type hints for all function arguments and return types. Use Pydantic for validation.
- **Git Commit Messages**: Use clear semantic commit messages (e.g., `feat: Add login API`, `fix: Resolve token expiration issue`).
