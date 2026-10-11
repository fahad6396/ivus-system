import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RIYADH_KEYS = [
  "riyadh", "riyad", "qassim", "qasim", "buraydah", "buraidah",
  "unaizah", "unayzah", "onaizah", "hail", "ha'il", "kharj",
  "majmaah", "zulfi", "dawadmi", "afif", "dawasir", "sulayyil",
  "shaqra", "hotat", "al rass", "ar rass", "bukayriyah",
  "الرياض", "القصيم", "بريدة", "عنيزة", "حائل", "الخرج",
  "المجمعة", "الزلفي", "الدوادمي", "عفيف", "الرس", "شقراء",
];

const JEDDAH_KEYS = [
  "jeddah", "jiddah", "jedda", "makkah", "mecca", "taif", "ta'if",
  "madinah", "medina", "yanbu", "tabuk", "abha", "khamis", "jazan",
  "jizan", "najran", "bisha", "qunfudhah", "qunfudah", "qunfidhah",
  "qunfuda", "baha", "rabigh", "muhayil", "sabya", "samtah",
  "abu arish", "alula", "al-ula", "umluj", "wajh", "haql",
  "جدة", "مكة", "الطائف", "المدينة", "ينبع", "تبوك", "أبها", "ابها",
  "خميس", "جازان", "جيزان", "نجران", "بيشة", "القنفذة", "الباحة",
  "رابغ", "العلا",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December",
];

const APP_URL = "https://ikar-devices-tracking.vercel.app/ppm";

export function sectionOf(city: string | null | undefined) {
  const c = (city || "").toLowerCase();
  if (RIYADH_KEYS.some((k) => c.includes(k))) return "riyadh";
  if (JEDDAH_KEYS.some((k) => c.includes(k))) return "jeddah";
  return "other";
}

export function esc(value: unknown) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function deviceRows(items: any[], today: string) {
  if (items.length === 0) {
    return `<tr><td colspan="6" style="padding:12px;color:#64748b;">No devices</td></tr>`;
  }

  return items
    .map((d) => {
      const overdue = d.next_ppm_date < today;
      const status = overdue
        ? `<span style="color:#dc2626;font-weight:700;">Overdue</span>`
        : `<span style="color:#ea580c;font-weight:700;">Due</span>`;

      return `<tr>
        <td style="padding:9px;border-bottom:1px solid #e2e8f0;">${esc(d.device_description)}</td>
        <td style="padding:9px;border-bottom:1px solid #e2e8f0;">${esc(d.serial_number)}</td>
        <td style="padding:9px;border-bottom:1px solid #e2e8f0;">${esc(d.customer_name)}</td>
        <td style="padding:9px;border-bottom:1px solid #e2e8f0;">${esc(d.city)}</td>
        <td style="padding:9px;border-bottom:1px solid #e2e8f0;font-weight:700;">${esc(d.next_ppm_date)}</td>
        <td style="padding:9px;border-bottom:1px solid #e2e8f0;">${status}</td>
      </tr>`;
    })
    .join("");
}

function sectionHtml(title: string, items: any[], today: string) {
  return `
    <div style="margin-top:28px;">
      <div style="background:#eef2f7;padding:10px 14px;border-radius:8px;font-weight:700;color:#174a8b;">
        ${esc(title)} <span style="font-weight:400;color:#64748b;">(${items.length})</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:6px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th align="left" style="padding:9px;">Device</th>
            <th align="left" style="padding:9px;">Serial</th>
            <th align="left" style="padding:9px;">Hospital</th>
            <th align="left" style="padding:9px;">City</th>
            <th align="left" style="padding:9px;">PPM date</th>
            <th align="left" style="padding:9px;">Status</th>
          </tr>
        </thead>
        <tbody>${deviceRows(items, today)}</tbody>
      </table>
    </div>`;
}

