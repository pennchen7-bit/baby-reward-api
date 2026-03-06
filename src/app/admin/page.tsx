'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Prize {
  id: string;
  name: string;
  description: string | null;
  points: number;
  imageUrl: string | null;
  probability: number;
  active: boolean;
}

interface User {
  id: string;
  username: string;
  role: 'super_admin' | 'admin' | 'parent' | 'baby';
  active: boolean;
  createdAt: string;
}

type Tab = 'prizes' | 'users';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('prizes');
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // 奖品状态
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [prizeLoading, setPrizeLoading] = useState(true);
  const [showPrizeForm, setShowPrizeForm] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [prizeFormData, setPrizeFormData] = useState({
    name: '',
    description: '',
    points: 0,
    imageUrl: '',
    probability: 1,
    active: true,
  });

  // 用户状态
  const [users, setUsers] = useState<User[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    password: '',
    role: 'baby' as 'parent' | 'baby',
    active: true,
  });

  useEffect(() => {
    checkAuth();
    fetchPrizes();
    fetchUsers();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      const user = data.user;
      setCurrentUser(user);
      
      // 只有家庭 admin 可以访问
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        alert('需要管理员权限');
        router.push('/');
        return;
      }
    } catch (error) {
      router.push('/login');
    }
  };

  const fetchPrizes = async () => {
    try {
      const res = await fetch('/api/prizes');
      const data = await res.json();
      setPrizes(data.prizes || []);
    } catch (error) {
      console.error('Failed to fetch prizes:', error);
    } finally {
      setPrizeLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      // 过滤掉 super_admin
      const filteredUsers = (data.users || []).filter((u: User) => (u.role as string) !== 'super_admin');
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setUserLoading(false);
    }
  };

  // 奖品操作
  const handleSavePrize = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingPrize ? '/api/prizes' : '/api/prizes';
      const method = editingPrize ? 'PUT' : 'POST';
      const body = editingPrize 
        ? { ...prizeFormData, id: editingPrize.id }
        : prizeFormData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        fetchPrizes();
        setShowPrizeForm(false);
        setEditingPrize(null);
        setPrizeFormData({
          name: '',
          description: '',
          points: 0,
          imageUrl: '',
          probability: 1,
          active: true,
        });
      }
    } catch (error) {
      console.error('Failed to save prize:', error);
    }
  };

  const handleEditPrize = (prize: Prize) => {
    setEditingPrize(prize);
    setPrizeFormData({
      name: prize.name,
      description: prize.description || '',
      points: prize.points,
      imageUrl: prize.imageUrl || '',
      probability: prize.probability,
      active: prize.active,
    });
    setShowPrizeForm(true);
  };

  const handleDeletePrize = async (id: string) => {
    if (!confirm('确定要删除这个奖品吗？')) return;
    
    try {
      await fetch(`/api/prizes?id=${id}`, { method: 'DELETE' });
      fetchPrizes();
    } catch (error) {
      console.error('Failed to delete prize:', error);
    }
  };

  const handleTogglePrizeActive = async (prize: Prize) => {
    try {
      await fetch('/api/prizes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prize, active: !prize.active }),
      });
      fetchPrizes();
    } catch (error) {
      console.error('Failed to update prize:', error);
    }
  };

  // 用户操作
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingUser ? `/api/users?id=${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userFormData),
      });

      if (res.ok) {
        fetchUsers();
        setShowUserForm(false);
        setEditingUser(null);
        setUserFormData({
          username: '',
          password: '',
          role: 'baby',
          active: true,
        });
      }
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      username: user.username,
      password: '',
      role: user.role as 'parent' | 'baby',
      active: user.active,
    });
    setShowUserForm(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('确定要删除这个用户吗？')) return;
    
    try {
      await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleToggleUserActive = async (user: User) => {
    try {
      await fetch(`/api/users?id=${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, active: !user.active }),
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  if (prizeLoading || userLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">加载中...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <header className="flex justify-between items-center mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">⚙️ 家庭管理</h1>
            <p className="text-xs sm:text-sm text-gray-600">
              {currentUser?.familyName && `🏠 ${currentUser.familyName}`}
            </p>
          </div>
          <Link
            href="/"
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-xs sm:text-sm"
          >
            ← 返回
          </Link>
        </header>

        {/* 标签页 */}
        <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6 border-b">
          <button
            onClick={() => setActiveTab('prizes')}
            className={`px-3 sm:px-4 py-2 font-semibold transition text-xs sm:text-sm ${
              activeTab === 'prizes'
                ? 'border-b-2 border-purple-500 text-purple-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🎁 奖品管理
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 sm:px-4 py-2 font-semibold transition text-xs sm:text-sm ${
              activeTab === 'users'
                ? 'border-b-2 border-purple-500 text-purple-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            👤 成员管理
          </button>
        </div>

        {/* 奖品管理 */}
        {activeTab === 'prizes' && (
          <div className="bg-white rounded-xl shadow p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">🎁 奖品列表</h2>
              <button
                onClick={() => {
                  setShowPrizeForm(!showPrizeForm);
                  setEditingPrize(null);
                  setPrizeFormData({
                    name: '',
                    description: '',
                    points: 0,
                    imageUrl: '',
                    probability: 1,
                    active: true,
                  });
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-xs sm:text-sm"
              >
                {showPrizeForm ? '取消' : '+ 添加奖品'}
              </button>
            </div>

            {showPrizeForm && (
              <form onSubmit={handleSavePrize} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <input
                    type="text"
                    placeholder="奖品名称"
                    value={prizeFormData.name}
                    onChange={(e) => setPrizeFormData({ ...prizeFormData, name: e.target.value })}
                    className="p-2 border rounded text-sm sm:text-base"
                    required
                  />
                  <input
                    type="number"
                    placeholder="积分"
                    value={prizeFormData.points}
                    onChange={(e) => setPrizeFormData({ ...prizeFormData, points: parseInt(e.target.value) || 0 })}
                    className="p-2 border rounded text-sm sm:text-base"
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="概率权重"
                    value={prizeFormData.probability}
                    onChange={(e) => setPrizeFormData({ ...prizeFormData, probability: parseFloat(e.target.value) || 1 })}
                    className="p-2 border rounded text-sm sm:text-base"
                  />
                  <input
                    type="text"
                    placeholder="表情/图片 URL"
                    value={prizeFormData.imageUrl}
                    onChange={(e) => setPrizeFormData({ ...prizeFormData, imageUrl: e.target.value })}
                    className="p-2 border rounded text-sm sm:text-base"
                  />
                  <textarea
                    placeholder="描述"
                    value={prizeFormData.description}
                    onChange={(e) => setPrizeFormData({ ...prizeFormData, description: e.target.value })}
                    className="p-2 border rounded col-span-2 text-sm sm:text-base"
                    rows={2}
                  />
                  <label className="flex items-center gap-2 col-span-2 text-sm">
                    <input
                      type="checkbox"
                      checked={prizeFormData.active}
                      onChange={(e) => setPrizeFormData({ ...prizeFormData, active: e.target.checked })}
                    />
                    <span>启用此奖品</span>
                  </label>
                </div>
                <button
                  type="submit"
                  className="mt-4 px-6 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition text-sm sm:text-base"
                >
                  {editingPrize ? '更新' : '添加'}
                </button>
              </form>
            )}

            <div className="space-y-3">
              {prizes.map((prize) => (
                <div
                  key={prize.id}
                  className={`p-3 sm:p-4 border rounded-lg flex justify-between items-center ${
                    prize.active ? 'bg-white' : 'bg-gray-100 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{prize.imageUrl || '🎁'}</span>
                      <span className="font-semibold text-sm sm:text-base">{prize.name}</span>
                      {!prize.active && (
                        <span className="text-xs bg-gray-300 px-2 py-1 rounded">已禁用</span>
                      )}
                    </div>
                    {prize.description && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">{prize.description}</p>
                    )}
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      ⭐ {prize.points} 积分 | 概率：{prize.probability}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTogglePrizeActive(prize)}
                      className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${
                        prize.active
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {prize.active ? '禁用' : '启用'}
                    </button>
                    <button
                      onClick={() => handleEditPrize(prize)}
                      className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs sm:text-sm hover:bg-blue-200"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeletePrize(prize.id)}
                      className="px-2 sm:px-3 py-1 bg-red-100 text-red-700 rounded text-xs sm:text-sm hover:bg-red-200"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
              {prizes.length === 0 && (
                <p className="text-center text-gray-500 py-8 text-sm">暂无奖品，点击上方按钮添加</p>
              )}
            </div>
          </div>
        )}

        {/* 用户管理 */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">👤 家庭成员</h2>
              <button
                onClick={() => {
                  setShowUserForm(!showUserForm);
                  setEditingUser(null);
                  setUserFormData({
                    username: '',
                    password: '',
                    role: 'baby',
                    active: true,
                  });
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-xs sm:text-sm"
              >
                {showUserForm ? '取消' : '+ 添加成员'}
              </button>
            </div>

            {showUserForm && (
              <form onSubmit={handleSaveUser} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                    <input
                      type="text"
                      placeholder="用户名"
                      value={userFormData.username}
                      onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                      className="w-full p-2 border rounded text-sm sm:text-base"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                    <input
                      type="text"
                      placeholder="密码"
                      value={userFormData.password}
                      onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                      className="w-full p-2 border rounded text-sm sm:text-base"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                    <select
                      value={userFormData.role}
                      onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as 'parent' | 'baby' })}
                      className="w-full p-2 border rounded text-sm sm:text-base"
                    >
                      <option value="parent">👨 家长（可以审批）</option>
                      <option value="baby">👶 宝宝（可以抽奖）</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={userFormData.active}
                      onChange={(e) => setUserFormData({ ...userFormData, active: e.target.checked })}
                    />
                    <span>启用账户</span>
                  </label>
                </div>
                <button
                  type="submit"
                  className="mt-4 px-6 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition text-sm sm:text-base"
                >
                  {editingUser ? '更新' : '添加'}
                </button>
              </form>
            )}

            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`p-3 sm:p-4 border rounded-lg flex justify-between items-center ${
                    user.active ? 'bg-white' : 'bg-gray-100 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {user.role === 'admin' ? '👑' : user.role === 'parent' ? '👨' : '👶'}
                      </span>
                      <span className="font-semibold text-sm sm:text-base">{user.username}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : user.role === 'parent'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-pink-100 text-pink-700'
                      }`}>
                        {user.role === 'admin' ? '管理员' : user.role === 'parent' ? '家长' : '宝宝'}
                      </span>
                      {!user.active && (
                        <span className="text-xs bg-gray-300 px-2 py-1 rounded">已禁用</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      创建于：{new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {user.role !== 'admin' && (
                      <>
                        <button
                          onClick={() => handleToggleUserActive(user)}
                          className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${
                            user.active
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {user.active ? '禁用' : '启用'}
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs sm:text-sm hover:bg-blue-200"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="px-2 sm:px-3 py-1 bg-red-100 text-red-700 rounded text-xs sm:text-sm hover:bg-red-200"
                        >
                          删除
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-center text-gray-500 py-8 text-sm">暂无成员，点击上方按钮添加</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
