import bcrypt from 'bcryptjs';
import { prisma } from '../database/prisma.js';
import { AppError } from '../utils/AppError.js';

const BCRYPT_ROUNDS = 12;
// Compared against when the email doesn't exist, so response time doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('timing-safe-placeholder', BCRYPT_ROUNDS);

export type PublicUser = { id: string; name: string; email: string; createdAt: Date };

const publicSelect = { id: true, name: true, email: true, createdAt: true } as const;

export const authService = {
  async register(input: { name: string; email: string; password: string }): Promise<PublicUser> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw AppError.conflict('An account with this email already exists.');

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    return prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        notificationPreferences: { create: {} },
      },
      select: publicSelect,
    });
  },

  async login(email: string, password: string): Promise<PublicUser> {
    const user = await prisma.user.findUnique({ where: { email } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw AppError.unauthorized('Incorrect email or password.');
    return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
  },

  async me(userId: string): Promise<PublicUser> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: publicSelect });
    if (!user) throw AppError.unauthorized('Your account no longer exists.');
    return user;
  },

  updateProfile(userId: string, name: string) {
    return prisma.user.update({ where: { id: userId }, data: { name }, select: publicSelect });
  },
};
