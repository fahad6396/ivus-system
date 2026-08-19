"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DevicePage() {
  const params = useParams();
  const id = params.id as string;

  const [device, setDevice] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    const { data: deviceData, error: deviceError } = await supabase
      .from("devices")
      .select("*")
      .eq("id", id)
      .single();

    if (deviceError) {
      console.error(deviceError);
      setLoading(false);
      return;
    }

    const { data: maintenanceData, error: maintenanceError } =
      await supabase
        .from("maintenance")
        .select("*")
        .eq("device_id", id)
        .order("visit_date", { ascending: false });

    if (maintenanceError) {
      console.error(maintenanceError);
    }

    setDevice(deviceData);
    setMaintenance(maintenanceData || []);
    setLoading(false);
  }

  async function deleteMaintenance(maintenanceId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this maintenance record?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("maintenance")
      .delete()
      .eq("id", maintenanceId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMaintenance((current) =>
      current.filter((item) => item.id !== maintenanceId)
    );

    setMessage("Maintenance record deleted successfully.");

    setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  function formatDateTime(value: string | null) {
    if (!value) return "-";

    return new Date(value).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl font-semibold">
          Loading...
        </p>
      </main>
    );
  }

  if (!device) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold">
          Device not found
        </h1>
      </main>
    );
  }

  const statusColor =
    device.status === "Working"
      ? "bg-green-100 text-green-700"
      : device.status === "Maintenance"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8 print:bg-white print:p-0">
      <div className="max-w-7xl mx-auto">

        {message && (
          <div className="mb-5 bg-green-100 border border-green-200 text-green-800 px-5 py-4 rounded-xl print:hidden">
            {message}
          </div>
        )}

        <div className="mb-5 print:hidden">
          <Link
            href="/devices"
            className="text-blue-600 hover:underline"
          >
            ← Back to Devices
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-6">
          <div>
            <h1 className="text-3xl font-bold">
              Device Report
            </h1>

            <p className="text-gray-500 mt-1">
              Medical device information and maintenance history
            </p>
          </div>

          <div className="flex flex-wrap gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl"
            >
              Print / PDF
            </button>

            <Link
              href={`/devices/${id}/edit`}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl"
            >
              Edit Device
            </Link>

            <Link
              href={`/devices/${id}/add`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl"
            >
              + Add Maintenance
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-7 print:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h2 className="text-2xl font-bold">
              Device Information
            </h2>

            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold ${statusColor}`}
            >
              {device.status || "Unknown"}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">

            <div>
              <p className="text-sm text-gray-500">
                Serial Number
              </p>
              <p className="font-semibold mt-1">
                {device.serial_number || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Asset Number
              </p>
              <p className="font-semibold mt-1">
                {device.asset_number || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Model
              </p>
              <p className="font-semibold mt-1">
                {device.model || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Hospital
              </p>
              <p className="font-semibold mt-1">
                {device.hospital || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Installation Date
              </p>
              <p className="font-semibold mt-1">
                {device.installation_date || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Maintenance Records
              </p>
              <p className="font-semibold mt-1">
                {maintenance.length}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Last Updated By
              </p>
              <p className="font-semibold mt-1 text-blue-700">
                {device.updated_by || "No update recorded"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Last Updated At
              </p>
              <p className="font-semibold mt-1">
                {formatDateTime(device.updated_at)}
              </p>
            </div>

          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden print:shadow-none">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold">
              Maintenance History
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              {maintenance.length} maintenance record(s)
            </p>
          </div>

          {maintenance.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No maintenance records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full">

                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-4 text-left">
                      Work Order
                    </th>

                    <th className="p-4 text-left">
                      Date
                    </th>

                    <th className="p-4 text-left">
                      Engineer
                    </th>

                    <th className="p-4 text-left">
                      Type
                    </th>

                    <th className="p-4 text-left">
                      Description
                    </th>

                    <th className="p-4 text-left">
                      Status
                    </th>

                    <th className="p-4 text-left">
                      Files
                    </th>

                    <th className="p-4 text-left">
                      Updated By
                    </th>

                    <th className="p-4 text-left print:hidden">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {maintenance.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t hover:bg-gray-50"
                    >

                      <td className="p-4">
                        {item.work_order_number ? (
                          <span className="font-semibold text-blue-700">
                            {item.work_order_number}
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            -
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        {item.visit_date || "-"}
                      </td>

                      <td className="p-4">
                        {item.engineer || "-"}
                      </td>

                      <td className="p-4">
                        {item.maintenance_type || "-"}
                      </td>

                      <td className="p-4 max-w-xs">
                        {item.description || "-"}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            item.status === "Completed"
                              ? "bg-green-100 text-green-700"
                              : item.status === "In Progress"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.status || "Unknown"}
                        </span>
                      </td>

                      <td className="p-4">
                        {item.attachments?.length > 0 ? (
                          <div className="space-y-1">
                            {item.attachments.map(
                              (url: string, index: number) => (
                                <a
                                  key={index}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-blue-600 hover:underline"
                                >
                                  File {index + 1}
                                </a>
                              )
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">
                            No Files
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <div>
                          <p className="font-medium">
                            {item.updated_by ||
                              item.created_by ||
                              "-"}
                          </p>

                          {(item.updated_at ||
                            item.created_at) && (
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDateTime(
                                item.updated_at ||
                                  item.created_at
                              )}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="p-4 print:hidden">
                        <div className="flex gap-2">

                          <Link
                            href={`/maintenance/${item.id}/edit`}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg"
                          >
                            Edit
                          </Link>

                          <button
                            onClick={() =>
                              deleteMaintenance(item.id)
                            }
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg"
                          >
                            Delete
                          </button>

                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}
        </div>

        <div className="hidden print:block mt-10 border-t pt-4 text-sm text-gray-500">
          <p>
            Medical Device Management System
          </p>

          <p>
            Generated: {new Date().toLocaleDateString()}
          </p>
        </div>

      </div>
    </main>
  );
}