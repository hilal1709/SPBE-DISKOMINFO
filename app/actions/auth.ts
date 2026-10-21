"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

/** Hanya path internal ("/keamanan"), bukan URL luar ("//situs-lain", "https://…"). */
const safePath = (value: FormDataEntryValue | null) => (typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : "/cms");

export async function login(_prev: string | undefined, formData: FormData) {
  // Validasi isian hanya di server; skema lengkap (format email, panjang) ada di authorize() auth.ts.
  if (!(formData instanceof FormData)) return "Isi email dan kata sandi";
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) return "Isi email dan kata sandi";
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: safePath(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin" && "code" in error && error.code === "unavailable") {
        return "Layanan login sedang tidak tersedia";
      }
      if (error.type === "CredentialsSignin" && "code" in error && error.code === "locked") {
        return "Terlalu banyak percobaan. Coba lagi 15 menit lagi";
      }
      return "Email atau kata sandi tidak valid";
    }
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
