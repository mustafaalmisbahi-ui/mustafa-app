"use client";

import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
  defaultValue?: string;
  actionPath?: string;
  compact?: boolean;
};

export function GlobalSearchForm({
  defaultValue = "",
  actionPath = "/dashboard/search",
  compact = false,
}: Props) {
  return (
    <form
      action={actionPath}
      className={compact ? "relative w-full min-w-[220px] max-w-sm" : "relative w-full"}
    >
      <SearchIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        name="q"
        defaultValue={defaultValue}
        placeholder="بحث شامل: رمز تاجر/فرع، متجر، هاتف، رقم محفظة"
        className="pr-9"
      />
    </form>
  );
}
