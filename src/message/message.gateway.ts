// Import các decorator và interface WebSocket của NestJS
//Cổng giao tiếp thời gian thực
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  Inject,
  forwardRef,
} from '@nestjs/common';

import { MessageService } from './message.service';
import { EventService } from '../event/event.service';

// Interface cho tin nhắn với các trường cần thiết
type MessageData = {
  id: string;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  content: any;
  messageType?: 'USER' | 'GROUP';
  reactions?: any[];
  readBy?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any; // Cho phép các trường khác
};

@Injectable()
@WebSocketGateway({
  cors: {
    origin: true, // Sử dụng true thay vì '*' để tương thích với cài đặt CORS của ứng dụng
    credentials: true,
  },
  namespace: '/message',//Endpoint socket là ws://domain/message
  pingInterval: 30000, // 30 seconds. Gửi ping mỗi 30s để giữ kết nối. Nghĩa là nếu trong 30s không có dữ liệu gì gửi từ server, server sẽ gửi một gói ping để kiểm tra kết nối vẫn còn sống.
  pingTimeout: 30000, // 30 seconds. Nếu sau 30s không nhận được pong phản hồi từ client, server sẽ coi kết nối đã mất và đóng kết nối đó.
  transports: ['websocket', 'polling'], // Hỗ trợ cả WebSocket và polling để tăng độ tin cậy
  allowUpgrades: true, // Cho phép nâng cấp từ polling lên websocket
  connectTimeout: 60000, // Tăng thời gian timeout kết nối lên 60 giây
  maxHttpBufferSize: 1e8, // Tăng kích thước buffer cho các tin nhắn lớn (100MB)
})
export class MessageGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;// Đối tượng Socket.IO server

  private readonly logger = new Logger(MessageGateway.name); // Logger cho gateway
  private userSockets: Map<string, Set<Socket>> = new Map(); 
  //Một User có thể đăng nhập trên nhiều thiết bị (PC, Mobile). 
  // Map này lưu: UserId -> [SocketID_PC, SocketID_Mobile]
  //Khi User A nhận tin nhắn, hệ thống sẽ lặp qua cái Set này để gửi tin về cả điện thoại và Web.
  private socketToUser: Map<string, string> = new Map(); // Tra ngược socketId -> userId
  //Map ngược để tra nhanh: SocketID này thuộc về ai?
  private lastActivity: Map<string, number> = new Map(); // Theo dõi thời gian hoạt động cuối của socket. Ví dụ là string: socketId, number: timestamp
  private cleanupInterval: NodeJS.Timeout | null = null; // Interval dọn dẹp socket không hoạt động

  constructor(
    @Inject(forwardRef(() => MessageService))
    // forwardRef: Đây là kỹ thuật xử lý nâng cao. Vì MessageService gọi MessageGateway để bắn tin, 
    // và MessageGateway lại cần MessageService để lấy dữ liệu -> Vòng lặp vô tận. forwardRef giải quyết việc này.
    private readonly messageService?: MessageService,
    private readonly eventService?: EventService,
    //Trong constructor, Gateway đăng ký lắng nghe các sự kiện từ EventService (group.member.added, message.read...).
    //Đây là cầu nối giữa Logic nghiệp vụ và Real-time.
  ) {
    //on , emit, listener. Trong đó: on là đăng ký lắng nghe, emit là bắn sự kiện, listener là hàm xử lý khi sự kiện xảy ra.
    // Lắng nghe sự kiện từ EventService
    if (this.eventService) {
      this.eventService.eventEmitter.on(
        'group.member.added',// Khi có thành viên được thêm vào nhóm
        this.handleGroupMemberAdded.bind(this),
      );
      this.eventService.eventEmitter.on(
        'group.member.removed',// Khi có thành viên bị xóa khỏi nhóm
        this.handleGroupMemberRemoved.bind(this),
      );
      this.eventService.eventEmitter.on(
        'message.recalled',// Khi có tin nhắn bị thu hồi
        this.handleMessageRecalled.bind(this),
      );
      this.eventService.eventEmitter.on(
        'message.read',// Khi có tin nhắn được đánh dấu đã đọc
        this.handleMessageRead.bind(this),
      );
      this.eventService.eventEmitter.on(
        'group.dissolved',// Khi nhóm bị giải tán
        this.handleGroupDissolved.bind(this),
      );
    }
  }

  private async getUserFromSocket(client: Socket): Promise<string> {
    // Đơn giản hóa: lấy userId từ query parameter hoặc sử dụng một giá trị mặc định. 1. Lấy userId từ đối tượng handshake (bắt tay)
    const userId =
      (client.handshake.query.userId as string) || // Cách 1: Gửi qua URL ?userId=...
      (client.handshake.auth.userId as string); // // Cách 2: Gửi qua Auth Object (Thường dùng JWT ở đây)

    // Nếu có userId trong query hoặc auth, sử dụng nó
    if (userId) {
      return userId; // Trả về ngay nếu client cung cấp
    }

    // Nếu không có userId, tạo một ID ngẫu nhiên
    const randomId = Math.random().toString(36).substring(2, 15);
    this.logger.debug(
      `Generated random userId: ${randomId} for socket ${client.id}`,
    );
    return randomId; // Dùng ID tạm để vẫn cho phép kết nối
  }

  private addUserSocket(userId: string, socket: Socket) {// Khi một user kết nối, lưu socket vào map quản lý. Hàm này thực hiện đăng ký cư trú cho socket vào bộ nhớ Server.
    //userId: ID người dùng
    //socket: Đối tượng socket của kết nối hiện tại
    if (!this.userSockets.has(userId)) {// Nếu chưa có entry cho user này. 
      this.userSockets.set(userId, new Set()); // Tạo tập socket cho user nếu chưa có
    }
    this.userSockets.get(userId).add(socket); // Lưu socket mới
    this.socketToUser.set(socket.id, userId); // Map ngược socket -> user
    this.lastActivity.set(socket.id, Date.now()); // Ghi nhận thời gian hoạt động
    this.logger.debug(`User ${userId} connected with socket ${socket.id}`);
  }

  //Hàm Dọn dẹp Session
  private removeUserSocket(userId: string, socket: Socket) {// Hàm này chạy khi user mất kết nối (tắt tab, rớt mạng).
    const userSockets = this.userSockets.get(userId); // Lấy tập socket đang giữ cho user
    if (userSockets) {
      userSockets.delete(socket); // 2. Chỉ xóa đúng cái socket bị mất kết nối (giữ lại các socket khác ví dụ trên thiết bị khác)
      if (userSockets.size === 0) { // 3. Nếu user không còn socket nào nữa (Offline hoàn toàn)
        this.userSockets.delete(userId); 
      }
    }
    this.socketToUser.delete(socket.id); // Xóa map ngược
    this.lastActivity.delete(socket.id); // Xóa tracking hoạt động
    this.logger.debug(`Socket ${socket.id} for user ${userId} removed`);
  }

  //Quản lý Vòng đời & Tài nguyên đảm bảo server hoạt động bền bỉ, không bị Memory Leak (Rò rỉ bộ nhớ)
  //Chạy khi tắt Server hoặc Hot-reload
  onModuleDestroy() { // Khi module bị hủy
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval); // Dừng interval dọn dẹp
      this.cleanupInterval = null; // Tránh chạy lại
      this.logger.log('WebSocket Gateway cleanup interval cleared');
    }
  }

  //Chạy 1 lần sau khi khởi động Gateway
  afterInit(_server: Server) {
    this.logger.log('WebSocket Gateway initialized');

    // // Khởi tạo Interval: Cứ mỗi 60 giây (60000ms) sẽ chạy hàm cleanupInactiveSockets 1 lần
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSockets(); // Dọn socket idle
    }, 60000); // 1 minute
  }

  //Hai hàm handleConnection và handleDisconnect quản lý việc "Chào hỏi" và "Tạm biệt".
  async handleConnection(client: Socket) {// Khi có client kết nối. Client là socket của người kết nối
    try {
      // Ghi log thông tin kết nối
      this.logger.log(
        `Client connected: ${client.id}, transport: ${client.conn.transport.name}`,
      );

      const userId = await this.getUserFromSocket(client); // Lấy userId từ query/auth (hoặc random)
      // Không cần kiểm tra userId nữa vì luôn có giá trị

      this.addUserSocket(userId, client); // Lưu socket vào map phục vụ gửi/nhận

      // Logic Phòng (Room Strategy - Quan trọng):
      client.join(`user:${userId}`); //Tạo kênh riêng tư. Nghĩa là mỗi user sẽ có một "phòng" riêng để nhận tin nhắn cá nhân.

      //  Join các phòng nhóm mà user này tham gia
      //Thay vì đợi Client gửi request "cho tôi tham gia nhóm A, B, C", 
      //Server tự động tra Database (messageService.getUserGroups) và ép socket tham gia các phòng chat tương ứng.
      //Cơ chế tự động Join phòng giúp đảm bảo tính bảo mật (Client không thể join lụi vào nhóm mình không tham gia) và giảm độ trễ (User nhận tin nhắn nhóm ngay khi vừa mở app).
      if (this.messageService) {
        try {
          const userGroups = await this.messageService.getUserGroups(userId); // Lấy danh sách nhóm của user
          userGroups.forEach((groupId) => {
            client.join(`group:${groupId}`); // Join từng phòng nhóm
          });
        } catch (error) {
          this.logger.error(`Error joining group rooms: ${error.message}`);
        }
      }

      // Emit user online status
      this.server.emit('userStatus', { // Thông báo toàn hệ thống user online
        userId,
        status: 'online',
        timestamp: new Date(),
      });

      // Gửi thông báo kết nối thành công
      client.emit('connectionEstablished', { // Phản hồi cho chính client
        userId,
        socketId: client.id,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error in handleConnection: ${error.message}`);
      // Thử kết nối lại nếu có lỗi
      client.emit('connectionError', {
        message: 'Error establishing connection, please reconnect',
        timestamp: new Date(),
      });
    }
  }

  private cleanupInactiveSockets() {
    const now = Date.now();
    const inactivityThreshold = 5 * 60 * 1000; // Tăng lên 5 phút để giảm ngắt kết nối không cần thiết

    this.logger.debug(
      `Running socket cleanup, checking ${this.lastActivity.size} sockets`,
    );

    for (const [socketId, lastActive] of this.lastActivity.entries()) {
      if (now - lastActive > inactivityThreshold) { // Nếu socket idle quá lâu
        const userId = this.socketToUser.get(socketId); // Tìm user tương ứng
        if (userId) {
          this.logger.warn(
            `Socket ${socketId} for user ${userId} inactive for too long, disconnecting`,
          );

          // Find the socket instance
          const userSockets = this.userSockets.get(userId);// Lấy tất cả socket của user
          if (userSockets) {// Tìm đúng socket cần ngắt
            for (const socket of userSockets) {
              if (socket.id === socketId) {
                try {
                  // Gửi thông báo trước khi ngắt kết nối
                  socket.emit('connectionWarning', {
                    message: 'Connection inactive, will be disconnected soon',
                    timestamp: new Date(),
                  });
                  // Ngắt kết nối với lý do rõ ràng
                  socket.disconnect(true); // Buộc đóng socket
                } catch (error) {
                  this.logger.error(
                    `Error disconnecting socket ${socketId}: ${error.message}`,
                  );
                }
                break;
              }
            }
          }
        }
      }
    }
  }

  handleDisconnect(client: Socket) {// Khi client ngắt kết nối
    try {
      this.getUserFromSocket(client)// Lấy userId từ socket
        .then((userId) => {
          this.removeUserSocket(userId, client); // Xóa socket khỏi map quản lý

          // If no more sockets for this user, emit offline status
          if (!this.userSockets.has(userId)) { // Khi user không còn socket nào
            this.server.emit('userStatus', { // Thông báo user offline
              userId,
              status: 'offline',
              timestamp: new Date(),
            });
          }

          // Ghi log thông tin ngắt kết nối
          this.logger.log(
            `Client disconnected: ${client.id}, transport: ${client.conn.transport.name}, reason: ${client.conn.transport.readyState}`,
          );
        })
        .catch((error) => {
          this.logger.error(`Error in handleDisconnect: ${error.message}`);
        });
    } catch (error) {
      this.logger.error(
        `Unexpected error in handleDisconnect: ${error.message}`,
      );
    }
  }

  @SubscribeMessage('heartbeat')// Xử lý sự kiện heartbeat, nghe emit từ client thay vì emit từ server cho client 
  //Đây là hàm user gọi lên để nói "Tôi vẫn còn sống". Nó cập nhật lại lastActivity, giúp socket tránh bị hàm cleanupInactiveSockets ở trên "quét" trúng.
  handleHeartbeat(@ConnectedSocket() client: Socket) {
    try {
      const socketId = client.id;
      this.lastActivity.set(socketId, Date.now()); // Cập nhật hoạt động cuối
      return { status: 'ok', timestamp: Date.now() }; // Phản hồi ngay cho client
    } catch (error) {
      this.logger.error(`Error in heartbeat: ${error.message}`);
      return { status: 'error', message: error.message, timestamp: Date.now() };
    }
  }

  /**
   * Phát sự kiện tin nhắn mới đến người dùng
   * @param message Tin nhắn đã được lưu vào database
   */
  notifyNewUserMessage(message: MessageData) {
    // Đảm bảo tin nhắn có đầy đủ thông tin để phân biệt
    const messageWithType = {
      ...message, // Clone giữ nguyên trường gốc
      messageType: 'USER', // Đảm bảo trường messageType luôn được đặt
      //Code chủ động gắn thêm tag messageType trước khi gửi. 
      //Giúp Frontend dễ dàng phân loại hiển thị (ví dụ: Tin nhắn nhóm hiện Avatar người gửi, tin nhắn riêng thì không cần).
    };

    const eventData = {
      type: 'user',
      message: messageWithType,
      timestamp: new Date(),
      isUserMessage: true, // Thêm trường để phân biệt rõ ràng hơn
    };

    if (this.server) {// Chỉ gửi nếu server đã khởi tạo
      try {
        this.logger.debug(`[Message Event] Sending user message:`, {
          messageId: message.id,
          senderId: message.senderId,// Ai gửi
          receiverId: message.receiverId,
          content: message.content,
          timestamp: eventData.timestamp,
        });

        // Phát sự kiện đến người gửi
        this.server
          .to(`user:${message.senderId}`)// Gửi về phòng cá nhân sender
          .emit('newMessage', eventData); // phát tin nhắn mới
        this.logger.debug(
          `[Message Event] Message sent to sender: ${message.senderId}`,
        );

        // Phát sự kiện đến người nhận
        if (message.receiverId) {
          this.server
            .to(`user:${message.receiverId}`)
            .emit('newMessage', eventData); // Gửi về phòng cá nhân receiver
          this.logger.debug(
            `[Message Event] Message sent to receiver: ${message.receiverId}`,
          );

          // Phát sự kiện dừng nhập
          this.server
            .to(`user:${message.receiverId}`)
            .emit('userTypingStopped', { // Thông báo dừng gõ
              userId: message.senderId,
              timestamp: new Date(),
            });
          this.logger.debug(
            `[Message Event] Typing stopped notification sent to: ${message.receiverId}`,
          );
        }
      } catch (error) {
        this.logger.error(`[Message Event] Error sending user message event:`, {
          error: error.message,
          messageId: message.id,
          senderId: message.senderId,
          receiverId: message.receiverId,
        });
      }
    } else {
      this.logger.warn(
        '[Message Event] Socket.IO server not initialized yet, cannot send user message',
        { messageId: message.id },
      );
    }
  }

  /**
   * Phát sự kiện tin nhắn mới đến nhóm
   * @param message Tin nhắn đã được lưu vào database
   */
  notifyNewGroupMessage(message: MessageData) {
    // Đảm bảo tin nhắn có đầy đủ thông tin để phân biệt
    const messageWithType = {
      ...message,
      messageType: 'GROUP', // Đảm bảo trường messageType luôn được đặt
    };

    const eventData = {
      type: 'group', // Đánh dấu rõ ràng là tin nhắn nhóm
      message: messageWithType,
      timestamp: new Date(),
      isGroupMessage: true, // Thêm trường để phân biệt rõ ràng hơn
    };

    // Phát sự kiện đến phòng nhóm
    if (message.groupId && this.server) {
      try {
        this.logger.debug(`[Message Event] Sending group message:`, {
          messageId: message.id,
          senderId: message.senderId,
          groupId: message.groupId,
          content: message.content,
          timestamp: eventData.timestamp,
        });

        this.server
          .to(`group:${message.groupId}`)// Gửi về phòng nhóm
          .emit('newMessage', eventData); // Broadcast tới room group:<id>
        this.logger.debug(
          `[Message Event] Message sent to group: ${message.groupId}`,
        );

        // Phát sự kiện dừng nhập
        this.server.to(`group:${message.groupId}`).emit('userTypingStopped', {
          userId: message.senderId,
          groupId: message.groupId,
          timestamp: new Date(),
        });
        this.logger.debug(
          `[Message Event] Typing stopped notification sent to group: ${message.groupId}`,
        );
      } catch (error) {
        this.logger.error(
          `[Message Event] Error sending group message event:`,
          {
            error: error.message,
            messageId: message.id,
            senderId: message.senderId,
            groupId: message.groupId,
          },
        );
      }
    } else {
      this.logger.warn(
        '[Message Event] Socket.IO server not initialized yet, cannot send group message',
        { messageId: message.id, groupId: message.groupId },
      );
    }
  }

  /**
   * Phát sự kiện đã đọc tin nhắn
   * @param message Tin nhắn đã được cập nhật trạng thái đọc
   * @param userId ID của người đọc
   */
  notifyMessageRead(message: MessageData, userId: string) {
    try {
      const readEvent = {
        messageId: message.id,
        readBy: message.readBy,
        userId,
        timestamp: new Date(),
      };

      // Đối với tin nhắn cá nhân
      if (message.messageType === 'USER') {
        try {
          this.server
            .to(`user:${message.senderId}`)
            .emit('messageRead', readEvent); // Báo cho người gửi
        } catch (error) {
          this.logger.error(
            `Error notifying sender ${message.senderId}: ${error.message}`,
          );
        }

        try {
          this.server
            .to(`user:${message.receiverId}`)
            .emit('messageRead', readEvent); // Báo cho người nhận
        } catch (error) {
          this.logger.error(
            `Error notifying receiver ${message.receiverId}: ${error.message}`,
          );
        }
      }
      // Đối với tin nhắn nhóm
      else if (message.messageType === 'GROUP') {
        try {
          if (this.server) {
            this.server
              .to(`group:${message.groupId}`)
              .emit('messageRead', readEvent); // Báo cho toàn bộ thành viên nhóm
          } else {
            this.logger.warn(
              `Socket.IO server not initialized yet, cannot notify group ${message.groupId} about message read`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error notifying group ${message.groupId}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error in notifyMessageRead: ${error.message}`);
    }
  }

  /**
   * Phát sự kiện thu hồi tin nhắn
   * @param message Tin nhắn đã được thu hồi
   * @param userId ID của người thu hồi
   */
  notifyMessageRecalled(message: MessageData, userId: string) {
    const recallEvent = {
      messageId: message.id,
      userId,
      timestamp: new Date(),
    };

    if (this.server) {
      try {
        // Đối với tin nhắn cá nhân
        if (message.messageType === 'USER') {
          this.server
            .to(`user:${message.senderId}`)
            .emit('messageRecalled', recallEvent); // Báo cho người gửi
          this.server
            .to(`user:${message.receiverId}`)
            .emit('messageRecalled', recallEvent); // Báo cho người nhận
        }
        // Đối với tin nhắn nhóm
        else if (message.messageType === 'GROUP') {
          this.server
            .to(`group:${message.groupId}`)
            .emit('messageRecalled', recallEvent); // Broadcast tới cả nhóm
        }
      } catch (error) {
        this.logger.error(
          `Error sending message recall event: ${error.message}`,
        );
      }
    } else {
      this.logger.warn(
        'Socket.IO server not initialized yet, cannot send message recall event',
      );
    }
  }

  /**
   * Phát sự kiện cập nhật phản ứng tin nhắn
   * @param message Tin nhắn đã được cập nhật phản ứng
   * @param userId ID của người thêm/xóa phản ứng
   */
  notifyMessageReactionUpdated(message: MessageData, userId: string) {
    const reactionEvent = {
      messageId: message.id,
      reactions: message.reactions,
      userId,
      timestamp: new Date(),
    };

    if (this.server) {
      try {
        // Đối với tin nhắn cá nhân
        if (message.messageType === 'USER') {
          this.server
            .to(`user:${message.senderId}`)
            .emit('messageReactionUpdated', reactionEvent); // Báo cho người gửi
          this.server
            .to(`user:${message.receiverId}`)
            .emit('messageReactionUpdated', reactionEvent); // Báo cho người nhận
        }
        // Đối với tin nhắn nhóm
        else if (message.messageType === 'GROUP') {
          this.server
            .to(`group:${message.groupId}`)
            .emit('messageReactionUpdated', reactionEvent); // Broadcast tới nhóm
        }
      } catch (error) {
        this.logger.error(
          `Error sending message reaction update event: ${error.message}`,
        );
      }
    } else {
      this.logger.warn(
        'Socket.IO server not initialized yet, cannot send message reaction update event',
      );
    }
  }

  /**
   * Phát sự kiện xóa tin nhắn (phía người dùng)
   * @param message Tin nhắn đã bị xóa
   * @param userId ID của người xóa tin nhắn
   */
  notifyMessageDeleted(message: MessageData, userId: string) {
    const deleteEvent = {
      messageId: message.id,
      userId,
      deletedBy: message.deletedBy,
      timestamp: new Date(),
    };

    if (this.server) {
      try {
        // Chỉ thông báo cho người xóa tin nhắn
        this.server.to(`user:${userId}`).emit('messageDeleted', deleteEvent); // Không broadcast rộng
      } catch (error) {
        this.logger.error(
          `Error sending message deleted event: ${error.message}`,
        );
      }
    } else {
      this.logger.warn(
        'Socket.IO server not initialized yet, cannot send message deleted event',
      );
    }
  }

  // Xử lý sự kiện gõ chữ
  @SubscribeMessage('typing')// Khi client gửi sự kiện 'typing'. Nghĩa là client báo "Tôi đang gõ"
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId?: string; groupId?: string },
  ) {
    // 1. Xác thực người gửi
    const userId = await this.getUserFromSocket(client); // Xác định ai đang gõ

    // Update last activity
    this.lastActivity.set(client.id, Date.now()); // Chống timeout
    // -> Dòng này cực quan trọng: Nếu user đang gõ hăng say nhưng không gửi tin nhắn nào, 
  // hệ thống dọn rác (cleanupInactiveSockets) có thể hiểu lầm là họ đang treo máy. 
  // Dòng này báo cho server: "Tôi vẫn đang hoạt động, đừng disconnect tôi".

    const typingEvent = {
      userId,// Ai đang gõ
      timestamp: new Date(),
    };

    if (data.receiverId) {
      this.server.to(`user:${data.receiverId}`).emit('userTyping', { // Tin nhắn cá nhân
        ...typingEvent,
        receiverId: data.receiverId,
      });
    } else if (data.groupId) {
      this.server.to(`group:${data.groupId}`).emit('userTyping', { // Tin nhắn nhóm
        ...typingEvent,
        groupId: data.groupId,
      });
    }
  }

  @SubscribeMessage('getUserStatus')//Nghĩa là client hỏi "Tôi muốn biết trạng thái online/offline của những user này"
  async handleGetUserStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userIds: string[] },
  ) {
    // Update last activity
    this.lastActivity.set(client.id, Date.now()); // Ghi nhận client vẫn sống

    try {
      const statusMap = {}; // Kết quả trả về client

      for (const userId of data.userIds) {
        const isOnline =
          this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
        statusMap[userId] = {
          userId,
          status: isOnline ? 'online' : 'offline',
          timestamp: Date.now(),
        };
      }

      return statusMap;
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('stopTyping')// Khi client gửi sự kiện 'stopTyping'. Nghĩa là client báo "Tôi đã gõ xong"
  async handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId?: string; groupId?: string },
  ) {
    const userId = await this.getUserFromSocket(client); // Người dừng gõ

    // Update last activity
    this.lastActivity.set(client.id, Date.now()); // Chống timeout

    const typingEvent = {
      userId,
      timestamp: new Date(),
    };

    if (data.receiverId) {
      this.server.to(`user:${data.receiverId}`).emit('userTypingStopped', { // Chat cá nhân
        ...typingEvent,
        receiverId: data.receiverId,
      });
    } else if (data.groupId) {
      this.server.to(`group:${data.groupId}`).emit('userTypingStopped', { // Chat nhóm
        ...typingEvent,
        groupId: data.groupId,
      });
    }
  }

  /**
   * Phát sự kiện tin nhắn có media
   * @param message Tin nhắn có media đã được lưu vào database
   */
  notifyMessageWithMedia(message: MessageData) {
    // Phát sự kiện dựa trên loại tin nhắn
    if (message.messageType === 'USER') {
      // Đối với tin nhắn cá nhân, phát đến cả người gửi và người nhận
      this.server.to(`user:${message.senderId}`).emit('newMessage', {
        type: 'user',
        message,
        timestamp: new Date(),
      });

      if (message.receiverId) {
        this.server.to(`user:${message.receiverId}`).emit('newMessage', {
          type: 'user',
          message,
          timestamp: new Date(), // Gửi kèm thời gian gửi sự kiện
        });
      }
    } else if (message.messageType === 'GROUP' && message.groupId) {
      // Đối với tin nhắn nhóm, phát đến phòng nhóm
      // Đảm bảo tin nhắn có đầy đủ thông tin để phân biệt
      const messageWithType = {
        ...message,
        messageType: 'GROUP', // Đảm bảo trường messageType luôn được đặt
      };

      if (this.server) {
        try {
          this.server.to(`group:${message.groupId}`).emit('newMessage', {
            type: 'group',
            message: messageWithType,
            timestamp: new Date(),
            isGroupMessage: true, // Đánh dấu rõ ràng đây là tin nhắn nhóm
          });
        } catch (error) {
          this.logger.error(
            `Error sending group message with media event: ${error.message}`,
          );
        }
      } else {
        this.logger.warn(
          'Socket.IO server not initialized yet, cannot send group message with media',
        );
      }
    }
  }

  /**
   * Xử lý sự kiện thêm thành viên vào nhóm
   * @param payload Dữ liệu sự kiện
   */
  private async handleGroupMemberAdded(payload: {
    groupId: string;
    userId: string;
    addedById: string;
  }): Promise<void> {
    const { groupId, userId, addedById } = payload;
    this.logger.debug(
      `Handling group.member.added event: ${groupId}, ${userId}`,
    );

    // Tìm tất cả socket của người dùng và thêm vào phòng nhóm
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      for (const socket of userSockets) {
        socket.join(`group:${groupId}`); // Cho từng socket join phòng group
      }
      this.logger.debug(
        `User ${userId} joined group room ${groupId} via event`,
      );

      // Thông báo cho người dùng cập nhật danh sách nhóm của họ
      if (this.server) {
        try {
          this.server.to(`user:${userId}`).emit('updateGroupList', {
            action: 'added_to_group',
            groupId,
            addedById,
            timestamp: new Date(),
          });
        } catch (error) {
          this.logger.error(
            `Error sending updateGroupList event: ${error.message}`,
          );

          // Fallback: gửi trực tiếp đến các socket của người dùng
          for (const socket of userSockets) {
            try {
              socket.emit('updateGroupList', {
                action: 'added_to_group',
                groupId,
                addedById,
                timestamp: new Date(),
              });
            } catch (socketError) {
              this.logger.error(
                `Error sending direct socket event: ${socketError.message}`,
              );
            }
          }
        }
      } else {
        this.logger.warn(
          'Socket.IO server not initialized yet, sending direct to sockets',
        );

        // Fallback: gửi trực tiếp đến các socket của người dùng
        for (const socket of userSockets) {
          try {
            socket.emit('updateGroupList', {
              action: 'added_to_group',
              groupId,
              addedById,
              timestamp: new Date(),
            });
          } catch (socketError) {
            this.logger.error(
              `Error sending direct socket event: ${socketError.message}`,
            );
          }
        }
      }
    }

    // Nếu người dùng không có socket nào đang kết nối, họ sẽ nhận được thông báo khi kết nối lại
    // và sẽ tự động tham gia vào các phòng nhóm thông qua handleConnection
  }

  /**
   * Xử lý sự kiện xóa thành viên khỏi nhóm
   * @param payload Dữ liệu sự kiện
   */
  private handleGroupMemberRemoved(payload: {
    groupId: string;
    userId: string;
    removedById: string;
    kicked?: boolean;
    left?: boolean;
  }): void {
    const { groupId, userId, removedById, kicked, left } = payload;
    this.logger.debug(
      `Handling group.member.removed event: ${groupId}, ${userId}`,
    );

    // Tìm tất cả socket của người dùng và xóa khỏi phòng nhóm
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      for (const socket of userSockets) {
        socket.leave(`group:${groupId}`); // Rời phòng group trên từng socket
      }
      this.logger.debug(`User ${userId} left group room ${groupId} via event`);

      // Thông báo cho người dùng cập nhật danh sách nhóm của họ
      if (this.server) {
        try {
          this.server.to(`user:${userId}`).emit('updateGroupList', {// phát cho client cập nhật danh sách nhóm
            action: 'removed_from_group',
            groupId,
            removedById,
            kicked,
            left,
            timestamp: new Date(),
          });
        } catch (error) {
          this.logger.error(
            `Error sending updateGroupList event: ${error.message}`,
          );

          // Fallback: gửi trực tiếp đến các socket của người dùng
          for (const socket of userSockets) {
            try {
              socket.emit('updateGroupList', {
                action: 'removed_from_group',
                groupId,
                removedById,
                kicked,
                left,
                timestamp: new Date(),
              });
            } catch (socketError) {
              this.logger.error(
                `Error sending direct socket event: ${socketError.message}`,
              );
            }
          }
        }
      }
    }
  }

  /**
   * Xử lý sự kiện thu hồi tin nhắn
   * @param payload Dữ liệu sự kiện
   */
  private handleMessageRecalled(payload: {
    messageId: string;
    userId: string;
  }): void {
    const { messageId, userId } = payload;
    this.logger.debug(`Handling message.recalled event: ${messageId}`);

    // Lấy thông tin tin nhắn từ database
    if (this.messageService) {
      this.messageService.findMessageById(messageId).then((message) => {
        if (message) {
          this.notifyMessageRecalled(message, userId); // Phát sự kiện recall tới các socket liên quan
        }
      });
    }
  }

  /**
   * Xử lý sự kiện đọc tin nhắn
   * @param payload Dữ liệu sự kiện
   */
  private handleMessageRead(payload: {
    messageId: string;
    userId: string;
  }): void {
    const { messageId, userId } = payload;
    this.logger.debug(`Handling message.read event: ${messageId}`);

    try {
      // Lấy thông tin tin nhắn từ database
      if (this.messageService) {
        this.messageService
          .findMessageById(messageId)
          .then((message) => {
            if (message) {
              this.notifyMessageRead(message, userId);
            }
          })
          .catch((error) => {
            this.logger.error(
              `Error finding message ${messageId}: ${error.message}`,
            );
          });
      }
    } catch (error) {
      this.logger.error(`Error in handleMessageRead: ${error.message}`);
    }
  }

  /**
   * Xử lý sự kiện giải tán nhóm
   * @param payload Dữ liệu sự kiện
   */
  private handleGroupDissolved(payload: {
    groupId: string;
    groupName: string;
    dissolvedById: string;
    timestamp: Date;
    members?: Array<{ userId: string }>;
  }): void {
    const { groupId, groupName, dissolvedById, timestamp, members } = payload;
    this.logger.debug(`Handling group.dissolved event: ${groupId}`);

    // Xóa phòng nhóm khỏi socket.io
    const roomName = `group:${groupId}`;

    if (this.server) {
      try {
        this.server.in(roomName).socketsLeave(roomName); // Đẩy toàn bộ socket ra khỏi phòng
      } catch (error) {
        this.logger.error(
          `Error removing sockets from room ${roomName}: ${error.message}`,
        );
      }
    } else {
      this.logger.warn(
        `Socket.IO server not initialized yet, cannot remove sockets from room ${roomName}`,
      );
    }

    // Thông báo cho tất cả người dùng trong phòng cập nhật danh sách cuộc trò chuyện
    if (members && members.length > 0) {
      // Sử dụng danh sách thành viên từ payload
      for (const member of members) {
        // Không thông báo cho người giải tán
        if (member.userId !== dissolvedById) {
          if (this.server) {
            try {
              this.server
                .to(`user:${member.userId}`)
                .emit('updateConversationList', { // Báo client cập nhật danh sách chat
                  action: 'group_dissolved',
                  groupId,
                  groupName,
                  timestamp: timestamp || new Date(),
                });
            } catch (error) {
              this.logger.error(
                `Error sending updateConversationList event to user ${member.userId}: ${error.message}`,
              );
            }
          } else {
            this.logger.warn(
              `Socket.IO server not initialized yet, cannot notify user ${member.userId} about group dissolution`,
            );
          }
        }
      }
    }

    this.logger.debug(
      `All sockets removed from room ${roomName} and notifications sent`,
    );
  }
}
