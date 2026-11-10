-- Impor history: probis periode baru bisa disalin dari periode sebelumnya. copied_from mencatat asal salinannya;
-- riwayat nama lintas periode dibaca lewat kode yang sama (UNIQUE (code, period_id)).
alter table process_businesses add column if not exists copied_from uuid references process_businesses(id) on delete set null;
create index if not exists process_businesses_code_idx on process_businesses (code);
