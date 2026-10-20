import { allAplikasi } from "@/lib/aplikasi/generate";
import { allData } from "@/lib/data/generate";
import { allInfrastruktur } from "@/lib/infrastruktur/generate";
import { mulberry32 } from "@/lib/probis/generate";
import { sampleActivePeriod as activePeriod, samplePeriods as periods } from "@/lib/probis/reference";
import type { KegiatanKeamanan } from "@/lib/types";
import { kegiatanConfig, kegiatanKeys, type Kegiatan } from "./jenis";
import type { Coverage } from "./repo";

/** Data contoh Domain Keamanan (dashboard publik saat database kosong, dan `pnpm seed:keamanan`). */

type Seed = { jenis: Kegiatan; name: string; opd: string; deskripsi: string; tanggal: string; atribut?: Record<string, string> };

const standar: Seed[] = [
  { jenis: "standar", name: "Peraturan Bupati tentang Sistem Manajemen Keamanan Informasi SPBE", opd: "DISKOMINFO", deskripsi: "Kebijakan keamanan informasi yang mengikat seluruh Perangkat Daerah", tanggal: "2022-03-14", atribut: { jenis: "Peraturan bupati" } },
  { jenis: "standar", name: "Standar Teknis Keamanan Pusat Data", opd: "DISKOMINFO", deskripsi: "Persyaratan fisik, lingkungan, dan akses data center Pemkab Gresik", tanggal: "2023-01-09", atribut: { jenis: "Standar teknis" } },
  { jenis: "standar", name: "SOP Pengelolaan Akun dan Hak Akses Aplikasi", opd: "DISKOMINFO", deskripsi: "Prosedur pembuatan, peninjauan, dan pencabutan akun aplikasi", tanggal: "2023-06-01", atribut: { jenis: "Prosedur operasional (SOP)" } },
  { jenis: "standar", name: "SOP Penanganan Insiden Siber", opd: "DISKOMINFO", deskripsi: "Alur pelaporan dan respons insiden melalui Gresik-CSIRT", tanggal: "2024-02-20", atribut: { jenis: "Prosedur operasional (SOP)" } },
  { jenis: "standar", name: "Pedoman Klasifikasi Informasi Perangkat Daerah", opd: "DISKOMINFO", deskripsi: "Penggolongan informasi terbuka, terbatas, dan rahasia", tanggal: "2021-08-02", atribut: { jenis: "Pedoman", akhir: "2024-12-31" } },
  { jenis: "standar", name: "Standar Konfigurasi Aman Server Linux", opd: "DISKOMINFO", deskripsi: "Hardening sistem operasi server aplikasi", tanggal: "2025-04-15", atribut: { jenis: "Standar teknis" } },
  { jenis: "standar", name: "Kebijakan Pencadangan dan Pemulihan Data", opd: "DISKOMINFO", deskripsi: "Frekuensi cadangan, retensi, dan uji pemulihan berkala", tanggal: "2025-07-01", atribut: { jenis: "Kebijakan" } },
  { jenis: "standar", name: "SOP Keamanan Data Kependudukan", opd: "DISPENDUKCAPIL", deskripsi: "Pengamanan akses data kependudukan sesuai ketentuan Ditjen Dukcapil", tanggal: "2023-09-11", atribut: { jenis: "Prosedur operasional (SOP)" } },
  { jenis: "standar", name: "SOP Keamanan Rekam Medis Elektronik", opd: "DINKES", deskripsi: "Perlindungan data pasien pada fasilitas kesehatan daerah", tanggal: "2024-05-06", atribut: { jenis: "Prosedur operasional (SOP)" } },
];

