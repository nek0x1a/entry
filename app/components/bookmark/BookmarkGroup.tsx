import { cn } from "cn";
import type { ComponentProps } from "react";
import type { BookmarkGroupData } from "~/types/bookmark/bookmark";
import Bookmark from "./Bookmark";

/** 展示一个书签组及其书签列表。 */
export default function BookmarkGroup({
  bookmarkGroupData,
  className,
  ...restProps
}: { bookmarkGroupData: BookmarkGroupData } & ComponentProps<"div">) {
  const bookmarkElements = bookmarkGroupData.bookmarks.map((bookmark) => {
    return (
      <Bookmark
        bookmarkData={bookmark}
        emphasized={bookmarkGroupData.emphasized}
        key={bookmark.id}
      ></Bookmark>
    );
  });
  const onlyContents = !bookmarkGroupData.emphasized;

  return (
    <div
      className={cn(onlyContents ?? "flex flex-col", className)}
      {...restProps}
    >
      <h2
        className={cn(
          bookmarkGroupData.emphasized && "col-start-1 -col-end-1",
          bookmarkGroupData.emphasized
            ? "text-3xl font-bold"
            : "text-lg text-primary-foreground",
          "text-primary-foreground",
        )}
      >
        {bookmarkGroupData.name}
      </h2>
      {bookmarkElements}
    </div>
  );
}
