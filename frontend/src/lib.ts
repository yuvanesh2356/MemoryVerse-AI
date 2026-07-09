// lib.ts — every API call, type, and small utility the app needs.
const API_BASE = "http://127.0.0.1:8000";

export type Category = "resume" | "certificate" | "project_report" | "internship_letter" | "other";

export interface Document {
  id: string;
  filename: string;
  storage_path: string;
  category: Category | null;
  summary: string | null;
  issued_date: string | null;
  fields: Record<string, any>;
  status: "processing" | "ready" | "error";
  created_at: string;
}

export interface GraphNode {
  id: string;
  type: "skill" | "project" | "role" | "certificate";
  name: string;
}

export interface GraphEdge {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relation_type: string;
}

export interface TimelineEvent {
  id: string;
  event_date: string;
  title: string;
  category: string;
  caption: string;
  documents?: { filename: string; storage_path: string };
}

export interface ChatSource {
  document_id: string;
  chunk_text: string;
  similarity: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  sources?: ChatSource[];
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: options?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return req<{ id: string; status: string }>("/upload", { method: "POST", body: form });
  },
  documents: (category?: string) => req<Document[]>(`/documents${category ? `?category=${category}` : ""}`),
  document: (id: string) => req<Document>(`/documents/${id}`),
  graph: () => req<{ nodes: GraphNode[]; edges: GraphEdge[] }>("/graph"),
  timeline: () => req<TimelineEvent[]>("/timeline"),
  stats: () => req<{ total_documents: number; by_category: Record<string, number>; total_entities: number }>("/stats"),
  careerSummary: () => req<{ summary: string }>("/career-summary"),
  chat: (message: string) => req<{ answer: string; sources: ChatSource[] }>("/chat", {
    method: "POST", body: JSON.stringify({ message }),
  }),
};

export function categoryColor(category: string | null): { text: string; bg: string; ring: string } {
  switch (category) {
    case "certificate": return { text: "text-amber", bg: "bg-amber/10", ring: "ring-amber/40" };
    case "resume": return { text: "text-cyan", bg: "bg-cyan/10", ring: "ring-cyan/40" };
    case "project_report": return { text: "text-violet", bg: "bg-violet/10", ring: "ring-violet/40" };
    case "internship_letter": return { text: "text-emerald-400", bg: "bg-emerald-400/10", ring: "ring-emerald-400/40" };
    default: return { text: "text-muted", bg: "bg-white/5", ring: "ring-white/10" };
  }
}

export function categoryLabel(category: string | null): string {
  const map: Record<string, string> = {
    certificate: "Certificate", resume: "Resume", project_report: "Project",
    internship_letter: "Internship", other: "Other",
  };
  return map[category || "other"] ?? "Other";
}

export function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
