import nodemailer from "nodemailer";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !portRaw || !user || !pass || !from) {
    throw new Error(
      "SMTP is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.",
    );
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port)) {
    throw new Error("SMTP_PORT must be a valid number.");
  }

  const secure = port === 465;

  return { host, port, secure, user, pass, from };
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const smtp = getSmtpConfig();
  cachedTransporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  return cachedTransporter;
}

export async function sendForgotPasswordOtpEmail(to: string, otp: string) {
  const smtp = getSmtpConfig();
  const transporter = getTransporter();

  await transporter.sendMail({
    from: smtp.from,
    to,
    subject: "Your SlideRaku password reset code",
    text: `Your OTP code is ${otp}. It expires in 15 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
        <h2 style="margin-bottom: 12px;">Password Reset Code</h2>
        <p style="margin: 0 0 12px;">Use this OTP code to reset your SlideRaku password:</p>
        <div style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #eef2ff; color: #3730a3; font-size: 24px; font-weight: 700; letter-spacing: 4px;">
          ${otp}
        </div>
        <p style="margin: 16px 0 0; font-size: 14px; color: #4b5563;">This code expires in 15 minutes.</p>
      </div>
    `,
  });
}
