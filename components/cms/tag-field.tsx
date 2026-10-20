"use client";
import { useState } from "react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** Daftar isian teks: Enter untuk menambah, chip bisa dilepas. */
export function TagField({ label, values, onChange }: { label: string; values: string[]; onChange: (values: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const text = draft.trim();
    if (text && !values.includes(text)) onChange([...values, text]);
    setDraft("");
  };
  return (
    <Field data-sec className="rounded-lg">
      <FieldLabel>{label}</FieldLabel>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder="Nama/ID kegiatan, lalu Enter"
        aria-label={label}
      />
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <li key={v} className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-sky/40 py-0.5 pr-0.5 pl-2.5 text-xs">
              <span className="truncate">{v}</span>
              <Button type="button" variant="ghost" size="icon-xs" aria-label={`Hapus ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="size-5 rounded-full">
                <Icon icon={Cancel01Icon} size={11} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}
