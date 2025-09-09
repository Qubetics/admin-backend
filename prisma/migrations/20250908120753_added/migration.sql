/*
  Warnings:

  - A unique constraint covering the columns `[nodeAddress]` on the table `NodeRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "NodeRequest_nodeAddress_key" ON "analytics"."NodeRequest"("nodeAddress");
