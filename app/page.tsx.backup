"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const { data: devicesData, error: devicesError } =
        await supabase
          .from("devices")
          .select("*")
          .order("created_at", { ascending: false });

      const { data: maintenanceData, error: maintenanceError } =
        await supabase
          .from("maintenance")
          .select("*")
          .order("visit_date", { ascending: false });

      if (devicesError) {
        console.error(devicesError);
      }

      if (maintenanceError) {
        console.error(maintenanceError);
      }

      setDevices(devicesData || []);
      setMaintenance(maintenanceData || []);
      setLoading(false);
    }

    loadDashboard();
  }, []);

  const totalDevices = devices.length;

  const working = devices.filter(
    (device) => device.status === "Working"
  ).length;

  const underMaintenance = devices.filter(
    (device) => device.status === "Maintenance"
  ).length;

  const outOfService = devices.filter(
    (device) => device.status === "Out of Service"
  ).length;

  const completed = maintenance.filter(
    (item) => item.status === "Completed"
  ).length;

  const pending = maintenance.filter(
    (item) => item.status === "Pending"
  ).length;

  const inProgress = maintenance.filter(
    (item) => item.status === "In Progress"
  ).length;

  const recentMaintenance = maintenance.slice(0, 5);

  const deviceChartData = [
    {
      name: "Working",
      value: working,
      color: "#16a34a",
    },
    {
      name: "Maintenance",
      value: underMaintenance,
      color: "#eab308",
    },
    {
      name: "Out of Service",
      value: outOfService,
      color: "#dc2626",
    },
  ];

  const maintenanceChartData = [
    {
      name: "Completed",
      count: completed,
    },
    {
      name: "In Progress",
      count: inProgress,
    },
    {
      name: "Pending",
      count: pending,
    },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-xl font-semibold">
          Loading Dashboard...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-5 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              Medical Device Management
            </h1>

            <p className="text-gray-500 mt-2">
              Devices, maintenance and asset tracking dashboard
            </p>
          </div>

          <div className="flex flex-wrap gap-3 print:hidden">
            <Link
              href="/devices"
              className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-3 rounded-xl font-medium"
            >
              Devices
            </Link>

            <Link
              href="/add-device"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium"
            >
              + Add Device
            </Link>

            <button
              onClick={() => window.print()}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl font-medium"
            >
              Print Dashboard
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 font-medium">
                  Total Devices
                </p>

                <p className="text-4xl font-bold mt-3">
                  {totalDevices}
                </p>
              </div>

              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold">
                D
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 font-medium">
                  Working
                </p>

                <p className="text-4xl font-bold text-green-600 mt-3">
                  {working}
                </p>
              </div>

              <div className="w-12 h-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center text-xl font-bold">
                ✓
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 font-medium">
                  Under Maintenance
                </p>

                <p className="text-4xl font-bold text-yellow-600 mt-3">
                  {underMaintenance}
                </p>
              </div>

              <div className="w-12 h-12 rounded-xl bg-yellow-100 text-yellow-700 flex items-center justify-center text-xl font-bold">
                M
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 font-medium">
                  Maintenance Records
                </p>

                <p className="text-4xl font-bold text-purple-600 mt-3">
                  {maintenance.length}
                </p>
              </div>

              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-bold">
                R
              </div>
            </div>
          </div>

        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">

          {/* Pie Chart */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="text-xl font-bold">
              Device Status
            </h2>

            <p className="text-sm text-gray-500 mt-1 mb-4">
              Distribution of registered devices
            </p>

            <div className="h-[320px]">
              {totalDevices === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No device data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={4}
                    >
                      {deviceChartData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color}
                        />
                      ))}
                    </Pie>

                    <Tooltip />

                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="text-xl font-bold">
              Maintenance Status
            </h2>

            <p className="text-sm text-gray-500 mt-1 mb-4">
              Current maintenance record status
            </p>

            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maintenanceChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                  />

                  <YAxis allowDecimals={false} />

                  <Tooltip />

                  <Bar
                    dataKey="count"
                    fill="#2563eb"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Maintenance Summary */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">

          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <p className="text-green-700 font-medium">
              Completed Maintenance
            </p>

            <p className="text-3xl font-bold text-green-700 mt-2">
              {completed}
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
            <p className="text-yellow-700 font-medium">
              In Progress
            </p>

            <p className="text-3xl font-bold text-yellow-700 mt-2">
              {inProgress}
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <p className="text-red-700 font-medium">
              Pending
            </p>

            <p className="text-3xl font-bold text-red-700 mt-2">
              {pending}
            </p>
          </div>

        </div>

        {/* Recent Maintenance */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-6 border-b">
            <div>
              <h2 className="text-xl font-bold">
                Recent Maintenance
              </h2>

              <p className="text-gray-500 text-sm mt-1">
                Latest maintenance activity
              </p>
            </div>

            <Link
              href="/devices"
              className="text-blue-600 hover:underline font-medium print:hidden"
            >
              Browse Devices →
            </Link>
          </div>

          {recentMaintenance.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No maintenance records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[700px] w-full">
                <thead className="bg-slate-50">
                  <tr>
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
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {recentMaintenance.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t hover:bg-gray-50"
                    >
                      <td className="p-4">
                        {item.visit_date || "-"}
                      </td>

                      <td className="p-4">
                        {item.engineer || "-"}
                      </td>

                      <td className="p-4">
                        {item.maintenance_type || "-"}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Navigation */}
        <div className="grid md:grid-cols-2 gap-6 mt-8 print:hidden">
          <Link
            href="/devices"
            className="bg-white border shadow-sm rounded-2xl p-6 hover:border-blue-400 hover:shadow-md transition"
          >
            <h3 className="text-xl font-bold">
              Medical Devices
            </h3>

            <p className="text-gray-500 mt-2">
              View, search, edit and export devices.
            </p>

            <p className="text-blue-600 font-semibold mt-4">
              Open Devices →
            </p>
          </Link>

          <Link
            href="/add-device"
            className="bg-white border shadow-sm rounded-2xl p-6 hover:border-blue-400 hover:shadow-md transition"
          >
            <h3 className="text-xl font-bold">
              Register Device
            </h3>

            <p className="text-gray-500 mt-2">
              Add a new medical device to the system.
            </p>

            <p className="text-blue-600 font-semibold mt-4">
              Add Device →
            </p>
          </Link>
        </div>

      </div>
    </main>
  );
}