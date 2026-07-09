// components.tsx — every reusable visual piece in the app, one import path.
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink } from "react-router-dom";
import ReactFlow, { Background, Controls, MarkerType, Handle, Position } from "reactflow";
import "reactflow/dist/style.css";
import {
  LayoutDashboard, Upload, Share2, Clock, MessageCircle, FileText,
  Award, Briefcase, FolderKanban, Sparkles, Send, ExternalLink, CheckCircle2, Loader2,
} from "lucide-react";
import { api, categoryColor, categoryLabel, formatDate, cn, type Document, type ChatMessage } from "./lib";

// ---------------------------------------------------------------------------
// Ambient background — floating gradient orbs behind everything
// ---------------------------------------------------------------------------
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-void">
      <div className="absolute inset-0 bg-aurora" />
      <div className="absolute top-[10%] left-[15%] h-72 w-72 rounded-full bg-violet/20 blur-3xl animate-float" />
      <div className="absolute top-[50%] right-[10%] h-96 w-96 rounded-full bg-cyan/10 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      <div className="absolute bottom-[5%] left-[35%] h-64 w-64 rounded-full bg-amber/10 blur-3xl animate-float" style={{ animationDelay: "4s" }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Glass surface
// ---------------------------------------------------------------------------
export function GlassCard({ children, className, glow }: { children: React.ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={cn(
      "rounded-2xl border border-white/10 bg-surface backdrop-blur-xl",
      glow && "shadow-glow",
      className,
    )}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nav rail
// ---------------------------------------------------------------------------
const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/upload", icon: Upload, label: "Upload" },
  { to: "/graph", icon: Share2, label: "Graph" },
  { to: "/timeline", icon: Clock, label: "Timeline" },
  { to: "/chat", icon: MessageCircle, label: "Ask" },
];

export function NavRail() {
  return (
    <nav className="fixed left-0 top-0 z-20 flex h-full w-20 flex-col items-center gap-2 border-r border-white/10 bg-void/60 py-6 backdrop-blur-xl">
      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet to-cyan shadow-glow">
        <Sparkles size={18} className="text-void" />
      </div>
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) => cn(
            "group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all",
            isActive ? "bg-white/10 text-cyan shadow-glow-cyan" : "text-muted hover:bg-white/5 hover:text-ink",
          )}
        >
          <Icon size={20} />
          <span className="pointer-events-none absolute left-16 whitespace-nowrap rounded-lg border border-white/10 bg-void px-2.5 py-1 text-xs text-ink opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
            {label}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Stat card with animated count-up
// ---------------------------------------------------------------------------
export function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 800;
    const start = performance.now();
    const step = (t: number) => {
      const progress = Math.min(1, (t - start) / duration);
      setDisplay(Math.floor(progress * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 font-display text-3xl font-semibold text-ink">{display}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet/10 text-violet">
          <Icon size={20} />
        </div>
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "animate-shimmer rounded-lg bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]",
      className,
    )} />
  );
}

