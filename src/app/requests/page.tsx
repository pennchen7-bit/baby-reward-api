'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'parent' | 'baby';
  familyId?: string;
}

interface DrawRequest {
  id: string;
  babyId: string;
  babyName: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reason?: string;
  approvedByName?: string;
  createdAt: string;
  approvedAt?: string;
}

export default function RequestsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [allRequests, setAllRequests] = useState<DrawRequest[]>([]);
  const [requests, setRequests] = useState<DrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed'>('pending');
  
  // 审批弹窗
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DrawRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user?.familyId) {
      fetchRequests();
      // 轮询新请求 - 每 3 秒刷新
      const interval = setInterval(fetchRequests, 3000);
      return () => clearInterval(interval);
    }
  }, [user?.familyId]);

  // 筛选变化时只更新显示，不重新请求
  useEffect(() => {
    if (filter !== 'all') {
      setRequests(allRequests.filter((r) => r.status === filter));
    } else {
      setRequests(allRequests);
    }
  }, [filter, allRequests]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (!data.user) {
        router.push('/login');
        return;
      }
      if (data.user.role !== 'admin' && data.user.role !== 'parent') {
        alert('只有家长可以审批请求');
        router.push('/');
        return;
      }
      setUser(data.user);
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login');
    }
  };

  const fetchRequests = async () => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }
    
    try {
      const params = new URLSearchParams({
        familyId: user.familyId,
      });
      const res = await fetch(`/api/requests?${params}`);
      if (res.ok) {
        const data = await res.json();
        const fetchedRequests = data.requests || [];
        
        // 保存所有请求
        setAllRequests(fetchedRequests);
        
        // 根据筛选显示
        let filtered = fetchedRequests;
        if (filter !== 'all') {
          filtered = fetchedRequests.filter((r: DrawRequest) => r.status === filter);
        }
        setRequests(filtered);
      }
    } catch (error) {
      console.error('Fetch requests error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (req: DrawRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(req);
    setActionType(action);
    setReason('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!selectedRequest || !reason.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: actionType === 'approve' ? 'approved' : 'rejected',
          approvedBy: user?.id,
          approvedByName: user?.username,
          reason: reason.trim(),
        }),
      });
      
      if (res.ok) {
        setShowModal(false);
        fetchRequests();
        
        // 如果是批准，提示用户并建议查看历史记录
        if (actionType === 'approve') {
          alert('✅ 已批准！宝宝现在可以抽奖了。\n\n抽奖后历史记录会自动更新。');
        } else {
          alert('已拒绝该请求');
        }
      } else {
        const data = await res.json();
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <main className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        {/* 头部 */}
        <header className="flex justify-between items-center mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">🔔 审批请求</h1>
            <p className="text-xs sm:text-sm text-gray-600">
              {pendingCount > 0 ? (
                <span className="text-red-500 font-semibold">{pendingCount} 个待批准</span>
              ) : (
                '暂无待批准请求'
              )}
            </p>
          </div>
          <Link
            href="/"
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-xs sm:text-sm"
          >
            ← 返回
          </Link>
        </header>

        {/* 筛选 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { value: 'pending', label: '待批准', count: allRequests.filter((r) => r.status === 'pending').length },
            { value: 'approved', label: '已批准', count: allRequests.filter((r) => r.status === 'approved').length },
            { value: 'rejected', label: '已拒绝', count: allRequests.filter((r) => r.status === 'rejected').length },
            { value: 'completed', label: '已完成', count: allRequests.filter((r) => r.status === 'completed').length },
            { value: 'all', label: '全部', count: allRequests.length },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value as any)}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm whitespace-nowrap transition ${
                filter === item.value
                  ? 'bg-purple-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>

        {/* 请求列表 */}
        {loading ? (
          <div className="text-center text-gray-500 py-8">加载中...</div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-gray-600">
              {filter === 'pending' ? '没有待批准的请求' : '暂无记录'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-xl shadow p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">👶</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base sm:text-lg">{req.babyName}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            req.status === 'pending'
                              ? 'bg-orange-100 text-orange-700'
                              : req.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : req.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {req.status === 'pending' && '待批准'}
                          {req.status === 'approved' && '已批准'}
                          {req.status === 'rejected' && '已拒绝'}
                          {req.status === 'completed' && '已完成'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(req.createdAt).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* 原因显示 */}
                {req.reason && (
                  <div className={`text-xs p-2 rounded mb-3 ${
                    req.status === 'approved' 
                      ? 'bg-green-50 text-green-700' 
                      : req.status === 'rejected'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-gray-50 text-gray-600'
                  }`}>
                    <span className="font-medium">
                      {req.status === 'approved' ? '✓ 批准原因：' : req.status === 'rejected' ? '✗ 拒绝原因：' : '备注：'}
                    </span>
                    {req.reason}
                    {req.approvedByName && (
                      <span className="ml-2 text-gray-400">- {req.approvedByName}</span>
                    )}
                  </div>
                )}
                
                {/* 操作按钮 */}
                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(req, 'approve')}
                      className="flex-1 px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm sm:text-base"
                    >
                      ✓ 批准
                    </button>
                    <button
                      onClick={() => openModal(req, 'reject')}
                      className="flex-1 px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm sm:text-base"
                    >
                      ✗ 拒绝
                    </button>
                  </div>
                )}
                
                {req.status === 'approved' && (
                  <div className="text-green-600 text-sm font-medium">✓ 已批准</div>
                )}
                
                {req.status === 'rejected' && (
                  <div className="text-red-600 text-sm font-medium">✗ 已拒绝</div>
                )}
                
                {req.status === 'completed' && (
                  <div className="text-blue-600 text-sm font-medium">✓ 已抽奖</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 审批弹窗 */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">
              {actionType === 'approve' ? '✓ 批准请求' : '✗ 拒绝请求'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {selectedRequest.babyName} 的抽奖请求
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                rows={3}
                placeholder={
                  actionType === 'approve' 
                    ? '例如：今天表现很棒！' 
                    : '例如：今天作业还没完成哦'
                }
                autoFocus
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !reason.trim()}
                className={`flex-1 px-4 py-2 rounded-lg text-white transition text-sm ${
                  submitting || !reason.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : actionType === 'approve'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {submitting ? '提交中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
