-- CreateEnum: phân loại cuộc gọi thành audio hoặc video
CREATE TYPE "CallType" AS ENUM ('AUDIO', 'VIDEO'); -- Được sử dụng bởi calls.type

-- CreateEnum: theo dõi vòng đời của cuộc gọi
CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ONGOING', 'ENDED', 'MISSED', 'REJECTED'); -- Được sử dụng bởi calls.status

-- CreateTable: lưu metadata cho từng cuộc gọi thoại/video
CREATE TABLE "calls" ( -- Biểu diễn một phiên gọi duy nhất
    "call_id" UUID NOT NULL, -- Khóa chính của bản ghi cuộc gọi
    "initiator_id" UUID NOT NULL, -- Người bắt đầu cuộc gọi
    "group_id" UUID, -- Nhóm mà cuộc gọi thuộc về (null nếu gọi 1-1)
    "type" "CallType" NOT NULL DEFAULT 'AUDIO', -- Kiểu cuộc gọi (audio hoặc video)
    "status" "CallStatus" NOT NULL DEFAULT 'RINGING', -- Trạng thái cuộc gọi hiện tại
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm cuộc gọi bắt đầu
    "ended_at" TIMESTAMP(3), -- Thời điểm cuộc gọi kết thúc (nếu có)
    "duration_seconds" INTEGER, -- Thời lượng tính bằng giây, phục vụ phân tích
    "room_id" TEXT NOT NULL, -- Định danh phòng tín hiệu/phiên gọi

    CONSTRAINT "calls_pkey" PRIMARY KEY ("call_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng calls

-- CreateTable: ánh xạ người dùng đã tham gia cuộc gọi và mốc thời gian của họ
CREATE TABLE "call_participants" ( -- Mỗi dòng theo dõi một người dùng trong phiên gọi
    "participant_id" UUID NOT NULL, -- Khóa chính của bản ghi người tham gia
    "call_id" UUID NOT NULL, -- Tham chiếu tới phiên gọi
    "user_id" UUID NOT NULL, -- Người dùng tham gia cuộc gọi
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm người dùng tham gia
    "left_at" TIMESTAMP(3), -- Thời điểm người dùng rời đi (null nếu vẫn còn)
    "status" TEXT NOT NULL DEFAULT 'connected', -- Trạng thái hiện tại của người tham gia (đang kết nối, rời, ...)

    CONSTRAINT "call_participants_pkey" PRIMARY KEY ("participant_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng call_participants

-- CreateIndex: đảm bảo mỗi room_id cuộc gọi là duy nhất
CREATE UNIQUE INDEX "calls_room_id_key" ON "calls"("room_id"); -- Ngăn việc tái sử dụng room tín hiệu

-- CreateIndex: ngăn cùng một người dùng tham gia hai lần vào một cuộc gọi
CREATE UNIQUE INDEX "call_participants_call_id_user_id_key" ON "call_participants"("call_id", "user_id"); -- Mỗi người tham gia chỉ xuất hiện một lần trong cuộc gọi

-- AddForeignKey: người khởi tạo cuộc gọi phải là người dùng tồn tại
ALTER TABLE "calls" ADD CONSTRAINT "calls_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Người khởi tạo phải tồn tại

-- AddForeignKey: có thể liên kết cuộc gọi với một nhóm
ALTER TABLE "calls" ADD CONSTRAINT "calls_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE SET NULL ON UPDATE CASCADE; -- Đặt về NULL nếu nhóm bị xóa

-- AddForeignKey: người tham gia phải thuộc về một cuộc gọi có thật
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("call_id") ON DELETE CASCADE ON UPDATE CASCADE; -- Xóa cuộc gọi sẽ xóa luôn người tham gia

-- AddForeignKey: đảm bảo người tham gia cuộc gọi thuộc về người dùng hợp lệ
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Người dùng phải tồn tại mới được tham gia
