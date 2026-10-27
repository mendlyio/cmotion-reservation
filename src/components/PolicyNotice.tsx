import { POLICY_TEXT, POLICY_TITLE } from "@/lib/deadline";

export function PolicyNotice({ deadlineLabel }: { deadlineLabel?: string }) {
  return (
    <div className="rounded-xl border-2 border-amber-400 bg-amber-400/15 px-4 py-3 text-amber-50">
      <p className="text-sm font-extrabold uppercase tracking-wide text-amber-300">{POLICY_TITLE}</p>
      <p className="mt-1 text-sm font-semibold leading-snug text-amber-50">
        {POLICY_TEXT}
        {deadlineLabel ? ` Date limite : ${deadlineLabel}.` : ""}
      </p>
    </div>
  );
}
