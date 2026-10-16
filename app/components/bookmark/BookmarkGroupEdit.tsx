import { cn } from "cn";
import { GripVertical, Plus, Star, StarOff } from "lucide-react";
import type { DragEvent } from "react";
import type { BookmarkGroupData } from "~/types/bookmark/bookmark";
import type {
  DeleteTarget,
  DragState,
  EditableBookmarkFields,
  EditableBookmarkGroupFields,
} from "~/types/bookmark/edit";
import {
  normalizeDescription,
  normalizeName,
} from "~/utils/bookmarkValidation";
import BookmarkEdit from "./BookmarkEdit";
import DeleteConfirmButton from "./DeleteConfirmButton";
import EditableField from "./EditableField";

/** 书签组编辑器的值、操作回调和拖放状态。 */
type BookmarkGroupEditProps = {
  bookmarkGroupData: BookmarkGroupData;
  groupIndex: number;
  dragState: DragState;
  deleteTarget: DeleteTarget | null;
  groupDropIndicatorPosition: "before" | "after" | null;

  onGroupChange: (
    groupId: number,
    changes: Partial<EditableBookmarkGroupFields>,
  ) => void;

  onToggleEmphasized: (groupId: number) => void;

  onAddBookmark: (groupId: number) => void;

  onDeleteRequest: (target: DeleteTarget) => void;

  onDeleteConfirm: (target: DeleteTarget) => void;
  onBookmarkChange: (
    groupId: number,
    bookmarkId: number,
    changes: Partial<EditableBookmarkFields>,
  ) => void;
  onValidationError: (message: string) => void;

  onGroupDragStart: (groupId: number) => void;
  onGroupDragOver: (insertIndex: number) => void;

  onBookmarkDragStart: (groupId: number, bookmarkId: number) => void;
  onBookmarkDragOver: (groupId: number, insertIndex: number) => void;

  onDrop: () => void;
  onDragEnd: () => void;

  className?: string;
};

/** 组拖放指示线相对当前组的位置。 */
type DropIndicatorPosition = "before" | "after";

/** 在书签组边缘绘制拖放插入位置。 */
function DropIndicator({ position }: { position: DropIndicatorPosition }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-primary-foreground",
        position === "before" ? "top-0" : "bottom-0",
      )}
    />
  );
}

