import { describe, expect, it } from "vitest";
import { canSendMessageTo, summarizeConversations } from "./messaging";

describe("canSendMessageTo", () => {
  it("Schüler dürfen an Mitarbeiter schreiben", () => {
    expect(canSendMessageTo("STUDENT", "STAFF")).toBe(true);
  });

  it("Schüler dürfen an Admin schreiben", () => {
    expect(canSendMessageTo("STUDENT", "ADMIN")).toBe(true);
  });

  it("Schüler dürfen NICHT an andere Schüler schreiben", () => {
    expect(canSendMessageTo("STUDENT", "STUDENT")).toBe(false);
  });

  it("Mitarbeiter dürfen an jede Rolle schreiben", () => {
    expect(canSendMessageTo("STAFF", "STUDENT")).toBe(true);
    expect(canSendMessageTo("STAFF", "STAFF")).toBe(true);
    expect(canSendMessageTo("STAFF", "ADMIN")).toBe(true);
  });

  it("Admin darf an jede Rolle schreiben", () => {
    expect(canSendMessageTo("ADMIN", "STUDENT")).toBe(true);
    expect(canSendMessageTo("ADMIN", "STAFF")).toBe(true);
  });
});

describe("summarizeConversations", () => {
  const me = "user-me";
  const partnerA = "user-a";
  const partnerB = "user-b";

  it("gruppiert Nachrichten nach Gesprächspartner und sortiert nach letzter Aktivität", () => {
    const result = summarizeConversations(me, [
      {
        partnerId: partnerA,
        senderId: partnerA,
        recipientId: me,
        readAt: null,
        createdAt: new Date("2026-01-01T10:00:00Z"),
      },
      {
        partnerId: partnerB,
        senderId: me,
        recipientId: partnerB,
        readAt: new Date("2026-01-02T09:00:00Z"),
        createdAt: new Date("2026-01-02T08:00:00Z"),
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]?.partnerId).toBe(partnerB);
    expect(result[1]?.partnerId).toBe(partnerA);
  });

  it("zählt nur ungelesene, an den aktuellen Nutzer gerichtete Nachrichten", () => {
    const result = summarizeConversations(me, [
      {
        partnerId: partnerA,
        senderId: partnerA,
        recipientId: me,
        readAt: null,
        createdAt: new Date("2026-01-01T10:00:00Z"),
      },
      {
        partnerId: partnerA,
        senderId: me,
        recipientId: partnerA,
        readAt: null,
        createdAt: new Date("2026-01-01T11:00:00Z"),
      },
    ]);

    expect(result[0]?.unreadCount).toBe(1);
    expect(result[0]?.lastMessageAt).toEqual(new Date("2026-01-01T11:00:00Z"));
  });

  it("liefert eine leere Liste ohne Nachrichten", () => {
    expect(summarizeConversations(me, [])).toEqual([]);
  });
});
