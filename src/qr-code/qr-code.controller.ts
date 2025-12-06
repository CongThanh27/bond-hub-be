// Ghi chú: Tệp controller định nghĩa các endpoint REST/WebSocket cho module Qr Code, nhận request và gọi service tương ứng.
// src/qr-code/qr-code.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Logger,
  Request,
} from '@nestjs/common';
import { QrCodeService } from './qr-code.service';
import { Public } from 'src/auth/public.decorator';
import { ScanFriendQrDto } from './dto/friend-qr.dto';

@Controller('qrcode')
export class QrCodeController {
  private readonly logger = new Logger('QrCodeController');

  constructor(private qrCodeService: QrCodeService) {}

  @Public()//PENDING: Cho phép truy cập công khai mà không cần xác thực.Tạo mã QR
  @Post('generate')
  async generateQrCode() {
    return this.qrCodeService.generateQrCode();
  }

  //Kiểm tra trạng thái mã QR. Kiểm tra trạng thái mã QR
// Web sẽ liên tục gọi API này (ví dụ 2 giây/lần) để hỏi Server: "Mã này đã được quét chưa? Đã được confirm chưa?".
// Dựa vào kết quả trả về (SCANNED, CONFIRMED, EXPIRED), Web sẽ chuyển hướng người dùng vào trang chủ hoặc báo lỗi.
  @Public()
  @Get('status/:qrToken')
  async getQrStatus(@Param('qrToken') qrToken: string) {
    return this.qrCodeService.getQrStatus(qrToken);
  }

  //Quét mã QR
// Quyền hạn: Bắt buộc đăng nhập (Không có @Public).

// Người gọi: Mobile App (người dùng đã đăng nhập trên điện thoại).

// Logic:

// Người dùng dùng app quét mã QR trên màn hình máy tính.

// App gửi qrToken và AccessToken (chứa userId) lên Server.

// Server cập nhật trạng thái QR thành SCANNED và liên kết nó với userId vừa gửi lên.

// Lúc này trên màn hình Web sẽ hiện: "Đã quét thành công, vui lòng bấm Xác nhận trên điện thoại".
  @Post('scan')
  async scanQrCode(@Body('qrToken') qrToken: string, @Request() req: Request) {
    this.logger.log(`Scanning QR code with token: ${qrToken}`);
    const userId = req['user'].sub;
    this.logger.log(`User ID from request: ${userId}`);
    return this.qrCodeService.scanQrCode(qrToken, userId);
  }

// Quyền hạn: Bắt buộc đăng nhập.

// Người gọi: Mobile App.

// Logic:

// Sau khi quét xong, App hiện nút "Đồng ý đăng nhập".

// Người dùng bấm nút -> App gọi API này.

// Server kiểm tra userId có khớp với người đã quét không.

// Cập nhật trạng thái thành CONFIRMED.

// Tạo Token mới cho Web Client. Web Client (đang gọi API getQrStatus) sẽ nhận được Token và tự động đăng nhập.
  @Post('confirm')
  async confirmQrCode(
    @Request() req: Request,
    @Body('qrToken') qrToken: string,
  ) {
    this.logger.log(`Confirming QR code with token: ${qrToken}`);
    const userId = req['user'].sub;
    this.logger.log(`User ID from request: ${userId}`);
    return this.qrCodeService.confirmQrCode(qrToken, userId);
  }
  // Mục đích: Người dùng bấm "Hủy" trên điện thoại hoặc bấm "Quay lại" trên Web để hủy bỏ mã QR hiện tại, làm nó hết hạn ngay lập tức.
  
  @Post('cancel')
  async cancelQrCode(@Body('qrToken') qrToken: string) {
    this.logger.log(`Cancelling QR code with token: ${qrToken}`);
    return this.qrCodeService.cancelQrCode(qrToken);
  }
}

// Tóm tắt Luồng Nghiệp vụ (Use Case: QR Login)

// Web (Public): Gọi generate -> Hiện QR. Gọi status liên tục để chờ.

// Mobile (Logged In): Gọi scan -> Web hiện "Đã quét".

// Mobile (Logged In): Gọi confirm -> Web nhận được Token -> Đăng nhập thành công.
