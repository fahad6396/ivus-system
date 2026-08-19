import type { Metadata } from "next";
import Link from "next/link";
import PPMAlert from "@/components/PPMAlert";
import LogoutButton from "@/components/LogoutButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medical Device Management",
  description:
    "Medical devices and maintenance management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-900">
        <div className="min-h-screen flex flex-col">

          <header className="bg-slate-900 text-white shadow print:hidden">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                <Link href="/">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xl">
                      MD
                    </div>

                    <div>
                      <h1 className="font-bold text-lg">
                        Medical Device Management
                      </h1>

                      <p className="text-xs text-slate-400">
                        Maintenance & Asset Tracking
                      </p>
                    </div>
                  </div>
                </Link>

                <nav className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/"
                    className="px-4 py-2 rounded-lg hover:bg-slate-800"
                  >
                    Dashboard
                  </Link>

                  <Link
                    href="/devices"
                    className="px-4 py-2 rounded-lg hover:bg-slate-800"
                  >
                    Devices
                  </Link>

                  <Link
                    href="/ppm"
                    className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg"
                  >
                    PPM Schedule
                  </Link>

                  <Link
                    href="/activity"
                    className="px-4 py-2 rounded-lg hover:bg-slate-800"
                  >
                    Activity Log
                  </Link>

                  <Link
                    href="/add-device"
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
                  >
                    + Add Device
                  </Link>
                  <LogoutButton />
</nav>

              </div>
            </div>
          </header>

          <PPMAlert />

          <div className="flex-1">
            {children}
          </div>

          <footer className="bg-white border-t print:hidden">
            <div className="max-w-7xl mx-auto px-6 py-5">
              <div className="flex flex-col sm:flex-row justify-between gap-2 text-sm text-gray-500">
                <p>Medical Device Management System</p>
                <p>Version 1.0</p>
              </div>
            </div>
          </footer>

        </div>
      </body>
    </html>
  );
}

