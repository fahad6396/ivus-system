"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  Pencil,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";

type Device = {
  id: string;
  device_description: string;
  serial_number: string;
  customer_name: string | null;
  city: string | null;
  last_ppm_date: string | null;
  next_ppm_date: string | null;
};

type PPMHistory = {
  id: string;
  ppm_date: string;
  engineer: string | null;
  notes: string | null;
  next_ppm_date: string;
  created_at: string;
};

type Attachment = {
  id: string;
  ppm_history_id: string;
  file_name: string;
  file_path: string;
  file_url: string | null;
};

function ppmStatus(nextDate: string | null) {
  if (!nextDate) return "Not Scheduled";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const next = new Date(nextDate + "T00:00:00");

  const days = Math.ceil(
    (next.getTime() - today.getTime()) / 86400000
  );

  if (days < 0) return "Overdue";
  if (days <= 30) return "Due Soon";

  return "OK";
}

function addSixMonths(dateString: string) {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  date.setUTCMonth(
    date.getUTCMonth() + 6
  );

  return date
    .toISOString()
    .split("T")[0];
}

function statusClass(value: string) {
  if (value === "OK")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";

  if (value === "Due Soon")
    return "bg-orange-50 text-orange-700 border-orange-200";

  if (value === "Overdue")
    return "bg-red-50 text-red-700 border-red-200";

  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function PPMPage() {
  const [devices, setDevices] =
    useState<Device[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [selectedDevice, setSelectedDevice] =
    useState<Device | null>(null);

  const [scheduleOpen, setScheduleOpen] =
    useState(false);

  const [completeOpen, setCompleteOpen] =
    useState(false);

  const [historyOpen, setHistoryOpen] =
    useState(false);

  const [editOpen, setEditOpen] =
    useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<PPMHistory | null>(null);

  const [history, setHistory] =
    useState<PPMHistory[]>([]);

  const [attachments, setAttachments] =
    useState<Attachment[]>([]);

  const [scheduleDate, setScheduleDate] =
    useState("");

  const [ppmDate, setPpmDate] =
    useState("");

  const [engineer, setEngineer] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [files, setFiles] =
    useState<File[]>([]);

  const [editRecord, setEditRecord] =
    useState<PPMHistory | null>(null);

  const [editDate, setEditDate] =
    useState("");

  const [editEngineer, setEditEngineer] =
    useState("");

  const [editNotes, setEditNotes] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function loadDevices() {
    setLoading(true);

    const { data, error } = await supabase
      .from("devices_v2")
      .select(`
        id,
        device_description,
        serial_number,
        customer_name,
        city,
        last_ppm_date,
        next_ppm_date
      `)
      .order("next_ppm_date", {
        ascending: true,
        nullsFirst: false,
      });

    if (error) {
      setMessage(error.message);
      setDevices([]);
    } else {
      setDevices(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDevices();
  }, []);

  const counts = useMemo(() => {
    const result = {
      OK: 0,
      "Due Soon": 0,
      Overdue: 0,
      "Not Scheduled": 0,
    };

    devices.forEach((device) => {
      const state =
        ppmStatus(device.next_ppm_date) as keyof typeof result;

      result[state]++;
    });

    return result;
  }, [devices]);

  const filtered = useMemo(() => {
    const q = search
      .trim()
      .toLowerCase();

    return devices.filter((device) => {
      const state =
        ppmStatus(device.next_ppm_date);

      const matchesStatus =
        statusFilter === "All" ||
        state === statusFilter;

      const searchable = [
        device.device_description,
        device.serial_number,
        device.customer_name,
        device.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        (!q || searchable.includes(q))
      );
    });
  }, [
    devices,
    search,
    statusFilter,
  ]);

  function openSchedule(device: Device) {
    setSelectedDevice(device);
    setScheduleDate(
      device.next_ppm_date || ""
    );
    setMessage("");
    setScheduleOpen(true);
  }
  async function saveSchedule() {
    if (!selectedDevice || !scheduleDate) {
      alert("Please select a PPM date.");
      return;
    }

    setSaving(true);
    setMessage("");

    const oldDate = selectedDevice.next_ppm_date;

    const { data, error } = await supabase
      .from("devices_v2")
      .update({
        next_ppm_date: scheduleDate,
      })
      .eq("id", selectedDevice.id)
      .select("id, serial_number, next_ppm_date");

    if (error) {
      alert("Supabase Error: " + error.message);
      setSaving(false);
      return;
    }

    if (!data || data.length === 0) {
      alert("No device was updated.");
      setSaving(false);
      return;
    }

    await logActivity({
      action_type: "SCHEDULE_PPM",
      device_id: selectedDevice.id,
      device_name: selectedDevice.device_description,
      serial_number: selectedDevice.serial_number,
      hospital_name: selectedDevice.customer_name,
      city: selectedDevice.city,
      description: `PPM scheduled for ${scheduleDate}`,
      old_value: {
        next_ppm_date: oldDate,
      },
      new_value: {
        next_ppm_date: scheduleDate,
      },
    });

    alert("PPM Schedule saved successfully ✅");

    setScheduleOpen(false);
    await loadDevices();
    setSaving(false);
  }

  function openComplete(device: Device) {
    setSelectedDevice(device);

    setPpmDate(
      new Date()
        .toISOString()
        .split("T")[0]
    );

    setEngineer("");
    setNotes("");
    setFiles([]);
    setMessage("");
    setCompleteOpen(true);
  }

  async function completePPM() {
    if (
      !selectedDevice ||
      !ppmDate
    )
      return;

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const {
        data: historyId,
        error,
      } = await supabase.rpc(
        "complete_device_ppm",
        {
          p_device_id:
            selectedDevice.id,
          p_ppm_date: ppmDate,
          p_engineer:
            engineer.trim() || null,
          p_notes:
            notes.trim() || null,
          p_created_by:
            user?.email || null,
        }
      );

      if (error) throw error;

      for (const file of files) {
        const safeName =
          file.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );

        const path =
          `${selectedDevice.id}/${historyId}/` +
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}-${safeName}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from("ppm-attachments")
          .upload(path, file);

        if (uploadError)
          throw uploadError;

        const { data: publicData } =
          supabase.storage
            .from("ppm-attachments")
            .getPublicUrl(path);

        const {
          error: attachmentError,
        } = await supabase
          .from("ppm_attachments")
          .insert({
            ppm_history_id:
              historyId,
            device_id:
              selectedDevice.id,
            file_name: file.name,
            file_path: path,
            file_url:
              publicData.publicUrl,
          });

        if (attachmentError)
          throw attachmentError;
      }

      await logActivity({
        action_type: "COMPLETE_PPM",
        device_id:
          selectedDevice.id,
        device_name:
          selectedDevice.device_description,
        serial_number:
          selectedDevice.serial_number,
        hospital_name:
          selectedDevice.customer_name,
        city:
          selectedDevice.city,
        description:
          `PPM completed on ${ppmDate}`,
        new_value: {
          ppm_date: ppmDate,
          next_ppm_date:
            addSixMonths(ppmDate),
          engineer:
            engineer.trim() || null,
          notes:
            notes.trim() || null,
          attachments:
            files.length,
        },
      });

      setCompleteOpen(false);

      await loadDevices();

      await openHistory(
        selectedDevice
      );
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Failed to complete PPM."
      );
    } finally {
      setSaving(false);
    }
  }

  async function openHistory(
    device: Device
  ) {
    setSelectedDevice(device);
    setHistory([]);
    setAttachments([]);
    setHistoryOpen(true);
    setMessage("");

    const {
      data: historyData,
      error: historyError,
    } = await supabase
      .from("ppm_history")
      .select(`
        id,
        ppm_date,
        engineer,
        notes,
        next_ppm_date,
        created_at
      `)
      .eq("device_id", device.id)
      .order("ppm_date", {
        ascending: false,
      });

    if (historyError) {
      setMessage(
        historyError.message
      );
      return;
    }

    const {
      data: attachmentData,
    } = await supabase
      .from("ppm_attachments")
      .select(`
        id,
        ppm_history_id,
        file_name,
        file_path,
        file_url
      `)
      .eq("device_id", device.id);

    setHistory(
      historyData || []
    );

    setAttachments(
      attachmentData || []
    );
  }

  function openEdit(
    record: PPMHistory
  ) {
    setEditRecord(record);
    setEditDate(record.ppm_date);
    setEditEngineer(
      record.engineer || ""
    );
    setEditNotes(
      record.notes || ""
    );
    setEditOpen(true);
  }

  async function saveEdit() {
    if (
      !selectedDevice ||
      !editRecord ||
      !editDate
    )
      return;

    setSaving(true);
    setMessage("");

    try {
      const nextDate =
        addSixMonths(editDate);

      const { error } = await supabase
        .from("ppm_history")
        .update({
          ppm_date: editDate,
          engineer:
            editEngineer.trim() ||
            null,
          notes:
            editNotes.trim() ||
            null,
          next_ppm_date:
            nextDate,
        })
        .eq("id", editRecord.id);

      if (error) throw error;

      const {
        error: syncError,
      } = await supabase.rpc(
        "sync_device_ppm_from_history",
        {
          p_device_id:
            selectedDevice.id,
        }
      );

      if (syncError)
        throw syncError;

      await logActivity({
        action_type: "EDIT_PPM",
        device_id:
          selectedDevice.id,
        device_name:
          selectedDevice.device_description,
        serial_number:
          selectedDevice.serial_number,
        hospital_name:
          selectedDevice.customer_name,
        city:
          selectedDevice.city,
        description:
          `PPM record updated to ${editDate}`,
        old_value: {
          ppm_date:
            editRecord.ppm_date,
          engineer:
            editRecord.engineer,
          notes:
            editRecord.notes,
        },
        new_value: {
          ppm_date:
            editDate,
          engineer:
            editEngineer.trim() ||
            null,
          notes:
            editNotes.trim() ||
            null,
          next_ppm_date:
            nextDate,
        },
      });

      setEditOpen(false);

      await openHistory(
        selectedDevice
      );

      await loadDevices();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Failed to update PPM record."
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (
      !selectedDevice ||
      !deleteTarget
    )
      return;

    setSaving(true);
    setMessage("");

    try {
      const recordFiles =
        attachments.filter(
          (file) =>
            file.ppm_history_id ===
            deleteTarget.id
        );

      const paths =
        recordFiles
          .map(
            (file) =>
              file.file_path
          )
          .filter(Boolean);

      if (paths.length > 0) {
        const {
          error: storageError,
        } = await supabase.storage
          .from("ppm-attachments")
          .remove(paths);

        if (storageError)
          throw storageError;
      }

      const {
        error: deleteError,
      } = await supabase
        .from("ppm_history")
        .delete()
        .eq(
          "id",
          deleteTarget.id
        );

      if (deleteError)
        throw deleteError;

      const {
        error: syncError,
      } = await supabase.rpc(
        "sync_device_ppm_from_history",
        {
          p_device_id:
            selectedDevice.id,
        }
      );

      if (syncError)
        throw syncError;

      await logActivity({
        action_type: "DELETE_PPM",
        device_id:
          selectedDevice.id,
        device_name:
          selectedDevice.device_description,
        serial_number:
          selectedDevice.serial_number,
        hospital_name:
          selectedDevice.customer_name,
        city:
          selectedDevice.city,
        description:
          `Deleted PPM record dated ${deleteTarget.ppm_date}`,
        old_value:
          deleteTarget,
      });

      setDeleteTarget(null);

      await openHistory(
        selectedDevice
      );

      await loadDevices();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Failed to delete PPM."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb]">

      <div className="max-w-[1500px] mx-auto px-5 lg:px-8 py-8">

        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#102a56] via-[#16468d] to-[#2563eb] shadow-xl shadow-blue-100">

          <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-white/10" />

          <div className="relative p-7 md:p-10 flex flex-col xl:flex-row xl:items-end justify-between gap-7">

            <div>

              <div className="inline-flex items-center gap-2 text-blue-200">
                <CalendarDays size={18} />

                <p className="text-xs font-black tracking-[0.2em] uppercase">
                  Preventive Maintenance
                </p>
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-white mt-3">
                PPM Management Center
              </h1>

              <p className="text-blue-100 mt-3 max-w-2xl">
                Schedule, complete and track preventive maintenance across the complete medical device fleet.
              </p>

            </div>

            <Link
              href="/devices"
              className="bg-white text-blue-800 hover:bg-blue-50 px-5 py-3 rounded-xl font-black"
            >
              View Device Fleet
            </Link>

          </div>

        </section>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">

          {[
            {
              label: "PPM OK",
              value: counts.OK,
              icon: CheckCircle2,
              color:
                "text-emerald-700 bg-emerald-50",
              filter: "OK",
            },
            {
              label: "Due Soon",
              value:
                counts["Due Soon"],
              icon: Clock3,
              color:
                "text-orange-700 bg-orange-50",
              filter: "Due Soon",
            },
            {
              label: "Overdue",
              value:
                counts.Overdue,
              icon: TriangleAlert,
              color:
                "text-red-700 bg-red-50",
              filter: "Overdue",
            },
            {
              label:
                "Not Scheduled",
              value:
                counts[
                  "Not Scheduled"
                ],
              icon: CalendarDays,
              color:
                "text-slate-700 bg-slate-100",
              filter:
                "Not Scheduled",
            },
          ].map((card) => {
            const Icon = card.icon;

            return (
              <button
                key={card.label}
                onClick={() =>
                  setStatusFilter(
                    card.filter
                  )
                }
                className="bg-white border border-slate-200 rounded-2xl p-5 text-left shadow-sm hover:shadow-md transition"
              >

                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.color}`}
                >
                  <Icon size={21} />
                </div>

                <p className="text-sm text-slate-500 font-semibold mt-4">
                  {card.label}
                </p>

                <p className="text-3xl font-black mt-1">
                  {card.value}
                </p>

              </button>
            );
          })}

        </div>

        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm mt-6 overflow-hidden">

          <div className="p-6 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">

            <div>
              <h2 className="text-xl font-black">
                PPM Schedule
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                {filtered.length} device(s)
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">

              <select
                value={
                  statusFilter
                }
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
              >
                <option value="All">
                  All Statuses
                </option>

                <option value="OK">
                  OK
                </option>

                <option value="Due Soon">
                  Due Soon
                </option>

                <option value="Overdue">
                  Overdue
                </option>

                <option value="Not Scheduled">
                  Not Scheduled
                </option>
              </select>

              <div className="relative">

                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Serial, device, hospital..."
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 sm:w-[320px]"
                />

              </div>

            </div>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1150px]">

              <thead className="bg-slate-50">

                <tr>
                  {[
                    "Device",
                    "Serial",
                    "Hospital",
                    "City",
                    "Last PPM",
                    "Next PPM",
                    "Status",
                    "Actions",
                  ].map((label) => (
                    <th
                      key={label}
                      className="text-left px-5 py-4 text-[11px] uppercase tracking-wider text-slate-500 font-black"
                    >
                      {label}
                    </th>
                  ))}
                </tr>

              </thead>

              <tbody>

                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-14 text-center text-slate-500"
                    >
                      Loading PPM schedule...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-14 text-center text-slate-500"
                    >
                      No matching devices.
                    </td>
                  </tr>
                ) : (
                  filtered.map(
                    (device) => {
                      const state =
                        ppmStatus(
                          device.next_ppm_date
                        );

                      return (
                        <tr
                          key={
                            device.id
                          }
                          className="border-t border-slate-100 hover:bg-blue-50/30"
                        >

                          <td className="px-5 py-4">

                            <Link
                              href={`/devices/${device.id}`}
                              className="font-black text-slate-900 hover:text-blue-700"
                            >
                              {device.device_description}
                            </Link>

                          </td>

                          <td className="px-5 py-4 font-semibold text-blue-700">
                            {device.serial_number}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {device.customer_name ||
                              "-"}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {device.city ||
                              "-"}
                          </td>

                          <td className="px-5 py-4">
                            {device.last_ppm_date ||
                              "-"}
                          </td>

                          <td className="px-5 py-4 font-bold">
                            {device.next_ppm_date ||
                              "-"}
                          </td>

                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex border px-3 py-1.5 rounded-full text-xs font-black ${statusClass(
                                state
                              )}`}
                            >
                              {state}
                            </span>

                          </td>

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-2">

                              <button
                                onClick={() =>
                                  openSchedule(
                                    device
                                  )
                                }
                                className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-xl text-sm font-bold"
                              >
                                {device.next_ppm_date
                                  ? "Edit Schedule"
                                  : "Schedule"}
                              </button>

                              {device.next_ppm_date && (
                                <button
                                  onClick={() =>
                                    openComplete(
                                      device
                                    )
                                  }
                                  className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-sm font-bold"
                                >
                                  Complete
                                </button>
                              )}

                              <button
                                onClick={() =>
                                  openHistory(
                                    device
                                  )
                                }
                                className="bg-violet-50 text-violet-700 border border-violet-200 px-3 py-2 rounded-xl text-sm font-bold"
                              >
                                History
                              </button>

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

        {message &&
          !completeOpen &&
          !historyOpen &&
          !editOpen && (
            <div className="mt-5 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
              {message}
            </div>
          )}

      </div>

      {/* SCHEDULE MODAL */}
      {scheduleOpen && selectedDevice && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[32px] shadow-2xl border border-slate-200">

            {/* HEADER */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#102a56] via-[#16468d] to-[#2563eb] text-white p-6 md:p-7">
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                    <CalendarDays size={24} />
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] font-black text-blue-200">
                      Preventive Maintenance
                    </p>

                    <h2 className="text-2xl font-black mt-1">
                      {selectedDevice.next_ppm_date
                        ? "Edit PPM Schedule"
                        : "Schedule PPM"}
                    </h2>

                    <p className="text-sm text-blue-100 mt-2">
                      Select the preventive maintenance date for this device.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setScheduleOpen(false)}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition shrink-0"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 md:p-7 space-y-6">

              {/* DEVICE INFORMATION */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-black tracking-[0.18em] uppercase text-slate-400 mb-4">
                  Device Information
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400">
                      Device
                    </p>
                    <p className="font-black text-slate-900 mt-1">
                      {selectedDevice.device_description}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400">
                      Serial Number
                    </p>
                    <p className="font-black text-slate-900 mt-1">
                      {selectedDevice.serial_number}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400">
                      Hospital
                    </p>
                    <p className="font-black text-slate-900 mt-1">
                      {selectedDevice.customer_name || "Not specified"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400">
                      City
                    </p>
                    <p className="font-black text-slate-900 mt-1">
                      {selectedDevice.city || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>

              {/* DATE */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className="font-black text-slate-900">
                    PPM Date
                  </label>

                  <span className="text-xs font-bold text-slate-400">
                    Required
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-2xl px-4 py-4 text-slate-900 font-bold outline-none transition"
                  />
                </div>
              </div>

              {/* NEXT PPM PREVIEW */}
              {scheduleDate && (
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Clock3 size={21} />
                    </div>

                    <div className="flex-1">
                      <p className="text-[11px] font-black tracking-[0.16em] uppercase text-blue-600">
                        Following PPM After Completion
                      </p>

                      <p className="text-2xl font-black text-slate-900 mt-2">
                        {addSixMonths(scheduleDate)}
                      </p>

                      <div className="mt-3 flex items-center gap-2 text-sm font-bold text-emerald-700">
                        <CheckCircle2 size={17} />
                        Automatic 6-month maintenance cycle
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CURRENT SCHEDULE */}
              {selectedDevice.next_ppm_date && (
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-amber-600">
                      Current Schedule
                    </p>
                    <p className="font-black text-amber-900 mt-1">
                      {selectedDevice.next_ppm_date}
                    </p>
                  </div>

                  <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-black">
                    Will be updated
                  </span>
                </div>
              )}

            </div>

            {/* FOOTER */}
            <div className="px-6 md:px-7 py-5 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                onClick={() => setScheduleOpen(false)}
                disabled={saving}
                className="px-6 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-black hover:bg-slate-100 transition"
              >
                Cancel
              </button>

              <button
                onClick={saveSchedule}
                disabled={saving || !scheduleDate}
                className="px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-400 text-white font-black shadow-lg shadow-blue-200 transition flex items-center justify-center gap-2"
              >
                <CalendarDays size={18} />

                {saving
                  ? "Scheduling..."
                  : selectedDevice.next_ppm_date
                    ? "Update Schedule"
                    : "Schedule PPM"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* COMPLETE MODAL */}

      {completeOpen &&
        selectedDevice && (
          <div className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">

            <div className="bg-white w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl">

              <div className="p-6 border-b border-slate-200 flex justify-between">

                <div>
                  <h2 className="text-xl font-black">
                    Complete PPM
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    {selectedDevice.device_description} • {selectedDevice.serial_number}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setCompleteOpen(
                      false
                    )
                  }
                >
                  <X size={20} />
                </button>

              </div>

              <div className="p-6 space-y-5">

                <div>
                  <label className="font-bold">
                    PPM Date *
                  </label>

                  <input
                    type="date"
                    value={
                      ppmDate
                    }
                    onChange={(e) =>
                      setPpmDate(
                        e.target.value
                      )
                    }
                    className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                  />

                  {ppmDate && (
                    <p className="text-sm text-blue-700 font-bold mt-2">
                      Next PPM:{" "}
                      {addSixMonths(
                        ppmDate
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label className="font-bold">
                    Engineer
                  </label>

                  <input
                    value={
                      engineer
                    }
                    onChange={(e) =>
                      setEngineer(
                        e.target.value
                      )
                    }
                    className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="font-bold">
                    Notes
                  </label>

                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) =>
                      setNotes(
                        e.target.value
                      )
                    }
                    className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="font-bold">
                    Attachments
                  </label>

                  <input
                    type="file"
                    multiple
                    onChange={(e) =>
                      setFiles(
                        e.target.files
                          ? Array.from(
                              e.target.files
                            )
                          : []
                      )
                    }
                    className="mt-2 w-full border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl p-5"
                  />

                  {files.length >
                    0 && (
                    <p className="text-sm text-blue-700 font-bold mt-2">
                      {files.length} file(s) selected
                    </p>
                  )}
                </div>

                {message && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
                    {message}
                  </div>
                )}

              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">

                <button
                  onClick={() =>
                    setCompleteOpen(
                      false
                    )
                  }
                  className="px-5 py-2.5 border rounded-xl font-bold"
                >
                  Cancel
                </button>

                <button
                  onClick={
                    completePPM
                  }
                  disabled={
                    saving ||
                    !ppmDate
                  }
                  className="px-5 py-2.5 bg-emerald-600 disabled:bg-slate-400 text-white rounded-xl font-black"
                >
                  {saving
                    ? "Saving..."
                    : "Complete PPM"}
                </button>

              </div>

            </div>

          </div>
        )}

      {/* HISTORY MODAL */}

      {historyOpen &&
        selectedDevice && (
          <div className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">

            <div className="bg-white w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl">

              <div className="sticky top-0 bg-white z-10 p-6 border-b border-slate-200 flex justify-between">

                <div>

                  <div className="flex items-center gap-2">
                    <History
                      size={20}
                      className="text-violet-600"
                    />

                    <h2 className="text-xl font-black">
                      PPM History
                    </h2>
                  </div>

                  <p className="text-sm text-slate-500 mt-1">
                    {selectedDevice.device_description} • {selectedDevice.serial_number}
                  </p>

                </div>

                <button
                  onClick={() =>
                    setHistoryOpen(
                      false
                    )
                  }
                >
                  <X size={20} />
                </button>

              </div>

              <div className="p-6 space-y-4">

                {history.length ===
                0 ? (
                  <div className="py-16 text-center text-slate-500">
                    No PPM history yet.
                  </div>
                ) : (
                  history.map(
                    (record) => {
                      const recordFiles =
                        attachments.filter(
                          (file) =>
                            file.ppm_history_id ===
                            record.id
                        );

                      return (
                        <div
                          key={
                            record.id
                          }
                          className="border border-slate-200 rounded-2xl p-5"
                        >

                          <div className="flex flex-wrap justify-between gap-4">

                            <div>
                              <span className="inline-flex bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-black">
                                COMPLETED PPM
                              </span>

                              <p className="text-xl font-black mt-3">
                                {record.ppm_date}
                              </p>

                              <p className="text-sm text-slate-500 mt-1">
                                Next PPM: {record.next_ppm_date}
                              </p>
                            </div>

                            <div className="flex gap-2">

                              <button
                                onClick={() =>
                                  openEdit(
                                    record
                                  )
                                }
                                className="w-9 h-9 flex items-center justify-center bg-amber-50 text-amber-700 rounded-xl"
                              >
                                <Pencil
                                  size={16}
                                />
                              </button>

                              <button
                                onClick={() =>
                                  setDeleteTarget(
                                    record
                                  )
                                }
                                className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-700 rounded-xl"
                              >
                                <Trash2
                                  size={16}
                                />
                              </button>

                            </div>

                          </div>

                          <div className="grid sm:grid-cols-2 gap-4 mt-5">

                            <div className="bg-slate-50 rounded-xl p-4">

                              <p className="text-xs text-slate-400 font-bold">
                                ENGINEER
                              </p>

                              <p className="font-bold mt-1">
                                {record.engineer ||
                                  "-"}
                              </p>

                            </div>

                            <div className="bg-slate-50 rounded-xl p-4">

                              <p className="text-xs text-slate-400 font-bold">
                                NOTES
                              </p>

                              <p className="font-semibold mt-1">
                                {record.notes ||
                                  "-"}
                              </p>

                            </div>

                          </div>

                          {recordFiles.length >
                            0 && (
                            <div className="flex flex-wrap gap-2 mt-4">

                              {recordFiles.map(
                                (file) => (
                                  <a
                                    key={
                                      file.id
                                    }
                                    href={
                                      file.file_url ||
                                      "#"
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-xl text-sm font-bold"
                                  >
                                    <FileText
                                      size={
                                        15
                                      }
                                    />

                                    {
                                      file.file_name
                                    }
                                  </a>
                                )
                              )}

                            </div>
                          )}

                        </div>
                      );
                    }
                  )
                )}

              </div>

            </div>

          </div>
        )}

      {/* EDIT MODAL */}

      {editOpen &&
        editRecord && (
          <div className="fixed inset-0 z-[110] bg-slate-950/50 flex items-center justify-center p-4">

            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl">

              <div className="p-6 border-b flex justify-between">

                <h2 className="text-xl font-black">
                  Edit PPM Record
                </h2>

                <button
                  onClick={() =>
                    setEditOpen(false)
                  }
                >
                  <X size={20} />
                </button>

              </div>

              <div className="p-6 space-y-4">

                <input
                  type="date"
                  value={editDate}
                  onChange={(e) =>
                    setEditDate(
                      e.target.value
                    )
                  }
                  className="w-full bg-slate-50 border rounded-xl px-4 py-3"
                />

                <input
                  value={
                    editEngineer
                  }
                  onChange={(e) =>
                    setEditEngineer(
                      e.target.value
                    )
                  }
                  placeholder="Engineer"
                  className="w-full bg-slate-50 border rounded-xl px-4 py-3"
                />

                <textarea
                  rows={4}
                  value={
                    editNotes
                  }
                  onChange={(e) =>
                    setEditNotes(
                      e.target.value
                    )
                  }
                  placeholder="Notes"
                  className="w-full bg-slate-50 border rounded-xl px-4 py-3"
                />

              </div>

              <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">

                <button
                  onClick={() =>
                    setEditOpen(false)
                  }
                  className="px-5 py-2.5 border rounded-xl font-bold"
                >
                  Cancel
                </button>

                <button
                  onClick={saveEdit}
                  disabled={
                    saving ||
                    !editDate
                  }
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black"
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            </div>

          </div>
        )}

      {/* DELETE MODAL */}

      {deleteTarget && (
        <div className="fixed inset-0 z-[120] bg-slate-950/50 flex items-center justify-center p-4">

          <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl p-6">

            <div className="w-12 h-12 bg-red-50 text-red-700 rounded-xl flex items-center justify-center">
              <Trash2 size={21} />
            </div>

            <h2 className="text-xl font-black mt-4">
              Delete PPM Record?
            </h2>

            <p className="text-slate-500 mt-2">
              Record dated{" "}
              <strong>
                {deleteTarget.ppm_date}
              </strong>{" "}
              will be permanently deleted.
            </p>

            <div className="flex justify-end gap-3 mt-6">

              <button
                onClick={() =>
                  setDeleteTarget(
                    null
                  )
                }
                className="px-5 py-2.5 border rounded-xl font-bold"
              >
                Cancel
              </button>

              <button
                onClick={
                  confirmDelete
                }
                disabled={saving}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-black"
              >
                {saving
                  ? "Deleting..."
                  : "Delete"}
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}


