import type {
  BookmarkDBRow,
  BookmarkEditChanges,
  BookmarkGroupDBRow,
} from "~/types/bookmark/edit";

/** 字段解析的成功值或可展示错误；预期输入错误不使用异常控制流程。 */
export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/** 将校验通过的值包装为解析成功结果。 */
function success<T>(value: T): ParseResult<T> {
  return { ok: true, value };
}

/** 将用户输入错误包装为解析失败结果。 */
function failure<T = never>(error: string): ParseResult<T> {
  return { ok: false, error };
}

/**
 * 数据库写入边界仍需拒绝非法数据，因此将解析结果转换为异常。
 * 正常的字段编辑流程应直接检查 ParseResult，而不是使用此函数。
 */
function unwrapOrThrow<T>(result: ParseResult<T>): T {
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

/** 校验变更集中的记录 ID、排序值和可编辑文本，并原地规范化字段。 */
export function validateAndNormalizeChanges(changes: BookmarkEditChanges) {
  changes.groups.create.forEach((item) => {
    assertGroupRecord(item, true);
  });
  changes.groups.update.forEach((item) => {
    assertGroupRecord(item, false);
  });
  changes.groups.delete.forEach((item) => {
    assertIdAndSort(item, "id", false);
  });
  changes.bookmarks.create.forEach((item) => {
    assertBookmark(item, true);
  });
  changes.bookmarks.update.forEach((item) => {
    assertBookmark(item, false);
  });
  changes.bookmarks.delete.forEach((item) => {
    assertIdAndSort(item, "id", false);
  });
}

/** 校验书签组记录，并规范化组名。 */
function assertGroupRecord(group: BookmarkGroupDBRow, isInsert: boolean) {
  assertIdAndSort(group.id, "id", isInsert);
  assertIdAndSort(group.sort, "sort", isInsert);
  group.name = unwrapOrThrow(normalizeName(group.name));
}

/** 校验书签记录，并规范化名称和链接。 */
function assertBookmark(bookmark: BookmarkDBRow, isInsert: boolean) {
  assertIdAndSort(bookmark.id, "id", isInsert);
  assertIdAndSort(bookmark.sort, "sort", isInsert);
  bookmark.name = unwrapOrThrow(normalizeName(bookmark.name));
  bookmark.href = unwrapOrThrow(normalizeHref(bookmark.href));
}

/** 新建记录使用负数临时 ID，持久化记录使用正数 ID，排序值始终非负。 */
function assertIdAndSort(
  value: number,
  kind: "id" | "sort",
  isInsert: boolean,
) {
  if (!Number.isInteger(value)) {
    throw new Error(`${kind}必须为整数: ${value}`);
  } else if (kind==="id" && !isInsert && value < 0) {
    // 非插入更改 id 为负数
    throw new Error(`非新增书签 id 不能为负数: ${value}`);
  } else if (kind==="id" && isInsert && value >= 0) {
    // 插入更改 id 为正数
    throw new Error(`新增书签 id 不能为正数: ${value}`);
  } else if (kind==="sort"  && value < 0) {
    // sort 为负数
    throw new Error(`排序必须为正数: ${value}`);
  }
}

/** 将名称折叠为单行文本并移除首尾空格；空名称会返回失败。 */
export function normalizeName(value: string): ParseResult<string> {
  if (typeof value !== "string") {
    return failure("名称必须是文本");
  }

  const name = value.replace(/\r\n|\r|\n/g, " ").trim().replace(/ +/g, " ");
  if (!name) {
    return failure("名称为空");
  }
  return success(name);
}

/** 将描述折叠为单行文本并移除首尾空格。 */
export function normalizeDescription(value: string): ParseResult<string> {
  if (typeof value !== "string") {
    return failure("描述必须是文本");
  }

  return success(
    value.replace(/\r\n|\r|\n/g, " ").trim().replace(/ +/g, " "),
  );
}

/** 校验并规范化可作为网页书签打开的地址，不限 HTTP/HTTPS 协议。 */
export function normalizeHref(value: string): ParseResult<string> {
  if (typeof value !== "string") {
    return failure("链接必须是文本");
  }
  try {
    const url = new URL(value);
    return success(url.href);
  } catch {
    return failure(`不正确的 url 格式: ${value}`);
  }
}
