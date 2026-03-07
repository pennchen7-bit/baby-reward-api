import { PrismaClient, Family, User, Prize, DrawRequest, DrawRecord, Report } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 导出 Prisma 类型供其他模块使用
export type { Family, User, Prize, DrawRequest, DrawRecord, Report };

// 密码哈希（bcrypt）
const BCRYPT_SALT_ROUNDS = 10;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    if (hash && hash.length === 64 && /^[a-f0-9]+$/i.test(hash)) {
      const crypto = require('crypto');
      const oldHash = crypto.createHash('sha256').update(password).digest('hex');
      return oldHash === hash;
    }
    return bcrypt.compareSync(password, hash);
  } catch (e) {
    return false;
  }
}

export async function upgradePasswordHash(userId: string, password: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  
  if (user.passwordHash && user.passwordHash.length === 64 && /^[a-f0-9]+$/i.test(user.passwordHash)) {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(password) },
    });
    console.log(`✓ 用户 ${user.username} 密码哈希已升级到 bcrypt`);
  }
}

// Family 操作
export async function getFamilies(): Promise<Family[]> {
  return prisma.family.findMany();
}

export async function getFamilyById(id: string): Promise<Family | null> {
  return prisma.family.findUnique({ where: { id } });
}

async function generateFamilyCode(): Promise<string> {
  for (let i = 0; i < 100; i++) {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const existing = await prisma.family.findUnique({ where: { familyCode: code } });
    if (!existing) return code;
  }
  return Math.random().toString(36).substr(2, 4).toUpperCase();
}

export async function createFamily(name: string): Promise<Family> {
  const existing = await prisma.family.findFirst({ where: { name: { mode: 'insensitive', equals: name } } });
  if (existing) throw new Error('家庭名称已存在');
  
  const familyCode = await generateFamilyCode();
  
  return prisma.family.create({
    data: { name, familyCode },
  });
}

