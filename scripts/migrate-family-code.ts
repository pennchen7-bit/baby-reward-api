// 迁移脚本：为已有家庭添加 familyCode
// 运行：npx tsx scripts/migrate-family-code.ts

import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const FAMILIES_FILE = path.join(DATA_DIR, 'families.json');

interface Family {
  id: string;
  name: string;
  familyCode?: string;
  createdAt: string;
}

// 生成唯一的 4 位数字家庭码
function generateFamilyCode(existingCodes: Set<string>): string {
  for (let i = 0; i < 100; i++) {
    const code = Math.floor(1000 + Math.random() * 9000).toString(); // 1000-9999
    if (!existingCodes.has(code)) {
      return code;
    }
  }
  // 极端情况下使用带字母的码
  return Math.random().toString(36).substr(2, 4).toUpperCase();
}

async function migrate() {
  try {
    // 读取现有家庭
    const content = await fs.readFile(FAMILIES_FILE, 'utf-8');
    const families: Family[] = JSON.parse(content);
    
    // 收集已有的家庭码
    const existingCodes = new Set(families.filter((f) => f.familyCode).map((f) => f.familyCode!));
    
    // 为没有家庭码的家庭生成
    let migratedCount = 0;
    families.forEach((family) => {
      if (!family.familyCode) {
        family.familyCode = generateFamilyCode(existingCodes);
        existingCodes.add(family.familyCode);
        migratedCount++;
        console.log(`✓ ${family.name} -> ${family.familyCode}`);
      }
    });
    
    // 写回文件
    await fs.writeFile(FAMILIES_FILE, JSON.stringify(families, null, 2), 'utf-8');
    
    console.log(`\n✅ 迁移完成！${migratedCount} 个家庭已添加家庭码`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️  家庭数据文件不存在，跳过迁移');
    } else {
      console.error('❌ 迁移失败:', error);
    }
  }
}

migrate();
