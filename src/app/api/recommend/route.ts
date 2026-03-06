import { NextResponse } from 'next/server';

// 奖品数据库
const PRIZE_DATABASE = [
  // 零食类
  { name: '薯片一包', description: '任选口味', points: 5, probability: 2, category: '零食' },
  { name: '巧克力一块', description: '喜欢的巧克力', points: 8, probability: 2, category: '零食' },
  { name: '冰淇淋', description: '一支或一球', points: 10, probability: 2, category: '零食' },
  { name: '糖果小袋', description: ' assorted 糖果', points: 5, probability: 2, category: '零食' },
  { name: '奶茶一杯', description: '周末特供', points: 20, probability: 1, category: '零食' },
  { name: '披萨一份', description: '小份披萨', points: 40, probability: 1, category: '零食' },
  { name: '蛋糕一块', description: '生日蛋糕或切片', points: 30, probability: 1, category: '零食' },
  
  // 娱乐类
  { name: '看电视 30 分钟', description: '看动画片或儿童节目', points: 10, probability: 3, category: '娱乐' },
  { name: '看电视 1 小时', description: '自由选择节目', points: 20, probability: 2, category: '娱乐' },
  { name: '玩手机游戏', description: '30 分钟手机游戏时间', points: 15, probability: 2, category: '娱乐' },
  { name: '玩平板电脑', description: '1 小时平板时间', points: 25, probability: 1, category: '娱乐' },
  { name: '玩 Minecraft', description: '自由游戏时间', points: 30, probability: 1, category: '娱乐' },
  { name: '看动画电影', description: '完整一部动画电影', points: 50, probability: 1, category: '娱乐' },
  { name: '去电影院', description: '周末去电影院看电影', points: 100, probability: 0.5, category: '娱乐' },
  
  // 游戏类
  { name: '桌游时间', description: '和家人玩桌游', points: 15, probability: 2, category: '游戏' },
  { name: '户外玩耍', description: '公园/游乐场 1 小时', points: 20, probability: 2, category: '游戏' },
  { name: '骑自行车', description: '小区骑车 30 分钟', points: 15, probability: 2, category: '游戏' },
  { name: '捉迷藏', description: '和家人玩游戏', points: 10, probability: 3, category: '游戏' },
  
  // 学习类
  { name: '选一本新书', description: '去书店选书', points: 20, probability: 2, category: '学习' },
  { name: '科学实验', description: '做一个小实验', points: 15, probability: 2, category: '学习' },
  { name: '画画时间', description: '自由绘画 1 小时', points: 10, probability: 3, category: '学习' },
  { name: '手工 DIY', description: '做手工项目', points: 20, probability: 2, category: '学习' },
  { name: '学做蛋糕', description: '和妈妈一起烘焙', points: 40, probability: 1, category: '学习' },
  
  // 特殊奖励
  { name: '晚睡 30 分钟', description: '周末可以晚睡', points: 15, probability: 2, category: '特殊' },
  { name: '选择晚餐', description: '决定今晚吃什么', points: 25, probability: 1, category: '特殊' },
  { name: '朋友来玩', description: '邀请朋友来家里', points: 60, probability: 0.5, category: '特殊' },
  { name: '去游乐园', description: '周末去游乐园', points: 150, probability: 0.5, category: '特殊' },
  { name: '买玩具', description: '选择一个新玩具', points: 80, probability: 1, category: '特殊' },
  { name: '去动物园', description: '周末家庭出游', points: 120, probability: 0.5, category: '特殊' },
  
  // 休息类
  { name: '午睡 30 分钟', description: '舒适的午睡时间', points: 10, probability: 3, category: '休息' },
  { name: '赖床 30 分钟', description: '周末可以晚起', points: 15, probability: 2, category: '休息' },
  { name: '按摩服务', description: '妈妈/爸爸按摩 10 分钟', points: 20, probability: 2, category: '休息' },
  { name: '泡澡时间', description: '泡泡浴 + 玩具', points: 15, probability: 2, category: '休息' },
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { input } = body;

    if (!input || !input.trim()) {
      return NextResponse.json(
        { error: '请输入描述' },
        { status: 400 }
      );
    }

    const userInput = input.toLowerCase();
    let filteredPrizes = [...PRIZE_DATABASE];

    // 关键词匹配
    if (userInput.includes('零食') || userInput.includes('吃') || userInput.includes('喝')) {
      filteredPrizes = filteredPrizes.filter(p => p.category === '零食');
    } else if (userInput.includes('娱乐') || userInput.includes('电视') || userInput.includes('游戏') || userInput.includes('手机') || userInput.includes('平板')) {
      filteredPrizes = filteredPrizes.filter(p => p.category === '娱乐' || p.category === '游戏');
    } else if (userInput.includes('学习') || userInput.includes('书') || userInput.includes('画画') || userInput.includes('手工')) {
      filteredPrizes = filteredPrizes.filter(p => p.category === '学习');
    } else if (userInput.includes('特殊') || userInput.includes('奖励') || userInput.includes('游乐园') || userInput.includes('玩具') || userInput.includes('动物园')) {
      filteredPrizes = filteredPrizes.filter(p => p.category === '特殊');
    } else if (userInput.includes('休息') || userInput.includes('睡觉') || userInput.includes('午睡')) {
      filteredPrizes = filteredPrizes.filter(p => p.category === '休息');
    }

    // 积分过滤
    if (userInput.includes('低积分') || userInput.includes('积分不要高') || userInput.includes('简单')) {
      filteredPrizes = filteredPrizes.filter(p => p.points <= 15);
    } else if (userInput.includes('高积分') || userInput.includes('大奖') || userInput.includes('难')) {
      filteredPrizes = filteredPrizes.filter(p => p.points >= 50);
    } else if (userInput.includes('中等积分') || userInput.includes('一般')) {
      filteredPrizes = filteredPrizes.filter(p => p.points > 15 && p.points < 50);
    }

    // 具体积分范围
    const pointsMatch = userInput.match(/(\d+)[\s-]*(到 | 至 | -)?(\d+)?/);
    if (pointsMatch) {
      const minPoints = parseInt(pointsMatch[1]);
      const maxPoints = pointsMatch[3] ? parseInt(pointsMatch[3]) : minPoints + 10;
      filteredPrizes = filteredPrizes.filter(p => p.points >= minPoints && p.points <= maxPoints);
    }

    // 如果过滤后太少，返回所有
    if (filteredPrizes.length < 3) {
      filteredPrizes = PRIZE_DATABASE;
    }

    // 随机选择 5-8 个推荐
    const shuffled = filteredPrizes.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(8, shuffled.length));

    return NextResponse.json({
      prizes: selected,
    });
  } catch (error) {
    console.error('Recommend error:', error);
    return NextResponse.json(
      { error: '推荐失败' },
      { status: 500 }
    );
  }
}
