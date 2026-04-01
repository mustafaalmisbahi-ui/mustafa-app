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
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-zinc-100 text-zinc-700",
  pending_update: "bg-amber-100 text-amber-800",
  draft: "bg-sky-100 text-sky-800",
  temporary: "bg-violet-100 text-violet-800",
};

export function StatusBadge({ status }: { status: StatusValue }) {
  return (
    <Badge className={`${statusClass[status]} border-0 font-medium`}>
      {statusLabel[status]}
    </Badge>
  );
}
