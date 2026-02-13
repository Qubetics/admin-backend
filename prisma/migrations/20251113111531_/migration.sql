/*
  Warnings:

  - You are about to drop the column `address` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `countryCode` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `data` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `topic` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `userIp` on the `Activity` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Activity` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "analytics"."Activity" DROP CONSTRAINT "Activity_id_fkey";

-- AlterTable
ALTER TABLE "analytics"."Activity" DROP COLUMN "address",
DROP COLUMN "country",
DROP COLUMN "countryCode",
DROP COLUMN "data",
DROP COLUMN "topic",
DROP COLUMN "updatedAt",
DROP COLUMN "userAgent",
DROP COLUMN "userIp",
ADD COLUMN     "metaData" JSONB,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "analytics"."Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "analytics"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
