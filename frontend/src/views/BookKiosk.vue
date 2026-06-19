<template>
  <div class="kiosk-page">
    <header class="kiosk-header">
      <div class="header-brand">
        <el-icon :size="28"><Notebook /></el-icon>
        <h1>扫码查书</h1>
      </div>
      <p class="header-subtitle">自助图书查询系统</p>
    </header>

    <div class="kiosk-body">
      <div class="search-section">
        <div class="isbn-input-wrapper">
          <el-input
            ref="isbnInputRef"
            v-model="isbnInput"
            placeholder="请输入或扫描 ISBN 号"
            size="large"
            clearable
            class="isbn-input"
            @keyup.enter="queryByIsbn"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
            <template #append>
              <el-button :loading="isbnLoading" @click="queryByIsbn">
                查询
              </el-button>
            </template>
          </el-input>
        </div>

        <div class="fuzzy-search-wrapper">
          <el-input
            v-model="fuzzyInput"
            placeholder="输入书名首字母或关键字快速检索"
            size="large"
            clearable
            class="fuzzy-input"
            @input="handleFuzzyInput"
          >
            <template #prefix>
              <el-icon><Compass /></el-icon>
            </template>
          </el-input>
          <div v-if="fuzzyResults.length > 0" class="fuzzy-dropdown">
            <div
              v-for="item in fuzzyResults"
              :key="item.id"
              class="fuzzy-item"
              @click="selectFuzzyResult(item)"
            >
              <span class="fuzzy-title">{{ item.title }}</span>
              <span class="fuzzy-author">{{ item.author }}</span>
              <el-tag size="small" :type="item.availableCount > 0 ? 'success' : 'danger'">
                {{ item.availableCount > 0 ? '可借' : '已借出' }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentBook" class="book-detail-card">
        <div class="book-main-info">
          <div class="book-cover">
            <img
              v-if="currentBook.coverUrl"
              :src="currentBook.coverUrl"
              alt="封面"
            />
            <div v-else class="cover-placeholder">
              <el-icon :size="64"><Notebook /></el-icon>
              <span>{{ currentBook.title.charAt(0) }}</span>
            </div>
          </div>

          <div class="book-info-list">
            <h2 class="book-title">{{ currentBook.title }}</h2>
            <div class="info-row">
              <el-icon><User /></el-icon>
              <span class="info-label">作者</span>
              <span class="info-value">{{ currentBook.author }}</span>
            </div>
            <div class="info-row">
              <el-icon><Collection /></el-icon>
              <span class="info-label">分类</span>
              <span class="info-value">{{ currentBook.category?.name || '-' }}</span>
            </div>
            <div class="info-row">
              <el-icon><Location /></el-icon>
              <span class="info-label">馆藏位置</span>
              <span class="info-value">{{ currentBook.location || '暂无位置信息' }}</span>
            </div>
            <div class="info-row">
              <el-icon><Box /></el-icon>
              <span class="info-label">ISBN</span>
              <span class="info-value mono">{{ currentBook.isbn }}</span>
            </div>
            <div class="info-row">
              <el-icon><Goods /></el-icon>
              <span class="info-label">总库存</span>
              <span class="info-value">{{ currentBook.stock }} 册</span>
            </div>
            <div class="info-row">
              <el-icon><Reading /></el-icon>
              <span class="info-label">在借</span>
              <span class="info-value">{{ currentBook.borrowedCount }} 册</span>
            </div>
          </div>
        </div>

        <div class="book-status-section">
          <div
            class="status-badge"
            :class="currentBook.availableCount > 0 ? 'status-available' : 'status-unavailable'"
          >
            <el-icon :size="32">
              <CircleCheck v-if="currentBook.availableCount > 0" />
              <CircleClose v-else />
            </el-icon>
            <div class="status-text">
              <span class="status-label">
                {{ currentBook.availableCount > 0 ? '可借' : '全部借出' }}
              </span>
              <span class="status-detail">
                {{ currentBook.availableCount > 0
                  ? `剩余 ${currentBook.availableCount} 册可借`
                  : `共 ${currentBook.stock} 册，均已借出`
                }}
              </span>
            </div>
          </div>

          <div v-if="currentBook.availableCount <= 0" class="unavailable-info">
            <div v-if="currentBook.earliestReturnDate" class="earliest-return">
              <el-icon><Clock /></el-icon>
              <span>预计最早可借日期：<strong>{{ formatDate(currentBook.earliestReturnDate) }}</strong></span>
            </div>
            <div v-if="currentBook.pendingReservations > 0" class="reservation-queue">
              <el-icon><UserFilled /></el-icon>
              <span>当前排队预约人数：<strong>{{ currentBook.pendingReservations }}</strong> 人</span>
            </div>
          </div>

          <div v-if="currentBook.description" class="book-description">
            <h4>简介</h4>
            <p>{{ currentBook.description }}</p>
          </div>
        </div>
      </div>

      <div v-if="notFound" class="not-found">
        <el-icon :size="64" color="#c0c4cc"><WarningFilled /></el-icon>
        <p>未找到该ISBN对应的图书</p>
        <span>请确认ISBN号是否正确后重试</span>
      </div>

      <div class="history-section">
        <div class="history-header">
          <h3>最近查询</h3>
          <el-button v-if="queryHistory.length > 0" link type="danger" @click="clearHistory">
            清空记录
          </el-button>
        </div>
        <div v-if="queryHistory.length === 0" class="history-empty">
          暂无查询记录
        </div>
        <div v-else class="history-list">
          <div
            v-for="item in queryHistory"
            :key="item.isbn"
            class="history-item"
            @click="quickQuery(item.isbn)"
          >
            <div class="history-cover">
              <img v-if="item.coverUrl" :src="item.coverUrl" alt="" />
              <span v-else class="history-cover-letter">{{ item.title.charAt(0) }}</span>
            </div>
            <div class="history-info">
              <span class="history-title">{{ item.title }}</span>
              <span class="history-isbn">{{ item.isbn }}</span>
            </div>
            <el-tag size="small" :type="item.available ? 'success' : 'danger'">
              {{ item.available ? '可借' : '已借出' }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { Search, Notebook, Compass, User, Collection, Location, Box, Goods, Reading, CircleCheck, CircleClose, Clock, UserFilled, WarningFilled } from '@element-plus/icons-vue';
import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 10000 });

