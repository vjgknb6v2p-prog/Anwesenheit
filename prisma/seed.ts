/**
 * Testdaten für lokale Entwicklung und Tests. PROMPT.md Abschnitt 0: "Keine
 * Hardcoded-Beispieldaten im Anwendungscode. Testdaten ausschließlich in
 * prisma/seed.ts." — dieses Skript ist entsprechend die einzige Stelle, an
 * der Beispiel-Namen, -E-Mails und -Historien vorkommen.
 *
 * Aufruf: `pnpm db:seed` (führt intern `prisma db seed` aus, siehe
 * package.json → "prisma.seed").
 */
import { PrismaClient } from "@prisma/client";
import {
  ABSENCE_REASONS,
  type AbsenceReason,
} from "../src/domain/absence-reason";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient();

const DESTINATIONS_BY_REASON: Record<AbsenceReason, string> = {
  HEIMFAHRT: "Elternhaus",
  ARZT: "Arztpraxis Dr. Bergmann",
  SPORT_VEREIN: "Sportverein TSV Internatsstadt",
  EINKAUF_STADT: "Stadtzentrum",
  FAMILIE_BESUCH: "Familie in der Nähe",
  SCHULVERANSTALTUNG: "Schulveranstaltung",
  SONSTIGES: "Termin in der Stadt",
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(items: readonly T[]): T {
  const item = items[randomInt(0, items.length - 1)];
  if (item === undefined) {
    throw new Error("pickRandom: leere Liste übergeben");
  }
  return item;
}

/**
 * Liefert einen Tag innerhalb der letzten 90 Tage, bevorzugt Wochenenden
 * (PROMPT.md Abschnitt 10: "mehr am Wochenende"). Ein Wochenendtag wird immer
 * akzeptiert; ein Wochentag nur mit 35% Wahrscheinlichkeit, sonst wird
 * (bis zu 10x) neu gewürfelt.
 */
function pickWeekendBiasedDaysAgo(): number {
  for (let attempt = 0; attempt < 10; attempt++) {
    const daysAgo = randomInt(1, 90);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    if (isWeekend || Math.random() < 0.35) {
      return daysAgo;
    }
  }
  return randomInt(1, 90);
}

function atHour(daysAgo: number, hour: number, minute: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
}

interface HistoricalAbsenceInput {
  userId: string;
}

function buildHistoricalAbsence({ userId }: HistoricalAbsenceInput) {
  const daysAgo = pickWeekendBiasedDaysAgo();
  const reason = pickRandom(ABSENCE_REASONS);
  const checkedOutAt = atHour(daysAgo, randomInt(9, 18), randomInt(0, 59));

  const durationHours = randomInt(2, 30);
  const plannedReturnAt = new Date(
    checkedOutAt.getTime() + durationHours * 60 * 60 * 1000,
  );

  // Meist pünktlich, manchmal etwas früher oder später zurück — damit spätere
  // Statistiken (Phase 5) über verspätete Rückkehren etwas zum Auswerten haben.
  const returnOffsetMinutes = randomInt(-60, 90);
  const checkedInAt = new Date(
    plannedReturnAt.getTime() + returnOffsetMinutes * 60 * 1000,
  );

  return {
    userId,
    checkedOutAt,
    plannedReturnAt,
    checkedInAt,
    reason,
    reasonDetail: reason === "SONSTIGES" ? "Behördengang" : null,
    destination: DESTINATIONS_BY_REASON[reason],
    status: "COMPLETED" as const,
  };
}

async function main() {
  console.log("Lösche vorhandene Daten …");
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.pushSubscription.deleteMany();
  await db.extension.deleteMany();
  await db.absence.deleteMany();
  await db.passwordResetToken.deleteMany();
  await db.user.deleteMany();
  await db.residentialArea.deleteMany();
  await db.setting.deleteMany();

  console.log("Lege Wohnbereiche an …");
  const [hausNord, hausSued, altbau] = await Promise.all(
    ["Haus Nord", "Haus Süd", "Altbau"].map((name) =>
      db.residentialArea.create({ data: { name } }),
    ),
  );
  if (!hausNord || !hausSued || !altbau) {
    throw new Error("Wohnbereiche konnten nicht angelegt werden");
  }

  console.log("Lege Einstellungen an …");
  await db.setting.createMany({
    data: [
      { key: "requireExtensionApproval", value: false },
      { key: "reminderMinutesBefore", value: 30 },
      { key: "overdueGraceMinutes", value: 10 },
      { key: "maxPlannedDurationHours", value: 72 },
      { key: "curfewTime", value: "22:00" },
    ],
  });

  console.log("Lege Benutzer an …");
  const [adminPasswordHash, staffPasswordHash, studentPasswordHash] =
    await Promise.all([
      hashPassword("Admin!2026"),
      hashPassword("Staff!2026"),
      hashPassword("Schueler!2026"),
    ]);

  const admin = await db.user.create({
    data: {
      firstName: "System",
      lastName: "Administrator",
      email: "admin@internat.de",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  const staffMembers = await Promise.all([
    db.user.create({
      data: {
        firstName: "Katrin",
        lastName: "Weber",
        email: "k.weber@internat.de",
        passwordHash: staffPasswordHash,
        role: "STAFF",
        residentialAreaId: hausNord.id,
      },
    }),
    db.user.create({
      data: {
        firstName: "Michael",
        lastName: "Schulz",
        email: "m.schulz@internat.de",
        passwordHash: staffPasswordHash,
        role: "STAFF",
        residentialAreaId: hausSued.id,
      },
    }),
  ]);

  const studentSeeds = [
    {
      firstName: "Lena",
      lastName: "Bauer",
      email: "lena.b@internat.de",
      schoolClass: "10b",
      room: "N-104",
      residentialAreaId: hausNord.id,
    },
    {
      firstName: "Jonas",
      lastName: "Klein",
      email: "jonas.k@internat.de",
      schoolClass: "9a",
      room: "S-201",
      residentialAreaId: hausSued.id,
    },
    {
      firstName: "Mia",
      lastName: "Hoffmann",
      email: "mia.h@internat.de",
      schoolClass: "11c",
      room: "A-014",
      residentialAreaId: altbau.id,
    },
    {
      firstName: "Finn",
      lastName: "Richter",
      email: "finn.r@internat.de",
      schoolClass: "10b",
      room: "N-112",
      residentialAreaId: hausNord.id,
    },
    {
      firstName: "Sara",
      lastName: "Lange",
      email: "sara.l@internat.de",
      schoolClass: "9a",
      room: "S-207",
      residentialAreaId: hausSued.id,
    },
  ] as const;

  const students = await Promise.all(
    studentSeeds.map((seed) =>
      db.user.create({
        data: { ...seed, passwordHash: studentPasswordHash, role: "STUDENT" },
      }),
    ),
  );

  console.log(
    "Lege Ausgangslage an (1 rechtzeitig abwesend, 1 überfällig, 3 anwesend) …",
  );
  const [onTimeStudent, overdueStudent] = students;
  if (!onTimeStudent || !overdueStudent) {
    throw new Error("Zu wenige Schüler für die Ausgangslage angelegt");
  }

  await db.absence.create({
    data: {
      userId: onTimeStudent.id,
      checkedOutAt: atHour(0, 14, 0),
      plannedReturnAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      reason: "EINKAUF_STADT",
      destination: DESTINATIONS_BY_REASON.EINKAUF_STADT,
      status: "ACTIVE",
    },
  });

  await db.absence.create({
    data: {
      userId: overdueStudent.id,
      checkedOutAt: atHour(1, 10, 0),
      plannedReturnAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      reason: "HEIMFAHRT",
      destination: DESTINATIONS_BY_REASON.HEIMFAHRT,
      status: "ACTIVE",
    },
  });

  console.log("Lege ~60 historische Abwesenheiten an …");
  const historicalAbsences = Array.from({ length: 60 }, () =>
    buildHistoricalAbsence({ userId: pickRandom(students).id }),
  );
  await db.absence.createMany({ data: historicalAbsences });

  console.log("Fertig:", {
    admin: admin.email,
    staff: staffMembers.map((s) => s.email),
    students: students.map((s) => s.email),
    residentialAreas: [hausNord.name, hausSued.name, altbau.name],
    historicalAbsences: historicalAbsences.length,
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
