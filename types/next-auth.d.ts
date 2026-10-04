import type { DefaultSession } from "next-auth";
import "next-auth/jwt";
import type { Role } from "@/lib/types";

declare module "next-auth" {
  interface User {
    role: Role;
    opdId?: string;
  }

  interface Session {
    user: { id: string; role: Role; opdId?: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    opdId?: string;
  }
}
