import { describe, expect, it } from "vitest";
import {
  buildOverdueNotification,
  buildReminderNotification,
  buildStaffOverdueSummary,
  hourBucketKey,
  shouldSendOverdueNotice,
  shouldSendReminder,
} from "./notification-rules";

const absence = {
  id: "abs-1",
  plannedReturnAt: new Date("2026-01-05T20:00:00.000Z"),
};

describe("shouldSendReminder", () => {
  it("ist false, wenn die Rückkehr noch weiter entfernt ist als das Fenster", () => {
    const now = new Date("2026-01-05T19:00:00.000Z"); // 60 min vorher
    expect(shouldSendReminder(absence, now, 30)).toBe(false);
  });

  it("ist true, sobald die Rückkehr innerhalb des Fensters liegt", () => {
    const now = new Date("2026-01-05T19:35:00.000Z"); // 25 min vorher
    expect(shouldSendReminder(absence, now, 30)).toBe(true);
  });

  it("ist true exakt an der Fenstergrenze", () => {
    const now = new Date("2026-01-05T19:30:00.000Z"); // exakt 30 min vorher
    expect(shouldSendReminder(absence, now, 30)).toBe(true);
  });

  it("ist false, sobald die geplante Rückkehr bereits erreicht/überschritten ist", () => {
    const now = new Date("2026-01-05T20:00:00.000Z");
    expect(shouldSendReminder(absence, now, 30)).toBe(false);
    expect(
      shouldSendReminder(absence, new Date("2026-01-05T20:05:00.000Z"), 30),
    ).toBe(false);
  });
});

describe("shouldSendOverdueNotice", () => {
  it("ist false innerhalb der Karenzzeit", () => {
    const now = new Date("2026-01-05T20:05:00.000Z"); // 5 min überfällig
    expect(shouldSendOverdueNotice(absence, now, 10)).toBe(false);
  });

  it("ist true exakt am Ende der Karenzzeit", () => {
    const now = new Date("2026-01-05T20:10:00.000Z");
    expect(shouldSendOverdueNotice(absence, now, 10)).toBe(true);
  });

  it("ist true deutlich nach der Karenzzeit", () => {
    const now = new Date("2026-01-05T22:00:00.000Z");
    expect(shouldSendOverdueNotice(absence, now, 10)).toBe(true);
  });

  it("ist false, solange die geplante Rückkehr noch nicht erreicht ist", () => {
    const now = new Date("2026-01-05T19:00:00.000Z");
    expect(shouldSendOverdueNotice(absence, now, 0)).toBe(false);
  });
});

describe("hourBucketKey", () => {
  it("liefert denselben Schlüssel innerhalb derselben Stunde", () => {
    const a = hourBucketKey(new Date("2026-01-05T20:00:00.000Z"));
    const b = hourBucketKey(new Date("2026-01-05T20:59:59.999Z"));
    expect(a).toBe(b);
  });

  it("liefert unterschiedliche Schlüssel in unterschiedlichen Stunden", () => {
    const a = hourBucketKey(new Date("2026-01-05T20:59:59.999Z"));
    const b = hourBucketKey(new Date("2026-01-05T21:00:00.000Z"));
    expect(a).not.toBe(b);
  });
});

describe("buildReminderNotification / buildOverdueNotification", () => {
  it("nutzt die Absence-ID als sourceId", () => {
    expect(buildReminderNotification(absence, "21:30").sourceId).toBe("abs-1");
    expect(buildOverdueNotification(absence, "21:30").sourceId).toBe("abs-1");
  });

  it("formatiert die Nachrichtentexte mit der übergebenen Uhrzeit", () => {
    expect(buildReminderNotification(absence, "21:30").message).toBe(
      "Deine geplante Rückkehr ist um 21:30 Uhr.",
    );
    expect(buildOverdueNotification(absence, "21:30").message).toBe(
      "Deine geplante Rückkehrzeit (21:30 Uhr) ist überschritten.",
    );
  });
});

describe("buildStaffOverdueSummary", () => {
  it("verwendet den Singular bei genau einem überfälligen Schüler", () => {
    const result = buildStaffOverdueSummary(
      1,
      new Date("2026-01-05T20:00:00.000Z"),
    );
    expect(result.message).toBe("1 Schüler ist aktuell überfällig.");
  });

  it("verwendet den Plural bei mehreren überfälligen Schülern", () => {
    const result = buildStaffOverdueSummary(
      3,
      new Date("2026-01-05T20:00:00.000Z"),
    );
    expect(result.message).toBe("3 Schüler sind aktuell überfällig.");
  });

  it("dedupliziert über die Stunden-Bucket-sourceId", () => {
    const a = buildStaffOverdueSummary(2, new Date("2026-01-05T20:10:00.000Z"));
    const b = buildStaffOverdueSummary(2, new Date("2026-01-05T20:40:00.000Z"));
    expect(a.sourceId).toBe(b.sourceId);
  });
});
