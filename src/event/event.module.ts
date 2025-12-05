import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventService } from './event.service';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,        // Cho phép dùng ký tự đại diện (ví dụ: 'group.*' để lắng nghe mọi sự kiện về group)
      delimiter: '.',        // Dùng dấu chấm để phân cấp namespace (ví dụ: 'group.created')
      maxListeners: 20,      // Giới hạn số lượng listener tối đa cho 1 sự kiện để tránh rò rỉ bộ nhớ
      verboseMemoryLeak: true, // Cảnh báo log nếu vượt quá giới hạn listener
    }),
  ],
  providers: [EventService], // Đăng ký EventService để có thể inject vào nơi khác
  exports: [EventService],   // Cho phép các Module khác dùng được EventService
})
export class EventModule {}