-- CreateEnum
CREATE TYPE "GatewayStatus" AS ENUM ('ONLINE', 'OFFLINE', 'DEGRADED');

-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'DISPATCHED', 'SETTLED', 'FAILED');

-- CreateEnum
CREATE TYPE "TargetStatus" AS ENUM ('PENDING', 'ACKED', 'FAILED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "TagSize" AS ENUM ('T154', 'T213', 'T290', 'T420', 'T750', 'T1020');

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gateway" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "hardwareId" TEXT NOT NULL,
    "firmware" TEXT NOT NULL,
    "status" "GatewayStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastSeenAt" TIMESTAMP(3),
    "maxTagsPerSec" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "Gateway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sku" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "mrpMinor" INTEGER NOT NULL,
    "promoBadge" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Sku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "gatewayId" TEXT NOT NULL,
    "hardwareId" TEXT NOT NULL,
    "size" "TagSize" NOT NULL,
    "skuId" TEXT,
    "desiredVersion" INTEGER NOT NULL DEFAULT 0,
    "desiredHash" TEXT,
    "desiredPayload" JSONB,
    "reportedVersion" INTEGER NOT NULL DEFAULT 0,
    "reportedHash" TEXT,
    "reportedAt" TIMESTAMP(3),
    "batteryPct" INTEGER,
    "rssi" INTEGER,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Command" (
    "id" TEXT NOT NULL,
    "gatewayId" TEXT NOT NULL,
    "status" "CommandStatus" NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "Command_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandTarget" (
    "id" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "TargetStatus" NOT NULL DEFAULT 'PENDING',
    "ackedAt" TIMESTAMP(3),
    "failure" TEXT,

    CONSTRAINT "CommandTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceEvent" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "oldPriceMinor" INTEGER NOT NULL,
    "newPriceMinor" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gateway_hardwareId_key" ON "Gateway"("hardwareId");

-- CreateIndex
CREATE UNIQUE INDEX "Sku_storeId_code_key" ON "Sku"("storeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_hardwareId_key" ON "Tag"("hardwareId");

-- CreateIndex
CREATE UNIQUE INDEX "CommandTarget_commandId_tagId_key" ON "CommandTarget"("commandId", "tagId");

-- Hand-crafted partial index for divergence query
CREATE INDEX idx_tag_diverged
  ON "Tag" ("gatewayId")
  WHERE "desiredVersion" > "reportedVersion";

-- AddForeignKey
ALTER TABLE "Gateway" ADD CONSTRAINT "Gateway_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sku" ADD CONSTRAINT "Sku_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "Gateway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "Gateway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandTarget" ADD CONSTRAINT "CommandTarget_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "Command"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandTarget" ADD CONSTRAINT "CommandTarget_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceEvent" ADD CONSTRAINT "PriceEvent_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
