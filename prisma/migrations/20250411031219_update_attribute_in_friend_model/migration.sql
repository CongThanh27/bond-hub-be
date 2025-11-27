/*
  Warnings:

  - You are about to drop the column `user_id_1` on the `friends` table. All the data in the column will be lost.
  - You are about to drop the column `user_id_2` on the `friends` table. All the data in the column will be lost.
  - Added the required column `receiver_id` to the `friends` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sender_id` to the `friends` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum: bổ sung các trạng thái QR cho tính năng giới thiệu bạn bè
-- Migration này thêm nhiều giá trị vào một enum.
-- Với PostgreSQL 11 trở xuống điều này không khả thi
-- trong một migration. Có thể xử lý bằng cách tạo
-- nhiều migration, mỗi migration chỉ thêm một giá trị vào
-- enum.


ALTER TYPE "QrCodeStatus" ADD VALUE 'FRIEND_REQUEST'; -- Trạng thái mới biểu diễn việc quét QR để kết bạn
ALTER TYPE "QrCodeStatus" ADD VALUE 'FRIEND_CONFIRMED'; -- Trạng thái khi mã QR kết bạn được chấp nhận

-- DropForeignKey: gỡ ràng buộc khóa ngoại tới user_id_1
ALTER TABLE "friends" DROP CONSTRAINT "friends_user_id_1_fkey"; -- Sẽ được thay bằng tham chiếu sender_id

-- DropForeignKey: gỡ ràng buộc khóa ngoại tới user_id_2
ALTER TABLE "friends" DROP CONSTRAINT "friends_user_id_2_fkey"; -- Sẽ được thay bằng tham chiếu receiver_id

-- AlterTable: đổi cấu trúc cặp bạn bè và bổ sung thông tin người giới thiệu
ALTER TABLE "friends" DROP COLUMN "user_id_1", -- Xóa cột người gửi cũ
DROP COLUMN "user_id_2", -- Xóa cột người nhận cũ
ADD COLUMN     "introduced_by" UUID, -- Trường tùy chọn mới ghi lại ai là người giới thiệu
ADD COLUMN     "receiver_id" UUID NOT NULL, -- Cột ID người nhận rõ ràng
ADD COLUMN     "sender_id" UUID NOT NULL; -- Cột ID người gửi rõ ràng

-- AddForeignKey: khôi phục khóa ngoại cho cột người gửi
ALTER TABLE "friends" ADD CONSTRAINT "friends_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Người gửi phải tồn tại

-- AddForeignKey: khôi phục khóa ngoại cho cột người nhận
ALTER TABLE "friends" ADD CONSTRAINT "friends_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Người nhận phải tồn tại