interface BookDetail {
  id: number;
  title: string;
  author: string;
  isbn: string;
  coverUrl: string | null;
  location: string | null;
  stock: number;
  borrowedCount: number;
  availableCount: number;
  category: { id: number; name: string } | null;
  description: string | null;
  pendingReservations: number;
  earliestReturnDate: string | null;
}

interface FuzzyResult {
  id: number;
  title: string;
  author: string;
  isbn: string;
  coverUrl: string | null;
  location: string | null;
  stock: number;
  borrowedCount: number;
  availableCount: number;
  category: { id: number; name: string } | null;
}

interface HistoryItem {
  isbn: string;
  title: string;
  coverUrl: string | null;
  available: boolean;
  timestamp: number;
}

const isbnInput = ref('');
const fuzzyInput = ref('');
const isbnLoading = ref(false);
const currentBook = ref<BookDetail | null>(null);
const notFound = ref(false);
const fuzzyResults = ref<FuzzyResult[]>([]);
const queryHistory = ref<HistoryItem[]>([]);
const isbnInputRef = ref<any>(null);

let scannerTimer: ReturnType<typeof setTimeout> | null = null;
let scannerBuffer = '';

const pinyinMap: Record<string, string> = {
  'a': '阿啊', 'b': '吧比不必变本被', 'c': '才从此出成场城',
  'd': '大到地对当道得', 'e': '而二', 'f': '发方分非风复',
  'g': '个过高关故工公', 'h': '好会合回后红还', 'j': '就家进间机将几经',
  'k': '看开可口快空科', 'l': '了来里力理路两', 'm': '没明们面每名门',
  'n': '那你年能难南', 'p': '平品批评跑', 'q': '起其前情全去期',
  'r': '人然让如入日', 's': '是时上说生十三思', 't': '他她它同天通特',
  'w': '我无为问位万', 'x': '下些小新心想学行', 'y': '一有也用要以已于',
  'z': '在这中只着自之作正',
};

