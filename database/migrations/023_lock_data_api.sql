-- Aplikasi terhubung langsung ke Postgres sebagai pemilik tabel; Data API Supabase (PostgREST/GraphQL) tidak dipakai.
-- Cabut hak peran anon/authenticated di skema public dan pastikan RLS aktif (tanpa policy = tidak ada baris yang
-- terbaca lewat anon key). Pemilik tabel tidak terkena RLS, jadi aplikasi tidak berubah. Di Postgres non-Supabase
-- (database uji lokal) peran itu tidak ada dan blok ini dilewati.
do $$
declare
  role_name text;
  t record;
begin
  for role_name in select rolname from pg_roles where rolname in ('anon', 'authenticated') loop
    execute format('revoke all on all tables in schema public from %I', role_name);
    execute format('revoke all on all sequences in schema public from %I', role_name);
    execute format('revoke all on all functions in schema public from %I', role_name);
    execute format('alter default privileges in schema public revoke all on tables from %I', role_name);
    execute format('alter default privileges in schema public revoke all on sequences from %I', role_name);
    execute format('alter default privileges in schema public revoke all on functions from %I', role_name);
  end loop;
  for t in select tablename from pg_tables where schemaname = 'public' and not rowsecurity loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
