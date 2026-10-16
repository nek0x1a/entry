import { env } from "cloudflare:workers";
import { cn } from "cn";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useFetcher } from "react-router";
import { setCachedBookmarks } from "~/cache/bookmarks";
import BookmarkGroupEdit from "~/components/bookmark/BookmarkGroupEdit";
import { useToast } from "~/components/toast/useToast";
import { getBookmarks, saveBookmarkChanges } from "~/db/d1";
import type {
  BookmarkData,
  BookmarkGroupData,
} from "~/types/bookmark/bookmark";
import type {
  BookmarkEditChanges,
  DeleteTarget,
  DragState,
  EditableBookmarkFields,
  EditableBookmarkGroupFields,
  SaveActionResponse,
} from "~/types/bookmark/edit";
import type { Route } from "./+types/edit";
import "./edit.css";

/** 设置书签编辑页的浏览器标题和摘要。 */
export function meta(_: Route.MetaArgs) {
  return [
    { title: "书签编辑" },
    { name: "description", content: "书签数据编辑" },
  ];
}

/** 从 D1 加载最新书签数据，作为编辑页初始状态。 */
export async function loader() {
  const db = env.DB;
  const bookmarkdata = await getBookmarks(db);

  return { bookmarkdata: [...bookmarkdata] };
}

/** 校验并保存编辑请求，成功后同步刷新首页缓存。 */
export async function action({ request }: Route.ActionArgs) {
  try {
    const body = (await request.json()) as {
      changes?: BookmarkEditChanges;
    };
    if (!body.changes) {
      return {
        ok: false,
        error: "保存数据为空",
      } satisfies SaveActionResponse;
    }

    await saveBookmarkChanges(env.DB, body.changes);

    // 首页使用的是 Cache API，因此保存成功后同步更新缓存。
    const bookmarkdata = await getBookmarks(env.DB);
    try {
      await setCachedBookmarks(bookmarkdata);
    } catch (error) {
      console.error("更新书签缓存失败", error);
    }
    return {
      ok: true,
      bookmarkdata,
    } satisfies SaveActionResponse;
  } catch (error) {
    console.error("保存书签失败", error);

    return {
      ok: false,
      error: error instanceof Error ? error.message : "保存书签失败",
    } satisfies SaveActionResponse;
  }
}

/** 新建书签组时使用的默认字段。 */
const EMPTY_BOOKMARK_GROUP_TEMPLATE: Omit<BookmarkGroupData, "id" | "sort"> = {
  name: "新建书签组",
  emphasized: false,
  description: "这是一个示例书签组",
  bookmarks: [],
};
/** 新建书签时使用的默认字段。 */
const NEW_BOOKMARK_TEMPLATE: Omit<BookmarkData, "id" | "sort"> = {
  name: "新建书签",
  href: "https://example.com/",
  icon: "plus",
  description: "这是一个示例书签",
};

/** 根据当前数组顺序重写分组排序值。 */
function renumberGroups(groups: BookmarkGroupData[]) {
  return groups.map((group, index) => ({
    ...group,
    sort: index,
  }));
}

/** 根据当前数组顺序重写书签排序值。 */
function renumberBookmarks(bookmarks: BookmarkData[]) {
  return bookmarks.map((bookmark, index) => ({
    ...bookmark,
    sort: index,
  }));
}

/**
 * 比较服务器原始数据与当前尚未保存的数据，
 * 只生成真正需要 INSERT / UPDATE / DELETE 的记录。
 */
