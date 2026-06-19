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
