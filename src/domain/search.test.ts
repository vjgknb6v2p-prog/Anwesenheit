import { describe, expect, it } from "vitest";
import { rankSearchResults, type SearchCandidate } from "./search";

function candidate(overrides: Partial<SearchCandidate> = {}): SearchCandidate {
  return {
    id: "u1",
    kind: "STUDENT",
    firstName: "Lena",
    lastName: "Bauer",
    email: "lena.b@internat.de",
    ...overrides,
  };
}

describe("rankSearchResults", () => {
  it("bewertet einen exakten Namenstreffer am höchsten", () => {
    const results = rankSearchResults(
      [
        candidate({ id: "u1", firstName: "Lena", lastName: "Bauer" }),
        candidate({ id: "u2", firstName: "Lena", lastName: "Berg" }),
      ],
      "Lena Bauer",
    );
    expect(results[0]?.id).toBe("u1");
    expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
  });

  it("bewertet einen Vollnamens-Präfix-Treffer höher als einen Nachnamen-Präfix-Treffer", () => {
    const results = rankSearchResults(
      [
        candidate({
          id: "fullname-prefix",
          firstName: "Jonas",
          lastName: "Klein",
        }),
        candidate({
          id: "lastname-prefix",
          firstName: "Mia",
          lastName: "Jonassen",
        }),
      ],
      "jon",
    );
    expect(results[0]?.id).toBe("fullname-prefix");
  });

  it("bewertet einen E-Mail-Treffer niedriger als einen Namenstreffer", () => {
    const results = rankSearchResults(
      [
        candidate({
          id: "name-match",
          firstName: "Finn",
          lastName: "Richter",
          email: "f.richter@internat.de",
        }),
        candidate({
          id: "email-match",
          firstName: "Sara",
          lastName: "Lang",
          email: "finn.helper@internat.de",
        }),
      ],
      "finn",
    );
    expect(results[0]?.id).toBe("name-match");
  });

  it("schließt keine Kandidaten aus, auch ohne Namens-/E-Mail-Treffer", () => {
    const results = rankSearchResults([candidate({ id: "u1" })], "zimmer-214");
    expect(results).toHaveLength(1);
    expect(results[0]?.score).toBeGreaterThan(0);
  });

  it("sortiert bei Gleichstand alphabetisch nach Nachname", () => {
    const results = rankSearchResults(
      [
        candidate({ id: "b", firstName: "Finn", lastName: "Richter" }),
        candidate({ id: "a", firstName: "Anna", lastName: "Adler" }),
      ],
      "",
    );
    expect(results.map((r) => r.id)).toEqual(["a", "b"]);
  });
});
