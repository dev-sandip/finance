import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Label className={cn(className)}>
      <span>{label}</span>
      {children}
    </Label>
  );
}

export const inputClass =
  "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15";

export const selectClass = inputClass;

export const textareaClass =
  "min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15";
