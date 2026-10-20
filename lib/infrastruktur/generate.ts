import { allAplikasi } from "@/lib/aplikasi/generate";
import { allData } from "@/lib/data/generate";
import { allProbis, mulberry32 } from "@/lib/probis/generate";
import { pdByCode, sampleActivePeriod as activePeriod, samplePeriods as periods } from "@/lib/probis/reference";
import type { Infrastruktur } from "@/lib/types";
import { jenisConfig, type InfraJenis, type InfraKepemilikan } from "./jenis";

/**
 * Data contoh Domain Infrastruktur (dashboard publik saat database kosong, dan `pnpm seed:infrastruktur`).
 * Nama komponen sengaja sama dengan kolom infrastruktur di data contoh aplikasi ("Data Center Diskominfo Gresik",
 * "SPLP Gresik", …) sehingga aplikasi yang memakainya ikut tertaut.
 */

type Seed = {
  jenis: InfraJenis;
  name: string;
  opd: string;
  deskripsi?: string;
  pemilik?: string;
  kepemilikan?: InfraKepemilikan;
  pengelola?: string;
  rai?: string;
  atribut?: Record<string, string>;
  /** Nama komponen lain yang ditautkan. */
  relasi?: string[];
  /** Pola nama aplikasi / data yang ditautkan. */
  aplikasi?: RegExp;
  data?: RegExp;
  /** Jumlah proses bisnis PD pemilik yang ditautkan (server). */
  probis?: number;
  /** Baru ada di periode berjalan. */
  baru?: boolean;
};

const DC = "Data Center Diskominfo Gresik";
const CC = "Command Center Gresik";
const BIDANG = "Bidang Infrastruktur TIK Diskominfo";

