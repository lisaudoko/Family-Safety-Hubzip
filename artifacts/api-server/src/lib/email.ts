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
