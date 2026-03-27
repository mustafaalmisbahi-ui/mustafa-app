import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import { lazy, Suspense } from "react";
import InstallPrompt from "./components/InstallPrompt";

// Lazy load pages
const Home = lazy(() => import("./pages/Home"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Customers = lazy(() => import("./pages/Customers"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Finance = lazy(() => import("./pages/Finance"));
const Quality = lazy(() => import("./pages/Quality"));
const Employees = lazy(() => import("./pages/Employees"));
const Marketing = lazy(() => import("./pages/Marketing"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const Quotes = lazy(() => import("./pages/Quotes"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">جاري التحميل...</span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/orders" component={Orders} />
          <Route path="/orders/:id" component={OrderDetail} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/quotes" component={Quotes} />
          <Route path="/customers" component={Customers} />
          <Route path="/suppliers" component={Suppliers} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/finance" component={Finance} />
          <Route path="/quality" component={Quality} />
          <Route path="/employees" component={Employees} />
          <Route path="/marketing" component={Marketing} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <InstallPrompt />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
