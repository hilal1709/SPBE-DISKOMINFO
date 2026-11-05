-- B11: riwayat verifikasi tetap ada setelah record dihapus.
-- 1) Snapshot domain, kode, nama, dan OPD record di setiap baris riwayat (diisi trigger saat insert + backfill).
-- 2) FK riwayat → record menjadi ON DELETE SET NULL (sebelumnya CASCADE menghapus riwayat).
-- 3) Kolom `event` menandai baris khusus, mis. 'deleted' untuk log penghapusan.

alter table probis_reviews add column if not exists record_code text, add column if not exists record_name text,
  add column if not exists record_opd_id uuid, add column if not exists event text;
alter table validation_history add column if not exists domain text, add column if not exists record_code text,
  add column if not exists record_name text, add column if not exists record_opd_id uuid, add column if not exists event text;

-- Backfill snapshot dari record yang masih ada.
update probis_reviews h set record_code = t.code, record_name = t.name, record_opd_id = t.opd_id
  from process_businesses t where t.id = h.process_business_id and h.record_name is null;
update validation_history h set domain = 'layanan', record_code = t.code, record_name = t.name, record_opd_id = t.opd_id from services t where t.id = h.service_id and h.domain is null;
update validation_history h set domain = 'data', record_code = t.code, record_name = t.name, record_opd_id = t.opd_id from datasets t where t.id = h.dataset_id and h.domain is null;
update validation_history h set domain = 'aplikasi', record_code = t.code, record_name = t.name, record_opd_id = t.opd_id from applications t where t.id = h.application_id and h.domain is null;
update validation_history h set domain = 'infrastruktur', record_code = t.code, record_name = t.name, record_opd_id = t.opd_id from infrastructures t where t.id = h.infrastructure_id and h.domain is null;
update validation_history h set domain = 'keamanan', record_code = t.code, record_name = t.name, record_opd_id = t.opd_id from security_activities t where t.id = h.security_activity_id and h.domain is null;

-- Trigger: isi snapshot otomatis pada setiap riwayat baru (kode aplikasi tidak perlu mengirimnya).
create or replace function probis_reviews_snapshot() returns trigger language plpgsql as $$
begin
  if new.record_name is null and new.process_business_id is not null then
    select code, name, opd_id into new.record_code, new.record_name, new.record_opd_id from process_businesses where id = new.process_business_id;
  end if;
  return new;
end $$;
drop trigger if exists probis_reviews_snapshot on probis_reviews;
create trigger probis_reviews_snapshot before insert on probis_reviews for each row execute function probis_reviews_snapshot();

create or replace function validation_history_snapshot() returns trigger language plpgsql as $$
begin
  if new.record_name is not null then return new; end if;
  if new.service_id is not null then
    new.domain := 'layanan'; select code, name, opd_id into new.record_code, new.record_name, new.record_opd_id from services where id = new.service_id;
  elsif new.dataset_id is not null then
    new.domain := 'data'; select code, name, opd_id into new.record_code, new.record_name, new.record_opd_id from datasets where id = new.dataset_id;
  elsif new.application_id is not null then
    new.domain := 'aplikasi'; select code, name, opd_id into new.record_code, new.record_name, new.record_opd_id from applications where id = new.application_id;
  elsif new.infrastructure_id is not null then
    new.domain := 'infrastruktur'; select code, name, opd_id into new.record_code, new.record_name, new.record_opd_id from infrastructures where id = new.infrastructure_id;
  elsif new.security_activity_id is not null then
    new.domain := 'keamanan'; select code, name, opd_id into new.record_code, new.record_name, new.record_opd_id from security_activities where id = new.security_activity_id;
  end if;
  return new;
end $$;
drop trigger if exists validation_history_snapshot on validation_history;
create trigger validation_history_snapshot before insert on validation_history for each row execute function validation_history_snapshot();

-- FK CASCADE → SET NULL (nama constraint dicari dari katalog agar tidak bergantung pada nama bawaan).
do $$
declare
  fk record;
  ref text;
begin
  for fk in
    select c.conname, c.conrelid::regclass as tbl, a.attname as col, c.confrelid::regclass as target
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f' and c.confdeltype = 'c'
      and c.conrelid in ('probis_reviews'::regclass, 'validation_history'::regclass)
      and a.attname in ('process_business_id', 'service_id', 'dataset_id', 'application_id', 'infrastructure_id', 'security_activity_id')
  loop
    execute format('alter table %s drop constraint %I', fk.tbl, fk.conname);
    execute format('alter table %s alter column %I drop not null', fk.tbl, fk.col);
    execute format('alter table %s add constraint %I foreign key (%I) references %s(id) on delete set null', fk.tbl, fk.conname, fk.col, fk.target);
  end loop;
end $$;

create index if not exists probis_reviews_created_idx on probis_reviews (created_at desc);
create index if not exists validation_history_domain_idx on validation_history (domain, created_at desc);
