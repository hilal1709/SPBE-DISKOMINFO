-- Indeks untuk bacaan yang sering: daftar per periode, aktivitas terbaru beranda CMS, dan relasi infrastruktur dari sisi seberang.
CREATE INDEX IF NOT EXISTS process_businesses_period_idx ON process_businesses (period_id);
CREATE INDEX IF NOT EXISTS process_businesses_updated_idx ON process_businesses (updated_at DESC);
CREATE INDEX IF NOT EXISTS probis_reviews_created_idx ON probis_reviews (created_at DESC);
CREATE INDEX IF NOT EXISTS validation_history_created_idx ON validation_history (created_at DESC);
CREATE INDEX IF NOT EXISTS infrastructure_applications_app_idx ON infrastructure_applications (application_id);
CREATE INDEX IF NOT EXISTS infrastructure_datasets_dataset_idx ON infrastructure_datasets (dataset_id);
CREATE INDEX IF NOT EXISTS infrastructure_process_businesses_pb_idx ON infrastructure_process_businesses (process_business_id);
