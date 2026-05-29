import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
    const pathname = req.nextUrl.pathname;
    const normalizedPathname = pathname.replace(/%20+$/i, "").trimEnd();

    if (normalizedPathname !== pathname && normalizedPathname === "/api/webhook") {
        const url = req.nextUrl.clone();
        url.pathname = normalizedPathname;
        return NextResponse.rewrite(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/api/webhook/:path*"],
};