<template>
  <div class="my-activities-container">
    <el-card class="user-info-card" shadow="never">
      <div class="user-info-header">
        <div class="user-select-wrapper">
          <span class="user-select-label">选择读者：</span>
          <el-select
            v-model="selectedBorrowerId"
            placeholder="请选择读者"
            style="width: 260px"
            :loading="borrowerLoading"
            @change="handleBorrowerChange"
          >
            <el-option
              v-for="borrower in borrowers"
              :key="borrower.id"
              :label="borrower.name"
              :value="borrower.id"
            >
              <span>{{ borrower.name }}</span>
              <span style="float: right; color: #909399; font-size: 13px">
                {{ borrower.phone || '' }}
              </span>
            </el-option>
          </el-select>
        </div>
      </div>

      <div v-if="selectedBorrowerId && activityStats" class="stats-row">
        <div class="stat-item">
          <div class="stat-value stat-registered">{{ activityStats.registered }}</div>
          <div class="stat-label">已报名活动</div>
        </div>
        <div class="stat-item">
          <div class="stat-value stat-attended">{{ activityStats.attended }}</div>
          <div class="stat-label">已出席活动</div>
        </div>
        <div class="stat-item">
          <div class="stat-value stat-waitlist">{{ activityStats.waitlist }}</div>
          <div class="stat-label">候补中活动</div>
        </div>
        <div class="stat-item">
          <div class="stat-value stat-cancelled">{{ activityStats.cancelled }}</div>
          <div class="stat-label">已取消活动</div>
        </div>
      </div>
    </el-card>

    <el-card class="activity-hall-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">可报名活动</span>
          <div class="filter-wrapper">
            <el-select
              v-model="filterForm.type"
              placeholder="全部类型"
              clearable
              style="width: 140px"
              @change="handleFilterChange"
            >
              <el-option
                v-for="(label, value) in ACTIVITY_TYPE_LABELS"
                :key="value"
                :label="label"
                :value="value"
              />
            </el-select>
            <el-input
              v-model="filterForm.keyword"
              placeholder="搜索活动名称"
              clearable
              style="width: 220px; margin-left: 12px"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" style="margin-left: 12px" @click="handleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button style="margin-left: 8px" @click="handleReset">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </div>
        </div>
      </template>

      <div v-loading="activityLoading" class="activity-list-wrapper">
        <el-row :gutter="20">
          <el-col
            v-for="activity in activityList"
            :key="activity.id"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="8"
            :xl="6"
          >
            <div class="activity-card">
              <div class="activity-cover">
                <img
                  v-if="activity.coverUrl"
                  :src="activity.coverUrl"
                  :alt="activity.title"
                />
                <div v-else class="cover-placeholder">
                  <el-icon :size="48" color="#c0c4cc"><Picture /></el-icon>
                </div>
                <div class="activity-tags">
                  <el-tag
                    size="small"
                    effect="dark"
                    :style="{ backgroundColor: ACTIVITY_TYPE_COLORS[activity.type] }"
                  >
                    {{ ACTIVITY_TYPE_LABELS[activity.type] }}
                  </el-tag>
                  <el-tag
                    size="small"
                    effect="dark"
                    :type="ACTIVITY_STATUS_TAGS[activity.status]"
                  >
                    {{ ACTIVITY_STATUS_LABELS[activity.status] }}
                  </el-tag>
                </div>
              </div>
              <div class="activity-content">
                <el-link
                  type="primary"
                  class="activity-title"
                  :underline="false"
                  @click="handleViewActivity(activity.id)"
                >
                  {{ activity.title }}
                </el-link>

                <div class="activity-meta">
                  <div class="meta-item">
                    <el-icon color="#909399"><Clock /></el-icon>
                    <span>{{ formatDate(activity.startTime) }}</span>
                  </div>
                  <div class="meta-item">
                    <el-icon color="#909399"><LocationFilled /></el-icon>
                    <span>{{ activity.location }}</span>
                  </div>
                </div>

                <div class="capacity-section">
                  <div class="capacity-header">
                    <span class="capacity-label">名额情况</span>
                    <span
                      class="capacity-count"
                      :class="{ 'capacity-warning': getRemaining(activity) <= 3, 'capacity-full': getRemaining(activity) <= 0 }"
                    >
                      剩余 {{ getRemaining(activity) }} / {{ activity.capacity }}
                    </span>
                  </div>
                  <el-progress
                    :percentage="getCapacityPercentage(activity)"
                    :stroke-width="8"
                    :color="getProgressColor(activity)"
                  />
                  <div
                    v-if="activity.waitlistCount && activity.waitlistCount > 0 && getRemaining(activity) <= 0"
                    class="waitlist-info"
                  >
                    候补队列：{{ activity.waitlistCount }} 人
                  </div>
                </div>

                <div class="countdown-section">
                  <el-icon color="#e6a23c"><Timer /></el-icon>
                  <span>报名截止：{{ getCountdown(activity.deadline) }}</span>
                </div>

                <div
                  v-if="getRemaining(activity) <= 3 && getRemaining(activity) > 0"
                  class="low-capacity-alert"
                >
                  <el-alert type="error" :closable="false" show-icon>
                    名额紧张，仅剩 {{ getRemaining(activity) }} 个名额！
                  </el-alert>
                </div>

                <div class="action-buttons">
                  <template v-if="!selectedBorrowerId">
                    <el-button type="info" disabled style="width: 100%">请先选择读者</el-button>
                  </template>
                  <template v-else-if="getUserRegistrationStatus(activity.id) === 'REGISTERED'">
                    <el-button type="success" disabled style="flex: 1">已报名</el-button>
                    <el-button type="danger" plain @click="handleCancelDialog(activity)">取消报名</el-button>
                  </template>
                  <template v-else-if="getUserRegistrationStatus(activity.id) === 'WAITLIST'">
                    <el-button type="warning" disabled style="flex: 1">
                      候补第{{ getUserQueuePosition(activity.id) }}位
                    </el-button>
                    <el-button type="danger" plain @click="handleCancelDialog(activity)">取消候补</el-button>
                  </template>
                  <template v-else>
                    <el-button
                      v-if="getRemaining(activity) > 0"
                      type="primary"
                      style="width: 100%"
                      :loading="registerLoadingMap[activity.id]"
                      @click="handleRegister(activity)"
                    >
                      立即报名
                    </el-button>
                    <el-button
                      v-else
                      type="warning"
                      style="width: 100%"
                      :loading="registerLoadingMap[activity.id]"
                      @click="handleRegister(activity)"
                    >
                      加入候补
                    </el-button>
                  </template>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>

        <div v-if="!activityLoading && activityList.length === 0" class="empty-state">
          <el-empty description="暂无可报名活动" />
        </div>

        <div v-if="activityList.length > 0" class="pagination-wrapper">
          <el-pagination
            v-model:current-page="activityPage"
            v-model:page-size="activityPageSize"
            :page-sizes="[8, 12, 16, 24]"
            :total="activityTotal"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handleActivityPageSizeChange"
            @current-change="handleActivityPageChange"
          />
        </div>
      </div>
    </el-card>

    <el-card class="my-registrations-card" shadow="never">
      <template #header>
        <span class="card-title">我的报名</span>
      </template>

      <div v-loading="registrationLoading">
        <el-tabs v-model="activeTab" type="card" @tab-change="handleTabChange">
          <el-tab-pane label="全部" name="all" />
          <el-tab-pane label="待参加" name="upcoming" />
          <el-tab-pane label="候补" name="waitlist" />
          <el-tab-pane label="已完成" name="completed" />
          <el-tab-pane label="已取消" name="cancelled" />
        </el-tabs>

        <el-table :data="filteredRegistrations" style="width: 100%" border stripe>
          <el-table-column label="活动标题" min-width="220">
            <template #default="{ row }">
              <el-link type="primary" :underline="false" @click="handleViewActivity(row.activityId)">
                {{ row.activity?.title }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="100" align="center">
            <template #default="{ row }">
              <el-tag
                v-if="row.activity"
                size="small"
                effect="plain"
                :style="{
                  borderColor: ACTIVITY_TYPE_COLORS[row.activity.type],
                  color: ACTIVITY_TYPE_COLORS[row.activity.type]
                }"
              >
                {{ ACTIVITY_TYPE_LABELS[row.activity.type] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="活动时间" width="170" align="center">
            <template #default="{ row }">
              <span v-if="row.activity">{{ formatDate(row.activity.startTime) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="报名状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="REGISTRATION_STATUS_TAGS[row.status]">
                {{ REGISTRATION_STATUS_LABELS[row.status] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="签到状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'CHECKED_IN'" size="small" type="primary">已签到</el-tag>
              <el-tag v-else-if="row.status === 'NO_SHOW'" size="small" type="danger">未出席</el-tag>
              <span v-else style="color: #909399">-</span>
            </template>
          </el-table-column>
          <el-table-column label="报名时间" width="170" align="center">
            <template #default="{ row }">
              {{ formatDate(row.registeredAt) }}
            </template>
          </el-table-column>
          <el-table-column label="签到时间" width="170" align="center">
            <template #default="{ row }">
              <span v-if="row.checkInAt">{{ formatDate(row.checkInAt) }}</span>
              <span v-else style="color: #909399">-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" align="center" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="handleViewActivity(row.activityId)">
                详情
              </el-button>
              <el-button
                v-if="canCancel(row)"
                link
                type="danger"
                @click="handleCancelDialogFromList(row)"
              >
                取消报名
              </el-button>
              <el-button
                v-if="canFeedback(row)"
                link
                type="success"
                @click="handleFeedbackDialog(row)"
              >
                评价活动
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="!registrationLoading && filteredRegistrations.length === 0" class="empty-state">
          <el-empty description="暂无报名记录" />
        </div>
      </div>
    </el-card>

    <el-dialog
      v-model="cancelDialogVisible"
      title="取消报名"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="cancelForm" label-width="100px">
        <el-form-item label="活动名称">
          <span>{{ cancelTarget?.activity?.title || cancelTarget?.title }}</span>
        </el-form-item>
        <el-form-item label="取消原因">
          <el-input
            v-model="cancelForm.cancelReason"
            type="textarea"
            :rows="4"
            placeholder="请输入取消原因（选填）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="cancelLoading"
          @click="handleConfirmCancel"
        >
          确认取消
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="feedbackDialogVisible"
      title="评价活动"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form :model="feedbackForm" label-width="100px">
        <el-form-item label="活动名称">
          <span>{{ feedbackTarget?.activity?.title }}</span>
        </el-form-item>
        <el-form-item label="评分">
          <el-rate
            v-model="feedbackForm.rating"
            :max="5"
            show-text
            :texts="ratingTexts"
          />
        </el-form-item>
        <el-form-item label="评论">
          <el-input
            v-model="feedbackForm.comment"
            type="textarea"
            :rows="4"
            placeholder="请分享您的活动体验（选填）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="feedbackDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="feedbackLoading"
          :disabled="feedbackForm.rating === 0"
          @click="handleSubmitFeedback"
        >
          提交评价
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search,
  RefreshRight,
  Picture,
  Clock,
  LocationFilled,
  Timer,
} from '@element-plus/icons-vue';
import request from '../api';
import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_TAGS,
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUS_TAGS,
} from '../types';
import type {
  Activity,
  ActivityRegistration,
  ActivityType,
  RegistrationStatus,
} from '../types';

interface Borrower {
  id: number;
  name: string;
  phone?: string;
  email?: string;
}

interface ActivityStats {
  registered: number;
  attended: number;
  waitlist: number;
  cancelled: number;
}

interface FilterForm {
  type?: ActivityType;
  keyword?: string;
}

interface CancelForm {
  cancelReason: string;
}

interface FeedbackForm {
  rating: number;
  comment: string;
}

const ratingTexts = ['极差', '较差', '一般', '满意', '非常满意'];

const borrowers = ref<Borrower[]>([]);
const borrowerLoading = ref(false);
const selectedBorrowerId = ref<number | null>(null);

const activityStats = ref<ActivityStats | null>(null);

const filterForm = reactive<FilterForm>({
  type: undefined,
  keyword: undefined,
});
const activityPage = ref(1);
const activityPageSize = ref(8);
const activityTotal = ref(0);
const activityList = ref<Activity[]>([]);
const activityLoading = ref(false);
const registerLoadingMap = reactive<Record<number, boolean>>({});

const activeTab = ref('all');
const registrationLoading = ref(false);
const myRegistrations = ref<ActivityRegistration[]>([]);

const cancelDialogVisible = ref(false);
const cancelTarget = ref<Activity | ActivityRegistration | null>(null);
const cancelLoading = ref(false);
const cancelForm = reactive<CancelForm>({
  cancelReason: '',
});

const feedbackDialogVisible = ref(false);
const feedbackTarget = ref<ActivityRegistration | null>(null);
const feedbackLoading = ref(false);
const feedbackForm = reactive<FeedbackForm>({
  rating: 0,
  comment: '',
});

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getRemaining = (activity: Activity) => {
  const registered = activity.registeredCount || 0;
  return Math.max(0, activity.capacity - registered);
};

const getCapacityPercentage = (activity: Activity) => {
  const remaining = getRemaining(activity);
  const used = activity.capacity - remaining;
  return Math.round((used / activity.capacity) * 100);
};

const getProgressColor = (activity: Activity) => {
  const remaining = getRemaining(activity);
  if (remaining <= 0) return '#f56c6c';
  if (remaining <= 3) return '#e6a23c';
  return '#67c23a';
};

const getCountdown = (deadline: string) => {
  const now = new Date().getTime();
  const end = new Date(deadline).getTime();
  const diff = end - now;

  if (diff <= 0) return '已截止';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `还剩 ${days}天${hours}小时${minutes}分`;
  } else if (hours > 0) {
    return `还剩 ${hours}小时${minutes}分`;
  } else {
    return `还剩 ${minutes}分钟`;
  }
};

const fetchBorrowers = async () => {
  borrowerLoading.value = true;
  try {
    const res: any = await request.get('/borrowers');
    borrowers.value = Array.isArray(res) ? res : res.data || [];
  } catch (e) {
    console.error(e);
  } finally {
    borrowerLoading.value = false;
  }
};

const fetchActivityList = async () => {
  if (!selectedBorrowerId.value) return;

  activityLoading.value = true;
  try {
    const params: Record<string, any> = {
      status: 'REGISTRATION_OPEN',
      page: activityPage.value,
      pageSize: activityPageSize.value,
    };
    if (filterForm.type) params.type = filterForm.type;
    if (filterForm.keyword) params.keyword = filterForm.keyword;

    const res: any = await request.get('/activities', { params });
    activityList.value = res.data || [];
    activityTotal.value = res.total || 0;
  } catch (e) {
    console.error(e);
  } finally {
    activityLoading.value = false;
  }
};

const fetchMyRegistrations = async () => {
  if (!selectedBorrowerId.value) return;

  registrationLoading.value = true;
  try {
    const res: any = await request.get(`/activities/borrower/${selectedBorrowerId.value}`);
    myRegistrations.value = Array.isArray(res) ? res : res.data || [];
    computeStats();
  } catch (e) {
    console.error(e);
  } finally {
    registrationLoading.value = false;
  }
};

const computeStats = () => {
  const registrations = myRegistrations.value;
  const stats: ActivityStats = {
    registered: 0,
    attended: 0,
    waitlist: 0,
    cancelled: 0,
  };

  registrations.forEach((reg) => {
    if (reg.status === 'REGISTERED') stats.registered++;
    if (reg.status === 'CHECKED_IN') {
      stats.attended++;
      stats.registered++;
    }
    if (reg.status === 'WAITLIST') stats.waitlist++;
    if (reg.status === 'CANCELLED') stats.cancelled++;
  });

  activityStats.value = stats;
};

const getUserRegistrationStatus = (activityId: number): RegistrationStatus | null => {
  const registration = myRegistrations.value.find((r) => r.activityId === activityId);
  if (!registration) return null;
  if (registration.status === 'CANCELLED') return null;
  return registration.status;
};

const getUserQueuePosition = (activityId: number): number => {
  const registration = myRegistrations.value.find(
    (r) => r.activityId === activityId && r.status === 'WAITLIST'
  );
  return registration?.queuePosition || 0;
};

const handleBorrowerChange = () => {
  activityPage.value = 1;
  fetchActivityList();
  fetchMyRegistrations();
};

const handleFilterChange = () => {
  activityPage.value = 1;
  fetchActivityList();
};

const handleSearch = () => {
  activityPage.value = 1;
  fetchActivityList();
};

const handleReset = () => {
  filterForm.type = undefined;
  filterForm.keyword = undefined;
  activityPage.value = 1;
  activityPageSize.value = 8;
  fetchActivityList();
};

const handleActivityPageChange = (page: number) => {
  activityPage.value = page;
  fetchActivityList();
};

const handleActivityPageSizeChange = (size: number) => {
  activityPageSize.value = size;
  activityPage.value = 1;
  fetchActivityList();
};

const handleRegister = async (activity: Activity) => {
  if (!selectedBorrowerId.value) {
    ElMessage.warning('请先选择读者');
    return;
  }

  const isWaitlist = getRemaining(activity) <= 0;
  const actionText = isWaitlist ? '加入候补' : '报名';

  try {
    await ElMessageBox.confirm(
      `确定要${actionText}《${activity.title}》吗？`,
      '确认操作',
      { type: 'warning' }
    );

    registerLoadingMap[activity.id] = true;
    const res: any = await request.post(`/activities/${activity.id}/register`, {
      borrowerId: selectedBorrowerId.value,
    });

    if (isWaitlist) {
      const queuePos = res?.queuePosition || res?.data?.queuePosition;
      ElMessage.success(
        queuePos
          ? `成功加入候补队列，当前第${queuePos}位`
          : '成功加入候补队列'
      );
    } else {
      ElMessage.success('报名成功');
    }

    await Promise.all([fetchActivityList(), fetchMyRegistrations()]);
  } catch (e: any) {
    if (e !== 'cancel') {
      console.error(e);
    }
  } finally {
    registerLoadingMap[activity.id] = false;
  }
};

const handleViewActivity = (activityId: number) => {
  ElMessage.info(`查看活动详情：活动ID=${activityId}`);
};

const handleCancelDialog = (activity: Activity) => {
  cancelTarget.value = activity;
  cancelForm.cancelReason = '';
  cancelDialogVisible.value = true;
};

const handleCancelDialogFromList = (registration: ActivityRegistration) => {
  cancelTarget.value = registration;
  cancelForm.cancelReason = '';
  cancelDialogVisible.value = true;
};

const handleConfirmCancel = async () => {
  if (!selectedBorrowerId.value || !cancelTarget.value) return;

  let activityId: number | undefined;
  if ('activityId' in cancelTarget.value) {
    activityId = cancelTarget.value.activityId;
  } else if ('id' in cancelTarget.value) {
    activityId = cancelTarget.value.id;
  }

  if (!activityId) return;

  try {
    cancelLoading.value = true;
    await request.post(`/activities/${activityId}/cancel`, {
      borrowerId: selectedBorrowerId.value,
      cancelReason: cancelForm.cancelReason || undefined,
    });
    ElMessage.success('取消成功');
    cancelDialogVisible.value = false;
    await Promise.all([fetchActivityList(), fetchMyRegistrations()]);
  } catch (e) {
    console.error(e);
  } finally {
    cancelLoading.value = false;
  }
};

const handleFeedbackDialog = (registration: ActivityRegistration) => {
  feedbackTarget.value = registration;
  feedbackForm.rating = 0;
  feedbackForm.comment = '';
  feedbackDialogVisible.value = true;
};

const handleSubmitFeedback = async () => {
  if (!selectedBorrowerId.value || !feedbackTarget.value) return;
  if (feedbackForm.rating === 0) {
    ElMessage.warning('请先评分');
    return;
  }

  try {
    feedbackLoading.value = true;
    await request.post(`/activities/${feedbackTarget.value.activityId}/feedback`, {
      borrowerId: selectedBorrowerId.value,
      rating: feedbackForm.rating,
      comment: feedbackForm.comment || undefined,
    });
    ElMessage.success('评价提交成功');
    feedbackDialogVisible.value = false;
  } catch (e) {
    console.error(e);
  } finally {
    feedbackLoading.value = false;
  }
};

const handleTabChange = () => {};

const canCancel = (registration: ActivityRegistration): boolean => {
  if (registration.status !== 'REGISTERED' && registration.status !== 'WAITLIST') return false;
  if (!registration.activity) return true;
  return new Date(registration.activity.startTime).getTime() > Date.now();
};

const canFeedback = (registration: ActivityRegistration): boolean => {
  if (registration.status !== 'CHECKED_IN') return false;
  if (!registration.activity) return true;
  return new Date(registration.activity.endTime).getTime() < Date.now();
};

const filteredRegistrations = computed(() => {
  const list = myRegistrations.value;
  switch (activeTab.value) {
    case 'upcoming':
      return list.filter((r) => {
        if (r.status !== 'REGISTERED' && r.status !== 'CHECKED_IN') return false;
        if (!r.activity) return r.status === 'REGISTERED';
        return new Date(r.activity.startTime).getTime() > Date.now();
      });
    case 'waitlist':
      return list.filter((r) => r.status === 'WAITLIST');
    case 'completed':
      return list.filter((r) => {
        if (r.status === 'CHECKED_IN') return true;
        if (r.status === 'NO_SHOW') return true;
        if (r.status === 'REGISTERED' && r.activity) {
          return new Date(r.activity.endTime).getTime() < Date.now();
        }
        return false;
      });
    case 'cancelled':
      return list.filter((r) => r.status === 'CANCELLED');
    default:
      return list;
  }
});

onMounted(() => {
  fetchBorrowers();
});
</script>

<style scoped lang="scss">
.my-activities-container {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .user-info-card {
    .user-info-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;

      .user-select-wrapper {
        display: flex;
        align-items: center;

        .user-select-label {
          font-weight: 500;
          color: #303133;
          margin-right: 12px;
        }
      }
    }

    .stats-row {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      padding-top: 16px;
      border-top: 1px solid #ebeef5;

      .stat-item {
        flex: 1;
        min-width: 140px;
        text-align: center;
        padding: 16px;
        background-color: #fafafa;
        border-radius: 8px;

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 8px;

          &.stat-registered { color: #409eff; }
          &.stat-attended { color: #67c23a; }
          &.stat-waitlist { color: #e6a23c; }
          &.stat-cancelled { color: #909399; }
        }

        .stat-label {
          font-size: 13px;
          color: #606266;
        }
      }
    }
  }

  .activity-hall-card,
  .my-registrations-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .card-title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }

    .filter-wrapper {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0;
    }
  }

  .activity-list-wrapper {
    min-height: 200px;

    .activity-card {
      background-color: #fff;
      border: 1px solid #ebeef5;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 20px;
      transition: box-shadow 0.2s, transform 0.2s;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
      }

      .activity-cover {
        position: relative;
        height: 160px;
        background-color: #f5f7fa;
        overflow: hidden;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cover-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .activity-tags {
          position: absolute;
          top: 12px;
          left: 12px;
          display: flex;
          gap: 8px;
        }
      }

      .activity-content {
        padding: 16px;

        .activity-title {
          font-size: 15px;
          font-weight: 600;
          display: block;
          margin-bottom: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .activity-meta {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
          font-size: 13px;
          color: #606266;

          .meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;

            span {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        }

        .capacity-section {
          margin-bottom: 12px;

          .capacity-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 13px;

            .capacity-label {
              color: #606266;
            }

            .capacity-count {
              font-weight: 500;
              color: #303133;

              &.capacity-warning { color: #e6a23c; }
              &.capacity-full { color: #f56c6c; }
            }
          }

          .waitlist-info {
            margin-top: 8px;
            font-size: 12px;
            color: #e6a23c;
          }
        }

        .countdown-section {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #606266;
          margin-bottom: 12px;
        }

        .low-capacity-alert {
          margin-bottom: 12px;

          :deep(.el-alert) {
            padding: 8px 12px;
            font-size: 12px;
          }
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }
      }
    }

    .empty-state {
      padding: 60px 0;
    }

    .pagination-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
    }
  }

  .my-registrations-card {
    .empty-state {
      padding: 60px 0;
    }
  }
}
</style>
