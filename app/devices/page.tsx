"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"success" | "error">("success");

  useEffect(() => {
    loadDevices();
  }, []);

  function showMessage(
    text: string,
    type: "success" | "error" = "success"
  ) {
    setMessage(text);
    setMessageType(type);

    setTimeout(() => {
      setMessage("");
    }, 3500);
  }

  async function loadDevices() {
    const { data, error } = await supabase
      .from("devices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showMessage(error.message, "error");
    } else {
      setDevices(data || []);
    }

    setLoading(false);
  }

  async function deleteDevice(id: string) {
    const confirmed = window.confirm(
      "Delete this device?\n\nAll maintenance records linked to this device will also be deleted."
    );

    if (!confirmed) return;

    const { error: maintenanceError } = await supabase
      .from("maintenance")
      .delete()
      .eq("device_id", id);

    if (maintenanceError) {
      showMessage(
        `Could not delete maintenance records: ${maintenanceError.message}`,
        "error"
      );
      return;
    }

    const { error } = await supabase
      .from("devices")
      .delete()
      .eq("id", id);

    if (error) {
      showMessage(error.message, "error");
      return;
    }

    setDevices((current) =>
      current.filter((device) => device.id !== id)
    );

    showMessage("Device deleted successfully.");
  }

  function getPPMStatus(device: any) {
    if (!device.next_ppm_date) {
      return {
        text: "No Schedule",
        color: "bg-gray-100 text-gray-700",
        days: null,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const next = new Date(
      `${device.next_ppm_date}T00:00:00`
    );
    next.setHours(0, 0, 0, 0);

    const difference =
      next.getTime() - today.getTime();

    const days = Math.round(
      difference / (1000 * 60 * 60 * 24)
    );

    if (days < 0) {
      return {
        text: `Overdue ${Math.abs(days)} day(s)`,
        color: "bg-red-100 text-red-700",
        days,
      };
    }

    if (days === 0) {
      return {
        text: "Due Today",
        color: "bg-red-100 text-red-700",
        days,
      };
    }

    if (days <= 30) {
      return {
        text: `Due in ${days} day(s)`,
        color: "bg-yellow-100 text-yellow-700",
        days,
      };
    }

    return {
      text: `OK (${days} day(s))`,
      color: "bg-green-100 text-green-700",
      days,
    };
  }

  const filtered = devices.filter((device) => {
    const q = search.toLowerCase();

    const matchesSearch =
      `${device.serial_number ?? ""} ${
        device.asset_number ?? ""
      } ${device.model ?? ""} ${
        device.hospital ?? ""
      }`
        .toLowerCase()
        .includes(q);

    const matchesStatus =
      statusFilter === "All" ||
      device.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function exportToExcel() {
    const headers = [
      "Serial Number",
      "Asset Number",
      "Model",
      "Hospital",
      "Status",
      "Installation Date",
      "Last PPM Date",
      "Next PPM Date",
      "PPM Status",
    ];

    const rows = filtered.map((device) => {
      const ppm = getPPMStatus(device);

      return [
        device.serial_number || "",
        device.asset_number || "",
        device.model || "",
        device.hospital || "",
        device.status || "",
        device.installation_date || "",
        device.last_ppm_date || "",
        device.next_ppm_date || "",
        ppm.text,
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `medical-devices-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    showMessage("Excel file exported successfully.");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl font-semibold">
          Loading Devices...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">

        {message && (
          <div
            className={`mb-5 rounded-xl px-5 py-4 font-medium ${
              messageType === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <Link
              href="/"
              className="text-blue-600 hover:underline"
            >
              ← Dashboard
            </Link>

            <h1 className="text-3xl font-bold mt-2">
              Medical Devices
            </h1>

            <p className="text-gray-500 mt-1">
              Manage devices and monitor PPM schedules
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl"
            >
              Export Excel
            </button>

            <Link
              href="/add-device"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
            >
              + Add Device
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5 mb-6">
          <div className="grid md:grid-cols-4 gap-4">

            <input
              type="text"
              placeholder="Search Serial / Asset / Model / Hospital..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="md:col-span-3 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className="border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">
                All Status
              </option>

              <option value="Working">
                Working
              </option>

              <option value="Maintenance">
                Maintenance
              </option>

              <option value="Out of Service">
                Out of Service
              </option>
            </select>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Showing {filtered.length} of {devices.length} devices
          </p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
          <table className="min-w-[1100px] w-full">

            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-left">
                  Serial
                </th>

                <th className="p-4 text-left">
                  Asset
                </th>

                <th className="p-4 text-left">
                  Model
                </th>

                <th className="p-4 text-left">
                  Hospital
                </th>

                <th className="p-4 text-left">
                  Status
                </th>

                <th className="p-4 text-left">
                  PPM Status
                </th>

                <th className="p-4 text-left">
                  Next PPM
                </th>

                <th className="p-4 text-left">
                  Installation
                </th>

                <th className="p-4 text-left">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-10 text-center text-gray-500"
                  >
                    No devices found.
                  </td>
                </tr>
              ) : (
                filtered.map((device) => {
                  const ppm =
                    getPPMStatus(device);

                  return (
                    <tr
                      key={device.id}
                      className="border-t hover:bg-gray-50"
                    >
                      <td className="p-4 font-semibold">
                        {device.serial_number || "-"}
                      </td>

                      <td className="p-4">
                        {device.asset_number || "-"}
                      </td>

                      <td className="p-4">
                        {device.model || "-"}
                      </td>

                      <td className="p-4">
                        {device.hospital || "-"}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            device.status === "Working"
                              ? "bg-green-100 text-green-700"
                              : device.status ===
                                "Maintenance"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {device.status ||
                            "Unknown"}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${ppm.color}`}
                        >
                          {ppm.text}
                        </span>
                      </td>

                      <td className="p-4 font-medium whitespace-nowrap">
                        {device.next_ppm_date || "-"}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        {device.installation_date ||
                          "-"}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">

                          <Link
                            href={`/devices/${device.id}`}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg"
                          >
                            View
                          </Link>

                          <Link
                            href={`/devices/${device.id}/edit`}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg"
                          >
                            Edit
                          </Link>

                          <button
                            onClick={() =>
                              deleteDevice(device.id)
                            }
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg"
                          >
                            Delete
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

          </table>
        </div>
      </div>
    </main>
  );
}