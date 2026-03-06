import { NextResponse } from 'next/server';
import { getPrizes, getDrawRequests, updateDrawRequest, saveDrawRecord, getDrawRecords, getWeekNumber, getUsers } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { requestId, babyId, familyId } = body;

    if (!requestId && !babyId) {
      return NextResponse.json(
        { error: '缺少请求 ID 或宝宝 ID' },
        { status: 400 }
      );
    }

    let babyName = '';
    let actualFamilyId = familyId;

    // 如果有请求 ID，验证请求状态
    if (requestId) {
      const requests = await getDrawRequests();
      const req = requests.find((r) => r.id === requestId);

      if (!req) {
        return NextResponse.json(
          { error: '请求不存在' },
          { status: 404 }
        );
      }

      if (req.status !== 'approved') {
        return NextResponse.json(
          { error: '请求未批准，无法抽奖' },
          { status: 400 }
        );
      }

      babyName = req.babyName;
      actualFamilyId = req.familyId;
    }

    // 获取宝宝信息
    if (babyId && !babyName) {
      const users = await getUsers();
      const baby = users.find((u) => u.id === babyId);
      if (baby) {
        babyName = baby.username;
        if (!actualFamilyId) actualFamilyId = baby.familyId;
      }
    }

    // 获取奖品
    const prizes = await getPrizes(actualFamilyId);
    const activePrizes = prizes.filter((p) => p.active);

    if (activePrizes.length === 0) {
      return NextResponse.json(
        { error: '没有可用奖品' },
        { status: 400 }
      );
    }

    // 随机选择奖品
    const totalWeight = activePrizes.reduce((sum, p) => sum + p.probability, 0);
    let random = Math.random() * totalWeight;
    let selectedPrize = activePrizes[0];

    for (const prize of activePrizes) {
      random -= prize.probability;
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }

    // 创建抽奖记录
    const now = new Date();
    const record = {
      id: `record-${Date.now()}`,
      familyId: actualFamilyId || '',
      babyId: babyId || '',
      babyName,
      prizeId: selectedPrize.id,
      prizeName: selectedPrize.name,
      points: selectedPrize.points,
      requestId,
      drawnAt: now.toISOString(),
      week: getWeekNumber(now),
      month: now.getMonth() + 1,
      quarter: Math.floor(now.getMonth() / 3) + 1,
      year: now.getFullYear(),
    };

    await saveDrawRecord(record);

    // 更新请求状态为已完成
    if (requestId) {
      await updateDrawRequest(requestId, { status: 'completed' });
    }

    return NextResponse.json({
      success: true,
      prize: {
        id: selectedPrize.id,
        name: selectedPrize.name,
        description: selectedPrize.description,
        points: selectedPrize.points,
        imageUrl: selectedPrize.imageUrl,
      },
      drawnAt: record.drawnAt,
    });
  } catch (error) {
    console.error('Draw error:', error);
    return NextResponse.json(
      { error: '抽奖失败' },
      { status: 500 }
    );
  }
}
