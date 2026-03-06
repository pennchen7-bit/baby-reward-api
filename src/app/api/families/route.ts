import { NextResponse } from 'next/server';
import { getFamilies, createFamily, deleteFamily } from '@/lib/db';

export async function GET() {
  try {
    const families = await getFamilies();
    return NextResponse.json({ families });
  } catch (error) {
    console.error('Get families error:', error);
    return NextResponse.json(
      { error: '获取家庭列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: '家庭名称不能为空' },
        { status: 400 }
      );
    }

    const families = await getFamilies();
    if (families.some((f) => f.name === name.trim())) {
      return NextResponse.json(
        { error: '家庭名称已存在' },
        { status: 400 }
      );
    }

    const family = await createFamily(name.trim());
    return NextResponse.json({ success: true, family });
  } catch (error) {
    console.error('Create family error:', error);
    return NextResponse.json(
      { error: '创建家庭失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '缺少家庭 ID' },
        { status: 400 }
      );
    }

    const success = await deleteFamily(id);
    
    if (!success) {
      return NextResponse.json(
        { error: '删除失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete family error:', error);
    return NextResponse.json(
      { error: '删除家庭失败' },
      { status: 500 }
    );
  }
}
