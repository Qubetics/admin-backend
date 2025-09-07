/*
  Warnings:

  - Added the required column `planId` to the `NodeRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "analytics"."NodeRequest" ADD COLUMN     "planId" TEXT NOT NULL;
