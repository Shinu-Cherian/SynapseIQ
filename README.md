# SynapseIQ — The AI Brain of Your Organization

SynapseIQ is an AI-powered Organizational Intelligence Platform that combines team collaboration, project management, knowledge management, meeting intelligence, employee onboarding, and organizational memory into a unified platform.

---

## Technical Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS, Zustand, Axios
- **Backend**: Python, FastAPI, SQLAlchemy, Alembic, Pydantic
- **Database**: PostgreSQL (with `pgvector` for vector semantic search)
- **Caching & Rate Limiting**: Redis
- **Event Streaming**: Apache Kafka (to be integrated during scaling phases)
- **AI Integrations**: Groq API (LLM QA & Whisper Speech-to-Text)
- **File Storage**: AWS S3 (for documents, files, and meeting transcripts)
- **Infrastructure**: Docker, Kubernetes, AWS, GitHub Actions

---

## System Architecture

SynapseIQ is built as a **Modular Monolith** in Phase 1 to allow rapid development, easy code organization, and simple deployment. The modules are strictly isolated to allow a seamless transition to a microservice architecture in Phase 2.

For a detailed breakdown of the system design and module communication boundaries, see [ARCHITECTURE.md](file:///c:/Users/User/Desktop/SynapseIQ/ARCHITECTURE.md).

---

## Folder Structure

```
SynapseIQ/
├── backend/            # FastAPI Python Modular Monolith
├── frontend/           # Next.js Frontend Application
├── docs/               # Detailed documentation & Interview notes
├── docker-compose.yml  # Local services (PostgreSQL, Redis)
└── README.md           # Main project description
```

---

## Local Development Setup

### 1. Prerequisites
Ensure you have the following installed:
- [Docker & Docker Compose](https://www.docker.com/)
- [Python 3.10+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/)

### 2. Run Database & Cache Services
Spin up local PostgreSQL and Redis containers:
```bash
docker-compose up -d
```

### 3. Setup Backend
Instructions for setting up the FastAPI server can be found in [CONTRIBUTING.md](file:///c:/Users/User/Desktop/SynapseIQ/CONTRIBUTING.md).

---

## Learning Logs & Documentation

We maintain educational documents detailing every tool, library, and system design choice in the [docs/](file:///c:/Users/User/Desktop/SynapseIQ/docs/) directory. If you are preparing for a software engineering interview, start with:
- [docs/Docker.md](file:///c:/Users/User/Desktop/SynapseIQ/docs/Docker.md) - Deep dive on Docker, Docker Compose, and interview questions.
