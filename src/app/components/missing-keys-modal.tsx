"use client";

import Link from "next/link";

type MissingKeysModalProps = {
  isOpen: boolean;
  actionLabel: string;
  missingFields: string[];
  onClose: () => void;
};

export function MissingKeysModal({
  isOpen,
  actionLabel,
  missingFields,
  onClose,
}: MissingKeysModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-md rounded-lg border border-zinc-300 bg-white p-5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Missing API settings</h2>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          Add these settings before you can {actionLabel}:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-800 dark:text-zinc-200">
          {missingFields.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
          >
            Close
          </button>
          <Link
            href="/settings"
            onClick={onClose}
            className="rounded bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Open Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
