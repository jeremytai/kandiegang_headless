/**
 * Welcome email for new Kandie Gang Cycling Club members.
 * Used by the Stripe webhook after granting membership.
 * HTML matches the design system preview in DesignSystemWIP.tsx.
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Kandie Gang <jeremy@kandiegang.com>';

const CLUB_PLAN_NAME = 'Kandie Gang Cycling Club Membership';

export interface WelcomeEmailParams {
  to: string;
  memberSince: string; // YYYY-MM-DD
  membershipExpiration: string; // YYYY-MM-DD
}

function buildWelcomeHtml(_params: WelcomeEmailParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @font-face {
      font-family: 'IvyOra Disp Lt';
      src: url('https://www.kandiegang.com/fonts/ivy-ora/IvyOraDispLight.woff2') format('woff2')
      font-weight: 300;
      font-style: normal;
      font-display: swap;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background: #fafafc;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; border-collapse: collapse; margin: 0; padding: 0; text-align: center; table-layout: fixed; background: #ffffff;">
  <tbody>
    <tr>
      <td align="center" style="padding: 0; background: #fafafc;">
        <!-- Header logo + hero image -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; border-collapse: collapse; margin: 0; padding: 0; text-align: center; table-layout: fixed; background: #fafafc;">
          <tbody>
            <tr>
              <td align="center" style="padding: 24px 0 16px; background: #fafafc;">
                <a href="https://kandiegang.com?kandiegangcyclingclub-welcome" target="_blank" rel="noopener noreferrer">
                  <img src="https://www.kandiegang.com/logos/kandiegang_logo_purplerain_pill.png" alt="Kandie Gang" style="display: block; width: 138px; max-width: 138px; margin: 0 auto;" width="138">
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0; background: #fafafc;">
                <a href="https://www.kandiegang.com/members?kandiegangcyclingclub-welcome" target="_blank" rel="noopener noreferrer">
                  <img src="https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2026/02/18182453/kandiegangcyclingclub_welcome.jpg" alt="Kandie Gang Welcome" style="display: block; width: 100%; max-width: 602px; margin: 0 auto;">
                </a>
              </td>
            </tr>
          </tbody>
        </table>
        <!-- Card -->
        <table border="0" cellpadding="0" cellspacing="0" align="center" style="width: 100%; max-width: 602px; border-collapse: separate; background: #fffffe; margin: 0 auto;">
          <tbody>
            <tr>
              <td align="center" style="padding: 40px 0; border-radius: 16px; background: #fffffe;">
                <!-- Heading -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width: 600px; margin: 0 auto; border-collapse: collapse;">
                  <tbody>
                    <tr>
                      <td align="center" style="padding: 0 40px 20px; background: #fffffe;">
                        <h2 style="font-family: 'IvyOra Disp Lt', RoobertPRO, Helvetica, Arial, sans-serif; font-size: 32px; line-height: 40px; font-weight: 300; margin: 0; color: #1c1c1e;">
                          Welcome to the Kandie Gang Cycling Club
                        </h2>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <!-- Body -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width: 600px; margin: 0 auto; border-collapse: collapse;">
                  <tbody>
                    <tr>
                      <td align="left" style="padding: 0 40px 24px; background: #fffffe;">
                        <p style="font-family: NotoSans, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; color: #1c1c1e; margin: 0;">
                          We are pleased to welcome you to the Kandie Gang Cycling Club and will do everything in our power to make it an exciting year.
                        </p>
                        <br>
                        <p style="font-family: NotoSans, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; color: #1c1c1e; margin: 0;">
                          If you have any questions, concerns or feedback, don't hesitate to contact us. We hope you enjoy your rides this year and look forward to your experience as a member of the club.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 0 0 16px; background: #fafafc;">
                        <a href="https://www.kandiegang.com/members?kandiegangcyclingclub-welcome" target="_blank" rel="noopener noreferrer">
                          <img src="https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2026/02/18200520/kandegangcyclingclub_members.jpg" alt="Kandie Gang Members" style="display: block; width: 100%; max-width: 602px; margin: 0 auto;">
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="padding: 0 40px 24px; background: #fffffe;">
                        <p style="font-family: NotoSans, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; color: #1c1c1e; margin: 0;">
                          Parallel to supporting our mission, you have access to exclusive <a style="font-weight: bold; text-decoration: none; color: rgb(72, 81, 151);" href="https://www.kandiegang.com/community?kandiegangcyclingclub-welcomeemail" target="_blank" rel="noopener noreferrer">member benefits</a>, including early access to events, special discounts on <a style="font-weight: bold; text-decoration: none; color: rgb(72, 81, 151);" href="https://www.kandiegang.com/shop?kandiegangcyclingclub-welcomeemail" target="_blank" rel="noopener noreferrer">products</a>, and the opportunity to <a style="font-weight: bold; text-decoration: none; color: rgb(72, 81, 151);" href="https://discord.gg/zddt89Q4hm?kandiegangcyclingclub-welcomeemail" target="_blank" rel="noopener noreferrer">connect on Discord</a> and in real-life with fellow cycling enthusiasts in our community.
                        </p>
                        <br>
                        <p style="font-family: NotoSans, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; color: #1c1c1e; margin: 0;">
                          If you have any questions, concerns or feedback, don't hesitate to contact us. We hope you enjoy your rides this year and look forward to your experience as a member of the club.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <!-- CTA -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width: 600px; margin: 0 auto; border-collapse: collapse;">
                  <tbody>
                    <tr>
                      <td align="center" style="padding: 0 40px; background: #fffffe;">
                        <table border="0" cellpadding="0" cellspacing="0" align="center" style="border-collapse: collapse;">
                          <tbody>
                            <tr>
                              <td align="center">
                                <a href="https://kandiegang.com/members?kandiegangcyclingclub-welcomeemail" target="_blank" rel="noopener noreferrer" style="display: inline-block; font-family: NotoSans, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; color: #fffefe; background-color: rgb(72, 81, 151); text-decoration: none; padding: 11px 24px 13px; border-radius: 9999px; text-align: center; font-weight: bold;">
                                  Visit the Members Area
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 20px 0 0 0; background: #fffffe;"></td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
        <!-- Footer -->
        <table border="0" cellpadding="0" cellspacing="0" align="center" style="width: 100%; max-width: 600px; border-collapse: collapse; margin: 0 auto;">
          <tbody>
            <tr>
              <td align="center" style="padding: 60px 0 0 0; background: #fafafc;"></td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 40px 24px 40px; background: #fafafc;">
                <p style="font-family: NotoSans, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; margin: 0; color: #1c1c1e; text-decoration: none;">
                  If you have any questions, just reply to this email — we're always happy to help.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 40px 24px 40px; background: #fafafc;">
                <a href="https://kandiegang.com" target="_blank" rel="noopener noreferrer">
                  <img src="https://www.kandiegang.com/logos/kandiegang_logo_purplerain_pill.png" alt="Kandie Gang" style="display: block; width: 138px; max-width: 138px; margin: 0 auto;" width="138">
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 40px; font-family: NotoSans, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #1c1c1e; text-decoration: none;">
                <span>Kandie Gang<br>It's a love story 💜</span><br><br>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 40px 40px; font-family: NotoSans, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #1c1c1e; text-decoration: none;">
                <span><a style="font-weight: bold; text-decoration: none; color: rgb(72, 81, 151);" href="https://www.kandiegang.com/privacy-policy?kandiegangcyclingclub-welcomeemail" target="_blank" rel="noopener noreferrer">Privacy Policy</a> | <a style="font-weight: bold; text-decoration: none; color: rgb(72, 81, 151);" href="https://www.kandiegang.com/about?kandiegangcyclingclub-welcomeemail" target="_blank" rel="noopener noreferrer">About Us</a></span>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  </tbody>
</table>
</body>
</html>`;
}

function buildWelcomeText(_params: WelcomeEmailParams): string {
  return [
    'Welcome to the Kandie Gang Cycling Club',
    '',
    'We are pleased to welcome you to the Kandie Gang Cycling Club and will do everything we can to make it an exciting year.',
    '',
    'Visit the Members Area: https://kandiegang.com/members',
    '',
    "Kandie Gang — It's a love story 💜",
  ].join('\n');
}

export async function sendMemberWelcomeEmail(
  params: WelcomeEmailParams
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY is not set' };
  }

  const resend = new Resend(RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: 'Welcome to the Kandie Gang Cycling Club',
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
