<template>
  <div class="recommendations-container">
    <el-card shadow="hover">
      <div class="header-section">
        <h2 class="page-title">
          <el-icon :size="24" class="title-icon"><MagicStick /></el-icon>
          智能荐书
        </h2>
        <p class="page-subtitle">基于借阅历史、分类偏好与热门趋势，为您精准推荐</p>
      </div>

      <div class="filter-section">
        <div class="filter-row">
          <div class="filter-item">
            <label class="filter-label">选择借阅人</label>
            <el-select
              v-model="selectedBorrowerId"
              placeholder="请选择借阅人"
              style="width: 280px"
              clearable
              @change="handleBorrowerChange"
            >
              <el-option
                v-for="borrower in borrowers"
                :key="borrower.id"
                :label="borrower.name"
                :value="borrower.id"
              />
            </el-select>
          </div>

          <div class="filter-item">
            <label class="filter-label">推荐设置</label>
            <div class="checkbox-group">
              <el-checkbox v-model="excludeBorrowed">排除已借阅</el-checkbox>
              <el-checkbox v-model="excludeReserved">排除已预约</el-checkbox>
            </div>
          </div>

          <div class="filter-item actions">
            <el-button
              type="primary"
              :icon="Refresh"
              :loading="loading"
              :disabled="!selectedBorrowerId"
              @click="fetchRecommendations(true)"
            >
              换一批
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <div v-if="selectedBorrowerId && !loading && recommendations.length === 0" class="empty-state">
      <el-empty description="暂无推荐图书，试试调整筛选条件">
        <el-button type="primary" @click="fetchRecommendations(true)">重新推荐</el-button>
      </el-empty>
    </div>

    <div v-else-if="recommendations.length > 0" class="recommendations-grid">
      <el-card
        v-for="book in recommendations"
        :key="book.id"
        shadow="hover"
        class="book-card"
      >
        <div class="card-header">
          <div class="book-info">
            <h3 class="book-title">{{ book.title }}</h3>
            <p class="book-author">{{ book.author }}</p>
            <el-tag :type="getCategoryTagType()" size="small" class="category-tag">
              {{ book.category?.name }}
            </el-tag>
          </div>
          <div class="rating-section">
            <el-rate
              v-model="book.avgRating"
              disabled
              allow-half
              :max="5"
              :show-text="false"
              :colors="['#F7BA2A', '#F7BA2A', '#F7BA2A']"
            />
            <span class="rating-text">
              {{ book.avgRating > 0 ? book.avgRating.toFixed(1) : '暂无' }}
              <span v-if="book.ratingCount > 0">({{ book.ratingCount }}人评)</span>
            </span>
          </div>
        </div>

        <div class="card-stats">
          <div class="stat-item">
            <el-icon :size="18" color="#67c23a"><Box /></el-icon>
            <div class="stat-content">
              <span class="stat-label">库存</span>
              <span class="stat-value" :class="{ 'low-stock': book.stock <= 0 }">
                {{ book.stock }}
              </span>
            </div>
          </div>
          <div class="stat-item">
            <el-icon :size="18" color="#e6a23c"><Reading /></el-icon>
            <div class="stat-content">
              <span class="stat-label">在借</span>
              <span class="stat-value">{{ book.borrowedCount }}</span>
            </div>
          </div>
          <div class="stat-item">
            <el-icon :size="18" color="#409eff"><Star /></el-icon>
            <div class="stat-content">
              <span class="stat-label">评分</span>
              <span class="stat-value">{{ book.avgRating > 0 ? book.avgRating.toFixed(1) : '-' }}</span>
            </div>
          </div>
        </div>

        <div class="reason-section">
          <el-icon :size="16" color="#409eff"><Opportunity /></el-icon>
          <span class="reason-text">{{ book.reason }}</span>
        </div>

        <div class="card-actions">
          <el-button
            type="primary"
            :icon="ShoppingCartFull"
            :disabled="book.stock <= 0 || borrowingBookId === book.id"
            :loading="borrowingBookId === book.id"
            @click="handleBorrow(book)"
          >
            立即借阅
          </el-button>
          <el-button
            type="warning"
            :icon="Clock"
            :disabled="book.stock > 0 || reservingBookId === book.id"
            :loading="reservingBookId === book.id"
            @click="handleReserve(book)"
          >
            预约排队
          </el-button>
        </div>
      </el-card>
    </div>

    <div v-if="hasMore" class="load-more-section">
      <el-button
        type="primary"
        plain
        :loading="loadingMore"
        @click="loadMore"
      >
        加载更多推荐
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  MagicStick,
  Refresh,
  Box,
  Reading,
  Star,
  Opportunity,
  ShoppingCartFull,
  Clock,
} from '@element-plus/icons-vue';
import api from '../api';
import { ElMessage } from 'element-plus';
import type { RecommendedBook, RecommendationResponse } from '../types';

