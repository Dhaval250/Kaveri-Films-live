"use client";

import { Loader2 } from "lucide-react";

type Props = {
  label?: string;
  fullPage?: boolean;
  rows?: number;
};

/** Centered spinner for full-page or table loading */
export default function LoadingState({
  label = "Loading…",
  fullPage = false,
  rows,
}: Props) {
  if (rows && rows > 0) {
    return (
      <>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i} className="border-t border-slate-100 animate-pulse">
            <td colSpan={20} className="px-4 py-3">
              <div className="h-4 bg-slate-100 rounded w-full max-w-3xl" />
            </td>
          </tr>
        ))}
      </>
    );
  }

  return (
    <div
      className={
        fullPage
          ? "w-full min-h-[50vh] flex flex-col items-center justify-center gap-3"
          : "w-full py-16 flex flex-col items-center justify-center gap-3"
      }
    >
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      <p className="text-sm text-slate-500 font-medium">{label}</p>
    </div>
  );
}
