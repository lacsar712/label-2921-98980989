import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api';
import type {
  Message,
  MessageTemplate,
  UnreadCount,
  MessageListResponse,
  MessageFilter,
  CreateMessageRequest,
} from '../types';

export const useMessageStore = defineStore('message', () => {
  const unreadCount = ref<UnreadCount>({
    total: 0,
    byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
  });
  const messages = ref<Message[]>([]);
  const total = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(20);
  const templates = ref<MessageTemplate[]>([]);
  const loading = ref(false);

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value));
  const hasUnread = computed(() => unreadCount.value.total > 0);
  const urgentCount = computed(() => unreadCount.value.byPriority.URGENT || 0);
  const highCount = computed(() => unreadCount.value.byPriority.HIGH || 0);

  async function fetchUnreadCount() {
    try {
      const res: UnreadCount = await api.get('/messages/unread-count');
      unreadCount.value = res;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }

  async function fetchMessages(filter: MessageFilter = {}) {
    loading.value = true;
    try {
      const params = {
        page: currentPage.value,
        pageSize: pageSize.value,
        ...filter,
      };
      const res: MessageListResponse = await api.get('/messages', { params });
      messages.value = res.data;
      total.value = res.total;
      currentPage.value = res.page;
      pageSize.value = res.pageSize;
    } finally {
      loading.value = false;
    }
  }

  async function markAsRead(messageId: number) {
    try {
      await api.post(`/messages/${messageId}/read`);
      const msg = messages.value.find((m) => m.messageId === messageId);
      if (msg && !msg.isRead) {
        msg.isRead = true;
        msg.readAt = new Date().toISOString();
        if (unreadCount.value.total > 0) {
          unreadCount.value.total--;
        }
        if (unreadCount.value.byPriority[msg.priority] > 0) {
          unreadCount.value.byPriority[msg.priority]--;
        }
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }

  async function markBatchAsRead(messageIds: number[]) {
    try {
      await api.post('/messages/read-batch', { messageIds });
      for (const id of messageIds) {
        const msg = messages.value.find((m) => m.messageId === id);
        if (msg && !msg.isRead) {
          msg.isRead = true;
          msg.readAt = new Date().toISOString();
        }
      }
      await fetchUnreadCount();
    } catch (error) {
      console.error('Failed to batch mark as read:', error);
    }
  }

  async function markAllAsRead() {
    try {
      await api.post('/messages/read-all');
      for (const msg of messages.value) {
        if (!msg.isRead) {
          msg.isRead = true;
          msg.readAt = new Date().toISOString();
        }
      }
      unreadCount.value = {
        total: 0,
        byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
      };
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }

  async function sendMessage(data: CreateMessageRequest) {
    const res: any = await api.post('/messages', data);
    return res;
  }

  async function fetchTemplates() {
    try {
      const res: MessageTemplate[] = await api.get('/messages/templates');
      templates.value = res;
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  }

  async function createTemplate(data: Partial<MessageTemplate>) {
    const res: MessageTemplate = await api.post('/messages/templates', data);
    templates.value.unshift(res);
    return res;
  }

  async function updateTemplate(id: number, data: Partial<MessageTemplate>) {
    const res: MessageTemplate = await api.put(`/messages/templates/${id}`, data);
    const index = templates.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      templates.value[index] = res;
    }
    return res;
  }

  async function deleteTemplate(id: number) {
    await api.delete(`/messages/templates/${id}`);
    templates.value = templates.value.filter((t) => t.id !== id);
  }

  function setPage(page: number) {
    currentPage.value = page;
  }

  function setPageSize(size: number) {
    pageSize.value = size;
    currentPage.value = 1;
  }

  function reset() {
    messages.value = [];
    total.value = 0;
    currentPage.value = 1;
  }

  return {
    unreadCount,
    messages,
    total,
    currentPage,
    pageSize,
    templates,
    loading,
    totalPages,
    hasUnread,
    urgentCount,
    highCount,
    fetchUnreadCount,
    fetchMessages,
    markAsRead,
    markBatchAsRead,
    markAllAsRead,
    sendMessage,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setPage,
    setPageSize,
    reset,
  };
});
