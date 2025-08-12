-- AlterTable
ALTER TABLE "events" ADD COLUMN     "googleEventId" TEXT,
ADD COLUMN     "syncedAt" TIMESTAMP(3);
