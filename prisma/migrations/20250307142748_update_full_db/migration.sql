-- CreateEnum: định nghĩa các lựa chọn giới tính cho hồ sơ
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER'); -- Các giá trị cho user_infors.gender

-- CreateEnum: liệt kê các vai trò có trong nhóm
CREATE TYPE "GroupRole" AS ENUM ('LEADER', 'CO_LEADER', 'MEMBER'); -- Được sử dụng bởi group_members.role

-- CreateEnum: phân biệt mục ghim thuộc hội thoại nhóm hay cá nhân
CREATE TYPE "MessageType" AS ENUM ('GROUP', 'USER'); -- Được pinned_items.item_type tham chiếu

-- CreateEnum: mô tả loại thiết bị client cho refresh token
CREATE TYPE "DeviceType" AS ENUM ('MOBILE', 'TABLET', 'DESKTOP', 'OTHER'); -- Dữ liệu lưu tại refresh_tokens.device_type

-- CreateEnum: ghi nhận vòng đời của yêu cầu kết bạn
CREATE TYPE "FriendStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED'); -- Được sử dụng trên friends.status

-- CreateEnum: theo dõi trạng thái đăng nhập qua mã QR
CREATE TYPE "QrCodeStatus" AS ENUM ('PENDING', 'SCANNED', 'CONFIRMED', 'EXPIRED', 'CANCELLED'); -- Được sử dụng cho qr_codes.status

-- CreateEnum: định nghĩa các emoji phản ứng khả dụng cho bài viết
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'); -- Được sử dụng bởi post_reactions.reaction_type

-- CreateTable: bảng tài khoản lõi lưu thông tin xác thực
CREATE TABLE "users" ( -- Lưu thông tin đăng nhập và liên kết hồ sơ cấp cao
    "user_id" UUID NOT NULL, -- Khóa chính xác định từng người dùng
    "email" TEXT, -- Email đăng nhập tùy chọn
    "phoneNumber" TEXT, -- Số điện thoại đăng nhập tùy chọn
    "password_hash" TEXT NOT NULL, -- Hash mật khẩu được lưu an toàn
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm tài khoản được tạo
    "updated_at" TIMESTAMP(3) NOT NULL, -- Thời điểm cập nhật cuối cùng của tài khoản
    "info_id" UUID, -- Liên kết tùy chọn tới bản ghi hồ sơ mở rộng

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id") -- Đặt user_id làm khóa chính
); -- Kết thúc định nghĩa bảng users

-- CreateTable: lưu thông tin hồ sơ mở rộng, tách khỏi dữ liệu xác thực
CREATE TABLE "user_infors" ( -- Chứa các trường hồ sơ tùy chọn cho từng người dùng
    "info_id" UUID NOT NULL, -- Khóa chính đồng thời là định danh mà users.info_id tham chiếu
    "full_name" TEXT, -- Tên hiển thị của người dùng
    "date_of_birth" TIMESTAMP(3), -- Thông tin ngày sinh
    "gender" "Gender", -- Giá trị giới tính tham chiếu enum Gender
    "bio" TEXT, -- Đoạn giới thiệu ngắn
    "block_strangers" BOOLEAN NOT NULL DEFAULT false, -- Tùy chọn chặn tin nhắn từ người lạ
    "profile_picture_url" TEXT, -- Liên kết tới ảnh đại diện
    "status_message" TEXT, -- Dòng trạng thái tùy chỉnh
    "last_seen" TIMESTAMP(3), -- Thời điểm hoạt động/online gần nhất
    "cover_img_url" TEXT, -- Liên kết tới ảnh bìa/hình nền
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm tạo bản ghi hồ sơ này
    "updated_at" TIMESTAMP(3) NOT NULL, -- Thời điểm cập nhật cuối cùng của thông tin hồ sơ

    CONSTRAINT "user_infors_pkey" PRIMARY KEY ("info_id") -- info_id đóng vai trò khóa chính
); -- Kết thúc định nghĩa bảng user_infors

