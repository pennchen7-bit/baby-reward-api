import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "宝宝奖励计划",
  description: "孩子的专属抽奖系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
