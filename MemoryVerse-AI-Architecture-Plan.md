# MemoryVerse AI — Architecture & Feature Plan
### "The Personal AI Brain for Students" — Wooble MemoryVerse AI '26

---

## 1. Positioning: How We Win the Room

Judges will see 15–20 submissions that store files and tag them with an LLM call. That's table stakes. The submissions that place will be the ones where **the AI clearly understands the person, not just the documents.**

Our wedge: most teams will build a **file organizer with AI labels**. We build a **career graph with a conversational front door**. The difference shows up in the first 60 seconds of the demo — instead of "here's my upload page," we open on a question typed into a search bar: *"What am I ready for?"* and the system answers with a synthesized narrative, backed by citations to real uploaded documents, plus a live graph lighting up behind it.

Three things must be true for this to feel real and not staged:
1. The categorization/extraction is **actually run on the uploaded file**, not hardcoded.
2. The relationships in the graph are **derived from extracted entities**, not manually authored.
3. Retrieval answers **cite the source document** and let the user open the original file instantly.

Everything below is designed around those three constraints.

---

## 2. Recommended Tech Stack

The brief's "preferred stack" is reasonable but has a few soft spots for a time-boxed hackathon. Recommendation below, with reasoning — swap back to the preferred stack anywhere you're more comfortable, the architecture doesn't change.

