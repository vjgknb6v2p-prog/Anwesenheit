import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

// `next-auth` re-exportiert `Session`/`User` per benanntem `export { ... }`
// aus `@auth/core/types` — Modul-Augmentation über `declare module "next-auth"`
// greift dadurch zuverlässig auf die tatsächlich verwendeten Typen durch.
//
// `next-auth/jwt` re-exportiert `JWT` dagegen per `export *` aus
// `@auth/core/jwt`; TypeScript merged Interface-Augmentation über einen
// Wildcard-Re-Export nicht in den Originaltyp. Die zusätzlichen JWT-Felder
// (`role`, `loginAt`, `lastActiveAt`) werden deshalb in `src/auth.ts` lokal
// per Intersection-Type behandelt statt hier global deklariert.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}
