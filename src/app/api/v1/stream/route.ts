import type { NextRequest } from "next/server";
import { getLiveOverviewSnapshot } from "@/lib/admin-queries";
import { requireApiRole } from "@/lib/authz";
import { logger } from "@/lib/logger";

// Route Handler darf nicht statisch optimiert/gecacht werden — jede Anfrage
// braucht eine frische DB-Abfrage.
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 1500;

/**
 * SSE-Endpoint für die Admin-Live-Übersicht (PROMPT.md Abschnitt 7:
 * "Aktualisierung über SSE ohne Reload ... innerhalb von 2 Sekunden").
 *
 * Kein Redis, kein Pub/Sub (CLAUDE.md: "Kein Redis") — stattdessen pollt der
 * Handler serverseitig alle 1,5 s die DB und streamt den vollen Snapshot an
 * jeden verbundenen Client. Bei fünf Admin-Clients sind das fünf zusätzliche
 * Abfragen pro 1,5 s; für die in PROMPT.md beschriebene Größenordnung
 * (ein Internat, eine Handvoll Admin-Sessions) unproblematisch — siehe
 * docs/decisions.md.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireApiRole("ADMIN");
  if ("response" in authResult) {
    return authResult.response;
  }

  const encoder = new TextEncoder();
  let closed = false;
  let interval: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: unknown) {
        if (closed) {
          return;
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      async function tick() {
        if (closed) {
          return;
        }
        try {
          send(await getLiveOverviewSnapshot());
        } catch (error) {
          logger.error(
            { err: error },
            "SSE-Snapshot für Live-Übersicht fehlgeschlagen",
          );
        }
      }

      function stop() {
        if (closed) {
          return;
        }
        closed = true;
        if (interval) {
          clearInterval(interval);
        }
        try {
          controller.close();
        } catch {
          // Controller kann bereits geschlossen sein, wenn der Client
          // zuerst die Verbindung beendet hat — unkritisch.
        }
      }

      await tick();
      interval = setInterval(() => void tick(), POLL_INTERVAL_MS);
      request.signal.addEventListener("abort", stop);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
