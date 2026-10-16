BEGIN TRANSACTION;
-- 清空数据表
DELETE FROM bookmarks;
DELETE FROM sqlite_sequence WHERE name = 'bookmarks';
DELETE FROM bookmark_groups;
DELETE FROM sqlite_sequence WHERE name = 'bookmark_groups';

-- 插入书签组
INSERT INTO bookmark_groups
(id, name, emphasized, description, sort_order)
VALUES
(0, "重要书签组", true, "", 0),
(1, "普通书签组", true, "", 1);

-- 插入书签
INSERT INTO bookmarks
(group_id, name, href, icon, description, sort_order)
VALUES
(0, "重要书签1", "https://example.com/", "layout-grid", "重要书签描述", 0),
(0, "重要书签2", "https://example.com/", "layout-grid", "重要书签描述", 1),
(1, "书签3", "https://example.com/", "layout-grid", "重要书签描述", 0),
(1, "书签4", "https://example.com/", "layout-grid", "重要书签描述", 1)
COMMIT;