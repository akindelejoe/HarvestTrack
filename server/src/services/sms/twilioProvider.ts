import type { SmsProvider, SmsResult } from './types.js';

/** Minimal Twilio Messages API client (REST over fetch — no SDK needed). */
export class TwilioSmsProvider implements SmsProvider {
  readonly name = 'twilio';

  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly from: string,
  ) {}

  async send(to: string, body: string): Promise<SmsResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: this.from, Body: body }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
      if (!res.ok) return { delivered: false, simulated: false, provider: this.name, error: data.message ?? `HTTP ${res.status}` };
      return { delivered: true, simulated: false, provider: this.name, messageId: data.sid };
    } catch (err) {
      return { delivered: false, simulated: false, provider: this.name, error: (err as Error).message };
    }
  }
}
