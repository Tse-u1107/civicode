"use client";

import { useMemo, useState } from "react";

export default function TestMcpApiPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<unknown | null>(null);

  const formattedResult = useMemo(() => {
    if (!result) {
      return "";
    }
    return JSON.stringify(result, null, 2);
  }, [result]);

  async function runServerTest() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/test-server");
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data: unknown = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 font-sans">
      <main className="w-full rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-4 text-2xl font-semibold text-black dark:text-zinc-50">
          Municode test_server simulation
        </h1>
        <button
          type="button"
          onClick={runServerTest}
          disabled={loading}
          className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? "Running..." : "Run test_server"}
        </button>

        <div className="mt-4 rounded border border-zinc-300 bg-zinc-100 p-4 dark:border-zinc-700 dark:bg-zinc-900">
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : formattedResult ? (
            <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-zinc-900 dark:text-zinc-100">
              {formattedResult}
            </pre>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Press the button to run the API test and show the response here.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
