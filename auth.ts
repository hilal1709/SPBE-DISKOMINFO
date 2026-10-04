import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb } from "@/lib/db";
import type { Role } from "@/lib/types";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  opd_id?: string;
  password_hash: string;
};

const demoAdmin: UserRow = {
  id: "demo-admin",
  name: "Admin Diskominfo",
  email: "admin@gresikkab.go.id",
  role: "superadmin",
  password_hash: "$2b$10$h6.yk3.c9KJXPB95Prfeee.f5Iw8VAXo9.D31shF1Fko265NxJtTa",
};

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

class ServiceUnavailable extends CredentialsSignin {
  code = "unavailable";
}

const isProduction = process.env.NODE_ENV === "production";

async function findUser(email: string) {
  const db = getDb();
  let databaseUnavailable = false;

  if (db) {
    try {
      const result = await db.query<UserRow>(
        "select id,name,email,role,opd_id,password_hash from users where email=$1 and active=true",
        [email],
      );
      return result.rows[0];
    } catch {
      databaseUnavailable = true;
    }
  }

  if (databaseUnavailable && isProduction) throw new ServiceUnavailable();
  if (!isProduction && email === demoAdmin.email) return demoAdmin;
  return undefined;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || (isProduction ? undefined : "development-only-change-me-before-production"),
  trustHost: true,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Kata sandi", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await findUser(parsed.data.email);
        if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role, opdId: user.opd_id };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.opdId = user.opdId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.opdId = token.opdId;
      return session;
    },
  },
});
