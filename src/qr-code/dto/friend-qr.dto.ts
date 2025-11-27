// Ghi chú: Định nghĩa DTO của module Qr Code để validate/transform dữ liệu request/response.
import { IsNotEmpty, IsUUID } from 'class-validator';

export class ScanFriendQrDto {
  @IsNotEmpty()
  qrToken: string;
}

export class GenerateFriendQrDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}
