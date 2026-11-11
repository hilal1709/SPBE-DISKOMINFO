-- Nama dan keberlakuan Perangkat Daerah per periode arsitektur (SOTK berubah antarperiode: ganti nama, gabung, pecah).
-- opd tetap menjadi identitas (kode) yang dirujuk semua domain; opd_periods menyimpan nama dan status di tiap periode.
create table if not exists opd_periods (
  opd_id uuid not null references opd(id) on delete cascade,
  period_id uuid not null references architecture_periods(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  primary key (opd_id, period_id)
);

create index if not exists opd_periods_period_idx on opd_periods (period_id);

-- Isian awal: semua OPD berlaku di semua periode yang sudah ada dengan nama sekarang.
insert into opd_periods (opd_id, period_id, name, active)
select o.id, ap.id, o.name, coalesce(o.active, true)
from opd o cross join architecture_periods ap
on conflict do nothing;

-- Sama seperti 023: Data API Supabase tidak dipakai, RLS aktif tanpa policy.
alter table opd_periods enable row level security;
