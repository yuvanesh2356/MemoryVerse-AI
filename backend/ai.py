"""
ai.py — every external AI call lives here: OCR, extraction, categorization,
embeddings, relationship inference, RAG synthesis, career summary.
Isolated so API keys + prompt engineering never leak into routes or db code.
"""
import os
import io
import json
import fitz  # PyMuPDF
import docx
import pytesseract
from PIL import Image
import google.generativeai as genai

import database as db

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))

FLASH = "gemini-2.5-flash"
PRO = "gemini-2.5-flash"
EMBED_MODEL = "models/gemini-embedding-001"

RELATION_RULES = {
    ("certificate", "skill"): "certifies",
    ("skill", "project"): "used_in",
    ("project", "internship"): "built_during",
    ("internship", "role"): "leads_to",
}

# ---------------------------------------------------------------------------
# 1. Text extraction (OCR / parsing)
# ---------------------------------------------------------------------------

def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = filename.lower().rsplit(".", 1)[-1]
    try:
        if ext == "pdf":
            return _extract_pdf(file_bytes)
        if ext in ("docx",):
            return _extract_docx(file_bytes)
        if ext in ("png", "jpg", "jpeg", "webp"):
            return _extract_image(file_bytes)
        return file_bytes.decode("utf-8", errors="ignore")
    except Exception:
        # last-resort fallback: hand the raw bytes to Gemini vision
        return _gemini_vision_fallback(file_bytes, filename)


def _extract_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = "\n".join(page.get_text() for page in doc)
    if len(text.strip()) < 30:  # scanned/image PDF — OCR each page
        text = "\n".join(
            pytesseract.image_to_string(
                Image.open(io.BytesIO(page.get_pixmap(dpi=200).tobytes("png")))
            ) for page in doc
        )
    return text


def _extract_docx(file_bytes: bytes) -> str:
    d = docx.Document(io.BytesIO(file_bytes))
    return "\n".join(p.text for p in d.paragraphs)


def _extract_image(file_bytes: bytes) -> str:
    img = Image.open(io.BytesIO(file_bytes))
    text = pytesseract.image_to_string(img)
    if len(text.strip()) < 15:  # handwritten / messy — smart fallback
        return _gemini_vision_fallback(file_bytes, "image.png")
    return text


def _gemini_vision_fallback(file_bytes: bytes, filename: str) -> str:
    model = genai.GenerativeModel(FLASH)
    mime = "application/pdf" if filename.endswith("pdf") else "image/png"
    resp = model.generate_content([
        "Transcribe all visible text from this document exactly as written.",
        {"mime_type": mime, "data": file_bytes},
    ])
    return resp.text or ""


# ---------------------------------------------------------------------------
# 2. Categorization + structured extraction (one Gemini call, strict JSON)
# ---------------------------------------------------------------------------

EXTRACTION_PROMPT = """You are a document analyst for a student's career archive.
Read the document text below and return ONLY valid JSON (no markdown fences, no prose) with this exact shape:

{{
  "category": "resume" | "certificate" | "project_report" | "internship_letter" | "other",
  "confidence": 0.0-1.0,
  "title": "short human title for this document",
  "issuer_or_org": "organization name if present, else null",
  "event_date": "YYYY-MM-DD if a clear date is present, else null",
  "summary": "one sentence summary",
  "skills": ["list", "of", "skills", "mentioned"],
  "projects": ["list", "of", "project", "names", "mentioned"],
  "roles": ["list", "of", "job/internship/leadership", "titles", "mentioned"]
}}

Document text:
---
{text}
---
"""


def classify_and_extract(text: str) -> dict:
    model = genai.GenerativeModel(FLASH)
    prompt = EXTRACTION_PROMPT.format(text=text[:12000])
    resp = model.generate_content(prompt)
    raw = resp.text.strip().strip("`").removeprefix("json").strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # one retry with an explicit repair instruction
        repair = genai.GenerativeModel(FLASH).generate_content(
            f"The following is malformed JSON. Return ONLY the corrected valid JSON:\n{raw}"
        )
        return json.loads(repair.text.strip().strip("`").removeprefix("json").strip())


# ---------------------------------------------------------------------------
# 3. Embeddings
# ---------------------------------------------------------------------------

def embed_text(text: str) -> list:
    result = genai.embed_content(
        model=EMBED_MODEL,
        content=text[:8000]
    )

    print("Embedding API response:", result)

    if isinstance(result, dict):
        return result["embedding"]

    return result.embedding


def embed_query(text: str) -> list:
    result = genai.embed_content(
        model=EMBED_MODEL,
        content=text
    )

    if isinstance(result, dict):
        return result["embedding"]

    return result.embedding


def chunk_text(text: str, size: int = 1000, overlap: int = 150) -> list:
    chunks, i = [], 0
    while i < len(text):
        chunks.append(text[i:i + size])
        i += size - overlap
    return chunks or [text]


