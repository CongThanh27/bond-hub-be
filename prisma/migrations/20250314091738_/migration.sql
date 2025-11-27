/*
  Warnings:

  - The values [OTHER] on the enum `DeviceType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum: tạo lại enum DeviceType để thay OTHER bằng WEB
BEGIN; -- Bắt đầu giao dịch để thay enum
CREATE TYPE "DeviceType_new" AS ENUM ('MOBILE', 'TABLET', 'WEB', 'DESKTOP'); -- Định nghĩa enum mới có thêm giá trị WEB
ALTER TABLE "refresh_tokens" ALTER COLUMN "device_type" TYPE "DeviceType_new" USING ("device_type"::text::"DeviceType_new"); -- Ép các giá trị hiện có sang enum mới
ALTER TYPE "DeviceType" RENAME TO "DeviceType_old"; -- Giữ lại tham chiếu tới enum cũ
ALTER TYPE "DeviceType_new" RENAME TO "DeviceType"; -- Đổi tên enum mới để thay thế enum cũ
DROP TYPE "DeviceType_old"; -- Xóa định nghĩa enum cũ
COMMIT; -- Kết thúc giao dịch