function createBookmarkEditChanges(
  original: BookmarkGroupData[],
  current: BookmarkGroupData[],
): BookmarkEditChanges {
  const originalGroups = new Map(original.map((group) => [group.id, group]));
  const currentGroups = new Map(current.map((group) => [group.id, group]));
  const changes: BookmarkEditChanges = {
    groups: {
      create: [],
      update: [],
      delete: [],
    },
    bookmarks: {
      create: [],
      update: [],
      delete: [],
    },
  };

  /*
   * 书签组：
   *
   * 原始不存在 + 当前 id < 0 => INSERT
   * 原始存在 + 当前存在但内容不同 => UPDATE
   */
  for (const group of current) {
    if (group.id < 0) {
      const { bookmarks: _bookmarks, ...groupRecord } = group;
      changes.groups.create.push(groupRecord);
      continue;
    }
    const originalGroup = originalGroups.get(group.id);

    if (!originalGroup) {
      throw new Error(`找不到原始书签组：${group.id}`);
    }

    if (
      group.sort !== originalGroup.sort ||
      group.name !== originalGroup.name ||
      group.emphasized !== originalGroup.emphasized ||
      group.description !== originalGroup.description
    ) {
      const { bookmarks: _bookmarks, ...groupRecord } = group;
      changes.groups.update.push(groupRecord);
    }
  }
  /*
   * 原始存在 + 当前不存在 => DELETE
   */
  for (const group of original) {
    if (!currentGroups.has(group.id)) {
      changes.groups.delete.push(group.id);
    }
  }

    /** 用于比较书签变更时定位原所属组和记录字段。 */
    type BookmarkLocation = {
    groupId: number;
    bookmark: BookmarkData;
  };

  const originalBookmarks = new Map<number, BookmarkLocation>();
  const currentBookmarks = new Map<number, BookmarkLocation>();
  for (const group of original) {
    for (const bookmark of group.bookmarks) {
      originalBookmarks.set(bookmark.id, {
        groupId: group.id,
        bookmark,
      });
    }
  }

  for (const group of current) {
    for (const bookmark of group.bookmarks) {
      currentBookmarks.set(bookmark.id, {
        groupId: group.id,
        bookmark,
      });
    }
  }
  /*
   * 书签：
   *
   * 原始不存在 + 当前 id < 0 => INSERT
   * 原始存在 + 当前存在但字段 / 所属组 / sort 不同 => UPDATE
   */
  for (const { groupId, bookmark } of currentBookmarks.values()) {
    if (bookmark.id < 0) {
      changes.bookmarks.create.push({
        groupId,
        ...bookmark,
      });
      continue;
    }

    const originalBookmark = originalBookmarks.get(bookmark.id);

    if (!originalBookmark) {
      throw new Error(`找不到原始书签：${bookmark.id}`);
    }
    if (
      groupId !== originalBookmark.groupId ||
      bookmark.sort !== originalBookmark.bookmark.sort ||
      bookmark.name !== originalBookmark.bookmark.name ||
      bookmark.href !== originalBookmark.bookmark.href ||
      bookmark.icon !== originalBookmark.bookmark.icon ||
      bookmark.description !== originalBookmark.bookmark.description
    ) {
      changes.bookmarks.update.push({
        groupId,
        ...bookmark,
      });
    }
  }
  /*
   * 原始存在 + 当前不存在 => DELETE
   */
  for (const bookmarkId of originalBookmarks.keys()) {
    if (!currentBookmarks.has(bookmarkId)) {
      changes.bookmarks.delete.push(bookmarkId);
    }
  }

  return changes;
}

/** 判断变更集是否至少包含一条新增、更新或删除记录。 */
function hasBookmarkChanges(changes: BookmarkEditChanges) {
  return (
    changes.groups.create.length > 0 ||
    changes.groups.update.length > 0 ||
    changes.groups.delete.length > 0 ||
    changes.bookmarks.create.length > 0 ||
    changes.bookmarks.update.length > 0 ||
    changes.bookmarks.delete.length > 0
  );
}

/**
 * insertIndex 按拖动前的原始列表计算。
 * 如果删除源对象后索引需要左移，只在这里统一修正。
 */
/** 按拖放前的插入索引移动分组，并重新编号排序值。 */
function reorderGroups(
  groups: BookmarkGroupData[],
  sourceGroupId: number,
  insertIndex: number,
) {
  const sourceIndex = groups.findIndex((group) => group.id === sourceGroupId);

  if (
    sourceIndex < 0 ||
    insertIndex < 0 ||
    insertIndex > groups.length ||
    insertIndex === sourceIndex ||
    insertIndex === sourceIndex + 1
  ) {
    return groups;
  }

  const nextGroups = [...groups];
  const [movedGroup] = nextGroups.splice(sourceIndex, 1);
  if (!movedGroup) {
    return groups;
  }

  const adjustedInsertIndex =
    sourceIndex < insertIndex ? insertIndex - 1 : insertIndex;
  nextGroups.splice(adjustedInsertIndex, 0, movedGroup);

  return renumberGroups(nextGroups);
}

