import type { DefaultSession } from "next-auth";
import "next-auth/jwt";
import type { Role } from "@/lib/types";

declare module "next-auth" {
  interface User {
    role: Role;
    opdId?: string;
    sid?: string;
  }

  interface Session {
    user: { id: string; role: Role; opdId?: string; sid?: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    opdId?: string;
    /** Id sesi acak; keabsahannya dicek di tabel sessions (lib/security/session.ts). */
    sid?: string;
  }
}
