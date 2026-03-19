import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;

  if (!host || !port || !user || !pass || !from) {
    const missing = [
      !host && "SMTP_HOST",
      !port && "SMTP_PORT",
      !user && "SMTP_USER",
      !pass && "SMTP_PASS",
      !from && "EMAIL_FROM",
    ].filter(Boolean);
    const message = `E-Mail-Konfiguration unvollständig. Fehlende Umgebungsvariablen: ${missing.join(", ")}`;
    console.error(message);
    throw new Error(message);
  }

  return { host, port: Number(port), user, pass, from };
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const config = getSmtpConfig();

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    ...(options.text && { text: options.text }),
  });
}

function isSmtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

export async function sendFreigabeNotification(
  empfaengerEmail: string,
  eigentuemerName: string,
  titel: string,
  typ: "song" | "set"
): Promise<void> {
  if (!isSmtpConfigured()) {
    return;
  }

  const typLabel = typ === "song" ? "Song" : "Set";

  const subject = `Lyco – ${eigentuemerName} hat einen ${typLabel} mit dir geteilt`;

  const html = `
    <p>Hallo,</p>
    <p><strong>${eigentuemerName}</strong> hat den ${typLabel} <strong>${titel}</strong> mit dir geteilt.</p>
    <p>Melde dich bei Lyco an, um den geteilten Inhalt anzusehen.</p>
    <p>Viele Grüße,<br>Dein Lyco-Team</p>
  `;

  const text = `Hallo,

${eigentuemerName} hat den ${typLabel} "${titel}" mit dir geteilt.

Melde dich bei Lyco an, um den geteilten Inhalt anzusehen.

Viele Grüße,
Dein Lyco-Team`;

  try {
    await sendEmail({ to: empfaengerEmail, subject, html, text });
  } catch (error) {
    console.error("Fehler beim Senden der Freigabe-Benachrichtigung:", error);
  }
}

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string
): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000";
  const resetLink = `${baseUrl}/passwort-zuruecksetzen?token=${resetToken}`;

  const subject = "Lyco – Passwort zurücksetzen";

  const html = `
    <p>Hallo,</p>
    <p>Du hast eine Passwort-Rücksetzung für dein Lyco-Konto angefordert.</p>
    <p>Klicke auf den folgenden Link, um dein Passwort zurückzusetzen:</p>
    <p><a href="${resetLink}">${resetLink}</a></p>
    <p>Dieser Link ist 60 Minuten gültig.</p>
    <p>Falls du keine Passwort-Rücksetzung angefordert hast, kannst du diese E-Mail ignorieren.</p>
    <p>Viele Grüße,<br>Dein Lyco-Team</p>
  `;

  const text = `Hallo,

Du hast eine Passwort-Rücksetzung für dein Lyco-Konto angefordert.

Klicke auf den folgenden Link, um dein Passwort zurückzusetzen:
${resetLink}

Dieser Link ist 60 Minuten gültig.

Falls du keine Passwort-Rücksetzung angefordert hast, kannst du diese E-Mail ignorieren.

Viele Grüße,
Dein Lyco-Team`;

  await sendEmail({ to, subject, html, text });
}
