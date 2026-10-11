"use client";

import { useEffect, useMemo, useState } from "react";
import { logActivity } from "@/lib/activity-log";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Hospital = {
  id: string;
  hospital_name: string;
  city: string;
  region: string | null;
};

const DEVICE_OPTIONS = [
  "Intrasight Integrated",
  "Intrasight Mobile",
  "Core Integrated",
  "Core Mobile",
  "SyncVision",
  "Other...",
];

const SOFTWARE_VERSION_OPTIONS = [
  "2.5.1",
  "5.1.1.9",
  "5.2.2",
  "4.2.1.3",
  "Other...",
];

export default function AddDevicePage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);

  const [deviceChoice, setDeviceChoice] = useState("Intrasight Integrated");
  const [customDeviceName, setCustomDeviceName] = useState("");

  const [serialNumber, setSerialNumber] = useState("");
  const [userStatus, setUserStatus] = useState("Operative");
  const [softwareChoice, setSoftwareChoice] = useState("");
  const [customSoftwareVersion, setCustomSoftwareVersion] = useState("");

  const [city, setCity] = useState("");
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  const [installationDate, setInstallationDate] = useState("");
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadHospitals() {
      try {
        const { data, error } = await supabase
          .from("hospitals")
          .select("id, hospital_name, city, region")
          .eq("active", true)
          .order("city")
          .order("hospital_name");

        if (error) throw error;

        setHospitals(data || []);
      } catch (error) {
        console.error("Hospital loading error:", error);
      } finally {
        setLoadingHospitals(false);
      }
    }

    loadHospitals();
  }, []);

  const cities = useMemo(() => {
    return Array.from(
      new Set(
        hospitals
          .map((hospital) => hospital.city?.trim())
          .filter(Boolean)
      )
    ).sort();
  }, [hospitals]);

  const hospitalResults = useMemo(() => {
    const search = hospitalSearch.trim().toLowerCase();

    if (!city || search.length < 3) {
      return [];
    }

    return hospitals
      .filter(
        (hospital) =>
          hospital.city === city &&
          hospital.hospital_name
            .toLowerCase()
            .includes(search)
      )
      .slice(0, 12);
  }, [hospitals, city, hospitalSearch]);

  function changeCity(value: string) {
    setCity(value);
    setHospitalSearch("");
    setSelectedHospital(null);
  }

  function selectHospital(hospital: Hospital) {
    setSelectedHospital(hospital);
    setHospitalSearch(hospital.hospital_name);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setSuccess(false);

    try {
      const finalDeviceName =
        deviceChoice === "Other..."
          ? customDeviceName.trim()
          : deviceChoice;

      if (deviceChoice === "Other..." && !finalDeviceName) {
        throw new Error("Please enter the device name.");
      }

      const finalSoftwareVersion =
        softwareChoice === "Other..."
          ? customSoftwareVersion.trim()
          : softwareChoice;

      if (softwareChoice === "Other..." && !finalSoftwareVersion) {
        throw new Error("Please enter the software version.");
      }

      if (!serialNumber.trim()) {
        throw new Error("Serial Number is required.");
      }

      if (!city) {
        throw new Error("Please select a city.");
      }

      if (!selectedHospital) {
        throw new Error("Please select a hospital from the search results.");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: newDevice, error: insertError } =
        await supabase
          .from("devices_v2")
          .insert({
            device_description: finalDeviceName,
            serial_number: serialNumber.trim(),
            user_status: userStatus,
            software_version: finalSoftwareVersion || null,
            customer_name: selectedHospital.hospital_name,
            city: selectedHospital.city,
            installation_date: installationDate || null,
            comment: comment.trim() || null,
            created_by: user?.email || null,
          })
          .select("id")
          .single();

      if (insertError) throw insertError;

      for (const file of files) {
        const safeName = file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

        const filePath =
          `${newDevice.id}/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}-${safeName}`;

        const { error: uploadError } =
          await supabase.storage
            .from("device-attachments")
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicData } =
          supabase.storage
            .from("device-attachments")
            .getPublicUrl(filePath);

        const { error: attachmentError } =
          await supabase
            .from("device_attachments")
            .insert({
              device_id: newDevice.id,
              file_name: file.name,
              file_path: filePath,
              file_url: publicData.publicUrl,
            });

        if (attachmentError) throw attachmentError;
      }


      await logActivity({
        action_type: "ADD_DEVICE",
        device_id: newDevice.id,
        device_name: finalDeviceName,
        serial_number: serialNumber.trim(),
        hospital_name: selectedHospital.hospital_name,
        city: selectedHospital.city,
        description: `Added new device ${finalDeviceName} (${serialNumber.trim()})`,
        new_value: {
          device_description: finalDeviceName,
          serial_number: serialNumber.trim(),
          user_status: userStatus,
          software_version: finalSoftwareVersion || null,
          hospital: selectedHospital.hospital_name,
          city: selectedHospital.city,
          installation_date: installationDate || null,
          attachments: files.length,
        },
      });
      setSuccess(true);
      setMessage("Device added successfully.");

      setDeviceChoice("Intrasight Integrated");
      setCustomDeviceName("");
      setSerialNumber("");
      setUserStatus("Operative");
      setSoftwareChoice("");
      setCustomSoftwareVersion("");
      setCity("");
      setHospitalSearch("");
      setSelectedHospital(null);
      setInstallationDate("");
      setComment("");
      setFiles([]);

      const fileInput = document.getElementById(
        "attachments"
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = "";
    } catch (error: any) {
      console.error(error);

      if (error?.code === "23505") {
        setMessage("This serial number already exists.");
      } else {
        setMessage(error?.message || "Failed to add device.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">

      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">
              Philips Device Tracking System
            </h2>
            <p className="text-sm text-slate-500">
              Add New Medical Device
            </p>
          </div>

          <div className="flex gap-4">
            <Link href="/" className="text-slate-600 font-semibold">
              Dashboard
            </Link>

            <Link href="/devices" className="text-blue-600 font-semibold">
              Devices
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 md:py-10">

        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">

          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-8">
            <p className="text-blue-200 text-sm font-bold uppercase tracking-wider">
              Device Registration
            </p>

            <h1 className="text-3xl font-bold mt-2">
              Add Medical Device
            </h1>

            <p className="text-blue-100 mt-2">
              Select the city first, then search for the hospital.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-6 md:p-8 space-y-6"
          >

            <div>
              <label className="block font-semibold mb-2">
                Device Type *
              </label>

              <select
                value={deviceChoice}
                onChange={(e) => setDeviceChoice(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 bg-white"
              >
                {DEVICE_OPTIONS.map((device) => (
                  <option key={device} value={device}>
                    {device}
                  </option>
                ))}
              </select>
            </div>

            {deviceChoice === "Other..." && (
              <div>
                <label className="block font-semibold mb-2">
                  Device Name *
                </label>

                <input
                  required
                  value={customDeviceName}
                  onChange={(e) =>
                    setCustomDeviceName(e.target.value)
                  }
                  placeholder="Enter device name"
                  className="w-full border rounded-xl px-4 py-3"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold mb-2">
                Device Serial Number *
              </label>

              <input
                required
                value={serialNumber}
                onChange={(e) =>
                  setSerialNumber(e.target.value)
                }
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                User Status *
              </label>

              <select
                value={userStatus}
                onChange={(e) =>
                  setUserStatus(e.target.value)
                }
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
                value={softwareChoice}
                onChange={(e) =>
                  setSoftwareChoice(e.target.value)
                }
                className="w-full border rounded-xl px-4 py-3 bg-white"
              >
                <option value="">Select Software Version</option>
                {SOFTWARE_VERSION_OPTIONS.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            </div>

            {softwareChoice === "Other..." && (
              <div>
                <label className="block font-semibold mb-2">
                  Software Version (Other) *
                </label>

                <input
                  required
                  value={customSoftwareVersion}
                  onChange={(e) =>
                    setCustomSoftwareVersion(e.target.value)
                  }
                  placeholder="Enter software version"
                  className="w-full border rounded-xl px-4 py-3"
                />
              </div>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-5">

              <div>
                <p className="font-bold text-slate-900">
                  Hospital Location
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Choose the city first, then type at least 3 letters.
                </p>
              </div>

              <div>
                <label className="block font-semibold mb-2">
                  City *
                </label>

                <select
                  required
                  value={city}
                  onChange={(e) =>
                    changeCity(e.target.value)
                  }
                  disabled={loadingHospitals}
                  className="w-full border rounded-xl px-4 py-3 bg-white"
                >
                  <option value="">
                    {loadingHospitals
                      ? "Loading cities..."
                      : "Select City"}
                  </option>

                  {cities.map((cityName) => (
                    <option
                      key={cityName}
                      value={cityName}
                    >
                      {cityName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block font-semibold mb-2">
                  Hospital *
                </label>

                <input
                  value={hospitalSearch}
                  disabled={!city}
                  onChange={(e) => {
                    setHospitalSearch(e.target.value);
                    setSelectedHospital(null);
                  }}
                  placeholder={
                    city
                      ? "Type at least 3 letters..."
                      : "Select City first"
                  }
                  autoComplete="off"
                  className="w-full border rounded-xl px-4 py-3 disabled:bg-slate-100"
                />

                {city &&
                  hospitalSearch.trim().length > 0 &&
                  hospitalSearch.trim().length < 3 && (
                    <p className="text-sm text-blue-600 mt-2">
                      Type {3 - hospitalSearch.trim().length} more character(s)
                    </p>
                  )}

                {hospitalResults.length > 0 &&
                  !selectedHospital && (
                    <div className="absolute z-20 left-0 right-0 mt-2 bg-white border rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto">

                      {hospitalResults.map((hospital) => (
                        <button
                          key={hospital.id}
                          type="button"
                          onClick={() =>
                            selectHospital(hospital)
                          }
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0"
                        >
                          <p className="font-semibold text-slate-900">
                            {hospital.hospital_name}
                          </p>

                          <p className="text-xs text-slate-500 mt-1">
                            {hospital.city}
                            {hospital.region
                              ? ` • ${hospital.region}`
                              : ""}
                          </p>
                        </button>
                      ))}

                    </div>
                  )}

                {city &&
                  hospitalSearch.trim().length >= 3 &&
                  hospitalResults.length === 0 &&
                  !selectedHospital && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm text-amber-700">
                        No matching hospital found in {city}.
                      </p>

                      <Link
                        href="/hospitals"
                        className="inline-block mt-3 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold"
                      >
                        + Add Hospital
                      </Link>
                    </div>
                  )}
              </div>

              {selectedHospital && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-xs text-green-700 font-bold uppercase">
                    Selected Hospital
                  </p>

                  <p className="font-bold text-slate-900 mt-1">
                    {selectedHospital.hospital_name}
                  </p>

                  <p className="text-sm text-slate-600 mt-1">
                    {selectedHospital.city}
                    {selectedHospital.region
                      ? ` • ${selectedHospital.region}`
                      : ""}
                  </p>
                </div>
              )}

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
                onChange={(e) =>
                  setComment(e.target.value)
                }
                className="w-full border rounded-xl px-4 py-3 resize-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Attachments
              </label>

              <input
                id="attachments"
                type="file"
                multiple
                onChange={(e) =>
                  setFiles(
                    e.target.files
                      ? Array.from(e.target.files)
                      : []
                  )
                }
                className="w-full border border-dashed rounded-xl px-4 py-4 bg-slate-50"
              />

              {files.length > 0 && (
                <p className="text-sm text-blue-600 mt-2">
                  {files.length} file(s) selected
                </p>
              )}
            </div>

            {message && (
              <div
                className={`rounded-xl p-4 ${
                  success
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white font-bold py-3.5 rounded-xl"
            >
              {saving ? "Saving..." : "Submit Device"}
            </button>

          </form>
        </div>
      </div>
    </main>
  );
}





