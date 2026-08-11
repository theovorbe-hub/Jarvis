export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/memory/:path*",
    "/documents/:path*",
    "/automations/:path*",
    "/security/:path*",
    "/jarvis-mode/:path*",
    "/api/chat/:path*",
    "/api/conversations/:path*",
    "/api/memory/:path*",
    "/api/tasks/:path*",
    "/api/reminders/:path*",
    "/api/automations/:path*",
    "/api/files/:path*",
    "/api/search/:path*",
    "/api/vision/:path*",
    "/api/permissions/:path*",
    "/api/connections/:path*",
    "/api/activity/:path*",
    "/api/dashboard/:path*",
  ],
};
