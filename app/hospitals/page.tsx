"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";

type Hospital = {
  id: string;
  hospital_name: string;
  city: string;
  region: string | null;
  active: boolean;
};

type DeviceLocation = {
  id: string;
  customer_name: string | null;
  city: string | null;
};

const BASE_CITIES = [
  "Riyadh",
  "Jeddah",
  "Makkah",
  "Madinah",
  "Dammam",
  "Khobar",
  "Dhahran",
  "Jubail",
  "Al Ahsa",
  "Hofuf",
  "Qassim",
  "Unaizah",
  "Hail",
  "Tabuk",
  "Abha",
  "Jazan",
  "Najran",
  "Taif",
  "Arar",
  "Bisha",
];

function getRegion(city: string) {
  const central = [
    "Riyadh",
    "Qassim",
    "Unaizah",
  ];

  const western = [
    "Jeddah",
    "Makkah",
    "Madinah",
    "Taif",
  ];

  const eastern = [
    "Dammam",
    "Khobar",
    "Dhahran",
    "Jubail",
    "Al Ahsa",
    "Hofuf",
  ];

  const southern = [
    "Abha",
    "Jazan",
    "Najran",
    "Bisha",
  ];

  const northern = [
    "Hail",
    "Tabuk",
    "Arar",
  ];

  if (central.includes(city))
    return "Central";

  if (western.includes(city))
    return "Western";

  if (eastern.includes(city))
    return "Eastern";

  if (southern.includes(city))
    return "Southern";

  if (northern.includes(city))
    return "Northern";

  return null;
}

