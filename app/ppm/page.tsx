"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PPMPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hospitalFilter, setHospitalFilter] = useState("All");
  const [modelFilter, setModelFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  async function loadDevices() {
    setLoading(true);

    const { data, error } = await supabase
      .from("devices")
      .select("*")
      .order("next_ppm_date", { ascending: true });

    if (error) {
      setMessage(error.message);
    } else {
      setDevices(data || []);
    }

    setLoading(false);
  }

  function getDays(nextDate: string | null) {
    if (!nextDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const next = new Date(`${nextDate}T00:00:00`);
    next.setHours(0, 0, 0, 0);

    return Math.round(
      (next.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }

  function getPPMStatus(device: any) {
    const days = getDays(device.next_ppm_date);

    if (days === null) {
      return {
        key: "none",
        label: "No Schedule",
        color: "bg-gray-100 text-gray-700",
      };
    }

    if (days < 0) {
      return {
        key: "overdue",
        label: `Overdue ${Math.abs(days)} day(s)`,
        color: "bg-red-100 text-red-700",
      };
    }

    if (days === 0) {
      return {
        key: "due",
        label: "Due Today",
        color: "bg-red-100 text-red-700",
      };
    }

    if (days <= 30) {
      return {
        key: "soon",
        label: `Due in ${days} day(s)`,
        color: "bg-yellow-100 text-yellow-700",
      };
    }

    return {
      key: "scheduled",
      label: `${days} day(s) remaining`,
      color: "bg-green-100 text-green-700",
    };
  }

  const hospitals = useMemo(
    () =>
      Array.from(
        new Set(
          devices
            .map((device) => device.hospital)
            .filter(Boolean)
        )
      ).sort(),
    [devices]
  );

  const models = useMemo(
    () =>
      Array.from(
        new Set(
          devices
            .map((device) => device.model)
            .filter(Boolean)
        )
      ).sort(),
    [devices]
  );

  const filtered = devices.filter((device) => {
    const q = search.trim().toLowerCase();

    const matchesSearch =
      !q ||
      `${device.serial_number || ""} ${
        device.asset_number || ""
      } ${device.model || ""} ${device.hospital || ""}`
        .toLowerCase()
        .includes(q);

    const matchesHospital =
      hospitalFilter === "All" ||
      device.hospital === hospitalFilter;

    const matchesModel =
      modelFilter === "All" ||
      device.model === modelFilter;

    return matchesSearch && matchesHospital && matchesModel;
  });

  const overdue = filtered.filter(
    (device) => getPPMStatus(device).key === "overdue"
  );

  const dueToday = filtered.filter(
    (device) => getPPMStatus(device).key === "due"
  );

  const dueSoon = filtered.filter(
    (device) => getPPMStatus(device).key === "soon"
  );

  const scheduled = filtered.filter(
    (device) => getPPMStatus(device).key === "scheduled"
  );

  function addMonths(dateString: string, months: number) {
    const date = new Date(`${dateString}T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + months);

    return date.toISOString().slice(0, 10);
  }

  async function markCompleted(device: any) {
    const confirmed = window.confirm(
      `Mark PPM as completed for ${device.serial_number || "this device"}?`
    );

    if (!confirmed) return;

    setSavingId(device.id);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSavingId(null);
      setMessage("You must be signed in.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const interval = device.ppm_interval_months || 6;
    const nextPPM = addMonths(today, interval);

    const { data: maintenanceData, error: maintenanceError } =
      await supabase
        .from("maintenance")
        .insert({
          device_id: device.id,
          visit_date: today,
          engineer: user.email || user.id,
          maintenance_type: "Preventive",
          description: "Scheduled PPM completed",
          status: "Completed",
          attachments: [],
          created_by: user.email || user.id,
          updated_by: user.email || user.id,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (maintenanceError) {
      setSavingId(null);
      setMessage(maintenanceError.message);
      return;
    }

    const { error: deviceError } = await supabase
      .from("devices")
      .update({
        last_ppm_date: today,
        next_ppm_date: nextPPM,
        updated_by: user.email || user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", device.id);

    if (deviceError) {
      setSavingId(null);
      setMessage(deviceError.message);
      return;
    }

    await supabase.from("activity_logs").insert({
      user_email: user.email || user.id,
      action: "Completed PPM",
      record_type: "Maintenance",
      record_id: maintenanceData.id,
      description:
        `PPM completed for device ${device.serial_number || "-"} | ` +
        `Next PPM: ${nextPPM}`,
    });

    setMessage(
      `PPM completed successfully. Next PPM: ${nextPPM}`
    );

    setSavingId(null);
    await loadDevices();
  }

  function exportPPM() {
    const headers = [
      "Serial Number",
      "Asset Number",
      "Model",
      "Hospital",
      "Last PPM",
      "Next PPM",
      "PPM Status",
    ];

    const rows = filtered.map((device) => [
      device.serial_number || "",
      device.asset_number || "",
      device.model || "",
      device.hospital || "",
      device.last_ppm_date || "",
      device.next_ppm_date || "",
      getPPMStatus(device).label,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `ppm-schedule-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function DeviceTable({
    title,
    devices,
    color,
  }: {
    title: string;
    devices: any[];
    color: string;
  }) {
    return (
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-7">
        <div className={`p-5 border-b ${color}`}>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">
              {title}
            </h2>

            <span className="font-bold">
              {devices.length}
            </span>
          </div>
        </div>

        {devices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No devices in this category.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[950px] w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-4 text-left">Serial</th>
                  <th className="p-4 text-left">Model</th>
                  <th className="p-4 text-left">Hospital</th>
                  <th className="p-4 text-left">Last PPM</th>
                  <th className="p-4 text-left">Next PPM</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {devices.map((device) => {
                  const ppm = getPPMStatus(device);

                  return (
                    <tr
                      key={device.id}
                      className="border-t hover:bg-gray-50"
                    >
                      <td className="p-4 font-semibold">
                        {device.serial_number || "-"}
                      </td>

                      <td className="p-4">
                        {device.model || "-"}
                      </td>

                      <td className="p-4">
                        {device.hospital || "-"}
                      </td>

                      <td className="p-4">
                        {device.last_ppm_date || "-"}
                      </td>

                      <td className="p-4 font-semibold">
                        {device.next_ppm_date || "-"}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${ppm.color}`}
                        >
                          {ppm.label}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex gap-2">
                          <Link
                            href={`/devices/${device.id}`}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg"
                          >
                            View
                          </Link>

                          <button
                            onClick={() =>
                              markCompleted(device)
                            }
                            disabled={savingId === device.id}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg"
                          >
                            {savingId === device.id
                              ? "Saving..."
                              : "Mark PPM Completed"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-xl font-semibold">
          Loading PPM Schedule...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-5 md:p-8">
      <div className="max-w-7xl mx-auto">

        {message && (
          <div className="mb-5 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl p-4">
            {message}
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-7">
          <div>
            <Link
              href="/"
              className="text-blue-600 hover:underline"
            >
              ← Dashboard
            </Link>

            <h1 className="text-3xl font-bold mt-2">
              PPM Schedule
            </h1>

            <p className="text-gray-500 mt-1">
              Preventive maintenance planning and alerts
            </p>
          </div>

          <button
            onClick={exportPPM}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl"
          >
            Export PPM Excel
          </button>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-7">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <p className="text-red-700 font-semibold">
              Overdue
            </p>
            <p className="text-4xl font-bold text-red-700 mt-2">
              {overdue.length}
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <p className="text-red-700 font-semibold">
              Due Today
            </p>
            <p className="text-4xl font-bold text-red-700 mt-2">
              {dueToday.length}
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
            <p className="text-yellow-700 font-semibold">
              Due Within 30 Days
            </p>
            <p className="text-4xl font-bold text-yellow-700 mt-2">
              {dueSoon.length}
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <p className="text-green-700 font-semibold">
              Scheduled
            </p>
            <p className="text-4xl font-bold text-green-700 mt-2">
              {scheduled.length}
            </p>
          </div>
        </div>

        <div className="bg-white border rounded-2xl shadow-sm p-5 mb-7">
          <div className="grid md:grid-cols-3 gap-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search serial / asset / model..."
              className="border rounded-xl px-4 py-3"
            />

            <select
              value={hospitalFilter}
              onChange={(e) =>
                setHospitalFilter(e.target.value)
              }
              className="border rounded-xl px-4 py-3"
            >
              <option value="All">
                All Hospitals
              </option>

              {hospitals.map((hospital) => (
                <option key={hospital} value={hospital}>
                  {hospital}
                </option>
              ))}
            </select>

            <select
              value={modelFilter}
              onChange={(e) =>
                setModelFilter(e.target.value)
              }
              className="border rounded-xl px-4 py-3"
            >
              <option value="All">
                All Models
              </option>

              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DeviceTable
          title="Overdue PPM"
          devices={overdue}
          color="bg-red-50"
        />

        <DeviceTable
          title="Due Today"
          devices={dueToday}
          color="bg-red-50"
        />

        <DeviceTable
          title="Due Soon — Next 30 Days"
          devices={dueSoon}
          color="bg-yellow-50"
        />

        <DeviceTable
          title="Upcoming PPM"
          devices={scheduled}
          color="bg-green-50"
        />

      </div>
    </main>
  );
}