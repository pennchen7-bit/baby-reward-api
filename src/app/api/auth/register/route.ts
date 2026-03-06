import { NextResponse } from 'next/server';
import { register, initAuth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // 确保超级管理员存在
    await initAuth();
    
    const body = await request.json();
    const { familyName, username, password } = body;

    if (!familyName || !familyName.trim()) {
      return NextResponse.json(
        { error: '请输入家庭名称' },
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

    const { family, user } = await register(
      familyName.trim(),
      username.trim(),
      password
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
    console.error('Register error:', error);
    return NextResponse.json(
      { error: error.message || '注册失败' },
      { status: 500 }
    );
  }
}
