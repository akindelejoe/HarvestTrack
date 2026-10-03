import type { AlertSeverity } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { AppError } from '../utils/AppError.js';
import { formatAlertSms, smsService } from './smsService.js';

export const settingsService = {
  async getNotifications(userId: string) {
    const prefs = await prisma.notificationPreference.upsert({ where: { userId }, update: {}, create: { userId } });
    return {
      phoneNumber: prefs.phoneNumber,
      smsEnabled: prefs.smsEnabled,
      minimumSeverity: prefs.minimumSeverity,
      smsProvider: smsService.providerName,
      smsLive: smsService.isLive,
    };
  },

  async updateNotifications(userId: string, input: { phoneNumber: string | null; smsEnabled: boolean; minimumSeverity: AlertSeverity }) {
    await prisma.notificationPreference.upsert({ where: { userId }, update: input, create: { userId, ...input } });
    return this.getNotifications(userId);
  },

  async sendTestSms(userId: string) {
    const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
    if (!prefs?.phoneNumber) throw AppError.badRequest('Save a phone number before sending a test message.');
    const result = await smsService.send(
      prefs.phoneNumber,
      formatAlertSms(['This is a test message. SMS alerts are configured correctly.']),
    );
    if (!result.delivered && !result.simulated) {
      throw AppError.unavailable(`The SMS service could not deliver the message: ${result.error ?? 'unknown error'}.`, 'SMS_UNAVAILABLE');
    }
    return result;
  },
};
