import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelRight,
  ShoppingCart,
  Calculator,
  Archive,
  Users,
  Warehouse,
  FileText,
  ClipboardCheck,
  UserCog,
  Truck,
  Megaphone,
  Settings,
  Menu,
  MoreHorizontal,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

const menuItems = [
  { icon: LayoutDashboard, label: "لوحة التحكم", path: "/" },
  { icon: ShoppingCart, label: "الطلبات", path: "/orders" },
  { icon: Calculator, label: "التسعير", path: "/pricing" },
  { icon: Archive, label: "التسعيرات المحفوظة", path: "/quotes" },
  { icon: Users, label: "العملاء", path: "/customers" },
  { icon: Truck, label: "الموردين", path: "/suppliers" },
  { icon: Warehouse, label: "المخازن", path: "/inventory" },
  { icon: FileText, label: "الحسابات", path: "/finance" },
  { icon: ClipboardCheck, label: "الجودة", path: "/quality" },
  { icon: UserCog, label: "الموظفين", path: "/employees" },
  { icon: Megaphone, label: "التسويق", path: "/marketing" },
  { icon: Settings, label: "الإعدادات", path: "/settings" },
];

// Bottom nav shows first 4 items + "more" button
const bottomNavItems = menuItems.slice(0, 4);

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 px-4">
        <div className="flex flex-col items-center gap-6 sm:gap-8 p-6 sm:p-10 max-w-md w-full bg-card rounded-2xl shadow-xl border">
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden">
              <img src="https://d2xsxph8kpxj0f.cloudfront.net/90947905/nZ3PMMgYbyq8w7M3TYvKBC/almesbahi-logo_da919f70.jpg" alt="المصباحي" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-center font-heading">
              المصباحي للطباعة والتغليف
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
              نظام الإدارة المتكامل - يرجى تسجيل الدخول للمتابعة
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all text-base font-semibold"
          >
            تسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const activeMenuItem = menuItems.find((item) => {
    if (item.path === "/") return location === "/";
    return location.startsWith(item.path);
  });
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarRect = sidebarRef.current?.getBoundingClientRect();
      if (!sidebarRect) return;
      const newWidth = sidebarRect.right - e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const getRoleBadge = (role?: string) => {
    const roleMap: Record<string, string> = {
      admin: "مدير عام",
      sales: "منسق مبيعات",
      production: "منسق إنتاج",
      designer: "مصمم",
      technician: "فني",
      user: "مستخدم",
    };
    return roleMap[role || "user"] || "مستخدم";
  };

  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="relative hidden md:block" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-l-0 border-r"
          side="right"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="تبديل القائمة"
              >
                <PanelRight className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <img src="https://d2xsxph8kpxj0f.cloudfront.net/90947905/nZ3PMMgYbyq8w7M3TYvKBC/almesbahi-logo_da919f70.jpg" alt="المصباحي" className="h-8 w-8 rounded-lg object-cover" />
                  <span className="font-bold tracking-tight truncate text-primary font-heading text-sm">
                    المصباحي
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-2">
            <SidebarMenu className="px-2 py-1 gap-0.5">
              {menuItems.map((item) => {
                const isActive =
                  item.path === "/"
                    ? location === "/"
                    : location.startsWith(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-medium text-sm`}
                    >
                      <item.icon
                        className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-right group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0 bg-primary/10">
                    <AvatarFallback className="text-xs font-bold text-primary bg-primary/10">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-semibold truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {getRoleBadge(user?.role)}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="ml-2 h-4 w-4" />
                  <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className={isMobile ? "!mr-0" : ""}>
        {/* Mobile Top Header */}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <img src="https://d2xsxph8kpxj0f.cloudfront.net/90947905/nZ3PMMgYbyq8w7M3TYvKBC/almesbahi-logo_da919f70.jpg" alt="المصباحي" className="h-8 w-8 rounded-lg object-cover" />
              <span className="font-bold text-primary font-heading text-sm">
                المصباحي
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {activeMenuItem?.label ?? "القائمة"}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                  <span className="text-xs font-bold text-primary">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{getRoleBadge(user?.role)}</p>
                </div>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="ml-2 h-4 w-4" />
                  <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Main Content - add bottom padding on mobile for bottom nav */}
        <main className={`flex-1 p-3 sm:p-4 md:p-6 ${isMobile ? "pb-20" : ""}`}>
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t safe-area-bottom">
            <div className="flex items-center justify-around h-16 px-1">
              {bottomNavItems.map((item) => {
                const isActive =
                  item.path === "/"
                    ? location === "/"
                    : location.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-colors min-w-[60px] ${
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground active:text-foreground"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                    <span className={`text-[10px] font-medium ${isActive ? "text-primary" : ""}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
              {/* More button */}
              <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
                <SheetTrigger asChild>
                  <button
                    className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-colors min-w-[60px] ${
                      menuItems.slice(4).some((item) =>
                        item.path === "/" ? location === "/" : location.startsWith(item.path)
                      )
                        ? "text-primary"
                        : "text-muted-foreground active:text-foreground"
                    }`}
                  >
                    <MoreHorizontal className="w-5 h-5" />
                    <span className="text-[10px] font-medium">المزيد</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8">
                  <SheetHeader className="pb-2">
                    <SheetTitle className="font-heading text-base">القائمة</SheetTitle>
                  </SheetHeader>
                  <div className="grid grid-cols-4 gap-3 mt-2">
                    {menuItems.slice(4).map((item) => {
                      const isActive =
                        item.path === "/"
                          ? location === "/"
                          : location.startsWith(item.path);
                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            setLocation(item.path);
                            setMoreSheetOpen(false);
                          }}
                          className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted active:bg-muted text-foreground"
                          }`}
                        >
                          <item.icon className="w-6 h-6" />
                          <span className="text-xs font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </nav>
        )}
      </SidebarInset>
    </>
  );
}