export default function HospitalsPage() {
  const [hospitals, setHospitals] =
    useState<Hospital[]>([]);

  const [devices, setDevices] =
    useState<DeviceLocation[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [cityFilter, setCityFilter] =
    useState("All");

  const [hospitalName, setHospitalName] =
    useState("");

  const [city, setCity] =
    useState("");

  const [customCity, setCustomCity] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [
    editingHospital,
    setEditingHospital,
  ] = useState<Hospital | null>(null);

  const [editName, setEditName] =
    useState("");

  const [editCity, setEditCity] =
    useState("");

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState<Hospital | null>(null);

  async function loadData() {
    setLoading(true);

    const [
      hospitalsResult,
      devicesResult,
    ] = await Promise.all([
      supabase
        .from("hospitals")
        .select(
          "id, hospital_name, city, region, active"
        )
        .order("city")
        .order("hospital_name"),

      supabase
        .from("devices_v2")
        .select(
          "id, customer_name, city"
        ),
    ]);

    if (hospitalsResult.error) {
      setMessage(
        hospitalsResult.error.message
      );
    } else {
      setHospitals(
        hospitalsResult.data || []
      );
    }

    if (!devicesResult.error) {
      setDevices(
        devicesResult.data || []
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const cities = useMemo(() => {
    return Array.from(
      new Set([
        ...BASE_CITIES,
        ...hospitals
          .map((hospital) =>
            hospital.city?.trim()
          )
          .filter(Boolean),
      ])
    ).sort();
  }, [hospitals]);

  const filterCities = useMemo(() => {
    return Array.from(
      new Set(
        hospitals
          .map(
            (hospital) =>
              hospital.city
          )
          .filter(Boolean)
      )
    ).sort();
  }, [hospitals]);

  const deviceCountForHospital = (
    hospital: Hospital
  ) => {
    return devices.filter(
      (device) =>
        device.customer_name ===
          hospital.hospital_name &&
        device.city === hospital.city
    ).length;
  };

  const filtered = useMemo(() => {
    const q =
      search.trim().toLowerCase();

    return hospitals.filter(
      (hospital) => {
        const cityMatch =
          cityFilter === "All" ||
          hospital.city === cityFilter;

        const text = [
          hospital.hospital_name,
          hospital.city,
          hospital.region,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          cityMatch &&
          (!q || text.includes(q))
        );
      }
    );
  }, [
    hospitals,
    search,
    cityFilter,
  ]);

  const activeCount =
    hospitals.filter(
      (hospital) => hospital.active
    ).length;

  const inactiveCount =
    hospitals.length - activeCount;

  const totalCities = new Set(
    hospitals.map(
      (hospital) => hospital.city
    )
  ).size;

  async function addHospital(
    e: React.FormEvent
  ) {
    e.preventDefault();

    const finalCity =
      city === "__OTHER__"
        ? customCity.trim()
        : city.trim();

    if (!hospitalName.trim()) {
      setMessage(
        "Hospital name is required."
      );
      return;
    }

    if (!finalCity) {
      setMessage(
        "City is required."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } =
        await supabase
          .from("hospitals")
          .insert({
            hospital_name:
              hospitalName.trim(),
            city: finalCity,
            region:
              getRegion(finalCity),
            has_cath_lab: true,
            active: true,
          });

      if (error) {
        if (
          error.code === "23505"
        ) {
          throw new Error(
            "This hospital already exists in this city."
          );
        }

        throw error;
      }

      await logActivity({
        action_type:
          "ADD_HOSPITAL",
        hospital_name:
          hospitalName.trim(),
        city: finalCity,
        description:
          `Added hospital ${hospitalName.trim()} in ${finalCity}`,
        new_value: {
          hospital_name:
            hospitalName.trim(),
          city: finalCity,
          region:
            getRegion(finalCity),
          active: true,
        },
      });

      setHospitalName("");
      setCity("");
      setCustomCity("");

      setMessage(
        "Hospital added successfully."
      );

      await loadData();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Failed to add hospital."
      );
    } finally {
      setSaving(false);
    }
  }

  function openEdit(
    hospital: Hospital
  ) {
    setEditingHospital(hospital);
    setEditName(
      hospital.hospital_name
    );
    setEditCity(hospital.city);
    setMessage("");
  }

  async function saveEdit() {
    if (!editingHospital)
      return;

    if (
      !editName.trim() ||
      !editCity.trim()
    ) {
      setMessage(
        "Hospital name and city are required."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const oldValue = {
        hospital_name:
          editingHospital.hospital_name,
        city:
          editingHospital.city,
        region:
          editingHospital.region,
      };

      const { error } =
        await supabase
          .from("hospitals")
          .update({
            hospital_name:
              editName.trim(),
            city:
              editCity.trim(),
            region:
              getRegion(
                editCity.trim()
              ),
          })
          .eq(
            "id",
            editingHospital.id
          );

      if (error) throw error;

      await logActivity({
        action_type:
          "EDIT_HOSPITAL",
        hospital_name:
          editName.trim(),
        city:
          editCity.trim(),
        description:
          `Updated hospital ${editingHospital.hospital_name}`,
        old_value: oldValue,
        new_value: {
          hospital_name:
            editName.trim(),
          city:
            editCity.trim(),
          region:
            getRegion(
              editCity.trim()
            ),
        },
      });

      setEditingHospital(null);

      setMessage(
        "Hospital updated successfully."
      );

      await loadData();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Failed to update hospital."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleHospital(
    hospital: Hospital
  ) {
    setMessage("");

    const newState =
      !hospital.active;

    const { error } =
      await supabase
        .from("hospitals")
        .update({
          active: newState,
        })
        .eq("id", hospital.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await logActivity({
      action_type:
        newState
          ? "ACTIVATE_HOSPITAL"
          : "DEACTIVATE_HOSPITAL",
      hospital_name:
        hospital.hospital_name,
      city: hospital.city,
      description:
        `${newState ? "Activated" : "Deactivated"} hospital ${hospital.hospital_name}`,
      old_value: {
        active:
          hospital.active,
      },
      new_value: {
        active: newState,
      },
    });

    await loadData();
  }

  async function confirmDelete() {
    if (!deleteTarget)
      return;

    setSaving(true);
    setMessage("");

    try {
      const hospital =
        deleteTarget;

      const { error } =
        await supabase
          .from("hospitals")
          .delete()
          .eq("id", hospital.id);

      if (error) throw error;

      await logActivity({
        action_type:
          "DELETE_HOSPITAL",
        hospital_name:
          hospital.hospital_name,
        city: hospital.city,
        description:
          `Deleted hospital ${hospital.hospital_name} - ${hospital.city}`,
        old_value: {
          hospital_name:
            hospital.hospital_name,
          city: hospital.city,
          region:
            hospital.region,
          active:
            hospital.active,
        },
      });

      setDeleteTarget(null);

      setMessage(
        "Hospital deleted successfully."
      );

      await loadData();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Failed to delete hospital."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb]">

      <div className="max-w-[1500px] mx-auto px-5 lg:px-8 py-8">

        {/* HERO */}

        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#102a56] via-[#16468d] to-[#2563eb] shadow-xl shadow-blue-100">

          <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-white/10" />

          <div className="relative p-7 md:p-10">

            <div className="flex items-center gap-2 text-blue-200">

              <Building2 size={19} />

              <p className="text-xs font-black tracking-[0.2em] uppercase">
                Customer Management
              </p>

            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white mt-3">
              Hospital Management Center
            </h1>

            <p className="text-blue-100 mt-3 max-w-2xl">
              Manage hospitals, cities,
              regions and installed medical
              devices from one place.
            </p>

          </div>

        </section>

        {/* KPIs */}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center">
              <Building2 size={20} />
            </div>

            <p className="text-sm text-slate-500 font-semibold mt-4">
              Total Hospitals
            </p>

            <p className="text-3xl font-black mt-1">
              {hospitals.length}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>

            <p className="text-sm text-slate-500 font-semibold mt-4">
              Active
            </p>

            <p className="text-3xl font-black text-emerald-600 mt-1">
              {activeCount}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
              <X size={20} />
            </div>

            <p className="text-sm text-slate-500 font-semibold mt-4">
              Inactive
            </p>

            <p className="text-3xl font-black text-slate-600 mt-1">
              {inactiveCount}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="w-10 h-10 bg-violet-50 text-violet-700 rounded-xl flex items-center justify-center">
              <MapPin size={20} />
            </div>

            <p className="text-sm text-slate-500 font-semibold mt-4">
              Cities
            </p>

            <p className="text-3xl font-black text-violet-600 mt-1">
              {totalCities}
            </p>
          </div>

        </div>

        {/* ADD HOSPITAL */}

        <form
          onSubmit={addHospital}
          className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-6"
        >

          <div className="flex items-center gap-3">

            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Plus size={20} />
            </div>

            <div>
              <h2 className="text-xl font-black">
                Add New Hospital
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Add a hospital branch to the system.
              </p>
            </div>

          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_auto] gap-4 mt-6">

            <input
              value={hospitalName}
              onChange={(e) =>
                setHospitalName(
                  e.target.value
                )
              }
              placeholder="Hospital name"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
            />

            <select
              value={city}
              onChange={(e) => {
                setCity(
                  e.target.value
                );

                if (
                  e.target.value !==
                  "__OTHER__"
                ) {
                  setCustomCity("");
                }
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
            >
              <option value="">
                Select City
              </option>

              {cities.map(
                (cityName) => (
                  <option
                    key={cityName}
                    value={cityName}
                  >
                    {cityName}
                  </option>
                )
              )}

              <option value="__OTHER__">
                Other City...
              </option>
            </select>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-6 py-3 rounded-xl font-black"
            >
              <Plus size={17} />
              {saving
                ? "Saving..."
                : "Add Hospital"}
            </button>

          </div>

          {city === "__OTHER__" && (
            <input
              value={customCity}
              onChange={(e) =>
                setCustomCity(
                  e.target.value
                )
              }
              placeholder="Enter new city name"
              className="mt-4 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
            />
          )}

        </form>

        {message && (
          <div className="mt-5 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl px-5 py-4">
            {message}
          </div>
        )}

        {/* LIST */}

        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm mt-6 overflow-hidden">

          <div className="p-6 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">

            <div>
              <h2 className="text-xl font-black">
                Hospital Network
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                {filtered.length} hospital branch(es)
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">

              <select
                value={cityFilter}
                onChange={(e) =>
                  setCityFilter(
                    e.target.value
                  )
                }
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
              >
                <option value="All">
                  All Cities
                </option>

                {filterCities.map(
                  (cityName) => (
                    <option
                      key={cityName}
                      value={cityName}
                    >
                      {cityName}
                    </option>
                  )
                )}
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
                  placeholder="Search hospital, city, region..."
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 sm:w-[330px]"
                />

              </div>

            </div>

          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-500">
              Loading hospitals...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              No hospitals found.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1000px]">

                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Hospital",
                      "City",
                      "Region",
                      "Devices",
                      "Status",
                      "Actions",
                    ].map((label) => (
                      <th
                        key={label}
                        className="text-left px-5 py-4 text-[11px] uppercase tracking-wider font-black text-slate-500"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>

                  {filtered.map(
                    (hospital) => (
                      <tr
                        key={hospital.id}
                        className="border-t border-slate-100 hover:bg-blue-50/30"
                      >

                        <td className="px-5 py-4">

                          <p className="font-black text-slate-900">
                            {hospital.hospital_name}
                          </p>

                          <p className="text-xs text-slate-400 mt-1">
                            Hospital Branch
                          </p>

                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {hospital.city}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {hospital.region ||
                            "-"}
                        </td>

                        <td className="px-5 py-4">

                          <span className="inline-flex bg-blue-50 text-blue-700 rounded-full px-3 py-1.5 font-black text-sm">
                            {deviceCountForHospital(
                              hospital
                            )}
                          </span>

                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex border px-3 py-1.5 rounded-full text-xs font-black ${
                              hospital.active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {hospital.active
                              ? "Active"
                              : "Inactive"}
                          </span>

                        </td>

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2">

                            <button
                              onClick={() =>
                                openEdit(
                                  hospital
                                )
                              }
                              className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded-xl text-sm font-bold"
                            >
                              <Pencil
                                size={15}
                              />
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                toggleHospital(
                                  hospital
                                )
                              }
                              className="bg-orange-50 text-orange-700 hover:bg-orange-100 px-3 py-2 rounded-xl text-sm font-bold"
                            >
                              {hospital.active
                                ? "Deactivate"
                                : "Activate"}
                            </button>

                            <button
                              onClick={() =>
                                setDeleteTarget(
                                  hospital
                                )
                              }
                              className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-700 hover:bg-red-100 rounded-xl"
                            >
                              <Trash2
                                size={16}
                              />
                            </button>

                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>

      {/* EDIT MODAL */}

      {editingHospital && (
        <div className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl">

            <div className="p-6 border-b border-slate-200 flex items-center justify-between">

              <div>
                <p className="text-xs text-blue-600 font-black">
                  HOSPITAL MANAGEMENT
                </p>

                <h2 className="text-xl font-black mt-1">
                  Edit Hospital
                </h2>
              </div>

              <button
                onClick={() =>
                  setEditingHospital(
                    null
                  )
                }
                className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center"
              >
                <X size={18} />
              </button>

            </div>

            <div className="p-6 space-y-5">

              <div>
                <label className="font-bold text-sm">
                  Hospital Name
                </label>

                <input
                  value={editName}
                  onChange={(e) =>
                    setEditName(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                />
              </div>

              <div>
                <label className="font-bold text-sm">
                  City
                </label>

                <input
                  value={editCity}
                  onChange={(e) =>
                    setEditCity(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                />

                {editCity && (
                  <p className="text-sm text-slate-500 mt-2">
                    Region:{" "}
                    <strong>
                      {getRegion(
                        editCity.trim()
                      ) || "Other"}
                    </strong>
                  </p>
                )}
              </div>

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">

              <button
                onClick={() =>
                  setEditingHospital(
                    null
                  )
                }
                className="px-5 py-2.5 border border-slate-300 bg-white rounded-xl font-bold"
              >
                Cancel
              </button>

              <button
                onClick={saveEdit}
                disabled={saving}
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
        <div className="fixed inset-0 z-[110] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6">

            <div className="w-12 h-12 bg-red-50 text-red-700 rounded-xl flex items-center justify-center">
              <Trash2 size={21} />
            </div>

            <h2 className="text-xl font-black mt-4">
              Delete Hospital?
            </h2>

            <p className="text-slate-500 mt-2">
              You are about to delete{" "}
              <strong>
                {deleteTarget.hospital_name}
              </strong>{" "}
              in {deleteTarget.city}.
            </p>

            <div className="mt-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl p-4 text-sm">
              Devices assigned to this hospital use the hospital name in their existing records. Review them before deleting the hospital if necessary.
            </div>

            <div className="flex justify-end gap-3 mt-6">

              <button
                onClick={() =>
                  setDeleteTarget(null)
                }
                disabled={saving}
                className="px-5 py-2.5 border rounded-xl font-bold"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                disabled={saving}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-black"
              >
                {saving
                  ? "Deleting..."
                  : "Delete Hospital"}
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}
