-- B19: nomor ID tidak dipakai ulang setelah record dihapus.
-- Kode record yang dihapus disimpan di retired_codes; pemberi kode menghitung kode terbesar dari record aktif DAN kode pensiun.
create table if not exists retired_codes (
  table_name text not null,
  code text not null,
  retired_at timestamptz not null default now(),
  primary key (table_name, code)
);

create or replace function retire_code() returns trigger language plpgsql as $$
begin
  if old.code is not null then
    insert into retired_codes (table_name, code) values (tg_table_name, old.code) on conflict do nothing;
  end if;
  return old;
end $$;

do $$
declare t text;
begin
  foreach t in array array['process_businesses', 'services', 'datasets', 'applications', 'infrastructures', 'security_activities', 'roadmap_items', 'gap_analyses'] loop
    if to_regclass(t) is not null then
      execute format('drop trigger if exists retire_code on %I', t);
      execute format('create trigger retire_code after delete on %I for each row execute function retire_code()', t);
    end if;
  end loop;
end $$;

-- Kode record yang sudah terhapus sebelum migrasi ini (tercatat di riwayat bersnapshot, lihat 026).
insert into retired_codes (table_name, code)
select 'process_businesses', h.record_code from probis_reviews h where h.process_business_id is null and h.record_code is not null
on conflict do nothing;
insert into retired_codes (table_name, code)
select case h.domain when 'layanan' then 'services' when 'data' then 'datasets' when 'aplikasi' then 'applications'
                     when 'infrastruktur' then 'infrastructures' when 'keamanan' then 'security_activities' end, h.record_code
from validation_history h
where h.record_code is not null and h.domain is not null
  and coalesce(h.service_id, h.dataset_id, h.application_id, h.infrastructure_id, h.security_activity_id) is null
on conflict do nothing;
