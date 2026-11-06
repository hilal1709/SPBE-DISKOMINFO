"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState, useEffect, useRef, useState } from "react";
import {
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  KeyboardIcon,
  LockPasswordIcon,
  Mail01Icon,
  SecurityCheckIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { login } from "@/app/actions/auth";
import { Icon } from "@/components/icon";
import { Illustration } from "@/components/illustrations/illustration";
import { Logo, LogoMark } from "@/components/brand/logo";
import { AosInit } from "@/components/motion/aos";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Reveal } from "@/components/motion/reveal";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { WordStagger } from "@/components/motion/word-stagger";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

/** Swiper hanya untuk panel samping (layar lg ke atas), dimuat terpisah. */
const LoginHighlights = dynamic(() => import("@/components/blocks/login-highlights"), { ssr: false });

/** Isian & petunjuk akun demo hanya untuk pengembangan lokal. */
const DEMO = process.env.NODE_ENV !== "production";
const DEMO_EMAIL = "admin@gresikkab.go.id";
const DEMO_PASSWORD = "admin123";

export default function Login() {
  const [error, formAction, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const email = useRef<HTMLInputElement>(null);
  const password = useRef<HTMLInputElement>(null);
  const shine = useRef<HTMLSpanElement>(null);

  // Getar singkat saat login gagal — umpan balik yang terasa tanpa perlu membaca pesan.
  useGSAP(() => {
    if (!error) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.fromTo(form.current, { x: 0 }, { keyframes: { x: [0, -8, 7, -5, 3, 0] }, duration: 0.45, ease: "power1.out" });
    });
  }, { dependencies: [error] });

  // Kilau yang menyapu tombol masuk saat disorot.
  const sweep = () => {
    if (!window.matchMedia(MOTION_OK).matches) return;
    gsap.fromTo(shine.current, { xPercent: -120 }, { xPercent: 260, duration: 0.8, ease: "power2.inOut", overwrite: true });
  };

  const fillDemo = () => {
    if (email.current) email.current.value = DEMO_EMAIL;
    if (password.current) password.current.value = DEMO_PASSWORD;
    password.current?.focus();
  };

  return (
    <main className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <Aside />

      <section className="relative isolate flex flex-col overflow-hidden px-4 py-6 sm:p-10">
        {/* Latar: dua cahaya token + pola titik yang memudar ke tepi (pola Split Login 21st.dev). */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-[12%] -right-24 size-[360px] rounded-full bg-brand-teal/15 blur-3xl" />
          <div className="absolute bottom-[6%] -left-20 size-[320px] rounded-full bg-brand-yellow/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] bg-size-[22px_22px]" />
        </div>

        <Button asChild variant="ghost" className="group -ml-2 self-start text-muted-foreground">
          <Link href="/">
            <Icon icon={ArrowLeft01Icon} size={16} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
            Kembali ke portal
          </Link>
        </Button>

        <Reveal className="m-auto w-full max-w-[420px] py-8">
          <div data-reveal className="mb-6 lg:hidden">
            <Logo />
          </div>

          <SpotlightCard data-reveal className="gap-0 overflow-hidden border-border/70 bg-card/85 p-6 shadow-raised backdrop-blur-xl sm:p-8">
            <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-brand-teal via-brand-yellow to-brand-orange" />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 py-1 pr-3 pl-1 text-xs font-semibold tracking-wide text-muted-foreground">
                <LogoMark className="size-5" />
                CMS SPBE
              </span>
              <WordStagger as="h1" text="Masuk ke akun Anda" className="mt-4 block text-2xl font-bold tracking-tight sm:text-[1.7rem]" />
              <p className="mt-1.5 text-sm text-muted-foreground">Kelola arsitektur SPBE Perangkat Daerah Anda.</p>
            </div>

            <form ref={form} action={formAction} noValidate className="relative mt-7">
              <Suspense fallback={null}>
                <CallbackField />
              </Suspense>
              <FieldGroup className="gap-5">
                {!error && (
                  <Suspense fallback={null}>
                    <NoticeAlert />
                  </Suspense>
                )}
                {error && (
                  <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1">
                    <Icon icon={Alert02Icon} />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <InputGroup className="h-11 bg-background/80">
                    <InputGroupAddon className="pl-3.5 transition-colors group-focus-within/input-group:text-primary">
                      <Icon icon={Mail01Icon} size={17} />
                    </InputGroupAddon>
                    <InputGroupInput
                      ref={email}
                      id="email"
                      name="email"
                      type="text"
                      inputMode="email"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="nama@gresikkab.go.id"
                      defaultValue={DEMO ? DEMO_EMAIL : undefined}
                    />
                  </InputGroup>
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Kata sandi</FieldLabel>
                  <InputGroup className="h-11 bg-background/80">
                    <InputGroupAddon className="pl-3.5 transition-colors group-focus-within/input-group:text-primary">
                      <Icon icon={LockPasswordIcon} size={17} />
                    </InputGroupAddon>
                    <InputGroupInput
                      ref={password}
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      defaultValue={DEMO ? DEMO_PASSWORD : undefined}
                      onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                      onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                      onBlur={() => setCapsLock(false)}
                    />
                    <InputGroupAddon align="inline-end" className="pr-2">
                      <InputGroupButton size="icon-xs" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>
                        <Icon icon={showPassword ? ViewOffSlashIcon : ViewIcon} size={16} />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {capsLock && (
                    <p role="status" className="flex items-center gap-1.5 text-xs font-medium text-brand-orange animate-in fade-in slide-in-from-top-1">
                      <Icon icon={KeyboardIcon} size={14} />
                      Caps Lock aktif
                    </p>
                  )}
                </Field>
                <Button type="submit" size="lg" loading={pending} onPointerEnter={sweep} className="group relative h-11 w-full overflow-hidden">
                  <span ref={shine} aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-[120%] skew-x-[-20deg] bg-linear-to-r from-transparent via-white/30 to-transparent" />
                  {pending ? "Memeriksa akun" : "Masuk ke CMS"}
                  {!pending && <Icon icon={ArrowRight01Icon} size={16} className="transition-transform duration-300 group-hover:translate-x-1" />}
                </Button>
              </FieldGroup>
            </form>
          </SpotlightCard>

          <p data-aos="fade-blur" data-aos-delay="250" className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Icon icon={SecurityCheckIcon} size={14} className="text-primary" />
            Koneksi terenkripsi dan sesi terlindungi
          </p>

          {DEMO && (
            <button
              type="button"
              onClick={fillDemo}
              data-aos="fade-blur"
              data-aos-delay="350"
              className="mx-auto mt-3 block rounded-full border border-dashed bg-background/70 px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              Akun demo: <b className="text-foreground">{DEMO_EMAIL}</b> / <b className="text-foreground">{DEMO_PASSWORD}</b>
            </button>
          )}
        </Reveal>
      </section>
      <AosInit />
    </main>
  );
}

/** Panel kiri: ilustrasi dengan parallax kursor (GSAP) dan sorotan (Swiper). */
function Aside() {
  const root = useRef<HTMLElement>(null);
  const wide = useWide();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const layers = gsap.utils.toArray<HTMLElement>("[data-depth]", root.current);
        const movers = layers.map((el) => {
          const depth = Number(el.dataset.depth);
          return { depth, x: gsap.quickTo(el, "x", { duration: 0.9, ease: "power3.out" }), y: gsap.quickTo(el, "y", { duration: 0.9, ease: "power3.out" }) };
        });
        const move = (event: PointerEvent) => {
          const box = root.current!.getBoundingClientRect();
          const dx = (event.clientX - box.left) / box.width - 0.5;
          const dy = (event.clientY - box.top) / box.height - 0.5;
          movers.forEach((m) => {
            m.x(dx * m.depth);
            m.y(dy * m.depth);
          });
        };
        const el = root.current!;
        el.addEventListener("pointermove", move);
        return () => el.removeEventListener("pointermove", move);
      });
    },
    { scope: root },
  );

  return (
    <aside ref={root} className="relative m-3 hidden overflow-hidden rounded-3xl bg-brand-sky text-brand-charcoal lg:flex lg:flex-col">
      <div aria-hidden data-depth="-30" className="absolute -top-32 -left-32 size-[440px] rounded-full bg-brand-yellow/40 blur-3xl" />
      <div aria-hidden data-depth="40" className="absolute -right-24 -bottom-24 size-[380px] rounded-full bg-brand-teal/25 blur-3xl" />

      <Reveal className="relative flex flex-1 flex-col p-10">
        <div data-reveal>
          <Logo />
        </div>
        <div data-depth="14" className="mx-auto my-auto w-full max-w-md">
          <Illustration name="login-hero" className="w-full" />
        </div>
        <div data-reveal>
          <p className="max-w-md text-3xl leading-tight font-bold text-balance">Satu peta arsitektur untuk layanan digital Gresik.</p>
          <div className="mt-6 max-w-md">{wide && <LoginHighlights />}</div>
        </div>
      </Reveal>
    </aside>
  );
}

/** true di layar lg ke atas, tempat panel samping terlihat. */
function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return wide;
}

const notices: Record<string, string> = {
  sandi: "Sandi berhasil diubah. Masuk dengan sandi baru.",
  sesi: "Sesi berakhir. Silakan masuk kembali.",
};

/** Pesan setelah ganti sandi atau sesi dicabut (?pesan=…); hanya teks tetap, bukan isi dari URL. */
function NoticeAlert() {
  const key = useSearchParams().get("pesan") ?? "";
  const notice = Object.hasOwn(notices, key) ? notices[key] : null;
  return notice ? (
    <Alert>
      <Icon icon={CheckmarkCircle02Icon} />
      <AlertDescription>{notice}</AlertDescription>
    </Alert>
  ) : null;
}

/** Halaman tujuan setelah login (mis. /keamanan); divalidasi ulang di server action. */
function CallbackField() {
  const callbackUrl = useSearchParams().get("callbackUrl");
  return callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null;
}
