"use client";

import Link from "next/link";
import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

type PreviewRow = {
  device_description: string;
  serial_number: string;
  user_status: string;
  software_version: string;
  customer_name: string;
  installation_date: string;
  comment: string;
};

type ImportResult = {
  added: number;
  updated: number;
  skipped: number;
  failed: number;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeStatus(value: unknown) {
  const text = clean(value).toLowerCase();

  if (text === "scrapped") return "Scrapped";
  if (text === "store") return "Store";

  return "Operative";
}

function excelDate(value: unknown) {
  if (!value) return "";

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (!parsed) return "";

    const year = parsed.y;
    const month = String(parsed.m).padStart(2, "0");
    const day = String(parsed.d).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const text = clean(value);

  const date = new Date(text);

  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return text;
}

function getValue(
  row: Record<string, unknown>,
  names: string[]
) {
  const keys = Object.keys(row);

  for (const name of names) {
    const key = keys.find(
      (k) =>
        k.trim().toLowerCase() ===
        name.trim().toLowerCase()
    );

    if (key) return row[key];
  }

  return "";
}

export default function ExcelManagementPage() {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<"skip" | "update">("skip");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFile(file: File) {
    setMessage("");
    setResult(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: false,
      });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const rawRows =
        XLSX.utils.sheet_to_json<Record<string, unknown>>(
          worksheet,
          {
            defval: "",
            raw: true,
          }
        );

      const mapped: PreviewRow[] = rawRows
        .map((row) => ({
          device_description: clean(
            getValue(row, [
              "Device Description",
              "Device Name",
              "Title",
              "Description",
            ])
          ),

          serial_number: clean(
            getValue(row, [
              "Device Serial Number",
              "Device Serial number",
              "Serial Number",
              "Serial",
            ])
          ),

          user_status: normalizeStatus(
            getValue(row, [
              "User Status",
              "Status",
            ])
          ),

          software_version: clean(
            getValue(row, [
              "Software Version",
              "Software",
              "SW Version",
            ])
          ),

          customer_name: clean(
            getValue(row, [
              "Customer Name",
              "Hospital",
              "Hospital Name",
              "Customer",
            ])
          ),

          installation_date: excelDate(
            getValue(row, [
              "Installation Date",
              "Install Date",
            ])
          ),

          comment: clean(
            getValue(row, [
              "Comment",
              "Comments",
              "Notes",
            ])
          ),
        }))
        .filter(
          (row) =>
            row.serial_number ||
            row.device_description
        );

      setRows(mapped);

      setMessage(
        `${mapped.length} row(s) loaded successfully.`
      );
    } catch (error: any) {
      console.error(error);
      setRows([]);
      setMessage(
        error?.message || "Unable to read Excel file."
      );
    }
  }

  async function importData() {
    if (rows.length === 0) {
      setMessage("Please select an Excel file first.");
      return;
    }

    const invalidRows = rows.filter(
      (row) =>
        !row.serial_number ||
        !row.device_description
    );

    if (invalidRows.length > 0) {
      setMessage(
        `${invalidRows.length} row(s) are missing Device Description or Serial Number.`
      );
      return;
    }

    setLoading(true);
    setMessage("");
    setResult(null);

    let added = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    try {
      const { data: existing, error: existingError } =
        await supabase
          .from("devices_v2")
          .select("id, serial_number");

      if (existingError) throw existingError;

      const serialMap = new Map(
        (existing || []).map((device) => [
          device.serial_number.trim().toLowerCase(),
          device.id,
        ])
      );

      for (const row of rows) {
        try {
          const serialKey =
            row.serial_number.trim().toLowerCase();

          const existingId = serialMap.get(serialKey);

          const payload = {
            device_description:
              row.device_description.trim(),
            serial_number:
              row.serial_number.trim(),
            user_status:
              normalizeStatus(row.user_status),
            software_version:
              row.software_version.trim() || null,
            customer_name:
              row.customer_name.trim() || null,
            installation_date:
              row.installation_date || null,
            comment:
              row.comment.trim() || null,
          };

          if (existingId) {
            if (mode === "skip") {
              skipped++;
              continue;
            }

            const { error } = await supabase
              .from("devices_v2")
              .update(payload)
              .eq("id", existingId);

            if (error) throw error;

            updated++;
          } else {
            const { data, error } = await supabase
              .from("devices_v2")
              .insert(payload)
              .select("id")
              .single();

            if (error) throw error;

            serialMap.set(
              serialKey,
              data.id
            );

            added++;
          }
        } catch (rowError) {
          console.error(rowError);
          failed++;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase
        .from("import_logs")
        .insert({
          file_name: fileName,
          total_rows: rows.length,
          added_rows: added,
          updated_rows: updated,
          skipped_rows: skipped,
          failed_rows: failed,
          imported_by: user?.email || null,
        });

      setResult({
        added,
        updated,
        skipped,
        failed,
      });

      setMessage("Import completed.");
    } catch (error: any) {
      console.error(error);

      setMessage(
        error?.message || "Import failed."
      );
    } finally {
      setLoading(false);
    }
  }

  async function exportDevices() {
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("devices_v2")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) throw error;

      const exportRows = (data || []).map(
        (device) => ({
          "Device Description":
            device.device_description,
          "Device Serial Number":
            device.serial_number,
          "User Status":
            device.user_status,
          "Software Version":
            device.software_version || "",
          "Customer Name":
            device.customer_name || "",
          "Installation Date":
            device.installation_date || "",
          "Comment":
            device.comment || "",
          "Created By":
            device.created_by || "",
          "Created At":
            device.created_at || "",
        })
      );

      const worksheet =
        XLSX.utils.json_to_sheet(exportRows);

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Devices"
      );

      XLSX.writeFile(
        workbook,
        `Philips-Devices-${
          new Date()
            .toISOString()
            .slice(0, 10)
        }.xlsx`
      );
    } catch (error: any) {
      console.error(error);

      setMessage(
        error?.message || "Export failed."
      );
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate() {
    const template = [
      {
        "Device Description":
          "Example Device",
        "Device Serial Number":
          "SN-0001",
        "User Status":
          "Operative",
        "Software Version":
          "1.0",
        "Customer Name":
          "Example Hospital",
        "Installation Date":
          "2026-09-11",
        "Comment":
          "Example notes",
      },
    ];

    const worksheet =
      XLSX.utils.json_to_sheet(template);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Template"
    );

    XLSX.writeFile(
      workbook,
      "Philips-Device-Import-Template.xlsx"
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">

      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div>
            <p className="text-blue-400 text-sm font-bold uppercase tracking-wider">
              Data Management
            </p>

            <h1 className="text-3xl font-bold mt-1">
              Excel Management Center
            </h1>

            <p className="text-slate-500 mt-2">
              Import, validate and export device data
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/"
              className="border border-slate-200 px-4 py-2.5 rounded-xl"
            >
              Dashboard
            </Link>

            <Link
              href="/devices"
              className="bg-blue-600 px-4 py-2.5 rounded-xl font-semibold"
            >
              Devices
            </Link>
          </div>

        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        <div className="grid lg:grid-cols-3 gap-5">

          <button
            type="button"
            onClick={downloadTemplate}
            className="text-left bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-500"
          >
            <p className="text-blue-400 font-bold">
              Download Template
            </p>

            <p className="text-sm text-slate-500 mt-2">
              Get the correct Excel structure for device imports.
            </p>
          </button>

          <button
            type="button"
            onClick={exportDevices}
            disabled={loading}
            className="text-left bg-white border border-slate-200 rounded-2xl p-6 hover:border-green-500"
          >
            <p className="text-green-400 font-bold">
              Export All Devices
            </p>

            <p className="text-sm text-slate-500 mt-2">
              Download the current database as an Excel file.
            </p>
          </button>

          <Link
            href="/devices"
            className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-violet-500"
          >
            <p className="text-violet-400 font-bold">
              Browse Database
            </p>

            <p className="text-sm text-slate-500 mt-2">
              Review and edit existing medical devices.
            </p>
          </Link>

        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6">

          <h2 className="text-xl font-bold">
            Import Excel
          </h2>

          <p className="text-slate-500 text-sm mt-1">
            XLSX and XLS files are supported.
          </p>

          <label className="mt-6 block border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-10 text-center cursor-pointer">

            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file =
                  e.target.files?.[0];

                if (file) {
                  handleFile(file);
                }
              }}
            />

            <p className="text-lg font-bold">
              Select Excel File
            </p>

            <p className="text-slate-500 mt-2">
              Click here to browse your computer
            </p>

            {fileName && (
              <p className="text-blue-400 mt-4 font-semibold">
                {fileName}
              </p>
            )}

          </label>

          <div className="mt-6">
            <p className="font-semibold mb-3">
              Duplicate Serial Number Behavior
            </p>

            <div className="grid sm:grid-cols-2 gap-4">

              <button
                type="button"
                onClick={() =>
                  setMode("skip")
                }
                className={`border rounded-2xl p-4 text-left ${
                  mode === "skip"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-200"
                }`}
              >
                <p className="font-bold">
                  Skip Existing
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  Existing serial numbers remain unchanged.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setMode("update")
                }
                className={`border rounded-2xl p-4 text-left ${
                  mode === "update"
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-slate-200"
                }`}
              >
                <p className="font-bold">
                  Update Existing
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  Excel data updates matching serial numbers.
                </p>
              </button>

            </div>
          </div>

        </div>

        {rows.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">

            <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">

              <div>
                <h2 className="text-xl font-bold">
                  Import Preview
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {rows.length} row(s) detected
                </p>
              </div>

              <button
                type="button"
                onClick={importData}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 px-6 py-3 rounded-xl font-bold"
              >
                {loading
                  ? "Importing..."
                  : `Import ${rows.length} Devices`}
              </button>

            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">

                <thead className="bg-white/5 text-slate-500">
                  <tr>
                    <th className="p-4 text-left">
                      Device
                    </th>
                    <th className="p-4 text-left">
                      Serial
                    </th>
                    <th className="p-4 text-left">
                      Status
                    </th>
                    <th className="p-4 text-left">
                      Software
                    </th>
                    <th className="p-4 text-left">
                      Customer
                    </th>
                    <th className="p-4 text-left">
                      Installation
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows
                    .slice(0, 20)
                    .map((row, index) => (
                      <tr
                        key={`${row.serial_number}-${index}`}
                        className="border-t border-white/5"
                      >
                        <td className="p-4">
                          {row.device_description || (
                            <span className="text-red-400">
                              Missing
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          {row.serial_number || (
                            <span className="text-red-400">
                              Missing
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          {row.user_status}
                        </td>

                        <td className="p-4">
                          {row.software_version || "-"}
                        </td>

                        <td className="p-4">
                          {row.customer_name || "-"}
                        </td>

                        <td className="p-4">
                          {row.installation_date || "-"}
                        </td>
                      </tr>
                    ))}
                </tbody>

              </table>
            </div>

            {rows.length > 20 && (
              <div className="p-4 border-t border-slate-200 text-center text-slate-500 text-sm">
                Previewing first 20 of {rows.length} rows.
              </div>
            )}

          </div>
        )}

        {result && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5">
              <p className="text-green-400">
                Added
              </p>

              <p className="text-4xl font-bold mt-2">
                {result.added}
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
              <p className="text-blue-400">
                Updated
              </p>

              <p className="text-4xl font-bold mt-2">
                {result.updated}
              </p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
              <p className="text-amber-400">
                Skipped
              </p>

              <p className="text-4xl font-bold mt-2">
                {result.skipped}
              </p>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
              <p className="text-red-400">
                Failed
              </p>

              <p className="text-4xl font-bold mt-2">
                {result.failed}
              </p>
            </div>

          </div>
        )}

        {message && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-slate-600">
            {message}
          </div>
        )}

      </div>
    </main>
  );
}

