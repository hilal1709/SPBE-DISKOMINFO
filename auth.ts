import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { BCRYPT_COST, hashPassword } from "@/lib/pengguna/repo";
import { logAuthEvent } from "@/lib/security/audit";
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

/** Hash pembanding saat email tidak dikenal, berbiaya sama dengan hash akun: waktu respons sama sehingga keberadaan akun tidak bocor. */
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString("hex"), BCRYPT_COST);

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

/**
 * 5 percobaan per akun dari satu IP dan 20 per IP tiap 15 menit. Batas per akun lintas IP lebih longgar (50/jam) agar
 * penyerang tidak mudah mengunci pemilik akun dari tempat lain.
 */
const PER_EMAIL_IP = { limit: 5, windowSec: 15 * 60 };
const PER_IP = { limit: 20, windowSec: 15 * 60 };
const PER_EMAIL = { limit: 50, windowSec: 60 * 60 };

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

        const ip = clientIp(request.headers);
        const emailKey = `login:email:${email}`;
        const emailIpKey = `login:email-ip:${email}:${ip}`;
        // Tanpa IP tepercaya (server sendiri tanpa TRUST_PROXY) semua klien berbagi satu IP: batas per IP dilewati agar tidak jadi DoS.
        const checks = await Promise.all([
          hit(emailKey, PER_EMAIL),
          hit(emailIpKey, PER_EMAIL_IP),
          ...(ip === "unknown" ? [] : [hit(`login:ip:${ip}`, PER_IP)]),
        ]);
        if (checks.some((c) => !c.ok)) {
          await logAuthEvent("login_locked", { email, ip });
          throw new TooManyAttempts();
        }

        const user = await findUser(email);
        const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
        if (!user || !valid) {
          await logAuthEvent("login_failed", { userId: user && user.id !== demoAdmin.id ? user.id : null, email, ip });
          return null;
        }

        await clear(emailIpKey);
        if (user.id !== demoAdmin.id) {
          // Hash lama (biaya < BCRYPT_COST) dinaikkan diam-diam selagi sandi asli tersedia.
          const rehash = bcrypt.getRounds(user.password_hash) < BCRYPT_COST ? await hashPassword(password) : null;
          await getDb()
            ?.query("update users set last_login_at = now(), password_hash = coalesce($2, password_hash) where id = $1", [user.id, rehash])
            .catch(() => undefined);
          await logAuthEvent("login", { userId: user.id, email, ip });
        }

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
        // Waktu masuk (ms): sesi yang terbit sebelum sandi diganti/di-reset dicabut di lib/access.ts.
        token.authAt = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.opdId = token.opdId;
      session.user.authAt = token.authAt;
      return session;
    },
  },
});