-- CreateTable: biểu diễn mối quan hệ bạn bè giữa hai người dùng
CREATE TABLE "friends" ( -- Lưu trạng thái cho từng quan hệ bạn bè
    "friendship_id" UUID NOT NULL, -- Khóa chính tham chiếu bản ghi quan hệ
    "user_id_1" UUID NOT NULL, -- Định danh của người khởi tạo hoặc người thứ nhất
    "user_id_2" UUID NOT NULL, -- Định danh của người thứ hai trong mối quan hệ
    "status" "FriendStatus" NOT NULL DEFAULT 'PENDING', -- Trạng thái lời mời kết bạn hiện tại
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm tạo lời mời kết bạn
    "updated_at" TIMESTAMP(3) NOT NULL, -- Lần gần nhất trạng thái bạn bè thay đổi

    CONSTRAINT "friends_pkey" PRIMARY KEY ("friendship_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng friends

-- CreateTable: lưu các tùy chọn và công tắc theo từng người dùng
CREATE TABLE "user_settings" ( -- Lưu các tùy chọn thông báo và giao diện
    "setting_id" UUID NOT NULL, -- Khóa chính của bản ghi thiết lập
    "user_id" UUID NOT NULL, -- Người dùng sở hữu các thiết lập này
    "notification_enabled" BOOLEAN NOT NULL DEFAULT true, -- Có bật gửi thông báo hay không
    "dark_mode" BOOLEAN NOT NULL DEFAULT false, -- Có bật giao diện tối hay không
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Lần cuối thay đổi thiết lập

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("setting_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng user_settings

-- CreateTable: lưu các bài viết trên dòng thời gian của người dùng
CREATE TABLE "posts" ( -- Lưu nội dung người dùng tạo cùng metadata
    "post_id" UUID NOT NULL, -- Khóa chính của bài viết
    "user_id" UUID NOT NULL, -- Người tạo nội dung reference
    "content" TEXT, -- Nội dung chữ của bài viết
    "media" JSONB, -- Metadata có cấu trúc mô tả media đính kèm
    "privacy_level" TEXT NOT NULL DEFAULT 'public', -- Quy định phạm vi ai có thể xem bài viết
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm tạo bài viết
    "updated_at" TIMESTAMP(3) NOT NULL, -- Thời điểm cập nhật cuối cùng khi chỉnh sửa

    CONSTRAINT "posts_pkey" PRIMARY KEY ("post_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng posts

-- CreateTable: lưu các story ngắn hạn
CREATE TABLE "stories" ( -- Stories tự động hết hạn sau TTL
    "story_id" UUID NOT NULL, -- Khóa chính cho từng story
    "user_id" UUID NOT NULL, -- Chủ sở hữu story
    "media_url" TEXT NOT NULL, -- Liên kết tới nội dung story đã tải lên
    "expires_at" TIMESTAMP(3) NOT NULL, -- Thời điểm story tự xóa
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm đăng story

    CONSTRAINT "stories_pkey" PRIMARY KEY ("story_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng stories

-- CreateTable: định nghĩa nhóm chat và metadata của chúng
CREATE TABLE "groups" ( -- Lưu các không gian trò chuyện chung
    "group_id" UUID NOT NULL, -- Khóa chính của nhóm
    "group_name" TEXT NOT NULL, -- Tên hiển thị của nhóm
    "creator_id" UUID NOT NULL, -- Người dùng tạo nhóm
    "avatar_url" TEXT, -- Ảnh đại diện nhóm (tùy chọn)
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm nhóm được tạo

    CONSTRAINT "groups_pkey" PRIMARY KEY ("group_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng groups

-- CreateTable: ánh xạ người dùng vào nhóm cùng vai trò được giao
CREATE TABLE "group_members" ( -- Mỗi dòng biểu diễn một thành viên trong nhóm
    "membership_id" UUID NOT NULL, -- Khóa chính của bản ghi thành viên
    "group_id" UUID NOT NULL, -- Nhóm mà người dùng thuộc về
    "user_id" UUID NOT NULL, -- Người dùng là thành viên của nhóm
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER', -- Mức quyền của thành viên
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm tham gia
    "added_by_id" UUID NOT NULL, -- Người dùng đã thêm thành viên này

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("membership_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng group_members

-- CreateTable: lưu metadata file đã tải lên lưu trữ đám mây
CREATE TABLE "cloud_storage" ( -- Theo dõi các file mà mỗi người dùng lưu
    "file_id" UUID NOT NULL, -- Khóa chính của bản ghi file
    "user_id" UUID NOT NULL, -- Chủ sở hữu file đã tải lên
    "file_name" TEXT NOT NULL, -- Tên file gốc dùng để hiển thị
    "file_url" TEXT NOT NULL, -- Đường dẫn/URL nơi lưu file
    "file_type" TEXT, -- Kiểu MIME hoặc loại logic tùy chọn
    "file_size" INTEGER, -- Kích thước tùy chọn (bytes)
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm file được tải lên

    CONSTRAINT "cloud_storage_pkey" PRIMARY KEY ("file_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng cloud_storage

-- CreateTable: quản lý các hội thoại/bài viết được ghim để truy cập nhanh
CREATE TABLE "pinned_items" ( -- Liên kết người dùng với mục được ghim
    "pinned_id" UUID NOT NULL, -- Khóa chính của bản ghi ghim
    "user_id" UUID NOT NULL, -- Chủ sở hữu mục ghim này
    "item_type" "MessageType" NOT NULL, -- Mục ghim thuộc hội thoại cá nhân hay nhóm
    "item_id" UUID NOT NULL, -- Định danh cuộc trò chuyện/mục được ghim
    "pinned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm ghim mục này

    CONSTRAINT "pinned_items_pkey" PRIMARY KEY ("pinned_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng pinned_items

-- CreateTable: lưu danh sách liên hệ tùy chỉnh của người dùng
CREATE TABLE "contacts" ( -- Lưu danh bạ mà người dùng đã thêm
    "contact_id" UUID NOT NULL, -- Khóa chính của mục danh bạ
    "user_id" UUID NOT NULL, -- Chủ sở hữu mục danh bạ này
    "contact_user_id" UUID NOT NULL, -- Người dùng đang được lưu vào danh bạ
    "nickname" TEXT, -- Biệt danh do người sở hữu đặt (tùy chọn)
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm thêm mục danh bạ

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("contact_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng contacts

-- CreateTable: lưu người dùng nào đã phản ứng với bài viết nào
CREATE TABLE "post_reactions" ( -- Ghi lại các phản ứng emoji trên mỗi bài viết
    "reaction_id" UUID NOT NULL, -- Khóa chính của bản ghi phản ứng
    "post_id" UUID NOT NULL, -- Bài viết nhận phản ứng
    "user_id" UUID NOT NULL, -- Người dùng thực hiện phản ứng
    "reaction_type" "ReactionType" NOT NULL, -- Loại phản ứng được chọn
    "reacted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm thực hiện phản ứng

    CONSTRAINT "post_reactions_pkey" PRIMARY KEY ("reaction_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng post_reactions

-- CreateTable: theo dõi các bài viết mà người dùng đã ẩn
CREATE TABLE "hidden_posts" ( -- Cho phép người dùng ẩn bài viết khỏi bảng tin của họ
    "hidden_post_id" UUID NOT NULL, -- Khóa chính của bản ghi ẩn
    "user_id" UUID NOT NULL, -- Người dùng đang ẩn bài viết
    "post_id" UUID NOT NULL, -- Bài viết đang bị ẩn
    "hidden_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm thao tác ẩn diễn ra

    CONSTRAINT "hidden_posts_pkey" PRIMARY KEY ("hidden_post_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng hidden_posts

-- CreateTable: lưu refresh token phục vụ quản lý phiên
CREATE TABLE "refresh_tokens" ( -- Hỗ trợ xác thực trên nhiều thiết bị
    "refresh_token_id" UUID NOT NULL, -- Khóa chính của bản ghi token
    "token" TEXT NOT NULL, -- Chuỗi refresh token thực tế
    "user_id" UUID NOT NULL, -- Người dùng sở hữu token
    "device_name" TEXT, -- Tên thiết bị dễ đọc cho con người
    "device_type" "DeviceType", -- Enum mô tả loại thiết bị
    "ip_address" TEXT, -- Địa chỉ IP cuối cùng của thiết bị
    "user_agent" TEXT, -- Chuỗi user-agent được ghi nhận
    "is_revoked" BOOLEAN NOT NULL DEFAULT false, -- Cờ dùng để vô hiệu token
    "expires_at" TIMESTAMP(3) NOT NULL, -- Thời điểm token hết hạn
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm phát hành token
    "updated_at" TIMESTAMP(3) NOT NULL, -- Thời điểm cập nhật gần nhất (e.g., revoked)

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("refresh_token_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng refresh_tokens

-- CreateTable: lưu token đăng nhập bằng QR và trạng thái của chúng
CREATE TABLE "qr_codes" ( -- Lưu các token tạm thời đã được thiết bị quét
    "qr_token_id" UUID NOT NULL, -- Khóa chính của bản ghi QR token
    "qr_token" TEXT NOT NULL, -- Chuỗi token được mã hóa trong QR
    "user_id" UUID, -- Người dùng tùy chọn gắn với phiên token
    "status" "QrCodeStatus" NOT NULL DEFAULT 'PENDING', -- Trạng thái xác thực QR hiện tại
    "expires_at" TIMESTAMP(3) NOT NULL, -- Thời điểm hết hạn để vô hiệu mã QR
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm mã QR được tạo
    "updated_at" TIMESTAMP(3) NOT NULL, -- Lần gần nhất trạng thái token thay đổi

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("qr_token_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng qr_codes

-- CreateTable: ghi log các thông báo gửi cho người dùng
CREATE TABLE "notifications" ( -- Lưu nội dung và trạng thái thông báo
    "notification_id" UUID NOT NULL, -- Khóa chính của bản ghi thông báo
    "user_id" UUID NOT NULL, -- Người nhận thông báo
    "notification_type" TEXT NOT NULL, -- Loại thông báo ở mức logic
    "notification_content" JSONB NOT NULL, -- Payload/nội dung có cấu trúc
    "is_read" BOOLEAN NOT NULL DEFAULT false, -- Thông báo đã được đọc hay chưa
    "reference_id" JSONB, -- Con trỏ tùy chọn tới các thực thể liên quan
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm tạo thông báo

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng notifications

-- CreateTable: lưu tất cả tin nhắn đã gửi trên nền tảng
CREATE TABLE "messages" ( -- Chứa cả tin nhắn cá nhân lẫn nhóm
    "message_id" UUID NOT NULL, -- Khóa chính cho từng tin nhắn
    "content" JSONB NOT NULL, -- Payload có cấu trúc cho text/media
    "sender_id" UUID NOT NULL, -- Người gửi tin nhắn
    "receiver_id" UUID, -- Người nhận tin nhắn trực tiếp (null nếu là tin nhóm)
    "group_id" UUID, -- Định danh cuộc trò chuyện nhóm (nếu có)
    "is_recalled" BOOLEAN NOT NULL DEFAULT false, -- Người gửi có thu hồi tin hay không
    "deleted_by" TEXT[], -- Theo dõi người dùng nào đã xóa tin nhắn tại client
    "replied_to" UUID, -- ID tin nhắn mà tin hiện tại trả lời
    "reactions" JSONB[], -- Danh sách phản ứng gắn với tin nhắn
    "read_by" TEXT[], -- Danh sách ID người dùng đã đọc tin nhắn
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Thời điểm tạo bản ghi
    "updated_at" TIMESTAMP(3) NOT NULL, -- Thời điểm cập nhật gần nhất
    "messageType" "MessageType" DEFAULT 'USER', -- Cho biết tin nhắn là cá nhân hay nhóm

    CONSTRAINT "messages_pkey" PRIMARY KEY ("message_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng messages

-- CreateTable: lưu các bình luận trên bài viết
CREATE TABLE "comments" ( -- Mỗi dòng là một bình luận của người dùng
    "comment_id" UUID NOT NULL, -- Định danh khóa chính
    "post_id" UUID NOT NULL, -- Bài viết chứa bình luận này
    "user_id" UUID NOT NULL, -- Người tạo nội dung
    "content" TEXT NOT NULL, -- Nội dung chữ của bình luận
    "replied_to" UUID, -- Bình luận được trả lời (tùy chọn)
    "reactions" JSONB[], -- Danh sách phản ứng trên bình luận

    CONSTRAINT "comments_pkey" PRIMARY KEY ("comment_id") -- Ràng buộc khóa chính
); -- Kết thúc định nghĩa bảng comments

-- CreateIndex: đảm bảo email người dùng là duy nhất
CREATE UNIQUE INDEX "users_email_key" ON "users"("email"); -- Đảm bảo không trùng email

-- CreateIndex: đảm bảo số điện thoại không trùng
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber"); -- Ngăn trùng số điện thoại đăng nhập

-- CreateIndex: ngăn phát sinh chuỗi refresh token trùng nhau
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token"); -- Mỗi token là duy nhất

-- CreateIndex: tăng tốc tra cứu token theo người dùng
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id"); -- Hỗ trợ truy vấn tất cả token của một người dùng

-- CreateIndex: ngăn trùng chuỗi QR token
CREATE UNIQUE INDEX "qr_codes_qr_token_key" ON "qr_codes"("qr_token"); -- Bảo đảm mỗi token là duy nhất

-- CreateIndex: tăng tốc truy vấn mã QR theo người dùng
CREATE INDEX "qr_codes_user_id_idx" ON "qr_codes"("user_id"); -- Cải thiện việc lọc theo user_id

-- AddForeignKey: user_infors.info_id tham chiếu users.user_id
ALTER TABLE "user_infors" ADD CONSTRAINT "user_infors_info_id_fkey" FOREIGN KEY ("info_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE; -- Xóa người dùng sẽ xóa luôn hồ sơ liên quan

-- AddForeignKey: liên kết người bạn thứ nhất với bản ghi người dùng
ALTER TABLE "friends" ADD CONSTRAINT "friends_user_id_1_fkey" FOREIGN KEY ("user_id_1") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Đảm bảo user_id_1 tồn tại

-- AddForeignKey: liên kết người bạn thứ hai với bản ghi người dùng
ALTER TABLE "friends" ADD CONSTRAINT "friends_user_id_2_fkey" FOREIGN KEY ("user_id_2") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Đảm bảo user_id_2 tồn tại

-- AddForeignKey: liên kết bản ghi cấu hình với người dùng sở hữu
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Không thể tồn tại thiết lập nếu thiếu người dùng

-- AddForeignKey: đảm bảo bài viết thuộc về một người dùng tồn tại
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Ngăn các bài viết mồ côi

-- AddForeignKey: câu chuyện phải gắn với người tạo
ALTER TABLE "stories" ADD CONSTRAINT "stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Story phải thuộc về người dùng hợp lệ

-- AddForeignKey: đảm bảo bản ghi thành viên trỏ tới một nhóm đang tồn tại
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Nhóm phải tồn tại trước khi thêm thành viên

-- AddForeignKey: liên kết thành viên với bản ghi người dùng tương ứng
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Thành viên phải là người dùng hợp lệ

-- AddForeignKey: lưu ai đã thêm thành viên này
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Người thêm thành viên phải tồn tại

-- AddForeignKey: đảm bảo file luôn tham chiếu người sở hữu
ALTER TABLE "cloud_storage" ADD CONSTRAINT "cloud_storage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Ngăn file không có chủ

-- AddForeignKey: mục ghim thuộc về một người dùng cụ thể
ALTER TABLE "pinned_items" ADD CONSTRAINT "pinned_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Đảm bảo người sở hữu mục ghim tồn tại

-- AddForeignKey: người sở hữu mục danh bạ phải là người dùng tồn tại
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Ngăn mục danh bạ mồ côi

-- AddForeignKey: người được lưu trong danh bạ cũng phải tồn tại trong bảng users
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_contact_user_id_fkey" FOREIGN KEY ("contact_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Đảm bảo danh bạ tham chiếu đúng người dùng

-- AddForeignKey: lượt cảm xúc phải trỏ tới bài viết hợp lệ
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Tránh để phản ứng không có bài viết tương ứng

-- AddForeignKey: người bày tỏ cảm xúc phải tồn tại
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Đảm bảo người bày tỏ cảm xúc hợp lệ

-- AddForeignKey: hidden_posts.user_id phải trỏ tới bảng users
ALTER TABLE "hidden_posts" ADD CONSTRAINT "hidden_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Ghi lại người dùng nào đã ẩn nội dung

-- AddForeignKey: bản ghi bài viết bị ẩn phải tham chiếu tới bài viết hợp lệ
ALTER TABLE "hidden_posts" ADD CONSTRAINT "hidden_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Đảm bảo bài viết tồn tại

-- AddForeignKey: gắn refresh token trực tiếp với người dùng và xóa theo chuỗi
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE; -- Xóa người dùng sẽ xóa luôn các token của họ

-- AddForeignKey: có thể gắn mã QR với bản ghi người dùng
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE; -- Khi xóa người dùng thì con trỏ được đặt NULL

-- AddForeignKey: thông báo phải thuộc về người dùng cụ thể
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Giữ toàn vẹn tham chiếu

-- AddForeignKey: người gửi phải tồn tại trong bảng users
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Ngăn trường hợp người gửi không tồn tại

-- AddForeignKey: người nhận tin nhắn riêng tham chiếu bảng users và sẽ về NULL khi người dùng bị xóa
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE; -- Sẽ về NULL nếu người nhận bị xóa

-- AddForeignKey: tin nhắn nhóm phải tham chiếu bảng groups
ALTER TABLE "messages" ADD CONSTRAINT "messages_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE SET NULL ON UPDATE CASCADE; -- Sẽ về NULL nếu nhóm bị xóa

-- AddForeignKey: bình luận phải liên kết tới một bài viết đang tồn tại
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Đảm bảo bài viết được tham chiếu vẫn còn

-- AddForeignKey: tác giả bình luận phải là một người dùng hợp lệ
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE; -- Bảo toàn thông tin tác giả
