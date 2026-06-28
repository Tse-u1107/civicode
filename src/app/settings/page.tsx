"use client";

import { FormEvent, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import {
  buildApiSettingsHeaders,
  ClientApiSettings,
  readClientApiSettings,
  saveClientApiSettings,
} from "@/lib/client-api-settings";

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

function TestStateButton(props: {
  state: SectionState;
  initLabel: string;
  onClick: () => void;
  minWidthClassName?: string;
}) {
  const { state, initLabel, onClick, minWidthClassName = "min-w-[86px]" } = props;
  const [isHovered, setIsHovered] = useState(false);

  const variantClassName = state.loading
    ? "border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
    : state.ok === true
      ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950"
      : state.ok === false
        ? "border-red-600 bg-red-600 text-white dark:border-red-500 dark:bg-red-500 dark:text-red-950"
        : "border-zinc-300 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100";

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`inline-flex h-9 ${minWidthClassName} items-center justify-center rounded border px-3 py-2 text-sm transition-colors disabled:opacity-70 ${variantClassName}`}
      disabled={state.loading}
    >
      {state.loading ? (
        <span className="inline-flex items-center gap-1">
          <Loader2 size={15} className="animate-spin" />
          <span>Running</span>
        </span>
      ) : state.ok !== null && isHovered ? (
        <RotateCcw size={15} />
      ) : state.ok === true ? (
        "Passed"
      ) : state.ok === false ? (
        "Failed"
      ) : (
        initLabel
      )}
    </button>
  );
}

