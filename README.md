# 🧠 MemoryVerse AI

> **Your Journey, Understood.**

MemoryVerse AI is an AI-powered career intelligence platform that transforms scattered career documents into an intelligent digital knowledge base.

Instead of simply storing resumes, certificates, internship letters, and project reports, MemoryVerse AI understands them using Google Gemini AI, extracts meaningful entities, builds relationships between them, visualizes career growth through an interactive Knowledge Graph and Timeline, and enables semantic search with an AI-powered assistant.

---

# 🚀 Overview

Students and professionals accumulate resumes, certificates, internship letters, project reports, and achievements across multiple platforms.

Traditional storage solutions only save documents—they do not understand them.

MemoryVerse AI solves this problem by converting unstructured documents into structured career intelligence that can be searched, visualized, and explored naturally.

---

# ✨ Key Features

- 📄 Smart Document Upload (PDF, DOCX, Images)
- 🤖 AI-powered Document Understanding
- 🧠 Automatic Entity Extraction
- 🌐 Interactive Knowledge Graph
- 📅 Career Timeline Generation
- 💬 AI Career Summary
- 🔎 Semantic Search
- 💡 AI Chat Assistant (RAG)
- 📊 Interactive Dashboard
- ☁️ Secure Cloud Storage

---

# ⚙️ How It Works

```text
Upload Career Document
          │
          ▼
OCR & Text Extraction
          │
          ▼
Google Gemini AI
          │
          ▼
Entity Extraction
(Skills, Projects, Organizations,
Certifications, Technologies, Dates)
          │
          ▼
Relationship Mapping
          │
          ▼
Supabase Database
          │
     ┌────┴────┐
     ▼         ▼
Knowledge    Timeline
 Graph
     │
     ▼
Semantic Search
     │
     ▼
AI Chat Assistant
```

---

# 🏗️ System Architecture

```
React + TypeScript + Vite
            │
            ▼
      FastAPI Backend
            │
            ▼
     Google Gemini AI
            │
            ▼
 Entity & Relationship Extraction
            │
            ▼
 Supabase PostgreSQL + Storage
            │
     ┌──────┴──────┐
     ▼             ▼
Knowledge Graph  Timeline
            │
            ▼
 Semantic Search (RAG)
            │
            ▼
      AI Chat Assistant
```

---

# 🛠️ Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Flow

## Backend

- Python
- FastAPI

## Artificial Intelligence

- Google Gemini API
- OCR
- Gemini Embeddings
- Retrieval-Augmented Generation (RAG)

## Database

- Supabase PostgreSQL

## Storage

- Supabase Storage

---

# 📁 Project Structure

```
backend/
│── main.py
│── ai.py
│── database.py
│── requirements.txt

frontend/
│── src/
│   ├── main.tsx
│   ├── pages.tsx
│   ├── components.tsx
│   ├── lib.ts
│   └── styles.css

README.md
MemoryVerse-AI-Architecture-Plan.md
```

---

# 🚀 Setup

## 1. Clone Repository

```bash
git clone <repository-url>
cd MemoryVerse-AI
```

---

## 2. Backend

```bash
cd backend

python -m venv .venv

pip install -r requirements.txt

uvicorn main:app --reload
```

---

## 3. Frontend

```bash
cd frontend

npm install

npm run dev
```

---

## 4. Configure Environment Variables

Create a `.env` file inside the backend directory and configure:

```
SUPABASE_URL=

SUPABASE_SERVICE_KEY=

GEMINI_API_KEY=
```

---

# 📷 Application Preview

Add screenshots of:

- Dashboard
- Upload Page
- Knowledge Graph
- Timeline
- AI Career Summary
- AI Chat Assistant

---

# 💡 Innovation

Unlike conventional document storage systems, MemoryVerse AI understands the meaning behind every uploaded career document.

The platform automatically discovers relationships between projects, skills, organizations, certifications, internships, and achievements, enabling users to visualize and explore their complete career journey through AI-powered insights.

---

# 🔮 Future Scope

- Resume Optimizer
- AI Portfolio Generator
- Job Recommendation System
- Skill Gap Analysis
- Recruiter Dashboard
- Mobile Application
- Career Progress Prediction

---

# 🎯 Target Users

- Students
- Fresh Graduates
- Professionals
- Universities
- Recruiters

---

# 📄 Documentation

- Project Documentation
- Architecture Document
- Presentation Deck
- Demo Video

---

# 🏆 Hackathon

**Submitted for**

## MemoryVerse AI '26

**Powered by Wooble**

---

# 👨‍💻 Developed By

**Yuvanesh RS**

---

## ⭐ If you found this project interesting, please consider giving it a star.