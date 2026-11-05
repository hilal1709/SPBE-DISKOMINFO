-- F3: "Pelaporan dan Tindak Lanjut Penyimpanan Alih Media Arsip Vital Desa" adalah nama kegiatan, bukan Perangkat Daerah.
-- Semua rujukan (record domain, akun, dsb.) dipindah ke Dinas Perpustakaan dan Kearsipan, lalu baris OPD-nya dihapus.
do $$
declare
  bad uuid;
  good uuid;
  fk record;
begin
  select id into bad from opd where code = 'ARSIPDESA';
  if bad is null then return; end if;
  select id into good from opd where code = 'DISPERPUSIP';
  if good is null then raise exception 'OPD DISPERPUSIP tidak ditemukan; migrasi dibatalkan.'; end if;

  for fk in
    select c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f' and c.confrelid = 'opd'::regclass
  loop
    execute format('update %s set %I = $1 where %I = $2', fk.tbl, fk.col, fk.col) using good, bad;
  end loop;

  delete from opd where id = bad;
end $$;
