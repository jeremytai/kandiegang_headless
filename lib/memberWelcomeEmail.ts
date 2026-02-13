/**
 * Welcome email for new Kandie Gang Cycling Club members.
 * Used by the Stripe webhook after granting membership.
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Kandie Gang <jeremy@kandiegang.com>';
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://kandiegang.com');

const CLUB_PLAN_NAME = 'Kandie Gang Cycling Club Membership';

export interface WelcomeEmailParams {
  to: string;
  memberSince: string; // YYYY-MM-DD
  membershipExpiration: string; // YYYY-MM-DD
}

/** Design system colors (from index.css) — keep email in sync with site. */
const COLOR_PRIMARY_INK = '#1F2223';
const COLOR_SECONDARY_PURPLE_RAIN = '#46519C';
const COLOR_MUTED = '#5f6264';

function buildWelcomeHtml(params: WelcomeEmailParams): string {
  const membersUrl = `${BASE_URL}/members`;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: ${COLOR_PRIMARY_INK}; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.5rem; color: ${COLOR_SECONDARY_PURPLE_RAIN}; font-weight: 600;">Welcome to the Kandie Gang Cycling Club</h1>
  <p>Thank you for becoming a member. You're in.</p>
  <p>Your membership is active for one year:</p>
  <ul style="margin: 16px 0;">
    <li><strong>Start:</strong> ${params.memberSince}</li>
    <li><strong>Expires:</strong> ${params.membershipExpiration}</li>
  </ul>
  <p><a href="${membersUrl}" style="display: inline-block; background: ${COLOR_SECONDARY_PURPLE_RAIN}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 9999px; font-weight: 600;">Go to Members Area</a></p>
  <p style="margin-top: 32px; font-size: 0.875rem; color: ${COLOR_MUTED};">Kandie Gang Cycling Club</p>
</body>
</html>
`.trim();
}

function buildWelcomeText(params: WelcomeEmailParams): string {
  const membersUrl = `${BASE_URL}/members`;
  return [
    'Welcome to the Kandie Gang Cycling Club',
    '',
    "Thank you for becoming a member. You're in.",
    '',
    `Your membership is active for one year:`,
    `Start: ${params.memberSince}`,
    `Expires: ${params.membershipExpiration}`,
    '',
    `Go to Members Area: ${membersUrl}`,
    '',
    'Kandie Gang Cycling Club',
  ].join('\n');
}

export async function sendMemberWelcomeEmail(
  params: WelcomeEmailParams
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY is not set' };
  }

  const resend = new Resend(RESEND_API_KEY);
  const subject = `Welcome to the Kandie Gang Cycling Club`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject,
      html: buildWelcomeHtml(params),
      text: buildWelcomeText(params),
    });

    if (error) {
      console.error('[memberWelcomeEmail] Resend error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[memberWelcomeEmail] Send failed:', message);
    return { success: false, error: message };
  }
}

export { CLUB_PLAN_NAME };
