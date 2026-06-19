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

export type SeriesType = 'MONOGRAPH' | 'TEXTBOOK' | 'JOURNAL_BOUND' | 'COLLECTION' | 'REFERENCE' | 'OTHER';
export type PurchaseStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PURCHASED';

export const SERIES_TYPE_LABELS: Record<SeriesType, string> = {
  MONOGRAPH: '专著',
  TEXTBOOK: '教材',
  JOURNAL_BOUND: '期刊合订',
  COLLECTION: '丛书',
  REFERENCE: '参考书',
  OTHER: '其他',
};

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  NONE: '无',
  PENDING: '待审核',
  APPROVED: '已批准',
  REJECTED: '已拒绝',
  PURCHASED: '已采购',
};

export const PURCHASE_STATUS_TYPES: Record<PurchaseStatus, string> = {
  NONE: 'info',
  PENDING: 'warning',
  APPROVED: 'primary',
  REJECTED: 'danger',
  PURCHASED: 'success',
};

export interface BookSeries {
  id: number;
  name: string;
  description?: string;
  coverUrl?: string;
  expectedTotalVolumes: number;
  seriesType: SeriesType;
  createdAt: string;
  updatedAt: string;
  collectedCount?: number;
  missingCount?: number;
  borrowRatio?: number;
  completion?: number;
}

export interface SeriesVolume {
  id: number;
  seriesId: number;
  series?: BookSeries;
  bookId?: number;
  book?: Book;
  volumeNumber: number;
  isMissing: boolean;
  purchaseStatus: PurchaseStatus;
  createdAt: string;
  updatedAt: string;
  purchaseRequests?: PurchaseRequest[];
}

