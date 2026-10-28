"use client";

import { usePathname } from "next/navigation";

export function TestModeBanner() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <div role="status" className="bg-[#c9a227] text-black">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
        <p className="text-sm font-bold leading-snug">{"Mode test, réservé à l'administrateur"}</p>
        <form action="/api/admin/logout" method="POST" className="shrink-0">
          <input type="hidden" name="returnTo" value="/" />
          <button
            type="submit"
            className="rounded-lg border border-black/20 bg-black/10 px-3 py-1.5 text-xs font-bold hover:bg-black/20"
          >
            Quitter ce mode
          </button>
        </form>
      </div>
    </div>
  );
}
