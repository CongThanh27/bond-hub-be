-- AlterTable: thêm cột trỏ tới tin nhắn gốc được chuyển tiếp
ALTER TABLE "messages" ADD COLUMN     "forwarded_from" UUID; -- Khóa ngoại có thể NULL tham chiếu messages.message_id

-- AddForeignKey: đảm bảo forwarded_from trỏ tới một tin nhắn hợp lệ
ALTER TABLE "messages" ADD CONSTRAINT "messages_forwarded_from_fkey" FOREIGN KEY ("forwarded_from") REFERENCES "messages"("message_id") ON DELETE SET NULL ON UPDATE CASCADE; -- Đặt con trỏ về NULL nếu tin nhắn gốc bị xóa
