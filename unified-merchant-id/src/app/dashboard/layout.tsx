import Link from "next/link";
import { Building2, Home, Store, UserCircle2 } from "lucide-react";
import { requireAdminSession } from "@/lib/auth";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { SearchBox } from "@/components/dashboard/search-box";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireAdminSession();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
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
          <div className="flex items-center gap-2">
            <SearchBox basePath="/dashboard/merchants" />
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
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