# ---------------------------------------------------------------------------
# 4. Relationship inference
# ---------------------------------------------------------------------------

def infer_relationships(document_id: str, category: str, extracted: dict):
    """Upsert entities from this document and wire up edges."""

    cat_map = {
        "resume": "resume",
        "certificate": "certificate",
        "project_report": "project",
        "internship_letter": "internship",
    }

    skill_ids = [db.upsert_entity(s, "skill")["id"] for s in extracted.get("skills", [])]
    project_ids = [db.upsert_entity(p, "project")["id"] for p in extracted.get("projects", [])]
    role_ids = [db.upsert_entity(r, "role")["id"] for r in extracted.get("roles", [])]

    for sid in skill_ids:
        db.link_document_entity(document_id, sid, 0.85, extracted.get("summary", ""))

    for pid in project_ids:
        db.link_document_entity(document_id, pid, 0.85, extracted.get("summary", ""))

    doc_category = cat_map.get(category)

    # Resume
    if doc_category == "resume":
        for sid in skill_ids:
            for pid in project_ids:
                db.insert_relationship(
                    sid,
                    pid,
                    "used_in",
                    document_id
                )

        for pid in project_ids:
            for rid in role_ids:
                db.insert_relationship(
                    pid,
                    rid,
                    "built_during",
                    document_id
                )

    # Certificate
    if doc_category == "certificate":
        for sid in skill_ids:
            db.insert_relationship(
                sid,
                sid,
                "certifies",
                document_id
            )

    # Project
    if doc_category == "project":
        for sid in skill_ids:
            for pid in project_ids:
                db.insert_relationship(
                    sid,
                    pid,
                    "used_in",
                    document_id
                )

    # Internship
    if doc_category == "internship":
        for pid in project_ids:
            for rid in role_ids:
                db.insert_relationship(
                    pid,
                    rid,
                    "built_during",
                    document_id
                )

        for rid in role_ids:
            career = db.upsert_entity(
                f"Career path: {extracted.get('issuer_or_org', 'role')}",
                "role"
            )
            db.insert_relationship(
                rid,
                career["id"],
                "leads_to",
                document_id
            )

# ---------------------------------------------------------------------------
# 5. Timeline captioning
# ---------------------------------------------------------------------------

def caption_timeline_event(title: str, category: str, prior_titles: list) -> str:
    model = genai.GenerativeModel(FLASH)
    context = "; ".join(prior_titles[-5:]) or "no prior history"
    prompt = (f"In one short sentence (max 18 words), explain why '{title}' ({category}) "
              f"mattered in this person's growth, given earlier history: {context}. "
              "Be specific and causal if possible, otherwise just state its significance.")
    return model.generate_content(prompt).text.strip()


# ---------------------------------------------------------------------------
# 6. RAG search / chat
# ---------------------------------------------------------------------------

RAG_PROMPT = """You are the user's personal career archive assistant. Answer the question using ONLY the
context chunks below. Cite which document each fact comes from using [n] matching the chunk numbers.
If the context doesn't contain the answer, say so honestly.

Question: {question}

Context:
{context}
"""


def rag_answer(question: str) -> dict:
    q_embedding = embed_query(question)
    matches = db.vector_search(q_embedding, match_count=6)
    context = "\n\n".join(f"[{i+1}] {m['chunk_text'][:600]}" for i, m in enumerate(matches))
    model = genai.GenerativeModel(PRO)
    resp = model.generate_content(RAG_PROMPT.format(question=question, context=context or "No documents yet."))
    return {"answer": resp.text.strip(), "sources": matches}


# ---------------------------------------------------------------------------
# 7. Career summary
# ---------------------------------------------------------------------------

def generate_career_summary(documents: list) -> str:
    if not documents:
        return "Upload your first document to generate a career summary."

    corpus = "\n".join(
        f"- {d.get('category')}: {d.get('summary','')}"
        for d in documents
    )

    try:
        model = genai.GenerativeModel(PRO)

        prompt = f"""
You are writing a professional portfolio summary.

Do NOT mention document count.
Do NOT mention uploads.
Write exactly 3 professional sentences.

Portfolio:
{corpus}
"""

        response = model.generate_content(prompt)

        if hasattr(response, "text") and response.text:
            text = response.text.strip()

            if "429" in text.lower():
                raise Exception("Quota exceeded")

            return text

        raise Exception("No response")

    except Exception:
        skills = []

        for d in documents:
            fields = d.get("fields") or {}
            skills.extend(fields.get("skills", []))

        skills = list(dict.fromkeys(skills))[:6]

        return (
            f"Aspiring software developer with expertise in {', '.join(skills)}. "
            f"Strong foundation in AI, software development, and problem solving. "
            f"Continuously building experience through certifications, internships and projects."
        )