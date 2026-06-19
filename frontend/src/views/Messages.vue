<template>
  <div class="message-center">
    <el-card class="page-header-card" shadow="never">
      <div class="header-content">
        <div class="header-left">
          <h2 class="page-title">消息中心</h2>
          <div class="stats-row">
            <el-tag
              size="large"
              effect="plain"
              type="danger"
              class="stat-tag"
            >
              未读消息：{{ messageStore.unreadCount.total }}
            </el-tag>
            <el-tag
              v-for="(label, key) in PRIORITY_LABELS"
              :key="key"
              size="large"
              effect="plain"
              :type="PRIORITY_TAGS[key as PriorityLevel]"
              class="stat-tag"
            >
              {{ label }}：{{ messageStore.unreadCount.byPriority[key as PriorityLevel] || 0 }}
            </el-tag>
          </div>
        </div>
        <div class="header-right">
          <el-button
            v-if="selectedIds.length > 0"
            type="primary"
            plain
            @click="handleBatchRead"
          >
            标记选中已读 ({{ selectedIds.length }})
          </el-button>
          <el-button
            v-if="messageStore.hasUnread"
            type="success"
            plain
            @click="handleMarkAllRead"
          >
            全部标记已读
          </el-button>
          <el-button
            v-if="userStore.isAdmin"
            type="primary"
            @click="showComposeDialog = true"
          >
            <el-icon><Edit /></el-icon>
            撰写消息
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="filter-card" shadow="never">
      <el-form
        :model="filterForm"
        inline
        class="filter-form"
      >
        <el-form-item label="消息类型">
          <el-select
            v-model="filterForm.type"
            placeholder="全部类型"
            clearable
            style="width: 160px"
            @change="handleFilterChange"
          >
            <el-option
              v-for="(label, value) in MESSAGE_TYPE_LABELS"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="优先级">
          <el-select
            v-model="filterForm.priority"
            placeholder="全部优先级"
            clearable
            style="width: 140px"
            @change="handleFilterChange"
          >
            <el-option
              v-for="(label, value) in PRIORITY_LABELS"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="阅读状态">
          <el-select
            v-model="filterForm.isRead"
            placeholder="全部状态"
            clearable
            style="width: 140px"
            @change="handleFilterChange"
          >
            <el-option label="未读" :value="false" />
            <el-option label="已读" :value="true" />
          </el-select>
        </el-form-item>

        <el-form-item label="发送时间">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 280px"
            @change="handleDateChange"
          />
        </el-form-item>

        <el-form-item label="关键字">
          <el-input
            v-model="filterForm.keyword"
            placeholder="搜索标题或内容"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="message-list-card" shadow="never">
      <el-table
        v-loading="messageStore.loading"
        :data="messageStore.messages"
        @selection-change="handleSelectionChange"
        style="width: 100%"
        :row-class-name="tableRowClassName"
      >
        <el-table-column
          type="selection"
          width="50"
          align="center"
          :selectable="(row) => !row.isRead"
        />
        <el-table-column label="优先级" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="PRIORITY_TAGS[row.priority]"
              effect="light"
              round
            >
              {{ PRIORITY_LABELS[row.priority] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="110" align="center">
          <template #default="{ row }">
            <el-tag
              size="small"
              effect="plain"
              :style="{
                borderColor: MESSAGE_TYPE_COLORS[row.type],
                color: MESSAGE_TYPE_COLORS[row.type]
              }"
            >
              {{ MESSAGE_TYPE_LABELS[row.type] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <span
              v-if="!row.isRead"
              class="unread-dot"
            />
            <span v-else style="color: #909399; font-size: 12px">已读</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="title"
          label="标题"
          min-width="240"
        >
          <template #default="{ row }">
            <span
              class="title-text"
              :class="{ 'is-unread': !row.isRead }"
              @click="handleViewMessage(row)"
            >
              {{ row.title }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          prop="content"
          label="内容预览"
          min-width="280"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span class="content-preview">{{ row.content }}</span>
          </template>
        </el-table-column>
        <el-table-column label="发送人" width="120" align="center">
          <template #default="{ row }">
            {{ row.sender?.username || '系统' }}
          </template>
        </el-table-column>
        <el-table-column
          prop="createdAt"
          label="发送时间"
          width="170"
          align="center"
          sortable
        >
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="已读时间"
          width="170"
          align="center"
        >
          <template #default="{ row }">
            {{ row.readAt ? formatDateTime(row.readAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="handleViewMessage(row)"
            >
              查看
            </el-button>
            <el-button
              v-if="!row.isRead"
              link
              type="success"
              @click="handleMarkOneRead(row)"
            >
              已读
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="messageStore.currentPage"
          v-model:page-size="messageStore.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="messageStore.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 消息详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="消息详情"
      width="600px"
      @close="detailMessage = null"
    >
      <div v-if="detailMessage" class="message-detail">
        <div class="detail-header">
          <div class="detail-tags">
            <el-tag :type="PRIORITY_TAGS[detailMessage.priority]" effect="light">
              {{ PRIORITY_LABELS[detailMessage.priority] }}
            </el-tag>
            <el-tag
              effect="plain"
              :style="{
                borderColor: MESSAGE_TYPE_COLORS[detailMessage.type],
                color: MESSAGE_TYPE_COLORS[detailMessage.type]
              }"
            >
              {{ MESSAGE_TYPE_LABELS[detailMessage.type] }}
            </el-tag>
            <el-tag v-if="detailMessage.isRead" type="info" effect="plain">已读</el-tag>
            <el-tag v-else type="danger" effect="plain">未读</el-tag>
          </div>
          <h3 class="detail-title">{{ detailMessage.title }}</h3>
          <div class="detail-meta">
            <span>发送人：{{ detailMessage.sender?.username || '系统' }}</span>
            <span>发送时间：{{ formatDateTime(detailMessage.createdAt) }}</span>
            <span v-if="detailMessage.readAt">已读时间：{{ formatDateTime(detailMessage.readAt) }}</span>
          </div>
        </div>
        <el-divider />
        <div class="detail-content">
          {{ detailMessage.content }}
        </div>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">
          关闭
        </el-button>
        <el-button
          v-if="detailMessage && !detailMessage.isRead"
          type="primary"
          @click="handleMarkOneRead(detailMessage)"
        >
          标记已读
        </el-button>
      </template>
    </el-dialog>

    <!-- 撰写消息弹窗 -->
    <ComposeMessage
      v-model="showComposeDialog"
      @success="handleComposeSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Edit,
  Search,
  RefreshRight,
} from '@element-plus/icons-vue';
import { useMessageStore } from '../store/message';
import { useUserStore } from '../store/user';
import ComposeMessage from '../components/ComposeMessage.vue';
import {
  MESSAGE_TYPE_LABELS,
  MESSAGE_TYPE_COLORS,
  PRIORITY_LABELS,
  PRIORITY_TAGS,
} from '../types';
import type { Message, PriorityLevel, MessageType, MessageFilter } from '../types';

const messageStore = useMessageStore();
const userStore = useUserStore();

const selectedIds = ref<number[]>([]);
const detailDialogVisible = ref(false);
const detailMessage = ref<Message | null>(null);
const showComposeDialog = ref(false);
const dateRange = ref<string[]>([]);

const filterForm = reactive<{
  type?: MessageType;
  priority?: PriorityLevel;
  isRead?: boolean;
  keyword?: string;
}>({
  type: undefined,
  priority: undefined,
  isRead: undefined,
  keyword: undefined,
});

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const tableRowClassName = ({ row }: { row: Message }) => {
  return !row.isRead ? 'unread-row' : '';
};

const buildFilter = (): MessageFilter => ({
  ...filterForm,
  startDate: dateRange.value?.[0],
  endDate: dateRange.value?.[1],
});

const loadMessages = async () => {
  const filter = buildFilter();
  await messageStore.fetchMessages(filter);
};

const handleFilterChange = () => {
  messageStore.setPage(1);
  loadMessages();
};

const handleDateChange = () => {
  messageStore.setPage(1);
  loadMessages();
};

const handleSearch = () => {
  messageStore.setPage(1);
  loadMessages();
};

const handleReset = () => {
  filterForm.type = undefined;
  filterForm.priority = undefined;
  filterForm.isRead = undefined;
  filterForm.keyword = undefined;
  dateRange.value = [];
  messageStore.setPage(1);
  messageStore.setPageSize(20);
  loadMessages();
};

const handlePageChange = (page: number) => {
  messageStore.setPage(page);
  loadMessages();
};

const handlePageSizeChange = (size: number) => {
  messageStore.setPageSize(size);
  loadMessages();
};

const handleSelectionChange = (selection: Message[]) => {
  selectedIds.value = selection.map((m) => m.messageId);
};

const handleViewMessage = async (msg: Message) => {
  detailMessage.value = msg;
  detailDialogVisible.value = true;
  if (!msg.isRead) {
    await messageStore.markAsRead(msg.messageId);
    if (detailMessage.value) {
      detailMessage.value.isRead = true;
      detailMessage.value.readAt = new Date().toISOString();
    }
  }
};

const handleMarkOneRead = async (msg: Message) => {
  await messageStore.markAsRead(msg.messageId);
  ElMessage.success('已标记为已读');
  await messageStore.fetchUnreadCount();
};

const handleBatchRead = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请先选择消息');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确定要将选中的 ${selectedIds.value.length} 条消息标记为已读吗？`,
      '确认操作',
      { type: 'warning' }
    );
    await messageStore.markBatchAsRead(selectedIds.value);
    ElMessage.success('批量标记已读成功');
    await loadMessages();
    selectedIds.value = [];
  } catch (_) {}
};

const handleMarkAllRead = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要将所有消息标记为已读吗？',
      '确认操作',
      { type: 'warning' }
    );
    await messageStore.markAllAsRead();
    ElMessage.success('已全部标记为已读');
    await loadMessages();
  } catch (_) {}
};