function getFirstPinyin(char: string): string {
  const code = char.charCodeAt(0);
  if (code < 0x4e00 || code > 0x9fff) return char.toLowerCase();
  for (const [initial, chars] of Object.entries(pinyinMap)) {
    if (chars.includes(char)) return initial;
  }
  return char.toLowerCase();
}

function getPinyinInitials(text: string): string {
  return text.split('').map(getFirstPinyin).join('');
}

function matchPinyinInitials(title: string, query: string): boolean {
  const initials = getPinyinInitials(title);
  const lowerTitle = title.toLowerCase();
  const lowerQuery = query.toLowerCase();
  return initials.startsWith(lowerQuery) || lowerTitle.includes(lowerQuery);
}

const queryByIsbn = async () => {
  const isbn = isbnInput.value.trim().replace(/[-\s]/g, '');
  if (!isbn) return;

  isbnLoading.value = true;
  notFound.value = false;
  currentBook.value = null;

  try {
    const res = await api.get(`/kiosk/isbn/${isbn}`);
    currentBook.value = res.data;
    addToHistory(res.data);
  } catch (error: any) {
    if (error.response?.status === 404) {
      notFound.value = true;
    }
  } finally {
    isbnLoading.value = false;
  }
};

const handleFuzzyInput = async () => {
  const q = fuzzyInput.value.trim();
  if (!q) {
    fuzzyResults.value = [];
    return;
  }

  try {
    const res = await api.get('/kiosk/search', { params: { q } });
    let results: FuzzyResult[] = res.data;

    if (results.length === 0 && /^[a-zA-Z]+$/.test(q)) {
      try {
        const allRes = await api.get('/kiosk/search', { params: { q: '' } });
        const allBooks: FuzzyResult[] = allRes.data;
        results = allBooks.filter((book) => matchPinyinInitials(book.title, q));
      } catch {
        results = [];
      }
    }

    fuzzyResults.value = results;
  } catch {
    fuzzyResults.value = [];
  }
};

const selectFuzzyResult = (item: FuzzyResult) => {
  isbnInput.value = item.isbn;
  fuzzyInput.value = '';
  fuzzyResults.value = [];
  queryByIsbn();
};

const quickQuery = (isbn: string) => {
  isbnInput.value = isbn;
  queryByIsbn();
};

const addToHistory = (book: BookDetail) => {
  const idx = queryHistory.value.findIndex((h) => h.isbn === book.isbn);
  if (idx !== -1) queryHistory.value.splice(idx, 1);

  queryHistory.value.unshift({
    isbn: book.isbn,
    title: book.title,
    coverUrl: book.coverUrl,
    available: book.availableCount > 0,
    timestamp: Date.now(),
  });

  if (queryHistory.value.length > 20) {
    queryHistory.value = queryHistory.value.slice(0, 20);
  }

  localStorage.setItem('kiosk_query_history', JSON.stringify(queryHistory.value));
};

const clearHistory = () => {
  queryHistory.value = [];
  localStorage.removeItem('kiosk_query_history');
};

