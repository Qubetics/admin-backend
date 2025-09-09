/*
  Warnings:

  - The values [ACTIVE,INACTIVE] on the enum `NodeStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "analytics"."NodeStatus_new" AS ENUM ('active', 'inactive');
ALTER TABLE "analytics"."NodeRequest" ALTER COLUMN "nodeStatus" TYPE "analytics"."NodeStatus_new" USING ("nodeStatus"::text::"analytics"."NodeStatus_new");
ALTER TYPE "analytics"."NodeStatus" RENAME TO "NodeStatus_old";
ALTER TYPE "analytics"."NodeStatus_new" RENAME TO "NodeStatus";
DROP TYPE "analytics"."NodeStatus_old";
COMMIT;
