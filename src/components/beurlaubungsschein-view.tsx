"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export interface BeurlaubungsscheinData {
  studentName: string;
  schoolClass: string | null;
  room: string | null;
  residentialAreaName: string | null;
  reasonLabel: string;
  reasonDetail: string | null;
  destination: string;
  checkedOutAt: string;
  plannedReturnAt: string;
  checkedInAt: string | null;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  issuedAt: string;
}

/**
 * Erweiterung "Beurlaubungsschein-PDF": statt einer eigenen PDF-Bibliothek
 * (zusätzliche Abhängigkeit, siehe docs/decisions.md) eine eigenständige,
 * druckoptimierte Seite — `window.print()` erzeugt in jedem Zielbrowser
 * (Tablet/Desktop) direkt ein PDF über "Als PDF speichern". `print:hidden`
 * blendet Bedienelemente beim Drucken aus.
 */
export function BeurlaubungsscheinView({
  data,
  backHref,
}: {
  data: BeurlaubungsscheinData;
  backHref: string;
}) {
  const router = useRouter();

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8 print:p-0">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Button variant="outline" onClick={() => router.push(backHref)}>
          Zurück
        </Button>
        <Button onClick={() => window.print()}>
          Drucken / Als PDF speichern
        </Button>
      </div>

      <header className="flex flex-col gap-1 border-b pb-4">
        <p className="text-muted-foreground text-sm print:text-black">
          CheckIn – Internats-Ausgangsverwaltung
        </p>
        <h1 className="text-2xl font-semibold">Beurlaubungsschein</h1>
      </header>

      {data.status === "CANCELLED" && (
        <p className="bg-status-absent/10 text-status-absent rounded-xl border p-3 text-sm font-medium print:border-black">
          Diese Abwesenheit wurde storniert und ist nicht gültig.
        </p>
      )}

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground print:text-black">Schüler</dt>
        <dd className="font-medium">{data.studentName}</dd>

        <dt className="text-muted-foreground print:text-black">Klasse</dt>
        <dd>{data.schoolClass ?? "–"}</dd>

        <dt className="text-muted-foreground print:text-black">Zimmer</dt>
        <dd>{data.room ?? "–"}</dd>

        <dt className="text-muted-foreground print:text-black">Wohnbereich</dt>
        <dd>{data.residentialAreaName ?? "–"}</dd>

        <dt className="text-muted-foreground print:text-black">Grund</dt>
        <dd>
          {data.reasonLabel}
          {data.reasonDetail ? ` – ${data.reasonDetail}` : ""}
        </dd>

        <dt className="text-muted-foreground print:text-black">Ziel</dt>
        <dd>{data.destination}</dd>

        <dt className="text-muted-foreground print:text-black">Ausgecheckt</dt>
        <dd>{data.checkedOutAt} Uhr</dd>

        <dt className="text-muted-foreground print:text-black">
          Geplante Rückkehr
        </dt>
        <dd>{data.plannedReturnAt} Uhr</dd>

        {data.checkedInAt && (
          <>
            <dt className="text-muted-foreground print:text-black">
              Tatsächliche Rückkehr
            </dt>
            <dd>{data.checkedInAt} Uhr</dd>
          </>
        )}
      </dl>

      <p className="text-muted-foreground mt-4 text-sm print:text-black">
        Dieser Beurlaubungsschein bestätigt die genehmigte Abwesenheit gemäß der
        Internatsordnung. Erstellt am {data.issuedAt} Uhr.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-8 text-sm print:mt-16">
        <div className="border-t pt-2">Unterschrift Mitarbeiter/in</div>
        <div className="border-t pt-2">Unterschrift Schüler/in</div>
      </div>
    </div>
  );
}
