import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ConsoleSmsProvider } from './sms/consoleProvider.js';
import { TwilioSmsProvider } from './sms/twilioProvider.js';
import type { SmsProvider, SmsResult } from './sms/types.js';

function createProvider(): SmsProvider {
  const { SMS_ENABLED, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, NODE_ENV } = env;
  const configured = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER;
  if (SMS_ENABLED && configured && NODE_ENV !== 'test') {
    return new TwilioSmsProvider(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER);
  }
  if (NODE_ENV !== 'test') logger.info('sms', 'Twilio not configured — SMS messages will be logged to the console.');
  return new ConsoleSmsProvider();
}

let provider: SmsProvider = createProvider();

export const smsService = {
  get providerName() {
    return provider.name;
  },
  get isLive() {
    return provider.name !== 'console';
  },

  /** Never throws: SMS failure must not break alert creation or any request. */
  async send(to: string, body: string): Promise<SmsResult> {
    const result = await provider.send(to, body.slice(0, 640));
    if (!result.delivered && !result.simulated) logger.warn('sms', 'SMS delivery failed', { error: result.error });
    return result;
  },

  /** Test hook to swap providers. */
  useProvider(p: SmsProvider) {
    provider = p;
  },
};

export function formatAlertSms(lines: string[]): string {
  const body = lines.length === 1 ? lines[0] : lines.map((l) => `• ${l}`).join('\n');
  return `HarvestTrack Alert:\n${body}\nOpen HarvestTrack for details.`;
}
