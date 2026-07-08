"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Toaster, toast } from "sonner";

export function AppToaster() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    const saved = searchParams.get("saved");
    const duplicate = searchParams.get("duplicate");
    const imported = searchParams.get("imported");
    const skipped = searchParams.get("skipped");
    const invalid = searchParams.get("invalid");

    if (error) {
      toast.error(decodeURIComponent(error));
      return;
    }

    if (saved === "1") {
      toast.success("Saved changes.");
      return;
    }

    if (duplicate === "1") {
      toast.info("This file was already imported.");
      return;
    }

    if (imported !== null || skipped !== null || invalid !== null) {
      toast.success("Import finished.", {
        description: `${imported ?? 0} imported, ${skipped ?? 0} skipped, ${invalid ?? 0} invalid.`,
      });
    }
  }, [searchParams]);

  return (
    <Toaster
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "font-sans",
          title: "text-sm",
          description: "text-xs",
        },
      }}
    />
  );
}