const loadHistory = () => {
  try {
    const saved = localStorage.getItem('kiosk_query_history');
    if (saved) queryHistory.value = JSON.parse(saved);
  } catch {}
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const handleKeydown = (e: KeyboardEvent) => {
  if (document.activeElement === isbnInputRef.value?.input) return;

  if (e.key === 'Enter' && scannerBuffer.length >= 5) {
    isbnInput.value = scannerBuffer;
    scannerBuffer = '';
    queryByIsbn();
    return;
  }

  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    scannerBuffer += e.key;
    if (scannerTimer) clearTimeout(scannerTimer);
    scannerTimer = setTimeout(() => {
      scannerBuffer = '';
    }, 100);
  }
};

onMounted(() => {
  loadHistory();
  nextTick(() => {
    isbnInputRef.value?.focus();
  });
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  if (scannerTimer) clearTimeout(scannerTimer);
});
</script>

<style scoped lang="scss">
.kiosk-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.kiosk-header {
  text-align: center;
  padding: 28px 20px 16px;
  color: #fff;

  .header-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;

    h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 2px;
    }
  }

  .header-subtitle {
    margin: 6px 0 0;
    font-size: 14px;
    opacity: 0.8;
  }
}

.kiosk-body {
  flex: 1;
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding: 0 24px 40px;
}

.search-section {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;

  .isbn-input-wrapper {
    flex: 2;

    .isbn-input {
      :deep(.el-input__wrapper) {
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        font-size: 18px;
        height: 52px;
      }

      :deep(.el-input-group__append) {
        border-radius: 0 12px 12px 0;
        background: #409eff;
        color: #fff;
        border: none;
        padding: 0 20px;
        font-size: 16px;

        .el-button {
          color: #fff;
          font-weight: 600;
        }
      }
    }
  }

  .fuzzy-search-wrapper {
    flex: 1;
    position: relative;

    .fuzzy-input {
      :deep(.el-input__wrapper) {
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        font-size: 16px;
        height: 52px;
      }
    }

    .fuzzy-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.2);
      margin-top: 8px;
      z-index: 100;
      max-height: 320px;
      overflow-y: auto;

      .fuzzy-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        cursor: pointer;
        transition: background 0.2s;

        &:hover {
          background: #f0f2ff;
        }

        .fuzzy-title {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
          color: #303133;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .fuzzy-author {
          font-size: 12px;
          color: #909399;
          white-space: nowrap;
        }
      }
    }
  }
}

.book-detail-card {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.15);
  padding: 32px;
  animation: slideUp 0.4s ease;

  .book-main-info {
    display: flex;
    gap: 28px;
    margin-bottom: 24px;

    .book-cover {
      width: 180px;
      min-width: 180px;
      height: 250px;
      border-radius: 12px;
      overflow: hidden;
      background: #f0f2ff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .cover-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        color: #c0c4cc;

        span {
          font-size: 40px;
          font-weight: 700;
          color: #909399;
        }
      }
    }

    .book-info-list {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;

      .book-title {
        margin: 0 0 8px;
        font-size: 24px;
        font-weight: 700;
        color: #303133;
        line-height: 1.3;
      }

      .info-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        color: #606266;

        .el-icon {
          color: #909399;
          font-size: 16px;
        }

        .info-label {
          color: #909399;
          min-width: 64px;
        }

        .info-value {
          color: #303133;
          font-weight: 500;
        }

        .mono {
          font-family: 'Courier New', monospace;
          letter-spacing: 1px;
        }
      }
    }
  }

  .book-status-section {
    border-top: 1px solid #ebeef5;
    padding-top: 20px;

    .status-badge {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 16px;

      &.status-available {
        background: linear-gradient(135deg, #f0f9eb, #e1f3d8);

        .el-icon {
          color: #67c23a;
        }
      }

      &.status-unavailable {
        background: linear-gradient(135deg, #fef0f0, #fde2e2);

        .el-icon {
          color: #f56c6c;
        }
      }

      .status-text {
        display: flex;
        flex-direction: column;

        .status-label {
          font-size: 20px;
          font-weight: 700;
          color: #303133;
        }

        .status-detail {
          font-size: 14px;
          color: #909399;
          margin-top: 2px;
        }
      }
    }

    .unavailable-info {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
      padding: 16px 20px;
      background: #fdf6ec;
      border-radius: 12px;
      border-left: 4px solid #e6a23c;

      .earliest-return,
      .reservation-queue {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        color: #606266;

        .el-icon {
          color: #e6a23c;
        }

        strong {
          color: #e6a23c;
        }
      }
    }

    .book-description {
      h4 {
        margin: 0 0 8px;
        font-size: 16px;
        color: #303133;
      }

      p {
        margin: 0;
        font-size: 14px;
        color: #606266;
        line-height: 1.8;
      }
    }
  }
}

.not-found {
  text-align: center;
  padding: 60px 20px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.15);
  animation: slideUp 0.4s ease;

  p {
    font-size: 18px;
    color: #909399;
    margin: 16px 0 4px;
  }

  span {
    font-size: 14px;
    color: #c0c4cc;
  }
}

