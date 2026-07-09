"""
database.py — the ONLY file that talks to Supabase.

Holds: client init, schema (run once in Supabase SQL editor), and every
table read/write the app needs. Keeping all data access here means a
schema change never has to touch ai.py or main.py.
"""
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
from typing import Optional
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL else None
print("URL:", SUPABASE_URL)
print("KEY EXISTS:", bool(SUPABASE_KEY))

try:
    print(supabase.table("documents").select("id").limit(1).execute())
except Exception as e:
    print("SUPABASE ERROR:", e)

# ---------------------------------------------------------------------------
# SCHEMA — run once in the Supabase SQL editor before first launch.
# ---------------------------------------------------------------------------
SCHEMA_SQL = """
create extension if not exists vector;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'demo-user',
  filename text not null,
  storage_path text,
  category text,                      -- resume | certificate | project | internship | other
  raw_text text,
  summary text,
  issued_date date,
  fields jsonb default '{}'::jsonb,   -- category-specific extracted fields
  status text default 'processing',   -- processing | ready | error
  created_at timestamptz default now()
);

create table if not exists entities (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'demo-user',
  type text not null,                 -- skill | organization | project | role
  name text not null,
  normalized_name text not null,
  first_seen_at timestamptz default now(),
  unique(user_id, normalized_name, type)
);

create table if not exists document_entities (
  document_id uuid references documents(id) on delete cascade,
  entity_id uuid references entities(id) on delete cascade,
  confidence float default 0.8,
  context_snippet text,
  primary key (document_id, entity_id)
);

create table if not exists relationships (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'demo-user',
  source_entity_id uuid references entities(id) on delete cascade,
  target_entity_id uuid references entities(id) on delete cascade,
  relation_type text not null,        -- certifies | used_in | built_during | leads_to
  strength float default 1.0,
  evidence_document_id uuid references documents(id),
  created_at timestamptz default now()
);

create table if not exists embeddings (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  chunk_text text,
  embedding vector(3072)
);

create table if not exists timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'demo-user',
  document_id uuid references documents(id) on delete cascade,
  event_date date,
  title text,
  category text,
  caption text
);

create or replace function match_embeddings(query_embedding vector(3072), match_count int, uid text)
returns table(document_id uuid, chunk_text text, similarity float)
language sql stable as $$
  select e.document_id, e.chunk_text, 1 - (e.embedding <=> query_embedding) as similarity
  from embeddings e
  join documents d on d.id = e.document_id
  where d.user_id = uid
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
"""

USER_ID = "demo-user"  # single-user demo mode; swap for real auth id if time allows


def create_document(filename: str, storage_path: str) -> dict:
    res = supabase.table("documents").insert({
        "user_id": USER_ID, "filename": filename, "storage_path": storage_path,
        "status": "processing",
    }).execute()
    return res.data[0]


def update_document(doc_id: str, **fields) -> dict:
    res = supabase.table("documents").update(fields).eq("id", doc_id).execute()
    return res.data[0] if res.data else {}


def get_documents(category: Optional[str] = None) -> list:
    q = supabase.table("documents").select("*").eq("user_id", USER_ID).order("created_at", desc=True)
    if category:
        q = q.eq("category", category)
    return q.execute().data


def get_document(doc_id: str) -> Optional[dict]:
    res = supabase.table("documents").select("*").eq("id", doc_id).single().execute()
    return res.data


def upsert_entity(name: str, entity_type: str) -> dict:
    normalized = name.strip().lower()
    existing = supabase.table("entities").select("*") \
        .eq("user_id", USER_ID).eq("normalized_name", normalized).eq("type", entity_type).execute()
    if existing.data:
        return existing.data[0]
    res = supabase.table("entities").insert({
        "user_id": USER_ID, "type": entity_type, "name": name, "normalized_name": normalized,
    }).execute()
    return res.data[0]


def link_document_entity(document_id: str, entity_id: str, confidence: float, snippet: str):
    supabase.table("document_entities").upsert({
        "document_id": document_id, "entity_id": entity_id,
        "confidence": confidence, "context_snippet": snippet,
    }).execute()


def insert_relationship(source_id: str, target_id: str, relation_type: str, evidence_doc_id: str):
    existing = supabase.table("relationships").select("id") \
        .eq("source_entity_id", source_id).eq("target_entity_id", target_id) \
        .eq("relation_type", relation_type).execute()
    if existing.data:
        return
    supabase.table("relationships").insert({
        "user_id": USER_ID, "source_entity_id": source_id, "target_entity_id": target_id,
        "relation_type": relation_type, "evidence_document_id": evidence_doc_id,
    }).execute()


def get_graph_data() -> dict:
    entities = supabase.table("entities").select("*").eq("user_id", USER_ID).execute().data
    relationships = supabase.table("relationships").select("*").eq("user_id", USER_ID).execute().data
    return {"nodes": entities, "edges": relationships}


def insert_embedding(document_id: str, chunk_text: str, embedding: list):
    supabase.table("embeddings").insert({
        "document_id": document_id, "chunk_text": chunk_text, "embedding": embedding,
    }).execute()


def vector_search(query_embedding: list, match_count: int = 5) -> list:
    res = supabase.rpc("match_embeddings", {
        "query_embedding": query_embedding, "match_count": match_count, "uid": USER_ID,
    }).execute()
    return res.data


def insert_timeline_event(document_id: str, event_date, title: str, category: str, caption: str = ""):
    supabase.table("timeline_events").insert({
        "user_id": USER_ID, "document_id": document_id, "event_date": event_date,
        "title": title, "category": category, "caption": caption,
    }).execute()


def get_timeline() -> list:
    return supabase.table("timeline_events").select("*, documents(filename,storage_path)") \
        .eq("user_id", USER_ID).order("event_date").execute().data


def get_stats() -> dict:
    docs = get_documents()
    by_category = {}
    for d in docs:
        by_category[d.get("category") or "uncategorized"] = by_category.get(d.get("category") or "uncategorized", 0) + 1
    entity_count = len(supabase.table("entities").select("id").eq("user_id", USER_ID).execute().data)
    return {"total_documents": len(docs), "by_category": by_category, "total_entities": entity_count}


def upload_file_to_storage(bucket: str, path: str, file_bytes: bytes, content_type: str) -> str:
    supabase.storage.from_(bucket).upload(path, file_bytes, {"content-type": content_type, "upsert": "true"})
    return supabase.storage.from_(bucket).get_public_url(path)
