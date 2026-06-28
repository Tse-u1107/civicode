import React from "react";

const MK = "url(#arr)";
const SW = 1.5;
const FONT = "'JetBrains Mono', monospace";

// Rigid Alignment Coords
const INGEST_Y = 120;
const DB_X = 640; // Master center column for DB and Decision Gate
const DB_Y = 300;
const QUERY_Y = DB_Y + 115; // Align query row center with Distance Gate center
const QUERY_BOX_Y = QUERY_Y - 45;

const node = { fill: "#ffffff", stroke: "#111111", strokeWidth: SW } as const;
const dbNode = { fill: "#f4f8ff", stroke: "#111111", strokeWidth: SW } as const;
const line = { stroke: "#111111", strokeWidth: SW, fill: "none" } as const;

export default function FlowPage() {
  return (
    <div className="p-4 font-sans">
      <main className="w-full max-w-[1200px] mx-auto rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-2 text-2xl font-semibold text-black dark:text-zinc-50">
          End-to-End Flow (Paper View)
        </h1>
        <p className="mb-6 text-base text-zinc-600 dark:text-zinc-400">
          Simplified system flow optimized for clean A4 printing layouts.
        </p>

        <div className="overflow-x-auto rounded border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
          <svg
            viewBox="0 0 1180 720"
            className="h-auto w-full"
            style={{ fontFamily: FONT }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <marker id="arr" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
                <polygon points="0 1, 9 4, 0 7" fill="#111111" />
              </marker>
            </defs>

            {/* SECTION HEADERS */}
            <text x={20} y={40} fontSize={13} fontWeight={700} letterSpacing={2} fill="#71717a">
              [ INGESTION PIPELINE: BUILD VECTOR KNOWLEDGE BASE ]
            </text>
            <text x={20} y={340} fontSize={13} fontWeight={700} letterSpacing={2} fill="#71717a">
              [ QUERY PIPELINE: RETRIEVE & ANSWER ]
            </text>

            {/* === INGESTION ROW === */}
            <rect x={20} y={75} width={160} height={90} rx={6} {...node} />
            <text x={100} y={112} fontSize={14} fontWeight={700} textAnchor="middle" fill="#111111">User Input</text>
            <text x={100} y={135} fontSize={12} textAnchor="middle" fill="#52525b">State / Munic.</text>

            <rect x={230} y={75} width={180} height={90} rx={6} {...node} />
            <text x={320} y={105} fontSize={14} fontWeight={700} textAnchor="middle" fill="#111111">Retrieve Pipeline</text>
            <text x={320} y={128} fontSize={12} textAnchor="middle" fill="#52525b">Municode API</text>
            <text x={320} y={146} fontSize={11} textAnchor="middle" fill="#71717a">HTML Chunking</text>

            <rect x={460} y={75} width={200} height={90} rx={6} {...node} />
            <text x={560} y={105} fontSize={14} fontWeight={700} textAnchor="middle" fill="#111111">Store Pipeline</text>
            <text x={560} y={128} fontSize={12} textAnchor="middle" fill="#52525b">Gemini Embeddings</text>
            <text x={560} y={146} fontSize={11} textAnchor="middle" fill="#71717a">Metadata Enrichment</text>

            {/* Ingestion Connectors */}
            <line x1={180} y1={INGEST_Y} x2={230} y2={INGEST_Y} {...line} markerEnd={MK} />
            <line x1={410} y1={INGEST_Y} x2={460} y2={INGEST_Y} {...line} markerEnd={MK} />
            
            {/* Direct center-to-center path from Bottom of Store Pipeline to Top of Chroma DB */}
            <path d={`M 560,165 L 560,195 L ${DB_X},195 L ${DB_X},230`} {...line} markerEnd={MK} />
            <text x={DB_X + 12} y={212} fontSize={12} fontWeight={700} fill="#111111">upsert</text>

            {/* === CENTRAL PROCESSING CORE === */}
            {/* Chroma Vector DB */}
            <rect x={DB_X - 110} y={DB_Y - 70} width={220} height={110} rx={6} {...dbNode} />
            <text x={DB_X} y={DB_Y - 32} fontSize={15} fontWeight={700} textAnchor="middle" fill="#1d4ed8">Chroma Vector DB</text>
            <text x={DB_X} y={DB_Y - 4} fontSize={13} textAnchor="middle" fill="#1e3a8a">State Collections</text>
            <text x={DB_X} y={DB_Y + 20} fontSize={12} textAnchor="middle" fill="#1e3a8a">Chunks + Metadata</text>

            {/* Distance Decision Diamond */}
            <polygon points={`${DB_X - 90},${DB_Y + 115} ${DB_X},${DB_Y + 65} ${DB_X + 90},${DB_Y + 115} ${DB_X},${DB_Y + 165}`} fill="#ffffff" stroke="#111111" strokeWidth={SW} />
            <text x={DB_X} y={DB_Y + 110} fontSize={13} fontWeight={700} textAnchor="middle" fill="#111111">Distance Gate</text>
            <text x={DB_X} y={DB_Y + 128} fontSize={11} textAnchor="middle" fill="#27272a">Match &lt;= 0.9?</text>
            <line x1={DB_X} y1={DB_Y + 40} x2={DB_X} y2={DB_Y + 65} {...line} markerEnd={MK} />

            {/* === QUERY ROW === */}
            <rect x={20} y={QUERY_BOX_Y} width={160} height={90} rx={6} {...node} />
            <text x={100} y={QUERY_Y - 8} fontSize={14} fontWeight={700} textAnchor="middle" fill="#111111">User Question</text>
            <text x={100} y={QUERY_Y + 15} fontSize={12} textAnchor="middle" fill="#52525b">Query + History</text>

            <rect x={230} y={QUERY_BOX_Y} width={180} height={90} rx={6} {...node} />
            <text x={320} y={QUERY_Y - 8} fontSize={14} fontWeight={700} textAnchor="middle" fill="#111111">Query Embed</text>
            <text x={320} y={QUERY_Y + 15} fontSize={12} textAnchor="middle" fill="#52525b">Gemini API</text>

            {/* Query Connectors */}
            <line x1={180} y1={QUERY_Y} x2={230} y2={QUERY_Y} {...line} markerEnd={MK} />
            <path d={`M 410,${QUERY_Y} L 490,${QUERY_Y} L 490,300 L ${DB_X - 110},300`} {...line} markerEnd={MK} />
            <text x={420} y={400} fontSize={12} fontWeight={700} fill="#111111">k-NN search</text>

            {/* === OUTPUT GENERATION & LOGIC === */}
            {/* YES Branch to Grounded Reply */}
            <path d={`M ${DB_X + 90},${DB_Y + 115} L 800,${DB_Y + 115} L 800,95 L 850,95`} {...line} markerEnd={MK} />
            <text x={808} y={85} fontSize={12} fontWeight={700} fill="#16a34a">YES</text>

            <rect x={850} y={50} width={210} height={90} rx={6} {...node} />
            <text x={955} y={90} fontSize={14} fontWeight={700} textAnchor="middle" fill="#111111">Grounded Reply</text>
            <text x={955} y={112} fontSize={12} textAnchor="middle" fill="#52525b">Gemini Gen via Chunks</text>

            {/* NO Branch to Fallback Reply */}
            <path d={`M ${DB_X + 90},${DB_Y + 115} L 800,${DB_Y + 115} L 800,240 L 850,240`} {...line} markerEnd={MK} />
            <text x={808} y={230} fontSize={12} fontWeight={700} fill="#dc2626">NO</text>

            <rect x={850} y={195} width={210} height={90} rx={6} {...node} />
            <text x={955} y={235} fontSize={14} fontWeight={700} textAnchor="middle" fill="#111111">Fallback Reply</text>
            <text x={955} y={258} fontSize={12} textAnchor="middle" fill="#52525b">Low-Confidence Warning</text>

            {/* === CHAT UI TARGET COMPONENT === */}
            <rect x={865} y={345} width={180} height={90} rx={6} {...node} />
            <text x={955} y={385} fontSize={14} fontWeight={700} textAnchor="middle" fill="#111111">Chat UI</text>
            <text x={955} y={408} fontSize={12} textAnchor="middle" fill="#52525b">Show Answers + Src</text>

            {/* Outputs clean routing directly into Chat UI */}
            <path d="M 1060,95 L 1100,95 L 1100,390 L 1055,390" {...line} markerEnd={MK} />
            <path d="M 1060,240 L 1100,240 L 1100,390 L 1055,390" {...line} />

            {/* === FOOTER FOOTNOTE WITH EXPLICIT LINE BREAKS === */}
            {/* <rect x={20} y={575} width={1140} height={105} rx={8} fill="#ffffff" stroke="#a1a1aa" strokeWidth={1.2} />
            <text x={40} y={605} fontSize={14} fontWeight={700} fill="#18181b">Note on Local State Persistence</text>
            <text x={40} y={632} fontSize={13} fill="#3f3f46">
              <tspan x={40} dy={0}>Browser localStorage is exclusively engaged to store user context, history logs, and UI session state indicators.</tspan>
              <tspan x={40} dy={22}>All operations execute strictly client-side without permanent external server storage dependencies.</tspan>
            </text> */}
          </svg>
        </div>
      </main>
    </div>
  );
}