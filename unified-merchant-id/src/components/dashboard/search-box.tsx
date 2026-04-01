"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { merchantStatusLabel } from "@/lib/format";
import { MERCHANT_STATUSES } from "@/lib/constants";

type SearchBoxProps = {
  basePath?: string;
  query?: string;
  status?: string;
  city?: string;
  cityOptions?: string[];
  compact?: boolean;
};

export function SearchBox({
  basePath,
  query = "",
  status = "all",
  city = "all",
  cityOptions = [],
  compact = false,
}: SearchBoxProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(mutator: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    mutator(next);
    // Any filter/search change should reset list pagination to page 1.
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${basePath ?? ""}?${qs}` : basePath ?? "");
  }

  if (compact) {
    return (
      <div className="relative w-full min-w-[220px] max-w-sm">
        <SearchIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={query}
          placeholder="بحث سريع"
          className="pr-9"
          onChange={(event) => {
            const value = event.target.value.trim();
            updateParams((next) => {
              if (value) {
                next.set("q", value);
              } else {
                next.delete("q");
              }
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={query}
          placeholder="ابحث برمز التاجر، الاسم أو الهاتف"
          className="pr-9"
          onChange={(event) => {
            const value = event.target.value.trim();
            updateParams((next) => {
              if (value) {
                next.set("q", value);
              } else {
                next.delete("q");
              }
            });
          }}
        />
      </div>

      <Select
        defaultValue={status}
        onValueChange={(value) =>
          updateParams((next) => {
            if (value === "all") {
              next.delete("status");
            } else {
              next.set("status", value);
            }
          })
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="الحالة" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">كل الحالات</SelectItem>
          {MERCHANT_STATUSES.map((item) => (
            <SelectItem key={item} value={item}>
              {merchantStatusLabel(item)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={city}
        onValueChange={(value) =>
          updateParams((next) => {
            if (value === "all") {
              next.delete("city");
            } else {
              next.set("city", value);
            }
          })
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="المدينة" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">كل المدن</SelectItem>
          {cityOptions.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
