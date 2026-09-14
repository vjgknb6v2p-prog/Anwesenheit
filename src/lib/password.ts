import { hash, verify } from "@node-rs/argon2";

// Argon2id-Parametrisierung nach OWASP-Empfehlung für interaktive Logins
// (19 MiB Speicher, 2 Iterationen, 1 Thread als Minimalprofil).
// `Algorithm.Argon2id` (Wert 2) kann unter `isolatedModules` nicht importiert
// werden, da `@node-rs/argon2` es als `const enum` deklariert — daher der
// numerische Literalwert direkt.
const ARGON2_OPTIONS = {
  algorithm: 2, // Algorithm.Argon2id
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export function verifyPassword(
  hashValue: string,
  plain: string,
): Promise<boolean> {
  return verify(hashValue, plain);
}
