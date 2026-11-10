-- Menghubungkan Peta Rencana dengan arsitektur: satu kegiatan bisa menunjuk entri domain mana pun
-- (proses bisnis, layanan, data, aplikasi, infrastruktur, keamanan). Entri dirujuk lewat kodenya pada periode
-- kegiatan, sama seperti gap_analyses.subject_code, sehingga tautan tetap berlaku saat entri disalin ke periode baru.
create table if not exists roadmap_item_links (
  roadmap_item_id uuid not null references roadmap_items(id) on delete cascade,
  domain text not null check (domain in ('probis', 'layanan', 'data', 'aplikasi', 'infrastruktur', 'keamanan')),
  record_code text not null,
  primary key (roadmap_item_id, domain, record_code)
);

create index if not exists roadmap_item_links_record_idx on roadmap_item_links (domain, record_code);

-- Kegiatan yang sudah diusulkan dari temuan gap otomatis: tautkan ke objek temuannya.
insert into roadmap_item_links (roadmap_item_id, domain, record_code)
select g.roadmap_item_id,
       case
         when g.rule like 'probis\_%' then 'probis'
         when g.rule like 'layanan\_%' then 'layanan'
         when g.rule like 'data\_%' then 'data'
         when g.rule like 'aplikasi\_%' then 'aplikasi'
         when g.rule like 'infra\_%' then 'infrastruktur'
         else 'keamanan'
       end,
       g.subject_code
from gap_analyses g
where g.roadmap_item_id is not null and g.rule is not null and g.subject_code is not null
on conflict do nothing;

-- Sama seperti 023: Data API Supabase tidak dipakai, RLS aktif tanpa policy.
alter table roadmap_item_links enable row level security;