/** 支持同组排序和跨组移动，并重新编号受影响的书签。 */
function reorderBookmarks(
  groups: BookmarkGroupData[],
  dragState: Extract<DragState, { kind: "bookmark" }>,
) {
  const { sourceGroupId, sourceBookmarkId, targetGroupId, insertIndex } =
    dragState;
  if (targetGroupId === null || insertIndex === null) {
    return groups;
  }

  const sourceGroupIndex = groups.findIndex(
    (group) => group.id === sourceGroupId,
  );
  const targetGroupIndex = groups.findIndex(
    (group) => group.id === targetGroupId,
  );

  if (sourceGroupIndex < 0 || targetGroupIndex < 0) {
    return groups;
  }

  const sourceGroup = groups[sourceGroupIndex];
  const targetGroup = groups[targetGroupIndex];
  if (
    !sourceGroup ||
    !targetGroup ||
    insertIndex < 0 ||
    insertIndex > targetGroup.bookmarks.length
  ) {
    return groups;
  }

  const sourceBookmarkIndex = sourceGroup.bookmarks.findIndex(
    (bookmark) => bookmark.id === sourceBookmarkId,
  );
  if (sourceBookmarkIndex < 0) {
    return groups;
  }

  const isSameGroup = sourceGroupId === targetGroupId;
  if (
    isSameGroup &&
    (insertIndex === sourceBookmarkIndex ||
      insertIndex === sourceBookmarkIndex + 1)
  ) {
    return groups;
  }

  const nextGroups = groups.map((group) => ({
    ...group,
    bookmarks: [...group.bookmarks],
  }));
  const nextSourceGroup = nextGroups[sourceGroupIndex];
  const nextTargetGroup = nextGroups[targetGroupIndex];
  if (!nextSourceGroup || !nextTargetGroup) {
    return groups;
  }

  const [movedBookmark] = nextSourceGroup.bookmarks.splice(
    sourceBookmarkIndex,
    1,
  );
  if (!movedBookmark) {
    return groups;
  }

  const adjustedInsertIndex =
    isSameGroup && sourceBookmarkIndex < insertIndex
      ? insertIndex - 1
      : insertIndex;
  nextTargetGroup.bookmarks.splice(adjustedInsertIndex, 0, movedBookmark);

  const affectedGroupIds = new Set([sourceGroupId, targetGroupId]);
  return nextGroups.map((group) =>
    affectedGroupIds.has(group.id)
      ? {
          ...group,
          bookmarks: renumberBookmarks(group.bookmarks),
        }
      : group,
  );
}

/**
 * 每个组间插入位置只渲染一条线：
 * 列表开头画在第一组顶部，其余位置统一画在前一组底部。
 */
/** 将组插入索引转换为当前组边缘的指示线位置。 */
function getGroupDropIndicatorPosition(
  groups: BookmarkGroupData[],
  groupIndex: number,
  dragState: DragState,
): "before" | "after" | null {
  if (dragState?.kind !== "group" || dragState.insertIndex === null) {
    return null;
  }

  const sourceIndex = groups.findIndex(
    (group) => group.id === dragState.sourceGroupId,
  );
  if (
    sourceIndex < 0 ||
    dragState.insertIndex === sourceIndex ||
    dragState.insertIndex === sourceIndex + 1
  ) {
    return null;
  }

  if (dragState.insertIndex === 0) {
    return groupIndex === 0 ? "before" : null;
  }
  return dragState.insertIndex === groupIndex + 1 ? "after" : null;
}