const core: Seed[] = [
  // Fasilitas komputasi
  { jenis: "fasilitas", name: DC, opd: "DISKOMINFO", kepemilikan: "milik_sendiri", pengelola: BIDANG, rai: "RAI.01.02", atribut: { bandwidthIntranet: "10 Gbps", bandwidthInternet: "2 Gbps", lokasi: "Kantor Diskominfo, Jl. Dr. Wahidin Sudirohusodo", tier: "Tier II", pengamanan: "Akses kartu dan biometrik, CCTV 24 jam, pemadam gas FM-200, sensor suhu dan kelembapan" }, relasi: ["SPLP Gresik", "JIP Pemkab Gresik"] },
  { jenis: "fasilitas", name: CC, opd: "DISKOMINFO", kepemilikan: "milik_sendiri", pengelola: "Bidang Aplikasi Informatika Diskominfo", rai: "RAI.01.03", atribut: { bandwidthIntranet: "1 Gbps", bandwidthInternet: "500 Mbps", lokasi: "Gedung Pemkab Gresik Lt. 1", tier: "Tier I", pengamanan: "Akses kartu, CCTV, UPS dan genset" }, relasi: ["JIP Pemkab Gresik"], baru: true },
  { jenis: "fasilitas", name: "PDN Kementerian Komunikasi dan Digital", opd: "DISKOMINFO", kepemilikan: "instansi_lain", pengelola: "Kementerian Komunikasi dan Digital", rai: "RAI.01.01", atribut: { lokasi: "Pusat Data Nasional, Batam", tier: "Tier IV" }, relasi: ["SPLP Nasional"] },
  { jenis: "fasilitas", name: "Ruang Server Dinas Kesehatan", opd: "DINKES", kepemilikan: "milik_sendiri", pengelola: "Subbagian Umum Dinas Kesehatan", rai: "RAI.01.02", atribut: { bandwidthIntranet: "1 Gbps", bandwidthInternet: "200 Mbps", lokasi: "Kantor Dinas Kesehatan", tier: "Tier I", pengamanan: "Kunci ruangan, CCTV" }, relasi: ["JIP Pemkab Gresik"] },
  { jenis: "fasilitas", name: "Ruang Server Dispendukcapil", opd: "DISPENDUKCAPIL", kepemilikan: "milik_sendiri", pengelola: "Bidang PIAK Dispendukcapil", rai: "RAI.01.02", atribut: { bandwidthIntranet: "1 Gbps", bandwidthInternet: "300 Mbps", lokasi: "Mal Pelayanan Publik Gresik", tier: "Tier I", pengamanan: "Akses kartu, CCTV, VPN ke Ditjen Dukcapil" }, relasi: ["JIP Pemkab Gresik"] },
  { jenis: "fasilitas", name: "Ruang Server BPPKAD", opd: "BPPKAD", kepemilikan: "milik_sendiri", pengelola: "Bidang Pendapatan BPPKAD", rai: "RAI.01.02", atribut: { bandwidthIntranet: "1 Gbps", bandwidthInternet: "200 Mbps", lokasi: "Kantor BPPKAD", tier: "Tier I" }, relasi: ["JIP Pemkab Gresik"] },

  // Sistem integrasi
  { jenis: "jip", name: "JIP Pemkab Gresik", opd: "DISKOMINFO", deskripsi: "Jaringan fiber optik yang menghubungkan Perangkat Daerah, kecamatan, dan data center", pemilik: "Pemerintah Kabupaten Gresik", kepemilikan: "milik_sendiri", pengelola: BIDANG, atribut: { jenis: "Intranet", bandwidth: "10 Gbps", media: "Fiber optik" }, relasi: ["SPLP Gresik"], data: /penduduk|aset|pegawai/i },
  { jenis: "jip", name: "Internet Dedicated Pemkab Gresik", opd: "DISKOMINFO", deskripsi: "Akses internet terpusat untuk seluruh Perangkat Daerah", pemilik: "PT Telkom Indonesia", kepemilikan: "sewa", pengelola: BIDANG, atribut: { jenis: "Internet", bandwidth: "2 Gbps", media: "Fiber optik" } },
  { jenis: "jip", name: "VPN Kecamatan Gresik", opd: "KECAMATAN", deskripsi: "Jaringan privat virtual dari 18 kecamatan ke data center", pemilik: "Pemerintah Kabupaten Gresik", kepemilikan: "milik_sendiri", pengelola: BIDANG, atribut: { jenis: "VPN", bandwidth: "100 Mbps", media: "Radio", mediaLain: "Backup 4G" }, baru: true },
  { jenis: "jip", name: "Jaringan Intra Pemerintah Nasional", opd: "DISKOMINFO", deskripsi: "Konektivitas ke JIP nasional untuk layanan SPBE pusat", pemilik: "Kementerian Komunikasi dan Digital", kepemilikan: "instansi_lain", atribut: { jenis: "MPLS", bandwidth: "100 Mbps", media: "Fiber optik" }, relasi: ["SPLP Nasional"], baru: true },
  { jenis: "splp", name: "SPLP Gresik", opd: "DISKOMINFO", deskripsi: "API gateway penghubung layanan antar-aplikasi Perangkat Daerah", pemilik: "Diskominfo", kepemilikan: "milik_sendiri", atribut: { jenis: "API gateway" }, relasi: ["JIP Pemkab Gresik"], data: /penduduk|pegawai|izin/i },
  { jenis: "splp", name: "SPLP Nasional", opd: "DISKOMINFO", deskripsi: "Sistem penghubung layanan nasional untuk integrasi dengan K/L", pemilik: "Kementerian Komunikasi dan Digital", kepemilikan: "instansi_lain", atribut: { jenis: "Enterprise service bus" }, relasi: ["Jaringan Intra Pemerintah Nasional"], baru: true },
  { jenis: "splp", name: "Gresik Satu Data API", opd: "DISKOMINFO", deskripsi: "Layanan berbagi pakai data sektoral melalui API terbuka", pemilik: "Diskominfo", kepemilikan: "milik_sendiri", atribut: { jenis: "Integrasi data" }, relasi: ["JIP Pemkab Gresik"], aplikasi: /satu data/i, data: /statistik|indikator/i, baru: true },

  // Komputasi awan
  { jenis: "cloud", name: "Cloud Pemkab Gresik", opd: "DISKOMINFO", deskripsi: "Private cloud berbasis virtualisasi untuk aplikasi Perangkat Daerah", pemilik: "Diskominfo", kepemilikan: "milik_sendiri", atribut: { tipe: "Private cloud", biaya: "Rp 0 (aset sendiri)", pengembang: "Diskominfo", operasional: BIDANG, jangkaWaktu: "2025–2029" }, relasi: ["SPLP Gresik", DC, "JIP Pemkab Gresik"], data: /penduduk|aset/i },
  { jenis: "cloud", name: "Pusat Data Nasional", opd: "DISKOMINFO", deskripsi: "Layanan komputasi awan pemerintah di Pusat Data Nasional", pemilik: "Kementerian Komunikasi dan Digital", kepemilikan: "instansi_lain", atribut: { tipe: "Community cloud", biaya: "Tanpa biaya", pengembang: "Kementerian Komunikasi dan Digital", operasional: "Kementerian Komunikasi dan Digital", jangkaWaktu: "Berkelanjutan" }, relasi: ["SPLP Nasional", "PDN Kementerian Komunikasi dan Digital", "Jaringan Intra Pemerintah Nasional"] },
  { jenis: "cloud", name: "Cloud Hosting Website OPD", opd: "DISKOMINFO", deskripsi: "Hosting website Perangkat Daerah di penyedia cloud", pemilik: "PT Sinergi Sistem Indonesia", kepemilikan: "sewa", atribut: { tipe: "Public cloud", biaya: "Rp 36.000.000/tahun", pengembang: "PT Sinergi Sistem Indonesia", operasional: BIDANG, jangkaWaktu: "2025–2026" }, relasi: ["SPLP Gresik"], aplikasi: /portal|website/i, baru: true },

  // Platform
  { jenis: "platform", name: "Ubuntu Server 22.04 LTS", opd: "DISKOMINFO", deskripsi: "Sistem operasi utama server aplikasi", atribut: { tipe: "Sistem operasi", jenisOs: "Linux Ubuntu", lisensi: "Open source", pemilikLisensi: "Canonical", validitas: "s.d. April 2027" }, relasi: ["Cloud Pemkab Gresik", DC] },
  { jenis: "platform", name: "Windows Server 2022", opd: "DISKOMINFO", deskripsi: "Sistem operasi server aplikasi berbasis .NET", atribut: { tipe: "Sistem operasi", jenisOs: "Windows Server", lisensi: "Proprietary", pemilikLisensi: "Diskominfo", validitas: "s.d. Desember 2027" }, relasi: [DC] },
  { jenis: "platform", name: "PostgreSQL 16", opd: "DISKOMINFO", deskripsi: "Basis data relasional untuk aplikasi Pemkab", atribut: { tipe: "Sistem database", jenisDb: "PostgreSQL", lisensi: "Open source", pemilikLisensi: "PostgreSQL Global Development Group", validitas: "Tanpa batas" }, relasi: ["Cloud Pemkab Gresik"] },
  { jenis: "platform", name: "MySQL 8", opd: "DISKOMINFO", deskripsi: "Basis data relasional aplikasi web Perangkat Daerah", atribut: { tipe: "Sistem database", jenisDb: "MySQL", lisensi: "Open source", pemilikLisensi: "Oracle", validitas: "Tanpa batas" }, relasi: ["Cloud Pemkab Gresik"] },
  { jenis: "platform", name: "VMware vSphere 8", opd: "DISKOMINFO", deskripsi: "Virtualisasi server data center", atribut: { tipe: "Sistem utilitas", jenisUtilitas: "Virtualisasi", lisensi: "Proprietary", pemilikLisensi: "Diskominfo", validitas: "s.d. Juni 2026" }, relasi: [DC] },
  { jenis: "platform", name: "Proxmox VE 8", opd: "DISKOMINFO", deskripsi: "Virtualisasi pengganti untuk beban kerja nonkritis", atribut: { tipe: "Sistem utilitas", jenisUtilitas: "Virtualisasi", lisensi: "Open source", pemilikLisensi: "Proxmox Server Solutions", validitas: "Tanpa batas" }, relasi: ["Cloud Pemkab Gresik"], baru: true },
  { jenis: "platform", name: "Veeam Backup & Replication", opd: "DISKOMINFO", deskripsi: "Pencadangan mesin virtual dan basis data", atribut: { tipe: "Sistem utilitas", jenisUtilitas: "Pencadangan", lisensi: "Proprietary", pemilikLisensi: "Diskominfo", validitas: "s.d. Maret 2027" }, relasi: [DC], baru: true },

  // Penyimpanan
  { jenis: "penyimpanan", name: "SAN Storage Data Center", opd: "DISKOMINFO", deskripsi: "Penyimpanan blok untuk klaster virtualisasi", pemilik: "Diskominfo", kepemilikan: "milik_sendiri", pengelola: BIDANG, atribut: { kapasitas: "120 TB", akses: "iSCSI", lokasi: DC }, relasi: [DC, "VMware vSphere 8"], data: /penduduk|aset|keuangan/i },
  { jenis: "penyimpanan", name: "NAS Arsip Digital", opd: "DISPERPUSIP", deskripsi: "Penyimpanan arsip hasil alih media", pemilik: "Dinas Perpustakaan dan Kearsipan", kepemilikan: "milik_sendiri", pengelola: "Bidang Kearsipan", atribut: { kapasitas: "24 TB", akses: "SMB/CIFS", lokasi: DC }, relasi: [DC], data: /arsip/i },
  { jenis: "penyimpanan", name: "Backup Storage Data Center", opd: "DISKOMINFO", deskripsi: "Target pencadangan harian dan mingguan", pemilik: "Diskominfo", kepemilikan: "milik_sendiri", pengelola: BIDANG, atribut: { kapasitas: "80 TB", akses: "NFS", lokasi: DC }, relasi: [DC, "Veeam Backup & Replication"], baru: true },
  { jenis: "penyimpanan", name: "Object Storage Satu Data", opd: "DISKOMINFO", deskripsi: "Penyimpanan berkas dataset terbuka", pemilik: "Diskominfo", kepemilikan: "milik_sendiri", pengelola: BIDANG, atribut: { kapasitas: "16 TB", akses: "Object storage (S3)", lokasi: "Cloud Pemkab Gresik" }, relasi: [DC], data: /statistik|indikator/i, baru: true },

  // Jaringan & keamanan
  { jenis: "jaringan", name: "Core Router Data Center", opd: "DISKOMINFO", deskripsi: "Router inti penghubung JIP dan internet", pemilik: "Diskominfo", kepemilikan: "milik_sendiri", pengelola: BIDANG, atribut: { tipe: "Router" }, relasi: [DC] },
  { jenis: "jaringan", name: "Core Switch Data Center", opd: "DISKOMINFO", deskripsi: "Switch inti 40G untuk rak server", pemilik: "Diskominfo", kepemilikan: "milik_sendiri", pengelola: BIDANG, atribut: { tipe: "Switch" }, relasi: [DC, "SAN Storage Data Center"] },
  { jenis: "jaringan", name: "Load Balancer Aplikasi", opd: "DISKOMINFO", deskripsi: "Pembagi beban untuk aplikasi layanan publik", pemilik: "Diskominfo", kepemilikan: "milik_sendiri", pengelola: BIDANG, atribut: { tipe: "Load balancer" }, relasi: [DC], baru: true },
  { jenis: "perangkat_keamanan", name: "Next-Gen Firewall Data Center", opd: "DISKOMINFO", deskripsi: "Firewall perimeter data center", pemilik: "Diskominfo", kepemilikan: "milik_sendiri", pengelola: BIDANG, atribut: { tipe: "Firewall" }, relasi: [DC, "Core Router Data Center", "Cloud Pemkab Gresik"] },
  { jenis: "perangkat_keamanan", name: "Web Application Firewall", opd: "DISKOMINFO", deskripsi: "Perlindungan aplikasi web dari serangan injeksi dan bot", pemilik: "Diskominfo", kepemilikan: "sewa", pengelola: BIDANG, atribut: { tipe: "WAF" }, relasi: [DC, "Load Balancer Aplikasi", "Cloud Pemkab Gresik"], baru: true },
  { jenis: "perangkat_keamanan", name: "IDS/IPS Jaringan Pemkab", opd: "DISKOMINFO", deskripsi: "Deteksi dan pencegahan intrusi pada lalu lintas JIP", pemilik: "Diskominfo", kepemilikan: "milik_sendiri", pengelola: BIDANG, atribut: { tipe: "IDS/IPS" }, relasi: [DC, "Core Switch Data Center"], baru: true },

  // Periferal
  { jenis: "periferal", name: "UPS 80 kVA Data Center", opd: "DISKOMINFO", deskripsi: "Catu daya cadangan rak server", pengelola: BIDANG, atribut: { tipe: "UPS", lokasi: DC }, relasi: [DC] },
  { jenis: "periferal", name: "Videotron Command Center", opd: "DISKOMINFO", deskripsi: "Layar pantau terpadu kota", pengelola: "Bidang Aplikasi Informatika Diskominfo", atribut: { tipe: "Videotron", lokasi: CC }, relasi: [CC], baru: true },
  { jenis: "periferal", name: "CCTV Persimpangan Kota", opd: "DISHUB", deskripsi: "Kamera pemantau lalu lintas terhubung command center", pengelola: "Bidang Lalu Lintas Dishub", atribut: { tipe: "CCTV", lokasi: "48 persimpangan utama" }, relasi: [CC] },
];