/** Kegiatan penerapan & kelaikan berulang per tahun. */
const recurring: { jenis: Kegiatan; name: string; opd: string[]; deskripsi: string; month: number; atribut?: (random: () => number) => Record<string, string> }[] = [
  { jenis: "edukasi", name: "Sosialisasi Kesadaran Keamanan Informasi ASN", opd: ["DISKOMINFO"], deskripsi: "Pelatihan phishing, kata sandi, dan perlindungan data untuk ASN", month: 3 },
  { jenis: "edukasi", name: "Bimtek Keamanan Siber Admin Aplikasi OPD", opd: ["DISKOMINFO", "BKPSDM"], deskripsi: "Bimbingan teknis pengamanan aplikasi bagi admin Perangkat Daerah", month: 8 },
  { jenis: "edukasi", name: "Simulasi Phishing Perangkat Daerah", opd: ["DISKOMINFO"], deskripsi: "Uji kesadaran pegawai terhadap surel phishing", month: 10 },
  { jenis: "kerentanan", name: "Vulnerability Assessment Aplikasi Layanan Publik", opd: ["DISKOMINFO"], deskripsi: "Pemindaian kerentanan aplikasi web yang terbuka ke publik", month: 5 },
  { jenis: "kerentanan", name: "Penetration Test Portal Gresik", opd: ["DISKOMINFO"], deskripsi: "Uji penetrasi portal resmi bersama BSSN", month: 9 },
  { jenis: "kerentanan", name: "Pemindaian Kerentanan Jaringan OPD", opd: ["DISKOMINFO", "BPPKAD", "DINKES"], deskripsi: "Pemindaian port dan layanan pada jaringan Perangkat Daerah", month: 11 },
  { jenis: "peningkatan", name: "Pemasangan Sertifikat Elektronik Subdomain", opd: ["DISKOMINFO"], deskripsi: "Penerapan HTTPS pada seluruh subdomain gresikkab.go.id", month: 2 },
  { jenis: "peningkatan", name: "Penerapan Autentikasi Dua Faktor Aplikasi Internal", opd: ["DISKOMINFO", "BKPSDM"], deskripsi: "Aktivasi 2FA pada aplikasi kepegawaian dan keuangan", month: 6 },
  { jenis: "peningkatan", name: "Pembaruan Firmware Firewall dan Switch", opd: ["DISKOMINFO"], deskripsi: "Penutupan celah keamanan perangkat jaringan data center", month: 12 },
  { jenis: "insiden", name: "Penanganan Defacement Situs OPD", opd: ["DISKOMINFO", "DISPARBUD"], deskripsi: "Pemulihan situs dan penelusuran celah unggah berkas", month: 4, atribut: (r) => ({ kematangan: String(2 + Math.round(r() * 2)) }) },
  { jenis: "insiden", name: "Penanganan Serangan DDoS Layanan Publik", opd: ["DISKOMINFO"], deskripsi: "Mitigasi lonjakan trafik pada aplikasi perizinan", month: 7, atribut: (r) => ({ kematangan: String(3 + Math.round(r())) }) },
  { jenis: "insiden", name: "Penanganan Kebocoran Akun Surel Dinas", opd: ["DISKOMINFO", "BKPSDM", "SETDA"], deskripsi: "Reset kredensial dan pembatasan akses akun terdampak", month: 10, atribut: (r) => ({ kematangan: String(2 + Math.round(r() * 2)) }) },
  { jenis: "audit", name: "Audit Keamanan SPBE Tahunan", opd: ["INSPEKTORAT"], deskripsi: "Audit kepatuhan keamanan SPBE Perangkat Daerah", month: 9, atribut: (r) => ({ jenis: "Audit internal", hasil: `${4 + Math.round(r() * 6)} temuan, ${Math.round(r() * 2)} berisiko tinggi`, tindakLanjut: "Perbaikan konfigurasi dan pembaruan SOP dalam 60 hari" }) },
  { jenis: "audit", name: "Audit Keamanan Pusat Data oleh BSSN", opd: ["DISKOMINFO"], deskripsi: "Penilaian keamanan data center Pemkab Gresik", month: 11, atribut: () => ({ jenis: "Audit oleh BSSN", hasil: "Memenuhi sebagian besar kontrol; perlu penguatan pemantauan log", tindakLanjut: "Pengadaan SIEM dan prosedur tinjauan log mingguan" }) },
  { jenis: "audit", name: "Penilaian Mandiri Indeks KAMI", opd: ["DISKOMINFO", "DISPENDUKCAPIL", "DINKES"], deskripsi: "Evaluasi tingkat kematangan keamanan informasi", month: 6, atribut: (r) => ({ jenis: "Penilaian mandiri", hasil: `Skor ${400 + Math.round(r() * 250)} (kategori ${r() < 0.5 ? "cukup" : "baik"})`, tindakLanjut: "Rencana peningkatan kontrol pada area yang lemah" }) },
  { jenis: "kelaikan", name: "Uji Kelaikan Keamanan Aplikasi Baru", opd: ["DISKOMINFO"], deskripsi: "Pemeriksaan keamanan sebelum aplikasi baru tayang", month: 5 },
  { jenis: "kelaikan", name: "Sertifikasi Kelaikan Sistem Elektronik Layanan Publik", opd: ["DISKOMINFO", "DPMPTSP"], deskripsi: "Penilaian kelaikan sistem elektronik layanan perizinan", month: 10 },
];

