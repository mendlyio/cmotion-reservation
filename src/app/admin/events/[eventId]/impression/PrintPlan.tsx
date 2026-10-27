"use client";

import { SeatingPlan } from "@/components/seating/SeatingPlan";
import { TableWithSeats } from "@/types";

export function PrintPlan({
  eventId,
  title,
  tables,
}: {
  eventId: number;
  title: string;
  tables: TableWithSeats[];
}) {
  return (
    <div className="bg-white text-black min-h-screen">
      <style>{`
        .print-title { display: none; }
        @media print {
          nav, .no-print { display: none !important; }
          .print-title { display: block !important; }
          body, .min-h-screen { background: #fff !important; }
        }
      `}</style>
      <div className="no-print flex items-center justify-between gap-3 px-4 py-3 border-b border-neutral-200">
        <h1 className="text-sm font-bold">{title}</h1>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold"
        >
          Imprimer
        </button>
      </div>
      <h1 className="print-title text-center text-lg font-bold py-3">{title}</h1>
      <SeatingPlan eventId={eventId} tables={tables} readOnly printMode hideZoom />
    </div>
  );
}
