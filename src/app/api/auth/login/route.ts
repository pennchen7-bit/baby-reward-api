import { NextResponse } from 'next/server';
import { authenticate, createSession, initAuth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // 确保超级管理员存在
    await initAuth();
    
    const body = await request.json();
    const { username, password, familyId, familyCode } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    // 如果提供了 familyCode，先查找家庭
    let targetFamilyId = familyId;
    if (familyCode && !targetFamilyId) {
      const { getFamilyByCode } = await import('@/lib/db');
      const family = await getFamilyByCode(familyCode);
      if (!family) {
        return NextResponse.json(
          { error: '家庭码不存在' },
          { status: 404 }
        );
      }
      targetFamilyId = family.id;
    }

    const user = await authenticate(username, password, targetFamilyId);

    if (!user) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    await createSession(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        familyId: user.familyId,
        familyName: user.familyName,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '登录失败' },
      { status: 500 }
    );
  }
}
