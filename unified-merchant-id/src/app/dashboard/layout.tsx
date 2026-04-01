import Link from "next/link";
import { Building2, Home, Search, Store, UserCircle2 } from "lucide-react";
import { requireAdminSession } from "@/lib/auth";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { GlobalSearchForm } from "@/components/dashboard/global-search-form";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireAdminSession();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Store className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                نظام إداري تشغيلي داخلي
              </p>
              <h1 className="text-lg font-semibold">Unified Merchant ID</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GlobalSearchForm />
            <div className="hidden items-center gap-1 rounded-lg border bg-background px-3 py-2 text-sm md:flex">
              <UserCircle2 className="size-4 text-muted-foreground" />
              <span>{admin.username}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[250px_1fr]">
        <aside className="rounded-xl border bg-background p-3">
          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
            >
              <Home className="size-4" />
              <span>الرئيسية</span>
            </Link>
            <Link
              href="/dashboard/merchants"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
            >
              <Building2 className="size-4" />
              <span>التجار</span>
            </Link>
            <Link
              href="/dashboard/search"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
            >
              <Search className="size-4" />
              <span>البحث الشامل</span>
            </Link>
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
