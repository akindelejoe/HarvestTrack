import { logger } from '../../utils/logger.js';
import { maskPhone } from '../../utils/phone.js';
import type { SmsProvider, SmsResult } from './types.js';

/** Development fallback: logs the message instead of sending it. */
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console';

  async send(to: string, body: string): Promise<SmsResult> {
    logger.info('sms', `[simulated] to ${maskPhone(to)}:\n${body}`);
    return { delivered: false, simulated: true, provider: this.name };
  }
}