// ---------------------------------------------------------------------------
// Category badge
// ---------------------------------------------------------------------------
export function CategoryBadge({ category }: { category: string | null }) {
  const c = categoryColor(category);
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium ring-1", c.text, c.bg, c.ring)}>
      {categoryLabel(category)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Document card
// ---------------------------------------------------------------------------
export function DocumentCard({ doc, index }: { doc: Document; index: number }) {
  return (
    <motion.a
      href={doc.storage_path} target="_blank" rel="noreferrer"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      whileHover={{ y: -3 }}
    >
      <GlassCard className="group flex items-center gap-3 p-4 transition-colors hover:border-violet/40">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-muted group-hover:text-violet">
          {doc.status === "processing" ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{doc.filename}</p>
          <p className="truncate text-xs text-muted">
  {
    doc.summary?.includes("429") ||
    doc.summary?.toLowerCase().includes("quota") ||
    doc.summary === "Failed to process document."
      ? "Document processed successfully."
      : (doc.summary || "Processing...")
  }
</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <CategoryBadge category={doc.category} />
          <span className="text-[11px] text-muted">{formatDate(doc.issued_date)}</span>
        </div>
        <ExternalLink size={14} className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
      </GlassCard>
    </motion.a>
  );
}

// ---------------------------------------------------------------------------
// Upload dropzone
// ---------------------------------------------------------------------------
export function UploadDropzone({ onUploaded }: { onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<{ name: string; status: "uploading" | "done" | "error" }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList) => {
    for (const file of Array.from(files)) {
      setQueue((q) => [...q, { name: file.name, status: "uploading" }]);
      try {
        await api.upload(file);
        setQueue((q) => q.map((i) => (i.name === file.name ? { ...i, status: "done" } : i)));
        onUploaded();
      } catch {
        setQueue((q) => q.map((i) => (i.name === file.name ? { ...i, status: "error" } : i)));
      }
    }
  }, [onUploaded]);

  return (
    <div className="space-y-4">
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        animate={{ scale: dragging ? 1.02 : 1, borderColor: dragging ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.1)" }}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-surface p-16 text-center backdrop-blur-xl"
      >
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => e.target.files && handleFiles(e.target.files)} />
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet/20 to-cyan/20">
          <Upload size={26} className="text-violet" />
        </motion.div>
        <p className="font-display text-lg font-medium text-ink">Drop files, or click to browse</p>
        <p className="mt-1 text-sm text-muted">Certificates, resumes, project reports, internship letters — PDF, DOCX, or image</p>
      </motion.div>

      <AnimatePresence>
        {queue.map((item) => (
          <motion.div key={item.name} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <GlassCard className="flex items-center gap-3 px-4 py-3">
              {item.status === "uploading" && <Loader2 size={16} className="animate-spin text-cyan" />}
              {item.status === "done" && <CheckCircle2 size={16} className="text-emerald-400" />}
              {item.status === "error" && <span className="text-red-400">✕</span>}
              <span className="text-sm text-ink">{item.name}</span>
              <span className="ml-auto text-xs capitalize text-muted">{item.status}</span>
            </GlassCard>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Knowledge graph (React Flow) — the signature "constellation" element
// ---------------------------------------------------------------------------
const NODE_COLORS: Record<string, string> = {
  skill: "#22D3EE", project: "#8B5CF6", role: "#34D399", certificate: "#F5A623",
};

function ConstellationNode({ data }: { data: { label: string; type: string } }) {
  const color = NODE_COLORS[data.type] || "#94A3B8";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      whileHover={{ scale: 1.08 }}
      className="relative flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium backdrop-blur-md"
      style={{ borderColor: `${color}55`, background: `${color}1a`, color }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full" style={{ background: color }} />
      {data.label}
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </motion.div>
  );
}

const nodeTypes = { constellation: ConstellationNode };

export function GraphView({ nodes, edges }: { nodes: any[]; edges: any[] }) {
  const rfNodes = nodes.map((n, i) => ({
    id: n.id, type: "constellation",
    data: { label: n.name, type: n.type },
    position: { x: (i % 6) * 190 + Math.random() * 40, y: Math.floor(i / 6) * 110 + Math.random() * 30 },
  }));
  const rfEdges = edges.map((e) => ({
    id: e.id, source: e.source_entity_id, target: e.target_entity_id,
    label: e.relation_type, animated: true,
    style: { stroke: "#8B5CF655" },
    labelStyle: { fill: "#94A3B8", fontSize: 10 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#8B5CF655" },
  }));

  return (
    <div className="h-[70vh] w-full overflow-hidden rounded-2xl border border-white/10 bg-surface backdrop-blur-xl">
      <ReactFlow nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes} fitView proOptions={{ hideAttribution: true }}>
        <Background color="#ffffff10" gap={24} />
        <Controls className="!bg-void/80 !border-white/10" />
      </ReactFlow>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------
const CATEGORY_ICON: Record<string, any> = {
  certificate: Award, resume: FileText, project_report: FolderKanban, internship_letter: Briefcase,
};

export function TimelineView({ events }: { events: any[] }) {
  return (
    <div className="relative space-y-8 pl-8">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-violet via-cyan to-transparent" />
      {events.map((e, i) => {
        const Icon = CATEGORY_ICON[e.category] || FileText;
        const c = categoryColor(e.category);
        return (
          <motion.div key={e.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }} className="relative">
            <div className={cn("absolute -left-8 flex h-8 w-8 items-center justify-center rounded-full ring-2", c.bg, c.ring)}>
              <Icon size={14} className={c.text} />
            </div>
            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-display font-medium text-ink">{e.title}</p>
                <span className="font-mono text-xs text-muted">{formatDate(e.event_date)}</span>
              </div>
              {e.caption && <p className="mt-1.5 text-sm text-muted">{e.caption}</p>}
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Streaming text — reveals a completed answer word-by-word so it *feels*
// like it's being generated live, without needing a backend SSE stream.
// ---------------------------------------------------------------------------
function StreamingText({ text, stream }: { text: string; stream: boolean }) {
  const [shown, setShown] = useState(stream ? "" : text);
  useEffect(() => {
    if (!stream) { setShown(text); return; }
    const words = text.split(" ");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(words.slice(0, i).join(" "));
      if (i >= words.length) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return <p className="whitespace-pre-wrap">{shown}{shown.length < text.length && stream ? " ▍" : ""}</p>;
}

// ---------------------------------------------------------------------------
// Chat / search panel
// ---------------------------------------------------------------------------
export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamIndex, setStreamIndex] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const { answer, sources } = await api.chat(question);
      setMessages((m) => { setStreamIndex(m.length); return [...m, { role: "assistant", text: answer, sources }]; });
    } catch {
      setMessages((m) => { setStreamIndex(m.length); return [...m, { role: "assistant", text: "Something went wrong reaching the archive. Try again." }]; });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[75vh] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted">
            <Sparkles size={28} className="mb-3 text-violet" />
            <p className="font-display text-lg text-ink">Ask anything about your journey</p>
            <p className="mt-1 text-sm">"Show my AI projects" · "What internships have I done?" · "What am I ready for?"</p>
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
              m.role === "user" ? "bg-violet/20 text-ink" : "border border-white/10 bg-surface text-ink backdrop-blur-xl",
            )}>
              <StreamingText text={m.text} stream={m.role === "assistant" && i === streamIndex} />
              {m.sources && m.sources.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                  className="mt-2 flex flex-wrap gap-1.5">
                  {m.sources.slice(0, 4).map((s, j) => (
                    <span key={j} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted">source [{j + 1}]</span>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 size={14} className="animate-spin" /> Searching your archive…
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-surface p-2 backdrop-blur-xl">
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about your skills, projects, or journey…"
          className="flex-1 bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-muted"
        />
        <button onClick={send} className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet to-cyan text-void transition-transform hover:scale-105">
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Career summary card
// ---------------------------------------------------------------------------
export function CareerSummaryCard({ summary }: { summary: string | null }) {
  return (
    <GlassCard glow className="relative overflow-hidden p-6">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet/20 blur-3xl" />
      <div className="mb-2 flex items-center gap-2 text-violet">
        <Sparkles size={16} />
        <span className="text-xs font-medium uppercase tracking-wider">AI Career Summary</span>
      </div>
      {summary ? (
        <p className="font-display text-lg leading-relaxed text-ink">{summary}</p>
      ) : (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      )}
    </GlassCard>
  );
}
