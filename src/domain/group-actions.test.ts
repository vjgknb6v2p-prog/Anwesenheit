import { describe, expect, it } from "vitest";
import {
  selectEligibleForGroupCheckIn,
  selectEligibleForGroupCheckOut,
  type GroupCheckInCandidate,
  type GroupCheckOutCandidate,
} from "./group-actions";

describe("selectEligibleForGroupCheckOut", () => {
  const candidates: GroupCheckOutCandidate[] = [
    { userId: "u1", userName: "Lena Bauer", hasActiveAbsence: false },
    { userId: "u2", userName: "Jonas Klein", hasActiveAbsence: true },
    { userId: "u3", userName: "Mia Hoffmann", hasActiveAbsence: false },
  ];

  it("trennt anwesende (auswählbare) von bereits abwesenden Schülern", () => {
    const result = selectEligibleForGroupCheckOut(candidates, [
      "u1",
      "u2",
      "u3",
    ]);
    expect(result.eligibleUserIds).toEqual(["u1", "u3"]);
    expect(result.skipped).toEqual([{ userId: "u2", userName: "Jonas Klein" }]);
  });

  it("berücksichtigt nur tatsächlich ausgewählte Schüler", () => {
    const result = selectEligibleForGroupCheckOut(candidates, ["u1"]);
    expect(result.eligibleUserIds).toEqual(["u1"]);
    expect(result.skipped).toEqual([]);
  });

  it("liefert leere Listen ohne Auswahl", () => {
    expect(selectEligibleForGroupCheckOut(candidates, [])).toEqual({
      eligibleUserIds: [],
      skipped: [],
    });
  });
});

describe("selectEligibleForGroupCheckIn", () => {
  const candidates: GroupCheckInCandidate[] = [
    { userId: "u1", userName: "Lena Bauer", activeAbsenceId: "a1" },
    { userId: "u2", userName: "Jonas Klein", activeAbsenceId: null },
    { userId: "u3", userName: "Mia Hoffmann", activeAbsenceId: "a3" },
  ];

  it("trennt abwesende (auswählbare) von bereits anwesenden Schülern", () => {
    const result = selectEligibleForGroupCheckIn(candidates, [
      "u1",
      "u2",
      "u3",
    ]);
    expect(result.eligible).toEqual([
      { userId: "u1", absenceId: "a1" },
      { userId: "u3", absenceId: "a3" },
    ]);
    expect(result.skipped).toEqual([{ userId: "u2", userName: "Jonas Klein" }]);
  });

  it("liefert leere Listen ohne Auswahl", () => {
    expect(selectEligibleForGroupCheckIn(candidates, [])).toEqual({
      eligible: [],
      skipped: [],
    });
  });
});
