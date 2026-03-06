'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  role: 'super_admin' | 'admin' | 'parent' | 'baby';
  familyId?: string;
  familyName?: string;
}

interface DrawRequest {
  id: string;
  babyId: string;
  babyName: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reason?: string;
  createdAt: string;
  approvedAt?: string;
}

interface DrawRecord {
  id: string;
  babyName: string;
  prizeName: string;
  prizeDescription: string | null;
  points: number;
  imageUrl: string | null;
  drawnAt: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeRequest, setActiveRequest] = useState<DrawRequest | null>(null);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved'>('none');
  
  // 家长审批相关
  const [pendingRequests, setPendingRequests] = useState<DrawRequest[]>([]);
  const [showApproval, setShowApproval] = useState(false);
  const [approvalReason, setApprovalReason] = useState('');
  
  // 家长查看中奖历史
  const [drawRecords, setDrawRecords] = useState<DrawRecord[]>([]);
  const [recordsPage, setRecordsPage] = useState(1);
  const [hasMoreRecords, setHasMoreRecords] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  // 轮询请求状态（宝宝用）
  useEffect(() => {
    if (user?.role === 'baby' && requestStatus === 'pending' && activeRequest) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/requests/${activeRequest.id}`);
          if (res.ok) {
            const data = await res.json();
            const newStatus = data.request.status;
            if (newStatus === 'approved') {
              setRequestStatus('approved');
              setActiveRequest(data.request);
            } else if (newStatus === 'rejected' || newStatus === 'completed') {
              setRequestStatus('none');
              setActiveRequest(null);
            }
          }
        } catch (error) {
          console.error('Poll error:', error);
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [user, requestStatus, activeRequest]);

  // 轮询待批准请求（家长/管理员用）
  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'parent') {
      const interval = setInterval(() => {
        fetchPendingRequests(user.familyId);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [user?.role, user?.familyId]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        
        if (data.user.role === 'baby') {
          checkPendingRequest(data.user.id);
        }
        
        // 家长/管理员直接获取待批准请求和中奖历史
        if (data.user.role === 'admin' || data.user.role === 'parent') {
          fetchPendingRequestsDirect(data.user.familyId);
          fetchDrawRecords(data.user.familyId, 1);
        }
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequestsDirect = async (familyId?: string) => {
    if (!familyId) return;
    try {
      const params = new URLSearchParams({ familyId, status: 'pending' });
      const res = await fetch(`/api/requests?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Fetch pending requests error:', error);
    }
  };

  const fetchPendingRequests = async () => {
    if (!user?.familyId) return;
    try {
      const params = new URLSearchParams({ familyId: user.familyId, status: 'pending' });
      const res = await fetch(`/api/requests?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Fetch pending requests error:', error);
    }
  };

  const fetchDrawRecords = async (familyId?: string, page = 1) => {
    const fid = familyId || user?.familyId;
    if (!fid) return;
    try {
      const params = new URLSearchParams({ 
        familyId: fid, 
        limit: '10',
        page: page.toString()
      });
      const res = await fetch(`/api/history?${params}`);
      if (res.ok) {
        const data = await res.json();
        const records = data.records || [];
        
        if (page === 1) {
          setDrawRecords(records);
        } else {
          setDrawRecords(prev => [...prev, ...records]);
        }
        
        setHasMoreRecords(records.length === 10);
        setRecordsPage(page);
      }
    } catch (error) {
      console.error('Fetch draw records error:', error);
    }
  };

  const loadMoreRecords = () => {
    if (hasMoreRecords) {
      fetchDrawRecords(undefined, recordsPage + 1);
    }
  };

  const checkPendingRequest = async (babyId: string) => {
    try {
      // 先检查是否有 approved 的请求
      const approvedRes = await fetch(`/api/requests?babyId=${babyId}&status=approved`);
      if (approvedRes.ok) {
        const approvedData = await approvedRes.json();
        if (approvedData.requests?.length > 0) {
          const req = approvedData.requests[0];
          setActiveRequest(req);
          setRequestStatus('approved');
          return;
        }
      }
      
      // 再检查 pending 的请求
      const pendingRes = await fetch(`/api/requests?babyId=${babyId}&status=pending`);
      if (pendingRes.ok) {
        const data = await pendingRes.json();
        if (data.requests?.length > 0) {
          const req = data.requests[0];
          setActiveRequest(req);
          setRequestStatus('pending');
        }
      }
    } catch (error) {
      console.error('Check request error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleApprove = async (requestId: string, approve: boolean) => {
    if (!approvalReason.trim()) {
      alert('请填写原因');
      return;
    }
    
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: approve ? 'approved' : 'rejected',
          approvedBy: user?.id,
          approvedByName: user?.username,
          reason: approvalReason.trim(),
        }),
      });
      
      if (res.ok) {
        alert(approve ? '✅ 已批准' : '已拒绝');
        setShowApproval(false);
        setApprovalReason('');
        fetchPendingRequests();
      } else {
        const data = await res.json();
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('Approve error:', error);
      alert('操作失败，请重试');
    }
  };

  const handleRequestDraw = async () => {
    if (!user) return;

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ babyId: user.id, familyId: user.familyId }),
      });

      const data = await res.json();

      if (res.ok) {
        setActiveRequest(data.request);
        setRequestStatus('pending');
      } else if (data.error === '已有待批准的请求' && data.request) {
        // 已有 pending 请求，直接使用
        setActiveRequest(data.request);
        setRequestStatus('pending');
      } else {
        alert(data.error || '发起请求失败，请重试');
      }
    } catch (error) {
      console.error('Request draw error:', error);
      alert('发起请求失败，请重试');
    }
  };

  const handleCancelRequest = async () => {
    if (!activeRequest) return;

    try {
      await fetch(`/api/requests/${activeRequest.id}`, { method: 'DELETE' });
      setActiveRequest(null);
      setRequestStatus('none');
    } catch (error) {
      console.error('Cancel request error:', error);
    }
  };

  const handleDraw = async () => {
    if (isSpinning || requestStatus !== 'approved') return;

    setIsSpinning(true);
    setResult(null);
    setShowConfetti(false);

    try {
      const response = await fetch('/api/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: activeRequest?.id }),
      });
      const data = await response.json();

      if (response.ok) {
        setTimeout(() => {
          setIsSpinning(false);
          setResult(data);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
          
          setTimeout(() => {
            setRequestStatus('none');
            setActiveRequest(null);
          }, 4000);
        }, 2000);
      } else {
        alert(data.error || '抽奖失败');
        setIsSpinning(false);
      }
    } catch (error) {
      console.error('Draw error:', error);
      alert('抽奖失败，请重试');
      setIsSpinning(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center">
        <div className="text-lg text-purple-600">加载中...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 p-3 sm:p-4">
      {/* 彩带效果 */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="confetti absolute w-2 h-2 sm:w-3 sm:h-3"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'][
                  Math.floor(Math.random() * 6)
                ],
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="max-w-lg mx-auto">
        {/* 头部 */}
        <header className="text-center py-4 sm:py-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-purple-600 mb-1 sm:mb-2">
            🎁 宝宝奖励计划
          </h1>
          {user?.role === 'baby' ? (
            <p className="text-xs sm:text-sm text-gray-600">今天表现棒棒的！</p>
          ) : (
            <p className="text-xs sm:text-sm text-gray-600">
              {user?.role === 'parent' || user?.role === 'admin' 
                ? '记录宝宝成长的每一步' 
                : '欢迎使用'}
            </p>
          )}
          
          {/* 家庭信息 */}
          {user && (
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <span className="text-xs bg-white px-2 py-1 rounded-full shadow text-gray-600">
                👤 {user.username}
                {user.role === 'super_admin' && <span className="ml-1 text-red-600">超级管理员</span>}
                {user.role === 'admin' && <span className="ml-1 text-purple-600">家庭管理员</span>}
                {user.role === 'parent' && <span className="ml-1 text-green-600">家长</span>}
                {user.role === 'baby' && <span className="ml-1 text-pink-600">宝宝</span>}
              </span>
              {user.familyName && (
                <span className="text-xs bg-white px-2 py-1 rounded-full shadow text-gray-600">
                  🏠 {user.familyName}
                </span>
              )}
              {user.familyCode && (
                <span className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 px-2 py-1 rounded-full shadow text-purple-700 font-semibold">
                  🔑 家庭码：{user.familyCode}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="text-xs text-gray-400 hover:text-gray-600 underline ml-2"
              >
                退出
              </button>
            </div>
          )}
        </header>

        {/* 导航 */}
        <nav className="flex justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap">
          {user?.role === 'super_admin' ? (
            <Link
              href="/admin"
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-lg shadow hover:shadow-md transition text-xs sm:text-sm"
            >
              ⚙️ 管理所有家庭
            </Link>
          ) : user?.role === 'admin' ? (
            <>
              <Link
                href="/admin"
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-lg shadow hover:shadow-md transition text-xs sm:text-sm"
              >
                ⚙️ 家庭管理
              </Link>
              <Link
                href="/requests"
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-lg shadow hover:shadow-md transition text-xs sm:text-sm"
              >
                🔔 审批管理
              </Link>
            </>
          ) : user?.role === 'parent' ? (
            <Link
              href="/requests"
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-lg shadow hover:shadow-md transition text-xs sm:text-sm"
            >
              🔔 审批管理
            </Link>
          ) : (
            <>
              <Link
                href="/history"
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-lg shadow hover:shadow-md transition text-xs sm:text-sm"
              >
                📜 历史
              </Link>
              <Link
                href="/reports"
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-lg shadow hover:shadow-md transition text-xs sm:text-sm"
              >
                📊 报告
              </Link>
            </>
          )}
        </nav>

        {/* 家长审批区域 */}
        {(user?.role === 'admin' || user?.role === 'parent') && (
          <>
            <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-orange-600">
                  🔔 待批准请求 ({pendingRequests.length})
                </h2>
                <button
                  onClick={fetchPendingRequests}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  🔄 刷新
                </button>
              </div>
              {pendingRequests.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">暂无待批准请求</p>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="border rounded-xl p-3 bg-orange-50">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-semibold text-gray-800">
                          👶 {req.babyName} 申请抽奖
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(req.createdAt).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowApproval(true);
                            setActiveRequest(req);
                          }}
                          className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-semibold"
                        >
                          ✅ 批准
                        </button>
                        <button
                          onClick={() => {
                            setShowApproval(true);
                            setActiveRequest(req);
                          }}
                          className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-semibold"
                        >
                          ❌ 拒绝
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 中奖历史 */}
            <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-purple-600">
                  🏆 宝宝中奖记录
                </h2>
                <span className="text-xs text-gray-500">最近 {drawRecords.length} 条</span>
              </div>
              
              {drawRecords.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">
                  暂无中奖记录，快给宝宝添加奖品吧！
                </p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {drawRecords.map((record) => (
                    <div key={record.id} className="border border-purple-100 rounded-xl p-4 bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 hover:shadow-md transition">
                      {/* 奖品信息 */}
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                          <span className="text-2xl">{record.imageUrl || '🎁'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-base text-purple-700">
                              {record.prizeName}
                            </p>
                            {record.points > 0 && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                                ⭐ {record.points} 积分
                              </span>
                            )}
                          </div>
                          {record.prizeDescription && (
                            <p className="text-xs text-gray-600 bg-white/50 px-2 py-1 rounded inline-block">
                              📝 {record.prizeDescription}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* 中奖信息 */}
                      <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-purple-100">
                        <span className="font-medium text-purple-600">👶 {record.babyName}</span>
                        <span>·</span>
                        <span>{new Date(record.drawnAt).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}</span>
                      </div>
                    </div>
                  ))}
                  
                  {hasMoreRecords && (
                    <button
                      onClick={loadMoreRecords}
                      className="w-full py-3 text-sm text-purple-600 font-semibold bg-purple-50 hover:bg-purple-100 rounded-xl transition"
                    >
                      ⬇️ 加载更多（第 {recordsPage} 页）
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* 审批弹窗 */}
        {showApproval && activeRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold mb-4">
                {pendingRequests.find(r => r.id === activeRequest.id) ? '审批请求' : '审批结果'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                👶 {activeRequest.babyName} 申请抽奖
              </p>
              <textarea
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder="请填写原因（必填）"
                className="w-full p-3 border rounded-lg text-sm mb-4"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowApproval(false);
                    setApprovalReason('');
                    setActiveRequest(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  取消
                </button>
                <button
                  onClick={() => handleApprove(activeRequest.id, true)}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                >
                  批准
                </button>
                <button
                  onClick={() => handleApprove(activeRequest.id, false)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  拒绝
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 抽奖区域 - 只有宝宝显示 */}
        {user?.role === 'baby' && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 text-center">
            {result ? (
              <div className="animate-bounce-in">
                <div className="text-6xl sm:text-8xl mb-3 sm:mb-4">🎉</div>
                <h2 className="text-xl sm:text-2xl font-bold text-purple-600 mb-2">恭喜你！</h2>
                <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">
                  {result.prize.imageUrl || '🏆'}
                </div>
                <p className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
                  {result.prize.name}
                </p>
                {result.prize.description && (
                  <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">{result.prize.description}</p>
                )}
                {result.prize.points > 0 && (
                  <p className="text-base sm:text-lg text-yellow-600 font-medium">
                    ⭐ +{result.prize.points} 积分
                  </p>
                )}
              </div>
            ) : requestStatus === 'approved' ? (
              <>
                <div className="text-6xl sm:text-8xl mb-4 sm:mb-6">✨</div>
                <h2 className="text-lg sm:text-xl font-bold text-green-600 mb-2">
                  家长已批准！
                </h2>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                  可以开始抽奖啦～
                </p>
                <button
                  onClick={handleDraw}
                  disabled={isSpinning}
                  className={`w-full sm:w-auto px-8 sm:px-12 py-3 sm:py-4 text-lg sm:text-xl font-bold rounded-full transition transform hover:scale-105 ${
                    isSpinning
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg'
                  }`}
                >
                  {isSpinning ? '抽奖中...' : '🎰 开始抽奖'}
                </button>
              </>
            ) : requestStatus === 'pending' ? (
              <>
                <div className="text-6xl sm:text-8xl mb-4 sm:mb-6 animate-pulse">⏳</div>
                <h2 className="text-lg sm:text-xl font-bold text-orange-600 mb-2">
                  等待家长批准
                </h2>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                  请家长打开审批页面批准你的抽奖请求
                </p>
                <div className="flex gap-2 sm:gap-3 justify-center">
                  <button
                    onClick={handleCancelRequest}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition text-sm sm:text-base"
                  >
                    取消请求
                  </button>
                  <button
                    onClick={() => user && checkPendingRequest(user.id)}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition text-sm sm:text-base"
                  >
                    刷新状态
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl sm:text-8xl md:text-9xl mb-4 sm:mb-6 sm:mb-8">
                  🎰
                </div>
                <button
                  onClick={handleRequestDraw}
                  className="w-full sm:w-auto px-6 sm:px-10 py-3 sm:py-4 text-base sm:text-lg font-bold rounded-full transition transform hover:scale-105 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg"
                >
                  🙋 我要抽奖
                </button>
              </>
            )}
          </div>
        )}

        {/* 页脚 - 家长显示不同鼓励语 */}
        <footer className="text-center mt-6 sm:mt-8 text-gray-500 text-xs sm:text-sm">
          {user?.role === 'baby' ? (
            <p>加油！你是最棒的！💪</p>
          ) : user?.role === 'parent' || user?.role === 'admin' ? (
            <p>感谢家长的陪伴与支持！❤️</p>
          ) : (
            <p>欢迎来到宝宝奖励计划！🎉</p>
          )}
        </footer>
      </div>
    </main>
  );
}
