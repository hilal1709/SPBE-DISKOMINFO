import Link from "next/link";
import { cn } from "@/lib/utils";

/** Logo teks Kabupaten Gresik. `tone="dark"` untuk panel navy CMS. */
export function Brand({ subtitle = "Kabupaten Gresik", title = "Arsitektur SPBE", tone = "light", href = "/" }: { subtitle?: string; title?: string; tone?: "light" | "dark"; href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <span className="grid size-10 place-items-center rounded-xl bg-primary text-lg font-extrabold text-primary-foreground shadow-[inset_0_-2px_0_rgb(0_0_0/0.1)] transition-transform duration-300 ease-(--ease-out) group-hover:-rotate-6">
        G
      </span>
      <span className="leading-tight">
        <span className={cn("block text-sm font-bold", tone === "dark" ? "text-white" : "text-foreground")}>{title}</span>
        <span className={cn("block text-xs", tone === "dark" ? "text-panel-muted" : "text-muted-foreground")}>{subtitle}</span>
      </span>
    </Link>
  );
}
