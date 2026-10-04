"use client";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { Alert02Icon, ArrowLeft01Icon, ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { login } from "@/app/actions/auth";
import { Icon } from "@/components/icon";
import { Illustration } from "@/components/illustrations/illustration";
import { Logo } from "@/components/brand/logo";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Reveal } from "@/components/motion/reveal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

export default function Login() {
  const [error, formAction, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  // Getar singkat saat login gagal — umpan balik yang terasa tanpa perlu membaca pesan.
  useGSAP(() => {
    if (!error) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.fromTo(form.current, { x: 0 }, { keyframes: { x: [0, -8, 7, -5, 3, 0] }, duration: 0.45, ease: "power1.out" });
    });
  }, { dependencies: [error] });

  return (
    <main className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative m-3 hidden overflow-hidden rounded-3xl bg-brand-sky text-brand-charcoal lg:flex lg:flex-col">
        <div aria-hidden className="absolute -top-32 -left-32 size-[440px] rounded-full bg-brand-yellow/40 blur-3xl" />
        <div aria-hidden className="absolute -right-24 -bottom-24 size-[380px] rounded-full bg-brand-teal/25 blur-3xl" />
        <Reveal className="relative flex flex-1 flex-col p-10">
          <div data-reveal>
            <Logo />
          </div>
          <Illustration name="login-hero" className="mx-auto my-auto w-full max-w-md" />
          <div data-reveal>
            <h2 className="max-w-md text-3xl leading-tight font-bold text-balance">Satu peta arsitektur untuk layanan digital Gresik.</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-brand-charcoal/75">
              Proses bisnis, layanan, data, aplikasi, dan infrastruktur seluruh Perangkat Daerah terhubung dalam satu sistem.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="flex flex-col p-6 sm:p-10">
        <Button asChild variant="ghost" className="group -ml-2 self-start text-muted-foreground">
          <Link href="/">
            <Icon icon={ArrowLeft01Icon} size={16} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
            Kembali ke portal
          </Link>
        </Button>

        <Reveal className="m-auto w-full max-w-sm py-10">
          <div data-reveal className="lg:hidden">
            <Logo />
          </div>
          <div data-reveal className="mt-8 lg:mt-0">
            <p className="eyebrow">CMS SPBE</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Masuk ke akun Anda</h1>
          </div>

          <form ref={form} action={formAction} className="mt-8" data-reveal>
            <FieldGroup className="gap-5">
              {error && (
                <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1">
                  <Icon icon={Alert02Icon} />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="username" defaultValue="admin@gresikkab.go.id" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Kata sandi</FieldLabel>
                <InputGroup>
                  <InputGroupInput id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" defaultValue="admin123" required />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton size="icon-xs" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>
                      <Icon icon={showPassword ? ViewOffSlashIcon : ViewIcon} size={16} />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              <Button type="submit" size="lg" loading={pending} className="w-full">
                {pending ? "Memeriksa akun" : "Masuk ke CMS"}
              </Button>
            </FieldGroup>
          </form>

          <p data-reveal className="mt-6 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            Akun demo: <b className="text-foreground">admin@gresikkab.go.id</b> / <b className="text-foreground">admin123</b>
          </p>
        </Reveal>
      </section>
    </main>
  );
}