/** Batas tanggal kegiatan contoh (tetap, agar data contoh deterministik). */
const CUTOFF = "2026-10-15";

function generate(): KegiatanKeamanan[] {
  const random = mulberry32(2047);
  const rows: KegiatanKeamanan[] = [];
  for (const period of periods) {
    const [start, end] = period.split("–").map(Number) as [number, number];
    // Periode berjalan: sampai batas tanggal contoh saja.
    const last = period === activePeriod ? Math.min(end, Number(CUTOFF.slice(0, 4))) : end;
    const seq = new Map<Kegiatan, number>();
    const push = (s: Omit<Seed, "atribut"> & { atribut?: Record<string, string> }) => {
      const n = (seq.get(s.jenis) ?? 0) + 1;
      seq.set(s.jenis, n);
      rows.push({ id: `GSK-KAM ${kegiatanConfig[s.jenis].abbr}.${String(n).padStart(3, "0")}`, jenis: s.jenis, name: s.name, deskripsi: s.deskripsi, tanggal: s.tanggal, opd: s.opd, period, atribut: s.atribut ?? {} });
    };
    for (const s of standar) if (Number(s.tanggal.slice(0, 4)) <= last && (!s.atribut?.akhir || Number(s.atribut.akhir.slice(0, 4)) >= start)) push(s);
    for (let year = start; year <= last; year++) {
      for (const k of recurring) {
        // Kegiatan makin lengkap dari tahun ke tahun; tahun berjalan baru sampai bulan ini.
        if (random() < 0.25 - (year - start) * 0.04) continue;
        for (const opd of k.opd) {
          if (opd !== k.opd[0] && random() < 0.4) continue;
          const tanggal = `${year}-${String(k.month).padStart(2, "0")}-${String(3 + Math.floor(random() * 24)).padStart(2, "0")}`;
          if (tanggal > CUTOFF) continue;
          push({ jenis: k.jenis, name: `${k.name} ${year}`, opd, deskripsi: k.deskripsi, tanggal, atribut: k.atribut?.(random) });
        }
      }
    }
  }
  return rows;
}

let cache: KegiatanKeamanan[] | null = null;
/** Semua kegiatan contoh (kedua periode). */
export function allKeamanan() {
  return (cache ??= generate());
}

/** Cakupan dependensi contoh: data, aplikasi, dan infrastruktur contoh yang mencantumkan tiap jenis keamanan. */
export function sampleCoverage(): Coverage {
  const random = mulberry32(2053);
  const coverage: Coverage = {};
  const share: Record<Kegiatan, number> = { standar: 0.72, audit: 0.48, kelaikan: 0.31, edukasi: 0.22, kerentanan: 0.4, insiden: 0.27, peningkatan: 0.35 };
  for (const period of periods) {
    const totals = {
      data: allData().filter((d) => d.period === period).length,
      aplikasi: allAplikasi().filter((a) => a.period === period).length,
      infrastruktur: allInfrastruktur().filter((i) => i.period === period).length,
    };
    const factor = period === activePeriod ? 1 : 0.6;
    coverage[period] = {
      totals,
      byKey: Object.fromEntries(
        kegiatanKeys.map((k) => [k, Object.fromEntries((["data", "aplikasi", "infrastruktur"] as const).map((d) => [d, Math.round(totals[d] * share[k] * factor * (0.85 + random() * 0.3))]))]),
      ),
    };
  }
  return coverage;
}
