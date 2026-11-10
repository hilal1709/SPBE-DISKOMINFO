import { OpdProvider } from "@/components/opd/opd-context";
import { opdDirectorySafe } from "@/lib/opd/repo";

/** Memasang direktori Perangkat Daerah (per periode) untuk komponen klien di bawahnya. */
export async function OpdScope({ children }: { children: React.ReactNode }) {
  return <OpdProvider directory={await opdDirectorySafe()}>{children}</OpdProvider>;
}