const borrowers = ref<any[]>([]);
const selectedBorrowerId = ref<number | null>(null);
const recommendations = ref<RecommendedBook[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const excludeBorrowed = ref(true);
const excludeReserved = ref(true);
const offset = ref(0);
const hasMore = ref(false);
const borrowingBookId = ref<number | null>(null);
const reservingBookId = ref<number | null>(null);

const fetchBorrowers = async () => {
  try {
    const res: any = await api.get('/borrowers');
    borrowers.value = res;
  } catch (error) {
    console.error('Failed to fetch borrowers:', error);
  }
};

const fetchRecommendations = async (refresh = false) => {
  if (!selectedBorrowerId.value) return;

  if (refresh) {
    offset.value = 0;
    recommendations.value = [];
  }

  loading.value = refresh;
  loadingMore.value = !refresh;

  try {
    const res: RecommendationResponse = await api.get(`/recommendations/${selectedBorrowerId.value}`, {
      params: {
        excludeBorrowed: excludeBorrowed.value,
        excludeReserved: excludeReserved.value,
        limit: 6,
        offset: offset.value,
      },
    });

    if (refresh) {
      recommendations.value = res.recommendations;
    } else {
      recommendations.value = [...recommendations.value, ...res.recommendations];
    }
    hasMore.value = res.hasMore;
    offset.value += 6;
  } catch (error) {
    ElMessage.error('获取推荐失败');
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const handleBorrowerChange = () => {
  offset.value = 0;
  recommendations.value = [];
  hasMore.value = false;
  if (selectedBorrowerId.value) {
    fetchRecommendations(true);
  }
};

const loadMore = () => {
  fetchRecommendations(false);
};

const handleBorrow = async (book: RecommendedBook) => {
  if (!selectedBorrowerId.value) {
    ElMessage.warning('请先选择借阅人');
    return;
  }

  borrowingBookId.value = book.id;
  try {
    await api.post('/borrows', {
      bookId: book.id,
      borrowerId: selectedBorrowerId.value,
    });
    ElMessage.success(`《${book.title}》借阅成功`);
    fetchRecommendations(true);
  } catch (error) {
    console.error('Borrow error:', error);
  } finally {
    borrowingBookId.value = null;
  }
};

const handleReserve = async (book: RecommendedBook) => {
  if (!selectedBorrowerId.value) {
    ElMessage.warning('请先选择借阅人');
    return;
  }

  reservingBookId.value = book.id;
  try {
    await api.post('/reservations', {
      bookId: book.id,
      borrowerId: selectedBorrowerId.value,
    });
    ElMessage.success(`《${book.title}》已加入预约队列`);
    fetchRecommendations(true);
  } catch (error) {
    console.error('Reserve error:', error);
  } finally {
    reservingBookId.value = null;
  }
};

const getCategoryTagType = () => {
  const types = ['primary', 'success', 'warning', 'info', 'danger'];
  return types[Math.floor(Math.random() * types.length)];
};

onMounted(() => {
  fetchBorrowers();
});
</script>

<style scoped lang="scss">
.recommendations-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header-section {
  text-align: center;
  margin-bottom: 20px;

  .page-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 24px;
    font-weight: 600;
    margin: 0;
    color: #303133;

    .title-icon {
      color: #409eff;
    }
  }

  .page-subtitle {
    color: #909399;
    margin: 8px 0 0;
    font-size: 14px;
  }
}

.filter-section {
  margin-bottom: 10px;

  .filter-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 24px;
  }

  .filter-item {
    display: flex;
    flex-direction: column;
    gap: 8px;

    &.actions {
      flex-direction: row;
      align-items: flex-end;
    }

    .filter-label {
      font-size: 14px;
      font-weight: 500;
      color: #606266;
    }

    .checkbox-group {
      display: flex;
      gap: 16px;
    }
  }
}

.empty-state {
  margin-top: 40px;
}

.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}

.book-card {
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;

    .book-info {
      flex: 1;

      .book-title {
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 4px;
        color: #303133;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .book-author {
        font-size: 14px;
        color: #909399;
        margin: 0 0 8px;
      }

      .category-tag {
        margin: 0;
      }
    }

    .rating-section {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;

      .rating-text {
        font-size: 12px;
        color: #909399;
      }
    }
  }

  .card-stats {
    display: flex;
    justify-content: space-around;
    padding: 16px 0;
    margin: 12px 0;
    border-top: 1px solid #ebeef5;
    border-bottom: 1px solid #ebeef5;

    .stat-item {
      display: flex;
      align-items: center;
      gap: 8px;

      .stat-content {
        display: flex;
        flex-direction: column;

        .stat-label {
          font-size: 12px;
          color: #909399;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 600;
          color: #303133;

          &.low-stock {
            color: #f56c6c;
          }
        }
      }
    }
  }

  .reason-section {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px;
    background: linear-gradient(135deg, #ecf5ff 0%, #d9ecff 100%);
    border-radius: 8px;
    margin-bottom: 16px;

    .reason-text {
      font-size: 13px;
      color: #409eff;
      line-height: 1.5;
    }
  }

  .card-actions {
    display: flex;
    gap: 12px;
    margin-top: auto;

    .el-button {
      flex: 1;
    }
  }
}

.load-more-section {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}
</style>
