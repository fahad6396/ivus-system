"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  CircleCheck,
  HardDrive,
  MonitorCog,
  Package,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Warehouse,
  Wrench,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";

type Device = {
  id: string;
  device_description: string;
  serial_number: string;
  user_status: string;
  software_version: string | null;
  customer_name: string | null;
  city: string | null;
  installation_date: string | null;
  comment: string | null;
  attachment_url: string | null;
  created_by: string | null;
  created_at: string;
  last_ppm_date: string | null;
  next_ppm_date: string | null;
};

function ppmStatus(nextDate: string | null) {
  if (!nextDate) return "Not Scheduled";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const next = new Date(nextDate + "T00:00:00");

  const days = Math.ceil(
    (next.getTime() - today.getTime()) /
      86400000
  );

  if (days < 0) return "Overdue";
  if (days <= 30) return "Due Soon";

  return "OK";
}

function deviceStatusStyle(value: string) {
  if (value === "Operative") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (value === "Store") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (value === "Scrapped") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

function ppmStyle(value: string) {
  if (value === "OK") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (value === "Due Soon") {
    return "bg-orange-50 text-orange-700 border-orange-200";
  }

  if (value === "Overdue") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-slate-50 text-slate-600 border-slate-200";
}

export default function DevicesPage() {
  const [devices, setDevices] =
    useState<Device[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("All");

  const [ppmFilter, setPpmFilter] =
    useState("All");

  const [cityFilter, setCityFilter] =
    useState("All");

  const [message, setMessage] =
    useState("");

  const [deleteTarget, setDeleteTarget] =
    useState<Device | null>(null);

  const [deleting, setDeleting] =
    useState(false);

  async function loadDevices() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("devices_v2")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.warn("Devices load failed:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
      setMessage(
        error?.message ||
        error?.details ||
        "Unable to load devices."
      );
      setDevices([]);
    } else {
      setDevices(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDevices();
  }, []);

  const cities = useMemo(() => {
    return Array.from(
      new Set(
        devices
          .map((device) =>
            device.city?.trim()
          )
          .filter(Boolean)
      )
    ).sort();
  }, [devices]);

  const filteredDevices = useMemo(() => {
    const term =
      search.toLowerCase().trim();

    return devices.filter((device) => {
      const currentPPM =
        ppmStatus(
          device.next_ppm_date
        );

      const matchesSearch =
        !term ||
        [
          device.serial_number,
          device.device_description,
          device.customer_name,
          device.city,
          device.software_version,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesStatus =
        status === "All" ||
        device.user_status === status;

      const matchesPPM =
        ppmFilter === "All" ||
        currentPPM === ppmFilter;

      const matchesCity =
        cityFilter === "All" ||
        device.city === cityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPPM &&
        matchesCity
      );
    });
  }, [
    devices,
    search,
    status,
    ppmFilter,
    cityFilter,
  ]);

  const operative = devices.filter(
    (device) =>
      device.user_status === "Operative"
  ).length;

  const store = devices.filter(
    (device) =>
      device.user_status === "Store"
  ).length;

  const overdue = devices.filter(
    (device) =>
      ppmStatus(
        device.next_ppm_date
      ) === "Overdue"
  ).length;

  const dueSoon = devices.filter(
    (device) =>
      ppmStatus(
        device.next_ppm_date
      ) === "Due Soon"
  ).length;

  const filtersActive =
    !!search.trim() ||
    status !== "All" ||
    ppmFilter !== "All" ||
    cityFilter !== "All";

  function clearFilters() {
    setSearch("");
    setStatus("All");
    setPpmFilter("All");
    setCityFilter("All");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    setMessage("");

    const device = deleteTarget;

    const { error } = await supabase
      .from("devices_v2")
      .delete()
      .eq("id", device.id);

    if (error) {
      console.warn("Devices load failed:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
      setMessage(
        error?.message ||
        error?.details ||
        "Unable to load devices."
      );
      setDeleting(false);
      return;
    }

    await logActivity({
      action_type: "DELETE_DEVICE",
      device_id: null,
      device_name:
        device.device_description,
      serial_number:
        device.serial_number,
      hospital_name:
        device.customer_name,
      city: device.city,
      description:
        `Deleted device ${device.device_description} (${device.serial_number})`,
      old_value: {
        device_description:
          device.device_description,
        serial_number:
          device.serial_number,
        status:
          device.user_status,
        hospital:
          device.customer_name,
        city:
          device.city,
      },
    });

    setDevices((current) =>
      current.filter(
        (item) =>
          item.id !== device.id
      )
    );

    setDeleteTarget(null);
    setDeleting(false);

    setMessage(
      "Device deleted successfully."
    );
  }

  if (loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center">

        <div className="text-center">

          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />

          <p className="font-bold text-slate-700 mt-4">
            Loading devices...
          </p>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb]">

      <div className="max-w-[1500px] mx-auto px-5 lg:px-8 py-8">

        {/* HERO */}

        <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#102a56] via-[#16468d] to-[#2563eb] shadow-xl shadow-blue-100">

          <div className="absolute -right-20 -top-24 w-80 h-80 bg-white/10 rounded-full" />

          <div className="relative p-7 md:p-9 flex flex-col xl:flex-row xl:items-end justify-between gap-6">

            <div>

              <div className="flex items-center gap-2 text-blue-200">

                <MonitorCog size={18} />

                <p className="text-xs uppercase tracking-[0.2em] font-black">
                  Asset Management
                </p>

              </div>

              <h1 className="text-3xl md:text-4xl font-black text-white mt-3">
                Device Management Center
              </h1>

              <p className="text-blue-100 mt-3 max-w-2xl">
                Manage medical devices, service
                status, PPM schedules and complete
                device records from one place.
              </p>

            </div>

            <div className="flex flex-wrap gap-3">

              <Link
                href="/ppm"
                className="inline-flex items-center gap-2 bg-white/10 border border-white/20 hover:bg-white/20 text-white px-5 py-3 rounded-xl font-bold transition"
              >
                <CalendarDays size={18} />

                PPM Management
              </Link>

              <Link
                href="/add-device"
                className="inline-flex items-center gap-2 bg-white hover:bg-blue-50 text-blue-800 px-5 py-3 rounded-xl font-black transition"
              >
                <Plus size={18} />

                Add Device
              </Link>

            </div>

          </div>

        </section>

        {/* KPIs */}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mt-6">

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

            <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center">
              <HardDrive size={20} />
            </div>

            <p className="text-sm text-slate-500 font-semibold mt-4">
              Total Devices
            </p>

            <p className="text-3xl font-black mt-1">
              {devices.length}
            </p>

          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

            <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
              <CircleCheck size={20} />
            </div>

            <p className="text-sm text-slate-500 font-semibold mt-4">
              Operative
            </p>

            <p className="text-3xl font-black text-emerald-600 mt-1">
              {operative}
            </p>

          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

            <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center">
              <Warehouse size={20} />
            </div>

            <p className="text-sm text-slate-500 font-semibold mt-4">
              Store
            </p>

            <p className="text-3xl font-black text-blue-600 mt-1">
              {store}
            </p>

          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

            <div className="w-10 h-10 bg-red-50 text-red-700 rounded-xl flex items-center justify-center">
              <TriangleAlert size={20} />
            </div>

            <p className="text-sm text-slate-500 font-semibold mt-4">
              PPM Overdue
            </p>

            <p className="text-3xl font-black text-red-600 mt-1">
              {overdue}
            </p>

          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm col-span-2 md:col-span-1">

            <div className="w-10 h-10 bg-orange-50 text-orange-700 rounded-xl flex items-center justify-center">
              <CalendarDays size={20} />
            </div>

            <p className="text-sm text-slate-500 font-semibold mt-4">
              Due Soon
            </p>

            <p className="text-3xl font-black text-orange-600 mt-1">
              {dueSoon}
            </p>

          </div>

        </div>

        {/* FILTER BAR */}

        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm mt-6 p-5">

          <div className="flex flex-col xl:flex-row gap-4">

            <div className="relative flex-1">

              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search device, serial number, hospital, city or software..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 xl:w-[180px]"
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

            <select
              value={ppmFilter}
              onChange={(e) =>
                setPpmFilter(
                  e.target.value
                )
              }
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 xl:w-[180px]"
            >
              <option value="All">
                All PPM
              </option>

              <option value="OK">
                PPM OK
              </option>

              <option value="Due Soon">
                Due Soon
              </option>

              <option value="Overdue">
                Overdue
              </option>

              <option value="Not Scheduled">
                Not Scheduled
              </option>
            </select>

            <select
              value={cityFilter}
              onChange={(e) =>
                setCityFilter(
                  e.target.value
                )
              }
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 xl:w-[180px]"
            >
              <option value="All">
                All Cities
              </option>

              {cities.map((city) => (
                <option
                  key={city}
                  value={city}
                >
                  {city}
                </option>
              ))}
            </select>

            {filtersActive && (
              <button
                onClick={clearFilters}
                className="px-4 py-3 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-bold"
              >
                Clear
              </button>
            )}

          </div>

        </section>

        {message && (
          <div className="mt-5 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl px-5 py-4">
            {message}
          </div>
        )}

        {/* DEVICE TABLE */}

        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mt-6">

          <div className="px-6 py-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">

            <div>

              <h2 className="text-xl font-black">
                Medical Device Fleet
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Showing{" "}
                {filteredDevices.length} of{" "}
                {devices.length} devices
              </p>

            </div>

            <Link
              href="/add-device"
              className="inline-flex items-center gap-2 text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl font-bold"
            >
              <Plus size={17} />

              New Device
            </Link>

          </div>

          {filteredDevices.length === 0 ? (

            <div className="py-20 text-center">

              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <MonitorCog size={28} />
              </div>

              <h3 className="font-black text-lg mt-5">
                No devices found
              </h3>

              <p className="text-slate-500 mt-2">
                Try changing your filters or
                search.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1250px]">

                <thead className="bg-slate-50">

                  <tr>

                    {[
                      "Device",
                      "Serial Number",
                      "Location",
                      "Software",
                      "Device Status",
                      "Last PPM",
                      "Next PPM",
                      "PPM Status",
                      "Actions",
                    ].map((label) => (
                      <th
                        key={label}
                        className="text-left px-5 py-4 text-[11px] uppercase tracking-wider font-black text-slate-500"
                      >
                        {label}
                      </th>
                    ))}

                  </tr>

                </thead>

                <tbody>

                  {filteredDevices.map(
                    (device) => {

                      const currentPPM =
                        ppmStatus(
                          device.next_ppm_date
                        );

                      return (
                        <tr
                          key={device.id}
                          className="border-t border-slate-100 hover:bg-blue-50/30 transition"
                        >

                          <td className="px-5 py-4">

                            <Link
                              href={`/devices/${device.id}`}
                              className="group"
                            >
                              <p className="font-black text-slate-900 group-hover:text-blue-700">
                                {
                                  device.device_description
                                }
                              </p>

                              <p className="text-xs text-slate-400 mt-1">
                                Device Record
                              </p>
                            </Link>

                          </td>

                          <td className="px-5 py-4">

                            <Link
                              href={`/devices/${device.id}`}
                              className="font-bold text-blue-700 hover:underline"
                            >
                              {
                                device.serial_number
                              }
                            </Link>

                          </td>

                          <td className="px-5 py-4">

                            <p className="font-semibold text-slate-700">
                              {device.customer_name ||
                                "-"}
                            </p>

                            <p className="text-xs text-slate-400 mt-1">
                              {device.city || "-"}
                            </p>

                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {device.software_version ||
                              "-"}
                          </td>

                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex border px-3 py-1.5 rounded-full text-xs font-bold ${deviceStatusStyle(
                                device.user_status
                              )}`}
                            >
                              {device.user_status}
                            </span>

                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {device.last_ppm_date ||
                              "-"}
                          </td>

                          <td className="px-5 py-4 font-semibold">
                            {device.next_ppm_date ||
                              "-"}
                          </td>

                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex border px-3 py-1.5 rounded-full text-xs font-black ${ppmStyle(
                                currentPPM
                              )}`}
                            >
                              {currentPPM}
                            </span>

                          </td>

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-2">

                              <Link
                                href={`/devices/${device.id}`}
                                className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-sm font-bold"
                              >
                                Open
                                <ChevronRight
                                  size={15}
                                />
                              </Link>

                              <Link
                                href={`/devices/${device.id}/edit`}
                                className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-2 rounded-xl text-sm font-bold"
                              >
                                <Wrench
                                  size={15}
                                />
                                Edit
                              </Link>

                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget(
                                    device
                                  )
                                }
                                className="w-9 h-9 flex items-center justify-center bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl"
                              >
                                <Trash2
                                  size={16}
                                />
                              </button>

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>

      {/* DELETE MODAL */}

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">

            <div className="p-6 border-b border-slate-200 flex items-start justify-between gap-4">

              <div>

                <div className="w-12 h-12 bg-red-50 text-red-700 rounded-2xl flex items-center justify-center">
                  <Trash2 size={22} />
                </div>

                <h2 className="text-xl font-black mt-4">
                  Delete Device?
                </h2>

              </div>

              <button
                onClick={() =>
                  setDeleteTarget(null)
                }
                disabled={deleting}
                className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X size={18} />
              </button>

            </div>

            <div className="p-6">

              <p className="text-slate-600">
                You are about to permanently
                delete:
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-4">

                <p className="font-black">
                  {
                    deleteTarget.device_description
                  }
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  SN:{" "}
                  {
                    deleteTarget.serial_number
                  }
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  {deleteTarget.customer_name ||
                    "No Hospital"}
                </p>

              </div>

              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mt-4 text-sm">
                This action cannot be undone.
                Related maintenance records may
                also be deleted depending on the
                database relationships.
              </div>

            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">

              <button
                onClick={() =>
                  setDeleteTarget(null)
                }
                disabled={deleting}
                className="border border-slate-300 bg-white px-5 py-2.5 rounded-xl font-bold text-slate-700"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white px-5 py-2.5 rounded-xl font-black"
              >
                {deleting
                  ? "Deleting..."
                  : "Delete Device"}
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}

