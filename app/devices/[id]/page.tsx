"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  Activity,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  History,
  MapPin,
  MonitorCog,
  Paperclip,
  Pencil,
  Plus,
  Stethoscope,
  Wrench,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";

type Device = {
  id: string;
  device_description: string;
  serial_number: string;
  user_status: string;
  software_version: string | null;
  customer_name: string | null;
  city: string | null;
  installation_date: string | null;
  created_at: string;
  last_ppm_date: string | null;
  next_ppm_date: string | null;
  ppm_engineer: string | null;
  ppm_notes: string | null;
};

type PPM = {
  id: string;
  ppm_date: string;
  engineer: string | null;
  notes: string | null;
  next_ppm_date: string;
  created_at: string;
};

type CM = {
  id: string;
  cm_date: string;
  engineer: string | null;
  issue_type: string | null;
  issue_description: string;
  diagnosis: string | null;
  action_taken: string | null;
  parts_used: string | null;
  result: string | null;
  device_status_after: string | null;
  notes: string | null;
  created_at: string;
};

type FileItem = {
  id: string;
  history_id: string;
  file_name: string;
  file_url: string | null;
  type: "PPM" | "CM";
};

function ppmStatus(nextDate: string | null) {
  if (!nextDate) return "Not Scheduled";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const next = new Date(nextDate + "T00:00:00");

  const days = Math.ceil(
    (next.getTime() - today.getTime()) /
      86400000
  );

  if (days < 0) return "Overdue";
  if (days <= 30) return "Due Soon";
  return "OK";
}

function ppmBadge(status: string) {
  if (status === "OK")
    return "bg-emerald-100 text-emerald-700 border-emerald-200";

  if (status === "Due Soon")
    return "bg-orange-100 text-orange-700 border-orange-200";

  if (status === "Overdue")
    return "bg-red-100 text-red-700 border-red-200";

  return "bg-slate-100 text-slate-600 border-slate-200";
}

