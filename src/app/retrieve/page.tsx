"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { extractStateFromInput, incrementStateProgress } from "@/lib/state-progress";

const INPUT_PLACEHOLDER = "VA, Norfolk, foundation vent";
const INPUT_HELP = "Format: state_abbr, municipality_name, query (comma-separated)";

export default function RetrievePage() {
  const [input, setInput] = useState(INPUT_PLACEHOLDER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<unknown | null>(null);
  const [hasRetrieved, setHasRetrieved] = useState(false);
  const [hasStoredOnce, setHasStoredOnce] = useState(false);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState("");
  const [storeMessage, setStoreMessage] = useState("");
  const [storeNextStartIndex, setStoreNextStartIndex] = useState(0);
  const [storeHasMore, setStoreHasMore] = useState(false);

  const formattedResult = useMemo(() => {
    if (!result) {
      return "";
    }
    return JSON.stringify(result, null, 2);
  }, [result]);

  const canStore = useMemo(() => {
    if (!result || error) {
      return false;
    }

    const resultObject = result as { steps?: unknown };
    if (!Array.isArray(resultObject.steps)) {
      return false;
    }

    return resultObject.steps.some((step) => {
      const stepObject = step as { step?: unknown; ok?: unknown };
      return stepObject.step === 5 && stepObject.ok === true;
    });
  }, [error, result]);

  const canRunRetrieve = !hasRetrieved && !loading && !storeLoading;
  const canRunStore = hasRetrieved && !hasStoredOnce && canStore && !loading && !storeLoading;
  const canRunStoreAgain = hasStoredOnce && canStore && storeHasMore && !loading && !storeLoading;

  function resetFlow(nextInput: string) {
    setInput(nextInput);
    setError("");
    setResult(null);
    setHasRetrieved(false);
    setHasStoredOnce(false);
    setStoreError("");
    setStoreMessage("");
    setStoreNextStartIndex(0);
    setStoreHasMore(false);
  }

  async function handleRetrieve() {
    if (!canRunRetrieve) {
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setHasRetrieved(false);
    setHasStoredOnce(false);
    setStoreError("");
    setStoreMessage("");
    setStoreNextStartIndex(0);
    setStoreHasMore(false);

    try {
      const response = await fetch("/api/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });

      const data: unknown = await response.json();
      if (!response.ok) {
        const responseObject = data as { error?: unknown };
        const message =
          typeof responseObject.error === "string"
            ? responseObject.error
            : `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      setResult(data);
      setHasRetrieved(true);
      const stateAbbr = extractStateFromInput(input);
      if (stateAbbr) {
        incrementStateProgress(stateAbbr, 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleStore(startIndex = 0) {
    if (!canStore || !result) {
      return;
    }

    setStoreLoading(true);
    setStoreError("");
    setStoreMessage("");

    try {
      const response = await fetch("/api/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, result, startIndex }),
      });

      const data = (await response.json()) as {
        error?: unknown;
        storedCount?: unknown;
        skippedChunks?: unknown;
        totalChunks?: unknown;
        hasMore?: unknown;
        nextStartIndex?: unknown;
      };
      if (!response.ok) {
        const message =
          typeof data.error === "string"
            ? data.error
            : `Store request failed with status ${response.status}`;
        throw new Error(message);
      }

      const storedCount = typeof data.storedCount === "number" ? data.storedCount : 0;
      const skippedChunks = typeof data.skippedChunks === "number" ? data.skippedChunks : 0;
      const totalChunks = typeof data.totalChunks === "number" ? data.totalChunks : storedCount;
      const hasMore = data.hasMore === true;
      const nextStartIndex = typeof data.nextStartIndex === "number" ? data.nextStartIndex : 0;
      if (startIndex === 0) {
        setHasStoredOnce(true);
      }
      setStoreHasMore(hasMore);
      setStoreNextStartIndex(nextStartIndex);

      const progressText = `${Math.min(nextStartIndex, totalChunks)}/${totalChunks}`;
      if (skippedChunks > 0) {
        setStoreMessage(
          `Stored ${storedCount} chunk(s) this run (${progressText} total). `
            + `${skippedChunks} remaining chunk(s). Click "Store Remaining Chunks" to continue.`,
        );
      } else {
        setStoreMessage(`Stored ${storedCount} chunk(s) this run (${progressText} total) with 3-month expiry.`);
      }
    } catch (err) {
      setStoreError(err instanceof Error ? err.message : String(err));
    } finally {
      setStoreLoading(false);
    }
  }

  return (
    <div className="p-8 font-sans">
      <main className="w-full rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-2 text-2xl font-semibold text-black dark:text-zinc-50">Retrieve full step 4 content</h1>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{INPUT_HELP}</p>

        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={input}
            onChange={(event) => resetFlow(event.target.value)}
            placeholder={INPUT_PLACEHOLDER}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Changing input resets steps 1-3.</p>

          <div className="mt-1 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                1. Retrieve
              </span>
              <span className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
              <button
                type="button"
                onClick={handleRetrieve}
                disabled={!canRunRetrieve}
                className={`flex w-fit items-center gap-1 rounded px-4 py-2 disabled:opacity-60 ${
                  hasRetrieved
                    ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950"
                    : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                }`}
              >
                {loading ? "Running..." : hasRetrieved ? (
                  <>
                    <Check size={14} className="text-emerald-400 dark:text-emerald-600" />
                    Done
                  </>
                ) : "Run"}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium text-zinc-800 dark:text-zinc-200">2. Store</span>
              <span className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
              <button
                type="button"
                onClick={() => handleStore(0)}
                disabled={!canRunStore}
                className={`flex w-fit items-center gap-1 rounded px-4 py-2 disabled:opacity-50 ${
                  hasStoredOnce
                    ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950"
                    : "bg-blue-600 text-white dark:bg-blue-500"
                }`}
              >
                {storeLoading && !hasStoredOnce ? "Storing..." : hasStoredOnce ? (
                  <>
                    <Check size={14} className="text-emerald-200 dark:text-emerald-600" />
                    Done
                  </>
                ) : "Run"}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                3. Store again
              </span>
              <span className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
              <button
                type="button"
                onClick={() => handleStore(storeNextStartIndex)}
                disabled={!canRunStoreAgain}
                className="w-fit rounded bg-sky-700 px-4 py-2 text-white disabled:opacity-50 dark:bg-sky-600"
              >
                {storeLoading && hasStoredOnce ? "Storing..." : "Run"}
              </button>
            </div>
          </div>

          {storeError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{storeError}</p>
          ) : storeMessage ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{storeMessage}</p>
          ) : null}
        </div>

        <div className="mt-4 rounded border border-zinc-300 bg-zinc-100 p-4 dark:border-zinc-700 dark:bg-zinc-900">
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : formattedResult ? (
            <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-zinc-900 dark:text-zinc-100">
              {formattedResult}
            </pre>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Enter comma-separated input, then press Retrieve to show the response here.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
