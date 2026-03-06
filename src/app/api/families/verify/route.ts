import { NextResponse } from 'next/server';
import { getFamilyByCode } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { familyCode } = body;

    if (!familyCode || !familyCode.trim()) {
      return NextResponse.json(
        { error: '请输入家庭码' },
        { status: 400 }
      );
    }

    const family = await getFamilyByCode(familyCode.trim());

    if (!family) {
      return NextResponse.json(
        { error: '家庭码不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      family: {
        id: family.id,
        name: family.name,
        familyCode: family.familyCode,
      },
    });
  } catch (error) {
    console.error('Verify family code error:', error);
    return NextResponse.json(
      { error: '验证失败' },
      { status: 500 }
    );
  }
}
