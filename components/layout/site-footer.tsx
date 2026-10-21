import { siteConfig } from "@/lib/site";

/** Footer portal: identitas instansi pengelola. */
export function SiteFooter() {
  const { organization } = siteConfig;
  return (
    <footer className="mx-auto w-full max-w-[1440px] px-4 pb-6 text-xs text-muted-foreground lg:px-8">
      <p>
        © {new Date().getFullYear()} {organization.parent} · Dikelola oleh {organization.name}
      </p>
    </footer>
  );
}
