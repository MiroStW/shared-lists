-- AlterTable
ALTER TABLE "Command" ADD COLUMN     "sentence" BOOLEAN NOT NULL DEFAULT false;

-- Existing agent sentences keep counting against today's limit.
UPDATE "Command" SET "sentence" = true
WHERE "origin" = 'agent' AND "kind" = 'change' AND "inputText" IS NOT NULL;