/** 管理编辑草稿、删除确认、拖放操作和保存状态。 */
export default function EditPage({ loaderData }: Route.ComponentProps) {
  const [originalBookmarkData, setOriginalBookmarkData] =
    useState<BookmarkGroupData[]>(() => structuredClone(loaderData.bookmarkdata));
  const [bookmarkData, setBookmarkData] = useState<BookmarkGroupData[]>(() =>
    structuredClone(loaderData.bookmarkdata),
  );
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  // 所有新增的书签组 / 书签共用这一组临时 ID。
  // -1, -2, -3 ...，绝不会和数据库正数 ID 冲突。
  const nextTempIdRef = useRef(-1);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFetcher = useFetcher<SaveActionResponse>();
  const toast = useToast();
  const notifyValidationError = useCallback(
    (message: string) => toast.error(message),
    [toast],
  );
  const [shouldScrollToEnd, setShouldScrollToEnd] = useState(false);
  const endOfPageRef = useRef<HTMLDivElement>(null);
  const previousSaveStateRef = useRef(saveFetcher.state);

  const clearDeleteTimer = useCallback(() => {
    if (deleteTimerRef.current !== null) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
  }, []);

  const requestDelete = useCallback(
    (target: DeleteTarget) => {
      // 同一时间页面上只能存在一个确认气泡。
      clearDeleteTimer();
      setDeleteTarget(target);
      deleteTimerRef.current = setTimeout(() => {
        setDeleteTarget(null);
        deleteTimerRef.current = null;
      }, 3000);
    },
    [clearDeleteTimer],
  );

  const confirmDelete = useCallback(
    (target: DeleteTarget) => {
      clearDeleteTimer();
      setDeleteTarget(null);
      setDragState(null);
      setBookmarkData((current) => {
        // 当确认删除书签组时
        if (target.kind === "group") {
          return renumberGroups(
            current.filter((group) => group.id !== target.groupId),
          );
        }

        // 当确认删除书签时
        return current.map((group) => {
          if (group.id !== target.groupId) {
            return group;
          }
          return {
            ...group,
            bookmarks: renumberBookmarks(
              group.bookmarks.filter(
                (bookmark) => bookmark.id !== target.bookmarkId,
              ),
            ),
          };
        });
      });
    },
    [clearDeleteTimer],
  );

  const addGroup = useCallback(() => {
    const id = nextTempIdRef.current;
    nextTempIdRef.current -= 1;
    setShouldScrollToEnd(true);
    setBookmarkData((current) => [
      ...current,
      {
        id,
        sort: current.length,
        ...EMPTY_BOOKMARK_GROUP_TEMPLATE,
      },
    ]);
  }, []);

  const addBookmark = useCallback((groupId: number) => {
    const id = nextTempIdRef.current;
    nextTempIdRef.current -= 1;
    setBookmarkData((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              bookmarks: [
                ...group.bookmarks,
                {
                  id,
                  sort: group.bookmarks.length,
                  ...NEW_BOOKMARK_TEMPLATE,
                },
              ],
            }
          : group,
      ),
    );
  }, []);

  const changeGroup = useCallback(
    (groupId: number, changes: Partial<EditableBookmarkGroupFields>) => {
      setBookmarkData((current) =>
        current.map((group) =>
          group.id === groupId ? { ...group, ...changes } : group,
        ),
      );
    },
    [],
  );

  const toggleGroupEmphasized = useCallback((groupId: number) => {
    setBookmarkData((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              emphasized: !group.emphasized,
            }
          : group,
      ),
    );
  }, []);

  const changeBookmark = useCallback(
    (
      groupId: number,
      bookmarkId: number,
      changes: Partial<EditableBookmarkFields>,
    ) => {
      setBookmarkData((current) =>
        current.map((group) =>
          group.id === groupId
            ? {
                ...group,
                bookmarks: group.bookmarks.map((bookmark) =>
                  bookmark.id === bookmarkId
                    ? { ...bookmark, ...changes }
                    : bookmark,
                ),
              }
            : group,
        ),
      );
    },
    [],
  );

  const startGroupDrag = useCallback((groupId: number) => {
    setDragState({
      kind: "group",
      sourceGroupId: groupId,
      insertIndex: null,
    });
  }, []);

  const dragOverGroup = useCallback((insertIndex: number) => {
    setDragState((current) =>
      current?.kind === "group" ? { ...current, insertIndex } : current,
    );
  }, []);

  const startBookmarkDrag = useCallback(
    (groupId: number, bookmarkId: number) => {
      setDragState({
        kind: "bookmark",
        sourceGroupId: groupId,
        sourceBookmarkId: bookmarkId,
        targetGroupId: null,
        insertIndex: null,
      });
    },
    [],
  );

  const dragOverBookmark = useCallback(
    (groupId: number, insertIndex: number) => {
      setDragState((current) =>
        current?.kind === "bookmark"
          ? {
              ...current,
              targetGroupId: groupId,
              insertIndex,
            }
          : current,
      );
    },
    [],
  );

  /** dragover 阶段只改 dragState；真正修改 bookmarkData 只发生在 drop。 */
  const commitDrag = useCallback(() => {
    setBookmarkData((current) => {
      if (!dragState) {
        return current;
      }

      if (dragState.kind === "group") {
        if (dragState.insertIndex === null) {
          return current;
        }
        return reorderGroups(
          current,
          dragState.sourceGroupId,
          dragState.insertIndex,
        );
      }

      return reorderBookmarks(current, dragState);
    });

    setDragState(null);
  }, [dragState]);

  const endDrag = useCallback(() => {
    setDragState(null);
  }, []);

  const save = useCallback(() => {
    if (saveFetcher.state !== "idle") {
      return;
    }

    let changes: BookmarkEditChanges;
    try {
      changes = createBookmarkEditChanges(originalBookmarkData, bookmarkData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "无法计算书签变更";
      toast.error(`保存失败：${message}`);
      return;
    }

    if (!hasBookmarkChanges(changes)) {
      toast.info("没有需要保存的更改");
      return;
    }

    saveFetcher.submit(
      { changes },
      {
        method: "post",
        encType: "application/json",
      },
    );
  }, [bookmarkData, originalBookmarkData, saveFetcher, toast]);

  useEffect(() => {
    const previousState = previousSaveStateRef.current;
    previousSaveStateRef.current = saveFetcher.state;

    // 仅在一次实际请求结束时提示，避免页面初次渲染时重复提示旧的 fetcher.data。
    if (
      previousState === "idle" ||
      saveFetcher.state !== "idle" ||
      !saveFetcher.data
    ) {
      return;
    }

    if (saveFetcher.data.ok) {
      const savedBookmarkData = structuredClone(saveFetcher.data.bookmarkdata);
      setOriginalBookmarkData(savedBookmarkData);
      setBookmarkData(structuredClone(savedBookmarkData));
      toast.success("保存成功");
    } else {
      toast.error(`保存失败：${saveFetcher.data.error}`);
    }
  }, [saveFetcher.data, saveFetcher.state, toast]);

  useEffect(() => {
    if (!shouldScrollToEnd) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      endOfPageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
      setShouldScrollToEnd(false);
    });

    return () => cancelAnimationFrame(frame);
  }, [bookmarkData.length, shouldScrollToEnd]);

  useEffect(() => {
    return () => clearDeleteTimer();
  }, [clearDeleteTimer]);

  const groupElements = bookmarkData.map((group, groupIndex) => (
    <BookmarkGroupEdit
      key={group.id}
      bookmarkGroupData={group}
      groupIndex={groupIndex}
      dragState={dragState}
      deleteTarget={deleteTarget}
      groupDropIndicatorPosition={getGroupDropIndicatorPosition(
        bookmarkData,
        groupIndex,
        dragState,
      )}
      onGroupChange={changeGroup}
      onToggleEmphasized={toggleGroupEmphasized}
      onAddBookmark={addBookmark}
      onDeleteRequest={requestDelete}
      onDeleteConfirm={confirmDelete}
      onBookmarkChange={changeBookmark}
      onValidationError={notifyValidationError}
      onGroupDragStart={startGroupDrag}
      onGroupDragOver={dragOverGroup}
      onBookmarkDragStart={startBookmarkDrag}
      onBookmarkDragOver={dragOverBookmark}
      onDrop={commitDrag}
      onDragEnd={endDrag}
    />
  ));

  return (
    <main>
      <div className="mb-8 flex flex-wrap gap-2">
        <h1 className=" text-4xl font-bold text-primary-foreground">
          编辑书签
        </h1>
        <div className="ml-auto flex-none">
          <a
            className={cn(
              "text-foreground hover:text-primary-foreground",
              "transform duration-200",
            )}
            href="https://lucide.dev/icons/"
            target="_blank"
            rel="noopener"
          >
            [挑选图标]
          </a>
        </div>
        <div className="flex-none">
          <Link to="/">[返回]</Link>
        </div>
      </div>
      <OptionElement
        className="flex gap-4 py-2"
        onCreateGroup={addGroup}
        onSave={save}
        saving={saveFetcher.state !== "idle"}
      />

      {groupElements}
      <OptionElement
        className="flex gap-4 border-t-2 border-muted-border py-2"
        onCreateGroup={addGroup}
        onSave={save}
        saving={saveFetcher.state !== "idle"}
      />
      <div ref={endOfPageRef} aria-hidden="true" />
    </main>
  );
}

/** 编辑页顶部和底部操作栏所需的属性。 */
type OptionElementProps = ComponentProps<"div"> & {
  onCreateGroup: () => void;
  onSave: () => void;
  saving: boolean;
};

/** 提供新增书签组与保存操作。 */
function OptionElement({
  onCreateGroup,
  onSave,
  saving,
  className,
  ...restProps
}: OptionElementProps) {
  return (
    <div className={className} {...restProps}>
      <button
        type="button"
        className={cn(
          "ml-auto flex-none text-foreground hover:text-primary-foreground",
          "transform duration-200",
        )}
        onClick={onCreateGroup}
      >
        [＋新建书签组]
      </button>
      <button
        type="button"
        className={cn(
          "flex-none text-foreground hover:text-primary-foreground disabled:opacity-50",
          "transform duration-200",
        )}
        onClick={onSave}
        disabled={saving}
      >
        {saving ? "[保存中…]" : "[保存]"}
      </button>
    </div>
  );
}
