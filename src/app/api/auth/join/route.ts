import { NextResponse } from 'next/server';
import { joinFamily, initAuth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // 确保超级管理员存在
    await initAuth();
    
    const body = await request.json();
    const { familyCode, username, password } = body;

    if (!familyCode || !familyCode.trim()) {
      return NextResponse.json(
        { error: '请输入家庭码' },
        { status: 400 }
      );
    }

    if (!username || !username.trim()) {
      return NextResponse.json(
        { error: '请输入用户名' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: '密码至少 6 位' },
        { status: 400 }
      );
    }

    const { family, user } = await joinFamily(
      familyCode.trim(),
      username.trim(),
      password,
      'parent' // 默认加入为家长角色
    );

    return NextResponse.json({
      success: true,
      family: {
        id: family.id,
        name: family.name,
        familyCode: family.familyCode,
      },
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        familyId: user.familyId,
        familyName: family.name,
      },
    });
  } catch (error: any) {
    console.error('Join family error:', error);
    return NextResponse.json(
      { error: error.message || '加入失败' },
      { status: 500 }
    );
  }
}
