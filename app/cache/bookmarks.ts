import { getBookmarks } from "~/db/d1";
import type { BookmarkGroupData } from "~/types/bookmark/bookmark";

/** Cache API 中书签数据所使用的内部请求键。 */
const CACHE_KEY = new Request("https://entry.internal/cache/bookmarks");

/** 缓存七天；成功保存数据时会立即覆盖缓存。 */
const CACHE_TTL = 60 * 60 * 24 * 7;

/** 将完整书签分组写入 Worker 的 Cache API。 */
export async function setCachedBookmarks(
  bookmarks: BookmarkGroupData[],
): Promise<void> {
  const cache = await caches.open("bookmark");
  const response = new Response(JSON.stringify(bookmarks), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${CACHE_TTL}`,
    },
  });
  await cache.put(CACHE_KEY, response);
}

/** 优先读取缓存；首次访问时从 D1 加载并填充缓存。 */
export async function getCachedBookmarks(
  db: D1Database,
): Promise<BookmarkGroupData[]> {
  const cache = await caches.open("bookmark");
  const cached = await cache.match(CACHE_KEY);

  if (cached) {
    return (await cached.json()) as BookmarkGroupData[];
  }
  const bookmarks = await getBookmarks(db);
  await setCachedBookmarks(bookmarks);
  return bookmarks;
}
