"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ActivityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setLogs(data || []);
    }

    setLoading(false);
  }

  function formatDate(value: string) {
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
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-xl font-semibold">
          Loading Activity Log...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-5 md:p-8">
      <div className="max-w-7xl mx-auto">

        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 hover:underline"
          >
            ← Back to Dashboard
          </Link>

          <h1 className="text-3xl font-bold mt-3">
            Activity Log
          </h1>

          <p className="text-gray-500 mt-1">
            Complete history of user activity
          </p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

          {logs.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No activity records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-4 text-left">
                      Date & Time
                    </th>

                    <th className="p-4 text-left">
                      User
                    </th>

                    <th className="p-4 text-left">
                      Action
                    </th>

                    <th className="p-4 text-left">
                      Record Type
                    </th>

                    <th className="p-4 text-left">
                      Description
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-t hover:bg-gray-50"
                    >
                      <td className="p-4 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>

                      <td className="p-4 font-medium text-blue-700">
                        {log.user_email || "-"}
                      </td>

                      <td className="p-4">
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                          {log.action || "-"}
                        </span>
                      </td>

                      <td className="p-4">
                        {log.record_type || "-"}
                      </td>

                      <td className="p-4">
                        {log.description || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}