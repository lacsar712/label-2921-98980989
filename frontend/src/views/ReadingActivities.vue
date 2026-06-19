<template>
  <div class="reading-activities-container">
    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :span="24" :sm="12" :md="8" :lg="4.8">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-label">总活动数</div>
            <div class="stat-value" style="color: #409eff">{{ stats.total }}</div>
          </div>
          <el-icon class="stat-icon" :size="48" color="rgba(64, 158, 255, 0.15)"><DataLine /></el-icon>
        </el-card>
      </el-col>
      <el-col :span="24" :sm="12" :md="8" :lg="4.8">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-label">草稿数</div>
            <div class="stat-value" style="color: #909399">{{ stats.draft }}</div>
          </div>
          <el-icon class="stat-icon" :size="48" color="rgba(144, 147, 153, 0.15)"><Document /></el-icon>
        </el-card>
      </el-col>
      <el-col :span="24" :sm="12" :md="8" :lg="4.8">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-label">报名中</div>
            <div class="stat-value" style="color: #67c23a">{{ stats.registrationOpen }}</div>
          </div>
          <el-icon class="stat-icon" :size="48" color="rgba(103, 194, 58, 0.15)"><User /></el-icon>
        </el-card>
      </el-col>
      <el-col :span="24" :sm="12" :md="8" :lg="4.8">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-label">进行中</div>
            <div class="stat-value" style="color: #e6a23c">{{ stats.ongoing }}</div>
          </div>
          <el-icon class="stat-icon" :size="48" color="rgba(230, 162, 60, 0.15)"><VideoPlay /></el-icon>
        </el-card>
      </el-col>
      <el-col :span="24" :sm="12" :md="8" :lg="4.8">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-label">已结束</div>
            <div class="stat-value" style="color: #f56c6c">{{ stats.ended }}</div>
          </div>
          <el-icon class="stat-icon" :size="48" color="rgba(245, 108, 108, 0.15)"><CircleCheck /></el-icon>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="hover">
      <div class="filter-bar">
        <div class="filter-left">
          <el-input
            v-model="keyword"
            placeholder="搜索标题、地点、创建人"
            style="width: 320px"
            clearable
            @clear="fetchActivities"
            @keyup.enter="fetchActivities"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-select
            v-model="filterType"
            placeholder="全部类型"
            clearable
            style="width: 130px; margin-left: 10px"
            @change="fetchActivities"
          >
            <el-option
              v-for="(label, key) in ACTIVITY_TYPE_LABELS"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>

          <el-select
            v-model="filterStatus"
            placeholder="全部状态"
            clearable
            style="width: 130px; margin-left: 10px"
            @change="fetchActivities"
          >
            <el-option
              v-for="(label, key) in ACTIVITY_STATUS_LABELS"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>

          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px; margin-left: 10px"
            @change="fetchActivities"
          />
        </div>

        <div class="filter-right">
          <el-button
            v-if="userStore.isLibrarian"
            type="primary"
            :icon="Plus"
            @click="openCreateDialog"
          >
            创建活动
          </el-button>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="activities"
        style="width: 100%; margin-top: 16px"
        border
        stripe
      >
        <el-table-column
          label="封面"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <el-image
              v-if="row.coverUrl"
              :src="row.coverUrl"
              fit="cover"
              style="width: 80px; height: 60px; border-radius: 4px"
              :preview-src-list="[row.coverUrl]"
              preview-teleported
            />
            <div v-else class="cover-placeholder">
              <el-icon :size="28" color="#c0c4cc"><Picture /></el-icon>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="标题"
          min-width="200"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-link
              type="primary"
              @click="openDetailDialog(row)"
            >
              {{ row.title }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column
          label="类型"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :color="ACTIVITY_TYPE_COLORS[row.type]"
              effect="light"
              style="color: white"
            >
              {{ ACTIVITY_TYPE_LABELS[row.type] }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          label="活动时间"
          width="320"
        >
          <template #default="{ row }">
            <div class="time-range">
              <span>{{ formatDate(row.startTime) }}</span>
              <el-divider direction="vertical" />
              <span>{{ formatDate(row.endTime) }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="地点"
          min-width="140"
          show-overflow-tooltip
          prop="location"
        />

        <el-table-column
          label="名额进度"
          width="220"
        >
          <template #default="{ row }">
            <div class="quota-wrapper">
              <div class="quota-progress">
                <el-progress
                  :percentage="row.capacity > 0 ? Math.min(Math.round(((row.registeredCount || 0) / row.capacity) * 100), 100) : 0"
                  :stroke-width="14"
                  :show-text="false"
                />
                <span class="quota-text">{{ row.registeredCount || 0 }}/{{ row.capacity }}</span>
              </div>
              <span
                v-if="row.waitlistCount && row.waitlistCount > 0"
                class="waitlist-tag"
              >
                候补{{ row.waitlistCount }}人
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="报名截止"
          width="150"
          align="center"
        >
          <template #default="{ row }">
            <span :class="{ 'deadline-expired': getCountdown(row.deadline) === '已截止' }">
              {{ getCountdown(row.deadline) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column
          label="状态"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <el-tag :type="ACTIVITY_STATUS_TAGS[row.status]">
              {{ ACTIVITY_STATUS_LABELS[row.status] }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          label="创建人"
          width="110"
        >
          <template #default="{ row }">
            {{ row.createdBy?.username || '-' }}
          </template>
        </el-table-column>

        <el-table-column
          label="创建时间"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column
          label="操作"
          width="240"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="openDetailDialog(row)"
            >
              详情
            </el-button>
            <el-button
              v-if="userStore.isLibrarian"
              link
              type="primary"
              @click="openEditDialog(row)"
            >
              编辑
            </el-button>
            <el-dropdown
              v-if="userStore.isLibrarian && canToggleStatus(row)"
              trigger="click"
              @command="(cmd) => handleStatusChange(row, cmd)"
            >
              <el-button link type="primary">
                状态切换
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-if="row.status === 'DRAFT'"
                    command="REGISTRATION_OPEN"
                  >
                    发布报名
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="row.status === 'REGISTRATION_OPEN'"
                    command="ONGOING"
                  >
                    标记进行中
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="row.status === 'ONGOING'"
                    command="ENDED"
                  >
                    标记已结束
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="['DRAFT', 'REGISTRATION_OPEN', 'ONGOING'].includes(row.status)"
                    command="CANCELLED"
                  >
                    取消活动
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button
              v-if="userStore.isAdmin"
              link
              type="danger"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="fetchActivities"
          @current-change="fetchActivities"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="activityDialogVisible"
      :title="isEdit ? '编辑活动' : '创建活动'"
      width="760px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="activityFormRef"
        :model="activityForm"
        :rules="activityRules"
        label-width="110px"
      >
        <el-form-item
          label="活动标题"
          prop="title"
        >
          <el-input
            v-model="activityForm.title"
            placeholder="请输入活动标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>

        <el-form-item
          label="封面URL"
          prop="coverUrl"
        >
          <div class="cover-upload">
            <el-input
              v-model="activityForm.coverUrl"
              placeholder="请输入封面图片URL"
            />
            <el-image
              v-if="activityForm.coverUrl"
              :src="activityForm.coverUrl"
              fit="cover"
              class="cover-preview"
              :preview-src-list="[activityForm.coverUrl]"
              preview-teleported
            />
          </div>
        </el-form-item>

        <el-form-item
          label="活动类型"
          prop="type"
        >
          <el-radio-group v-model="activityForm.type">
            <el-radio
              v-for="(label, key) in ACTIVITY_TYPE_LABELS"
              :key="key"
              :value="key"
            >
              {{ label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item
          label="活动描述"
          prop="description"
        >
          <el-input
            v-model="activityForm.description"
            type="textarea"
            :rows="5"
            placeholder="请输入活动详细描述"
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item
          label="活动时间"
          prop="timeRange"
        >
          <el-date-picker
            v-model="activityForm.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item
              label="活动地点"
              prop="location"
            >
              <el-input
                v-model="activityForm.location"
                placeholder="请输入活动地点"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="线上链接">
              <el-input
                v-model="activityForm.onlineUrl"
                placeholder="线上活动链接（可选）"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item
              label="名额上限"
              prop="capacity"
            >
              <el-input-number
                v-model="activityForm.capacity"
                :min="1"
                :max="9999"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="报名截止"
              prop="deadline"
            >
              <el-date-picker
                v-model="activityForm.deadline"
                type="datetime"
                placeholder="选择报名截止时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="activityDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="submitActivity"
        >
          确认提交
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="detailDialogVisible"
      title="活动详情"
      width="800px"
      @open="fetchActivityDetail"
    >
      <div v-if="currentActivity">
        <div class="detail-cover">
          <el-image
            v-if="currentActivity.coverUrl"
            :src="currentActivity.coverUrl"
            fit="cover"
            :preview-src-list="[currentActivity.coverUrl]"
            preview-teleported
          />
          <div v-else class="detail-cover-placeholder">
            <el-icon :size="64" color="#c0c4cc"><Picture /></el-icon>
          </div>
        </div>

        <el-descriptions
          :column="2"
          border
          style="margin-top: 16px"
        >
          <el-descriptions-item label="活动标题" :span="2">
            <span class="detail-title">{{ currentActivity.title }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="活动类型">
            <el-tag
              :color="ACTIVITY_TYPE_COLORS[currentActivity.type]"
              effect="light"
              style="color: white"
            >
              {{ ACTIVITY_TYPE_LABELS[currentActivity.type] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="活动状态">
            <el-tag :type="ACTIVITY_STATUS_TAGS[currentActivity.status]">
              {{ ACTIVITY_STATUS_LABELS[currentActivity.status] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="活动时间" :span="2">
            {{ formatDate(currentActivity.startTime) }} ~ {{ formatDate(currentActivity.endTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="活动地点">
            {{ currentActivity.location }}
          </el-descriptions-item>
          <el-descriptions-item label="线上链接">
            <el-link
              v-if="currentActivity.onlineUrl"
              :href="currentActivity.onlineUrl"
              type="primary"
              target="_blank"
            >
              点击查看
            </el-link>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="报名截止">
            {{ formatDate(currentActivity.deadline) }}
            <span
              style="margin-left: 8px"
              :class="{ 'deadline-expired': getCountdown(currentActivity.deadline) === '已截止' }"
            >
              ({{ getCountdown(currentActivity.deadline) }})
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="名额情况">
            <div class="detail-quota">
              <el-progress
                :percentage="currentActivity.capacity > 0 ? Math.min(Math.round(((currentActivity.registeredCount || 0) / currentActivity.capacity) * 100), 100) : 0"
                :stroke-width="12"
              />
              <div style="margin-top: 4px; font-size: 13px">
                已报名 {{ currentActivity.registeredCount || 0 }} / {{ currentActivity.capacity }}
                <span v-if="currentActivity.waitlistCount && currentActivity.waitlistCount > 0" style="color: #e6a23c; margin-left: 10px">
                  候补{{ currentActivity.waitlistCount }}人
                </span>
              </div>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="创建人">
            {{ currentActivity.createdBy?.username || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(currentActivity.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="活动描述" :span="2">
            <div class="detail-description">{{ currentActivity.description }}</div>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import {
  Search,
  Plus,
  ArrowDown,
  DataLine,
  Document,
  User,
  VideoPlay,
  CircleCheck,
  Picture,
} from '@element-plus/icons-vue';
import api from '../api';
import { useUserStore } from '../store/user';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import type {
  Activity,
  ActivityType,
  ActivityStatus,
  CreateActivityRequest,
  ActivityListResponse,
} from '../types';
import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_TAGS,
} from '../types';

const userStore = useUserStore();

const loading = ref(false);
const submitLoading = ref(false);
const keyword = ref('');
const filterType = ref<ActivityType | ''>('');
const filterStatus = ref<ActivityStatus | ''>('');
const dateRange = ref<string[] | null>(null);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);

const activities = ref<Activity[]>([]);
const stats = reactive({
  total: 0,
  draft: 0,
  registrationOpen: 0,
  ongoing: 0,
  ended: 0,
});

const activityDialogVisible = ref(false);
const isEdit = ref(false);
const currentEditId = ref<number | null>(null);
const activityFormRef = ref<FormInstance | null>(null);

const activityForm = reactive({
  title: '',
  coverUrl: '',
  description: '',
  type: 'LECTURE' as ActivityType,
  timeRange: [] as string[],
  location: '',
  onlineUrl: '',
  capacity: 50,
  deadline: '',
});

const activityRules = {
  title: [{ required: true, message: '请输入活动标题', trigger: 'blur' }],
  description: [{ required: true, message: '请输入活动描述', trigger: 'blur' }],
  type: [{ required: true, message: '请选择活动类型', trigger: 'change' }],
  timeRange: [{ required: true, message: '请选择活动时间', trigger: 'change' }],
  location: [{ required: true, message: '请输入活动地点', trigger: 'blur' }],
  capacity: [{ required: true, message: '请输入名额上限', trigger: 'blur' }],
  deadline: [{ required: true, message: '请选择报名截止时间', trigger: 'change' }],
};

const detailDialogVisible = ref(false);
const currentActivity = ref<Activity | null>(null);

const fetchActivities = async () => {
  loading.value = true;
  try {
    const params: any = {
      page: page.value,
      pageSize: pageSize.value,
    };
    if (keyword.value) params.keyword = keyword.value;
    if (filterType.value) params.type = filterType.value;
    if (filterStatus.value) params.status = filterStatus.value;
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }
    const res = await api.get('/activities', { params }) as ActivityListResponse;
    activities.value = res.data;
    total.value = res.total;
    if (res.stats) {
      stats.total = res.stats.total;
      stats.draft = res.stats.draft;
      stats.registrationOpen = res.stats.registrationOpen;
      stats.ongoing = res.stats.ongoing;
      stats.ended = res.stats.ended;
    }
  } finally {
    loading.value = false;
  }
};

const fetchStats = async () => {
  try {
    const res = await api.get('/activities/stats/summary') as any;
    if (res) {
      stats.total = res.total ?? stats.total;
      stats.draft = res.draft ?? stats.draft;
      stats.registrationOpen = res.registrationOpen ?? stats.registrationOpen;
      stats.ongoing = res.ongoing ?? stats.ongoing;
      stats.ended = res.ended ?? stats.ended;
    }
  } catch (_) {}
};

const openCreateDialog = () => {
  isEdit.value = false;
  currentEditId.value = null;
  Object.assign(activityForm, {
    title: '',
    coverUrl: '',
    description: '',
    type: 'LECTURE' as ActivityType,
    timeRange: [],
    location: '',
    onlineUrl: '',
    capacity: 50,
    deadline: '',
  });
  activityDialogVisible.value = true;
};

const openEditDialog = (row: Activity) => {
  isEdit.value = true;
  currentEditId.value = row.id;
  Object.assign(activityForm, {
    title: row.title,
    coverUrl: row.coverUrl || '',
    description: row.description,
    type: row.type,
    timeRange: [row.startTime, row.endTime],
    location: row.location,
    onlineUrl: row.onlineUrl || '',
    capacity: row.capacity,
    deadline: row.deadline,
  });
  activityDialogVisible.value = true;
};

const submitActivity = async () => {
  if (!activityFormRef.value) return;
  await activityFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return;

    submitLoading.value = true;
    try {
      const payload: CreateActivityRequest = {
        title: activityForm.title,
        description: activityForm.description,
        type: activityForm.type,
        startTime: activityForm.timeRange[0],
        endTime: activityForm.timeRange[1],
        location: activityForm.location,
        onlineUrl: activityForm.onlineUrl || undefined,
        capacity: activityForm.capacity,
        deadline: activityForm.deadline,
        coverUrl: activityForm.coverUrl || undefined,
      };

      if (isEdit.value && currentEditId.value) {
        await api.put(`/activities/${currentEditId.value}`, payload);
        ElMessage.success('编辑活动成功');
      } else {
        await api.post('/activities', payload);
        ElMessage.success('创建活动成功');
      }
      activityDialogVisible.value = false;
      fetchActivities();
      fetchStats();
    } finally {
      submitLoading.value = false;
    }
  });
};

const openDetailDialog = (row: Activity) => {
  currentActivity.value = row;
  detailDialogVisible.value = true;
};

const fetchActivityDetail = async () => {
  if (!currentActivity.value) return;
  try {
    const res = await api.get(`/activities/${currentActivity.value.id}`) as Activity;
    currentActivity.value = res;
  } catch (_) {}
};

const canToggleStatus = (row: Activity) => {
  return row.status !== 'ENDED' && row.status !== 'CANCELLED';
};

const handleStatusChange = async (row: Activity, status: ActivityStatus) => {
  try {
    await ElMessageBox.confirm(
      `确认将活动「${row.title}」状态变更为「${ACTIVITY_STATUS_LABELS[status]}」吗？`,
      '状态变更确认',
      { type: 'warning' }
    );
    await api.patch(`/activities/${row.id}/status`, { status });
    ElMessage.success('状态变更成功');
    fetchActivities();
    fetchStats();
  } catch (_) {}
};

const handleDelete = async (row: Activity) => {
  try {
    await ElMessageBox.confirm(
      `确认删除活动「${row.title}」吗？此操作不可恢复。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
    );
    await api.delete(`/activities/${row.id}`);
    ElMessage.success('删除成功');
    fetchActivities();
    fetchStats();
  } catch (_) {}
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', { hour12: false });
};

const getCountdown = (deadline: string): string => {
  const now = new Date().getTime();
  const end = new Date(deadline).getTime();
  const diff = end - now;

  if (diff <= 0) return '已截止';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `还剩${days}天${hours}小时`;
  }
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `还剩${hours}小时${minutes}分`;
  }
  return `还剩${minutes}分钟`;
};

onMounted(() => {
  fetchActivities();
  fetchStats();
});
</script>

<style scoped lang="scss">
.stat-card {
  position: relative;
  overflow: hidden;

  :deep(.el-card__body) {
    padding: 16px 20px;
  }
}

.stat-content {
  position: relative;
  z-index: 1;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
}

.stat-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-left,
.filter-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
}

.cover-placeholder {
  width: 80px;
  height: 60px;
  background: #f5f7fa;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.time-range {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #606266;
}

.quota-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.quota-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.quota-text {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.waitlist-tag {
  font-size: 12px;
  color: #e6a23c;
  background: #fdf6ec;
  padding: 2px 8px;
  border-radius: 4px;
  align-self: flex-start;
}

.deadline-expired {
  color: #909399;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.cover-upload {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;

  .el-input {
    flex: 1;
  }
}

.cover-preview {
  width: 80px;
  height: 60px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  flex-shrink: 0;
}

.detail-cover {
  width: 100%;
  max-height: 240px;
  overflow: hidden;
  border-radius: 8px;

  .el-image {
    width: 100%;
    height: 240px;
  }
}

.detail-cover-placeholder {
  width: 100%;
  height: 240px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.detail-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.detail-quota {
  width: 100%;
}

.detail-description {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #606266;
}
</style>
