import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');

// 文件路径
const FAMILIES_FILE = path.join(DATA_DIR, 'families.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PRIZES_FILE = path.join(DATA_DIR, 'prizes.json');
const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');

// 类型定义
export interface Family {
  id: string;
  name: string;
  familyCode: string;  // 4 位数字家庭码
  createdAt: string;
}

export interface User {
  id: string;
  familyId: string;
  username: string;
  passwordHash: string;
  role: 'super_admin' | 'admin' | 'parent' | 'baby';
  active: boolean;
  createdAt: string;
}

export interface Prize {
  id: string;
  familyId?: string;  // 可选，兼容旧数据
  name: string;
  description: string | null;
  points: number;
  imageUrl: string | null;
  probability: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DrawRequest {
  id: string;
  familyId: string;
  babyId: string;
  babyName: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approvedBy?: string;
  approvedByName?: string;
  reason?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface DrawRecord {
  id: string;
  familyId: string;
  babyId: string;
  babyName: string;
  prizeId: string;
  prizeName: string;
  points: number;
  requestId?: string;
  drawnAt: string;
  week: number;
  month: number;
  quarter: number;
  year: number;
}

export interface Report {
  id: string;
  familyId?: string;  // 可选，兼容旧数据
  type: string;
  startDate: string;
  endDate: string;
  totalDraws: number;
  prizesJson: string;
  createdAt: string;
}

// 工具函数
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
}

async function readJson<T>(file: string, defaultVal: T): Promise<T> {
  try {
    await ensureDataDir();
    const content = await fs.readFile(file, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return defaultVal;
  }
}

async function writeJson<T>(file: string, data: T): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// 密码哈希（bcrypt）
const BCRYPT_SALT_ROUNDS = 10;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    // 检查是否是旧版 SHA256 哈希（64 位十六进制）
    if (hash && hash.length === 64 && /^[a-f0-9]+$/i.test(hash)) {
      // 旧版哈希，用 SHA256 验证（用于无感升级）
      const crypto = require('crypto');
      const oldHash = crypto.createHash('sha256').update(password).digest('hex');
      return oldHash === hash;
    }
    // 新版 bcrypt 哈希
    return bcrypt.compareSync(password, hash);
  } catch (e) {
    return false;
  }
}

// 升级旧密码哈希到 bcrypt
export async function upgradePasswordHash(userId: string, password: string): Promise<void> {
  const users = await getUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return;
  
  const user = users[index];
  // 检查是否是旧版哈希
  if (user.passwordHash && user.passwordHash.length === 64 && /^[a-f0-9]+$/i.test(user.passwordHash)) {
    // 升级到 bcrypt
    users[index].passwordHash = hashPassword(password);
    await writeJson(USERS_FILE, users);
    console.log(`✓ 用户 ${user.username} 密码哈希已升级到 bcrypt`);
  }
}

// Family 操作
export async function getFamilies(): Promise<Family[]> {
  return readJson<Family[]>(FAMILIES_FILE, []);
}

export async function getFamilyById(id: string): Promise<Family | null> {
  const families = await getFamilies();
  return families.find((f) => f.id === id) || null;
}

// 生成唯一的 4 位数字家庭码
async function generateFamilyCode(): Promise<string> {
  const families = await getFamilies();
  const existingCodes = new Set(families.map((f) => f.familyCode));
  
  // 尝试生成一个唯一的 4 位数字码
  for (let i = 0; i < 100; i++) {
    const code = Math.floor(1000 + Math.random() * 9000).toString(); // 1000-9999
    if (!existingCodes.has(code)) {
      return code;
    }
  }
  
  // 极端情况下使用带字母的码
  return Math.random().toString(36).substr(2, 4).toUpperCase();
}

export async function createFamily(name: string): Promise<Family> {
  const families = await getFamilies();
  
  // 生成唯一 ID（基于时间戳 + 随机数）
  const familyId = `family-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // 检查名称是否重复（不区分大小写）
  if (families.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('家庭名称已存在');
  }
  
  // 生成家庭码
  const familyCode = await generateFamilyCode();
  
  const family: Family = {
    id: familyId,
    name,
    familyCode,
    createdAt: new Date().toISOString(),
  };
  families.push(family);
  await writeJson(FAMILIES_FILE, families);
  return family;
}

export async function deleteFamily(id: string): Promise<boolean> {
  const families = await getFamilies();
  const filtered = families.filter((f) => f.id !== id);
  if (filtered.length === families.length) return false;
  await writeJson(FAMILIES_FILE, filtered);
  return true;
}

export async function getFamilyByCode(code: string): Promise<Family | null> {
  const families = await getFamilies();
  return families.find((f) => f.familyCode === code) || null;
}

// User 操作
export async function getUsers(): Promise<User[]> {
  return readJson<User[]>(USERS_FILE, []);
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers();
  return users.find((u) => u.id === id) || null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await getUsers();
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
}

export async function getUsersByFamily(familyId: string): Promise<User[]> {
  const users = await getUsers();
  return users.filter((u) => u.familyId === familyId);
}

export async function createUser(userData: Omit<User, 'id' | 'createdAt' | 'passwordHash'> & { password: string }): Promise<User> {
  const users = await getUsers();
  
  // 检查用户名是否重复（全局唯一）
  if (users.some((u) => u.username.toLowerCase() === userData.username.toLowerCase())) {
    throw new Error('用户名已存在');
  }
  
  // 检查家庭人数限制（super_admin 不受限制）
  if (userData.role !== 'super_admin') {
    const familyUsers = users.filter((u) => u.familyId === userData.familyId && u.role !== 'super_admin');
    const parentCount = familyUsers.filter((u) => u.role === 'parent').length;
    const babyCount = familyUsers.filter((u) => u.role === 'baby').length;
    
    if (userData.role === 'admin') {
      // 每个家庭只能有一个 admin
      if (familyUsers.some((u) => u.role === 'admin')) {
        throw new Error('该家庭已有管理员');
      }
    }
    if (userData.role === 'parent' && parentCount >= 5) {
      throw new Error('每个家庭最多 5 位家长');
    }
    if (userData.role === 'baby' && babyCount >= 5) {
      throw new Error('每个家庭最多 5 个宝宝');
    }
  }
  
  const { password, ...rest } = userData;
  const user: User = {
    ...rest,
    passwordHash: hashPassword(password),
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeJson(USERS_FILE, users);
  return user;
}

export async function updateUser(id: string, updates: Partial<User> & { password?: string }): Promise<User | null> {
  const users = await getUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return null;
  
  const updateData: any = { ...updates };
  if (updateData.password) {
    updateData.passwordHash = hashPassword(updateData.password);
    delete updateData.password;
  }
  
  users[index] = { ...users[index], ...updateData };
  await writeJson(USERS_FILE, users);
  return users[index];
}

export async function deleteUser(id: string): Promise<boolean> {
  const users = await getUsers();
  const filtered = users.filter((u) => u.id !== id);
  if (filtered.length === users.length) return false;
  await writeJson(USERS_FILE, filtered);
  return true;
}

// 通过家庭码加入家庭并创建用户
export async function joinFamilyAndCreateUser(
  familyCode: string,
  username: string,
  password: string,
  role: 'admin' | 'parent' | 'baby'
): Promise<{ family: Family; user: User }> {
  const family = await getFamilyByCode(familyCode);
  if (!family) {
    throw new Error('家庭码不存在');
  }
  
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
  const prizes = await readJson<Prize[]>(PRIZES_FILE, []);
  if (familyId) {
    return prizes.filter((p) => p.familyId === familyId);
  }
  return prizes;
}

export async function savePrize(prize: Prize): Promise<void> {
  const prizes = await getPrizes();
  const index = prizes.findIndex((p) => p.id === prize.id);
  if (index >= 0) {
    prizes[index] = prize;
  } else {
    prizes.push(prize);
  }
  await writeJson(PRIZES_FILE, prizes);
}

export async function deletePrize(id: string): Promise<void> {
  const prizes = await getPrizes();
  const filtered = prizes.filter((p) => p.id !== id);
  await writeJson(PRIZES_FILE, filtered);
}

// DrawRequest 操作
export async function getDrawRequests(filters?: {
  babyId?: string;
  familyId?: string;
  status?: string;
}): Promise<DrawRequest[]> {
  const requests = await readJson<DrawRequest[]>(REQUESTS_FILE, []);
  
  if (!filters) return requests;
  
  return requests.filter((r) => {
    if (filters.babyId && r.babyId !== filters.babyId) return false;
    if (filters.familyId && r.familyId !== filters.familyId) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });
}

export async function createDrawRequest(request: Omit<DrawRequest, 'id' | 'createdAt'>): Promise<DrawRequest> {
  const requests = await getDrawRequests();
  const newRequest: DrawRequest = {
    ...request,
    id: `request-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  requests.push(newRequest);
  await writeJson(REQUESTS_FILE, requests);
  return newRequest;
}

export async function updateDrawRequest(id: string, updates: Partial<DrawRequest>): Promise<DrawRequest | null> {
  const requests = await getDrawRequests();
  const index = requests.findIndex((r) => r.id === id);
  if (index === -1) return null;
  requests[index] = { ...requests[index], ...updates };
  await writeJson(REQUESTS_FILE, requests);
  return requests[index];
}

export async function deleteDrawRequest(id: string): Promise<boolean> {
  const requests = await getDrawRequests();
  const filtered = requests.filter((r) => r.id !== id);
  if (filtered.length === requests.length) return false;
  await writeJson(REQUESTS_FILE, filtered);
  return true;
}

// DrawRecord 操作
export async function getDrawRecords(familyId?: string, babyId?: string, limit = 50, year?: number, month?: number): Promise<DrawRecord[]> {
  const records = await readJson<DrawRecord[]>(RECORDS_FILE, []);
  
  let filtered = records;
  if (familyId) filtered = filtered.filter((r) => r.familyId === familyId);
  if (babyId) filtered = filtered.filter((r) => r.babyId === babyId);
  if (year) filtered = filtered.filter((r) => r.year === year);
  if (month) filtered = filtered.filter((r) => r.month === month);
  
  return filtered
    .sort((a, b) => new Date(b.drawnAt).getTime() - new Date(a.drawnAt).getTime())
    .slice(0, limit);
}

export async function saveDrawRecord(record: DrawRecord): Promise<void> {
  const records = await readJson<DrawRecord[]>(RECORDS_FILE, []);
  records.push(record);
  await writeJson(RECORDS_FILE, records);
}

// Report 操作
export async function getReports(familyId?: string): Promise<Report[]> {
  const reports = await readJson<Report[]>(REPORTS_FILE, []);
  if (familyId) {
    return reports.filter((r) => r.familyId === familyId);
  }
  return reports;
}

export async function saveReport(report: Report): Promise<void> {
  const reports = await getReports();
  reports.push(report);
  await writeJson(REPORTS_FILE, reports);
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
  const users = await getUsers();
  const hasSuperAdmin = users.some((u) => u.role === 'super_admin');
  
  if (!hasSuperAdmin) {
    const superAdmin: User = {
      id: 'super-admin',
      familyId: '',
      username: 'admin',
      passwordHash: hashPassword('admin123'),
      role: 'super_admin',
      active: true,
      createdAt: new Date().toISOString(),
    };
    users.push(superAdmin);
    await writeJson(USERS_FILE, users);
    console.log('✓ 超级管理员已创建：admin / admin123');
  }
}