export async function deleteFamily(id: string): Promise<boolean> {
  try {
    await prisma.family.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function getFamilyByCode(code: string): Promise<Family | null> {
  return prisma.family.findUnique({ where: { familyCode: code } });
}

// User 操作
export async function getUsers(): Promise<User[]> {
  return prisma.user.findMany();
}

export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByUsername(username: string): Promise<User | null> {
  return prisma.user.findFirst({ where: { username: { mode: 'insensitive', equals: username } } });
}

export async function getUsersByFamily(familyId: string): Promise<User[]> {
  return prisma.user.findMany({ where: { familyId } });
}

export async function createUser(userData: Omit<User, 'id' | 'createdAt' | 'passwordHash'> & { password: string }): Promise<User> {
  const existing = await prisma.user.findFirst({ where: { username: { mode: 'insensitive', equals: userData.username } } });
  if (existing) throw new Error('用户名已存在');
  
  if (userData.role !== 'super_admin') {
    const familyUsers = await prisma.user.findMany({ where: { familyId: userData.familyId } });
    const parentCount = familyUsers.filter(u => u.role === 'parent').length;
    const babyCount = familyUsers.filter(u => u.role === 'baby').length;
    
    if (userData.role === 'admin' && familyUsers.some(u => u.role === 'admin')) {
      throw new Error('该家庭已有管理员');
    }
    if (userData.role === 'parent' && parentCount >= 5) {
      throw new Error('每个家庭最多 5 位家长');
    }
    if (userData.role === 'baby' && babyCount >= 5) {
      throw new Error('每个家庭最多 5 个宝宝');
    }
  }
  
  const { password, ...rest } = userData;
  return prisma.user.create({
    data: {
      ...rest,
      passwordHash: hashPassword(password),
    },
  });
}

export async function updateUser(id: string, updates: Partial<User> & { password?: string }): Promise<User | null> {
  const updateData: any = { ...updates };
  if (updateData.password) {
    updateData.passwordHash = hashPassword(updateData.password);
    delete updateData.password;
  }
  return prisma.user.update({ where: { id }, data: updateData });
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await prisma.user.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function joinFamilyAndCreateUser(
  familyCode: string,
  username: string,
  password: string,
  role: 'admin' | 'parent' | 'baby'
): Promise<{ family: Family; user: User }> {
  const family = await getFamilyByCode(familyCode);
  if (!family) throw new Error('家庭码不存在');
  
  const user = await createUser({
    familyId: family.id,
    username,
    password,
    role,
    active: true,
  });
  
  return { family, user };
}

// Prize 操作
export async function getPrizes(familyId?: string): Promise<Prize[]> {
  if (familyId) {
    return prisma.prize.findMany({ where: { familyId } });
  }
  return prisma.prize.findMany();
}

export async function savePrize(prize: Prize): Promise<void> {
  await prisma.prize.upsert({
    where: { id: prize.id },
    update: {
      name: prize.name,
      description: prize.description,
      points: prize.points,
      imageUrl: prize.imageUrl,
      probability: prize.probability,
      active: prize.active,
    },
    create: {
      id: prize.id,
      familyId: prize.familyId,
      name: prize.name,
      description: prize.description,
      points: prize.points,
      imageUrl: prize.imageUrl,
      probability: prize.probability,
      active: prize.active,
    },
  });
}

export async function deletePrize(id: string): Promise<void> {
  await prisma.prize.delete({ where: { id } });
}

// DrawRequest 操作
export async function getDrawRequests(filters?: {
  babyId?: string;
  familyId?: string;
  status?: string;
}): Promise<DrawRequest[]> {
  const where: any = {};
  if (filters?.babyId) where.babyId = filters.babyId;
  if (filters?.familyId) where.familyId = filters.familyId;
  if (filters?.status) where.status = filters.status;
  
  return prisma.drawRequest.findMany({ where, orderBy: { createdAt: 'desc' } });
}

export async function createDrawRequest(request: Omit<DrawRequest, 'id' | 'createdAt'>): Promise<DrawRequest> {
  return prisma.drawRequest.create({
    data: request,
  });
}

export async function updateDrawRequest(id: string, updates: Partial<DrawRequest>): Promise<DrawRequest | null> {
  return prisma.drawRequest.update({ where: { id }, data: updates });
}

export async function deleteDrawRequest(id: string): Promise<boolean> {
  try {
    await prisma.drawRequest.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// DrawRecord 操作
export async function getDrawRecords(familyId?: string, babyId?: string, limit = 50, year?: number, month?: number): Promise<DrawRecord[]> {
  const where: any = {};
  if (familyId) where.familyId = familyId;
  if (babyId) where.babyId = babyId;
  if (year) where.year = year;
  if (month) where.month = month;
  
  return prisma.drawRecord.findMany({
    where,
    orderBy: { drawnAt: 'desc' },
    take: limit,
  });
}

export async function saveDrawRecord(record: Omit<DrawRecord, 'id' | 'drawnAt'> & { drawnAt?: string | Date }): Promise<void> {
  await prisma.drawRecord.create({
    data: {
      familyId: record.familyId,
      babyId: record.babyId,
      babyName: record.babyName,
      prizeId: record.prizeId,
      requestId: record.requestId,
      week: record.week,
      month: record.month,
      quarter: record.quarter,
      year: record.year,
    },
  });
}

// Report 操作
export async function getReports(familyId?: string): Promise<Report[]> {
  if (familyId) {
    return prisma.report.findMany({ where: { familyId } });
  }
  return prisma.report.findMany();
}

export async function saveReport(report: Report): Promise<void> {
  await prisma.report.create({
    data: {
      familyId: report.familyId,
      type: report.type,
      startDate: report.startDate,
      endDate: report.endDate,
      totalDraws: report.totalDraws,
      prizesJson: report.prizesJson,
    },
  });
}

// 辅助函数
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getWeekStartDate(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const weekStart = new Date(jan4);
  weekStart.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  return weekStart;
}

export function getWeekEndDate(year: number, week: number): Date {
  const weekStart = getWeekStartDate(year, week);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);
  return weekEnd;
}

// 初始化超级管理员
export async function ensureSuperAdmin(): Promise<void> {
  const superAdmin = await prisma.user.findFirst({ where: { role: 'super_admin' } });
  
  if (!superAdmin) {
    await prisma.user.create({
      data: {
        id: 'super-admin',
        familyId: '',
        username: 'admin',
        passwordHash: hashPassword('admin123'),
        role: 'super_admin',
        active: true,
      },
    });
    console.log('✓ 超级管理员已创建：admin / admin123');
  }
}
