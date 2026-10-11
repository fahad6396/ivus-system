"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

type Device = {
  id: string;
  device_description: string;
  serial_number: string;
  user_status: string;
  software_version: string | null;
  customer_name: string | null;
  city: string | null;
  installation_date: string | null;
  created_at: string;
  last_ppm_date: string | null;
  next_ppm_date: string | null;
};

type Hospital = {
  id: string;
  hospital_name: string;
  city: string;
  active: boolean;
};

type Activity = {
  id: string;
  action_time: string;
  action_type: string;
  user_email: string | null;
  device_id: string | null;
  device_name: string | null;
  serial_number: string | null;
  hospital_name: string | null;
  description: string | null;
};

function getPPMState(date: string | null) {
  if (!date) return "Not Scheduled";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const next = new Date(date + "T00:00:00");

  const days = Math.ceil(
    (next.getTime() - today.getTime()) /
      86400000
  );

  if (days < 0) return "Overdue";
  if (days <= 30) return "Due Soon";
  return "OK";
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    ADD_DEVICE: "Added Device",
    EDIT_DEVICE: "Edited Device",
    DELETE_DEVICE: "Deleted Device",
    SCHEDULE_PPM: "Scheduled PPM",
    COMPLETE_PPM: "Completed PPM",
    ADD_CM: "Added CM",
    EDIT_CM: "Edited CM",
    DELETE_CM: "Deleted CM",
  };

  return map[action] || action.replaceAll("_", " ");
}

