import { SignJWT, jwtVerify } from "jose"; import type { Role } from "./types";
const key = new TextEncoder().encode(process.env.AUTH_SECRET || "development-only-change-me-before-production");
export type Session = { id:string; name:string; role:Role; opdId?:string };
export async function signSession(session: Session) { return new SignJWT(session).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("8h").sign(key); }
export async function verifySession(token?: string) { if (!token) return null; try { return (await jwtVerify(token,key)).payload as unknown as Session; } catch { return null; } }
