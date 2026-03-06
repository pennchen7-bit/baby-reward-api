import { NextResponse } from 'next/server';
import { getUserByUsername, getFamilies, getUsers } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username || !username.trim()) {
      return NextResponse.json(
        { error: '请输入用户名' },
        { status: 400 }
      );
    }

    const allUsers = await getUsers();
    const matchingUsers = allUsers.filter(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.active
    );

    if (matchingUsers.length === 0) {
      // 用户名不存在，不需要家庭码
      return NextResponse.json({
        requiresFamilyCode: false,
        userExists: false,
      });
    }

    if (matchingUsers.length === 1) {
      // 只有一个用户，直接返回 familyId
      return NextResponse.json({
        requiresFamilyCode: false,
        userExists: true,
        familyId: matchingUsers[0].familyId || undefined,
      });
    }

    // 多个用户有相同用户名，需要家庭码
    const families = await getFamilies();
    const familyMap = new Map(families.map((f) => [f.id, f]));

    return NextResponse.json({
      requiresFamilyCode: true,
      userExists: true,
      families: matchingUsers.map((u) => {
        const family = familyMap.get(u.familyId);
        return {
          familyId: u.familyId,
          familyName: family?.name || '未知家庭',
          familyCode: family?.familyCode || '',
        };
      }),
    });
  } catch (error) {
    console.error('Check username error:', error);
    return NextResponse.json(
      { error: '检查失败' },
      { status: 500 }
    );
  }
}
