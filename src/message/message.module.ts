import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { MessageGateway } from './message.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { EventModule } from '../event/event.module';
// MVC + Gateway
// Module: Dây dẫn, kết nối các thành phần.
// Gateway: Cổng giao tiếp thời gian thực (WebSocket).
// Controller: Cổng giao tiếp API (HTTP REST).
@Module({
  imports: [PrismaModule, StorageModule, EventModule],// Import các Module cần thiết. module Message sẽ tương tác chặt chẽ với hệ thống Event
  controllers: [MessageController],// Đăng ký Controller xử lý API
  providers: [MessageService, MessageGateway],// Đăng ký Service và Gateway
  exports: [MessageService],// Cho phép các Module khác dùng được MessageService
})
export class MessageModule {}