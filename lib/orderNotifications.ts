import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Kandie Gang <noreply@kandiegang.com>';
const DISCORD_ORDER_WEBHOOK_URL = process.env.DISCORD_ORDER_WEBHOOK_URL;

export interface OrderNotificationItem {
  name: string;
  quantity: number;
  amountTotal: number | null;
  currency: string | null;
}

export interface OrderNotificationParams {
  sessionId: string;
  referenceLabel?: string;
  customerEmail: string | null;
  customerName: string | null;
  amountTotal: number | null;
  currency: string | null;
  items: OrderNotificationItem[];
  shippingOption: string | null;
  mode: string | null;
  paymentStatus: string | null;
  stripeDashboardUrl: string | null;
  siteUrl: string;
}

export interface NotificationResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(amountCents: number | null | undefined, currency: string | null): string {
  if (typeof amountCents !== 'number') return 'Not available';

  try {
    return new Intl.NumberFormat('en-DE', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'EUR',
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${(currency || 'eur').toUpperCase()}`;
  }
}

function formatShippingOption(shippingOption: string | null): string {
  if (!shippingOption) return 'Not specified';

  const labels: Record<string, string> = {
    de: 'Standard - Germany',
    eu: 'Standard - EU',
    pickup: 'Local pickup',
  };

  return labels[shippingOption] ?? shippingOption;
}

function orderItemsText(items: OrderNotificationItem[]): string {
  if (items.length === 0) return 'Order details are available in Stripe.';

  return items
    .map((item) => {
      const lineTotal = formatCurrency(item.amountTotal, item.currency);
      return `${item.quantity}x ${item.name} - ${lineTotal}`;
    })
    .join('\n');
}

function orderItemsHtml(items: OrderNotificationItem[]): string {
  if (items.length === 0) {
    return '<p style="margin: 0; color: #1c1c1e;">Order details are available in Stripe.</p>';
  }

  return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
      <tbody>
        ${items
          .map(
            (item) => `
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-family: NotoSans, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 22px; color: #1c1c1e;">
                  ${escapeHtml(String(item.quantity))}x ${escapeHtml(item.name)}
                </td>
                <td align="right" style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-family: NotoSans, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 22px; color: #1c1c1e;">
                  ${escapeHtml(formatCurrency(item.amountTotal, item.currency))}
                </td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>`;
}

function buildOrderConfirmationHtml(params: OrderNotificationParams): string {
  const greeting = params.customerName ? `Hi ${escapeHtml(params.customerName)},` : 'Hi,';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background: #fafafc;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; border-collapse: collapse; background: #fafafc;">
    <tbody>
      <tr>
        <td align="center" style="padding: 24px 16px 40px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 602px; border-collapse: collapse;">
            <tbody>
              <tr>
                <td align="center" style="padding: 0 0 20px;">
                  <a href="${escapeHtml(params.siteUrl)}" target="_blank" rel="noopener noreferrer">
                    <img src="https://www.kandiegang.com/logos/kandiegang_logo_purplerain_pill.png" alt="Kandie Gang" style="display: block; width: 138px; max-width: 138px; margin: 0 auto;" width="138">
                  </a>
                </td>
              </tr>
              <tr>
                <td style="background: #fffffe; border-radius: 16px; padding: 40px;">
                  <h1 style="font-family: 'IvyOra Disp Lt', RoobertPRO, Helvetica, Arial, sans-serif; font-size: 32px; line-height: 40px; font-weight: 300; margin: 0 0 20px; color: #1c1c1e;">
                    We received your order
                  </h1>
                  <p style="font-family: NotoSans, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; color: #1c1c1e; margin: 0 0 16px;">
                    ${greeting}
                  </p>
                  <p style="font-family: NotoSans, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; color: #1c1c1e; margin: 0 0 24px;">
                    Thank you for ordering from Kandie Gang. Your payment was received and we will process your order shortly.
                  </p>
                  ${orderItemsHtml(params.items)}
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-top: 24px;">
                    <tbody>
                      <tr>
                        <td style="font-family: NotoSans, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; color: #1c1c1e; font-weight: bold;">Total</td>
                        <td align="right" style="font-family: NotoSans, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; color: #1c1c1e; font-weight: bold;">${escapeHtml(formatCurrency(params.amountTotal, params.currency))}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p style="font-family: NotoSans, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #64748b; margin: 24px 0 0;">
                    Order reference: ${escapeHtml(params.sessionId)}
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 24px 40px 0;">
                  <p style="font-family: NotoSans, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; margin: 0; color: #1c1c1e;">
                    If you have any questions, just reply to this email.
                  </p>
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

function buildOrderConfirmationText(params: OrderNotificationParams): string {
  return [
    'We received your order',
    '',
    params.customerName ? `Hi ${params.customerName},` : 'Hi,',
    '',
    'Thank you for ordering from Kandie Gang. Your payment was received and we will process your order shortly.',
    '',
    'Order items:',
    orderItemsText(params.items),
    '',
    `Total: ${formatCurrency(params.amountTotal, params.currency)}`,
    `Order reference: ${params.sessionId}`,
    '',
    'If you have any questions, just reply to this email.',
  ].join('\n');
}

function buildInternalNotificationText(params: OrderNotificationParams): string {
  return [
    `New order: ${params.sessionId}`,
    '',
    `Customer: ${params.customerName ?? 'Unknown'} <${params.customerEmail ?? 'no email'}>`,
    `Total: ${formatCurrency(params.amountTotal, params.currency)}`,
    `Shipping: ${formatShippingOption(params.shippingOption)}`,
    '',
    'Items:',
    orderItemsText(params.items),
    '',
    params.stripeDashboardUrl ? `Stripe: ${params.stripeDashboardUrl}` : '',
  ]
    .filter((l) => l !== undefined)
    .join('\n');
}

export async function sendOrderInternalNotificationEmail(
  params: OrderNotificationParams
): Promise<NotificationResult> {
  if (!RESEND_API_KEY) {
    return { success: false, skipped: true, error: 'RESEND_API_KEY is not set' };
  }

  const resend = new Resend(RESEND_API_KEY);
  const customerLabel = params.customerName
    ? `${params.customerName} (${params.customerEmail ?? 'no email'})`
    : (params.customerEmail ?? 'Unknown customer');
  const totalLabel = formatCurrency(params.amountTotal, params.currency);

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: 'shop@kandiegang.com',
      subject: `New order: ${customerLabel} — ${totalLabel}`,
      text: buildInternalNotificationText(params),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendOrderConfirmationEmail(
  params: OrderNotificationParams
): Promise<NotificationResult> {
  if (!params.customerEmail) {
    return { success: true, skipped: true, error: 'No customer email on checkout session' };
  }

  if (!RESEND_API_KEY) {
    return { success: false, skipped: true, error: 'RESEND_API_KEY is not set' };
  }

  const resend = new Resend(RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.customerEmail,
      subject: 'We received your Kandie Gang order',
      html: buildOrderConfirmationHtml(params),
      text: buildOrderConfirmationText(params),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendDiscordOrderNotification(
  params: OrderNotificationParams
): Promise<NotificationResult> {
  if (!DISCORD_ORDER_WEBHOOK_URL) {
    return { success: true, skipped: true, error: 'DISCORD_ORDER_WEBHOOK_URL is not set' };
  }

  const fields = [
    {
      name: 'Customer',
      value: params.customerEmail
        ? `${params.customerName ? `${params.customerName}\n` : ''}${params.customerEmail}`
        : params.customerName || 'Not provided',
      inline: true,
    },
    {
      name: 'Total',
      value: formatCurrency(params.amountTotal, params.currency),
      inline: true,
    },
    {
      name: 'Shipping',
      value: formatShippingOption(params.shippingOption),
      inline: true,
    },
    {
      name: 'Items',
      value: orderItemsText(params.items).slice(0, 1000),
      inline: false,
    },
    {
      name: params.referenceLabel ?? 'Stripe session',
      value: params.stripeDashboardUrl
        ? `[${params.sessionId}](${params.stripeDashboardUrl})`
        : params.sessionId,
      inline: false,
    },
  ];

  try {
    const response = await fetch(DISCORD_ORDER_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Kandie Gang Orders',
        embeds: [
          {
            title: 'New webshop order',
            color: 0x485197,
            fields,
            timestamp: new Date().toISOString(),
            footer: {
              text: `Payment: ${params.paymentStatus || 'unknown'} | Mode: ${
                params.mode || 'unknown'
              }`,
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      return { success: false, error: `Discord webhook returned ${response.status}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