.history-section {
  margin-top: 24px;
  background: rgba(255,255,255,0.95);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  padding: 20px 24px;

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    h3 {
      margin: 0;
      font-size: 16px;
      color: #303133;
    }
  }

  .history-empty {
    text-align: center;
    padding: 20px;
    color: #c0c4cc;
    font-size: 14px;
  }

  .history-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    .history-item {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f5f7fa;
      border-radius: 10px;
      padding: 8px 14px;
      cursor: pointer;
      transition: all 0.2s;
      min-width: 220px;

      &:hover {
        background: #ecf0ff;
        transform: translateY(-1px);
      }

      .history-cover {
        width: 36px;
        height: 48px;
        border-radius: 4px;
        overflow: hidden;
        background: #dcdfe6;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .history-cover-letter {
          font-size: 16px;
          font-weight: 700;
          color: #909399;
        }
      }

      .history-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow: hidden;

        .history-title {
          font-size: 13px;
          font-weight: 500;
          color: #303133;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .history-isbn {
          font-size: 11px;
          color: #c0c4cc;
          font-family: 'Courier New', monospace;
        }
      }
    }
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .kiosk-header {
    padding: 20px 16px 12px;

    .header-brand h1 {
      font-size: 22px;
    }
  }

  .kiosk-body {
    padding: 0 12px 24px;
  }

  .search-section {
    flex-direction: column;
  }

  .book-detail-card {
    padding: 20px;
    border-radius: 16px;

    .book-main-info {
      flex-direction: column;
      align-items: center;

      .book-cover {
        width: 140px;
        min-width: 140px;
        height: 196px;
      }

      .book-info-list {
        width: 100%;

        .book-title {
          font-size: 20px;
          text-align: center;
        }
      }
    }
  }

  .history-list .history-item {
    min-width: 100%;
  }
}

@media (min-width: 1400px) {
  .kiosk-body {
    max-width: 1200px;
  }

  .book-detail-card .book-main-info {
    .book-cover {
      width: 220px;
      min-width: 220px;
      height: 300px;
    }

    .book-info-list .book-title {
      font-size: 28px;
    }
  }
}

@media (orientation: portrait) and (max-width: 600px) {
  .kiosk-header {
    padding: 16px 12px 8px;

    .header-brand {
      h1 {
        font-size: 20px;
      }

      .el-icon {
        font-size: 22px;
      }
    }

    .header-subtitle {
      font-size: 12px;
    }
  }

  .search-section {
    .isbn-input-wrapper .isbn-input {
      :deep(.el-input__wrapper) {
        font-size: 16px;
        height: 48px;
      }
    }

    .fuzzy-search-wrapper .fuzzy-input {
      :deep(.el-input__wrapper) {
        font-size: 14px;
        height: 48px;
      }
    }
  }

  .book-detail-card {
    padding: 16px;
    border-radius: 12px;

    .book-main-info .book-cover {
      width: 120px;
      min-width: 120px;
      height: 168px;
    }
  }
}
</style>
