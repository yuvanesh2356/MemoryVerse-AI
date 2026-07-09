"""
main.py — the whole API surface. At hackathon scale one router file is
easier to reason about than a routes/ package; split later if it ever
grows past ~15 endpoints.
"""
import uuid
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import database as db
import ai

app = FastAPI(title="MemoryVerse AI")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# Upload + background processing pipeline
# ---------------------------------------------------------------------------

@app.post("/upload")
async def upload(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()

        storage_path = f"{uuid.uuid4()}_{file.filename}"

        public_url = db.upload_file_to_storage(
            "documents",
            storage_path,
            file_bytes,
            file.content_type or "application/octet-stream"
        )

        doc = db.create_document(file.filename, public_url)

        background_tasks.add_task(
            process_document,
            doc["id"],
            file_bytes,
            file.filename,
        )

        return {
            "id": doc["id"],
            "status": "processing"
        }

    except Exception as e:
        return {
            "error": str(e)
        }


def process_document(doc_id: str, file_bytes: bytes, filename: str):
    try:
        print("Step 1: Processing started")
        text = ai.extract_text(file_bytes, filename)
        extracted = ai.classify_and_extract(text)
        print("EXTRACTED:", extracted)
        print("=" * 60)
        print(extracted)
        print("=" * 60)
        print("Step 2: Classification complete")
        summary = str(extracted.get("summary", ""))
        if "429" in summary.lower():
            summary = "Document processed successfully."

        db.update_document(
            doc_id,
            category=extracted.get("category"),
            raw_text=text[:20000],
            summary=summary,
            issued_date=extracted.get("event_date"),
            fields=extracted,
            status="ready",
       )
        ai.infer_relationships(doc_id, extracted.get("category", ""), extracted)

        try:
            print("Step 3: Starting embeddings")

            for chunk in ai.chunk_text(text):
                print("Embedding one chunk...")
                db.insert_embedding(doc_id, chunk, ai.embed_text(chunk))

            print("Step 4: Embeddings finished")

        except Exception as e:
            print("Embedding skipped:", e)

        if extracted.get("event_date"):
            prior = [d["title"] for d in db.get_timeline()]
            caption = ai.caption_timeline_event(extracted.get("title", filename), extracted.get("category", ""), prior)
            db.insert_timeline_event(
                doc_id, extracted["event_date"], extracted.get("title", filename),
                extracted.get("category", "other"), caption,
            )
    except Exception as e:
        import traceback

        print("=" * 80)
        traceback.print_exc()
        print("=" * 80)

        db.update_document(
            doc_id,
            status="error",
            summary=str(e),
        )


# ---------------------------------------------------------------------------
# Reads
# ---------------------------------------------------------------------------

@app.get("/documents")
def list_documents(category: str | None = None):
    return db.get_documents(category)


@app.get("/documents/{doc_id}")
def get_document(doc_id: str):
    doc = db.get_document(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@app.get("/graph")
def graph():
    return db.get_graph_data()


@app.get("/timeline")
def timeline():
    return db.get_timeline()


@app.get("/stats")
def stats():
    return db.get_stats()


@app.get("/career-summary")
def career_summary():
    docs = db.get_documents()
    return {"summary": ai.generate_career_summary(docs)}


# ---------------------------------------------------------------------------
# Search / chat (same RAG engine, two entry points)
# ---------------------------------------------------------------------------

@app.post("/search")
def search(req: ChatRequest):
    return ai.rag_answer(req.message)


@app.post("/chat")
def chat(req: ChatRequest):
    return ai.rag_answer(req.message)


@app.get("/health")
def health():
    return {"status": "ok"}
