import { RaaProvider } from "@/components/aplikasi/raa-context";
import { RadProvider } from "@/components/data/rad-context";
import { RaiProvider } from "@/components/infrastruktur/rai-context";
import { SecurityProvider } from "@/components/keamanan/security-context";
import { RalProvider } from "@/components/layanan/ral-context";
import { RabProvider } from "@/components/probis/rab-context";
import { raaSetSafe } from "@/lib/aplikasi/raa";
import { radSetSafe } from "@/lib/data/rad";
import { raiSetSafe } from "@/lib/infrastruktur/rai";
import { securityRefsSafe } from "@/lib/keamanan/cms-repo";
import { ralSetSafe } from "@/lib/layanan/ral";
import { rabSetSafe } from "@/lib/probis/rab";

type Need = "rab" | "ral" | "rad" | "raa" | "rai" | "security";

/**
 * Referensi untuk komponen klien satu bagian CMS. Dipasang di layout tiap domain, bukan di layout CMS,
 * agar halaman hanya menerima referensi yang dipakainya.
 */
export async function ReferenceProviders({ need, children }: { need: Need[]; children: React.ReactNode }) {
  const has = (n: Need) => need.includes(n);
  const [rab, ral, rad, raa, rai, security] = await Promise.all([
    has("rab") ? rabSetSafe() : null,
    has("ral") ? ralSetSafe() : null,
    has("rad") ? radSetSafe() : null,
    has("raa") ? raaSetSafe() : null,
    has("rai") ? raiSetSafe() : null,
    has("security") ? securityRefsSafe() : null,
  ]);
  let tree = children;
  if (security) tree = <SecurityProvider refs={security}>{tree}</SecurityProvider>;
  if (rai) tree = <RaiProvider set={rai}>{tree}</RaiProvider>;
  if (raa) tree = <RaaProvider set={raa}>{tree}</RaaProvider>;
  if (rad) tree = <RadProvider set={rad}>{tree}</RadProvider>;
  if (ral) tree = <RalProvider set={ral}>{tree}</RalProvider>;
  if (rab) tree = <RabProvider set={rab}>{tree}</RabProvider>;
  return tree;
}
