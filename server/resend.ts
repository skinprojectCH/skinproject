// Kleiner Wrapper um die Resend REST API (kein npm-Paket nötig, ein einfacher fetch-Call
// reicht). Erwartet RESEND_API_KEY als Vercel Environment Variable.
// Absenderadresse nutzt die verifizierte Sending-Domain send.sknpr.ch.

const FROM_ADDRESS = 'SkinProject <no-reply@send.sknpr.ch>';

export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY ist nicht gesetzt (Vercel Environment Variables).');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      reply_to: opts.replyTo,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend-Versand fehlgeschlagen (${response.status}): ${body}`);
  }

  return response.json();
}

// Gemeinsamer E-Mail-Rahmen (Header/Footer) für ein konsistentes Erscheinungsbild --
// der eigentliche Inhalt wird als HTML-Fragment übergeben.
export function emailLayout(bodyHtml: string) {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #222;">
    <div style="padding: 24px 0 20px; text-align: center; border-bottom: 2px solid #111;">
      <img src="https://www.sknpr.ch/logo-email.png" alt="SkinProject" width="90" style="display: block; margin: 0 auto; height: auto;" />
    </div>
    <div style="padding: 28px 4px;">
      ${bodyHtml}
    </div>
    <div style="padding: 20px 4px; border-top: 1px solid #eee; color: #999; font-size: 11px; text-align: center;">
      SkinProject &middot; <a href="https://www.skinproject.ch" style="color: #999;">www.skinproject.ch</a>
    </div>
  </div>`;
}
