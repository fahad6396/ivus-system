"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function EditDevicePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [serialNumber, setSerialNumber] = useState("");
  const [assetNumber, setAssetNumber] = useState("");
  const [model, setModel] = useState("");
  const [hospital, setHospital] = useState("");
  const [installationDate, setInstallationDate] = useState("");
  const [status, setStatus] = useState("Working");

  const [originalDevice, setOriginalDevice] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadDevice() {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      setOriginalDevice(data);

      setSerialNumber(data.serial_number || "");
      setAssetNumber(data.asset_number || "");
      setModel(data.model || "");
      setHospital(data.hospital || "");
      setInstallationDate(data.installation_date || "");
      setStatus(data.status || "Working");

      setLoading(false);
    }

    if (id) {
      loadDevice();
    }
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      alert("You must be signed in.");
      router.push("/login");
      return;
    }

    const changes: string[] = [];

    if (originalDevice.serial_number !== serialNumber.trim()) {
      changes.push(
        `Serial Number: ${originalDevice.serial_number || "-"} → ${serialNumber.trim() || "-"}`
      );
    }

    if (originalDevice.asset_number !== assetNumber.trim()) {
      changes.push(
        `Asset Number: ${originalDevice.asset_number || "-"} → ${assetNumber.trim() || "-"}`
      );
    }

    if (originalDevice.model !== model.trim()) {
      changes.push(
        `Model: ${originalDevice.model || "-"} → ${model.trim() || "-"}`
      );
    }

    if (originalDevice.hospital !== hospital.trim()) {
      changes.push(
        `Hospital: ${originalDevice.hospital || "-"} → ${hospital.trim() || "-"}`
      );
    }

    if (
      (originalDevice.installation_date || "") !==
      (installationDate || "")
    ) {
      changes.push(
        `Installation Date: ${
          originalDevice.installation_date || "-"
        } → ${installationDate || "-"}`
      );
    }

    if (originalDevice.status !== status) {
      changes.push(
        `Status: ${originalDevice.status || "-"} → ${status}`
      );
    }

    if (changes.length === 0) {
      setSaving(false);
      alert("No changes were made.");
      return;
    }

    const { error } = await supabase
      .from("devices")
      .update({
        serial_number: serialNumber.trim(),
        asset_number: assetNumber.trim(),
        model: model.trim(),
        hospital: hospital.trim(),
        installation_date: installationDate || null,
        status,
        updated_by: user.email || user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }

    const { error: logError } = await supabase
      .from("activity_logs")
      .insert({
        user_email: user.email || user.id,
        action: "Edited Device",
        record_type: "Device",
        record_id: id,
        description: `Device ${serialNumber.trim()} | ${changes.join(" | ")}`,
      });

    if (logError) {
      console.error("Activity log error:", logError);
    }

    setSaving(false);

    router.push(`/devices/${id}`);
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-xl font-semibold">
          Loading Device...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/devices/${id}`}
          className="text-blue-600 hover:underline"
        >
          ← Back to Device
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8 mt-5">
          <h1 className="text-3xl font-bold mb-6">
            Edit Device
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-semibold mb-2">
                Serial Number
              </label>

              <input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full border rounded-xl p-3"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Asset Number
              </label>

              <input
                value={assetNumber}
                onChange={(e) => setAssetNumber(e.target.value)}
                className="w-full border rounded-xl p-3"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Model
              </label>

              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full border rounded-xl p-3"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Hospital
              </label>

              <input
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                className="w-full border rounded-xl p-3"
                required
              />
            </div>

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
                className="w-full border rounded-xl p-3"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Status
              </label>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border rounded-xl p-3"
              >
                <option value="Working">Working</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Out of Service">
                  Out of Service
                </option>
              </select>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-xl font-semibold"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <Link
                href={`/devices/${id}`}
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