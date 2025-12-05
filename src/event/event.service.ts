import { Injectable, Logger } from '@nestjs/common';//Thư viện ghi nhật ký hệ thống chuẩn của NestJS.
import { EventEmitter2 } from '@nestjs/event-emitter';// Thư viện lõi dùng để quản lý việc bắn và lắng nghe sự kiện.

@Injectable() //Decorator đánh dấu class này là một Provider (để có thể inject vào nơi khác).
//@Injectable(): Cho phép NestJS quản lý EventService. Nhờ dòng này, bạn có thể dùng constructor(private eventService: EventService) trong các Controller khác.
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(public readonly eventEmitter: EventEmitter2) {}// public readonly eventEmitter: EventEmitter2: Đây là kỹ thuật Dependency Injection. Thay vì bạn tự new EventEmitter2(), NestJS sẽ tự động đưa (inject) instance đã cấu hình bên EventModule vào đây cho bạn dùng.

  /**
   * Emit a generic event Hàm Bắn sự kiện tổng quát (Generic)
   * @param event The event name Hàm Bắn sự kiện tổng quát (Generic)
   * @param data The event data Bất kỳ dữ liệu gì muốn gửi kèm.
   */
  emitEvent(event: string, data: any): void {
    this.logger.debug(`Emitting ${event}`);
    this.eventEmitter.emit(event, data);
  }

  // Group events
  emitGroupMemberAdded(
    groupId: string,// ID của nhóm được thêm vào.
    userId: string, //ID của người vừa được thêm.
    addedById: string, //ID của người thực hiện hành động thêm (để truy vết/audit).
  ): void {
    this.logger.debug(`Emitting group.member.added: ${groupId}, ${userId}`);
    this.eventEmitter.emit('group.member.added', {
      groupId,
      userId,
      addedById,
    });
  }

  emitGroupMemberRemoved(
    groupId: string,
    userId: string,
    removedById: string,
    options: { kicked?: boolean; left?: boolean } = {},
  ): void {
    this.logger.debug(`Emitting group.member.removed: ${groupId}, ${userId}`);
    this.eventEmitter.emit('group.member.removed', {
      groupId,
      userId,
      removedById,
      kicked: options.kicked,// true nếu bị kick, false nếu tự rời
      left: options.left,// true nếu tự rời, false nếu bị kick
    });
  }
//Dùng để báo cho client cập nhật lại UI khi tên nhóm thay đổi (data chứa tên mới) hoặc Avatar thay đổi (avatarUrl).
  emitGroupUpdated(groupId: string, data: any, updatedById: string): void {
    this.logger.debug(`Emitting group.updated: ${groupId}`);
    this.eventEmitter.emit('group.updated', { groupId, data, updatedById });
  }

  emitGroupAvatarUpdated(
    groupId: string,
    avatarUrl: string,
    updatedById: string,
  ): void {
    this.logger.debug(`Emitting group.avatar.updated: ${groupId}`);
    this.eventEmitter.emit('group.avatar.updated', {
      groupId,
      avatarUrl,
      updatedById,
    });
  }

  emitGroupRoleChanged(
    groupId: string,
    userId: string,// ID của người dùng bị thay đổi vai trò
    role: string,// Vai trò mới được gán cho người dùng
    updatedById: string,
  ): void {
    this.logger.debug(
      `Emitting group.role.changed: ${groupId}, ${userId}, ${role}`,
    );
    this.eventEmitter.emit('group.role.changed', {
      groupId,
      userId,
      role,
      updatedById,
    });
  }
