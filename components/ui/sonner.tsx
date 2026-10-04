"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, InformationCircleIcon, Alert02Icon, MultiplicationSignCircleIcon, Loading03Icon } from "@hugeicons/core-free-icons"

/**
 * Toast design system: kartu charcoal, ikon berwarna palet per tipe, aksi berbentuk pil kuning
 * (pola toast-variants / promise-toast / undo-pill dari 21st.dev).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-5 text-brand-teal" />,
        info: <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-5 text-brand-sky" />,
        warning: <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-5 text-brand-yellow" />,
        error: <HugeiconsIcon icon={MultiplicationSignCircleIcon} strokeWidth={2} className="size-5 text-brand-orange" />,
        loading: <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-5 animate-spin text-brand-yellow" />,
      }}
      style={
        {
          "--normal-bg": "var(--brand-charcoal)",
          "--normal-text": "#ffffff",
          "--normal-border": "transparent",
          "--border-radius": "1rem",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast gap-3! px-4! py-3.5! shadow-raised! font-sans!",
          title: "font-semibold! text-sm!",
          description: "text-white/70! text-xs!",
          actionButton: "rounded-full! bg-brand-yellow! px-3! font-semibold! text-brand-charcoal!",
          cancelButton: "rounded-full! bg-white/10! text-white!",
          closeButton: "border-white/15! bg-brand-charcoal! text-white!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
