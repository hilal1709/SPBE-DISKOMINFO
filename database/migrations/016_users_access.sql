-- Kelola akun & hak akses dari CMS (Pengaturan → Akun Pengguna / Hak Akses).
-- Satu baris per peran yang sudah diatur; peran tanpa baris memakai hak akses bawaan (lib/permissions.ts → defaultGrants).
CREATE TABLE IF NOT EXISTS role_access (
  role role_name PRIMARY KEY,
  permissions text[] NOT NULL DEFAULT '{}',
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
