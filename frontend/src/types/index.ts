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

export type ProcurementPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ProcurementRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIAL_APPROVED';
export type ProcurementOrderStatus = 'CREATED' | 'ORDERED' | 'PARTIAL_ARRIVED' | 'FULLY_ARRIVED' | 'CANCELLED' | 'COMPLETED';

export const PROCUREMENT_PRIORITY_LABELS: Record<ProcurementPriority, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  URGENT: '紧急',
};

export const PROCUREMENT_PRIORITY_TAGS: Record<ProcurementPriority, 'info' | 'primary' | 'warning' | 'danger'> = {
  LOW: 'info',
  MEDIUM: 'primary',
  HIGH: 'warning',
  URGENT: 'danger',
};

export const PROCUREMENT_PRIORITY_COLORS: Record<ProcurementPriority, string> = {
  LOW: '#909399',
  MEDIUM: '#409eff',
  HIGH: '#e6a23c',
  URGENT: '#f56c6c',
};

export const PROC_REQ_STATUS_LABELS: Record<ProcurementRequestStatus, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  PARTIAL_APPROVED: '部分通过',
};

export const PROC_REQ_STATUS_TAGS: Record<ProcurementRequestStatus, 'warning' | 'success' | 'danger' | 'primary'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  PARTIAL_APPROVED: 'primary',
};

export const PROC_ORDER_STATUS_LABELS: Record<ProcurementOrderStatus, string> = {
  CREATED: '已创建',
  ORDERED: '已下单',
  PARTIAL_ARRIVED: '部分到货',
  FULLY_ARRIVED: '全部到货',
  CANCELLED: '已取消',
  COMPLETED: '已完成',
};

export const PROC_ORDER_STATUS_TAGS: Record<ProcurementOrderStatus, 'info' | 'primary' | 'warning' | 'success' | 'danger' | 'success'> = {
  CREATED: 'info',
  ORDERED: 'primary',
  PARTIAL_ARRIVED: 'warning',
  FULLY_ARRIVED: 'success',
  CANCELLED: 'danger',
  COMPLETED: 'success',
};

