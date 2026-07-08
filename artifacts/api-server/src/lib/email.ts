import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[email] SMTP not configured — reset code for ${to}: ${code}`);
    return;
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "no-reply@digitalvillage.app",
    to,
    subject: "Your Digital Village password reset code",
    text: `Your password reset code is ${code}. It expires in 15 minutes. If you didn't request this, you can ignore this email.`,
  });
}

export interface WeeklyDigestDeviceHealth {
  name: string;
  platform: string;
  stale: boolean;
  lastSyncedAt: string | null;
}

export interface WeeklyDigestChildBreakdown {
  childName: string;
  totalDurationSeconds: number;
  eventCount: number;
}

export interface WeeklyDigestData {
  from: string;
  to: string;
  familyTotalDurationSeconds: number;
  familyEventCount: number;
  byChild: WeeklyDigestChildBreakdown[];
  activityHighlights: { activityType: string; eventCount: number }[];
  devices: WeeklyDigestDeviceHealth[];
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function buildWeeklyDigestText(data: WeeklyDigestData): string {
  const lines: string[] = [];
  lines.push(`Digital Village weekly digest: ${data.from.slice(0, 10)} to ${data.to.slice(0, 10)}`);
  lines.push("");
  lines.push(
    `Total screen time: ${formatDuration(data.familyTotalDurationSeconds)} across ${data.familyEventCount} sessions.`,
  );
  if (data.byChild.length > 0) {
    lines.push("");
    lines.push("Per-child breakdown:");
    for (const c of data.byChild) {
      lines.push(`  - ${c.childName}: ${formatDuration(c.totalDurationSeconds)} (${c.eventCount} sessions)`);
    }
  }
  if (data.activityHighlights.length > 0) {
    lines.push("");
    lines.push("Activity highlights:");
    for (const a of data.activityHighlights) {
      lines.push(`  - ${a.activityType}: ${a.eventCount}`);
    }
  }
  if (data.devices.length > 0) {
    lines.push("");
    lines.push("Device sync health:");
    for (const d of data.devices) {
      lines.push(
        `  - ${d.name} (${d.platform}): ${d.stale ? "STALE / offline" : "in sync"}${
          d.lastSyncedAt ? ` — last synced ${d.lastSyncedAt}` : " — never synced"
        }`,
      );
    }
  }
  return lines.join("\n");
}

// Sends a weekly summary email to a parent. This is triggered on-demand via
// POST /api/notifications/weekly-digest/send rather than on a schedule -
// this app has no cron/background job infra (see devices.ts staleness
// comment), and adding one is out of scope for this phase. Automatic weekly
// sending would require introducing a scheduler (e.g. node-cron) or an
// external trigger (e.g. a Replit scheduled deployment / GitHub Action
// hitting this endpoint) - recommended as a followup, not built here.
export async function sendWeeklyDigestEmail(to: string, data: WeeklyDigestData): Promise<void> {
  const text = buildWeeklyDigestText(data);
  const transport = getTransporter();
  if (!transport) {
    console.log(`[email] SMTP not configured — weekly digest for ${to}:\n${text}`);
    return;
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "no-reply@digitalvillage.app",
    to,
    subject: "Your Digital Village weekly family digest",
    text,
  });
}
