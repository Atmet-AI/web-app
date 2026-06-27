type ApprovalEmailInput = {
  email: string
  name: string
}

type ApprovalEmailResult =
  | { ok: true }
  | { ok: false; reason: string }

const RESEND_API_URL = "https://api.resend.com/emails"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Atmet <no-reply@atmetai.com>"

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export async function sendWaitlistApprovalEmail({
  email,
  name,
}: ApprovalEmailInput): Promise<ApprovalEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      ok: false,
      reason: "RESEND_API_KEY is missing, so the approval email was not sent.",
    }
  }

  const signInUrl = `${APP_URL}/sign-in?email=${encodeURIComponent(email)}`
  const safeName = escapeHtml(name || "there")

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: "You are invited to try Atmet",
      text: [
        `Hi ${name || "there"},`,
        "",
        "The Atmet team accepted your waitlist request and invites you to try Atmet.",
        "Open Atmet and enter your email to receive a one-time verification code. After verification, you will create your password and finish setting up your workspace.",
        "",
        signInUrl,
        "",
        "Welcome,",
        "The Atmet team",
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
          <p>Hi ${safeName},</p>
          <p>The Atmet team accepted your waitlist request and invites you to try Atmet.</p>
          <p>Open Atmet and enter your email to receive a one-time verification code. After verification, you will create your password and finish setting up your workspace.</p>
          <p>
            <a href="${signInUrl}" style="display: inline-block; border-radius: 8px; background: #1d9bf0; color: #fff; padding: 10px 16px; text-decoration: none;">
              Sign in to Atmet
            </a>
          </p>
          <p>Welcome,<br />The Atmet team</p>
        </div>
      `,
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    return {
      ok: false,
      reason: details || `Resend returned ${response.status}.`,
    }
  }

  return { ok: true }
}
