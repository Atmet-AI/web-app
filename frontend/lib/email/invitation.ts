type WorkspaceInvitationEmailInput = {
  email: string
  workspaceName: string
  invitedByName: string
  token: string
}

type WorkspaceInvitationEmailResult =
  | { ok: true }
  | { ok: false; reason: string }

const RESEND_API_URL = "https://api.resend.com/emails"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Atmet <no-reply@atmetai.com>"

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export async function sendWorkspaceInvitationEmail({
  email,
  workspaceName,
  invitedByName,
  token,
}: WorkspaceInvitationEmailInput): Promise<WorkspaceInvitationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      ok: false,
      reason: "RESEND_API_KEY is missing, so the invitation email was not sent.",
    }
  }

  const inviteUrl = `${APP_URL}/invite/${token}`
  const safeWorkspace = escapeHtml(workspaceName)
  const safeInviter = escapeHtml(invitedByName || "A teammate")

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: `Join ${workspaceName} on Atmet`,
      text: [
        `${invitedByName || "A teammate"} invited you to join ${workspaceName} on Atmet.`,
        "",
        "Open your unique invitation link to complete your profile and join the workspace.",
        "",
        inviteUrl,
        "",
        "Welcome,",
        "The Atmet team",
      ].join("\n"),
      html: `
        <div style="margin:0;background:#0d0d0d;padding:32px;font-family:Arial,sans-serif;color:#f7f7f7;">
          <div style="max-width:520px;margin:0 auto;border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:28px;background:#141414;">
            <p style="margin:0 0 10px;color:#9ca3af;font-size:13px;">Atmet invitation</p>
            <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;">Join ${safeWorkspace}</h1>
            <p style="margin:0 0 24px;color:#c7c7c7;line-height:1.6;">${safeInviter} invited you to join this workspace. Complete your profile, then confirm your invite.</p>
            <a href="${inviteUrl}" style="display:inline-block;border-radius:10px;background:#1d9bf0;color:#fff;padding:12px 18px;text-decoration:none;font-weight:600;">Accept invitation</a>
            <p style="margin:24px 0 0;color:#858585;font-size:12px;line-height:1.5;">This link is unique to ${escapeHtml(email)} and expires automatically.</p>
          </div>
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
