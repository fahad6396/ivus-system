"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AddDevicePage() {
  const router = useRouter();

  const [serialNumber, setSerialNumber] = useState("");
  const [assetNumber, setAssetNumber] = useState("");
  const [model, setModel] = useState("");
  const [hospital, setHospital] = useState("");
  const [installationDate, setInstallationDate] = useState("");
  const [status, setStatus] = useState("Working");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("devices").insert({
      serial_number: serialNumber.trim(),
      asset_number: assetNumber.trim(),
      model: model.trim(),
      hospital: hospital.trim(),
      installation_date: installationDate || null,
      status,
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/devices");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="max-w-3xl mx-auto">

        <Link
          href="/devices"
          className="text-blue-600 hover:underline"
        >
          ← Back to Devices
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8 mt-5">
          <div className="mb-7">
            <h1 className="text-3xl font-bold">
              Add New Device
            </h1>

            <p className="text-gray-500 mt-2">
              Register a new medical device in the system
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block font-semibold mb-2">
                Serial Number
              </label>

              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Example: IVUS-10025"
                className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Asset Number
              </label>

              <input
                type="text"
                value={assetNumber}
                onChange={(e) => setAssetNumber(e.target.value)}
                placeholder="Hospital asset number"
                className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Model
              </label>

              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Example: Philips IntraSight"
                className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Hospital
              </label>

              <input
                type="text"
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                placeholder="Hospital name"
                className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block font-semibold mb-2">
                  Installation Date
                </label>

                <input
                  type="date"
                  value={installationDate}
                  onChange={(e) =>
                    setInstallationDate(e.target.value)
                  }
                  className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Working">Working</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Out of Service">
                    Out of Service
                  </option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-xl font-semibold"
              >
                {saving ? "Saving..." : "Save Device"}
              </button>

              <Link
                href="/devices"
                className="flex-1 text-center bg-gray-200 hover:bg-gray-300 py-3 rounded-xl font-semibold"
              >
                Cancel
              </Link>
            </div>

          </form>
        </div>
      </div>
    </main>
  );
}