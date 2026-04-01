import { Badge } from "@/components/ui/badge";

type StatusValue = "active" | "inactive" | "pending_update" | "draft" | "temporary";

const statusLabel: Record<StatusValue, string> = {
  active: "نشط",
  inactive: "غير نشط",
  pending_update: "بانتظار تحديث",
  draft: "مسودة",
  temporary: "مؤقت",
};

const statusClass: Record<StatusValue, string> = {
  active: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/60",
  inactive: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200/60",
  pending_update: "bg-amber-100 text-amber-800 ring-1 ring-amber-200/60",
  draft: "bg-sky-100 text-sky-800 ring-1 ring-sky-200/60",
  temporary: "bg-violet-100 text-violet-800 ring-1 ring-violet-200/60",
};

export function StatusBadge({ status }: { status: StatusValue }) {
  return (
    <Badge className={`${statusClass[status]} border-0 font-medium`}>
      {statusLabel[status]}
    </Badge>
  );
}
