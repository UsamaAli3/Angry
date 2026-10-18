const choices = { permission: ["yes", "no"], invitation: ["coffee", "dinner", "maybe", "no"] };
export const invitationIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/;

export function isValidInvitationAnswer(stage, answer) {
  if (typeof answer !== "string") return false;
  if (stage === "delivery_method") return ["WhatsApp", "Phone", "Email", "Instagram", "Other", "Later"].includes(answer);
  if (stage === "delivery_contact") return answer.trim().length > 0 && answer.length <= 120 && !/[\u0000-\u001f\u007f]/.test(answer);
  if (stage === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(answer)) return false;
    const parsed = new Date(`${answer}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === answer;
  }
  if (stage === "time") return /^([01]\d|2[0-3]):[0-5]\d$/.test(answer);
  if (stage === "timezone") {
    try { return answer.length <= 64 && Boolean(new Intl.DateTimeFormat("en", { timeZone: answer })); }
    catch { return false; }
  }
  if (stage === "contact_method") return ["WhatsApp", "Phone", "Email", "Instagram", "Other"].includes(answer);
  if (stage === "contact") return answer.trim().length > 0 && answer.length <= 120 && !/[\u0000-\u001f\u007f]/.test(answer);
  return choices[stage]?.includes(answer) ?? false;
}

export function isValidInvitationEvent(value) {
  return value && !Array.isArray(value)
    && Object.keys(value).every(key => ["id", "session_id", "stage", "answer", "created_at", "followup_token"].includes(key))
    && (value.followup_token === undefined || (typeof value.followup_token === "string" && value.followup_token.length <= 512))
    && typeof value.id === "string" && invitationIdPattern.test(value.id)
    && typeof value.session_id === "string" && invitationIdPattern.test(value.session_id)
    && isValidInvitationAnswer(value.stage, value.answer)
    && typeof value.created_at === "string" && Number.isFinite(Date.parse(value.created_at));
}