function deviceBadge(status: string) {
  if (status === "Operative")
    return "bg-emerald-100 text-emerald-700 border-emerald-200";

  if (status === "Store")
    return "bg-blue-100 text-blue-700 border-blue-200";

  if (status === "Scrapped")
    return "bg-red-100 text-red-700 border-red-200";

  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function DeviceDetailsPage() {
  const params = useParams();
  const deviceId = String(params.id);

  const [device, setDevice] =
    useState<Device | null>(null);

  const [ppmHistory, setPpmHistory] =
    useState<PPM[]>([]);

  const [cmHistory, setCmHistory] =
    useState<CM[]>([]);

  const [files, setFiles] =
    useState<FileItem[]>([]);

  const [tab, setTab] =
    useState("overview");

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [cmOpen, setCmOpen] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [cmDate, setCmDate] =
    useState("");

  const [engineer, setEngineer] =
    useState("");

  const [issueType, setIssueType] =
    useState("");

  const [issueDescription, setIssueDescription] =
    useState("");

  const [diagnosis, setDiagnosis] =
    useState("");

  const [actionTaken, setActionTaken] =
    useState("");

  const [partsUsed, setPartsUsed] =
    useState("");

  const [result, setResult] =
    useState("");

  const [deviceStatusAfter, setDeviceStatusAfter] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [cmFiles, setCmFiles] =
    useState<File[]>([]);

  const [issueOther, setIssueOther] = useState("");

  const [editingCmId, setEditingCmId] = useState<string | null>(null);

  async function loadDevice() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: deviceData,
        error: deviceError,
      } = await supabase
        .from("devices_v2")
        .select("*")
        .eq("id", deviceId)
        .single();

      if (deviceError) throw deviceError;

      setDevice(deviceData);

      const {
        data: ppmData,
        error: ppmError,
      } = await supabase
        .from("ppm_history")
        .select("*")
        .eq("device_id", deviceId)
        .order("ppm_date", {
          ascending: false,
        });

      if (ppmError) throw ppmError;

      setPpmHistory(ppmData || []);

      const {
        data: cmData,
        error: cmError,
      } = await supabase
        .from("cm_history")
        .select("*")
        .eq("device_id", deviceId)
        .order("cm_date", {
          ascending: false,
        });

      if (cmError) throw cmError;

      setCmHistory(cmData || []);

      const { data: ppmFiles } =
        await supabase
          .from("ppm_attachments")
          .select(
            "id, ppm_history_id, file_name, file_url"
          )
          .eq("device_id", deviceId);

      const { data: cmFilesData } =
        await supabase
          .from("cm_attachments")
          .select(
            "id, cm_history_id, file_name, file_url"
          )
          .eq("device_id", deviceId);

      const combined: FileItem[] = [
        ...(ppmFiles || []).map(
          (file: any) => ({
            id: file.id,
            history_id:
              file.ppm_history_id,
            file_name: file.file_name,
            file_url: file.file_url,
            type: "PPM" as const,
          })
        ),

        ...(cmFilesData || []).map(
          (file: any) => ({
            id: file.id,
            history_id:
              file.cm_history_id,
            file_name: file.file_name,
            file_url: file.file_url,
            type: "CM" as const,
          })
        ),
      ];

      setFiles(combined);
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Unable to load device."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (deviceId) {
      loadDevice();
    }
  }, [deviceId]);

  function openCM() {
    setCmDate(
      new Date()
        .toISOString()
        .split("T")[0]
    );

    setEngineer("");
    setIssueType("");
    setIssueDescription("");
    setDiagnosis("");
    setActionTaken("");
    setPartsUsed("");
    setResult("");
    setDeviceStatusAfter(
      device?.user_status || ""
    );
    setNotes("");
    setEditingCmId(null);
    setIssueOther("");
    setCmFiles([]);
    setMessage("");
    setCmOpen(true);
  }

  function openEditCM(record: CM) {
    const knownTypes = [
      "Hardware",
      "Software",
      "Network",
      "Power",
      "Accessory",
      "User Reported",
    ];
    const type = record.issue_type || "";

    setEditingCmId(record.id);
    setCmDate(record.cm_date);
    setEngineer(record.engineer || "");

    if (knownTypes.includes(type)) {
      setIssueType(type);
      setIssueOther("");
    } else if (type) {
      setIssueType("Other");
      setIssueOther(
        type === "Other" ? "" : type.replace(/^Other:\s*/, "")
      );
    } else {
      setIssueType("");
      setIssueOther("");
    }

    setIssueDescription(record.issue_description || "");
    setDiagnosis(record.diagnosis || "");
    setActionTaken(record.action_taken || "");
    setPartsUsed(record.parts_used || "");
    setResult(record.result || "");
    setDeviceStatusAfter(record.device_status_after || "");
    setNotes(record.notes || "");
    setCmFiles([]);
    setMessage("");
    setCmOpen(true);
  }

  async function saveCM() {
    if (!device) return;

    if (
      !cmDate ||
      !issueDescription.trim()
    ) {
      setMessage(
        "CM date and issue description are required."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const finalIssueType =
        issueType === "Other"
          ? issueOther.trim()
            ? `Other: ${issueOther.trim()}`
            : "Other"
          : issueType.trim();

      const cmPayload = {
        cm_date: cmDate,
        engineer: engineer.trim() || null,
        issue_type: finalIssueType || null,
        issue_description: issueDescription.trim(),
        diagnosis: diagnosis.trim() || null,
        action_taken: actionTaken.trim() || null,
        parts_used: partsUsed.trim() || null,
        result: result.trim() || null,
        device_status_after: deviceStatusAfter || null,
        notes: notes.trim() || null,
      };

      let cmRecord: { id: string };

      if (editingCmId) {
        const { error: updateError } = await supabase
          .from("cm_history")
          .update(cmPayload)
          .eq("id", editingCmId);

        if (updateError) throw updateError;

        cmRecord = { id: editingCmId };
      } else {
        const { data: inserted, error: insertError } =
          await supabase
            .from("cm_history")
            .insert({
              device_id: device.id,
              ...cmPayload,
              created_by: user?.email || null,
            })
            .select("id")
            .single();

        if (insertError) throw insertError;

        cmRecord = inserted;
      }

      for (const file of cmFiles) {
        const safeName =
          file.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );

        const path =
          `${device.id}/${cmRecord.id}/` +
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}-${safeName}`;

        const { error: uploadError } =
          await supabase.storage
            .from("cm-attachments")
            .upload(path, file);

        if (uploadError)
          throw uploadError;

        const { data: publicData } =
          supabase.storage
            .from("cm-attachments")
            .getPublicUrl(path);

        const {
          error: attachmentError,
        } = await supabase
          .from("cm_attachments")
          .insert({
            cm_history_id:
              cmRecord.id,
            device_id: device.id,
            file_name: file.name,
            file_path: path,
            file_url:
              publicData.publicUrl,
          });

        if (attachmentError)
          throw attachmentError;
      }

      if (
        !editingCmId &&
        deviceStatusAfter &&
        deviceStatusAfter !==
          device.user_status
      ) {
        await supabase
          .from("devices_v2")
          .update({
            user_status:
              deviceStatusAfter,
          })
          .eq("id", device.id);
      }

      await logActivity({
        action_type: editingCmId ? "EDIT_CM" : "ADD_CM",
        device_id: device.id,
        device_name:
          device.device_description,
        serial_number:
          device.serial_number,
        hospital_name:
          device.customer_name,
        city: device.city,
        description: editingCmId
          ? `Corrective maintenance edited: ${issueDescription.trim()}`
          : `Corrective maintenance added: ${issueDescription.trim()}`,
        new_value: {
          cm_date: cmDate,
          engineer:
            engineer.trim() || null,
          issue_type:
            finalIssueType || null,
          issue_description:
            issueDescription.trim(),
          result:
            result.trim() || null,
          attachments:
            cmFiles.length,
        },
      });

      setCmOpen(false);

      await loadDevice();

      setTab("cm");
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Unable to save CM."
      );
    } finally {
      setSaving(false);
    }
  }

  const timeline = useMemo(() => {
    const ppm = ppmHistory.map(
      (item) => ({
        id: item.id,
        type: "PPM",
        date: item.ppm_date,
        title:
          "Preventive Maintenance",
        engineer: item.engineer,
        description:
          item.notes ||
          "PPM completed",
      })
    );

    const cm = cmHistory.map(
      (item) => ({
        id: item.id,
        type: "CM",
        date: item.cm_date,
        title:
          item.issue_type ||
          "Corrective Maintenance",
        engineer: item.engineer,
        description:
          item.issue_description,
      })
    );

    return [...ppm, ...cm].sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    );
  }, [ppmHistory, cmHistory]);

  if (loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center">

        <div className="text-center">

          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />

          <p className="mt-4 font-bold text-slate-700">
            Loading device record...
          </p>

        </div>

      </main>
    );
  }

  if (!device) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center text-slate-600">
        Device not found.
      </main>
    );
  }

  const ppmState =
    ppmStatus(
      device.next_ppm_date
    );

  const latestService =
    timeline.length > 0
      ? timeline[0].date
      : "-";

  const tabs = [
    {
      value: "overview",
      label: "Overview",
      icon: MonitorCog,
    },
    {
      value: "ppm",
      label: "PPM History",
      icon: CalendarDays,
    },
    {
      value: "cm",
      label: "CM History",
      icon: Wrench,
    },
    {
      value: "files",
      label: "Attachments",
      icon: Paperclip,
    },
    {
      value: "timeline",
      label: "Full Timeline",
      icon: History,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f5f7fb]">

      <div className="max-w-[1500px] mx-auto px-5 lg:px-8 py-8">

        {/* BREADCRUMB */}

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">

          <Link
            href="/devices"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-700 font-bold"
          >
            <ArrowLeft size={17} />
            Devices
          </Link>

          <div className="flex flex-wrap gap-3">

            <Link
              href={`/devices/${device.id}/edit`}
              className="inline-flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 rounded-xl font-bold text-slate-700"
            >
              <Pencil size={17} />
              Edit Device
            </Link>

            <Link
              href="/ppm"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-black"
            >
              <CalendarDays size={17} />
              PPM
            </Link>

            <button
              onClick={openCM}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-black"
            >
              <Plus size={17} />
              New CM
            </button>

          </div>

        </div>

        {/* HERO */}

        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#102a56] via-[#16468d] to-[#2563eb] shadow-xl shadow-blue-100">

          <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-white/10" />

          <div className="absolute right-[28%] -bottom-40 w-80 h-80 rounded-full bg-blue-300/10" />

          <div className="relative p-7 md:p-10">

            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">

              <div>

                <div className="flex flex-wrap items-center gap-3">

                  <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-blue-50 px-3 py-1.5 rounded-full text-xs font-black tracking-wider">
                    <Stethoscope size={14} />
                    DIGITAL SERVICE RECORD
                  </span>

                  <span
                    className={`border px-3 py-1.5 rounded-full text-xs font-black ${deviceBadge(
                      device.user_status
                    )}`}
                  >
                    {device.user_status}
                  </span>

                </div>

                <h1 className="text-3xl md:text-5xl font-black text-white mt-5">
                  {device.device_description}
                </h1>

                <p className="text-blue-100 text-lg mt-3">
                  Serial Number:{" "}
                  <span className="font-black text-white">
                    {device.serial_number}
                  </span>
                </p>

                <div className="flex flex-wrap gap-x-7 gap-y-3 mt-6 text-blue-100">

                  <span className="inline-flex items-center gap-2">
                    <Building2 size={17} />
                    {device.customer_name ||
                      "No Hospital"}
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <MapPin size={17} />
                    {device.city ||
                      "No City"}
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <MonitorCog size={17} />
                    {device.software_version ||
                      "Software N/A"}
                  </span>

                </div>

              </div>

              <div className="grid grid-cols-2 gap-3 xl:min-w-[370px]">

                <div className="bg-white/10 border border-white/10 backdrop-blur rounded-2xl p-5">

                  <p className="text-xs text-blue-200 font-bold">
                    PPM STATUS
                  </p>

                  <span
                    className={`inline-flex border px-3 py-1.5 rounded-full text-sm font-black mt-3 ${ppmBadge(
                      ppmState
                    )}`}
                  >
                    {ppmState}
                  </span>

                </div>

                <div className="bg-white/10 border border-white/10 backdrop-blur rounded-2xl p-5">

                  <p className="text-xs text-blue-200 font-bold">
                    NEXT PPM
                  </p>

                  <p className="font-black text-white text-lg mt-3">
                    {device.next_ppm_date ||
                      "Not Scheduled"}
                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* KPI */}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

            <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center">
              <CalendarDays size={20} />
            </div>

            <p className="text-sm text-slate-500 font-semibold mt-4">
              Total PPM
            </p>

            <p className="text-3xl font-black mt-1">
              {ppmHistory.length}
            </p>

          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

            <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
              <Wrench size={20} />
            </div>

            <p className="text-sm text-slate-500 font-semibold mt-4">
              Total CM
            </p>

            <p className="text-3xl font-black mt-1">
              {cmHistory.length}
            </p>

          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

            <div className="w-10 h-10 bg-violet-50 text-violet-700 rounded-xl flex items-center justify-center">
              <Clock3 size={20} />
            </div>

            <p className="text-sm text-slate-500 font-semibold mt-4">
              Last Service
            </p>

            <p className="font-black text-lg mt-2">
              {latestService}
            </p>

          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

            <div className="w-10 h-10 bg-orange-50 text-orange-700 rounded-xl flex items-center justify-center">
              <Paperclip size={20} />
            </div>

            <p className="text-sm text-slate-500 font-semibold mt-4">
              Attachments
            </p>

            <p className="text-3xl font-black mt-1">
              {files.length}
            </p>

          </div>

        </div>

        {/* TABS */}

        <div className="bg-white border border-slate-200 rounded-2xl p-2 mt-6 flex gap-2 overflow-x-auto shadow-sm">

          {tabs.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.value}
                onClick={() =>
                  setTab(item.value)
                }
                className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap text-sm font-black transition ${
                  tab === item.value
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}

        </div>

        {/* OVERVIEW */}

        {tab === "overview" && (
          <div className="grid xl:grid-cols-3 gap-6 mt-6">

            <section className="xl:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">

              <div className="flex items-center gap-3">
                <MonitorCog
                  className="text-blue-600"
                  size={22}
                />
                <h2 className="text-xl font-black">
                  Device Information
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-7">

                {[
                  ["Serial Number", device.serial_number],
                  ["Hospital", device.customer_name || "-"],
                  ["City", device.city || "-"],
                  ["Software Version", device.software_version || "-"],
                  ["Installation Date", device.installation_date || "-"],
                  ["Current Status", device.user_status],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="bg-slate-50 border border-slate-100 rounded-2xl p-4"
                  >
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 font-black">
                      {label}
                    </p>

                    <p className="font-bold text-slate-800 mt-2">
                      {value}
                    </p>
                  </div>
                ))}

              </div>

            </section>

            <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">

              <div className="flex items-center gap-3">
                <Activity
                  className="text-emerald-600"
                  size={22}
                />

                <h2 className="text-xl font-black">
                  Maintenance Summary
                </h2>
              </div>

              <div className="space-y-3 mt-6">

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">

                  <p className="text-xs text-blue-600 font-bold">
                    LAST PPM
                  </p>

                  <p className="text-lg font-black mt-1">
                    {device.last_ppm_date ||
                      "-"}
                  </p>

                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">

                  <p className="text-xs text-orange-600 font-bold">
                    NEXT PPM
                  </p>

                  <p className="text-lg font-black mt-1">
                    {device.next_ppm_date ||
                      "Not Scheduled"}
                  </p>

                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">

                  <p className="text-xs text-emerald-700 font-bold">
                    LAST PPM ENGINEER
                  </p>

                  <p className="text-lg font-black mt-1">
                    {device.ppm_engineer ||
                      "-"}
                  </p>

                </div>

              </div>

            </section>

          </div>
        )}

        {/* PPM */}

        {tab === "ppm" && (
          <div className="mt-6">

            <div className="flex items-center justify-between mb-5">

              <div>
                <h2 className="text-xl font-black">
                  Preventive Maintenance History
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Complete PPM service history for this device.
                </p>
              </div>

              <Link
                href="/ppm"
                className="bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl font-bold"
              >
                PPM Management
              </Link>

            </div>

            <div className="space-y-4">

              {ppmHistory.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-14 text-center">

                  <CalendarDays
                    className="mx-auto text-slate-300"
                    size={34}
                  />

                  <p className="font-black mt-4">
                    No PPM history yet
                  </p>

                </div>
              ) : (
                ppmHistory.map(
                  (record) => {

                    const recordFiles =
                      files.filter(
                        (file) =>
                          file.type ===
                            "PPM" &&
                          file.history_id ===
                            record.id
                      );

                    return (
                      <div
                        key={record.id}
                        className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
                      >

                        <div className="flex flex-wrap justify-between gap-5">

                          <div>

                            <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-full text-xs font-black">
                              <CheckCircle2 size={14} />
                              PPM COMPLETED
                            </span>

                            <h3 className="text-2xl font-black mt-4">
                              {record.ppm_date}
                            </h3>

                            <p className="text-slate-500 mt-2">
                              Next scheduled PPM:{" "}
                              <strong>
                                {record.next_ppm_date}
                              </strong>
                            </p>

                          </div>

                          <div className="bg-slate-50 rounded-2xl p-4 min-w-[170px]">

                            <p className="text-xs text-slate-400 font-bold">
                              ENGINEER
                            </p>

                            <p className="font-black mt-1">
                              {record.engineer ||
                                "-"}
                            </p>

                          </div>

                        </div>

                        {record.notes && (
                          <div className="bg-slate-50 rounded-2xl p-4 mt-5">

                            <p className="text-xs text-slate-400 font-bold">
                              NOTES
                            </p>

                            <p className="mt-2 text-slate-700">
                              {record.notes}
                            </p>

                          </div>
                        )}

                        {recordFiles.length >
                          0 && (
                          <div className="flex flex-wrap gap-2 mt-5">

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
                                  className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-xl text-sm font-bold"
                                >
                                  <Paperclip
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
        )}

        {/* CM */}

        {tab === "cm" && (
          <div className="mt-6">

            <div className="flex flex-wrap justify-between items-center gap-4 mb-5">

              <div>
                <h2 className="text-xl font-black">
                  Corrective Maintenance
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Failures, diagnostics and corrective actions.
                </p>
              </div>

              <button
                onClick={openCM}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-black"
              >
                <Plus size={17} />
                New CM
              </button>

            </div>

            <div className="space-y-4">

              {cmHistory.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-14 text-center">

                  <Wrench
                    className="mx-auto text-slate-300"
                    size={34}
                  />

                  <p className="font-black mt-4">
                    No CM history yet
                  </p>

                  <button
                    onClick={openCM}
                    className="text-emerald-700 font-bold mt-3"
                  >
                    Add first maintenance record
                  </button>

                </div>
              ) : (
                cmHistory.map(
                  (record) => {

                    const recordFiles =
                      files.filter(
                        (file) =>
                          file.type ===
                            "CM" &&
                          file.history_id ===
                            record.id
                      );

                    return (
                      <div
                        key={record.id}
                        className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
                      >

                        <div className="flex flex-wrap justify-between gap-5">

                          <div>

                            <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-full text-xs font-black">
                              <Wrench size={14} />
                              CM
                            </span>

                            <h3 className="text-2xl font-black mt-4">
                              {record.issue_type ||
                                "Corrective Maintenance"}
                            </h3>

                            <p className="text-slate-500 mt-1">
                              {record.cm_date}
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                openEditCM(record)
                              }
                              className="mt-3 inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-black text-slate-700"
                            >
                              <Pencil size={15} />
                              Edit
                            </button>

                          </div>

                          <div className="bg-slate-50 rounded-2xl p-4 min-w-[170px]">

                            <p className="text-xs text-slate-400 font-bold">
                              ENGINEER
                            </p>

                            <p className="font-black mt-1">
                              {record.engineer ||
                                "-"}
                            </p>

                          </div>

                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mt-6">

                          {[
                            [
                              "Description of Problem",
                              record.issue_description,
                            ],
                            [
                              "Diagnosis",
                              record.diagnosis ||
                                "-",
                            ],
                            [
                              "Service Performed",
                              record.action_taken ||
                                "-",
                            ],
                            [
                              "Result",
                              record.result ||
                                "-",
                            ],
                            [
                              "Parts Used",
                              record.parts_used ||
                                "-",
                            ],
                            [
                              "Status After Service",
                              record.device_status_after ||
                                "-",
                            ],
                          ].filter(([, value]) => value && value !== "-").map(
                            ([label, value]) => (
                              <div
                                key={
                                  label
                                }
                                className="bg-slate-50 rounded-2xl p-4"
                              >
                                <p className="text-[11px] uppercase text-slate-400 font-black">
                                  {
                                    label
                                  }
                                </p>

                                <p className="mt-2 text-slate-700 font-semibold">
                                  {
                                    value
                                  }
                                </p>
                              </div>
                            )
                          )}

                        </div>

                        {recordFiles.length >
                          0 && (
                          <div className="flex flex-wrap gap-2 mt-5">

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
                                  className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl text-sm font-bold"
                                >
                                  <Paperclip
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
        )}

        {/* FILES */}

        {tab === "files" && (
          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-6">

            <div className="flex items-center gap-3">

              <FolderOpen
                className="text-orange-600"
                size={22}
              />

              <div>
                <h2 className="text-xl font-black">
                  All Attachments
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  PPM and CM documents in one place.
                </p>
              </div>

            </div>

            {files.length === 0 ? (
              <div className="py-14 text-center text-slate-400">
                No attachments available.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">

                {files.map((file) => (
                  <a
                    key={`${file.type}-${file.id}`}
                    href={
                      file.file_url ||
                      "#"
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="group border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-2xl p-5 transition"
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                      <FileText size={21} />
                    </div>

                    <span className="inline-flex mt-4 bg-slate-100 text-slate-600 rounded-full px-2.5 py-1 text-xs font-black">
                      {file.type}
                    </span>

                    <p className="font-black mt-3 truncate group-hover:text-blue-700">
                      {file.file_name}
                    </p>

                  </a>
                ))}

              </div>
            )}

          </section>
        )}

        {/* TIMELINE */}

        {tab === "timeline" && (
          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-6">

            <div className="flex items-center gap-3">

              <History
                className="text-violet-600"
                size={22}
              />

              <div>
                <h2 className="text-xl font-black">
                  Full Service Timeline
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Complete chronological history of PPM and CM.
                </p>
              </div>

            </div>

            <div className="mt-8">

              {timeline.length === 0 ? (
                <p className="text-slate-400 text-center py-12">
                  No service history yet.
                </p>
              ) : (
                timeline.map(
                  (item, index) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="relative pl-12 pb-9"
                    >

                      {index !==
                        timeline.length -
                          1 && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-slate-200" />
                      )}

                      <div
                        className={`absolute left-0 top-0 w-8 h-8 rounded-full border-4 border-white shadow ${
                          item.type ===
                          "PPM"
                            ? "bg-blue-500"
                            : "bg-emerald-500"
                        }`}
                      />

                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">

                        <div className="flex flex-wrap justify-between gap-3">

                          <div>

                            <span
                              className={`text-xs font-black ${
                                item.type ===
                                "PPM"
                                  ? "text-blue-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {item.type}
                            </span>

                            <p className="font-black text-lg mt-1">
                              {item.title}
                            </p>

                            <p className="text-slate-600 mt-2">
                              {
                                item.description
                              }
                            </p>

                            {item.engineer && (
                              <p className="text-sm text-slate-400 mt-3">
                                Engineer:{" "}
                                {
                                  item.engineer
                                }
                              </p>
                            )}

                          </div>

                          <span className="text-sm text-slate-500 font-bold">
                            {item.date}
                          </span>

                        </div>

                      </div>

                    </div>
                  )
                )
              )}

            </div>

          </section>
        )}

        {message && !cmOpen && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
            {message}
          </div>
        )}

      </div>

      {/* CM MODAL */}

      {cmOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl">

            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-5 flex justify-between gap-4">

              <div>

                <p className="text-xs text-emerald-600 font-black tracking-wider">
                  CORRECTIVE MAINTENANCE
                </p>

                <h2 className="text-2xl font-black mt-1">
                  {editingCmId
                    ? "Edit Maintenance Record"
                    : "New Maintenance Record"}
                </h2>

                <p className="text-slate-500 mt-1">
                  {device.device_description} •{" "}
                  {device.serial_number}
                </p>

              </div>

              <button
                onClick={() =>
                  setCmOpen(false)
                }
                className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-500"
              >
                <X size={20} />
              </button>

            </div>

            <div className="p-6 grid md:grid-cols-2 gap-5">

              <div>
                <label className="text-sm font-black">
                  CM Date *
                </label>

                <input
                  type="date"
                  value={cmDate}
                  onChange={(e) =>
                    setCmDate(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                />
              </div>

              <div>
                <label className="text-sm font-black">
                  Engineer
                </label>

                <input
                  value={engineer}
                  onChange={(e) =>
                    setEngineer(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                />
              </div>

              <div>
                <label className="text-sm font-black">
                  Issue Type
                </label>

                <select
                  value={issueType}
                  onChange={(e) =>
                    setIssueType(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                >
                  <option value="">
                    Select Issue
                  </option>
                  <option>Hardware</option>
                  <option>Software</option>
                  <option>Network</option>
                  <option>Power</option>
                  <option>Accessory</option>
                  <option>User Reported</option>
                  <option>Other</option>
                </select>
              </div>

              {issueType === "Other" && (
                <div className="md:col-span-2">
                  <label className="text-sm font-black">
                    Specify Issue Type
                  </label>

                  <input
                    value={issueOther}
                    onChange={(e) =>
                      setIssueOther(e.target.value)
                    }
                    placeholder="Write the issue type"
                    className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-black">
                  Status After Service
                </label>

                <select
                  value={
                    deviceStatusAfter
                  }
                  onChange={(e) =>
                    setDeviceStatusAfter(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                >
                  <option value="">
                    No Change
                  </option>
                  <option value="Operative">
                    Operative
                  </option>
                  <option value="Store">
                    Store
                  </option>
                  <option value="Scrapped">
                    Scrapped
                  </option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-black">
                  Description of Problem *
                </label>

                <textarea
                  rows={3}
                  value={
                    issueDescription
                  }
                  onChange={(e) =>
                    setIssueDescription(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                />
              </div>


              <div className="md:col-span-2">
                <label className="text-sm font-black">
                  Service Performed
                </label>

                <textarea
                  rows={3}
                  value={
                    actionTaken
                  }
                  onChange={(e) =>
                    setActionTaken(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-black">
                  Parts Used
                </label>

                <input
                  value={partsUsed}
                  onChange={(e) =>
                    setPartsUsed(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                />
              </div>


              <div className="md:col-span-2">
                <label className="text-sm font-black">
                  Notes
                </label>

                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) =>
                    setNotes(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                />
              </div>

              <div className="md:col-span-2">

                <label className="text-sm font-black">
                  Attachments
                </label>

                <input
                  type="file"
                  multiple
                  onChange={(e) =>
                    setCmFiles(
                      e.target.files
                        ? Array.from(
                            e.target.files
                          )
                        : []
                    )
                  }
                  className="mt-2 w-full border-2 border-dashed border-slate-200 rounded-2xl p-5 bg-slate-50"
                />

                {cmFiles.length > 0 && (
                  <p className="text-sm font-bold text-emerald-600 mt-2">
                    {cmFiles.length} file(s) selected
                  </p>
                )}

              </div>

              {message && (
                <div className="md:col-span-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
                  {message}
                </div>
              )}

            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3">

              <button
                onClick={() =>
                  setCmOpen(false)
                }
                disabled={saving}
                className="px-5 py-3 rounded-xl border border-slate-300 bg-white font-bold"
              >
                Cancel
              </button>

              <button
                onClick={saveCM}
                disabled={
                  saving ||
                  !cmDate ||
                  !issueDescription.trim()
                }
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-black"
              >
                <Wrench size={17} />

                {saving
                  ? "Saving..."
                  : editingCmId
                    ? "Save Changes"
                    : "Save CM Record"}
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}
