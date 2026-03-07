import { NextResponse } from 'next/server';
import {
  getDrawRecords,
  getPrizes,
  saveReport,
  getWeekNumber,
  getWeekStartDate,
  getWeekEndDate,
} from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'weekly';
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const period = searchParams.get('period');

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (type) {
      case 'weekly': {
        const week = period ? parseInt(period) : getWeekNumber(now);
        startDate = getWeekStartDate(year, week);
        endDate = getWeekEndDate(year, week);
        break;
      }
      case 'monthly': {
        const month = period ? parseInt(period) - 1 : now.getMonth();
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0, 23, 59, 59);
        break;
      }
      case 'quarterly': {
        const quarter = period ? parseInt(period) : Math.floor(now.getMonth() / 3) + 1;
        startDate = new Date(year, (quarter - 1) * 3, 1);
        endDate = new Date(year, quarter * 3, 0, 23, 59, 59);
        break;
      }
      case 'yearly': {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
        break;
      }
      default:
        return NextResponse.json(
          { error: '无效的报告类型' },
          { status: 400 }
        );
    }

    const allRecords = await getDrawRecords(undefined, undefined, 1000, year);
    const records = allRecords.filter((r) => {
      const recordDate = new Date(r.drawnAt);
      return recordDate >= startDate && recordDate <= endDate;
    });

    const prizes = await getPrizes();
    const prizeMap = new Map(prizes.map((p) => [p.id, p]));

    const prizeStats: Record<string, any> = {};
    records.forEach((record) => {
      const prize = prizeMap.get(record.prizeId);
      if (!prize) return;
      
      const prizeName = prize.name;
      if (!prizeStats[prizeName]) {
        prizeStats[prizeName] = {
          name: prizeName,
          count: 0,
          points: prize.points,
          imageUrl: prize.imageUrl,
        };
      }
      prizeStats[prizeName].count++;
    });

    const totalDraws = records.length;
    const totalPoints = records.reduce((sum, r) => {
      const prize = prizeMap.get(r.prizeId);
      return sum + (prize?.points || 0);
    }, 0);

    const report = {
      id: uuidv4(),
      familyId: null,
      type,
      startDate,
      endDate,
      totalDraws,
      prizesJson: JSON.stringify(Object.values(prizeStats)),
      createdAt: new Date(),
    };

    await saveReport(report);

    return NextResponse.json({
      report: {
        ...report,
        totalPoints,
        prizeStats: Object.values(prizeStats),
        records: records.map((r) => ({
          id: r.id,
          drawnAt: r.drawnAt,
          prizeName: prizeMap.get(r.prizeId)?.name || '未知',
          points: prizeMap.get(r.prizeId)?.points || 0,
        })),
      },
    });
  } catch (error) {
    console.error('Get report error:', error);
    return NextResponse.json(
      { error: '获取报告失败' },
      { status: 500 }
    );
  }
}
