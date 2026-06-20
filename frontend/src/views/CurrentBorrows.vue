<template>
  <div class="current-borrows-container">
    <el-card shadow="hover">
      <template #header>
        <div class="header-actions">
          <h3>当前借阅信息</h3>
          <div class="search-box">
            <el-input
              v-model="searchQuery"
              placeholder="搜索书名、作者、借阅人"
              :prefix-icon="Search"
              clearable
              style="width: 250px; margin-right: 12px"
            />
            <el-select
              v-model="selectedCategory"
              placeholder="按分类筛选"
              clearable
              style="width: 180px"
              @change="handleFilter"
            >
              <el-option
                label="全部分类"
                value=""
              />
              <el-option
                v-for="cat in categories"
                :key="cat.id"
                :label="cat.name"
                :value="cat.name"
              />
            </el-select>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="filteredBorrows"
        style="width: 100%"
        border
        stripe
        :default-sort="{ prop: 'borrowDate', order: 'descending' }"
      >
        <el-table-column
          prop="book.title"
          label="书名"
          min-width="150"
        >
          <template #default="{ row }">
            <el-text
              type="primary"
              style="font-weight: 500"
            >
              {{ row.book.title }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column
          prop="book.author"
          label="作者"
          width="120"
        />
        <el-table-column
          prop="book.isbn"
          label="ISBN"
          width="130"
        />
        <el-table-column
          prop="book.category.name"
          label="分类"
          width="120"
        >
          <template #default="{ row }">
            <el-tag size="small">
              {{ row.book.category.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="book.price"
          label="价格"
          width="80"
        >
          <template #default="{ row }">
            ¥{{ row.book.price }}
          </template>
        </el-table-column>
        <el-table-column
          prop="borrower.name"
          label="借阅人"
          width="120"
        >
          <template #default="{ row }">
            <el-avatar
              :size="24"
              style="margin-right: 8px"
            />
            {{ row.borrower.name }}
          </template>
        </el-table-column>
        <el-table-column
          prop="borrowDate"
          label="借阅时间"
          width="180"
          sortable
        >
          <template #default="{ row }">
            {{ formatDate(row.borrowDate) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="borrowDays"
          label="借阅天数"
          width="100"
          sortable
        >
          <template #default="{ row }">
            <el-tag :type="getDaysTagType(getBorrowDays(row.borrowDate))">
              {{ getBorrowDays(row.borrowDate) }} 天
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="120"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="handleReturn(row)"
            >
              归还
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div
        v-if="!loading && filteredBorrows.length === 0"
        class="empty-state"
      >
        <el-empty description="暂无借阅记录" />
      </div>
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="借阅详情"
      width="700px"
    >
      <el-descriptions
        v-if="selectedBorrow"
        :column="2"
        border
      >
        <el-descriptions-item label="书名">
          {{ selectedBorrow.book.title }}
        </el-descriptions-item>
        <el-descriptions-item label="作者">
          {{ selectedBorrow.book.author }}
        </el-descriptions-item>
        <el-descriptions-item label="ISBN">
          {{ selectedBorrow.book.isbn }}
        </el-descriptions-item>
        <el-descriptions-item label="分类">
          {{ selectedBorrow.book.category.name }}
        </el-descriptions-item>
        <el-descriptions-item label="价格">
          ¥{{ selectedBorrow.book.price }}
        </el-descriptions-item>
        <el-descriptions-item label="库存">
          {{ selectedBorrow.book.stock }}
        </el-descriptions-item>
        <el-descriptions-item
          label="借阅人"
          :span="2"
        >
          {{ selectedBorrow.borrower.name }}
        </el-descriptions-item>
        <el-descriptions-item
          label="借阅时间"
          :span="2"
        >
          {{ formatDate(selectedBorrow.borrowDate) }}
        </el-descriptions-item>
        <el-descriptions-item
          label="借阅天数"
          :span="2"
        >
          {{ getBorrowDays(selectedBorrow.borrowDate) }} 天
        </el-descriptions-item>
        <el-descriptions-item
          v-if="selectedBorrow.book.description"
          label="图书简介"
          :span="2"
        >
          {{ selectedBorrow.book.description }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Search } from '@element-plus/icons-vue';
import api from '../api';
import { useBorrowList } from '../composables/useBorrowList';

const categories = ref<any[]>([]);
const selectedCategory = ref('');
const detailDialogVisible = ref(false);
const selectedBorrow = ref<any>(null);

const extraFilter = (item: any) => {
  if (!selectedCategory.value) return true;
  return item.book.category.name === selectedCategory.value;
};

const {
  loading,
  searchQuery,
  filteredBorrows,
  fetchBorrows,
  handleReturn,
  formatDate
} = useBorrowList({
  fetchEndpoint: '/borrows/current',
  searchFields: ['book.title', 'book.author', 'borrower.name'],
  confirmReturn: true,
  extraFilter
});

const fetchCategories = async () => {
  try {
    const res: any = await api.get('/categories');
    categories.value = res;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
  }
};

const handleFilter = () => {
};

const getBorrowDays = (borrowDate: string) => {
  const borrow = new Date(borrowDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - borrow.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const getDaysTagType = (days: number) => {
  if (days <= 7) return 'success';
  if (days <= 30) return 'warning';
  return 'danger';
};

onMounted(() => {
  fetchCategories();
});
</script>

<style scoped lang="scss">
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  h3 { margin: 0; }
}

.search-box {
  display: flex;
  align-items: center;
}

.empty-state {
  padding: 60px 0;
}
</style>
