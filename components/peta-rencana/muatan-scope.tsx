import { MuatanProvider } from "@/components/peta-rencana/muatan-context";
import { listMuatan } from "@/lib/peta-rencana/muatan-repo";

/** Memasang daftar muatan (dikelola di CMS) untuk komponen klien di bawahnya. */
export async function MuatanScope({ children }: { children: React.ReactNode }) {
  return <MuatanProvider list={await listMuatan()}>{children}</MuatanProvider>;
}
