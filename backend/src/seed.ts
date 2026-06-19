import 'dotenv/config';
import { Role, ShiftType } from '@prisma/client';
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