function DiagnosticDetails({ state }: { state: SectionState }) {
  const hasData = state.result !== null || state.error !== "";

  return (
    <details className="mt-2 rounded border border-zinc-200 bg-zinc-50 p-2 text-xs dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="cursor-pointer select-none font-medium text-zinc-700 dark:text-zinc-300">
        Detailed info
      </summary>
      <div className="mt-2">
        {hasData ? (
          state.error ? (
            <pre className="overflow-x-auto whitespace-pre-wrap text-red-600 dark:text-red-400">{state.error}</pre>
          ) : (
            <pre className="overflow-x-auto whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
              {JSON.stringify(state.result, null, 2)}
            </pre>
          )
        ) : (
          <p className="text-zinc-500 dark:text-zinc-400">No test run yet.</p>
        )}
      </div>
    </details>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<ClientApiSettings>(() => readClientApiSettings());
  const [message, setMessage] = useState("");
  const [gemini, setGemini] = useState<SectionState>(getInitialSectionState());
  const [chroma, setChroma] = useState<SectionState>(getInitialSectionState());
  const [mcp, setMcp] = useState<SectionState>(getInitialSectionState());

  function updateField<K extends keyof ClientApiSettings>(key: K, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveClientApiSettings(settings);
    setMessage("Saved. Future chat and store requests will use these settings.");
  }

  async function runGeminiDiagnosis() {
    setGemini({ loading: true, ok: null, error: "", result: null });
    try {
      const res = await fetch("/api/diagnosis/gemini", {
        headers: buildApiSettingsHeaders(settings),
      });
      const data = (await res.json()) as { ok?: unknown; message?: unknown };
      if (!res.ok) {
        const errorMessage = typeof data.message === "string" ? data.message : `Request failed with status ${res.status}`;
        throw new Error(errorMessage);
      }

      setGemini({
        loading: false,
        ok: data.ok === true,
        error: "",
        result: data,
      });
    } catch (error) {
      setGemini({
        loading: false,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        result: null,
      });
    }
  }

  async function runChromaDiagnosis() {
    setChroma({ loading: true, ok: null, error: "", result: null });
    try {
      const res = await fetch("/api/diagnosis/chroma", {
        headers: buildApiSettingsHeaders(settings),
      });
      const data = (await res.json()) as { ok?: unknown; message?: unknown };
      if (!res.ok) {
        const errorMessage = typeof data.message === "string" ? data.message : `Request failed with status ${res.status}`;
        throw new Error(errorMessage);
      }

      setChroma({
        loading: false,
        ok: data.ok === true,
        error: "",
        result: data,
      });
    } catch (error) {
      setChroma({
        loading: false,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
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
    } catch (error) {
      setMcp({
        loading: false,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        result: null,
      });
    }
  }

  return (
    <div className="p-8 font-sans">
      <main className="w-full rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-2 text-2xl font-semibold text-black dark:text-zinc-50">Settings</h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Configure runtime API credentials for this browser. Values are stored in local storage on this device.
        </p>

        <form className="space-y-4" onSubmit={handleSave}>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200" htmlFor="gemini-api-key">
              Gemini API key
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="gemini-api-key"
                value={settings.geminiApiKey}
                onChange={(event) => updateField("geminiApiKey", event.target.value)}
                placeholder="AIza..."
                className="min-w-[280px] flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <TestStateButton
                state={gemini}
                initLabel="Test"
                onClick={() => {
                  void runGeminiDiagnosis();
                }}
              />
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Get API key
              </a>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Hint: Use your key from Google AI Studio.
            </p>
            <DiagnosticDetails state={gemini} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200" htmlFor="chroma-api-key">
              ChromaDB API key
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="chroma-api-key"
                value={settings.chromaApiKey}
                onChange={(event) => updateField("chromaApiKey", event.target.value)}
                placeholder="ck-..."
                className="min-w-[280px] flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <TestStateButton
                state={chroma}
                initLabel="Test"
                onClick={() => {
                  void runChromaDiagnosis();
                }}
              />
              <a
                href="https://www.trychroma.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Get API key
              </a>
            </div>
            <DiagnosticDetails state={chroma} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200" htmlFor="chroma-tenant">
                Chroma tenant
              </label>
              <input
                id="chroma-tenant"
                type="text"
                value={settings.chromaTenant}
                onChange={(event) => updateField("chromaTenant", event.target.value)}
                placeholder="tenant id"
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200" htmlFor="chroma-database">
                Chroma database
              </label>
              <input
                id="chroma-database"
                type="text"
                value={settings.chromaDatabase}
                onChange={(event) => updateField("chromaDatabase", event.target.value)}
                placeholder="database name"
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Hint: From a Chroma URL like
                {" "}
                <span className="font-mono">
                  /username/server-location-1/
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">Civicode</span>
                </span>
                , the database is
                {" "}
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">Civicode</span>
                .
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200" htmlFor="mcp-api-url">
              MCP API URL
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="mcp-api-url"
                type="text"
                value="/api/test-server"
                disabled
                className="min-w-[280px] flex-1 cursor-not-allowed rounded border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              />
              <TestStateButton
                state={mcp}
                initLabel="Test MCP API"
                minWidthClassName="min-w-[118px]"
                onClick={() => {
                  void runMcpDiagnosis();
                }}
              />
            </div>
            <DiagnosticDetails state={mcp} />
          </div>

          <div className="mt-2 flex justify-center">
            <button
              type="submit"
              className="w-full max-w-md rounded bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Save settings
            </button>
          </div>
        </form>

        {message ? <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{message}</p> : null}

        <section className="mt-8 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">How to get the keys</h2>

          <div className="mt-4 space-y-5 text-sm text-zinc-700 dark:text-zinc-300">
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">Gemini API key</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Go to https://aistudio.google.com/app/apikey and sign in.</li>
                <li>Click Create API key.</li>
                <li>Copy the key and paste it into the Gemini API key field above.</li>
                <li>Click Save settings.</li>
              </ol>
            </div>

            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">ChromaDB Cloud credentials</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Go to https://www.trychroma.com/ and sign in.</li>
                <li>Create or open your project.</li>
                <li>Copy API key, tenant, and database values from the project settings.</li>
                <li>Paste them into ChromaDB API key, Chroma tenant, and Chroma database.</li>
                <li>Click Save settings.</li>
              </ol>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
