-- AlterTable: chuyển introduced_by sang TEXT để lưu tên hoặc ghi chú tự do
ALTER TABLE "friends" ALTER COLUMN "introduced_by" SET DATA TYPE TEXT; -- Chuyển kiểu từ UUID sang TEXT