export default function DashboardPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [attachmentCount, setAttachmentCount] =
    useState(0);

  const [cmCount, setCmCount] = useState(0);

  const [loading, setLoading] = useState(true);

  const [deviceFilter, setDeviceFilter] =
    useState("All");

  const [customerFilter, setCustomerFilter] =
    useState("All");

  const [cityFilter, setCityFilter] =
    useState("All");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [
          devicesResult,
          hospitalsResult,
          attachmentsResult,
          cmResult,
          activityResult,
        ] = await Promise.all([
          supabase
            .from("devices_v2")
            .select("*")
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("hospitals")
            .select(
              "id, hospital_name, city, active"
            )
            .eq("active", true),

          supabase
            .from("device_attachments")
            .select("*", {
              count: "exact",
              head: true,
            }),

          supabase
            .from("cm_history")
            .select("*", {
              count: "exact",
              head: true,
            }),

          supabase
            .from("activity_log")
            .select(
              `
              id,
              action_time,
              action_type,
              user_email,
              device_id,
              device_name,
              serial_number,
              hospital_name,
              description
              `
            )
            .order("action_time", {
              ascending: false,
            })
            .limit(8),
        ]);

        if (devicesResult.error)
          throw devicesResult.error;

        setDevices(devicesResult.data || []);
        setHospitals(
          hospitalsResult.data || []
        );

        setAttachmentCount(
          attachmentsResult.count || 0
        );

        setCmCount(cmResult.count || 0);

        setActivities(
          activityResult.data || []
        );
      } catch (error: any) {
        console.error("Dashboard load error:", {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
          full: error,
        });
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const deviceNames = useMemo(
    () =>
      Array.from(
        new Set(
          devices
            .map((d) =>
              d.device_description?.trim()
            )
            .filter(Boolean)
        )
      ).sort(),
    [devices]
  );

  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          hospitals
            .map((h) => h.city?.trim())
            .filter(Boolean)
        )
      ).sort(),
    [hospitals]
  );

  const hospitalsForCity = useMemo(
    () =>
      Array.from(
        new Set(
          hospitals
            .filter(
              (h) =>
                cityFilter === "All" ||
                h.city === cityFilter
            )
            .map((h) => h.hospital_name)
        )
      ).sort(),
    [hospitals, cityFilter]
  );

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();

    return devices.filter((device) => {
      const matchesDevice =
        deviceFilter === "All" ||
        device.device_description ===
          deviceFilter;

      const matchesCity =
        cityFilter === "All" ||
        device.city === cityFilter;

      const matchesHospital =
        customerFilter === "All" ||
        device.customer_name ===
          customerFilter;

      const matchesStatus =
        statusFilter === "All" ||
        device.user_status ===
          statusFilter;

      const searchable = [
        device.device_description,
        device.serial_number,
        device.customer_name,
        device.city,
        device.software_version,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesDevice &&
        matchesCity &&
        matchesHospital &&
        matchesStatus &&
        (!q || searchable.includes(q))
      );
    });
  }, [
    devices,
    deviceFilter,
    cityFilter,
    customerFilter,
    statusFilter,
    search,
  ]);

  const operative = filteredDevices.filter(
    (d) => d.user_status === "Operative"
  ).length;

  const store = filteredDevices.filter(
    (d) => d.user_status === "Store"
  ).length;

  const scrapped = filteredDevices.filter(
    (d) => d.user_status === "Scrapped"
  ).length;

  const overdue = filteredDevices.filter(
    (d) =>
      getPPMState(d.next_ppm_date) ===
      "Overdue"
  ).length;

  const dueSoon = filteredDevices.filter(
    (d) =>
      getPPMState(d.next_ppm_date) ===
      "Due Soon"
  ).length;

  const hospitalCount = new Set(
    filteredDevices
      .map((d) => d.customer_name)
      .filter(Boolean)
  ).size;

  const fleetHealth =
    filteredDevices.length > 0
      ? Math.round(
          (operative /
            filteredDevices.length) *
            100
        )
      : 0;

  const upcomingPPM = useMemo(() => {
    return [...devices]
      .filter((d) => d.next_ppm_date)
      .sort(
        (a, b) =>
          new Date(
            a.next_ppm_date!
          ).getTime() -
          new Date(
            b.next_ppm_date!
          ).getTime()
      )
      .slice(0, 7);
  }, [devices]);

  const cityData = useMemo(() => {
    const map = new Map<string, number>();

    filteredDevices.forEach((device) => {
      const city =
        device.city?.trim() || "Unknown";

      map.set(
        city,
        (map.get(city) || 0) + 1
      );
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredDevices]);

  const hospitalData = useMemo(() => {
    const map = new Map<string, number>();

    filteredDevices.forEach((device) => {
      const hospital =
        device.customer_name?.trim() ||
        "Unknown";

      map.set(
        hospital,
        (map.get(hospital) || 0) + 1
      );
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [filteredDevices]);

  const statusData = [
    {
      name: "Operative",
      value: operative,
      color: "#10b981",
    },
    {
      name: "Store",
      value: store,
      color: "#3b82f6",
    },
    {
      name: "Scrapped",
      value: scrapped,
      color: "#ef4444",
    },
  ];

  const filtersActive =
    deviceFilter !== "All" ||
    cityFilter !== "All" ||
    customerFilter !== "All" ||
    statusFilter !== "All" ||
    !!search.trim();

  function clearFilters() {
    setDeviceFilter("All");
    setCityFilter("All");
    setCustomerFilter("All");
    setStatusFilter("All");
    setSearch("");
  }

  function exportDashboardExcel() {
    const rows = filteredDevices.map(
      (device) => ({
        "Device Description":
          device.device_description,
        "Serial Number":
          device.serial_number,
        Status: device.user_status,
        "Software Version":
          device.software_version || "",
        Hospital:
          device.customer_name || "",
        City: device.city || "",
        "Installation Date":
          device.installation_date || "",
        "Last PPM":
          device.last_ppm_date || "",
        "Next PPM":
          device.next_ppm_date || "",
      })
    );

    const ws =
      XLSX.utils.json_to_sheet(rows);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "Devices"
    );

    XLSX.writeFile(
      wb,
      `Medical-Devices-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );
  }

  if (loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />

          <p className="mt-4 font-bold text-slate-700">
            Loading dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb]">

      <div className="max-w-[1500px] mx-auto px-5 lg:px-8 py-8">

        {/* HERO */}

        <section className="relative overflow-hidden bg-gradient-to-br from-[#102a56] via-[#123b7a] to-[#2563eb] rounded-[32px] shadow-xl shadow-blue-100">

          <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-white/10" />

          <div className="absolute right-40 bottom-[-120px] w-72 h-72 rounded-full bg-blue-300/10" />

          <div className="relative p-7 md:p-10 flex flex-col xl:flex-row gap-8 justify-between">

            <div>
              <p className="text-blue-200 text-xs font-black tracking-[0.2em] uppercase">
                Fleet Command Center
              </p>

              <h1 className="text-3xl md:text-5xl font-black text-white mt-3">
                Medical Device Dashboard
              </h1>

              <p className="text-blue-100 mt-3 max-w-2xl">
                Real-time overview of devices,
                preventive maintenance and service
                activity.
              </p>

              <div className="flex flex-wrap gap-3 mt-7">

                <Link
                  href="/devices"
                  className="bg-white text-blue-800 px-5 py-3 rounded-xl font-black hover:bg-blue-50 transition"
                >
                  Browse Devices
                </Link>

                <Link
                  href="/ppm"
                  className="bg-white/10 border border-white/20 text-white px-5 py-3 rounded-xl font-black hover:bg-white/20 transition"
                >
                  PPM Management
                </Link>

                <button
                  onClick={exportDashboardExcel}
                  className="bg-emerald-500 text-white px-5 py-3 rounded-xl font-black hover:bg-emerald-400 transition"
                >
                  Export Excel
                </button>

              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:min-w-[360px]">

              <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-5">
                <p className="text-blue-200 text-xs font-bold">
                  FLEET HEALTH
                </p>

                <p className="text-white text-4xl font-black mt-2">
                  {fleetHealth}%
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-5">
                <p className="text-blue-200 text-xs font-bold">
                  TOTAL DEVICES
                </p>

                <p className="text-white text-4xl font-black mt-2">
                  {devices.length}
                </p>
              </div>

              <div className="bg-red-500/20 border border-red-300/20 rounded-2xl p-5">
                <p className="text-red-100 text-xs font-bold">
                  PPM OVERDUE
                </p>

                <p className="text-white text-3xl font-black mt-2">
                  {overdue}
                </p>
              </div>

              <div className="bg-orange-400/20 border border-orange-200/20 rounded-2xl p-5">
                <p className="text-orange-100 text-xs font-bold">
                  DUE SOON
                </p>

                <p className="text-white text-3xl font-black mt-2">
                  {dueSoon}
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* KPI CARDS */}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mt-6">

          {[
            ["Devices", filteredDevices.length, "text-blue-700"],
            ["Operative", operative, "text-emerald-600"],
            ["PPM Overdue", overdue, "text-red-600"],
            ["Due Soon", dueSoon, "text-orange-600"],
            ["CM Records", cmCount, "text-violet-600"],
            ["Hospitals", hospitalCount, "text-cyan-700"],
          ].map(([label, value, color]) => (
            <div
              key={String(label)}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
            >
              <p className="text-sm text-slate-500 font-semibold">
                {label}
              </p>

              <p
                className={`text-3xl font-black mt-2 ${color}`}
              >
                {value}
              </p>
            </div>
          ))}

        </div>

        {/* FILTERS */}

        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 mt-6">

          <div className="flex flex-wrap justify-between gap-4">

            <div>
              <h2 className="text-lg font-black">
                Smart Filters
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Dashboard statistics update instantly.
              </p>
            </div>

            {filtersActive && (
              <button
                onClick={clearFilters}
                className="text-red-600 bg-red-50 px-4 py-2 rounded-xl font-bold"
              >
                Clear Filters
              </button>
            )}

          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4 mt-5">

            <select
              value={deviceFilter}
              onChange={(e) =>
                setDeviceFilter(e.target.value)
              }
              className="border border-slate-200 bg-slate-50 rounded-xl px-4 py-3"
            >
              <option value="All">
                All Devices
              </option>

              {deviceNames.map((name) => (
                <option
                  key={name}
                  value={name}
                >
                  {name}
                </option>
              ))}
            </select>

            <select
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                setCustomerFilter("All");
              }}
              className="border border-slate-200 bg-slate-50 rounded-xl px-4 py-3"
            >
              <option value="All">
                All Cities
              </option>

              {cities.map((city) => (
                <option key={city}>
                  {city}
                </option>
              ))}
            </select>

            <select
              value={customerFilter}
              onChange={(e) =>
                setCustomerFilter(
                  e.target.value
                )
              }
              className="border border-slate-200 bg-slate-50 rounded-xl px-4 py-3"
            >
              <option value="All">
                All Hospitals
              </option>

              {hospitalsForCity.map(
                (hospital) => (
                  <option key={hospital}>
                    {hospital}
                  </option>
                )
              )}
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
              className="border border-slate-200 bg-slate-50 rounded-xl px-4 py-3"
            >
              <option value="All">
                All Statuses
              </option>

              <option value="Operative">
                Operative
              </option>

              <option value="Store">
                Store
              </option>

              <option value="Scrapped">
                Scrapped
              </option>
            </select>

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search serial, device..."
              className="border border-slate-200 bg-slate-50 rounded-xl px-4 py-3"
            />

          </div>
        </section>

        {/* MAIN GRID */}

        <div className="grid xl:grid-cols-3 gap-6 mt-6">

          <section className="xl:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">

            <div className="flex justify-between items-start gap-4">

              <div>
                <h2 className="text-xl font-black">
                  Fleet Health
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Current operational status
                </p>
              </div>

              <div className="text-right">
                <p className="text-3xl font-black text-emerald-600">
                  {fleetHealth}%
                </p>

                <p className="text-xs text-slate-400">
                  Operative
                </p>
              </div>

            </div>

            <div className="h-[320px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>

                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={85}
                    outerRadius={125}
                    paddingAngle={4}
                  >
                    {statusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip />

                </PieChart>
              </ResponsiveContainer>

            </div>

          </section>

          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">
                  Upcoming PPM
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Next scheduled services
                </p>
              </div>

              <Link
                href="/ppm"
                className="text-blue-600 font-bold text-sm"
              >
                View All
              </Link>
            </div>

            <div className="space-y-3 mt-5">

              {upcomingPPM.length === 0 ? (
                <p className="text-slate-400 py-8 text-center">
                  No scheduled PPM.
                </p>
              ) : (
                upcomingPPM.map((device) => {

                  const state =
                    getPPMState(
                      device.next_ppm_date
                    );

                  return (
                    <Link
                      href={`/devices/${device.id}`}
                      key={device.id}
                      className="block border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 rounded-2xl p-4 transition"
                    >
                      <div className="flex justify-between gap-3">

                        <div>
                          <p className="font-bold">
                            {
                              device.device_description
                            }
                          </p>

                          <p className="text-xs text-slate-500 mt-1">
                            SN:{" "}
                            {device.serial_number}
                          </p>
                        </div>

                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full h-fit ${
                            state === "Overdue"
                              ? "bg-red-100 text-red-700"
                              : state ===
                                "Due Soon"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {state}
                        </span>

                      </div>

                      <p className="text-sm text-slate-600 mt-3">
                        {device.next_ppm_date}
                      </p>
                    </Link>
                  );
                })
              )}

            </div>

          </section>

        </div>

        {/* CHARTS */}

        <div className="grid xl:grid-cols-2 gap-6 mt-6">

          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">

            <h2 className="text-xl font-black">
              Devices by Hospital
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Top hospitals by installed devices
            </p>

            <div className="h-[340px] mt-5">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={hospitalData}
                >
                  <CartesianGrid
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: "#64748b",
                      fontSize: 10,
                    }}
                    angle={-15}
                    textAnchor="end"
                    height={70}
                  />

                  <YAxis
                    allowDecimals={false}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="count"
                    fill="#2563eb"
                    radius={[8, 8, 0, 0]}
                  />

                </BarChart>
              </ResponsiveContainer>

            </div>

          </section>

          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">

            <h2 className="text-xl font-black">
              Devices by City
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Geographic distribution
            </p>

            <div className="h-[340px] mt-5">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={cityData}
                  layout="vertical"
                >
                  <CartesianGrid
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                    horizontal={false}
                  />

                  <XAxis
                    type="number"
                    allowDecimals={false}
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{
                      fill: "#64748b",
                      fontSize: 11,
                    }}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="count"
                    fill="#8b5cf6"
                    radius={[0, 8, 8, 0]}
                  />

                </BarChart>
              </ResponsiveContainer>

            </div>

          </section>

        </div>

        {/* ACTIVITY + QUICK ACTIONS */}

        <div className="grid xl:grid-cols-3 gap-6 mt-6">

          <section className="xl:col-span-2 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">

            <div className="p-6 border-b border-slate-200 flex justify-between">

              <div>
                <h2 className="text-xl font-black">
                  Recent Activity
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Latest system actions
                </p>
              </div>

              <Link
                href="/activity"
                className="text-blue-600 font-bold text-sm"
              >
                Activity Log
              </Link>

            </div>

            <div className="divide-y divide-slate-100">

              {activities.map((item) => (
                <div
                  key={item.id}
                  className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      {actionLabel(
                        item.action_type
                      )}
                    </p>

                    <p className="text-sm text-slate-500 mt-1">
                      {item.device_name ||
                        item.description ||
                        "-"}
                    </p>

                    {item.serial_number && (
                      <p className="text-xs text-slate-400 mt-1">
                        SN:{" "}
                        {item.serial_number}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(
                      item.action_time
                    ).toLocaleString()}
                  </p>
                </div>
              ))}

            </div>

          </section>

          <section className="bg-[#102a56] text-white rounded-3xl p-6 shadow-lg">

            <p className="text-blue-300 text-xs font-black tracking-[0.15em] uppercase">
              Quick Actions
            </p>

            <h2 className="text-2xl font-black mt-2">
              Service Center
            </h2>

            <div className="space-y-3 mt-6">

              <Link
                href="/add-device"
                className="block bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-3 font-bold"
              >
                + Add Device
              </Link>

              <Link
                href="/ppm"
                className="block bg-white/10 hover:bg-white/15 rounded-xl px-4 py-3 font-bold"
              >
                PPM Management
              </Link>

              <Link
                href="/hospitals"
                className="block bg-white/10 hover:bg-white/15 rounded-xl px-4 py-3 font-bold"
              >
                Hospital Management
              </Link>

              <Link
                href="/tools/excel"
                className="block bg-white/10 hover:bg-white/15 rounded-xl px-4 py-3 font-bold"
              >
                Excel Tools
              </Link>

            </div>

            <div className="border-t border-white/10 mt-6 pt-5">

              <p className="text-blue-200 text-sm">
                Device Attachments
              </p>

              <p className="text-3xl font-black mt-1">
                {attachmentCount}
              </p>

            </div>

          </section>

        </div>

        {/* DEVICES TABLE */}

        <section className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm mt-6">

          <div className="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">

            <div>
              <h2 className="text-xl font-black">
                Current Fleet
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                {filteredDevices.length} matching
                devices
              </p>
            </div>

            <Link
              href="/devices"
              className="text-blue-600 font-bold"
            >
              Open Full Device List →
            </Link>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[950px]">

              <thead className="bg-slate-50">

                <tr>
                  {[
                    "Device",
                    "Serial",
                    "Hospital",
                    "City",
                    "Next PPM",
                    "Status",
                    "",
                  ].map((label) => (
                    <th
                      key={label}
                      className="text-left p-4 text-xs uppercase tracking-wider text-slate-500"
                    >
                      {label}
                    </th>
                  ))}
                </tr>

              </thead>

              <tbody>

                {filteredDevices
                  .slice(0, 8)
                  .map((device) => (
                    <tr
                      key={device.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >

                      <td className="p-4 font-bold">
                        {
                          device.device_description
                        }
                      </td>

                      <td className="p-4 text-slate-600">
                        {device.serial_number}
                      </td>

                      <td className="p-4 text-slate-600">
                        {device.customer_name ||
                          "-"}
                      </td>

                      <td className="p-4 text-slate-600">
                        {device.city || "-"}
                      </td>

                      <td className="p-4">
                        {device.next_ppm_date ||
                          "-"}
                      </td>

                      <td className="p-4">

                        <span
                          className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                            device.user_status ===
                            "Operative"
                              ? "bg-emerald-100 text-emerald-700"
                              : device.user_status ===
                                "Store"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {device.user_status}
                        </span>

                      </td>

                      <td className="p-4">
                        <Link
                          href={`/devices/${device.id}`}
                          className="text-blue-600 font-bold"
                        >
                          View →
                        </Link>
                      </td>

                    </tr>
                  ))}

              </tbody>

            </table>

          </div>

        </section>

      </div>

    </main>
  );
}

