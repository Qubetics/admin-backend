-- CreateEnum
CREATE TYPE "analytics"."Status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "analytics"."NodeStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "analytics"."User" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "role" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."NodeRequest" (
    "id" TEXT NOT NULL,
    "orgName" TEXT,
    "email" TEXT,
    "location" TEXT NOT NULL,
    "nodeAddress" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "analytics"."Status" NOT NULL,
    "nodeStatus" "analytics"."NodeStatus" NOT NULL,
    "bandwidth" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "remoteUrl" TEXT NOT NULL,
    "provAddress" TEXT NOT NULL,
    "action" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestFor" TEXT NOT NULL,

    CONSTRAINT "NodeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."Activity" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "targetUid" TEXT,
    "userIp" TEXT NOT NULL,
    "country" TEXT,
    "countryCode" TEXT,
    "userAgent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "analytics"."User"("address");

-- CreateIndex
CREATE UNIQUE INDEX "NodeRequest_nodeAddress_key" ON "analytics"."NodeRequest"("nodeAddress");

-- CreateIndex
CREATE UNIQUE INDEX "NodeRequest_address_key" ON "analytics"."NodeRequest"("address");

-- AddForeignKey
ALTER TABLE "analytics"."NodeRequest" ADD CONSTRAINT "NodeRequest_address_fkey" FOREIGN KEY ("address") REFERENCES "analytics"."User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics"."Activity" ADD CONSTRAINT "Activity_id_fkey" FOREIGN KEY ("id") REFERENCES "analytics"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