export interface PurchaseRequest {
  id: number;
  seriesId: number;
  series?: BookSeries;
  volumeId: number;
  volume?: SeriesVolume;
  requestedById: number;
  requestedBy?: { id: number; username: string };
  status: PurchaseStatus;
  reason?: string;
  estimatedPrice?: number;
  reviewedById?: number;
  reviewedBy?: { id: number; username: string };
  reviewedAt?: string;
  purchasedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeriesDetail extends BookSeries {
  volumes: SeriesVolume[];
  stats: {
    collectedCount: number;
    missingCount: number;
    pendingPurchaseCount: number;
    completion: number;
    borrowRatio: number;
    borrowedCount: number;
  };
  missingVolumes: SeriesVolume[];
  pendingPurchase: SeriesVolume[];
}

export interface BookWithSeries extends Book {
  seriesVolume?: {
    id: number;
    seriesId: number;
    volumeNumber: number;
    series: BookSeries;
  };
}

export type InterLibraryLoanDirection = 'BORROW_IN' | 'LEND_OUT';
export type InterLibraryLoanStatus =
  | 'PENDING'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'IN_USE'
  | 'RETURNED'
  | 'REJECTED';
export type FeePayer = 'OUR_LIBRARY' | 'OTHER_LIBRARY' | 'SPLIT';

export interface InterLibraryLoanTimeline {
  id: number;
  loanId: number;
  status?: InterLibraryLoanStatus;
  action: string;
  operatorId?: number;
  operator?: { id: number; username: string };
  note?: string;
  timestamp: string;
}

export interface InterLibraryLoanExtension {
  id: number;
  loanId: number;
  originalDueDate: string;
  newDueDate: string;
  reason: string;
  approvedById?: number;
  approvedBy?: { id: number; username: string };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: string;
  createdAt: string;
}

export interface InterLibraryLoanReminder {
  id: number;
  loanId: number;
  content: string;
  operatorId?: number;
  operator?: { id: number; username: string };
  createdAt: string;
}

export interface InterLibraryLoan {
  id: number;
  bookTitle: string;
  isbn: string;
  volumeCount: number;
  partnerLibraryName: string;
  contactPerson: string;
  contactPhone?: string;
  trackingNumber?: string;
  lendDate?: string;
  dueDate?: string;
  actualReturnDate?: string;
  feePayer: FeePayer;
  direction: InterLibraryLoanDirection;
  status: InterLibraryLoanStatus;
  remarks?: string;
  rejectionReason?: string;
  createdById?: number;
  createdBy?: { id: number; username: string; role: string };
  timelines: InterLibraryLoanTimeline[];
  extensions: InterLibraryLoanExtension[];
  reminders: InterLibraryLoanReminder[];
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
  overdueDays: number;
}

export const DIRECTION_LABELS: Record<InterLibraryLoanDirection, string> = {
  BORROW_IN: '借入',
  LEND_OUT: '借出',
};

export const DIRECTION_COLORS: Record<InterLibraryLoanDirection, string> = {
  BORROW_IN: '#409eff',
  LEND_OUT: '#e6a23c',
};

export const DIRECTION_TAGS: Record<InterLibraryLoanDirection, 'primary' | 'warning'> = {
  BORROW_IN: 'primary',
  LEND_OUT: 'warning',
};

export const STATUS_LABELS: Record<InterLibraryLoanStatus, string> = {
  PENDING: '申请中',
  SHIPPED: '已发货',
  IN_TRANSIT: '运输中',
  IN_USE: '在馆使用',
  RETURNED: '已归还',
  REJECTED: '已拒收',
};

export const STATUS_TYPES: Record<InterLibraryLoanStatus, 'info' | 'warning' | 'primary' | 'success' | 'success' | 'danger'> = {
  PENDING: 'info',
  SHIPPED: 'warning',
  IN_TRANSIT: 'primary',
  IN_USE: 'success',
  RETURNED: 'success',
  REJECTED: 'danger',
};

export const STATUS_COLORS: Record<InterLibraryLoanStatus, string> = {
  PENDING: '#909399',
  SHIPPED: '#e6a23c',
  IN_TRANSIT: '#409eff',
  IN_USE: '#67c23a',
  RETURNED: '#67c23a',
  REJECTED: '#f56c6c',
};

export const FEE_PAYER_LABELS: Record<FeePayer, string> = {
  OUR_LIBRARY: '本馆承担',
  OTHER_LIBRARY: '对方馆承担',
  SPLIT: '双方分摊',
};

export const STATUS_FLOW: { status: InterLibraryLoanStatus; label: string; from?: InterLibraryLoanStatus[] }[] = [
  { status: 'PENDING', label: '申请中' },
  { status: 'SHIPPED', label: '已发货', from: ['PENDING'] },
  { status: 'IN_TRANSIT', label: '运输中', from: ['PENDING', 'SHIPPED'] },
  { status: 'IN_USE', label: '在馆使用', from: ['SHIPPED', 'IN_TRANSIT'] },
  { status: 'RETURNED', label: '已归还', from: ['IN_USE'] },
  { status: 'REJECTED', label: '已拒收', from: ['PENDING', 'SHIPPED', 'IN_TRANSIT'] },
];

export type CompensationLossType = 'LOST' | 'DAMAGED' | 'STOLEN';
export type CompensationStatus = 'PENDING' | 'INSTALLMENT' | 'SETTLED' | 'WAIVED';
export type PaymentMethod = 'CASH' | 'WECHAT' | 'ALIPAY' | 'BANK_TRANSFER' | 'OTHER';

export interface Compensation {
  id: number;
  borrowRecordId: number;
  borrowRecord: BorrowRecord;
  bookId: number;
  book: Book;
  borrowerId: number;
  borrower: { id: number; name: string; phone?: string; email?: string };
  lossType: CompensationLossType;
  status: CompensationStatus;
  bookPrice: number;
  multiplier: number;
  depreciationRate: number;
  calculatedAmount: number;
  adjustedAmount?: number;
  paidAmount: number;
  paymentMethod?: PaymentMethod;
  handlerId?: number;
  handler?: { id: number; username: string };
  note?: string;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const LOSS_TYPE_LABELS: Record<CompensationLossType, string> = {
  LOST: '丢失',
  DAMAGED: '污损报废',
  STOLEN: '被盗',
};

export const LOSS_TYPE_COLORS: Record<CompensationLossType, string> = {
  LOST: '#f56c6c',
  DAMAGED: '#e6a23c',
  STOLEN: '#909399',
};

export const LOSS_TYPE_TAGS: Record<CompensationLossType, 'danger' | 'warning' | 'info'> = {
  LOST: 'danger',
  DAMAGED: 'warning',
  STOLEN: 'info',
};

export const COMP_STATUS_LABELS: Record<CompensationStatus, string> = {
  PENDING: '待赔偿',
  INSTALLMENT: '分期赔付',
  SETTLED: '已结清',
  WAIVED: '豁免',
};

export const COMP_STATUS_TAGS: Record<CompensationStatus, 'warning' | 'primary' | 'success' | 'info'> = {
  PENDING: 'warning',
  INSTALLMENT: 'primary',
  SETTLED: 'success',
  WAIVED: 'info',
};

export const COMP_STATUS_COLORS: Record<CompensationStatus, string> = {
  PENDING: '#e6a23c',
  INSTALLMENT: '#409eff',
  SETTLED: '#67c23a',
  WAIVED: '#909399',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: '现金',
  WECHAT: '微信',
  ALIPAY: '支付宝',
  BANK_TRANSFER: '银行转账',
  OTHER: '其他',
};

