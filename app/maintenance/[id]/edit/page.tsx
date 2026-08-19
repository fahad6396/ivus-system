"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function EditMaintenancePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [deviceId, setDeviceId] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [engineer, setEngineer] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("Preventive");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Completed");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadMaintenance() {
      const { data, error } = await supabase
        .from("maintenance")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      setDeviceId(data.device_id || "");
      setVisitDate(data.visit_date || "");
      setEngineer(data.engineer || "");
      setMaintenanceType(data.maintenance_type || "Preventive");
      setDescription(data.description || "");
      setStatus(data.status || "Completed");
      setAttachments(data.attachments || []);

      setLoading(false);
    }

    if (id) {
      loadMaintenance();
    }
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const newFiles: string[] = [];

    if (files) {
      for (const file of Array.from(files)) {
        const fileName = `${deviceId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("maintenance-files")
          .upload(fileName, file);

        if (uploadError) {
          setSaving(false);
          alert(uploadError.message);
          return;
        }

        const { data } = supabase.storage
          .from("maintenance-files")
          .getPublicUrl(fileName);

        newFiles.push(data.publicUrl);
      }
    }

    const { error } = await supabase
      .from("maintenance")
      .update({
        visit_date: visitDate,
        engineer: engineer.trim(),
        maintenance_type: maintenanceType,
        description: description.trim(),
        status,
        attachments: [...attachments, ...newFiles],
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push(`/devices/${deviceId}`);
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-xl font-semibold">
          Loading Maintenance...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/devices/${deviceId}`}
          className="text-blue-600 hover:underline"
        >
          ← Back to Device
        </Link>

        <div className="bg-white rounded-2xl shadow p-6 md:p-8 mt-5">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">
              Edit Maintenance
            </h1>

            <p className="text-gray-500 mt-1">
              Update maintenance information and attachments
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-semibold mb-2">
                Visit Date
              </label>

              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="w-full border rounded-lg p-3"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Engineer
              </label>

              <input
                type="text"
                value={engineer}
                onChange={(e) => setEngineer(e.target.value)}
                className="w-full border rounded-lg p-3"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Maintenance Type
              </label>

              <select
                value={maintenanceType}
                onChange={(e) =>
                  setMaintenanceType(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              >
                <option value="Preventive">Preventive</option>
                <option value="Corrective">Corrective</option>
                <option value="Inspection">Inspection</option>
                <option value="Calibration">Calibration</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Description
              </label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Status
              </label>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border rounded-lg p-3"
              >
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>

            {attachments.length > 0 && (
              <div>
                <label className="block font-semibold mb-2">
                  Current Files
                </label>

                <div className="space-y-2">
                  {attachments.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-600 hover:underline"
                    >
                      View File {index + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold mb-2">
                Add More Files
              </label>

              <input
                type="file"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="w-full"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <Link
                href={`/devices/${deviceId}`}
                className="flex-1 text-center bg-gray-200 hover:bg-gray-300 py-3 rounded-lg font-semibold"
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