-- Diagram BPMN satu per proses bisnis, disunting di CMS (bpmn-js) dan ikut alur ajuan rekamannya.
-- bpmn_svg = snapshot tersanitasi untuk pratinjau tanpa memuat editor.
alter table process_businesses
  add column if not exists bpmn_xml text,
  add column if not exists bpmn_svg text,
  add column if not exists bpmn_updated_at timestamptz;