/** Perangkat Daerah dengan server/jaringan sendiri di luar data center. */
const opdSites = ["DINKES", "DISPENDUKCAPIL", "BPPKAD", "DISPENDIK", "BKPSDM", "DPMPTSP", "BAPPEDA", "SETDA", "DINSOS", "DISHUB", "BPBD", "DISPERPUSIP"];
const usages = ["Aplikasi", "Basis data", "Web", "Berkas", "Cadangan", "Virtualisasi"];
const cpus = ["Intel Xeon Silver 4314, 16 core", "Intel Xeon Gold 5318Y, 24 core", "AMD EPYC 7313, 16 core", "Intel Xeon E-2336, 6 core"];
const pick = <T,>(random: () => number, list: readonly T[]) => list[Math.floor(random() * list.length)]!;

/** Server, perangkat jaringan, dan periferal per Perangkat Daerah (dibangkitkan, deterministik). */
function sites(random: () => number): Seed[] {
  const rows: Seed[] = [];
  // Server data center (virtualisasi & basis data bersama).
  for (let i = 1; i <= 8; i++) {
    const usage = i <= 3 ? "Virtualisasi" : i <= 5 ? "Basis data" : pick(random, usages);
    rows.push({
      jenis: "server",
      name: `Server ${usage} DC-${String(i).padStart(2, "0")}`,
      opd: "DISKOMINFO",
      deskripsi: `Server ${usage.toLowerCase()} di ${DC}`,
      pemilik: "Diskominfo",
      kepemilikan: "milik_sendiri",
      pengelola: BIDANG,
      atribut: { penggunaan: usage, prosesor: pick(random, cpus.slice(0, 3)), memori: `${pick(random, [128, 256, 512])} GB`, penyimpanan: `${pick(random, [4, 8, 16])} TB`, teknik: usage === "Virtualisasi" ? "SAN" : pick(random, ["DAS", "SAN"]), lokasi: DC },
      relasi: [DC, usage === "Basis data" ? "PostgreSQL 16" : "Ubuntu Server 22.04 LTS", ...(usage === "Virtualisasi" ? ["VMware vSphere 8"] : [])],
      probis: 2,
      baru: i > 5,
    });
  }
  for (const opd of opdSites) {
    const short = pdByCode.get(opd)?.name.replace(/^(Dinas|Badan|Sekretariat)\s+/, "") ?? opd;
    const room = core.find((s) => s.jenis === "fasilitas" && s.opd === opd)?.name ?? DC;
    const count = room === DC ? 1 : 2;
    for (let i = 1; i <= count; i++) {
      const usage = pick(random, usages.slice(0, 4));
      rows.push({
        jenis: "server",
        name: `Server ${usage} ${short}${count > 1 ? ` ${i}` : ""}`,
        opd,
        deskripsi: `Server ${usage.toLowerCase()} milik ${pdByCode.get(opd)?.name ?? opd}`,
        pemilik: pdByCode.get(opd)?.name,
        kepemilikan: random() < 0.82 ? "milik_sendiri" : "sewa",
        pengelola: `Subbagian Umum ${short}`,
        atribut: { penggunaan: usage, prosesor: pick(random, cpus), memori: `${pick(random, [16, 32, 64, 128])} GB`, penyimpanan: `${pick(random, [1, 2, 4])} TB`, teknik: "DAS", lokasi: room },
        relasi: [room, random() < 0.7 ? "Ubuntu Server 22.04 LTS" : "Windows Server 2022", usage === "Basis data" ? "MySQL 8" : ""].filter(Boolean),
        probis: 1 + Math.floor(random() * 3),
        baru: random() < 0.25,
      });
    }
    rows.push({ jenis: "jaringan", name: `Switch Distribusi ${short}`, opd, deskripsi: `Switch distribusi jaringan kantor ${short}`, pemilik: pdByCode.get(opd)?.name, kepemilikan: "milik_sendiri", pengelola: BIDANG, atribut: { tipe: "Switch" }, relasi: [room] });
    if (random() < 0.7) rows.push({ jenis: "jaringan", name: `Access Point Layanan ${short}`, opd, deskripsi: `Wi-Fi ruang layanan ${short}`, pemilik: pdByCode.get(opd)?.name, kepemilikan: random() < 0.6 ? "milik_sendiri" : "sewa", pengelola: BIDANG, atribut: { tipe: "Access point" }, relasi: [room], baru: random() < 0.4 });
    if (room !== DC) rows.push({ jenis: "periferal", name: `UPS Ruang Server ${short}`, opd, deskripsi: `Catu daya cadangan ruang server ${short}`, pengelola: `Subbagian Umum ${short}`, atribut: { tipe: "UPS", lokasi: room }, relasi: [room] });
    if (random() < 0.45) rows.push({ jenis: "penyimpanan", name: `NAS ${short}`, opd, deskripsi: `Penyimpanan berkas bersama ${short}`, pemilik: pdByCode.get(opd)?.name, kepemilikan: "milik_sendiri", pengelola: `Subbagian Umum ${short}`, atribut: { kapasitas: `${pick(random, [4, 8, 12, 16])} TB`, akses: "SMB/CIFS", lokasi: room }, relasi: [room], baru: random() < 0.3 });
  }
  return rows;
}

