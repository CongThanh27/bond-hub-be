import { PrismaClient, Gender, FriendStatus, DeviceType } from '@prisma/client'; // Import Prisma và các enum cần dùng
import { hash } from 'bcrypt'; // Sử dụng bcrypt để mã hóa mật khẩu mẫu

const prisma = new PrismaClient(); // Khởi tạo Prisma Client dùng chung cho toàn file

// xóa dữ liệu hiện có
async function deleteAllData() {
  await prisma.userSetting.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.postReaction.deleteMany({});
  await prisma.hiddenPost.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.story.deleteMany({});
  await prisma.cloudStorage.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.friend.deleteMany({});
  await prisma.groupMember.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.qrCode.deleteMany({});
  await prisma.pinnedItem.deleteMany({});
  await prisma.userInfo.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Dữ liệu đã được xóa thành công!'); // Ghi log để chắc chắn môi trường seed đang sạch
}

// Hàm tạo ngày hết hạn sau một số ngày
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function main() {
  // Tạo người dùng mẫu với ID cố định để dễ truy vết khi test
  const users = await createUsers();

  // Thiết lập bảng bạn bè dựa trên danh sách người dùng ở trên
  await createFriendships(users);

  // Khởi tạo bảng user_settings với một vài cấu hình phổ biến
  await createUserSettings(users);
}

