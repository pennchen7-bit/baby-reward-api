'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Report {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  totalDraws: number;
  totalPoints: number;
  prizeStats: Array<{
    name: string;
    count: number;
    points: number;
    imageUrl: string | null;
  }>;
  records: Array<{
    id: string;
    drawnAt: string;
    prizeName: string;
    points: number;
  }>;
}

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('weekly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState<string>('');

  const typeLabels: Record<string, string> = {
    weekly: '周报',
    monthly: '月报',
    quarterly: '季报',
    yearly: '年报',
  };

  const getPeriodOptions = () => {
    switch (reportType) {
      case 'weekly':
        return Array.from({ length: 52 }, (_, i) => ({ value: (i + 1).toString(), label: `第${i + 1}周` }));
      case 'monthly':
        return Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: `${i + 1}月` }));
      case 'quarterly':
        return [
          { value: '1', label: '第一季度' },
          { value: '2', label: '第二季度' },
          { value: '3', label: '第三季度' },
          { value: '4', label: '第四季度' },
        ];
      case 'yearly':
      default:
        return [];
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        year: year.toString(),
        ...(period ? { period } : {}),
      });
      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      setReport(data.report || null);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, year, period]);

  const handleGenerateReport = () => {
    fetchReport();
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">📊 奖励报告</h1>
            <p className="text-gray-600">查看周/月/季度/年度总结</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
          >
            🔙 返回抽奖页
          </Link>
        </header>

        {/* 报告生成器 */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">生成报告</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">报告类型</label>
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  setPeriod('');
                }}
                className="w-full p-2 border rounded"
              >
                <option value="weekly">周报</option>
                <option value="monthly">月报</option>
                <option value="quarterly">季报</option>
                <option value="yearly">年报</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">年份</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
            </div>
            {reportType !== 'yearly' && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {reportType === 'weekly' ? '周数' : reportType === 'monthly' ? '月份' : '季度'}
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">当前</option>
                  {getPeriodOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-end">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition disabled:bg-gray-400"
              >
                {loading ? '生成中...' : '生成报告'}
              </button>
            </div>
          </div>
        </div>

        {/* 报告内容 */}
        {report && (
          <>
            {/* 概览 */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow p-6 mb-6 text-white">
              <h2 className="text-2xl font-bold mb-2">
                {year}年 {typeLabels[reportType]} {period ? `(第${period}期)` : ''}
              </h2>
              <p className="text-white/80 text-sm mb-4">
                {new Date(report.startDate).toLocaleDateString('zh-CN')} - {new Date(report.endDate).toLocaleDateString('zh-CN')}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/20 rounded-lg p-4">
                  <p className="text-3xl font-bold">{report.totalDraws}</p>
                  <p className="text-white/80">抽奖次数</p>
                </div>
                <div className="bg-white/20 rounded-lg p-4">
                  <p className="text-3xl font-bold">⭐ {report.totalPoints}</p>
                  <p className="text-white/80">总积分</p>
                </div>
              </div>
            </div>

            {/* 奖品分布 */}
            <div className="bg-white rounded-xl shadow p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4">🎁 奖品分布</h3>
              <div className="space-y-3">
                {report.prizeStats.map((stat, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-2xl">{stat.imageUrl || '🎁'}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{stat.name}</span>
                        <span className="text-gray-600">{stat.count} 次</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{
                            width: `${(stat.count / report.totalDraws) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 详细记录 */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-xl font-semibold mb-4">📜 详细记录</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {report.records.map((record) => (
                  <div
                    key={record.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded"
                  >
                    <span>{record.prizeName}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(record.drawnAt).toLocaleDateString('zh-CN')}
                    </span>
                    {record.points > 0 && (
                      <span className="text-yellow-600 font-bold">⭐ {record.points}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