/** 渲染组级设置，并为组内书签提供编辑和拖放区域。 */
export default function BookmarkGroupEdit({
  bookmarkGroupData,
  groupIndex,
  dragState,
  deleteTarget,
  groupDropIndicatorPosition,
  onGroupChange,
  onToggleEmphasized,
  onAddBookmark,
  onDeleteRequest,
  onDeleteConfirm,
  onBookmarkChange,
  onValidationError,
  onGroupDragStart,
  onGroupDragOver,
  onBookmarkDragStart,
  onBookmarkDragOver,
  onDrop,
  onDragEnd,
  className,
}: BookmarkGroupEditProps) {
  const groupDeleteTarget: DeleteTarget = {
    kind: "group",
    groupId: bookmarkGroupData.id,
  };
  const isDragging =
    dragState?.kind === "group" &&
    dragState.sourceGroupId === bookmarkGroupData.id;

  const groupDeleteConfirmed =
    deleteTarget?.kind === "group" &&
    deleteTarget.groupId === bookmarkGroupData.id;

  const bookmarkDropIndex =
    dragState?.kind === "bookmark" &&
    dragState.targetGroupId === bookmarkGroupData.id
      ? dragState.insertIndex
      : null;
  const sourceBookmarkId =
    dragState?.kind === "bookmark" &&
    dragState.sourceGroupId === bookmarkGroupData.id
      ? dragState.sourceBookmarkId
      : null;
  const sourceBookmarkIndex =
    sourceBookmarkId === null
      ? -1
      : bookmarkGroupData.bookmarks.findIndex(
          (bookmark) => bookmark.id === sourceBookmarkId,
        );
  const isNoOpBookmarkDrop =
    bookmarkDropIndex !== null &&
    sourceBookmarkIndex >= 0 &&
    (bookmarkDropIndex === sourceBookmarkIndex ||
      bookmarkDropIndex === sourceBookmarkIndex + 1);
  const showEmptyBookmarkDropIndicator =
    bookmarkGroupData.bookmarks.length === 0 &&
    bookmarkDropIndex === 0 &&
    !isNoOpBookmarkDrop;

  function handleGroupDragStart(event: DragEvent<HTMLButtonElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(bookmarkGroupData.id));

    onGroupDragStart(bookmarkGroupData.id);
  }

  function handleGroupDragOver(event: DragEvent<HTMLDivElement>) {
    if (dragState?.kind !== "group") {
      return;
    }

    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const isAfter = event.clientY >= rect.top + rect.height / 2;

    onGroupDragOver(groupIndex + (isAfter ? 1 : 0));
  }

  /** 在组标题上拖动书签，表示插入到该组末尾。 */
  function handleHeaderDragOver(event: DragEvent<HTMLDivElement>) {
    if (dragState?.kind !== "bookmark") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    onBookmarkDragOver(
      bookmarkGroupData.id,
      bookmarkGroupData.bookmarks.length,
    );
  }

  function handleHeaderDrop(event: DragEvent<HTMLDivElement>) {
    if (dragState?.kind !== "bookmark") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    onDrop();
  }

  /** 书签列表的空白区域表示插入到末尾；组拖拽表示放在当前组之后。 */
  function handleEndDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (dragState?.kind === "bookmark") {
      onBookmarkDragOver(
        bookmarkGroupData.id,
        bookmarkGroupData.bookmarks.length,
      );
    } else if (dragState?.kind === "group") {
      onGroupDragOver(groupIndex + 1);
    }
  }

  function handleEndDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    onDrop();
  }

  return (
    <div
      className={cn(
        "relative min-w-0",
        isDragging && "z-10 outline-2 outline-dashed opacity-60",
        className,
      )}
      onDragOver={handleGroupDragOver}
      onDrop={(event) => {
        if (dragState?.kind === "group") {
          event.preventDefault();
          event.stopPropagation();
          onDrop();
        }
      }}
    >
      {groupDropIndicatorPosition === "before" && (
        <DropIndicator position="before" />
      )}
      <div
        className={cn(
          "py-2",
          "bookmark-group-edit-grid-columns",
          "justify-between items-center",
          "border-y-2 border-muted-border",
        )}
        onDragOver={handleHeaderDragOver}
        onDrop={handleHeaderDrop}
      >
        {/* 拖动按钮 */}
        <button
          type="button"
          draggable
          className={cn(
            "flex cursor-grab justify-center",
            "text-muted-foreground hover:text-foreground",
            "active:cursor-grabbing",
            "transform duration-200",
          )}
          aria-label="拖动书签组"
          onDragStart={handleGroupDragStart}
          onDragEnd={onDragEnd}
        >
          <GripVertical />
        </button>
        {/* 重要书签组 */}
        <button
          type="button"
          className={cn(
            "flex justify-center",
            bookmarkGroupData.emphasized
              ? "text-primary-foreground hover:text-primary-foreground-hover"
              : "text-muted-foreground hover:text-foreground",
            "transform duration-200",
          )}
          aria-label={
            bookmarkGroupData.emphasized ? "取消重要书签组" : "设为重要书签组"
          }
          aria-pressed={bookmarkGroupData.emphasized}
          onClick={() => onToggleEmphasized(bookmarkGroupData.id)}
        >
          {bookmarkGroupData.emphasized ? <Star size="1.5rem" /> : <StarOff />}
        </button>
        {/* 书签组名 */}
        <EditableField
          onError={onValidationError}
          value={bookmarkGroupData.name}
          onChange={(value) =>
            onGroupChange(bookmarkGroupData.id, { name: value })
          }
          normalize={normalizeName}
          displayClassName="text-xl text-primary-foreground font-bold"
        />
        {/* 书签组说明 */}
        <EditableField
          onError={onValidationError}
          value={bookmarkGroupData.description}
          onChange={(value) =>
            onGroupChange(bookmarkGroupData.id, { description: value })
          }
          normalize={normalizeDescription}
          multiline
          placeholder="暂无描述"
          displayClassName="text-muted-foreground hover:text-foreground transform duration-200"
        />
        {/* 新增书签 */}
        <button
          type="button"
          className={cn(
            "flex justify-center text-foreground hover:text-primary-foreground",
            "transform duration-200",
          )}
          aria-label="新增书签"
          onClick={() => onAddBookmark(bookmarkGroupData.id)}
        >
          <Plus size="1.5rem" />
        </button>
        {/* 删除组 */}
        <DeleteConfirmButton
          confirmed={groupDeleteConfirmed}
          onClick={() =>
            groupDeleteConfirmed
              ? onDeleteConfirm(groupDeleteTarget)
              : onDeleteRequest(groupDeleteTarget)
          }
          size={24}
        />
      </div>
      <div
        className="relative ml-6"
        onDragOver={handleEndDragOver}
        onDrop={handleEndDrop}
      >
        {bookmarkGroupData.bookmarks.map((bookmark, index) => {
          let dropIndicatorPosition: DropIndicatorPosition | null = null;
          if (bookmarkDropIndex !== null && !isNoOpBookmarkDrop) {
            if (bookmarkDropIndex === index + 1) {
              // 插入位置统一画在前一条书签的底边，覆盖现有 border-b。
              dropIndicatorPosition = "after";
            } else if (index === 0 && bookmarkDropIndex === 0) {
              dropIndicatorPosition = "before";
            }
          }

          return (
            <BookmarkEdit
              key={bookmark.id}
              groupId={bookmarkGroupData.id}
              bookmarkIndex={index}
              bookmarkData={bookmark}
              dragState={dragState}
              deleteConfirmed={
                deleteTarget?.kind === "bookmark" &&
                deleteTarget.groupId === bookmarkGroupData.id &&
                deleteTarget.bookmarkId === bookmark.id
              }
              dropIndicatorPosition={dropIndicatorPosition}
              onBookmarkChange={onBookmarkChange}
              onValidationError={onValidationError}
              onDeleteRequest={onDeleteRequest}
              onDeleteConfirm={onDeleteConfirm}
              onBookmarkDragStart={onBookmarkDragStart}
              onBookmarkDragOver={onBookmarkDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          );
        })}
        {showEmptyBookmarkDropIndicator && <DropIndicator position="before" />}
      </div>

      {groupDropIndicatorPosition === "after" && (
        <DropIndicator position="after" />
      )}
    </div>
  );
}
