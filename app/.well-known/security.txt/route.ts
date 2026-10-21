import { absoluteUrl } from "@/lib/site";

/** RFC 9116: kanal pelaporan kerentanan. Aktif bila SECURITY_CONTACT (mailto:… atau URL) diset. */
export function GET() {
  const contact = process.env.SECURITY_CONTACT;
  if (!contact) return new Response("Not Found", { status: 404 });
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const body = [`Contact: ${contact}`, `Expires: ${expires}`, "Preferred-Languages: id, en", `Canonical: ${absoluteUrl("/.well-known/security.txt")}`, ""].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
