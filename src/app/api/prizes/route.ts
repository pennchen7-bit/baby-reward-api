import { NextResponse } from 'next/server';
import { getPrizes, savePrize, deletePrize } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');
    
    const prizes = await getPrizes(familyId || undefined);
    return NextResponse.json({ prizes });
  } catch (error) {
    console.error('Get prizes error:', error);
    return NextResponse.json(
      { error: '获取奖品失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, points, imageUrl, probability, familyId } = body;

    // 如果没有传 familyId，从当前用户获取
    let actualFamilyId = familyId;
    if (!actualFamilyId) {
      const user = await getCurrentUser();
      if (user && user.familyId) {
        actualFamilyId = user.familyId;
      }
    }

    const prize = {
      id: uuidv4(),
      familyId: actualFamilyId,
      name,
      description: description || null,
      points: points || 0,
      imageUrl: imageUrl || null,
      probability: probability || 1.0,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await savePrize(prize);
    return NextResponse.json({ success: true, prize });
  } catch (error) {
    console.error('Create prize error:', error);
    return NextResponse.json(
      { error: '创建奖品失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description, points, imageUrl, probability, active, familyId } = body;

    const prizes = await getPrizes();
    const existing = prizes.find((p) => p.id === id);

    if (!existing) {
      return NextResponse.json(
        { error: '奖品不存在' },
        { status: 404 }
      );
    }

    const prize = {
      ...existing,
      familyId: familyId || existing.familyId,
      name: name || existing.name,
      description: description !== undefined ? description : existing.description,
      points: points !== undefined ? points : existing.points,
      imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
      probability: probability !== undefined ? probability : existing.probability,
      active: active !== undefined ? active : existing.active,
      updatedAt: new Date(),
    };

    await savePrize(prize);
    return NextResponse.json({ success: true, prize });
  } catch (error) {
    console.error('Update prize error:', error);
    return NextResponse.json(
      { error: '更新奖品失败' },
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
        { error: '缺少奖品 ID' },
        { status: 400 }
      );
    }

    await deletePrize(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete prize error:', error);
    return NextResponse.json(
      { error: '删除奖品失败' },
      { status: 500 }
    );
  }
}
