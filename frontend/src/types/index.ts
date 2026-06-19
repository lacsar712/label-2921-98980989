export interface Category {
  id: number;
  name: string;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  stock: number;
  price: number;
  description?: string;
  coverUrl?: string;
  location?: string;
  categoryId: number;
  category: Category;
  createdAt: string;
  updatedAt: string;
}

export interface BorrowRecord {
  id: number;
  bookId: number;
  book: Book;
  borrowerId: number;
  borrower: {
    id: number;
    name: string;
  };
  borrowDate: string;
  returnDate?: string;
  status: 'BORROWED' | 'RETURNED';
}

export type ShiftType = 'MORNING' | 'AFTERNOON' | 'EVENING';
export type SwapStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type LocationType = 'READING_ROOM' | 'SERVICE_DESK';

export interface ServiceLocation {
  id: number;
  name: string;
  type: LocationType;
  createdAt: string;
  updatedAt: string;
  _count?: { schedules: number };
}

export interface Schedule {
  id: number;
  userId: number;
  user: { id: number; username: string; role: string };
  date: string;
  shiftType: ShiftType;
  serviceLocationId: number;
  serviceLocation: ServiceLocation;
  isLeader: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftSwapRequest {
  id: number;
  requesterId: number;
  requester: { id: number; username: string };
  targetUserId: number;
  targetUser: { id: number; username: string };
  requesterScheduleId: number;
  requesterSchedule: Schedule;
  targetScheduleId: number;
  targetSchedule: Schedule;
  reason: string;
  status: SwapStatus;
  reviewedBy?: number;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const SHIFT_LABELS: Record<ShiftType, string> = {
  MORNING: '早班',
  AFTERNOON: '中班',
  EVENING: '晚班',
};

export const SHIFT_COLORS: Record<ShiftType, string> = {
  MORNING: '#e6a23c',
  AFTERNOON: '#409eff',
  EVENING: '#7c3aed',
};

export const SWAP_STATUS_LABELS: Record<SwapStatus, string> = {
  PENDING: '待确认',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  CANCELLED: '已取消',
};

export const SWAP_STATUS_TYPES: Record<SwapStatus, string> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'info',
};

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  READING_ROOM: '阅览室',
  SERVICE_DESK: '服务台',
};

export interface RecommendedBook extends Book {
  borrowedCount: number;
  avgRating: number;
  ratingCount: number;
  reason: string;
}

export interface RecommendationResponse {
  borrower: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  };
  recommendations: RecommendedBook[];
  total: number;
  hasMore: boolean;
}

export interface Reservation {
  id: number;
  bookId: number;
  book: Book;
  borrowerId: number;
  borrower: {
    id: number;
    name: string;
  };
  status: 'PENDING' | 'FULFILLED' | 'CANCELLED';
  queuePosition: number;
  createdAt: string;
  fulfilledAt?: string;
}

export interface BookRating {
  id: number;
  bookId: number;
  borrowerId: number;
  borrower: {
    id: number;
    name: string;
  };
  rating: number;
  comment?: string;
  createdAt: string;
}

export type MessageType =
  | 'SYSTEM'
  | 'INVENTORY_ALERT'
  | 'RESERVATION_PENDING'
  | 'INVENTORY_REVIEW'
  | 'PROCUREMENT_ARRIVAL'
  | 'CUSTOM';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TargetType =
  | 'USER'
  | 'ROLE'
  | 'ALL_ADMINS'
  | 'ALL_LIBRARIANS'
  | 'ALL_USERS';

export interface Message {
  id: number;
  messageId: number;
  title: string;
  content: string;
  type: MessageType;
  priority: PriorityLevel;
  sender?: {
    id: number;
    username: string;
    role: string;
  };
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface MessageTemplate {
  id: number;
  name: string;
  title: string;
  content: string;
  type: MessageType;
  priority: PriorityLevel;
  createdAt: string;
  updatedAt: string;
}

export interface UnreadCount {
  total: number;
  byPriority: Record<PriorityLevel, number>;
}

export interface MessageListResponse {
  data: Message[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MessageFilter {
  page?: number;
  pageSize?: number;
  type?: MessageType;
  priority?: PriorityLevel;
  isRead?: boolean;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateMessageRequest {
  title: string;
  content: string;
  type?: MessageType;
  priority?: PriorityLevel;
  targetType: TargetType;
  targetRole?: 'ADMIN' | 'LIBRARIAN';
  targetUserIds?: number[];
  templateId?: number;
}

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  SYSTEM: '系统通知',
  INVENTORY_ALERT: '库存预警',
  RESERVATION_PENDING: '预约待处理',
  INVENTORY_REVIEW: '盘点复核',
  PROCUREMENT_ARRIVAL: '采购到货',
  CUSTOM: '自定义消息',
};

export const MESSAGE_TYPE_COLORS: Record<MessageType, string> = {
  SYSTEM: '#409eff',
  INVENTORY_ALERT: '#f56c6c',
  RESERVATION_PENDING: '#e6a23c',
  INVENTORY_REVIEW: '#909399',
  PROCUREMENT_ARRIVAL: '#67c23a',
  CUSTOM: '#909399',
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  URGENT: '紧急',
};

export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  LOW: '#909399',
  MEDIUM: '#409eff',
  HIGH: '#e6a23c',
  URGENT: '#f56c6c',
};

export const PRIORITY_TAGS: Record<PriorityLevel, 'info' | 'primary' | 'warning' | 'danger'> = {
  LOW: 'info',
  MEDIUM: 'primary',
  HIGH: 'warning',
  URGENT: 'danger',
};

export const TARGET_TYPE_LABELS: Record<TargetType, string> = {
  USER: '指定用户',
  ROLE: '指定角色',
  ALL_ADMINS: '全体管理员',
  ALL_LIBRARIANS: '全体馆员',
  ALL_USERS: '全体人员',
};

export interface MetricDetail {
  value: number;
  momChange: number;
  yoyChange: number;
}

export interface CoreMetrics {
  borrowCount: MetricDetail;
  returnCount: MetricDetail;
  newBorrowers: MetricDetail;
  newBooks: MetricDetail;
  stockChange: MetricDetail;
}

export interface MonthlyReportData {
  month: string;
  coreMetrics: CoreMetrics;
  activeBorrowerCount: number;
  totalStock: number;
  interpretation: string;
}

export interface CategoryDistribution {
  name: string;
  count: number;
}

export interface CategoryDistributionData {
  month: string;
  distribution: CategoryDistribution[];
}

export interface TopBookItem {
  id: number;
  title: string;
  author: string;
  category: string;
  count: number;
}

export interface TopBooksData {
  month: string;
  topBooks: TopBookItem[];
}

export interface LibrarianVolumeItem {
  id: number;
  username: string;
  shiftCount: number;
  details: { date: string; shiftType: string; location: string }[];
}

export interface LibrarianVolumeData {
  month: string;
  librarianVolume: LibrarianVolumeItem[];
}

export interface OverdueTrendItem {
  date: string;
  overdueCount: number;
  estimatedFine: number;
}

export interface OverdueTrendData {
  month: string;
  trend: OverdueTrendItem[];
  summary: { totalOverdue: number; totalFine: number };
}

export const METRIC_LABELS: Record<string, string> = {
  borrowCount: '借阅总量',
  returnCount: '归还量',
  newBorrowers: '净增借阅用户',
  newBooks: '新增图书',
  stockChange: '库存变动',
};