function generate(): Infrastruktur[] {
  const random = mulberry32(2041);
  const seeds = [...core, ...sites(random)];
  const apps = allAplikasi();
  const data = allData();
  const probisByPd = new Map<string, { id: string; name: string; period: string }[]>();
  for (const p of allProbis()) probisByPd.set(p.pd, [...(probisByPd.get(p.pd) ?? []), p]);
  const rows: Infrastruktur[] = [];

  for (const period of periods) {
    const current = period === activePeriod;
    const list = seeds.filter((s) => current || !s.baru);
    const sequence = new Map<string, number>();
    const codeOf = new Map<string, Infrastruktur>();
    for (const s of list) {
      const cfg = jenisConfig[s.jenis];
      const rai = s.rai ?? cfg.rai;
      const n = (sequence.get(rai) ?? 0) + 1;
      sequence.set(rai, n);
      const pool = (probisByPd.get(s.opd) ?? []).filter((p) => p.period === period);
      const row: Infrastruktur = {
        id: `GSK-INF ${rai.slice(4)}.${String(n).padStart(3, "0")}`,
        name: s.name,
        jenis: s.jenis,
        deskripsi: s.deskripsi ?? null,
        pemilik: cfg.common.includes("pemilik") ? (s.pemilik ?? pdByCode.get(s.opd)?.name ?? null) : null,
        kepemilikan: cfg.common.includes("kepemilikan") ? (s.kepemilikan ?? "milik_sendiri") : null,
        pengelola: cfg.common.includes("pengelola") ? (s.pengelola ?? null) : null,
        opd: s.opd,
        period,
        rai1: rai.slice(0, 6),
        rai2: rai,
        // Periode sebelumnya: kapasitas & bandwidth lebih kecil.
        atribut: current ? { ...s.atribut } : Object.fromEntries(Object.entries(s.atribut ?? {}).map(([k, v]) => [k, /\d/.test(v) && /bps|TB|GB/.test(v) ? v.replace(/[\d.]+/, (x) => String(Math.max(1, Math.round(Number(x) / 2)))) : v])),
        relasi: [],
        terhubung: [],
        aplikasi: s.aplikasi ? apps.filter((a) => a.period === period && s.aplikasi!.test(a.name)).slice(0, 6).map((a) => ({ id: a.id, name: a.name })) : [],
        data: s.data ? data.filter((d) => d.period === period && s.data!.test(d.name)).slice(0, 5).map((d) => ({ id: d.id, name: d.name })) : [],
        probis: s.probis ? pool.slice(0, s.probis).map((p) => ({ id: p.id, name: p.name })) : [],
        security: s.jenis === "perangkat_keamanan" || s.jenis === "fasilitas" ? { standar: ["Standar Keamanan Data Center Pemkab Gresik"], audit: ["Audit Keamanan SPBE Tahunan"] } : {},
      };
      rows.push(row);
      codeOf.set(s.name, row);
    }
    // Relasi antarkomponen lewat nama (hanya yang ada di periode ini dan diizinkan template), lalu sisi masuknya.
    for (const s of list) {
      const row = codeOf.get(s.name)!;
      const allowed = new Set<string>([...jenisConfig[s.jenis].relasi, ...(jenisConfig[s.jenis].fungsi ?? [])]);
      row.relasi = (s.relasi ?? [])
        .map((name) => codeOf.get(name))
        .filter((t): t is Infrastruktur => !!t && t !== row && allowed.has(t.jenis))
        .map((t) => ({ id: t.id, name: t.name, jenis: t.jenis }));
      for (const t of row.relasi) codeOf.get(t.name)!.terhubung.push({ id: row.id, name: row.name, jenis: row.jenis });
    }
    // Aplikasi yang mencantumkan nama komponen di kolom infrastrukturnya.
    for (const a of apps.filter((x) => x.period === period)) {
      for (const name of [a.cloud, a.server, a.splp, a.jip]) {
        const row = name ? codeOf.get(name) : undefined;
        if (row && !row.aplikasi.some((x) => x.id === a.id)) row.aplikasi.push({ id: a.id, name: a.name });
      }
    }
  }
  return rows;
}

let cache: Infrastruktur[] | null = null;
/** Semua komponen contoh (kedua periode). */
export function allInfrastruktur() {
  return (cache ??= generate());
}
