<template>
  <el-popover
    ref="popoverRef"
    placement="bottom-end"
    :width="380"
    trigger="click"
    popper-class="message-popover"
  >
    <template #reference>
      <div class="message-icon-wrapper" @click="handleIconClick">
        <el-badge
          :value="messageStore.unreadCount.total"
          :max="99"
          :hidden="!messageStore.hasUnread"
          :class="badgeClass"
        >
          <el-icon class="message-icon" :size="22">
            <Bell />
          </el-icon>
        </el-badge>
      </div>
    </template>

    <div class="message-dropdown">
      <div class="dropdown-header">
        <span class="title">消息通知</span>
        <el-link
          v-if="messageStore.hasUnread"
          type="primary"
          :underline="false"
          @click="handleMarkAllRead"
        >
          全部已读
        </el-link>
      </div>

      <div class="priority-summary" v-if="messageStore.hasUnread">
        <div
          v-for="(label, key) in PRIORITY_LABELS"
          :key="key"
          class="priority-item"
        >
          <span
            class="priority-dot"
            :style="{ backgroundColor: PRIORITY_COLORS[key as PriorityLevel] }"
          />
          <span class="priority-label">{{ label }}</span>
          <span class="priority-count">
            {{ messageStore.unreadCount.byPriority[key as PriorityLevel] || 0 }}
          </span>
        </div>
      </div>

      <el-divider class="divider" />

      <div class="message-list" v-loading="loading">
        <el-empty
          v-if="!loading && recentMessages.length === 0"
          description="暂无消息"
          :image-size="60"
        />
        <div
          v-for="msg in recentMessages"
          :key="msg.id"
          class="message-item"
          :class="{ unread: !msg.isRead }"
          @click="handleMessageClick(msg)"
        >
          <div class="message-left">
            <span
              class="priority-indicator"
              :style="{ backgroundColor: PRIORITY_COLORS[msg.priority] }"
            />
          </div>
          <div class="message-content">
            <div class="message-title-row">
              <span class="message-title" :class="{ 'has-unread': !msg.isRead }">
                {{ msg.title }}
              </span>
              <el-tag
                size="small"
                :type="PRIORITY_TAGS[msg.priority]"
                effect="light"
                round
              >
                {{ PRIORITY_LABELS[msg.priority] }}
              </el-tag>
            </div>
            <p class="message-preview">{{ msg.content }}</p>
            <div class="message-meta">
              <el-tag
                size="small"
                effect="plain"
                :style="{ borderColor: MESSAGE_TYPE_COLORS[msg.type], color: MESSAGE_TYPE_COLORS[msg.type] }"
              >
                {{ MESSAGE_TYPE_LABELS[msg.type] }}
              </el-tag>
              <span class="message-time">{{ formatTime(msg.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <el-divider class="divider" />

      <div class="dropdown-footer">
        <el-button type="primary" link @click="goToMessageCenter">
          查看全部消息
          <el-icon class="el-icon--right"><ArrowRight /></el-icon>
        </el-button>
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Bell, ArrowRight } from '@element-plus/icons-vue';
import { useMessageStore } from '../store/message';
import {
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_TAGS,
  MESSAGE_TYPE_LABELS,
  MESSAGE_TYPE_COLORS,
} from '../types';
import type { PriorityLevel, Message } from '../types';

const router = useRouter();
const messageStore = useMessageStore();
const popoverRef = ref();
const loading = ref(false);
const recentMessages = ref<Message[]>([]);

const badgeClass = computed(() => {
  if (messageStore.urgentCount > 0) return 'badge-urgent';
  if (messageStore.highCount > 0) return 'badge-high';
  return '';
});

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
};

const handleIconClick = async () => {
  loading.value = true;
  try {
    await messageStore.fetchMessages({ page: 1, pageSize: 5 });
    recentMessages.value = [...messageStore.messages];
  } finally {
    loading.value = false;
  }
};

const handleMessageClick = async (msg: Message) => {
  if (!msg.isRead) {
    await messageStore.markAsRead(msg.messageId);
  }
  popoverRef.value?.hide();
  router.push('/messages');
};

const handleMarkAllRead = async () => {
  await messageStore.markAllAsRead();
  ElMessage.success('已全部标记为已读');
};

const goToMessageCenter = () => {
  popoverRef.value?.hide();
  router.push('/messages');
};

let refreshTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  await messageStore.fetchUnreadCount();
  refreshTimer = setInterval(() => {
    messageStore.fetchUnreadCount();
  }, 30000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});
</script>

<style scoped lang="scss">
.message-icon-wrapper {
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: #f5f7fa;
  }
}

.message-icon {
  color: #606266;

  &:hover {
    color: #409eff;
  }
}

:deep(.badge-urgent .el-badge__content) {
  background-color: #f56c6c !important;
}

:deep(.badge-high .el-badge__content) {
  background-color: #e6a23c !important;
}
</style>

<style lang="scss">
.message-popover {
  padding: 0 !important;
  border-radius: 8px !important;
  overflow: hidden;
}

.message-dropdown {
  .dropdown-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px 12px;

    .title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }
  }

  .priority-summary {
    display: flex;
    padding: 0 20px 12px;
    gap: 16px;

    .priority-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #606266;

      .priority-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      .priority-label {
        color: #909399;
      }

      .priority-count {
        font-weight: 600;
        color: #303133;
      }
    }
  }

  .divider {
    margin: 0;
  }

  .message-list {
    max-height: 360px;
    overflow-y: auto;
  }

  .message-item {
    display: flex;
    padding: 14px 20px;
    cursor: pointer;
    transition: background-color 0.2s;
    border-bottom: 1px solid #f5f7fa;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background-color: #fafafa;
    }

    &.unread {
      background-color: #f0f9ff;

      &:hover {
        background-color: #e6f4ff;
      }
    }

    .message-left {
      padding-right: 12px;
      padding-top: 4px;

      .priority-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
    }

    .message-content {
      flex: 1;
      min-width: 0;

      .message-title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;

        .message-title {
          flex: 1;
          font-size: 14px;
          color: #303133;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          &.has-unread {
            font-weight: 600;
          }
        }
      }

      .message-preview {
        margin: 0 0 8px;
        font-size: 13px;
        color: #606266;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .message-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;

        .message-time {
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }

  .dropdown-footer {
    padding: 12px 20px;
    text-align: center;
    border-top: 1px solid #f5f7fa;
  }
}
</style>
