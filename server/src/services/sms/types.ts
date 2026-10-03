export interface SmsResult {
  delivered: boolean;
  /** True when the message was only logged (no SMS provider configured). */
  simulated: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

export interface SmsProvider {
  readonly name: string;
  send(to: string, body: string): Promise<SmsResult>;
}
