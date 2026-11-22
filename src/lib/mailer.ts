/**
 * Transactional email. Delivery order:
 *  1. Resend HTTP API when RESEND_API_KEY and MAIL_FROM are configured (production).
 *  2. Server log when MAIL_DEV_LOG=true (local development only; the log contains the reset link).
 *  3. Otherwise nothing is sent and the caller is told so. Reset links are never shown to the browser.
 */
export type MailResult = "sent" | "logged" | "not_configured";

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<MailResult> {
  const subject = "Reset your InkVerse password";
  const text = [
    "We received a request to reset your InkVerse password.",
    "",
    `Reset link (valid for 30 minutes): ${resetUrl}`,
    "",
    "If you did not request this change, you can safely ignore this email.",
  ].join("\n");

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (apiKey && from) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!response.ok) {
      console.error(`[mailer] Email provider responded with HTTP ${response.status}`);
      throw new Error("Mail delivery failed.");
    }
    return "sent";
  }

  if (process.env.MAIL_DEV_LOG === "true") {
    console.info(`[mailer:dev] Password reset link for ${to}: ${resetUrl}`);
    return "logged";
  }

  console.warn("[mailer] No mail provider configured (set RESEND_API_KEY and MAIL_FROM).");
  return "not_configured";
}
