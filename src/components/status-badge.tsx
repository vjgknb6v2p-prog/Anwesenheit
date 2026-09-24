import type { StudentStatus } from "@/domain/status";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<StudentStatus, string> = {
  ANWESEND: "Anwesend",
  ABWESEND: "Abwesend",
  UEBERFAELLIG: "Überfällig",
};

const STATUS_CLASSES: Record<StudentStatus, string> = {
  ANWESEND: "bg-status-present text-status-present-foreground",
  ABWESEND: "bg-status-absent text-status-absent-foreground",
  UEBERFAELLIG: "bg-status-overdue text-status-overdue-foreground",
};

export function StatusBadge({ status }: { status: StudentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
        STATUS_CLASSES[status],
      )}
    >
      {status === "UEBERFAELLIG" && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"
        />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}
