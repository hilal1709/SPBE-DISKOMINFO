"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert02Icon, ArrowLeft01Icon, CheckmarkCircle02Icon, Logout01Icon, ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { changePassword } from "@/app/actions/akun";
import { logout } from "@/app/actions/auth";
import { Banner } from "@/components/blocks/banner";
import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { passwordRules } from "@/lib/security/password";
import { cn } from "@/lib/utils";

function PasswordInput({ id, autoComplete, invalid, onChange }: { id: string; autoComplete: string; invalid?: boolean; onChange?: (value: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        name={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        maxLength={200}
        required
        onChange={onChange && ((e) => onChange(e.target.value))}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs" onClick={() => setShow((v) => !v)} aria-label={show ? "Sembunyikan sandi" : "Tampilkan sandi"}>
          <Icon icon={show ? ViewOffSlashIcon : ViewIcon} size={16} />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

/** Ganti sandi sendiri. `forced` = masih memakai sandi sementara dari admin; CMS terkunci sampai diganti. */
export function ChangePasswordForm({ forced, email, name }: { forced: boolean; email: string; name: string }) {
  const [state, formAction, pending] = useActionState(changePassword, undefined);
  const [next, setNext] = useState("");
  const rules = passwordRules({ email, name });

  return (
    <main className="flex min-h-svh flex-col p-6 sm:p-10">
      {forced ? (
        <form action={logout} className="self-start">
          <Button type="submit" variant="ghost" className="-ml-2 text-muted-foreground">
            <Icon icon={Logout01Icon} size={16} />
            Keluar
          </Button>
        </form>
      ) : (
        <Button asChild variant="ghost" className="group -ml-2 self-start text-muted-foreground">
          <Link href="/cms">
            <Icon icon={ArrowLeft01Icon} size={16} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
            Kembali ke CMS
          </Link>
        </Button>
      )}

      <Reveal className="m-auto w-full max-w-sm py-10">
        <div data-reveal>
          <Logo href={forced ? "/" : "/cms"} subtitle="CMS · Kabupaten Gresik" />
        </div>
        <div data-reveal className="mt-8">
          <p className="eyebrow">{email}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Ganti sandi</h1>
        </div>

        {forced && (
          <Banner variant="warning" dismissible={false} className="mt-6">
            Ganti sandi sementara sebelum memakai CMS.
          </Banner>
        )}

        {/* React mengosongkan isian setelah aksi selesai; daftar syarat ikut kembali kosong. */}
        <form action={formAction} onSubmit={() => setNext("")} className="mt-8" data-reveal>
          <FieldGroup className="gap-5">
            {state?.error && (
              <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1">
                <Icon icon={Alert02Icon} />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            {/* Bantu pengelola sandi peramban menyimpan sandi baru untuk akun yang benar. */}
            <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
            <Field data-invalid={!!state?.fields?.current || undefined}>
              <FieldLabel htmlFor="current">Sandi saat ini</FieldLabel>
              <PasswordInput id="current" autoComplete="current-password" invalid={!!state?.fields?.current} />
              <FieldError>{state?.fields?.current}</FieldError>
            </Field>
            <Field data-invalid={!!state?.fields?.next || undefined}>
              <FieldLabel htmlFor="next">Sandi baru</FieldLabel>
              <PasswordInput id="next" autoComplete="new-password" invalid={!!state?.fields?.next} onChange={setNext} />
              <FieldError>{state?.fields?.next}</FieldError>
              <ul className="grid gap-1 text-xs" aria-label="Syarat sandi">
                {rules.map((rule) => {
                  const met = rule.test(next);
                  return (
                    <li key={rule.key} className={cn("flex items-center gap-1.5 transition-colors", met ? "text-foreground" : "text-muted-foreground")}>
                      <Icon icon={CheckmarkCircle02Icon} size={14} className={cn("transition-colors", met ? "text-brand-teal" : "opacity-40")} />
                      {rule.label}
                      <span className="sr-only">{met ? "terpenuhi" : "belum terpenuhi"}</span>
                    </li>
                  );
                })}
              </ul>
            </Field>
            <Field data-invalid={!!state?.fields?.confirm || undefined}>
              <FieldLabel htmlFor="confirm">Ulangi sandi baru</FieldLabel>
              <PasswordInput id="confirm" autoComplete="new-password" invalid={!!state?.fields?.confirm} />
              <FieldError>{state?.fields?.confirm}</FieldError>
            </Field>
            <p className="text-xs text-muted-foreground">Setelah disimpan, semua perangkat keluar dan Anda masuk lagi dengan sandi baru.</p>
            <Button type="submit" size="lg" loading={pending} className="w-full">
              {pending ? "Menyimpan" : "Simpan sandi baru"}
            </Button>
          </FieldGroup>
        </form>
      </Reveal>
    </main>
  );
}
