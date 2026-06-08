# System Design & Database Selection Guide

This document discusses the fundamentals of database design, comparing SQL vs. NoSQL systems, and details why we choose PostgreSQL and `pgvector` for SynapseIQ.

---

## 1. SQL vs. NoSQL Databases

Choosing the right database architecture is one of the most critical decisions in system design.

| Feature | Relational Databases (SQL) | Non-Relational Databases (NoSQL) |
| :--- | :--- | :--- |
| **Structure** | Strict table schemas with rows and columns. | Document, Key-Value, Columnar, or Graph schemas. |
| **Relations** | Supports joins across tables via Foreign Keys. | Designed for denormalized data (joins are slow or unsupported). |
| **ACID Rules** | High ACID compliance (Strict Transactional Safety). | Focuses on BASE properties (Eventual Consistency, High Availability). |
| **Scaling** | Typically scaled **Vertically** (larger CPU/RAM). | Scaled **Horizontally** (sharding across multiple nodes). |
| **Use Case** | Financial applications, SaaS ERPs, User-Relations. | Real-time chat history, logs, analytics, catalogs. |

### ACID Compliance Explained
For transactional integrity, SQL databases enforce ACID properties:
* **Atomicity**: Either the entire transaction succeeds, or the database rolls back to its pre-transaction state (All-or-Nothing).
* **Consistency**: Transactions only write data that matches defined constraints (e.g., uniqueness, foreign keys).
* **Isolation**: Concurrent transactions execute independently without interfering with each other.
* **Durability**: Once a transaction is committed, it remains saved even in the event of a system crash.

---

## 2. Why PostgreSQL for SynapseIQ?

PostgreSQL is a powerful, open-source object-relational database. For a complex platform like SynapseIQ, it is the best match because:
1. **Complex Schemas**: We have highly interconnected entities (Workspaces, Projects, Chats, Users, Meetings). SQL Joins make referencing these simple and fast.
2. **ACID Transactions**: Financial/security actions (like role changes or workspace ownership transfers) must be atomic.
3. **pgvector Support**: We can run vector semantic search natively inside PostgreSQL, saving us the complexity of setting up and paying for an external vector database (like Pinecone or Milvus).

---

## 3. What is pgvector & Vector Search?

In AI applications, documents, chats, and meetings are converted by embedding models into arrays of numbers called **Vector Embeddings**. 

```
"What APIs exist in ReachFlow AI?" ──[Embedding Model]──> [ 0.12, -0.43, 0.98, ... (1536 dimensions) ]
```

* Embeddings capture semantic meaning. Words that are contextually close (e.g., "authentication" and "login") will have vectors that point in similar directions in multi-dimensional space.
* **Vector Search** calculates the distance (e.g., Cosine Similarity) between the search question vector and document vectors in the database to find the closest matches.
* **pgvector** is an extension for PostgreSQL that adds a `vector` data type and search index capability (IVFFlat or HNSW indexes), allowing us to store and query vectors natively using SQL.

```sql
-- Example SQL Query to find the top 5 most similar chunks
SELECT content, 1 - (embedding <=> :query_embedding) AS similarity
FROM document_chunks
ORDER BY embedding <=> :query_embedding
LIMIT 5;
```

---

## 4. Software Engineering Interview Questions

### Q1: What is the CAP Theorem?
> **Answer**: The CAP Theorem states that a distributed system can guarantee at most two of the following three properties:
> * **Consistency**: Every read receives the most recent write or an error.
> * **Availability**: Every request receives a non-error response (without a guarantee that it contains the most recent write).
> * **Partition Tolerance**: The system continues to operate despite arbitrary message loss or system partitions.
> *In practice, networks are never 100% reliable, so Partition Tolerance (P) is mandatory. System designers must choose between Consistency (C) vs Availability (A).*

### Q2: What is the difference between Indexing and Sharding?
> **Answer**:
> * **Indexing**: Optimizes query read speed *inside a single database node* by creating search tree structures (like B-Trees) on specific columns.
> * **Sharding**: A horizontal database scaling technique where the dataset is split and distributed across *multiple independent database servers* (shards) based on a partition key (e.g. workspace ID).

### Q3: When would you choose NoSQL over SQL?
> **Answer**: Choose NoSQL when:
> 1. You have unstructured or semi-structured data (e.g., nested JSON data).
> 2. You need horizontal scaling for massive read/write throughput (e.g., social feeds or clickstream tracking).
> 3. Strict schema validation is not required, and consistency can be eventual.
