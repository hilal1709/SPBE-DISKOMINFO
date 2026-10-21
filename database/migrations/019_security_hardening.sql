-- Hardening keamanan: pembatas percobaan (login, saran AI) dan penonaktifan akun demo dari migrasi 004.

create table if not exists rate_limits (
  key text primary key,
  hits integer not null default 0,
  reset_at timestamptz not null
);
create index if not exists rate_limits_reset_at_idx on rate_limits (reset_at);

-- Akun demo memakai sandi bersama yang tertulis di repositori; jangan aktif di database produksi.
update users set active = false, updated_at = now()
where email in ('operator@gresikkab.go.id', 'organisasi@gresikkab.go.id', 'validator@gresikkab.go.id', 'pimpinan@gresikkab.go.id');
