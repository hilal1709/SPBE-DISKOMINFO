import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";

export type { IconSvgElement } from "@hugeicons/react";

/**
 * Satu-satunya pintu masuk ikon (Hugeicons). Gunakan seperlunya: navigasi, aksi, dan input.
 * Untuk keadaan kosong, error, atau sambutan gunakan <Illustration/>, bukan ikon besar.
 */
export function Icon({ size = 18, strokeWidth = 1.8, ...props }: HugeiconsIconProps) {
  return <HugeiconsIcon size={size} strokeWidth={strokeWidth} aria-hidden {...props} />;
}
