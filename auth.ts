import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { clear, clientIp, hit } from "@/lib/security/rate-limit";
import type { Role } from "@/lib/types";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  opd_id?: string;
  password_hash: string;
};

const isProduction = process.env.NODE_ENV === "production";

/** Akun demo hanya untuk dev lokal tanpa database; tidak pernah dikenali di production. */
const demoAdmin: UserRow = {
  id: "demo-admin",
  name: "Admin Diskominfo",
  email: "admin@gresikkab.go.id",
  role: "superadmin",
  password_hash: "$2b$10$h6.yk3.c9KJXPB95Prfeee.f5Iw8VAXo9.D31shF1Fko265NxJtTa",
};

/** Hash pembanding saat email tidak dikenal: waktu respons sama sehingga keberadaan akun tidak bocor. */
const DUMMY_HASH = "$2b$10$Ru2osnOXHEYIVi7TOfRttu1J0..Ay3cvOcYq2/zppUEbqA0FyfmFi";

const credentialsSchema = z.object({
  email: z.email().trim().toLowerCase().max(254),
  password: z.string().min(1).max(200),
});

class ServiceUnavailable extends CredentialsSignin {
  code = "unavailable";
}

class TooManyAttempts extends CredentialsSignin {
  code = "locked";
}

/** 5 percobaan per akun dan 20 per IP tiap 15 menit. */
const PER_EMAIL = { limit: 5, windowSec: 15 * 60 };
const PER_IP = { limit: 20, windowSec: 15 * 60 };

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
    } catch (error) {
      databaseUnavailable = true;
      console.error("[auth] Gagal membaca tabel users. Periksa DATABASE_URL (di Vercel pakai Supabase pooler):", error instanceof Error ? error.message : error);
    }
  }

  if (databaseUnavailable && isProduction) throw new ServiceUnavailable();
  if (!isProduction && email === demoAdmin.email) return demoAdmin;
  return undefined;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || (isProduction ? undefined : "development-only-change-me-before-production"),
  // trustHost tidak di-hard-code: Auth.js hanya mempercayai Host di Vercel, atau bila AUTH_URL / AUTH_TRUST_HOST diset.
  session: { strategy: "jwt", maxAge: 8 * 60 * 60, updateAge: 30 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Kata sandi", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const emailKey = `login:email:${email}`;
        const [byEmail, byIp] = await Promise.all([hit(emailKey, PER_EMAIL), hit(`login:ip:${clientIp(request.headers)}`, PER_IP)]);
        if (!byEmail.ok || !byIp.ok) throw new TooManyAttempts();

        const user = await findUser(email);
        const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
        if (!user || !valid) {
          console.warn(`[auth] Login gagal untuk ${email}`);
          return null;
        }

        await clear(emailKey);
        if (user.id !== demoAdmin.id) await getDb()?.query("update users set last_login_at = now() where id = $1", [user.id]).catch(() => undefined);

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
