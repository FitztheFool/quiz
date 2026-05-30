-- Ensure a fallback "Non classé" group exists for any orphan word, then
-- promote words.wordGroupId to NOT NULL.

-- 1. Create the fallback group if it doesn't already exist.
INSERT INTO "word_groups" (id, theme)
SELECT 'wgrp_uncategorized', 'Non classé'
WHERE NOT EXISTS (SELECT 1 FROM "word_groups" WHERE theme = 'Non classé');

-- 2. Move every orphan word into it.
UPDATE "words"
SET "wordGroupId" = (SELECT id FROM "word_groups" WHERE theme = 'Non classé' LIMIT 1)
WHERE "wordGroupId" IS NULL;

-- 3. Tighten the column + drop nullable FK constraint.
ALTER TABLE "words" ALTER COLUMN "wordGroupId" SET NOT NULL;