export interface ProcurementRequestItem {
  id: number;
  requestId: number;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  requestedQty: number;
  estimatedPrice: number;
  priority: ProcurementPriority;
  approvedQty?: number;
  adjustedNote?: string;
  categoryId?: number;
  category?: Category;
  orderItems?: ProcurementOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementRequest {
  id: number;
  requestNo: string;
  subject: string;
  reason: string;
  fundSubject: string;
  status: ProcurementRequestStatus;
  requestedById: number;
  requestedBy?: { id: number; username: string };
  reviewedById?: number;
  reviewedBy?: { id: number; username: string };
  reviewedAt?: string;
  reviewNote?: string;
  items: ProcurementRequestItem[];
  orders: ProcurementOrder[];
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementOrderItem {
  id: number;
  orderId: number;
  requestItemId: number;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  orderQty: number;
  unitPrice: number;
  receivedQty: number;
  returnedQty: number;
  stockInQty: number;
  priority: ProcurementPriority;
  categoryId?: number;
  category?: Category;
  arrivalItems?: ArrivalRecordItem[];
  returnItems?: ReturnRecordItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementOrder {
  id: number;
  orderNo: string;
  requestId: number;
  request?: ProcurementRequest;
  supplier: string;
  contactPerson?: string;
  contactPhone?: string;
  expectedArrival?: string;
  status: ProcurementOrderStatus;
  totalAmount: number;
  createdById: number;
  createdBy?: { id: number; username: string };
  orderedAt?: string;
  completedAt?: string;
  items: ProcurementOrderItem[];
  arrivalRecords: ArrivalRecord[];
  returnRecords: ReturnRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface ArrivalRecordItem {
  id: number;
  arrivalRecordId: number;
  orderItemId: number;
  title: string;
  isbn: string;
  receivedQty: number;
  unitPrice: number;
  remark?: string;
  stockInStatus: boolean;
  stockInAt?: string;
  stockInById?: number;
  stockInBy?: { id: number; username: string };
  createdAt: string;
  updatedAt: string;
}

export interface ArrivalRecord {
  id: number;
  arrivalNo: string;
  orderId: number;
  order?: ProcurementOrder;
  arrivalDate: string;
  totalReceived: number;
  operatorId: number;
  operator?: { id: number; username: string };
  remark?: string;
  items: ArrivalRecordItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ReturnRecordItem {
  id: number;
  returnRecordId: number;
  orderItemId: number;
  title: string;
  isbn: string;
  returnedQty: number;
  unitPrice: number;
  refundAmount: number;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnRecord {
  id: number;
  returnNo: string;
  orderId: number;
  order?: ProcurementOrder;
  returnDate: string;
  totalReturned: number;
  totalRefund: number;
  operatorId: number;
  operator?: { id: number; username: string };
  reason?: string;
  items: ReturnRecordItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementLedgerStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalOrders: number;
  totalAmount: number;
  totalItems: number;
  totalStockIn: number;
}

export interface ProcurementLedgerResponse {
  requests: ProcurementRequest[];
  stats: ProcurementLedgerStats;
}

export type ActivityType = 'LECTURE' | 'READING_CLUB' | 'EXHIBITION';
export type ActivityStatus = 'DRAFT' | 'REGISTRATION_OPEN' | 'ONGOING' | 'ENDED' | 'CANCELLED';
export type RegistrationStatus = 'REGISTERED' | 'WAITLIST' | 'CANCELLED' | 'CHECKED_IN' | 'NO_SHOW';

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  LECTURE: '讲座',
  READING_CLUB: '读书会',
  EXHIBITION: '展览',
};

export const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  LECTURE: '#409eff',
  READING_CLUB: '#67c23a',
  EXHIBITION: '#e6a23c',
};

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  DRAFT: '草稿',
  REGISTRATION_OPEN: '报名中',
  ONGOING: '进行中',
  ENDED: '已结束',
  CANCELLED: '已取消',
};

export const ACTIVITY_STATUS_TAGS: Record<ActivityStatus, 'info' | 'success' | 'warning' | 'primary' | 'danger'> = {
  DRAFT: 'info',
  REGISTRATION_OPEN: 'success',
  ONGOING: 'warning',
  ENDED: 'primary',
  CANCELLED: 'danger',
};

export const ACTIVITY_STATUS_COLORS: Record<ActivityStatus, string> = {
  DRAFT: '#909399',
  REGISTRATION_OPEN: '#67c23a',
  ONGOING: '#e6a23c',
  ENDED: '#409eff',
  CANCELLED: '#f56c6c',
};

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  REGISTERED: '已报名',
  WAITLIST: '候补',
  CANCELLED: '已取消',
  CHECKED_IN: '已签到',
  NO_SHOW: '未出席',
};

export const REGISTRATION_STATUS_TAGS: Record<RegistrationStatus, 'success' | 'warning' | 'info' | 'primary' | 'danger'> = {
  REGISTERED: 'success',
  WAITLIST: 'warning',
  CANCELLED: 'info',
  CHECKED_IN: 'primary',
  NO_SHOW: 'danger',
};

export interface Activity {
  id: number;
  title: string;
  coverUrl?: string;
  description: string;
  type: ActivityType;
  startTime: string;
  endTime: string;
  location: string;
  onlineUrl?: string;
  capacity: number;
  deadline: string;
  status: ActivityStatus;
  createdById: number;
  createdBy?: { id: number; username: string };
  registeredCount?: number;
  waitlistCount?: number;
  checkedInCount?: number;
  cancelCount?: number;
  feedbackCount?: number;
  avgRating?: number;
  attendanceRate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityRegistration {
  id: number;
  activityId: number;
  activity?: Activity;
  borrowerId: number;
  borrower: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  };
  status: RegistrationStatus;
  queuePosition?: number;
  registeredAt: string;
  cancelledAt?: string;
  checkInAt?: string;
  cancelReason?: string;
}

export interface ActivityFeedback {
  id: number;
  activityId: number;
  borrowerId: number;
  borrower: {
    id: number;
    name: string;
  };
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface ActivityDetail extends Activity {
  registrations: ActivityRegistration[];
  waitlist: ActivityRegistration[];
  cancellations: ActivityRegistration[];
  feedbacks: ActivityFeedback[];
  stats: {
    capacity: number;
    registeredCount: number;
    waitlistCount: number;
    checkedInCount: number;
    cancelCount: number;
    noShowCount: number;
    attendanceRate: number;
    feedbackCount: number;
    avgRating: number;
  };
}

export interface ActivityListResponse {
  data: Activity[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats?: {
    total: number;
    draft: number;
    registrationOpen: number;
    ongoing: number;
    ended: number;
  };
}

export interface ActivityFilter {
  page?: number;
  pageSize?: number;
  status?: ActivityStatus;
  type?: ActivityType;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateActivityRequest {
  title: string;
  description: string;
  type: ActivityType;
  startTime: string;
  endTime: string;
  location: string;
  onlineUrl?: string;
  capacity: number;
  deadline: string;
  coverUrl?: string;
}

export interface UpdateActivityStatusRequest {
  status: ActivityStatus;
}

export interface RegisterActivityRequest {
  borrowerId: number;
}

export interface CancelRegistrationRequest {
  borrowerId: number;
  cancelReason?: string;
}

export interface CheckInRequest {
  borrowerIds?: number[];
  registrationId?: number;
}

export interface BatchCheckInRequest {
  ids: number[];
  status: 'CHECKED_IN' | 'REGISTERED' | 'NO_SHOW';
}

export interface SubmitFeedbackRequest {
  borrowerId: number;
  rating: number;
  comment?: string;
}

export interface ActivityStats {
  capacity: number;
  registeredCount: number;
  waitlistCount: number;
  checkedInCount: number;
  cancelCount: number;
  noShowCount: number;
  attendanceRate: number;
  feedbackCount: number;
  avgRating: number;
}

export interface GlobalActivityStats {
  totalActivities: number;
  ongoingActivities: number;
  thisMonthActivities: number;
  totalRegistrations: number;
  avgAttendanceRate: number;
}

