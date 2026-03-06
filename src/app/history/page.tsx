'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DrawRecord {
  id: string;
  babyName?: string;
  prizeName?: string;
  prizeDescription?: string | null;
  points: number;
  imageUrl?: string | null;
  drawnAt: string;
  prize?: {
    name: string;
    points: number;
    imageUrl: string | null;
  };
}

export default function HistoryPage() {
  const [records, setRecords] = useState<DrawRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    fetchHistory();
  }, [year, month, lastUpdate]);

  // 每 5 秒自动刷新一次
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(Date.now());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '100',
        year: year.toString(),
        ...(month ? { month: month.toString() } : {}),
      });
      const res = await fetch(`/api/history?${params}`);
      const data = await res.json();
      setRecords(data.records || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const months = [
    '全年', '1 月', '2 月', '3 月', '4 月', '5 月', '6 月',
    '7 月', '8 月', '9 月', '10 月', '11 月', '12 月'
  ];

  const totalPoints = records.reduce((sum, r) => sum + (r.points || r.prize?.points || 0), 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        {/* 头部 */}
        <header className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1">📜 抽奖历史</h1>
          <p className="text-xs sm:text-sm text-gray-600 mb-3">记录每一次惊喜时刻</p>
          
          {/* 统计卡片 */}
          <div className="flex gap-2 sm:gap-3 justify-center">
            <div className="bg-white rounded-xl shadow-md px-4 py-2 sm:px-6 sm:py-3">
              <p className="text-xs text-gray-500">总次数</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600">{records.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md px-4 py-2 sm:px-6 sm:py-3">
              <p className="text-xs text-gray-500">总积分</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">⭐ {totalPoints}</p>
            </div>
          </div>
        </header>

        {/* 筛选器 */}
        <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 mb-4">
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-center">
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            <select
              value={month || 0}
              onChange={(e) => setMonth(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {months.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <button
              onClick={() => setLastUpdate(Date.now())}
              className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition"
            >
              🔄 刷新
            </button>
          </div>
        </div>

        {/* 历史记录列表 */}
        <div className="space-y-2 sm:space-y-3">
          {loading ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <div className="text-4xl mb-2 animate-pulse">⏳</div>
              <p className="text-gray-500 text-sm">加载中...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-gray-500 text-sm">暂无历史记录</p>
              <Link
                href="/"
                className="inline-block mt-3 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition"
              >
                去抽奖
              </Link>
            </div>
          ) : (
            records.map((record, index) => (
              <div
                key={record.id}
                className="bg-white rounded-xl shadow-md p-3 sm:p-4 flex items-center gap-3 transition transform hover:scale-[1.02] hover:shadow-lg"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* 奖品图标 */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl sm:text-3xl">{record.imageUrl || record.prize?.imageUrl || '🎁'}</span>
                </div>
                
                {/* 奖品信息 */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 truncate">
                    {record.prizeName || record.prize?.name || '未知奖品'}
                  </p>
                  {record.prizeDescription && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {record.prizeDescription}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(record.drawnAt).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                
                {/* 积分 */}
                {(record.points || record.prize?.points || 0) > 0 && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm sm:text-lg font-bold text-yellow-600">
                      ⭐ {record.points || record.prize?.points}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 底部返回按钮 */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition transform hover:scale-105 text-sm sm:text-base"
          >
            🔙 返回抽奖页
          </Link>
        </div>
      </div>
    </main>
  );
}
