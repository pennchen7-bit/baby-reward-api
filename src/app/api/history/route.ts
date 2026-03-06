import { NextResponse } from 'next/server';
import { getDrawRecords, getPrizes } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let limit = parseInt(searchParams.get('limit') || '50');
    const familyId = searchParams.get('familyId');
    const babyId = searchParams.get('babyId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const page = parseInt(searchParams.get('page') || '1');

    // 如果有 page 参数，使用分页
    if (searchParams.has('page')) {
      limit = 10; // 每页 10 条
    }

    const records = await getDrawRecords(
      familyId || undefined,
      babyId || undefined,
      limit,
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined
    );

    const prizes = await getPrizes();
    const prizeMap = new Map(prizes.map((p) => [p.id, p]));

    const recordsWithPrizes = records.map((record) => {
      const prize = prizeMap.get(record.prizeId) || {
        name: '未知奖品',
        description: null,
        points: 0,
        imageUrl: null,
      };
      return {
        id: record.id,
        babyName: record.babyName,
        prizeName: prize.name,
        prizeDescription: prize.description,
        points: prize.points || record.points,
        imageUrl: prize.imageUrl,
        drawnAt: record.drawnAt,
      };
    });

    return NextResponse.json({ records: recordsWithPrizes });
  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json(
      { error: '获取历史记录失败' },
      { status: 500 }
    );
  }
}
