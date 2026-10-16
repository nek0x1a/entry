-- Migration number: 0001 	 2026-09-13T08:09:09.974Z
CREATE TABLE bookmark_groups (
    `id` INTEGER PRIMARY KEY,
    `name` TEXT NOT NULL,
    `emphasized` INTEGER NOT NULL DEFAULT 0,
    `description` TEXT NOT NULL DEFAULT '',
    `sort_order` INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE bookmarks (
    `id` INTEGER PRIMARY KEY,
    `group_id` INTEGER NOT NULL,
    `name` TEXT NOT NULL,
    `href` TEXT NOT NULL,
    `icon` TEXT NOT NULL DEFAULT '',
    `description` TEXT NOT NULL DEFAULT '',
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (`group_id`)
        REFERENCES bookmark_groups(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_bookmarks_group_id ON bookmarks(group_id);