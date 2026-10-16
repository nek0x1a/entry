import type { BookmarkGroupData } from "~/types/bookmark/bookmark";
import type { BookmarkEditChanges } from "~/types/bookmark/edit";
import { validateAndNormalizeChanges } from "~/utils/bookmarkValidation";

/** 书签与分组联接查询返回的一行数据；无书签分组的书签字段为 null。 */
type BookmarkDataRow = {
  bookmarkId: number | null;
  bookmarkName: string | null;
  bookmarkHref: string | null;
  bookmarkIcon: string | null;
  bookmarkDescription: string | null;
  bookmarkSort: number | null;

  groupId: number;
  groupName: string;
  groupEmphasized: number;
  groupDescription: string;
  groupSort: number;
};

/** 按分组和书签排序从 D1 读取首页所需的数据结构。 */
export async function getBookmarks(
  db: D1Database,
): Promise<BookmarkGroupData[]> {
  const dbData = await db
    .prepare(`
      SELECT
        b.id AS bookmarkId,
        b.name AS bookmarkName,
        b.href AS bookmarkHref,
        b.icon AS bookmarkIcon,
        b.description AS bookmarkDescription,
        b.sort_order AS bookmarkSort,
        g.id AS groupId,
        g.name AS groupName,
        g.emphasized AS groupEmphasized,
        g.description AS groupDescription,
        g.sort_order AS groupSort
      FROM bookmark_groups g
      LEFT JOIN bookmarks b
        ON b.group_id = g.id
      ORDER BY g.sort_order, b.sort_order;
    `)
    .all<BookmarkDataRow>();

  const bookmarkGroupMap = new Map<number, BookmarkGroupData>();

  for (const record of dbData.results) {
    let group = bookmarkGroupMap.get(record.groupId);

    if (!group) {
      group = {
        id: record.groupId,
        sort: record.groupSort,
        name: record.groupName,
        emphasized: !!record.groupEmphasized,
        description: record.groupDescription,
        bookmarks: [],
      };

      bookmarkGroupMap.set(record.groupId, group);
    }

    if (record.bookmarkId !== null) {
      group.bookmarks.push({
        id: record.bookmarkId,
        sort: record.bookmarkSort ?? 0,
        name: record.bookmarkName ?? "",
        href: record.bookmarkHref ?? "",
        icon: record.bookmarkIcon ?? "",
        description: record.bookmarkDescription ?? "",
      });
    }
  }

  return [...bookmarkGroupMap.values()];
}

/** 验证并分阶段保存书签变更，必要时清理已创建但未完成的分组。 */
export async function saveBookmarkChanges(
  db: D1Database,
  changes: BookmarkEditChanges,
): Promise<void> {
  /*
   * 验证并规整字段
   * 这样负数 ID 永远不会被当作数据库主键写入
   */
  validateAndNormalizeChanges(changes);

  /*
   * 临时书签组 id -> 数据库书签组 id 映射
   */
  const groupIdMap = new Map<number, number>();

  /*
   * 第一阶段：只插入新书签组
   * 不把临时 id 写入数据库，让 INTEGER PRIMARY KEY 自己生成
   */
  if (changes.groups.create.length > 0) {
    const results = await db.batch(
      changes.groups.create.map((group) =>
        db
          .prepare(`
            INSERT INTO bookmark_groups
              (
                name,
                emphasized,
                description,
                sort_order
              )
            VALUES (?, ?, ?, ?)
          `)
          .bind(
            group.name,
            group.emphasized ? 1 : 0,
            group.description,
            group.sort,
          ),
      ),
    );

    // 设置临时 id 映射
    changes.groups.create.forEach((group, index) => {
      const id = results[index]?.meta.last_row_id;
      if (typeof id !== "number" || id < 0) {
        throw new Error("无法取得新建书签组的数据库 ID");
      }
      groupIdMap.set(group.id, id);
    });
  }

  /** 把客户端临时分组 ID 映射为 D1 实际生成的主键。 */
  function resolveGroupId(groupId: number): number {
    if (groupId >= 0) {
      return groupId;
    }
    const realId = groupIdMap.get(groupId);
    if (realId === undefined) {
      throw new Error(`未找到临时书签组 ID: ${groupId}`);
    }
    return realId;
  }

  /*
   * 第二阶段：
   * 1. INSERT 新书签
   * 2. UPDATE 已存在书签
   * 3. DELETE 已删除书签
   * 4. UPDATE 组
   * 5. DELETE 组
   *
   ! note
   ! 书签 update 要在 group delete 前执行，
   ! 这样即使原组中的书签被移动到另一组，然后原组被删除，
   ! 移动出去的书签也不会被 A 的删除操作误删。
   */
  try {
    const statements: D1PreparedStatement[] = [];
    changes.bookmarks.create.forEach((b) => {
      statements.push(
        db
          .prepare(`
            INSERT INTO bookmarks
              (
                group_id,
                name,
                href,
                icon,
                description,
                sort_order
              )
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          .bind(
            resolveGroupId(b.groupId),
            b.name,
            b.href,
            b.icon,
            b.description,
            b.sort,
          ),
      );
    });
    changes.bookmarks.update.forEach((b) => {
      statements.push(
        db
          .prepare(`
            UPDATE bookmarks
            SET
              group_id = ?,
              name = ?,
              href = ?,
              icon = ?,
              description = ?,
              sort_order = ?
            WHERE id = ?
          `)
          .bind(
            resolveGroupId(b.groupId),
            b.name,
            b.href,
            b.icon,
            b.description,
            b.sort,
            b.id,
          ),
      );
    });
    changes.bookmarks.delete.forEach((bookmarkId) => {
      statements.push(
        db.prepare("DELETE FROM bookmarks WHERE id = ?").bind(bookmarkId),
      );
    });
    changes.groups.update.forEach((g) => {
      statements.push(
        db
          .prepare(`
            UPDATE bookmark_groups
            SET
              name = ?,
              emphasized = ?,
              description = ?,
              sort_order = ?
            WHERE id = ?
          `)
          .bind(g.name, g.emphasized ? 1 : 0, g.description, g.sort, g.id),
      );
    });
    changes.groups.delete.forEach((groupId) => {
      statements.push(
        db.prepare("DELETE FROM bookmarks WHERE group_id = ?").bind(groupId),
      );
      statements.push(
        db.prepare("DELETE FROM bookmark_groups WHERE id = ?").bind(groupId),
      );
    });
    if (statements.length === 0) {
      return;
    }
    await db.batch(statements);
  } catch (error) {
    /*
     * 第二阶段失败时，把第一阶段创建的新组清理掉
     */
    if (groupIdMap.size > 0) {
      try {
        await db.batch(
          [...groupIdMap.values()].map((groupId) =>
            db
              .prepare("DELETE FROM bookmark_groups WHERE id = ?")
              .bind(groupId),
          ),
        );
      } catch (cleanupError) {
        console.error("回滚新建书签组失败", cleanupError);
      }
    }
    throw error;
  }
}
