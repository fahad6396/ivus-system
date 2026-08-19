"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AddMaintenancePage() {
  const router = useRouter();
  const params = useParams();
  const deviceId = params.id as string;

  const [workOrderNumber, setWorkOrderNumber] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [engineer, setEngineer] = useState("");
  const [maintenanceType, setMaintenanceType] =
    useState("Preventive");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Completed");
  const [files, setFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);

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

    const uploadedFiles: string[] = [];

    if (files) {
      for (const file of Array.from(files)) {
        const fileName =
          `${deviceId}/${Date.now()}-${file.name}`;

        const { error: uploadError } =
          await supabase.storage
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

        uploadedFiles.push(data.publicUrl);
      }
    }

    const { data: maintenanceData, error } =
      await supabase
        .from("maintenance")
        .insert({
          device_id: deviceId,
          work_order_number: workOrderNumber.trim() || null,
          visit_date: visitDate,
          engineer: engineer.trim(),
          maintenance_type: maintenanceType,
          description: description.trim(),
          status,
          attachments: uploadedFiles,
          created_by: user.email || user.id,
          updated_by: user.email || user.id,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }

    const { error: logError } = await supabase
      .from("activity_logs")
      .insert({
        user_email: user.email || user.id,
        action: "Added Maintenance",
        record_type: "Maintenance",
        record_id: maintenanceData.id,
        description:
          `Work Order: ${workOrderNumber.trim() || "-"} | ` +
          `Type: ${maintenanceType} | ` +
          `Engineer: ${engineer.trim()} | ` +
          `Status: ${status} | ` +
          `Date: ${visitDate}`,
      });

    if (logError) {
      console.error("Activity log error:", logError);
    }

    setSaving(false);

    router.push(`/devices/${deviceId}`);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="max-w-3xl mx-auto">

        <Link
          href={`/devices/${deviceId}`}
          className="text-blue-600 hover:underline"
        >
          ← Back to Device
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8 mt-5">

          <h1 className="text-3xl font-bold">
            Add Maintenance
          </h1>

          <p className="text-gray-500 mt-2 mb-7">
            Create a new maintenance record
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block font-semibold mb-2">
                Work Order Number
              </label>

              <input
                type="text"
                value={workOrderNumber}
                onChange={(e) =>
                  setWorkOrderNumber(e.target.value)
                }
                placeholder="Example: WO-2026-00125"
                className="w-full border rounded-xl p-3"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Visit Date
              </label>

              <input
                type="date"
                value={visitDate}
                onChange={(e) =>
                  setVisitDate(e.target.value)
                }
                className="w-full border rounded-xl p-3"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Engineer
              </label>

              <input
                value={engineer}
                onChange={(e) =>
                  setEngineer(e.target.value)
                }
                className="w-full border rounded-xl p-3"
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
                className="w-full border rounded-xl p-3"
              >
                <option value="Preventive">
                  Preventive
                </option>

                <option value="Corrective">
                  Corrective
                </option>

                <option value="Inspection">
                  Inspection
                </option>

                <option value="Calibration">
                  Calibration
                </option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Description
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                rows={5}
                className="w-full border rounded-xl p-3"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Status
              </label>

              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value)
                }
                className="w-full border rounded-xl p-3"
              >
                <option value="Completed">
                  Completed
                </option>

                <option value="In Progress">
                  In Progress
                </option>

                <option value="Pending">
                  Pending
                </option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Attachments
              </label>

              <input
                type="file"
                multiple
                onChange={(e) =>
                  setFiles(e.target.files)
                }
                className="w-full border rounded-xl p-3"
              />
            </div>

            <div className="flex gap-3 pt-3">

              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-xl font-semibold"
              >
                {saving
                  ? "Saving..."
                  : "Save Maintenance"}
              </button>

              <Link
                href={`/devices/${deviceId}`}
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