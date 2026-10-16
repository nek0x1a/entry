/** 应用的页面入口和书签编辑路由。 */
import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/bookmark/home.tsx"),
  route("bookmark/edit", "routes/bookmark/edit.tsx"),
] satisfies RouteConfig;
