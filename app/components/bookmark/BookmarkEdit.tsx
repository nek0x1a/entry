import { cn } from "cn";
import { GripVertical } from "lucide-react";
import { DynamicIcon, type IconName, iconNames } from "lucide-react/dynamic";
import type { DragEvent } from "react";
import type { BookmarkData } from "~/types/bookmark/bookmark";
import type {
  DeleteTarget,
  DragState,
  EditableBookmarkFields,
} from "~/types/bookmark/edit";
import {
  normalizeDescription,
  normalizeHref,
  normalizeName,
} from "~/utils/bookmarkValidation";
import DeleteConfirmButton from "./DeleteConfirmButton";
import EditableField from "./EditableField";

/** 仅渲染 Lucide 支持的动态 icon 名称。 */
function isIconName(value: string): value is IconName {
  return iconNames.includes(value as IconName);
}

/** 单条书签编辑器的值、交互回调和拖放状态。 */
type BookmarkEditProps = {
  groupId: number;
  bookmarkIndex: number;
  bookmarkData: BookmarkData;
  dragState: DragState;
  deleteConfirmed: boolean;
  dropIndicatorPosition: "before" | "after" | null;

  onBookmarkChange: (
    groupId: number,
    bookmarkId: number,
    changes: Partial<EditableBookmarkFields>,
  ) => void;
  onValidationError: (message: string) => void;

  onDeleteRequest: (target: DeleteTarget) => void;

  onDeleteConfirm: (target: DeleteTarget) => void;

  onBookmarkDragStart: (groupId: number, bookmarkId: number) => void;
  onBookmarkDragOver: (groupId: number, insertIndex: number) => void;

  onDrop: () => void;
  onDragEnd: () => void;

  className?: string;
};

/** 书签拖放指示线相对当前行的位置。 */
type DropIndicatorPosition = "before" | "after";

/** 在书签行边缘绘制拖放插入位置。 */
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

/** 渲染书签编辑字段、删除确认和拖动排序控件。 */
export default function BookmarkEdit({
  groupId,
  bookmarkIndex,
  bookmarkData,
  dragState,
  deleteConfirmed,
  dropIndicatorPosition,
  onBookmarkChange,
  onValidationError,
  onDeleteRequest,
  onDeleteConfirm,
  onBookmarkDragStart,
  onBookmarkDragOver,
  onDrop,
  onDragEnd,
  className,
}: BookmarkEditProps) {
  const normalizedIcon = bookmarkData.icon.toLowerCase();

  const iconElement = isIconName(normalizedIcon) ? (
    <DynamicIcon name={normalizedIcon} size="1rem" />
  ) : null;
  const deleteTarget: DeleteTarget = {
    kind: "bookmark",
    groupId,
    bookmarkId: bookmarkData.id,
  };

  const isDragging =
    dragState?.kind === "bookmark" &&
    dragState.sourceBookmarkId === bookmarkData.id;

  function handleDragStart(event: DragEvent<HTMLButtonElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(bookmarkData.id));

    onBookmarkDragStart(groupId, bookmarkData.id);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (dragState?.kind !== "bookmark") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    const isAfter = event.clientY >= rect.top + rect.height / 2;

    onBookmarkDragOver(groupId, bookmarkIndex + (isAfter ? 1 : 0));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (dragState?.kind !== "bookmark") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    onDrop();
  }

  const bookmarkChange = (changes: Partial<EditableBookmarkFields>) => {
    onBookmarkChange(groupId, bookmarkData.id, changes);
  };

  return (
    <div
      className={cn(
        "bookmark-edit-grid-columns",
        "relative py-1",
        "justify-between items-center",
        "border-b border-muted-border last:border-b-0",
        isDragging && "outline-2 outline-dashed opacity-60",
        className,
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {dropIndicatorPosition === "before" && (
        <DropIndicator position="before" />
      )}

      {/* 只有这个按钮具有 draggable */}
      <button
        type="button"
        draggable
        className={cn(
          "flex cursor-grab justify-center",
          "text-muted-foreground hover:text-foreground",
          "active:cursor-grabbing",
          "transform duration-200",
        )}
        aria-label="拖动书签"
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
      >
        <GripVertical />
      </button>

      {/* 书签实际图标 */}
      <div className="flex justify-center">{iconElement}</div>
      {/* icon 字段 */}
      <EditableField
        onError={onValidationError}
        value={bookmarkData.icon}
        onChange={(value) => bookmarkChange({ icon: value })}
        normalize={normalizeName}
        placeholder="图标 id"
        displayClassName="text-muted-foreground hover:text-foreground transform duration-200"
      />
      {/* name 字段 */}
      <EditableField
        onError={onValidationError}
        value={bookmarkData.name}
        onChange={(value) => bookmarkChange({ name: value })}
        normalize={normalizeName}
        displayClassName="text-foreground hover:text-primary-foreground transform duration-200"
      />
      {/* href 字段 */}
      <EditableField
        onError={onValidationError}
        value={bookmarkData.href}
        onChange={(value) => bookmarkChange({ href: value })}
        normalize={normalizeHref}
        multiline
        placeholder="暂无链接"
        displayClassName={cn(
          bookmarkData.href ? "text-foreground" : "text-muted-foreground",
          "italic hover:text-primary-foreground transform duration-200",
        )}
      />
      {/* description 字段 */}
      <EditableField
        onError={onValidationError}
        value={bookmarkData.description}
        onChange={(value) =>
          bookmarkChange({
            description: value,
          })
        }
        normalize={normalizeDescription}
        multiline
        placeholder="暂无描述"
        displayClassName="text-muted-foreground hover:text-foreground transform duration-200"
      />
      {/* 删除按钮 */}
      <DeleteConfirmButton
        confirmed={deleteConfirmed}
        onClick={() =>
          deleteConfirmed
            ? onDeleteConfirm(deleteTarget)
            : onDeleteRequest(deleteTarget)
        }
      />

      {dropIndicatorPosition === "after" && (
        <DropIndicator position="after" />
      )}
    </div>
  );
}
