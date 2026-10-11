"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Activity = {
  id: string;
  action_time: string;
  user_email: string | null;
  action_type: string;
  device_id: string | null;
  device_name: string | null;
  serial_number: string | null;
  hospital_name: string | null;
  city: string | null;
  description: string | null;
  old_value: any;
  new_value: any;
};

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
    UPLOAD_ATTACHMENT: "Uploaded File",
    DELETE_ATTACHMENT: "Deleted File",
  };

  return map[action] || action.replaceAll("_", " ");
}

function actionStyle(action: string) {
  if (action.includes("DELETE"))
    return "bg-red-50 text-red-700 border-red-200";

  if (action.includes("PPM"))
    return "bg-blue-50 text-blue-700 border-blue-200";

  if (action.includes("CM"))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";

  if (action.includes("ADD"))
    return "bg-indigo-50 text-indigo-700 border-indigo-200";

  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");

  const [selected, setSelected] =
    useState<Activity | null>(null);

  async function loadActivities() {
    setLoading(true);

    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .order("action_time", {
        ascending: false,
      });

    if (!error) {
      setActivities(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadActivities();
  }, []);

  const actionTypes = useMemo(() => {
    return Array.from(
      new Set(
        activities.map((item) => item.action_type)
      )
    ).sort();
  }, [activities]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return activities.filter((item) => {
      const matchesAction =
        actionFilter === "All" ||
        item.action_type === actionFilter;

      const text = [
        item.user_email,
        item.device_name,
        item.serial_number,
        item.hospital_name,
        item.city,
        item.description,
        item.action_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesAction &&
        (!q || text.includes(q))
      );
    });
  }, [activities, search, actionFilter]);

  const todayCount = useMemo(() => {
    const today =
      new Date().toISOString().split("T")[0];

    return activities.filter((item) =>
      item.action_time.startsWith(today)
    ).length;
  }, [activities]);

  const usersCount = useMemo(() => {
    return new Set(
      activities
        .map((item) => item.user_email)
        .filter(Boolean)
    ).size;
  }, [activities]);

  const criticalCount = useMemo(() => {
    return activities.filter((item) =>
      item.action_type.includes("DELETE")
    ).length;
  }, [activities]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">

      <div className="max-w-7xl mx-auto px-6 py-8">

        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-6">
          <h1 className="text-3xl font-black">
            Activity Log
          </h1>

          <p className="text-slate-500 mt-1">
            Complete history of all system activities
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-7">

          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Activities
            </p>

            <p className="text-3xl font-black mt-2">
              {activities.length}
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Today
            </p>

            <p className="text-3xl font-black mt-2 text-blue-700">
              {todayCount}
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Active Users
            </p>

            <p className="text-3xl font-black mt-2 text-emerald-700">
              {usersCount}
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Critical Actions
            </p>

            <p className="text-3xl font-black mt-2 text-red-700">
              {criticalCount}
            </p>
          </div>

        </div>

        <div className="bg-white border rounded-3xl shadow-sm mt-6 overflow-hidden">

          <div className="p-5 border-b flex flex-col lg:flex-row gap-4 justify-between">

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search user, device, serial, hospital..."
              className="border rounded-xl px-4 py-3 lg:w-[420px]"
            />

            <select
              value={actionFilter}
              onChange={(e) =>
                setActionFilter(e.target.value)
              }
              className="border rounded-xl px-4 py-3 bg-white"
            >
              <option value="All">
                All Actions
              </option>

              {actionTypes.map((action) => (
                <option
                  key={action}
                  value={action}
                >
                  {actionLabel(action)}
                </option>
              ))}
            </select>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1100px]">

              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4">
                    Date & Time
                  </th>

                  <th className="text-left p-4">
                    User
                  </th>

                  <th className="text-left p-4">
                    Action
                  </th>

                  <th className="text-left p-4">
                    Device
                  </th>

                  <th className="text-left p-4">
                    Hospital
                  </th>

                  <th className="text-left p-4">
                    Description
                  </th>

                  <th className="text-left p-4">
                    Details
                  </th>
                </tr>
              </thead>

              <tbody>

                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-12 text-center text-slate-500"
                    >
                      Loading Activity Log...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-12 text-center text-slate-500"
                    >
                      No activities found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t hover:bg-slate-50"
                    >
                      <td className="p-4 whitespace-nowrap">
                        {new Date(
                          item.action_time
                        ).toLocaleString()}
                      </td>

                      <td className="p-4">
                        {item.user_email || "-"}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex border px-3 py-1 rounded-full text-sm font-semibold ${actionStyle(
                            item.action_type
                          )}`}
                        >
                          {actionLabel(
                            item.action_type
                          )}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold">
                          {item.device_name || "-"}
                        </div>

                        {item.serial_number && (
                          <div className="text-xs text-slate-500 mt-1">
                            SN: {item.serial_number}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <div>
                          {item.hospital_name || "-"}
                        </div>

                        {item.city && (
                          <div className="text-xs text-slate-500 mt-1">
                            {item.city}
                          </div>
                        )}
                      </td>

                      <td className="p-4 max-w-[320px]">
                        {item.description || "-"}
                      </td>

                      <td className="p-4">
                        <button
                          onClick={() =>
                            setSelected(item)
                          }
                          className="text-blue-600 font-bold hover:text-blue-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}

              </tbody>
            </table>

          </div>
        </div>

      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            <div className="p-6 border-b flex justify-between gap-4">

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                  Activity Details
                </p>

                <h2 className="text-2xl font-black mt-1">
                  {actionLabel(
                    selected.action_type
                  )}
                </h2>
              </div>

              <button
                onClick={() =>
                  setSelected(null)
                }
                className="text-2xl text-slate-500"
              >
                ×
              </button>

            </div>

            <div className="p-6 space-y-5">

              <div className="grid sm:grid-cols-2 gap-4">

                <div>
                  <p className="text-xs text-slate-500 uppercase">
                    Time
                  </p>
                  <p className="font-semibold mt-1">
                    {new Date(
                      selected.action_time
                    ).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase">
                    User
                  </p>
                  <p className="font-semibold mt-1">
                    {selected.user_email || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase">
                    Device
                  </p>
                  <p className="font-semibold mt-1">
                    {selected.device_name || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase">
                    Serial
                  </p>
                  <p className="font-semibold mt-1">
                    {selected.serial_number || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase">
                    Hospital
                  </p>
                  <p className="font-semibold mt-1">
                    {selected.hospital_name || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase">
                    City
                  </p>
                  <p className="font-semibold mt-1">
                    {selected.city || "-"}
                  </p>
                </div>

              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase">
                  Description
                </p>

                <div className="mt-2 bg-slate-50 border rounded-xl p-4">
                  {selected.description || "-"}
                </div>
              </div>

              {selected.device_id && (
                <Link
                  href={`/devices/${selected.device_id}`}
                  className="inline-flex bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold"
                >
                  Open Device Record
                </Link>
              )}

            </div>

          </div>
        </div>
      )}

    </main>
  );
}
