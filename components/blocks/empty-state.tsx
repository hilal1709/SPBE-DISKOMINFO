import { Illustration, type IllustrationName } from "@/components/illustrations/illustration";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

/** Keadaan kosong / informasi dengan ilustrasi Lottie, bukan ikon. */
export function EmptyState({
  illustration = "empty",
  title,
  description,
  children,
  className,
  size = "md",
}: {
  illustration?: IllustrationName;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const width = { sm: "w-40", md: "w-56", lg: "w-72" }[size];
  return (
    <Empty className={cn("gap-2", className)}>
      <EmptyHeader className="max-w-md">
        <EmptyMedia className="mb-0">
          <Illustration name={illustration} className={width} />
        </EmptyMedia>
        <EmptyTitle className="text-base font-semibold">{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {children && <EmptyContent className="mt-2 flex-row justify-center">{children}</EmptyContent>}
    </Empty>
  );
}
