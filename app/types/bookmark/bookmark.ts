/** 可展示的单条书签记录。 */
export type BookmarkData = {
  id: number;
  sort: number;
  name: string;
  href: string;
  icon: string;
  description: string;
};

/** 书签组及其排序、强调状态和所属书签。 */
export type BookmarkGroupData = {
  id: number;
  sort: number;
  name: string;
  bookmarks: BookmarkData[];
  emphasized: boolean;
  description: string;
};
