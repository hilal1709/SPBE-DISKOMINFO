-- Sesi server-side: JWT hanya membawa id sesi acak; sesi bisa dicabut (logout, ganti/reset sandi, nonaktif, per perangkat),
-- berakhir mutlak 8 jam setelah masuk, dan berakhir bila tidak aktif 30 menit. Yang disimpan hanya sha256(id sesi).

create table if not exists sessions (
  id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  ip text,
  user_agent text
);
create index if not exists sessions_user_active_idx on sessions (user_id) where revoked_at is null;
create index if not exists sessions_expires_idx on sessions (expires_at);
