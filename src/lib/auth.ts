import { cookies } from 'next/headers';
import { 
  getUsers, 
  getUserByUsername, 
  createUser, 
  getFamilies, 
  createFamily,
  ensureSuperAdmin,
  verifyPassword,
  getFamilyByCode,
  getUsersByFamily,
  upgradePasswordHash,
  joinFamilyAndCreateUser,
  deleteUser,
  updateUser,
} from './db';
import type { User, Family } from './db';

// 确保超级管理员存在
export async function initAuth(): Promise<void> {
  await ensureSuperAdmin();
}

export async function authenticate(
  username: string, 
  password: string,
  familyId?: string
): Promise<(User & { familyName?: string }) | null> {
  let user: User | null;
  
  // 如果指定了 familyId，在该家庭内查找
  if (familyId) {
    const familyUsers = await getUsersByFamily(familyId);
    user = familyUsers.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
  } else {
    // 否则全局查找
    user = await getUserByUsername(username);
  }
  
  if (!user || !user.active) {
    return null;
  }
  
  // 验证密码
  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }
  
  // 如果是旧版密码哈希，升级到 bcrypt
  await upgradePasswordHash(user.id, password);
  
  // 获取家庭名称（如果有）
  let familyName: string | undefined;
  if (user.familyId) {
    const families = await getFamilies();
    const family = families.find((f) => f.id === user.familyId);
    familyName = family?.name;
  }
  
  return {
    ...user,
    familyName,
  };
}

export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('user_id', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export async function getCurrentUser(): Promise<(User & { familyName?: string; familyCode?: string }) | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  
  if (!userId) return null;
  
  const users = await getUsers();
  const foundUser = users.find((u) => u.id === userId && u.active);
  
  if (!foundUser) return null;
  
  // 获取家庭信息
  let familyName: string | undefined;
  let familyCode: string | undefined;
  if (foundUser.familyId) {
    const families = await getFamilies();
    const family = families.find((f) => f.id === foundUser.familyId);
    familyName = family?.name;
    familyCode = family?.familyCode;
  }
  
  return {
    ...foundUser,
    familyName,
    familyCode,
  };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('user_id');
}

// 注册（创建家庭 + 家庭 admin）
export async function register(familyName: string, username: string, password: string) {
  // 创建家庭
  const family = await createFamily(familyName);
  
  // 创建家庭 admin
  const user = await createUser({
    familyId: family.id,
    username,
    password,
    role: 'admin',
    active: true,
  });
  
  return {
    family,
    user,
  };
}

// 加入已有家庭
export async function joinFamily(familyCode: string, username: string, password: string, role: 'parent' | 'baby' = 'parent') {
  const { family, user } = await joinFamilyAndCreateUser(familyCode, username, password, role);
  
  return {
    family,
    user,
  };
}

// 家庭管理
export async function getFamilyService() {
  return {
    list: getFamilies,
    create: async (name: string) => {
      const families = await getFamilies();
      if (families.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('家庭名称已存在');
      }
      return createFamily(name);
    },
    delete: async (id: string) => {
      const users = await getUsers();
      const familyUsers = users.filter((u) => u.familyId === id);
      if (familyUsers.length > 0) {
        throw new Error('家庭下还有用户，无法删除');
      }
      return deleteUser(id);
    },
  };
}

// 用户管理
export async function getUserService() {
  return {
    list: getUsers,
    byFamily: async (familyId: string) => {
      const users = await getUsers();
      return users.filter((u) => u.familyId === familyId);
    },
    create: async (data: {
      familyId: string;
      username: string;
      password: string;
      role: 'admin' | 'parent' | 'baby';
      active?: boolean;
    }) => {
      return createUser({
        familyId: data.familyId,
        username: data.username,
        password: data.password,
        role: data.role,
        active: data.active !== false,
      });
    },
    update: updateUser,
    delete: deleteUser,
  };
}

// 重新导出 db 函数供 API 使用
export { getUsers, updateUser, deleteUser, getFamilies } from './db';
