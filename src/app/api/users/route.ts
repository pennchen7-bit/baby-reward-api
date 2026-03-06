import { NextResponse } from 'next/server';
import { getUsers, createUser, updateUser, deleteUser } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const users = await getUsers();
    // 不返回密码
    const safeUsers = users.map(({ passwordHash, ...user }) => user);
    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, role, active } = body;

    // 获取当前用户以获取 familyId
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    // 只能用 admin 创建 parent 或 baby
    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      );
    }

    const users = await getUsers();
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return NextResponse.json(
        { error: '用户名已存在' },
        { status: 400 }
      );
    }

    // 确定角色（只能是 parent 或 baby）
    const userRole = role === 'parent' ? 'parent' : 'baby';

    const user = await createUser({
      familyId: currentUser.familyId,
      username,
      password,
      role: userRole,
      active: active !== false,
    });

    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: error.message || '创建用户失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '缺少用户 ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { username, password, role, active } = body;

    const users = await getUsers();
    const existing = users.find((u) => u.id === id);

    if (!existing) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 检查用户名是否重复
    if (username && username.toLowerCase() !== existing.username.toLowerCase()) {
      if (users.some((u) => u.username.toLowerCase() === username.toLowerCase() && u.id !== id)) {
        return NextResponse.json(
          { error: '用户名已存在' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      username: username || existing.username,
      role: role || existing.role,
      active: active !== undefined ? active : existing.active,
    };
    
    if (password) {
      updateData.password = password;
    }

    const updated = await updateUser(id, updateData);

    if (!updated) {
      return NextResponse.json(
        { error: '更新失败' },
        { status: 500 }
      );
    }

    const { passwordHash: _, ...safeUser } = updated;
    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: error.message || '更新用户失败' },
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
        { error: '缺少用户 ID' },
        { status: 400 }
      );
    }

    const users = await getUsers();
    
    // 不能删除 admin
    const userToDelete = users.find((u) => u.id === id);
    if (userToDelete?.role === 'admin') {
      return NextResponse.json(
        { error: '不能删除家庭管理员' },
        { status: 400 }
      );
    }
    
    if (users.length <= 1) {
      return NextResponse.json(
        { error: '至少需要保留一个用户' },
        { status: 400 }
      );
    }

    const success = await deleteUser(id);
    
    if (!success) {
      return NextResponse.json(
        { error: '删除失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: error.message || '删除用户失败' },
      { status: 500 }
    );
  }
}
