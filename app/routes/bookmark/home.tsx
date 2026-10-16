import { env } from "cloudflare:workers";
import { Link } from "react-router";
import { getCachedBookmarks } from "~/cache/bookmarks";
import BookmarkGroup from "~/components/bookmark/BookmarkGroup";
import Greeting from "~/components/widget/Greeting";
import type { Route } from "./+types/home";

/** 设置首页的浏览器标题和搜索摘要。 */
export function meta(_: Route.MetaArgs) {
  return [
    { title: "书签" },
    { name: "description", content: "这是一个书签页" },
  ];
}

/** 从缓存优先读取书签首页数据。 */
export async function loader() {
  const db = env.DB;
  const bookmarkdata = await getCachedBookmarks(db);
  return { bookmarkdata: [...bookmarkdata] };
}

/** 按重要程度分区展示书签组。 */
export default function BookmarkPage({ loaderData }: Route.ComponentProps) {
  const bookmarkEmphasizedGroups = loaderData.bookmarkdata
    .filter((group) => group.emphasized)
    .map((group) => (
      <BookmarkGroup
        bookmarkGroupData={group}
        key={group.id}
      ></BookmarkGroup>
    ));
  const bookmarkNormalGroups = loaderData.bookmarkdata
    .filter((group) => !group.emphasized)
    .map((group) => (
      <BookmarkGroup bookmarkGroupData={group} key={group.id}></BookmarkGroup>
    ));

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2 justify-between">
        <Greeting className="flex-none" />
        <div className="flex-none">
          <Link to="/bookmark/edit">[编辑]</Link>
        </div>
      </div>
      <main className="flex flex-col gap-8">
        {bookmarkEmphasizedGroups}
        <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(12em,1fr))]">
          {bookmarkNormalGroups}
        </div>
      </main>
    </>
  );
}
