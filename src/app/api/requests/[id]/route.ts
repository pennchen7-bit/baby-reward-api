import { NextResponse } from 'next/server';
import { getDrawRequests, updateDrawRequest, deleteDrawRequest } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const requests = await getDrawRequests();
    const req = requests.find((r) => r.id === params.id);
    
    if (!req) {
      return NextResponse.json(
        { error: '请求不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ request: req });
  } catch (error) {
    console.error('Get request error:', error);
    return NextResponse.json(
      { error: '获取请求失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, approvedBy, approvedByName, reason } = body;

    const requests = await getDrawRequests();
    const existing = requests.find((r) => r.id === params.id);
    
    if (!existing) {
      return NextResponse.json(
        { error: '请求不存在' },
        { status: 404 }
      );
    }

    // 批准或拒绝时必须有原因
    if ((status === 'approved' || status === 'rejected') && !reason) {
      return NextResponse.json(
        { error: '请填写原因' },
        { status: 400 }
      );
    }

    const updated = await updateDrawRequest(params.id, {
      status,
      approvedBy,
      approvedByName,
      reason,
      approvedAt: status === 'approved' || status === 'rejected' ? new Date().toISOString() : undefined,
    });

    return NextResponse.json({
      success: true,
      request: updated,
    });
  } catch (error) {
    console.error('Update request error:', error);
    return NextResponse.json(
      { error: '更新请求失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const requests = await getDrawRequests();
    const existing = requests.find((r) => r.id === params.id);
    
    if (!existing) {
      return NextResponse.json(
        { error: '请求不存在' },
        { status: 404 }
      );
    }

    // 只能删除 pending 状态的请求
    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: '只能取消待批准的请求' },
        { status: 400 }
      );
    }

    const success = await deleteDrawRequest(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: '删除失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete request error:', error);
    return NextResponse.json(
      { error: '删除请求失败' },
      { status: 500 }
    );
  }
}
