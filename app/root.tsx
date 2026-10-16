import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { cn } from "cn";
import type { Route } from "./+types/root";
import "./app.css";
import Footer from "./components/frame/Footer";
import { ToastProvider } from "./components/toast/ToastProvider";

/** 当前全局布局不需要额外预加载的静态资源链接。 */
export const links: Route.LinksFunction = () => [];

/** 定义所有路由共用的 HTML 文档骨架和页脚。 */
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hans" data-theme="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="page-framework">
        {children}
        <Footer className="my-8" />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/** 提供全局 Toast 上下文并渲染当前匹配的路由。 */
export default function App() {
  return (
    <ToastProvider>
      <Outlet />
    </ToastProvider>
  );
}

/** 将路由错误呈现为用户可读信息；开发环境额外展示堆栈。 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "未知错误";
  let errSource = "未知";
  let details = "发生未知错误。";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = `错误 ${error.status}`;
    errSource = "ReactRouter";
    details =
      error.status === 404 ? "页面未找到。" : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main>
      <h1 className="text-4xl">{message}</h1>
      <p className="my-2 text-sm text-muted-foreground">来源: {errSource}</p>
      <p className="my-4">{details}</p>
      {stack && (
        <pre
          className={cn(
            "my-2 p-2 bg-muted text-muted-foreground",
            "border border-muted-border rounded",
            "overflow-x-auto",
          )}
        >
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
