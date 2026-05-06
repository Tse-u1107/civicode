"use client";

import { FlaskConical, Home, MessageSquare, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { appRoutes } from "../routes";
import civicodeLogo from "../civicode_thin.png";

const iconByName: Record<string, LucideIcon> = {
  Home,
  Chat: MessageSquare,
  Flask: FlaskConical,
};

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const widthClassName = useMemo(
    () => (isCollapsed ? "w-16" : "w-64"),
    [isCollapsed],
  );

  return (
    <aside
      className={`h-screen shrink-0 border-r border-zinc-200 bg-zinc-50 p-3 transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-950 ${widthClassName}`}
    >
      <div
        className={`relative mb-4 overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${
          isCollapsed ? "mx-auto h-10 w-10 p-1" : "h-14 w-full px-3 py-2"
        }`}
      >
        <Image
          src={civicodeLogo}
          alt="Civicode logo"
          fill
          priority
          className="object-contain"
        />
      </div>

      <button
        type="button"
        onClick={() => setIsCollapsed((current) => !current)}
        className="mb-3 flex w-full items-center justify-center rounded border border-zinc-300 px-2 py-2 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        {isCollapsed ? ">>" : "<<"}
      </button>

      <nav className="flex flex-col gap-2">
        {appRoutes.map((route) => {
          const isActive = pathname === route.link;
          const Icon = iconByName[route.icon] ?? FlaskConical;

          return (
            <Link
              key={route.link}
              href={route.link}
              className={`flex items-center gap-2 rounded px-2 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
              }`}
              title={route.name}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center">
                <Icon size={18} strokeWidth={2} />
              </span>
              {!isCollapsed && <span>{route.name}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
