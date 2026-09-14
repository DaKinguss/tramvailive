import { cn } from "@/lib/cn";

export function TramBadge({
  line,
  size = "md",
  dim = false,
}: {
  line: string;
  size?: "sm" | "md" | "lg";
  dim?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-grid place-items-center rounded-sm font-semibold tabular-nums tracking-tight text-tram-fg bg-tram",
        size === "sm" && "h-6 min-w-6 px-1 text-xs rounded-md",
        size === "md" && "h-8 min-w-8 px-1.5 text-sm rounded-lg",
        size === "lg" && "h-11 min-w-11 px-2 text-lg rounded-xl",
        dim && "opacity-40",
      )}
    >
      {line}
    </span>
  );
}
