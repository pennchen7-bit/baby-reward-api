import { NextResponse } from 'next/server';
import { getDrawRequests, createDrawRequest, updateDrawRequest, deleteDrawRequest, getUsers } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const babyId = searchParams.get('babyId') || undefined;
    const familyId = searchParams.get('familyId') || undefined;
    const status = searchParams.get('status') || undefined;

    const requests = await getDrawRequests({ babyId, familyId, status });
    
    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Get requests error:', error);
    return NextResponse.json(
      { error: '获取请求列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { babyId, familyId } = body;

    if (!babyId) {
      return NextResponse.json(
        { error: '缺少宝宝 ID' },
        { status: 400 }
      );
    }

    // 获取宝宝信息
    const users = await getUsers();
    const baby = users.find((u) => u.id === babyId);
    
    if (!baby) {
      return NextResponse.json(
        { error: '宝宝不存在' },
        { status: 404 }
      );
    }

    // 检查是否有待处理或已批准的请求
    const existingRequests = await getDrawRequests({ babyId });
    const pendingOrApproved = existingRequests.filter(
      (r) => r.status === 'pending' || r.status === 'approved'
    );
    if (pendingOrApproved.length > 0) {
      return NextResponse.json(
        { error: '已有待批准或已批准的请求', request: pendingOrApproved[0] },
        { status: 400 }
      );
    }

    const newRequest = await createDrawRequest({
      familyId: familyId || baby.familyId,
      babyId,
      babyName: baby.username,
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      request: newRequest,
    });
  } catch (error) {
    console.error('Create request error:', error);
    return NextResponse.json(
      { error: '创建请求失败' },
      { status: 500 }
    );
  }
}
