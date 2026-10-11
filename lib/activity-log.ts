import { supabase } from "@/lib/supabase";

type ActivityInput = {
  action_type: string;
  device_id?: string | null;
  device_name?: string | null;
  serial_number?: string | null;
  hospital_name?: string | null;
  city?: string | null;
  description?: string | null;
  old_value?: any;
  new_value?: any;
};

export async function logActivity(input: ActivityInput) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("activity_log")
    .insert({
      user_email: user?.email || "Unknown User",
      action_type: input.action_type,
      device_id: input.device_id || null,
      device_name: input.device_name || null,
      serial_number: input.serial_number || null,
      hospital_name: input.hospital_name || null,
      city: input.city || null,
      description: input.description || null,
      old_value: input.old_value || null,
      new_value: input.new_value || null,
    });

  if (error) {
    console.error("Activity Log Error:", error);
  }
}
