/*
  Warnings:

  - The values [OTHER] on the enum `DeviceType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum: thay giá trị OTHER bằng WEB trong enum DeviceType
BEGIN; -- Bắt đầu migration dạng giao dịch
CREATE TYPE "DeviceType_new" AS ENUM ('MOBILE', 'TABLET', 'WEB', 'DESKTOP'); -- Định nghĩa hình dạng enum mới
ALTER TABLE "refresh_tokens" ALTER COLUMN "device_type" TYPE "DeviceType_new" USING ("device_type"::text::"DeviceType_new"); -- Chuyển các dòng hiện có sang enum mới
ALTER TYPE "DeviceType" RENAME TO "DeviceType_old"; -- Tạm thời giữ lại enum cũ
ALTER TYPE "DeviceType_new" RENAME TO "DeviceType"; -- Đổi tên enum mới thành tên chính thức
DROP TYPE "DeviceType_old"; -- Dọn dẹp enum cũ đã lạc hậu
COMMIT; -- Hoàn tất giao dịch
