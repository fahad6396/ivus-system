"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import {
  Activity,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Gauge,
  LogIn,
  Menu,
  MonitorCog,
  Plus,
  Users,
  X,
} from "lucide-react";

import PPMAlert from "@/components/PPMAlert";
import LogoutButton from "@/components/LogoutButton";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: Gauge,
  },
  {
    label: "Devices",
    href: "/devices",
    icon: MonitorCog,
  },
  {
    label: "PPM Management",
    href: "/ppm",
    icon: CalendarDays,
  },
  {
    label: "Hospitals",
    href: "/hospitals",
    icon: Building2,
  },
  {
    label: "Activity Log",
    href: "/activity",
    icon: Activity,
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
  },
  {
    label: "Excel Tools",
    href: "/tools/excel",
    icon: FileSpreadsheet,
  },
];

function activeRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(href + "/");
}

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const sidebarWidth = collapsed
    ? "lg:pl-[92px]"
    : "lg:pl-[270px]";

  return (
    <div className="min-h-screen bg-[#f5f7fb]">

      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden lg:flex fixed inset-y-0 left-0 z-50 flex-col bg-[#0b1830] text-white transition-all duration-300 shadow-2xl ${
          collapsed ? "w-[92px]" : "w-[270px]"
        }`}
      >
        <div className="h-[88px] border-b border-white/10 flex items-center px-4">
          <Link
            href="/"
            className={`flex items-center gap-3 ${
              collapsed ? "justify-center w-full" : ""
            }`}
          >
            <Image
              src="/images/ikar-logo.jpg"
              alt="IKAR Logo"
              width={48}
              height={48}
              className="w-12 h-12 shrink-0 rounded-xl bg-white object-contain p-1"
              priority
            />

            {!collapsed && (
              <div>
                <p className="font-black text-[15px]">
                  IKAR Devices Tracking
                </p>

                <p className="text-[11px] text-slate-400 mt-1">
                  Philips Medical Devices
                </p>
              </div>
            )}
          </Link>
        </div>

        {!collapsed && (
          <div className="px-5 pt-7 pb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Workspace
            </p>
          </div>
        )}

        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = activeRoute(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`relative flex items-center rounded-xl font-bold transition-all duration-200 ${
                  collapsed
                    ? "justify-center px-3 py-3"
                    : "gap-3 px-4 py-3"
                } ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={20} strokeWidth={2} />

                {!collapsed && (
                  <span className="text-sm">
                    {item.label}
                  </span>
                )}

                {active && !collapsed && (
                  <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <Link
            href="/add-device"
            title={collapsed ? "Add Device" : undefined}
            className={`flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-sm transition shadow-lg shadow-blue-950/30 ${
              collapsed
                ? "w-12 h-12 mx-auto"
                : "px-4 py-3"
            }`}
          >
            <Plus size={18} />

            {!collapsed && (
              <span>Add New Device</span>
            )}
          </Link>

          {!collapsed && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white py-3 text-sm font-black transition"
              >
                <LogIn size={17} />
                Login
              </Link>

              <LogoutButton />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mt-3 w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl py-2 transition"
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <>
                <ChevronLeft size={18} />
                <span className="text-xs font-bold">
                  Collapse
                </span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          />

          <aside className="relative h-full w-[290px] bg-[#0b1830] text-white shadow-2xl">
            <div className="h-[76px] px-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image
                  src="/images/ikar-logo.jpg"
                  alt="IKAR Logo"
                  width={56}
                  height={40}
                  className="w-14 h-10 rounded-lg bg-white object-contain p-1"
                  priority
                />

                <div>
                  <p className="font-black">
                    IKAR Devices Tracking
                  </p>

                  <p className="text-[11px] text-slate-400">
                    Philips Medical Devices
                  </p>
                </div>
              </div>

              <button
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center"
              >
                <X size={19} />
              </button>
            </div>

            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold ${
                      activeRoute(pathname, item.href)
                        ? "bg-blue-600"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <Icon size={19} />
                    {item.label}
                  </Link>
                );
              })}

              <Link
                href="/add-device"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 mt-4 bg-blue-600 rounded-xl px-4 py-3 font-black"
              >
                <Plus size={18} />
                Add Device
              </Link>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-700 text-white py-3 font-bold hover:bg-slate-600 transition"
                >
                  <LogIn size={17} />
                  Login
                </Link>

                <div className="min-w-0">
                  <LogoutButton />
                </div>
              </div>
            </nav>
          </aside>
        </div>
      )}

      {/* MAIN */}
      <div
        className={`${sidebarWidth} min-h-screen flex flex-col transition-all duration-300`}
      >
        {/* TOP HEADER */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 print:hidden">
          <div className="h-[80px] px-5 lg:px-8 flex items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center"
              >
                <Menu size={20} />
              </button>

              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">
                  IKAR Devices Tracking
                </p>

                <h2 className="font-black text-slate-900 mt-1">
                  Philips Medical Devices
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/ppm"
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-200 bg-orange-50 text-orange-700 font-black text-sm hover:bg-orange-100 transition"
              >
                <CalendarDays size={17} />
                PPM Schedule
              </Link>

              <Link
                href="/add-device"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-100 transition"
              >
                <Plus size={17} />
                Add Device
              </Link>
            </div>
          </div>
        </header>

        <PPMAlert />

        <div className="flex-1">
          {children}
        </div>

        <footer className="bg-white border-t border-slate-200 print:hidden">
          <div className="px-6 lg:px-8 py-5 flex flex-col sm:flex-row gap-2 justify-between text-xs text-slate-400">
            <span>
              IKAR Devices Tracking
            </span>

            <span>
              Service • PPM • CM • Asset Tracking
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}