async function createUsers() {
  // Xóa dữ liệu hiện có để tránh lỗi unique constraint
  // Xóa đúng thứ tự để tôn trọng ràng buộc khóa ngoại
  await prisma.userSetting.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.postReaction.deleteMany({});
  await prisma.hiddenPost.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.story.deleteMany({});
  await prisma.cloudStorage.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.friend.deleteMany({});
  await prisma.groupMember.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.qrCode.deleteMany({});
  await prisma.pinnedItem.deleteMany({});
  await prisma.userInfo.deleteMany({});
  await prisma.user.deleteMany({});

  // Danh sách người dùng mẫu kèm profile để seed thử nghiệm
  const userData = [
    {
      id: 'a1a0ae5b-070f-40c2-a07d-c61c06623e7a',
      email: 'iamhoangkhang@icloud.com',
      // phoneNumber: '0383741660',
      fullName: 'Lê Hoàng Khang',
      dateOfBirth: new Date('2003-03-02'),
      gender: Gender.MALE,
      bio: 'Đam mê công nghệ và luôn tìm tòi những giải pháp mới. Ngoài lập trình, tôi thích khám phá ẩm thực và đi phượt vào cuối tuần. Người ta nói tôi hơi "lầy" nhưng thực ra tôi chỉ thích vui vẻ thôi!',
      profilePictureUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/avatars/a1a0ae5b-070f-40c2-a07d-c61c06623e7a/e439ac7a-bcdf-4763-9ce3-df3f5e364816.jpg',
      statusMessage: 'Code today, coffee tomorrow, bugs forever! 💻☕',
      coverImgUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/backgrounds/a1a0ae5b-070f-40c2-a07d-c61c06623e7a/0a37bc09-97f3-4b00-86ed-177c2a4180f4.jpg',
      password: 'lehoangkhang',
    },
    {
      id: 'cea3f6a0-b3bf-4abe-9266-7a3a6fc29173',
      email: 'thanhcanh.dev@gmail.com',
      phoneNumber: '0325690224',
      fullName: 'Nguyễn Thanh Cảnh',
      dateOfBirth: new Date('2003-03-11'),
      gender: Gender.MALE,
      bio: 'how to replace main by old commit',
      profilePictureUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/avatars/cea3f6a0-b3bf-4abe-9266-7a3a6fc29173/6cf1fd51-5329-4721-80b4-39300fe9e1fb.jpg',
      statusMessage: 'thanhcanhit',
      coverImgUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/backgrounds/cea3f6a0-b3bf-4abe-9266-7a3a6fc29173/edd84f86-86ee-4178-a607-54eddbf450ff.jpg',
      password: 'thanhcanhit',
    },
    {
      id: '43c307df-1cf7-407f-85e4-21f16a4e3bf9',
      email: 'nhutam050@gmail.com',
      phoneNumber: '0336551833',
      fullName: 'Hồ Thị Như Tâm',
      dateOfBirth: new Date('2003-11-03'),
      gender: Gender.FEMALE,
      bio: 'Konichiwa mina san. Watashi wa a victim of cyberbullying. Everyday someone from VN-CS:GO calls me a "wibu bucac" desu. Watashi won\'t stand for this. Twenty six persent of bullying victims are chosen due to their race or ideology desu.',
      profilePictureUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/avatars/43c307df-1cf7-407f-85e4-21f16a4e3bf9/3ea0b1b3-641f-46e5-86a5-9baf1afb1eac.png',
      statusMessage: 'Code today, coffee tomorrow, bugs forever! 💻☕',
      coverImgUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/backgrounds/43c307df-1cf7-407f-85e4-21f16a4e3bf9/b3132851-b3af-4ad7-b0f0-b01d8c969253.jpg',
      password: 'hothinhutam',
    },
    {
      id: '1cc1b368-02e1-44a7-87c1-17ab9620bb5f',
      email: 'bankienthanthien@gmail.com',
      phoneNumber: '0325421880',
      fullName: 'Trần Đình Kiên',
      dateOfBirth: new Date('2003-05-07'),
      gender: Gender.MALE,
      bio: 'Chúa tể coder wibu!',
      profilePictureUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/avatars/1cc1b368-02e1-44a7-87c1-17ab9620bb5f/e4900db9-3a4b-4d06-8d57-d6af38e97b5b.jpeg',
      statusMessage: 'Code today, coffee tomorrow, bugs forever! 💻☕',
      coverImgUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/backgrounds/1cc1b368-02e1-44a7-87c1-17ab9620bb5f/83add9d5-7acd-46f2-a385-28350727bcda.jpeg',
      password: 'trandinhkien',
    },
    {
      id: '300bc485-d342-442e-aa08-95b754ba901d',
      email: 'user5@example.com',
      phoneNumber: '0987654321',
      fullName: 'Nguyễn Văn A',
      dateOfBirth: new Date('2000-01-15'),
      gender: Gender.MALE,
      bio: 'Yêu màu tím, thích màu hồng 💜💗',
      profilePictureUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/avatars/300bc485-d342-442e-aa08-95b754ba901d/6f654676-36f9-4a20-a11a-259613855b19.png',
      statusMessage: 'Living my best life ✨',
      coverImgUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/backgrounds/300bc485-d342-442e-aa08-95b754ba901d/a7d999cf-7454-42be-927b-5271b7f306e9.jpg',
      password: 'sapassword',
    },
    {
      id: '3d09a459-8398-4ec8-ba0f-ffb881f77632',
      email: 'user6@example.com',
      phoneNumber: '0912345678',
      fullName: 'Trần Thị B',
      dateOfBirth: new Date('2001-06-20'),
      gender: Gender.FEMALE,
      bio: 'Coffee addict ☕ | Book lover 📚',
      profilePictureUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/avatars/3d09a459-8398-4ec8-ba0f-ffb881f77632/2f53a027-8ab3-45d1-ab53-2632cff110f2.jpg',
      statusMessage: 'One day at a time 🌟',
      coverImgUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/backgrounds/3d09a459-8398-4ec8-ba0f-ffb881f77632/7da60c77-54d1-4eb2-8116-ccf88dc6eeb4.jpg',
      password: 'sapassword',
    },
    {
      id: '422a4298-58d6-41d9-a28e-4025c19baf3a',
      email: 'user7@example.com',
      phoneNumber: '0923456789',
      fullName: 'Phạm Văn C',
      dateOfBirth: new Date('1999-12-25'),
      gender: Gender.MALE,
      bio: 'Photographer 📸 | Travel enthusiast 🌎',
      profilePictureUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/avatars/422a4298-58d6-41d9-a28e-4025c19baf3a/4f4f6af1-89b1-4e92-8bcd-fee4e6fc2926.jpg',
      statusMessage: 'Capturing moments ✨',
      coverImgUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/backgrounds/300bc485-d342-442e-aa08-95b754ba901d/a7d999cf-7454-42be-927b-5271b7f306e9.jpg',
      password: 'sapassword',
    },
    {
      id: '84cc97a1-be78-4ae9-975b-efe8328fe015',
      email: 'user8@example.com',
      phoneNumber: '0934567890',
      fullName: 'Lê Thị D',
      dateOfBirth: new Date('2002-08-30'),
      gender: Gender.FEMALE,
      bio: 'Music lover 🎵 | Foodie 🍜',
      profilePictureUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/avatars/84cc97a1-be78-4ae9-975b-efe8328fe015/1c924b7e-1cab-4a32-9d3b-cce48c8c6264.png',
      statusMessage: 'Dancing through life 💃',
      coverImgUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/backgrounds/84cc97a1-be78-4ae9-975b-efe8328fe015/5b57fc8f-cb4b-4d98-b72a-ab68022d7e66.png',
      password: 'sapassword',
    },
    {
      id: 'ac3fe11d-01bf-4ef0-9992-661e621253c2',
      email: 'user9@example.com',
      phoneNumber: '0945678901',
      fullName: 'Hoàng Văn E',
      dateOfBirth: new Date('1998-04-10'),
      gender: Gender.MALE,
      bio: 'Gamer 🎮 | Tech enthusiast 💻',
      profilePictureUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/backgrounds/ac3fe11d-01bf-4ef0-9992-661e621253c2/7c188dd9-2e48-487c-b191-5491aae6a749.png',
      statusMessage: 'Game on! 🎯',
      coverImgUrl:
        'https://vcnmqyobtaqxbnckzcnr.supabase.co/storage/v1/object/public/backgrounds/300bc485-d342-442e-aa08-95b754ba901d/a7d999cf-7454-42be-927b-5271b7f306e9.jpg',
      password: 'sapassword',
    },
    // 5 người dùng mới với ID cố định, không có ảnh đại diện và ảnh bìa
    {
      id: 'b5c8d7e6-f5e4-4d3c-b2a1-0f9e8d7c6b5a',
      email: 'user10@example.com',
      phoneNumber: '0956789012',
      fullName: 'Vũ Thị F',
      dateOfBirth: new Date('1997-07-22'),
      gender: Gender.FEMALE,
      bio: 'Designer 🎨 | Creative mind 💭',
      profilePictureUrl: null,
      statusMessage: 'Creating beautiful things ✨',
      coverImgUrl: null,
      password: 'sapassword',
    },
    {
      id: 'c6d7e8f9-a0b1-2c3d-4e5f-6a7b8c9d0e1f',
      email: 'user11@example.com',
      phoneNumber: '0967890123',
      fullName: 'Đỗ Văn G',
      dateOfBirth: new Date('1996-09-18'),
      gender: Gender.MALE,
      bio: 'Sports enthusiast 🏀 | Fitness lover 💪',
      profilePictureUrl: null,
      statusMessage: 'No pain, no gain 🔥',
      coverImgUrl: null,
      password: 'sapassword',
    },
    {
      id: 'd7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a',
      email: 'user12@example.com',
      phoneNumber: '0978901234',
      fullName: 'Ngô Thị H',
      dateOfBirth: new Date('1995-11-30'),
      gender: Gender.FEMALE,
      bio: 'Chef 👩‍🍳 | Food blogger 🍕',
      profilePictureUrl: null,
      statusMessage: 'Cooking up a storm 🌪️',
      coverImgUrl: null,
      password: 'sapassword',
    },
    {
      id: 'e8f9a0b1-c2d3-4e5f-6a7b-8c9d0e1f2a3b',
      email: 'user13@example.com',
      phoneNumber: '0989012345',
      fullName: 'Lý Văn I',
      dateOfBirth: new Date('1994-02-14'),
      gender: Gender.MALE,
      bio: 'Writer ✍️ | Poet 📝',
      profilePictureUrl: null,
      statusMessage: 'Words have power 📚',
      coverImgUrl: null,
      password: 'sapassword',
    },
    {
      id: 'f9a0b1c2-d3e4-5f6a-7b8c-9d0e1f2a3b4c',
      email: 'user14@example.com',
      phoneNumber: '0990123456',
      fullName: 'Trịnh Thị K',
      dateOfBirth: new Date('1993-05-25'),
      gender: Gender.FEMALE,
      bio: 'Teacher 👩‍🏫 | Lifelong learner 🧠',
      profilePictureUrl: null,
      statusMessage: 'Knowledge is power 🔍',
      coverImgUrl: null,
      password: 'sapassword',
    },
  ];

  const createdUsers = []; // Lưu lại người dùng đã tạo để dùng cho các bước seed tiếp theo

  for (const user of userData) {
    // Bước 1: tạo bản ghi trong bảng users với ID cố định
    const createdUser = await prisma.user.create({
      data: {
        id: user.id, // Giữ nguyên ID cố định để dễ liên kết với bảng khác
        email: user.email,
        phoneNumber: user.phoneNumber,
        passwordHash: await hash(user.password, 10), // Mã hóa mật khẩu trước khi lưu
        refreshTokens: {
          create: {
            token: `token-${user.email.split('@')[0]}`,
            expiresAt: addDays(new Date(), 30),
            deviceType: DeviceType.DESKTOP,
            ipAddress: '127.0.0.1',
            userAgent:
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        },
      },
    });

    // Bước 2: tạo userInfo tương ứng, dùng chung ID để làm khóa chính và khóa ngoại
    await prisma.userInfo.create({
      data: {
        id: user.id, // Đồng bộ ID giữa 2 bảng để thuận tiện join
        fullName: user.fullName,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        bio: user.bio,
        profilePictureUrl: user.profilePictureUrl,
        statusMessage: user.statusMessage,
        coverImgUrl: user.coverImgUrl,
        lastSeen: new Date(),
      },
    });

    createdUsers.push(createdUser);
  }

  return createdUsers; // Trả về danh sách người dùng đã tạo cho các bước seed kế tiếp
}

async function createFriendships(users: any[]) {
  // Giữ nguyên các mối quan hệ cũ
  // Danh sách dưới bao gồm cả dữ liệu lịch sử và một vài quan hệ mới cho các user bổ sung
  const friendships = [
    // Các mối quan hệ cũ
    {
      senderId: users[0].id,
      receiverId: users[1].id,
      status: FriendStatus.ACCEPTED,
      introduce:
        'Tôi biết bạn thông qua số điện thoại, hãy kết bạn với tôi nhé!.',
    },
    {
      senderId: users[0].id,
      receiverId: users[2].id,
      status: FriendStatus.PENDING,
      introduce:
        'Tôi biết bạn thông qua số điện thoại, hãy kết bạn với tôi nhé!.',
    },
    {
      senderId: users[1].id,
      receiverId: users[3].id,
      status: FriendStatus.ACCEPTED,
      introduce:
        'Tôi biết bạn thông qua số điện thoại, hãy kết bạn với tôi nhé!.',
    },
    {
      senderId: users[2].id,
      receiverId: users[3].id,
      status: FriendStatus.ACCEPTED,
      introduce:
        'Tôi biết bạn thông qua số điện thoại, hãy kết bạn với tôi nhé!.',
    },
    {
      senderId: users[3].id,
      receiverId: users[0].id,
      status: FriendStatus.PENDING,
      introduce:
        'Tôi biết bạn thông qua số điện thoại, hãy kết bạn với tôi nhé!.',
    },
    {
      senderId: users[1].id,
      receiverId: users[2].id,
      status: FriendStatus.ACCEPTED,
      introduce:
        'Tôi biết bạn thông qua số điện thoại, hãy kết bạn với tôi nhé!.',
    },

    // Thêm các mối quan hệ mới
    // User 5 (Nguyễn Văn A)
    {
      senderId: users[4].id, // Nguyễn Văn A
      receiverId: users[0].id,
      status: FriendStatus.ACCEPTED,
      introduce: 'Kết bạn nhé!',
    },
    {
      senderId: users[4].id,
      receiverId: users[1].id,
      status: FriendStatus.PENDING,
      introduce: 'Mình là bạn của Hoàng Khang',
    },

    // User 6 (Trần Thị B)
    {
      senderId: users[5].id,
      receiverId: users[2].id,
      status: FriendStatus.ACCEPTED,
      introduce: 'Mình là bạn cùng lớp với Như Tâm',
    },
    {
      senderId: users[3].id,
      receiverId: users[5].id,
      status: FriendStatus.BLOCKED,
      introduce: 'Kết bạn nhé!',
    },

    // User 7 (Phạm Văn C)
    {
      senderId: users[6].id,
      receiverId: users[0].id,
      status: FriendStatus.ACCEPTED,
      introduce: 'Mình là bạn cùng khoa',
    },
    {
      senderId: users[6].id,
      receiverId: users[4].id,
      status: FriendStatus.PENDING,
      introduce: 'Kết bạn nhé!',
    },

    // User 8 (Lê Thị D)
    {
      senderId: users[7].id,
      receiverId: users[1].id,
      status: FriendStatus.ACCEPTED,
      introduce: 'Mình là bạn cùng câu lạc bộ',
    },
    {
      senderId: users[5].id,
      receiverId: users[7].id,
      status: FriendStatus.ACCEPTED,
      introduce: 'Kết bạn nhé!',
    },

    // User 9 (Hoàng Văn E)
    {
      senderId: users[8].id,
      receiverId: users[2].id,
      status: FriendStatus.PENDING,
      introduce: 'Mình là bạn của Kiên',
    },
    {
      senderId: users[8].id,
      receiverId: users[6].id,
      status: FriendStatus.ACCEPTED,
      introduce: 'Kết bạn nhé!',
    },

    // Mối quan hệ cho 5 người dùng mới
    // User 10 (Vũ Thị F)
    {
      senderId: users[9].id,
      receiverId: users[0].id,
      status: FriendStatus.ACCEPTED,
      introduce: 'Mình là bạn học cấp 3',
    },
    {
      senderId: users[9].id,
      receiverId: users[2].id,
      status: FriendStatus.PENDING,
      introduce: 'Mình là bạn của Hoàng Khang',
    },

    // User 11 (Đỗ Văn G)
    {
      senderId: users[10].id,
      receiverId: users[1].id,
      status: FriendStatus.ACCEPTED,
      introduce: 'Mình là bạn cùng lớp',
    },
    {
      senderId: users[10].id,
      receiverId: users[4].id,
      status: FriendStatus.PENDING,
      introduce: 'Kết bạn nhé!',
    },

    // User 12 (Ngô Thị H)
    {
      senderId: users[11].id,
      receiverId: users[3].id,
      status: FriendStatus.ACCEPTED,
      introduce: 'Mình là bạn cùng khóa',
    },
    {
      senderId: users[5].id,
      receiverId: users[11].id,
      status: FriendStatus.PENDING,
      introduce: 'Kết bạn nhé!',
    },

    // User 13 (Lý Văn I)
    {
      senderId: users[12].id,
      receiverId: users[0].id,
      status: FriendStatus.PENDING,
      introduce: 'Mình là bạn của Kiên',
    },
    {
      senderId: users[12].id,
      receiverId: users[10].id,
      status: FriendStatus.ACCEPTED,
      introduce: 'Kết bạn nhé!',
    },

    // User 14 (Trịnh Thị K)
    {
      senderId: users[13].id,
      receiverId: users[2].id,
      status: FriendStatus.ACCEPTED,
      introduce: 'Mình là bạn cùng lớp',
    },
    {
      senderId: users[13].id,
      receiverId: users[9].id,
      status: FriendStatus.BLOCKED,
      introduce: 'Kết bạn nhé!',
    },
  ];

  for (const friendship of friendships) {
    await prisma.friend.create({
      data: friendship,
    });
  }
}

async function createUserSettings(users: any[]) {
  await prisma.userSetting.deleteMany({}); // Dọn sạch bảng cài đặt để không trùng dữ liệu cũ

  // Bộ cài đặt thông báo + dark mode cho một số người tiêu biểu
  const settings = [
    {
      userId: users[0].id,
      notificationEnabled: true,
      darkMode: true,
    },
    {
      userId: users[1].id,
      notificationEnabled: true,
      darkMode: false,
    },
    {
      userId: users[2].id,
      notificationEnabled: false,
      darkMode: true,
    },
    {
      userId: users[3].id,
      notificationEnabled: true,
      darkMode: true,
    },
    // Cài đặt cho 5 người dùng mới
    {
      userId: users[9].id, // Vũ Thị F
      notificationEnabled: true,
      darkMode: false,
    },
    {
      userId: users[10].id, // Đỗ Văn G
      notificationEnabled: true,
      darkMode: true,
    },
    {
      userId: users[11].id, // Ngô Thị H
      notificationEnabled: false,
      darkMode: false,
    },
    {
      userId: users[12].id, // Lý Văn I
      notificationEnabled: true,
      darkMode: true,
    },
    {
      userId: users[13].id, // Trịnh Thị K
      notificationEnabled: false,
      darkMode: true,
    },
  ];

  for (const setting of settings) {
    await prisma.userSetting.create({
      data: setting,
    });
  }
}

main()
  .catch((e) => {
    console.error(e); // In lỗi seed để dễ debug
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect(); // Đảm bảo kết nối Prisma được đóng sau khi seed xong
  });

// npm run seed -> lệnh thực thi file seed này
