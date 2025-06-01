// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 获取token以检查用户是否已认证
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  // 定义需要保护的路由
  const protectedPaths = ['/dashboard'];
  const isPathProtected = protectedPaths.some((path) => 
    pathname === path || pathname.startsWith(`${path}/`)
  );

  // 如果是受保护的路由且用户未登录，重定向到登录页
  if (isPathProtected && !token) {
    const url = new URL(`/login`, request.url);
    url.searchParams.set("callbackUrl", encodeURI(request.url));
    return NextResponse.redirect(url);
  }

  // 如果用户已登录且访问登录页，重定向到仪表盘
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// 配置匹配的路由
export const config = {
  matcher: ['/login', '/dashboard/:path*'],
};