-- Siklus sandi: wajib ganti sandi sementara, pencabutan sesi setelah sandi berubah, dan jejak audit autentikasi.

alter table users add column if not exists must_change_password boolean not null default false;
alter table users add column if not exists password_changed_at timestamptz;

create table if not exists auth_events (
  id bigserial primary key,
  user_id uuid references users(id) on delete set null,
  email text,
  event text not null,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists auth_events_created_at_idx on auth_events (created_at desc);
create index if not exists auth_events_user_idx on auth_events (user_id, created_at desc);
