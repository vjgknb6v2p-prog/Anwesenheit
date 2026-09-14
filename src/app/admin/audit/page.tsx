import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Audit-Log – CheckIn",
};

const ALL_ACTIONS = "ALLE";
const PAGE_SIZE = 100;

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; q?: string }>;
}) {
  await requireRole("ADMIN");
  const { action, q } = await searchParams;

  const [logs, distinctActions] = await Promise.all([
    db.auditLog.findMany({
      where: action && action !== ALL_ACTIONS ? { action } : undefined,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    db.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
  ]);

  const userIds = new Set<string>();
  for (const log of logs) {
    if (log.actorId) userIds.add(log.actorId);
    if (log.targetUserId) userIds.add(log.targetUserId);
  }
  const users = await db.user.findMany({
    where: { id: { in: [...userIds] } },
    select: { id: true, firstName: true, lastName: true },
  });
  const userNames = new Map(
    users.map((user) => [user.id, `${user.firstName} ${user.lastName}`]),
  );

  const query = q?.trim().toLowerCase();
  const filteredLogs = query
    ? logs.filter((log) => {
        const actorName = log.actorId ? (userNames.get(log.actorId) ?? "") : "";
        const targetName = log.targetUserId
          ? (userNames.get(log.targetUserId) ?? "")
          : "";
        return (
          actorName.toLowerCase().includes(query) ||
          targetName.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query)
        );
      })
    : logs;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        Audit-Log ({filteredLogs.length} von {PAGE_SIZE} neuesten geladen)
      </h1>

      <form className="flex flex-wrap gap-2">
        <select
          name="action"
          defaultValue={action ?? ALL_ACTIONS}
          className="border-input bg-background h-11 rounded-xl border px-3 text-sm"
        >
          <option value={ALL_ACTIONS}>Alle Aktionen</option>
          {distinctActions.map((entry) => (
            <option key={entry.action} value={entry.action}>
              {entry.action}
            </option>
          ))}
        </select>
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Name oder Aktion suchen…"
          className="border-input bg-background h-11 max-w-xs rounded-xl border px-3 text-sm"
        />
        <Button type="submit" variant="outline">
          Filtern
        </Button>
      </form>

      {filteredLogs.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Keine Einträge gefunden.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filteredLogs.map((log) => (
            <li key={log.id} className="rounded-2xl border p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{log.action}</span>
                <span className="text-muted-foreground text-xs">
                  {formatDateTime(log.createdAt)} Uhr
                </span>
              </div>
              <p className="text-muted-foreground text-sm">
                Von:{" "}
                {log.actorId
                  ? (userNames.get(log.actorId) ?? log.actorId)
                  : "System"}
                {log.targetUserId &&
                  ` · Betrifft: ${userNames.get(log.targetUserId) ?? log.targetUserId}`}
              </p>
              {log.metadata !== null && (
                <pre className="bg-muted mt-2 overflow-x-auto rounded-xl p-2 text-xs">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
