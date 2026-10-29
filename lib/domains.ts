export const domainKeys = ["probis", "layanan", "data", "aplikasi", "infrastruktur", "keamanan"] as const;
export type DomainKey = (typeof domainKeys)[number];
export const domains: Record<DomainKey, { label: string; href: string; cms: string; tone: "teal" | "orange" | "yellow" | "amber" | "sky" }> = {
  probis: { label: "Proses Bisnis", href: "/proses-bisnis", cms: "/cms/proses-bisnis", tone: "teal" },
  layanan: { label: "Layanan", href: "/layanan", cms: "/cms/layanan", tone: "orange" },
  data: { label: "Data", href: "/data", cms: "/cms/data", tone: "yellow" },
  aplikasi: { label: "Aplikasi", href: "/aplikasi", cms: "/cms/aplikasi", tone: "amber" },
  infrastruktur: { label: "Infrastruktur", href: "/infrastruktur", cms: "/cms/infrastruktur", tone: "sky" },
  keamanan: { label: "Keamanan", href: "/keamanan", cms: "/cms/keamanan", tone: "teal" },
};
export const isDomain = (value: unknown): value is DomainKey => typeof value === "string" && Object.hasOwn(domains, value);