export function buildEmail(
  name: string,
  monthLabel: string,
  today: string,
  overdueCount: number,
  dueCount: number,
  sections: { riyadh: any[]; jeddah: any[]; other: any[] }
) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:900px;margin:auto;color:#0f172a;">
    <div style="background:#174a8b;color:#ffffff;padding:26px;border-radius:14px;">
      <div style="font-size:22px;font-weight:700;">Monthly PPM reminder</div>
      <div style="margin-top:6px;font-size:14px;">${esc(monthLabel)} - Medical device preventive maintenance</div>
    </div>

    <p style="font-size:15px;margin:20px 0 14px;">Hello ${esc(name)}, here are the devices that need PPM this month.</p>

    <table style="width:100%;border-collapse:separate;border-spacing:12px 0;margin:0 -12px 8px;">
      <tr>
        <td style="background:#fef2f2;padding:16px;border-radius:10px;width:50%;">
          <div style="font-size:14px;color:#dc2626;">Overdue</div>
          <div style="font-size:28px;font-weight:700;color:#dc2626;">${overdueCount}</div>
        </td>
        <td style="background:#fff7ed;padding:16px;border-radius:10px;width:50%;">
          <div style="font-size:14px;color:#ea580c;">Due this month</div>
          <div style="font-size:28px;font-weight:700;color:#ea580c;">${dueCount}</div>
        </td>
      </tr>
    </table>

    ${sectionHtml("Riyadh, Qassim, Hail and nearby", sections.riyadh, today)}
    ${sectionHtml("Jeddah, Western, Southern, Madinah and Tabuk", sections.jeddah, today)}
    ${sectionHtml("Eastern and other areas", sections.other, today)}

    <p style="margin:28px 0 8px;">
      <a href="${APP_URL}" style="display:inline-block;background:#174a8b;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:700;">Open PPM schedule</a>
    </p>
    <p style="font-size:12px;color:#64748b;">Sent automatically by the IVUS system.</p>
  </div>`;
}

async function sendMail(
  url: string,
  secret: string,
  to: string,
  subject: string,
  html: string
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret,
      to,
      subject,
      html,
      name: "IVUS PPM Reminder",
    }),
    redirect: "follow",
  });

  const text = await res.text();
  let ok = false;

  try {
    ok = JSON.parse(text).ok === true;
  } catch (_e) {
    ok = false;
  }

  if (!ok) {
    throw new Error(text.slice(0, 200));
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handler(req: Request) {
  try {
    const cronSecret = Deno.env.get("PPM_CRON_SECRET");
    const testKey = Deno.env.get("PPM_TEST_KEY");

    const cronOk =
      !!cronSecret &&
      req.headers.get("x-ppm-cron-secret") === cronSecret;

    const testOk =
      !!testKey && req.headers.get("x-ppm-test-key") === testKey;

    if (!cronOk && !testOk) {
      return json({ success: false, error: "Unauthorized" }, 401);
    }

    const body: any = await req.json().catch(() => ({}));
    const testTo: string | null = testOk && body.test_to ? String(body.test_to) : null;
    const sendNow = testOk && body.send_now === true;

    const ksa = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const today = ksa.toISOString().slice(0, 10);
    const year = ksa.getUTCFullYear();
    const month = ksa.getUTCMonth();
    const monthEnd = new Date(Date.UTC(year, month + 1, 0))
      .toISOString()
      .slice(0, 10);
    const monthLabel = `${MONTHS[month]} ${year}`;

    if (!testTo && !sendNow && ksa.getUTCDate() > 7) {
      return json({
        success: true,
        skipped: true,
        reason: "Not the first Monday of the month",
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("devices_v2")
      .select(
        "id, device_description, serial_number, customer_name, city, next_ppm_date, user_status"
      )
      .not("next_ppm_date", "is", null)
      .lte("next_ppm_date", monthEnd)
      .order("next_ppm_date", { ascending: true });

    if (error) throw error;

    const devices = (data || []).filter((d: any) => {
      const s = String(d.user_status || "").toLowerCase();
      return s !== "scrapped" && s !== "store";
    });

    const sections = { riyadh: [] as any[], jeddah: [] as any[], other: [] as any[] };

    for (const d of devices) {
      sections[sectionOf(d.city) as "riyadh" | "jeddah" | "other"].push(d);
    }

    const overdueCount = devices.filter((d: any) => d.next_ppm_date < today).length;
    const dueCount = devices.length - overdueCount;

    if (!testTo && devices.length === 0) {
      return json({ success: true, skipped: true, reason: "No devices due" });
    }

    let recipients: { email: string; name: string }[] = [];

    if (testTo) {
      recipients = [{ email: testTo, name: testTo.split("@")[0] }];
    } else {
      const { data: usersData, error: usersError } =
        await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

      if (usersError) throw usersError;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, role");

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.id, p])
      );

      recipients = (usersData.users || [])
        .filter((u: any) => {
          const email = String(u.email || "").toLowerCase();
          const role = profileMap.get(u.id)?.role;
          return (
            email &&
            !email.endsWith("@example.com") &&
            (role === "admin" || role === "engineer")
          );
        })
        .map((u: any) => ({
          email: u.email as string,
          name:
            profileMap.get(u.id)?.full_name ||
            String(u.email).split("@")[0],
        }));
    }

    const scriptUrl = Deno.env.get("APPS_SCRIPT_URL")!;
    const scriptSecret = Deno.env.get("APPS_SCRIPT_SECRET")!;
    const subject = `Monthly PPM reminder - ${monthLabel}`;

    let sent = 0;
    const failed: string[] = [];

    for (const r of recipients) {
      try {
        const html = buildEmail(
          r.name,
          monthLabel,
          today,
          overdueCount,
          dueCount,
          sections
        );
        await sendMail(scriptUrl, scriptSecret, r.email, subject, html);
        sent++;
      } catch (e) {
        failed.push(`${r.email}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return json({
      success: failed.length === 0,
      sent,
      failed,
      overdue: overdueCount,
      due_this_month: dueCount,
      riyadh: sections.riyadh.length,
      jeddah: sections.jeddah.length,
      other: sections.other.length,
    });
  } catch (error) {
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : JSON.stringify(error),
      },
      500
    );
  }
}

Deno.serve(handler);
