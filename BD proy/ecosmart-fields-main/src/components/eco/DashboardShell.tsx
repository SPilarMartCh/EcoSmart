import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Sprout,
  Droplets,
  Activity,
  CloudSun,
  History,
  Cpu,
  Settings,
  Menu,
  Leaf,
  Wifi,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "./DemoBadge";
import { demoUser } from "@/lib/types";
import { useSystemStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/cultivos", label: "Mis cultivos", icon: Sprout },
  { to: "/dashboard/riego", label: "Riego", icon: Droplets },
  { to: "/dashboard/monitoreo", label: "Monitoreo", icon: Activity },
  { to: "/dashboard/clima", label: "Clima", icon: CloudSun },
  { to: "/dashboard/historial", label: "Historial", icon: History },
  { to: "/dashboard/sensores", label: "Sensores", icon: Cpu },
  { to: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => (
        <Link
          key={item.to}
          to={item.to as "/dashboard"}
          onClick={onNavigate}
          activeOptions={{ exact: item.exact ?? false }}
          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-primary data-[status=active]:text-sidebar-primary-foreground"
        >
          <item.icon className="h-[18px] w-[18px]" aria-hidden />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const status = useSystemStatus();
  return (
    <div className="flex h-full flex-col bg-sidebar px-4 py-5 text-sidebar-foreground">
      <Link to="/" className="mb-6 flex items-center gap-2.5 px-2" onClick={onNavigate}>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
          <Leaf className="h-5 w-5" aria-hidden />
        </span>
        <span className="text-lg font-semibold tracking-tight">EcoSmart</span>
      </Link>
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-auto space-y-3 pt-6">
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-3 text-xs">
          <p className="font-medium text-sidebar-accent-foreground">Estado del sistema</p>
          <p className="mt-1 text-sidebar-foreground/70">{status.mode}</p>
          <p className="text-sidebar-foreground/70">{status.device}</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground">
            PM
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{demoUser.full_name}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">{demoUser.farm_name}</p>
          </div>
          <Link to="/auth" aria-label="Cerrar sesión" className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <LogOut className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = nav.find((n) => (n.exact ? pathname === n.to : pathname.startsWith(n.to)));
  const status = useSystemStatus();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <SidebarContent />
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-0 p-0">
              <SheetTitle className="sr-only">Navegación</SheetTitle>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <p className={cn("text-sm font-semibold sm:text-base")}>{current?.label ?? "Dashboard"}</p>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
              <Wifi className="h-3.5 w-3.5 text-primary" aria-hidden />
              {status.internet}
            </span>
            <DemoBadge label="Login demo" />
          </div>
        </header>
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
