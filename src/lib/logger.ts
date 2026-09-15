import pino from "pino";

// Strukturiertes Logging ohne personenbezogene Daten (siehe CLAUDE.md
// "Konventionen") — Aufrufer dürfen als Kontext ausschließlich eine
// technische User-ID mitgeben, niemals Name, E-Mail oder andere PII.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: undefined,
});
