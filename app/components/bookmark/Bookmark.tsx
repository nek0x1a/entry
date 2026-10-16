import { cn } from "cn";
import { DynamicIcon, type IconName, iconNames } from "lucide-react/dynamic";
import type { ComponentProps } from "react";
import type { BookmarkData } from "~/types/bookmark/bookmark";

/** 仅渲染 Lucide 支持的动态 icon 名称。 */
function isIconName(value: string): value is IconName {
  return iconNames.includes(value as IconName);
}

/** 展示可点击的单条书签，并根据分组强调状态调整图标和说明。 */
export default function Bookmark({
  bookmarkData,
  emphasized = false,
  ...restProps
}: {
  bookmarkData: BookmarkData;
  emphasized?: boolean;
} & ComponentProps<"a">) {
  const iconSize = emphasized ? "2rem" : "1rem";
  const normalizedIcon = bookmarkData.icon.toLowerCase();
  const iconElement = isIconName(normalizedIcon) ? (
    <DynamicIcon name={normalizedIcon} size={iconSize} />
  ) : null;
  return (
    <a href={bookmarkData.href} target="_blank" rel="noreferrer" {...restProps}>
      <div
        className={cn(
          "px-2 py-1 rounded",
          "flex gap-2",
          "hover:bg-background-hover",
          "transition duration-150",
        )}
      >
        <div
          className={cn(
            emphasized ? "w-8" : "w-4",
            "overflow-hidden",
            "flex-none flex items-center justify-center",
          )}
        >
          {iconElement}
        </div>
        <div className="min-w-0">
          <div className={cn(emphasized ? "text-primary-foreground" : "")}>
            {bookmarkData.name}
          </div>
          {emphasized && bookmarkData.description ? (
            <div className="text-xs truncate">{bookmarkData.description}</div>
          ) : null}
        </div>
      </div>
    </a>
  );
}
