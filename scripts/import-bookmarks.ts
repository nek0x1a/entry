import Bun from "bun";

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

/**
 * 解析命令行参数，获取输入 JSON 和输出 SQL 的文件路径。
 */
function parseArgs(args: string[]): { inputPath: string; outputPath: string } {
  let inputPath: string | undefined;
  let outputPath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];

    if (arg !== "-i" && arg !== "-o") {
      throw new Error(`未知参数：${arg}`);
    }

    if (!value || value.startsWith("-")) {
      throw new Error(`参数 ${arg} 缺少文件路径`);
    }

    if (arg === "-i") {
      if (inputPath) {
        throw new Error("参数 -i 不能重复指定");
      }
      inputPath = value;
    } else {
      if (outputPath) {
        throw new Error("参数 -o 不能重复指定");
      }
      outputPath = value;
    }

    i++;
  }

  if (!inputPath || !outputPath) {
    throw new Error("必须同时指定输入 '-i' 和输出 '-o' 路径");
  }

  return { inputPath, outputPath };
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

const { inputPath, outputPath } = parseArgs(process.argv.slice(2));
const jsonData = (await Bun.file(inputPath).json()) as BookmarkGroupType[];
const bookmarkGroups = jsonData.map((group) => new BookmarkGroupData(group));
const sqlStr = toSqlStr(bookmarkGroups);

await Bun.write(outputPath, sqlStr);
