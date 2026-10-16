import type { BookmarkData, BookmarkGroupData } from "./bookmark";

/** 新建或更新书签时发送给 D1 的记录结构。 */
export type BookmarkDBRow = BookmarkData & { groupId: number };
/** 新建或更新书签组时发送给 D1 的记录结构。 */
export type BookmarkGroupDBRow = Omit<BookmarkGroupData, "bookmarks">;

/** 编辑页面提交到保存 action 的增删改集合。 */
export type BookmarkEditChanges = {
  groups: {
    create: BookmarkGroupDBRow[];
    update: BookmarkGroupDBRow[];
    delete: number[];
  };
  bookmarks: {
    create: BookmarkDBRow[];
    update: BookmarkDBRow[];
    delete: number[];
  };
};

/** 书签保存 action 返回给编辑页的成功或失败结果。 */
export type SaveActionResponse =
  | {
      ok: true;
      bookmarkdata: BookmarkGroupData[];
    }
  | {
      ok: false;
      error: string;
    };

/** 书签组中允许直接编辑的字段。 */
export type EditableBookmarkGroupFields = Pick<
  BookmarkGroupData,
  "name" | "description"
>;

/** 书签中允许直接编辑的字段。 */
export type EditableBookmarkFields = Pick<
  BookmarkData,
  "name" | "href" | "icon" | "description"
>;
/** 当前待确认删除的书签或书签组。 */
export type DeleteTarget =
  | {
      kind: "group";
      groupId: number;
    }
  | {
      kind: "bookmark";
      groupId: number;
      bookmarkId: number;
    };

/**
 * 当前分组或书签拖动源、目标及插入位置。
 * insertIndex 表示源对象移除之前，目标列表中的插入位置。
 * 长度为 n 的列表有 n + 1 个插入位置，范围为 0 到 n。
 */
export type DragState =
  | {
      kind: "group";
      sourceGroupId: number;
      insertIndex: number | null;
    }
  | {
      kind: "bookmark";
      sourceGroupId: number;
      sourceBookmarkId: number;
      targetGroupId: number | null;
      insertIndex: number | null;
    }
  | null;
