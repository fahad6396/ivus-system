"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PPMAlert() {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkPPM();
  }, []);

  async function checkPPM() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("devices")
      .select("next_ppm_date");

    if (!data) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const warningDevices = data.filter((device) => {
      if (!device.next_ppm_date) return false;

      const next = new Date(
        `${device.next_ppm_date}T00:00:00`
      );

      const days = Math.round(
        (next.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      return days <= 30;
    });

    if (warningDevices.length > 0) {
      setCount(warningDevices.length);
      setVisible(true);
    }
  }

  if (!visible) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 print:hidden">
      <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <p className="text-yellow-800 font-medium">
          ⚠ {count} device(s) have PPM due soon or overdue.
        </p>

        <div className="flex items-center gap-4">
          <Link
            href="/ppm"
            className="text-blue-700 font-semibold hover:underline"
          >
            View PPM Schedule
          </Link>

          <button
            onClick={() => setVisible(false)}
            className="text-gray-500"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}