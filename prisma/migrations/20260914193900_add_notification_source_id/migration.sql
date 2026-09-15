-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "source_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "notifications_user_id_type_source_id_key" ON "notifications"("user_id", "type", "source_id");
