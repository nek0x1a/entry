import Bun from "bun";
import jsonData from "./bookmarks.json";

type BookmarkDataType = {
  name: string;
  href: string;
  icon: string;
  description: string;
};

class BookmarkData {
  name: string;
  href: string;
  icon: string;
  description: string;

  constructor({ name, href, icon, description }: BookmarkDataType) {
    this.name = name;
    this.href = href;
    this.icon = icon;
    this.description = description;
  }
}

type BookmarkGroupType = {
  name: string;
  emphasized: boolean;
  description: string;
  bookmarks: BookmarkDataType[];
};

class BookmarkGroupData {
  name: string;
  emphasized: boolean;
  description: string;
  bookmarks: BookmarkData[];

  constructor({ name, emphasized, description, bookmarks }: BookmarkGroupType) {
    this.name = name;
    this.emphasized = emphasized;
    this.description = description;
    this.bookmarks = bookmarks.map((bookmark) => new BookmarkData(bookmark));
  }
}

function toSqlStr(groups: BookmarkGroupData[]): string {
  const groupStrs: string[] = [];
  const bookmarkStr: string[] = [];
  groups.forEach((group, gIndex) => {
    groupStrs.push(
      `(${gIndex}, "${group.name}", ${group.emphasized}, "${group.description}", ${gIndex})`,
    );
    group.bookmarks.forEach((bookmarks, bIndex) => {
      bookmarkStr.push(
        `(${gIndex}, "${bookmarks.name}", "${bookmarks.href}", "${bookmarks.icon}", "${bookmarks.description}", ${bIndex})`,
      );
    });
  });

  return `BEGIN TRANSACTION;
INSERT INTO bookmark_groups
(id, name, emphasized, description, sort_order)
VALUES
${groupStrs.join(",\n")};
INSERT INTO bookmarks
(group_id, name, href, icon, description, sort_order)
VALUES
${bookmarkStr.join(",\n")}
COMMIT;`;
}

const bookmarkGroups = jsonData.map((group) => new BookmarkGroupData(group));
const sqlStr = toSqlStr(bookmarkGroups);

await Bun.write("./scripts/data-convert.sql", sqlStr);