//Giải tán nhóm, truyền danh sách thành viên để tránh truy vấn database sau khi nhóm đã bị xóa
  emitGroupDissolved(
    groupId: string,
    groupName: string,// Tên nhóm bị giải tán
    dissolvedById: string,// ID của người thực hiện hành động giải tán
    members: Array<{ userId: string }> = [],// Danh sách thành viên trong nhóm
  ): void {
    this.logger.debug(
      `Emitting group.dissolved: ${groupId} with ${members.length} members`,
    );
    this.eventEmitter.emit('group.dissolved', {
      groupId,
      groupName,
      dissolvedById,
      timestamp: new Date(),
      members, // Truyền danh sách thành viên để tránh truy vấn database sau khi nhóm đã bị xóa
    });
  }

  //Nhóm sự kiện Message (Tin nhắn)
  // 1 Hành động: Một user gửi tin nhắn mới trong API Controller.
  // 2 Service gọi Event: Service xử lý chat sẽ gọi:
  emitMessageCreated(message: any): void {
  //3 EventService: Log thông tin Debug -> Bắn sự kiện 'message.created' vào hệ thống qua EventEmitter2.
    this.logger.debug(`Emitting message.created: ${message.id}`);
    this.eventEmitter.emit('message.created', { message });
   //4  Listener: Ở một nơi khác (ví dụ NotificationService), sẽ có hàm lắng nghe
   //Luồng đi: Controller nhận tin nhắn -> Lưu DB -> Gọi hàm này -> Sự kiện bắn ra -> Socket Gateway bắt sự kiện -> Gửi xuống Client.
  }

  //Thông báo hành động "Thu hồi" hoặc "Đã xem". Chỉ cần messageId (tin nào) và userId (ai làm).
  emitMessageRecalled(messageId: string, userId: string): void {
    this.logger.debug(`Emitting message.recalled: ${messageId}`);
    this.eventEmitter.emit('message.recalled', { messageId, userId });
  }

  emitMessageRead(messageId: string, userId: string): void {
    this.logger.debug(`Emitting message.read: ${messageId}`);
    this.eventEmitter.emit('message.read', { messageId, userId });
  }

  // User events// Khi Socket kết nối hoặc ngắt kết nối, gọi hàm này để hệ thống cập nhật trạng thái "Sáng đèn/Tắt đèn" của user trên danh sách bạn bè.
  emitUserOnline(userId: string): void {
    this.logger.debug(`Emitting user.online: ${userId}`);
    this.eventEmitter.emit('user.online', { userId });
  }

  emitUserOffline(userId: string): void {
    this.logger.debug(`Emitting user.offline: ${userId}`);
    this.eventEmitter.emit('user.offline', { userId });
  }

  // Cuộc gọi - Phức tạp nhất
  emitCallIncoming(
    callId: string,// ID cuộc gọi
    initiatorId: string,// ID người khởi tạo cuộc gọi
    receiverId: string,// ID người nhận cuộc gọi
    type: string,// Loại cuộc gọi: audio/video
    roomId: string,// ID phòng ảo (thường dùng cho WebRTC hoặc Jitsi/Agora) nơi media được truyền tải.
    groupId?: string,// ID nhóm nếu cuộc gọi là nhóm
  ): void {
    this.logger.debug(`Emitting call.incoming: ${callId}`);
    this.eventEmitter.emit('call.incoming', {
      callId,
      initiatorId,
      receiverId,
      groupId,
      type,
      roomId,
    });
  }
//Khi người nhận cuộc gọi từ chối, gọi hàm này để thông báo cho người khởi tạo.
  emitCallRejected(
    callId: string,// ID cuộc gọi
    initiatorId: string,// ID người khởi tạo cuộc gọi
    receiverId: string,// ID người nhận cuộc gọi
    roomId: string,// ID phòng ảo nơi cuộc gọi diễn ra
  ): void {
    this.logger.debug(`Emitting call.rejected: ${callId}`);
    this.eventEmitter.emit('call.rejected', {
      callId,
      initiatorId,
      receiverId,
      roomId,
    });
  }
//Khi cuộc gọi kết thúc, gọi hàm này để thông báo cho tất cả người tham gia.
  emitCallEnded(
    callId: string,
    initiatorId: string,
    roomId: string,
    endedBy: string,// ID của người kết thúc cuộc gọi
  ): void {
    this.logger.debug(`Emitting call.ended: ${callId}`);
    this.eventEmitter.emit('call.ended', {
      callId,
      initiatorId,
      roomId,
      endedBy,
    });
  }
//Khi một người tham gia vào cuộc gọi, gọi hàm này để thông báo cho những người khác.
  emitCallParticipantJoined(
    callId: string,
    userId: string,// ID người tham gia mới
    roomId: string,// ID phòng ảo nơi cuộc gọi diễn ra
  ): void {
    this.logger.debug(`Emitting call.participant.joined: ${callId}, ${userId}`);
    this.eventEmitter.emit('call.participant.joined', {
      callId,
      userId,
      roomId,
    });
  }
//Khi một người tham gia rời cuộc gọi, gọi hàm này để thông báo cho những người còn lại.
  emitCallParticipantLeft(
    callId: string,
    userId: string,// ID người rời cuộc gọi
    roomId: string,
  ): void {
    this.logger.debug(`Emitting call.participant.left: ${callId}, ${userId}`);
    this.eventEmitter.emit('call.participant.left', {
      callId,
      userId,
      roomId,
    });
  }
}