-- Peran "Diskominfo (Admin Operator)": pengelola gap analysis & peta rencana (Detailing Requirement, sheet Functional Requirement).
-- Dipisah dari 014 karena nilai enum baru belum boleh dipakai dalam transaksi yang sama.
ALTER TYPE role_name ADD VALUE IF NOT EXISTS 'operator_diskominfo';
