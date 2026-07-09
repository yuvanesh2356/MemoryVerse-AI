// pages.tsx — one file per app, one function per screen. Screens compose
// pieces from components.tsx; kept separate from components.tsx so UI work
// on different screens doesn't collide in the same file during the build.
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Award, Briefcase, Search, ArrowRight } from "lucide-react";
import {
  StatCard, CareerSummaryCard, DocumentCard, UploadDropzone, GraphView,
  TimelineView, ChatPanel, GlassCard, Skeleton,
} from "./components";
import { api, type Document, type TimelineEvent } from "./lib";

const pageMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35, ease: "easeOut" },
};

// ---------------------------------------------------------------------------
// Dashboard — opens on the "wow" moment: search bar + AI summary, not a form
// ---------------------------------------------------------------------------
export function DashboardPage() {
  const [stats, setStats] = useState<{ total_documents: number; total_entities: number; by_category: Record<string, number> } | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [query, setQuery] = useState("");

  const load = useCallback(() => {
    api.stats().then(setStats).catch(() => {});
    api.careerSummary().then((r) => setSummary(r.summary)).catch(() => {});
    api.documents().then(setDocuments).catch(() => {});
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 4000); return () => clearInterval(id); }, [load]);

  return (
    <motion.div {...pageMotion} className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-cyan">MemoryVerse</p>
        <h1 className="mt-1 font-display text-4xl font-semibold text-ink">
          Your journey, <span className="bg-gradient-to-r from-violet to-cyan bg-clip-text text-transparent">understood.</span>
        </h1>
      </div>

      {/* Search-first hero — the opening "wow" beat */}
      <motion.div whileHover={{ scale: 1.005 }} className="relative">
        <GlassCard glow className="flex items-center gap-3 p-4">
          <Search size={18} className="text-muted" />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) window.location.assign(`/chat?q=${encodeURIComponent(query)}`); }}
            placeholder='Ask "what am I ready for?" or "show my AI projects"'
            className="flex-1 bg-transparent py-2 text-base text-ink outline-none placeholder:text-muted"
          />
          <ArrowRight size={18} className="text-violet" />
        </GlassCard>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Documents archived" value={stats?.total_documents ?? 0} icon={FileText} />
        <StatCard label="Skills & projects mapped" value={stats?.total_entities ?? 0} icon={Award} />
        <StatCard label="Certifications" value={stats?.by_category?.certificate ?? 0} icon={Briefcase} />
      </div>

      <CareerSummaryCard summary={summary} />

      <div>
        <h2 className="mb-3 font-display text-lg font-medium text-ink">Recently added</h2>
        <div className="space-y-2.5">
          {documents.length === 0 && (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          )}
          {documents.slice(0, 5).map((d, i) => <DocumentCard key={d.id} doc={d} index={i} />)}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Upload — dropzone + a live strip of the graph nodes it just produced
// ---------------------------------------------------------------------------
export function UploadPage() {
  const [graph, setGraph] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [pulse, setPulse] = useState(0);

  const refreshGraph = useCallback(() => {
    api.graph().then(setGraph).catch(() => {});
  }, []);

  useEffect(() => { refreshGraph(); }, [refreshGraph]);

  const onUploaded = () => {
    // give the background pipeline a moment, then poll for the freshly
    // inferred entities so the graph visibly grows right after upload
    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      refreshGraph();
      setPulse((p) => p + 1);
      if (attempts >= 6) clearInterval(id);
    }, 2500);
  };

  return (
    <motion.div {...pageMotion} className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Add to your archive</h1>
        <p className="mt-1 text-muted">Every upload is read, categorized, and woven into your knowledge graph automatically.</p>
      </div>

      <UploadDropzone onUploaded={onUploaded} />

      <AnimatePresence>
        {graph.nodes.length > 0 && (
          <motion.div key={pulse} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-medium text-ink">
              Growing your constellation
              <span className="rounded-full bg-violet/10 px-2 py-0.5 text-xs font-normal text-violet">{graph.nodes.length} nodes</span>
            </h2>
            <GraphView nodes={graph.nodes.slice(-24)} edges={graph.edges} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Graph — full knowledge graph
// ---------------------------------------------------------------------------
export function GraphPage() {
  const [graph, setGraph] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  useEffect(() => {
    const load = () => api.graph().then(setGraph).catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div {...pageMotion} className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Knowledge graph</h1>
        <p className="mt-1 text-muted">Certifications certify skills. Skills feed projects. Projects lead to internships and careers.</p>
      </div>
      {graph.nodes.length === 0 ? (
        <GlassCard className="flex h-[50vh] flex-col items-center justify-center text-center text-muted">
          <p className="font-display text-lg text-ink">No connections yet</p>
          <p className="mt-1 text-sm">Upload a document to start building your constellation.</p>
        </GlassCard>
      ) : (
        <GraphView nodes={graph.nodes} edges={graph.edges} />
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Timeline — builds itself in with staggered reveal on scroll
// ---------------------------------------------------------------------------
export function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  useEffect(() => { api.timeline().then(setEvents).catch(() => setEvents([])); }, []);

  return (
    <motion.div {...pageMotion} className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Your digital journey</h1>
        <p className="mt-1 text-muted">Every milestone, in order, with why it mattered.</p>
      </div>
      {events === null ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" />
        </div>
      ) : events.length === 0 ? (
        <GlassCard className="flex h-[40vh] flex-col items-center justify-center text-center text-muted">
          <p className="font-display text-lg text-ink">Your timeline is empty</p>
          <p className="mt-1 text-sm">Upload dated documents — certificates, letters, reports — to build it.</p>
        </GlassCard>
      ) : (
        <TimelineView events={events} />
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Ask — full-screen chat/search
// ---------------------------------------------------------------------------
export function ChatPage() {
  return (
    <motion.div {...pageMotion} className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-ink">Ask your archive</h1>
        <p className="mt-1 text-muted">Natural-language search over everything you've ever uploaded.</p>
      </div>
      <ChatPanel />
    </motion.div>
  );
}
