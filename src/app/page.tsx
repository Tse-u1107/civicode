 "use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  MAX_STATE_PROGRESS,
  readStateProgressFromStorage,
  STATE_PROGRESS_STORAGE_KEY,
  STATE_PROGRESS_UPDATED_EVENT,
  type StateProgressMap,
} from "@/lib/state-progress";

type StateTile = {
  abbr: string;
  row: number;
  col: number;
};

const US_STATE_TILES: StateTile[] = [
  { abbr: "WA", row: 0, col: 0 },
  { abbr: "MT", row: 0, col: 2 },
  { abbr: "ND", row: 0, col: 4 },
  { abbr: "MN", row: 0, col: 5 },
  { abbr: "WI", row: 0, col: 6 },
  { abbr: "MI", row: 0, col: 7 },
  { abbr: "VT", row: 0, col: 10 },
  { abbr: "ME", row: 0, col: 11 },
  { abbr: "OR", row: 1, col: 0 },
  { abbr: "ID", row: 1, col: 1 },
  { abbr: "WY", row: 1, col: 2 },
  { abbr: "SD", row: 1, col: 4 },
  { abbr: "IA", row: 1, col: 5 },
  { abbr: "IL", row: 1, col: 6 },
  { abbr: "IN", row: 1, col: 7 },
  { abbr: "OH", row: 1, col: 8 },
  { abbr: "PA", row: 1, col: 9 },
  { abbr: "NY", row: 1, col: 10 },
  { abbr: "NV", row: 2, col: 1 },
  { abbr: "UT", row: 2, col: 2 },
  { abbr: "CO", row: 2, col: 3 },
  { abbr: "NE", row: 2, col: 4 },
  { abbr: "MO", row: 2, col: 5 },
  { abbr: "KY", row: 2, col: 7 },
  { abbr: "WV", row: 2, col: 8 },
  { abbr: "VA", row: 2, col: 9 },
  { abbr: "CA", row: 3, col: 0 },
  { abbr: "AZ", row: 3, col: 2 },
  { abbr: "NM", row: 3, col: 3 },
  { abbr: "KS", row: 3, col: 4 },
  { abbr: "AR", row: 3, col: 5 },
  { abbr: "TN", row: 3, col: 7 },
  { abbr: "NC", row: 3, col: 9 },
  { abbr: "SC", row: 3, col: 10 },
  { abbr: "OK", row: 4, col: 4 },
  { abbr: "LA", row: 4, col: 5 },
  { abbr: "MS", row: 4, col: 6 },
  { abbr: "AL", row: 4, col: 7 },
  { abbr: "GA", row: 4, col: 8 },
  { abbr: "FL", row: 5, col: 9 },
  { abbr: "TX", row: 5, col: 4 },
  { abbr: "AK", row: 6, col: 0 },
  { abbr: "HI", row: 6, col: 2 },
  { abbr: "MD", row: 2, col: 10 },
  { abbr: "DE", row: 2, col: 11 },
  { abbr: "NJ", row: 2, col: 12 },
  { abbr: "CT", row: 1, col: 11 },
  { abbr: "RI", row: 1, col: 12 },
  { abbr: "MA", row: 1, col: 13 },
  { abbr: "NH", row: 0, col: 12 },
  { abbr: "DC", row: 3, col: 11 },
];

function getStateTileColor(progress: number): string {
  const ratio = Math.max(0, Math.min(1, progress / MAX_STATE_PROGRESS));
  const saturation = 6 + ratio * 80;
  const lightness = 82 - ratio * 38;
  return `hsl(142 ${saturation}% ${lightness}%)`;
}

export default function HomePage() {
  const router = useRouter();
  const [progressByState, setProgressByState] = useState<StateProgressMap>(() => readStateProgressFromStorage());
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== STATE_PROGRESS_STORAGE_KEY) {
        return;
      }
      setProgressByState(readStateProgressFromStorage());
    };
    const handleProgressUpdate = () => {
      setProgressByState(readStateProgressFromStorage());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(STATE_PROGRESS_UPDATED_EVENT, handleProgressUpdate);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(STATE_PROGRESS_UPDATED_EVENT, handleProgressUpdate);
    };
  }, []);

  const totalScore = useMemo(
    () => Object.values(progressByState).reduce((acc, current) => acc + current, 0),
    [progressByState],
  );
  const hoveredScore = hoveredState ? (progressByState[hoveredState] ?? 0) : 0;
  const hoveredIsEmpty = hoveredScore === 0;

  return (
    <div className="p-8 font-sans">
      <main className="w-full rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-4 text-2xl font-semibold text-black dark:text-zinc-50">
          Home
        </h1>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          State progress fills on each successful retrieve request. Each state is capped at {MAX_STATE_PROGRESS}.
        </p>
        <p className="mb-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Total score: {totalScore}
        </p>

        <div className="overflow-x-auto rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <div
            className="grid w-max grid-cols-[repeat(14,minmax(0,1fr))] gap-1"
            role="img"
            aria-label="Blocky United States grid progress map"
          >
            {US_STATE_TILES.map((tile) => {
              const score = progressByState[tile.abbr] ?? 0;
              return (
                <div
                  key={tile.abbr}
                  className="flex h-15 w-15 cursor-pointer items-center justify-center rounded-sm border border-zinc-300 text-[10px] font-semibold text-zinc-900 transition-transform hover:scale-105 dark:border-zinc-700 dark:text-zinc-100"
                  style={{
                    gridRowStart: tile.row + 1,
                    gridColumnStart: tile.col + 1,
                    backgroundColor: getStateTileColor(score),
                  }}
                  onMouseEnter={(event) => {
                    setHoveredState(tile.abbr);
                    setCursorPosition({ x: event.clientX, y: event.clientY });
                  }}
                  onMouseMove={(event) => {
                    setCursorPosition({ x: event.clientX, y: event.clientY });
                  }}
                  onMouseLeave={() => {
                    setHoveredState(null);
                  }}
                  onClick={() => {
                    router.push(score === 0 ? "/retrieve" : "/chat");
                  }}
                >
                  {tile.abbr}
                </div>
              );
            })}
          </div>
        </div>

        {hoveredState ? (
          <div
            className="pointer-events-none fixed z-30 w-44 rounded border border-zinc-300 bg-white p-2 text-left text-xs font-normal text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            style={{
              left: cursorPosition.x + 12,
              top: cursorPosition.y + 12,
            }}
          >
            <p className="font-semibold">
              {hoveredScore} / {MAX_STATE_PROGRESS}
            </p>
            <p className="mt-1">
              {hoveredIsEmpty ? (
                <>Empty. Go fetch some data</>
              ) : (
                <>Go ask something</>
              )}
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