| Layer | Preferred (brief) | Recommended | Why change (or not) |
|---|---|---|---|
| Frontend | React + Vite + TS | **Keep** — React + Vite + TypeScript + Tailwind | No reason to deviate; fast dev loop, judges expect it |
| Animation | Framer Motion | **Keep** | Best-in-class for the "premium SaaS" feel |
| Graph viz | React Flow | **Keep** for the relationship graph; add **d3-force** only if React Flow's layout feels too rigid | React Flow gives you draggable nodes + edges out of the box, which reads as "polished" fast |
| Backend | FastAPI / Node | **FastAPI (Python)** | Python's document-parsing ecosystem (pdfplumber, python-docx, PyMuPDF, pytesseract) is far ahead of Node's for OCR/parsing — this is the core of your AI pipeline, don't fight your language choice here |
| Auth + DB | Firebase or Supabase | **Supabase (Postgres)** | You get relational tables (needed for the relationship engine's structured edges) *and* pgvector in one Postgres instance — no separate vector DB to provision, one connection string, one admin panel. This alone can save you 3-4 hours of hackathon time |
| Vector store | ChromaDB / Pinecone | **Supabase pgvector** (fallback: local Chroma if Supabase quota is a concern) | Avoids a second service; embeddings and structured metadata live in the same query |
| LLM | Gemini API | **Keep Gemini** (1.5 Flash for extraction/classification, Pro for the narrative/chat layer) | Flash is fast+cheap enough to run on every upload; Pro reserved for user-facing chat answers where quality matters most |
| OCR | — | **Tesseract via pytesseract**, fallback to Gemini vision for messy/handwritten certificates | Free, offline-capable, good enough for printed certificates; Gemini vision as the "smart fallback" is itself a good judge-facing talking point |
| File storage | — | **Supabase Storage** | Same project, signed URLs, trivial to wire to "open original file" buttons |
| Deployment | — | **Vercel (frontend) + Railway or Render (FastAPI backend)** | Both have generous free tiers and near-zero-config deploys — you want a live link, not just localhost, for the demo |

**Net effect of these changes:** one Postgres database instead of Postgres + separate vector DB + separate auth provider. Fewer moving parts = fewer things that break during the live demo = more time for polish.

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  Upload UI · Dashboard · Timeline · Knowledge Graph · Chat/Search│
└───────────────────────────┬───────────────────────────────────────┘
                             │ REST / WebSocket
┌───────────────────────────▼───────────────────────────────────────┐
│                      BACKEND (FastAPI)                            │
│                                                                     │
│  ┌───────────────┐   ┌────────────────┐   ┌─────────────────────┐│
│  │ Ingestion API │──▶│ Extraction      │──▶│ Categorization       ││
│  │ (upload,      │   │ Pipeline        │   │ Engine (LLM +        ││
│  │ file storage) │   │ (OCR/parse)     │   │ rules)               ││
│  └───────────────┘   └────────────────┘   └──────────┬──────────┘│
│                                                        │            │
│  ┌───────────────┐   ┌────────────────┐   ┌───────────▼──────────┐│
│  │ Retrieval /   │◀──│ Embedding +     │◀──│ Relationship Engine   ││
│  │ Chat API      │   │ Vector Index    │   │ (entity linking,      ││
│  │ (RAG)         │   │ (pgvector)      │   │ graph builder)        ││
│  └───────────────┘   └────────────────┘   └───────────────────────┘│
└───────────────────────────┬───────────────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────────────┐
│                    SUPABASE (Postgres + pgvector + Storage)        │
│  documents · entities · relationships · embeddings · users · files │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow for one upload, end to end:**

1. File hits `/upload` → stored in Supabase Storage, row created in `documents` (status: `processing`).
2. Background task: OCR/parse → raw text.
3. Gemini Flash call #1 — **classification**: which category (certificate, resume, project report, internship letter, other) + document-type-specific fields (issuer, date, skills mentioned, role, duration).
4. Gemini Flash call #2 — **entity extraction**: pull out structured entities (skills, tools, organizations, dates, project names) as JSON.
5. Entities are upserted into `entities` table; new relationship edges are inferred (e.g., "Python Certification" issued → creates/strengthens edge to skill node "Python"; skill node "Python" links to any project entity mentioning Python).
6. Full text + summary embedded and stored in `embeddings` (pgvector).
7. Document status → `ready`; frontend gets a push (WebSocket or polling) and the timeline/graph update live — **this live update is a strong demo beat**, don't skip it for a static "refresh page" flow.

---

## 4. Database Schema (core tables)

```sql
users(id, email, name, created_at)

documents(
  id, user_id, filename, storage_path, category,        -- resume/cert/project/internship/other
  raw_text, summary, issued_date, source_type,           -- upload/link
  status,                                                 -- processing/ready/error
  created_at
)

entities(
  id, user_id, type,        -- skill/organization/project/role
  name, normalized_name,    -- "python", "reactjs" — dedupes "Python" vs "python"
  first_seen_at
)

document_entities(document_id, entity_id, confidence, context_snippet)

relationships(
  id, user_id, source_entity_id, target_entity_id,
  relation_type,             -- certifies/uses/led_to/part_of
  strength, evidence_document_id
)

embeddings(id, document_id, chunk_text, embedding vector(768))

timeline_events(id, user_id, document_id, event_date, title, category)
```

This schema is the backbone that makes Modules 2–5 *fall out* of Module 1 instead of being separately hand-built — categorization, the graph, the timeline, and search all read from the same normalized tables.

---

## 5. Module-by-Module Plan

### Module 1 — AI Data Ingestion
- Drag-and-drop multi-file upload with live per-file progress (queued → parsing → classifying → ready).
- Accept PDF, DOCX, images (JPG/PNG for scanned certs), and portfolio/GitHub URLs.
- For URLs: lightweight scraper + GitHub API call to pull repo metadata (languages, README, stars, commit activity) — this becomes real signal for the relationship engine, not just a stored link.

### Module 2 — Intelligent Categorization
- Two-stage classification: fast rule-based pre-filter (filename/keyword heuristics) + LLM confirmation, so obvious cases don't waste a full LLM call.
- Category-specific extraction schemas (a certificate extracts `issuer/skill/date`; a resume extracts `roles/skills/education/projects`).
- Confidence score surfaced in UI; low-confidence items get a "Confirm category" nudge — this is also a good judge talking point: **the system knows what it doesn't know.**

### Module 3 — Relationship Engine
- Entity normalization (map "React.js", "ReactJS", "React" → one node) using embedding similarity, not just string match.
- Edge inference rules layered on top of LLM output: `Certification --certifies--> Skill`, `Skill --used_in--> Project`, `Project --built_during--> Internship`, `Internship --leads_to--> Career Path` (career path inferred from cumulative skill/role clusters).
- Store `evidence_document_id` on every edge so the graph is always explainable — click an edge, see the document that justified it.

### Module 4 — Digital Journey Timeline
- Auto-generated from `timeline_events`, grouped by year, with category color-coding.
- Each node expands to show the source document + a one-line AI-generated "why this mattered" caption (e.g., "This certification led to your first ML project six months later").
- This causal captioning is a stretch feature worth prioritizing — it's what turns a timeline from a list into a story.

### Module 5 — Smart Retrieval System
- Hybrid search: pgvector semantic search + metadata filters (category, date range) combined in one query.
- Natural-language queries answered via RAG: retrieve top-k chunks → Gemini Pro synthesizes an answer **with inline references** to specific documents → "Open original" button next to every citation.
- Optional voice input (Web Speech API) — cheap to add, high demo impact, low engineering risk.

---

## 6. Feature Prioritization (Judge-Impact Filter Applied)

Every feature from the brief's brainstorm, scored honestly — build top-down, cut from the bottom if time runs out.

**Tier 1 — Must build (core loop, can't demo without these):**
1. Real ingestion + OCR/parsing (not mocked)
2. Real categorization with visible confidence
3. Relationship graph (React Flow) built from real extracted entities
4. Timeline generated from real documents
5. RAG-based natural language search with source citation + "open original"

**Tier 2 — High impact, build if Tier 1 is solid:**
6. AI-generated career summary (one paragraph, regenerated as new documents arrive)
7. GitHub repo analysis feeding into skill entities
8. Duplicate/near-duplicate document detection (embedding similarity threshold) — practical *and* shows technical depth
9. AI chat assistant over the whole corpus (this is really Module 5's RAG wearing a chat UI — cheap to add once retrieval works)

**Tier 3 — Nice-to-have, only if ahead of schedule:**
10. Skill evolution chart over time (recharts line/area chart from `entities.first_seen_at`)
11. Portfolio quality scoring (rubric-based, LLM-scored against a checklist)
12. Voice search
13. AI recommendations for missing skills (compare user's skill graph against a target-role skill template)

**Cut unless someone begs:** resume version history, full AI portfolio *generator* (as opposed to summary) — high effort, moderate marginal wow given everything above.

---

## 7. UI/UX Direction

- **Dark theme**, glassmorphism panels, one accent gradient (violet → cyan, matching the event's own poster — nice subtle callback to the hackathon branding itself).
- Landing/dashboard opens on the **search bar + summary card**, not an upload form — uploading is a secondary action reachable from a persistent "+" button, so the demo can open on the "wow" moment immediately.
- Graph and timeline share a consistent node color language (category → color) so a judge's eye can jump between views without relearning a legend.
- Every AI output (category, extracted entity, generated caption) gets a small "AI" badge + confidence dot — reinforces that this is real inference, not static content.

---

## 8. Suggested Build Order (for a ~14-day window)

| Days | Focus |
|---|---|
| 1–2 | Schema + Supabase setup, auth, file upload + storage working end-to-end |
| 3–5 | Parsing/OCR pipeline + classification + entity extraction (Tier 1, items 1–2) |
| 6–8 | Relationship engine + graph UI (item 3) |
| 9–10 | Timeline (item 4) |
| 11–12 | RAG search + citations (item 5) |
| 13 | Tier 2 features as time allows, polish, animations |
| 14 | Demo script, video recording, README, architecture diagram, thought-process sheet |

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| OCR fails on messy/handwritten certificates | Gemini-vision fallback path; show this fallback live in the demo as a feature, not hide it as a bug |
| LLM extraction is inconsistent across document types | Strict JSON schema per category + retry-on-invalid-JSON logic |
| Live demo relies on network/API uptime | Pre-load one seeded demo account with real processed data as a fallback path if live upload misbehaves |
| Scope creep into Tier 3 features before Tier 1 is solid | Don't touch Tier 2/3 until every Tier 1 item works on a real, previously-unseen file |

---

## Next Steps

I can turn any section of this into its own deliverable:
- The **architecture diagram** as a clean visual (for your submission's required diagram)
- A **README** template for the GitHub repo
- The **thought-process sheet** as a standalone write-up
- Actual **starter code** for the FastAPI ingestion pipeline or the React Flow graph component

Just say which one to do next.
