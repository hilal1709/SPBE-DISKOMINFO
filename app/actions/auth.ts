"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

/** Hanya path internal ("/keamanan"), bukan URL luar ("//situs-lain", "https://…"). */
const safePath = (value: FormDataEntryValue | null) => (typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : "/cms");

export async function login(_prev: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: safePath(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin" && "code" in error && error.code === "unavailable") {
        return "Layanan login sedang tidak tersedia";
      }
      return "Email atau kata sandi tidak valid";
    }
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
