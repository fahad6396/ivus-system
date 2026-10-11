"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Attachment = {
  id: string;
  device_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  created_at: string;
};

const SOFTWARE_VERSION_OPTIONS = [
  "2.5.1",
  "5.1.1.9",
  "5.2.2",
  "4.2.1.3",
];

export default function EditDevicePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [deviceDescription, setDeviceDescription] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [userStatus, setUserStatus] = useState("Operative");
  const [softwareVersion, setSoftwareVersion] = useState("");
  const [softwareOther, setSoftwareOther] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [installationDate, setInstallationDate] = useState("");
  const [comment, setComment] = useState("");

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const { data: device, error: deviceError } = await supabase
        .from("devices_v2")
        .select("*")
        .eq("id", id)
        .single();

      if (deviceError) {
        setMessage(deviceError.message);
        setLoading(false);
        return;
      }

      setDeviceDescription(device.device_description || "");
      setSerialNumber(device.serial_number || "");
      setUserStatus(device.user_status || "Operative");
      const loadedSoftware = device.software_version || "";
      setSoftwareVersion(loadedSoftware);
      setSoftwareOther(
        loadedSoftware !== "" &&
          !SOFTWARE_VERSION_OPTIONS.includes(loadedSoftware)
      );
      setCustomerName(device.customer_name || "");
      setInstallationDate(device.installation_date || "");
      setComment(device.comment || "");

      const { data: files, error: filesError } = await supabase
        .from("device_attachments")
        .select("*")
        .eq("device_id", id)
        .order("created_at", { ascending: false });

      if (filesError) {
        console.error(filesError);
      } else {
        setAttachments(files || []);
      }

      setLoading(false);
    }

    if (id) loadData();
  }, [id]);

  async function deleteAttachment(file: Attachment) {
    const confirmed = window.confirm(
      `Delete ${file.file_name}?`
    );

    if (!confirmed) return;

    setMessage("");

    try {
      const { error: storageError } = await supabase.storage
        .from("device-attachments")
        .remove([file.file_path]);

      if (storageError) throw storageError;

      const { error: databaseError } = await supabase
        .from("device_attachments")
        .delete()
        .eq("id", file.id);

      if (databaseError) throw databaseError;

      setAttachments((current) =>
        current.filter((item) => item.id !== file.id)
      );

      setMessage("File deleted successfully.");
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Failed to delete file.");
    }
  }

  async function uploadSelectedFiles() {
    if (newFiles.length === 0) return;

    for (const file of newFiles) {
      const safeName = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      const filePath =
        `${id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("device-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("device-attachments")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("device_attachments")
        .insert({
          device_id: id,
          file_name: file.name,
          file_path: filePath,
          file_url: publicData.publicUrl,
        });

      if (insertError) throw insertError;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("devices_v2")
        .update({
          device_description: deviceDescription.trim(),
          serial_number: serialNumber.trim(),
          user_status: userStatus,
          software_version: softwareVersion.trim() || null,
          customer_name: customerName.trim() || null,
          installation_date: installationDate || null,
          comment: comment.trim() || null,
        })
        .eq("id", id);

      if (error) throw error;

      await uploadSelectedFiles();

      router.push(`/devices/${id}`);
      router.refresh();
    } catch (error: any) {
      console.error(error);

      if (error?.code === "23505") {
        setMessage("This serial number already exists.");
      } else {
        setMessage(error?.message || "Failed to save changes.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center">
        Loading device...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="max-w-3xl mx-auto p-6 md:py-10">

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-slate-500">
              Device Management
            </p>

            <h1 className="text-3xl font-bold">
              Edit Device
            </h1>
          </div>

          <Link
            href={`/devices/${id}`}
            className="border bg-white px-4 py-2 rounded-xl font-semibold"
          >
            Cancel
          </Link>
        </div>

        <div className="bg-white border shadow-sm rounded-2xl p-6 md:p-8">

          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label className="block font-semibold mb-2">
                Device Description *
              </label>

              <input
                required
                value={deviceDescription}
                onChange={(e) => setDeviceDescription(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Device Serial Number *
              </label>

              <input
                required
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                User Status
              </label>

              <select
                value={userStatus}
                onChange={(e) => setUserStatus(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 bg-white"
              >
                <option value="Operative">Operative</option>
                <option value="Store">Store</option>
                <option value="Scrapped">Scrapped</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Software Version
              </label>

              <select
                value={softwareOther ? "Other..." : softwareVersion}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "Other...") {
                    setSoftwareOther(true);
                    if (SOFTWARE_VERSION_OPTIONS.includes(softwareVersion)) {
                      setSoftwareVersion("");
                    }
                  } else {
                    setSoftwareOther(false);
                    setSoftwareVersion(v);
                  }
                }}
                className="w-full border rounded-xl px-4 py-3 bg-white"
              >
                <option value="">Select Software Version</option>
                {SOFTWARE_VERSION_OPTIONS.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
                <option value="Other...">Other...</option>
              </select>
            </div>

            {softwareOther && (
              <div>
                <label className="block font-semibold mb-2">
                  Software Version (Other) *
                </label>

                <input
                  required
                  value={softwareVersion}
                  onChange={(e) => setSoftwareVersion(e.target.value)}
                  placeholder="Enter software version"
                  className="w-full border rounded-xl px-4 py-3"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold mb-2">
                Customer Name
              </label>

              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Installation Date
              </label>

              <input
                type="date"
                value={installationDate}
                onChange={(e) => setInstallationDate(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Comment
              </label>

              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 resize-none"
              />
            </div>

            <div className="border rounded-2xl p-5 bg-slate-50">
              <h2 className="text-lg font-bold mb-4">
                Attachments
              </h2>

              {attachments.length === 0 ? (
                <p className="text-slate-500 mb-5">
                  No files uploaded yet.
                </p>
              ) : (
                <div className="space-y-3 mb-6">
                  {attachments.map((file) => (
                    <div
                      key={file.id}
                      className="bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {file.file_name}
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(
                            file.created_at
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold"
                        >
                          Open
                        </a>

                        <button
                          type="button"
                          onClick={() => deleteAttachment(file)}
                          className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <label className="block font-semibold mb-2">
                Add More Files
              </label>

              <input
                type="file"
                multiple
                onChange={(e) =>
                  setNewFiles(
                    e.target.files
                      ? Array.from(e.target.files)
                      : []
                  )
                }
                className="w-full border border-dashed rounded-xl px-4 py-4 bg-white"
              />

              {newFiles.length > 0 && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="font-semibold text-blue-800">
                    Selected files: {newFiles.length}
                  </p>

                  <div className="mt-2 space-y-1">
                    {newFiles.map((file, index) => (
                      <p
                        key={`${file.name}-${index}`}
                        className="text-sm text-blue-700"
                      >
                        • {file.name}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {message && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white font-semibold py-3.5 rounded-xl"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

          </form>

        </div>
      </div>
    </main>
  );
}
