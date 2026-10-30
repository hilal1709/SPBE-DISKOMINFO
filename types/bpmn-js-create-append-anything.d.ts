// Paket tidak menyertakan tipe; hanya modul didi yang dipakai editor BPMN.
declare module "bpmn-js-create-append-anything" {
  import type { ModuleDeclaration } from "didi";
  export const CreateAppendAnythingModule: ModuleDeclaration;
}
