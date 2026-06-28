"use client";

import { useMemo, useState } from "react";
import { buildApiSettingsHeaders, readClientApiSettings } from "@/lib/client-api-settings";

type SectionState = {
  loading: boolean;
  ok: boolean | null;
  error: string;
  result: unknown | null;
};

function getInitialSectionState(): SectionState {
  return {
    loading: false,
    ok: null,
    error: "",
    result: null,
  };
}

function DiagnosisCard(props: {
  title: string;
  description: string;
  actionLabel: string;
  state: SectionState;
  onRun: () => Promise<void>;
}) {
  const { title, description, actionLabel, state, onRun } = props;
  const formattedResult = useMemo(() => {
    if (!state.result) {
      return "";
    }
    return JSON.stringify(state.result, null, 2);
  }, [state.result]);

  return (
    <section className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void onRun();
          }}
          disabled={state.loading}
          className="rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {state.loading ? "Running..." : actionLabel}
        </button>
      </div>

      <div className="mt-3 rounded border border-zinc-300 bg-zinc-100 p-3 dark:border-zinc-700 dark:bg-zinc-900">
        {state.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
        ) : formattedResult ? (
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-zinc-900 dark:text-zinc-100">
            {formattedResult}
          </pre>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No run yet.</p>
        )}
      </div>
    </section>
  );
}

export default function DiagnosisPage() {
  const [gemini, setGemini] = useState<SectionState>(getInitialSectionState());
  const [chroma, setChroma] = useState<SectionState>(getInitialSectionState());
  const [mcp, setMcp] = useState<SectionState>(getInitialSectionState());

  async function runGeminiDiagnosis() {
    setGemini({ loading: true, ok: null, error: "", result: null });
    try {
      const settings = readClientApiSettings();
      const res = await fetch("/api/diagnosis/gemini", {
        headers: buildApiSettingsHeaders(settings),
      });
      const data = (await res.json()) as { ok?: unknown; message?: unknown };
      if (!res.ok) {
        const message = typeof data.message === "string" ? data.message : `Request failed with status ${res.status}`;
        throw new Error(message);
      }
      setGemini({
        loading: false,
        ok: data.ok === true,
        error: "",
        result: data,
      });
    } catch (err) {
      setGemini({
        loading: false,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        result: null,
      });
    }
  }

  async function runChromaDiagnosis() {
    setChroma({ loading: true, ok: null, error: "", result: null });
    try {
      const settings = readClientApiSettings();
      const res = await fetch("/api/diagnosis/chroma", {
        headers: buildApiSettingsHeaders(settings),
      });
      const data = (await res.json()) as { ok?: unknown; message?: unknown };
      if (!res.ok) {
        const message = typeof data.message === "string" ? data.message : `Request failed with status ${res.status}`;
        throw new Error(message);
      }
      setChroma({
        loading: false,
        ok: data.ok === true,
        error: "",
        result: data,
      });
    } catch (err) {
      setChroma({
        loading: false,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        result: null,
      });
    }
  }

  async function runMcpDiagnosis() {
    setMcp({ loading: true, ok: null, error: "", result: null });
    try {
      const res = await fetch("/api/test-server");
      const data = (await res.json()) as { completed?: unknown };
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      setMcp({
        loading: false,
        ok: data.completed === true,
        error: "",
        result: data,
      });
    } catch (err) {
      setMcp({
        loading: false,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        result: null,
      });
    }
  }

  async function runAllDiagnoses() {
    await runGeminiDiagnosis();
    await runChromaDiagnosis();
    await runMcpDiagnosis();
  }

  return (
    <div className="p-8 font-sans">
      <main className="w-full rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Diagnosis</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Run service accessibility checks for Gemini, ChromaDB, and Municode MCP API.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void runAllDiagnoses();
            }}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Run all
          </button>
        </div>

        <div className="space-y-4">
          <DiagnosisCard
            title="Gemini API key accessibility"
            description="Validates Gemini credentials by generating a small embedding."
            actionLabel="Run Gemini check"
            state={gemini}
            onRun={runGeminiDiagnosis}
          />
          <DiagnosisCard
            title="ChromaDB API key accessibility"
            description="Validates ChromaDB credentials by opening a diagnosis collection."
            actionLabel="Run ChromaDB check"
            state={chroma}
            onRun={runChromaDiagnosis}
          />
          <DiagnosisCard
            title="MCP api accessibility"
            description="Runs the existing Municode MCP test flow end-to-end."
            actionLabel="Run MCP check"
            state={mcp}
            onRun={runMcpDiagnosis}
          />
        </div>
      </main>
    </div>
  );
}