const handleComposeSuccess = () => {
  ElMessage.success('消息发送成功');
  loadMessages();
};

onMounted(async () => {
  await messageStore.fetchUnreadCount();
  await loadMessages();
});
</script>

<style scoped lang="scss">
.message-center {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .page-header-card {
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;

      .header-left {
        .page-title {
          margin: 0 0 12px;
          font-size: 22px;
          font-weight: 600;
          color: #303133;
        }

        .stats-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;

          .stat-tag {
            font-size: 13px;
          }
        }
      }

      .header-right {
        display: flex;
        gap: 10px;
      }
    }
  }

  .filter-card {
    .filter-form {
      margin-bottom: 0;
    }
  }

  .message-list-card {
    .title-text {
      cursor: pointer;
      transition: color 0.2s;

      &:hover {
        color: #409eff;
      }

      &.is-unread {
        font-weight: 600;
      }
    }

    .content-preview {
      color: #606266;
      font-size: 13px;
    }

    .unread-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      background-color: #f56c6c;
      border-radius: 50%;
    }

    :deep(.unread-row) {
      background-color: #f0f9ff;

      &:hover > td {
        background-color: #e6f4ff !important;
      }
    }

    .pagination-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }
  }

  .message-detail {
    .detail-header {
      .detail-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 16px;
      }

      .detail-title {
        margin: 0 0 12px;
        font-size: 18px;
        font-weight: 600;
        color: #303133;
      }

      .detail-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 13px;
        color: #909399;
      }
    }

    .detail-content {
      padding: 12px;
      background-color: #fafafa;
      border-radius: 6px;
      font-size: 14px;
      line-height: 1.8;
      color: #303133;
      white-space: pre-wrap;
    }
  }
}
</style>
