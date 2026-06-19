import 'dotenv/config';
import { Role, ShiftType, MessageType, PriorityLevel, TargetType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from './utils/prisma';

async function main() {
  console.log('Initializing database with seed data...');
  
  // Create System Users
  const adminExists = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!adminExists) {
    const adminPassword = await bcrypt.hash('123456', 10);
    await prisma.user.create({
      data: {
        username: 'admin',
        password: adminPassword,
        role: Role.ADMIN,
      },
    });
  }

  const librarianExists = await prisma.user.findUnique({ where: { username: 'librarian' } });
  if (!librarianExists) {
    const librarianPassword = await bcrypt.hash('123456', 10);
    await prisma.user.create({
      data: {
        username: 'librarian',
        password: librarianPassword,
        role: Role.LIBRARIAN,
      },
    });
  }

  const librarian2Exists = await prisma.user.findUnique({ where: { username: 'librarian2' } });
  if (!librarian2Exists) {
    const librarian2Password = await bcrypt.hash('123456', 10);
    await prisma.user.create({
      data: {
        username: 'librarian2',
        password: librarian2Password,
        role: Role.LIBRARIAN,
      },
    });
  }

  const librarian3Exists = await prisma.user.findUnique({ where: { username: 'librarian3' } });
  if (!librarian3Exists) {
    const librarian3Password = await bcrypt.hash('123456', 10);
    await prisma.user.create({
      data: {
        username: 'librarian3',
        password: librarian3Password,
        role: Role.LIBRARIAN,
      },
    });
  }

  // Create Service Locations
  const locations = [
    { name: '一楼综合阅览室', type: 'READING_ROOM' },
    { name: '二楼报刊阅览室', type: 'READING_ROOM' },
    { name: '三楼电子阅览室', type: 'READING_ROOM' },
    { name: '一楼借还服务台', type: 'SERVICE_DESK' },
    { name: '二楼参考咨询台', type: 'SERVICE_DESK' },
  ];

  for (const loc of locations) {
    const exists = await prisma.serviceLocation.findUnique({ where: { name: loc.name } });
    if (!exists) {
      await prisma.serviceLocation.create({ data: loc });
    }
  }

  // Create Schedule data for current week
  const allLibrarians = await prisma.user.findMany({ where: { role: Role.LIBRARIAN } });
  const allLocations = await prisma.serviceLocation.findMany();

  if (allLibrarians.length > 0 && allLocations.length > 0) {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const shiftTypes: ShiftType[] = [ShiftType.MORNING, ShiftType.AFTERNOON, ShiftType.EVENING];

    const scheduleData = [];
    for (let d = 0; d < 7; d++) {
      const scheduleDate = new Date(monday);
      scheduleDate.setDate(monday.getDate() + d);

      for (const location of allLocations) {
        for (const shift of shiftTypes) {
          const librarianIndex = (d + allLocations.indexOf(location) + shiftTypes.indexOf(shift)) % allLibrarians.length;
          scheduleData.push({
            userId: allLibrarians[librarianIndex].id,
            date: scheduleDate,
            shiftType: shift,
            serviceLocationId: location.id,
            isLeader: shift === ShiftType.MORNING && allLocations.indexOf(location) === 0,
          });
        }
      }
    }

    await prisma.schedule.createMany({
      data: scheduleData,
      skipDuplicates: true,
    });
  }

  // Create sample borrower users in Borrower table
  const borrowerNames = ['zhangsan', 'lisi', 'wangwu', 'zhaoliu', 'qianqi', 'sunba', 'zhoujiu', 'wushi', 'zhengshi', 'fengshi', 'chushi', 'weishi'];
  
  for (const name of borrowerNames) {
    const exists = await prisma.borrower.findUnique({ where: { name } });
    if (!exists) {
      await prisma.borrower.create({
        data: {
          name: name,
          phone: `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
          email: `${name}@example.com`,
        },
      });
    }
  }

  // Create Categories
  const categories = await Promise.all([
    prisma.category.upsert({ where: { id: 1 }, update: {}, create: { name: '计算机科学' } }),
    prisma.category.upsert({ where: { id: 2 }, update: {}, create: { name: '文学' } }),
    prisma.category.upsert({ where: { id: 3 }, update: {}, create: { name: '历史' } }),
    prisma.category.upsert({ where: { id: 4 }, update: {}, create: { name: '艺术' } }),
    prisma.category.upsert({ where: { id: 5 }, update: {}, create: { name: '心理学' } }),
    prisma.category.upsert({ where: { id: 6 }, update: {}, create: { name: '经济学' } }),
  ]);

  // Create 100+ Books
  console.log('Generating 100+ books...');
  const bookTitles = [
    '深入浅出', '实战指南', '核心技术', '从入门到精通', '精要', '艺术', '哲学', '指南', '通史', '原理'
  ];
  const subjects = [
    'Vue 3', 'React', 'Node.js', 'TypeScript', 'Python', 'AI 编程', '算法', '设计模式', '微服务', 'Docker',
    '唐诗', '宋词', '明清小说', '世界文学', '中国历史', '古希腊文明', '文艺复兴', '现代艺术', '行为心理学', '宏观经济'
  ];
  const authors = [
    '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', 'Robert Smith', 'John Doe', 'Emily White'
  ];

  const bookLocations = ['A区1排', 'A区2排', 'B区1排', 'B区2排', 'C区1排', 'C区2排', 'D区1排', 'D区2排'];

  const booksData = [];
  for (let i = 1; i <= 100; i++) {
    const title = `${subjects[i % subjects.length]}${bookTitles[i % bookTitles.length]} Vol.${Math.floor(i / subjects.length) + 1}`;
    const author = authors[i % authors.length];
    const category = categories[i % categories.length];
    
    booksData.push({
      title,
      author,
      isbn: `9787${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
      stock: Math.floor(Math.random() * 50) + 1,
      price: parseFloat((Math.random() * 100 + 20).toFixed(2)),
      categoryId: category.id,
      coverUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Book%20cover%20design%20for%20${encodeURIComponent(title)}%20minimalist%20modern%20style&image_size=portrait_4_3`,
      location: bookLocations[i % bookLocations.length],
    });
  }

  // Use createMany for efficiency
  await prisma.book.createMany({
    data: booksData,
    skipDuplicates: true,
  });

  // Create Borrow Records for the last 60 days (more history for recommendations)
  console.log('Generating borrow records for the last 60 days...');
  const allBooks = await prisma.book.findMany();
  const allBorrowers = await prisma.borrower.findMany();
  
  if (allBorrowers.length > 0 && allBooks.length > 0) {
    const borrowRecords = [];
    const now = new Date();
    
    for (let i = 0; i < 60; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      
      // Generate 2-5 records per day
      const dailyCount = Math.floor(Math.random() * 4) + 2;
      for (let j = 0; j < dailyCount; j++) {
        const book = allBooks[Math.floor(Math.random() * allBooks.length)];
        const borrower = allBorrowers[Math.floor(Math.random() * allBorrowers.length)];
        
        const isReturned = i > 14 || Math.random() > 0.3;
        
        borrowRecords.push({
          bookId: book.id,
          borrowerId: borrower.id,
          borrowDate: date,
          status: isReturned ? 'RETURNED' : 'BORROWED',
          returnDate: isReturned ? new Date(date.getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000) : null,
        });
      }
    }
    
    await prisma.borrowRecord.createMany({
      data: borrowRecords,
      skipDuplicates: true,
    });
  }

  // Create Book Ratings
  console.log('Generating book ratings...');
  const returnedRecords = await prisma.borrowRecord.findMany({
    where: { status: 'RETURNED' },
    take: 100,
  });

  const ratingData = [];
  const usedCombinations = new Set<string>();

  for (const record of returnedRecords) {
    const key = `${record.bookId}-${record.borrowerId}`;
    if (!usedCombinations.has(key) && Math.random() > 0.4) {
      usedCombinations.add(key);
      ratingData.push({
        bookId: record.bookId,
        borrowerId: record.borrowerId,
        rating: Math.floor(Math.random() * 3) + 3,
        comment: Math.random() > 0.5 ? '值得一读的好书' : null,
      });
    }
  }

  if (ratingData.length > 0) {
    await prisma.bookRating.createMany({
      data: ratingData,
      skipDuplicates: true,
    });
  }

  // Create Message Templates
  console.log('Creating message templates...');
  const templates = [
    {
      name: '库存预警通知',
      title: '【库存预警】图书库存不足',
      content: '您好，部分图书库存已低于安全阈值，请及时进行采购补货。具体清单请查看库存报表。',
      type: MessageType.INVENTORY_ALERT,
      priority: PriorityLevel.HIGH,
    },
    {
      name: '预约待处理通知',
      title: '【预约提醒】有新的图书预约需要处理',
      content: '您好，当前有待处理的图书预约请求，请及时登录系统进行处理，以免影响读者体验。',
      type: MessageType.RESERVATION_PENDING,
      priority: PriorityLevel.MEDIUM,
    },
    {
      name: '盘点复核通知',
      title: '【盘点提醒】库存盘点待复核',
      content: '您好，本月库存盘点工作已完成，请相关负责人及时登录系统进行复核确认。',
      type: MessageType.INVENTORY_REVIEW,
      priority: PriorityLevel.MEDIUM,
    },
    {
      name: '采购到货通知',
      title: '【采购到货】新采购图书已到馆',
      content: '您好，新采购的图书已到货，请及时进行验收、分类和上架工作。',
      type: MessageType.PROCUREMENT_ARRIVAL,
      priority: PriorityLevel.LOW,
    },
    {
      name: '系统公告模板',
      title: '【系统公告】',
      content: '请在此处输入公告内容...',
      type: MessageType.SYSTEM,
      priority: PriorityLevel.MEDIUM,
    },
    {
      name: '紧急通知模板',
      title: '【紧急通知】',
      content: '请在此处输入紧急通知内容...',
      type: MessageType.CUSTOM,
      priority: PriorityLevel.URGENT,
    },
  ];

  for (const tpl of templates) {
    const exists = await prisma.messageTemplate.findUnique({ where: { name: tpl.name } });
    if (!exists) {
      await prisma.messageTemplate.create({ data: tpl });
    }
  }

  // Create Sample Messages
  console.log('Creating sample messages...');
  const allUsers = await prisma.user.findMany();
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });

  if (allUsers.length > 0 && adminUser) {
    const sampleMessages = [
      {
        title: '【系统公告】欢迎使用图书管理系统',
        content: '欢迎使用新版图书管理系统！本系统新增了站内消息功能，重要业务通知将通过站内消息推送给您。如有问题请联系系统管理员。',
        type: MessageType.SYSTEM,
        priority: PriorityLevel.MEDIUM,
        targetType: TargetType.ALL_USERS,
      },
      {
        title: '【库存预警】本月有25种图书库存不足',
        content: '库存监控系统检测到有25种图书库存已低于5本，请采购部门及时安排补货。点击查看库存预警详情。',
        type: MessageType.INVENTORY_ALERT,
        priority: PriorityLevel.HIGH,
        targetType: TargetType.ALL_ADMINS,
      },
      {
        title: '【预约提醒】当前有8条待处理预约',
        content: '截止目前共有8条图书预约请求待处理，请相关馆员及时登录系统进行处理，为读者提供更好的服务体验。',
        type: MessageType.RESERVATION_PENDING,
        priority: PriorityLevel.MEDIUM,
        targetType: TargetType.ALL_LIBRARIANS,
      },
      {
        title: '【紧急通知】系统维护安排',
        content: '本周六凌晨2:00-4:00将进行系统维护升级，期间系统将暂停服务，请提前做好相关工作安排。',
        type: MessageType.CUSTOM,
        priority: PriorityLevel.URGENT,
        targetType: TargetType.ALL_USERS,
      },
    ];

    for (const msg of sampleMessages) {
      let targetUserIds: number[] = [];
      switch (msg.targetType) {
        case TargetType.ALL_USERS:
          targetUserIds = allUsers.map((u) => u.id);
          break;
        case TargetType.ALL_ADMINS:
          targetUserIds = allUsers.filter((u) => u.role === Role.ADMIN).map((u) => u.id);
          break;
        case TargetType.ALL_LIBRARIANS:
          targetUserIds = allUsers.filter((u) => u.role === Role.LIBRARIAN).map((u) => u.id);
          break;
      }

      if (targetUserIds.length > 0) {
        const existingMsg = await prisma.message.findFirst({
          where: { title: msg.title, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        });
        if (!existingMsg) {
          await prisma.message.create({
            data: {
              ...msg,
              senderId: adminUser.id,
              receipts: {
                createMany: {
                  data: targetUserIds.map((uid) => ({ userId: uid })),
                },
              },
            },
          });
        }
      }
    }
  }

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
