# 👶 宝宝奖励计划

一个专为孩子设计的抽奖奖励系统，鼓励良好行为！

## ✨ 功能特性

- 🎰 **抽奖页面** - 孩子可以点击抽奖，随机获得奖品
- ⚙️ **管理后台** - 配置奖品、概率、积分
- 📜 **历史记录** - 查看每次抽奖的详细信息
- 📊 **奖励报告** - 生成周/月/季度/年度报告
- 🎉 **动画效果** - 抽奖时的彩带动画，增强趣味性

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 初始化数据库
npm run db:push

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### Docker 部署（推荐用于 NAS）

```bash
# 构建并运行
docker-compose up -d

# 查看日志
docker-compose logs -f
```

## 📁 项目结构

```
baby-reward/
├── src/
│   ├── app/
│   │   ├── api/          # API 路由
│   │   ├── admin/        # 管理后台
│   │   ├── history/      # 历史记录
│   │   ├── reports/      # 奖励报告
│   │   └── page.tsx      # 抽奖主页
│   └── lib/
│       └── prisma.ts     # 数据库客户端
├── prisma/
│   └── schema.prisma     # 数据库模型
├── .github/
│   └── workflows/
│       └── ci.yml        # CI/CD 配置
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 🔧 配置

### 环境变量

- `DATABASE_URL` - 数据库连接（默认使用 SQLite）
- `PORT` - 服务端口（默认 3000）

### 奖品配置

在管理后台可以配置：
- 奖品名称和描述
- 积分奖励
- 概率权重（越高越容易抽中）
- 启用/禁用状态

## 📊 报告系统

支持四种报告类型：
- **周报** - 每周抽奖总结
- **月报** - 每月抽奖总结
- **季报** - 每季度抽奖总结
- **年报** - 年度抽奖总结

报告包含：
- 抽奖次数统计
- 总积分统计
- 奖品分布图表
- 详细抽奖记录

## 🛠️ 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **数据库**: SQLite (开发) / PostgreSQL (生产)
- **ORM**: Prisma
- **部署**: Docker + Docker Compose

## 📦 NAS 部署

1. 将项目上传到 NAS
2. 配置 Docker 环境变量
3. 运行 `docker-compose up -d`
4. 访问 `http://your-nas-ip:3000`

## 🎨 自定义

### 修改主题颜色

编辑 `tailwind.config.ts` 中的 `colors` 配置。

### 添加新页面

在 `src/app/` 下创建新目录和 `page.tsx` 文件。

## 📝 开发说明

- 数据库变更後运行 `npm run db:push`
- 生产环境使用 `npm run build` + `npm start`
- CI/CD 会自动构建 Docker 镜像并部署

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT
