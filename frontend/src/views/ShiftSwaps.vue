<template>
  <div class="shift-swaps-container">
    <el-card shadow="hover">
      <div class="header-actions">
        <div class="tabs-row">
          <el-radio-group
            v-model="activeTab"
            size="default"
          >
            <el-radio-button value="all">
              全部请求
            </el-radio-button>
            <el-radio-button value="pending">
              待确认
            </el-radio-button>
            <el-radio-button value="approved">
              已通过
            </el-radio-button>
            <el-radio-button value="rejected">
              已拒绝
            </el-radio-button>
          </el-radio-group>
        </div>
        <el-button
          type="primary"
          :icon="Plus"
          @click="openSwapDialog"
        >
          发起换班
        </el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="filteredSwaps"
        style="width: 100%; margin-top: 16px"
        border
        stripe
      >
        <el-table-column
          label="发起人"
          width="100"
        >
          <template #default="{ row }">
            {{ row.requester.username }}
          </template>
        </el-table-column>
        <el-table-column
          label="发起人班次"
          min-width="180"
        >
          <template #default="{ row }">
            <div class="schedule-info">
              <el-tag
                :type="getShiftTagType(row.requesterSchedule.shiftType)"
                size="small"
              >
                {{ getShiftLabel(row.requesterSchedule.shiftType) }}
              </el-tag>
              <span class="info-text">{{ formatDate(row.requesterSchedule.date) }} {{ row.requesterSchedule.serviceLocation?.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="目标人"
          width="100"
        >
          <template #default="{ row }">
            {{ row.targetUser.username }}
          </template>
        </el-table-column>
        <el-table-column
          label="目标人班次"
          min-width="180"
        >
          <template #default="{ row }">
            <div class="schedule-info">
              <el-tag
                :type="getShiftTagType(row.targetSchedule.shiftType)"
                size="small"
              >
                {{ getShiftLabel(row.targetSchedule.shiftType) }}
              </el-tag>
              <span class="info-text">{{ formatDate(row.targetSchedule.date) }} {{ row.targetSchedule.serviceLocation?.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="reason"
          label="换班原因"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column
          label="状态"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="getSwapStatusType(row.status)"
              size="small"
            >
              {{ getSwapStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="发起时间"
          width="160"
        >
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="200"
          fixed="right"
        >
          <template #default="{ row }">
            <template v-if="row.status === 'PENDING'">
              <el-button
                v-if="row.targetUserId === userStore.user?.id || userStore.isAdmin"
                link
                type="success"
                @click="handleApprove(row)"
              >
                同意
              </el-button>
              <el-button
                v-if="row.targetUserId === userStore.user?.id || userStore.isAdmin"
                link
                type="danger"
                @click="handleReject(row)"
              >
                拒绝
              </el-button>
              <el-button
                v-if="row.requesterId === userStore.user?.id || userStore.isAdmin"
                link
                type="info"
                @click="handleCancel(row)"
              >
                取消
              </el-button>
            </template>
            <span
              v-else
              class="done-text"
            >—</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="swapDialogVisible"
      title="发起换班请求"
      width="560px"
      @close="resetSwapForm"
    >
      <el-form
        ref="swapFormRef"
        :model="swapForm"
        :rules="swapRules"
        label-width="110px"
      >
        <el-form-item
          label="我的班次"
          prop="requesterScheduleId"
        >
          <el-select
            v-model="swapForm.requesterScheduleId"
            placeholder="请选择要换出的班次"
            style="width: 100%"
          >
            <el-option
              v-for="s in mySchedules"
              :key="s.id"
              :label="`${formatDate(s.date)} ${getShiftLabel(s.shiftType)} - ${s.serviceLocation?.name}`"
              :value="s.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="目标馆员"
          prop="targetUserId"
        >
          <el-select
            v-model="swapForm.targetUserId"
            placeholder="请选择要换班的目标馆员"
            style="width: 100%"
            filterable
            @change="handleTargetUserChange"
          >
            <el-option
              v-for="u in otherLibrarians"
              :key="u.id"
              :label="u.username"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="目标班次"
          prop="targetScheduleId"
        >
          <el-select
            v-model="swapForm.targetScheduleId"
            placeholder="请选择要换入的班次"
            style="width: 100%"
          >
            <el-option
              v-for="s in targetUserSchedules"
              :key="s.id"
              :label="`${formatDate(s.date)} ${getShiftLabel(s.shiftType)} - ${s.serviceLocation?.name}`"
              :value="s.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="换班原因"
          prop="reason"
        >
          <el-input
            v-model="swapForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入换班原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="swapDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="swapSubmitting"
          @click="submitSwap"
        >
          提交
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import api from '../api';
import { useUserStore } from '../store/user';
import type { ShiftSwapRequest, Schedule, ShiftType, SwapStatus } from '../types';
import { SHIFT_LABELS, SWAP_STATUS_LABELS, SWAP_STATUS_TYPES } from '../types';

const userStore = useUserStore();
const loading = ref(false);
const swaps = ref<ShiftSwapRequest[]>([]);
const activeTab = ref('all');
const mySchedules = ref<Schedule[]>([]);
const targetUserSchedules = ref<Schedule[]>([]);
const otherLibrarians = ref<any[]>([]);

const swapDialogVisible = ref(false);
const swapSubmitting = ref(false);
const swapFormRef = ref<FormInstance>();

const swapForm = ref({
  requesterScheduleId: undefined as number | undefined,
  targetUserId: undefined as number | undefined,
  targetScheduleId: undefined as number | undefined,
  reason: '',
});

const swapRules = {
  requesterScheduleId: [{ required: true, message: '请选择要换出的班次', trigger: 'change' }],
  targetUserId: [{ required: true, message: '请选择目标馆员', trigger: 'change' }],
  targetScheduleId: [{ required: true, message: '请选择目标班次', trigger: 'change' }],
  reason: [{ required: true, message: '请输入换班原因', trigger: 'blur' }],
};

const filteredSwaps = computed(() => {
  if (activeTab.value === 'all') return swaps.value;
  return swaps.value.filter(s => s.status === activeTab.value.toUpperCase());
});

function getShiftLabel(type: ShiftType): string {
  return SHIFT_LABELS[type] || type;
}

function getShiftTagType(type: ShiftType): string {
  const map: Record<ShiftType, string> = { MORNING: 'warning', AFTERNOON: '', EVENING: 'success' };
  return map[type] || '';
}

function getSwapStatusLabel(status: SwapStatus): string {
  return SWAP_STATUS_LABELS[status] || status;
}

function getSwapStatusType(status: SwapStatus): string {
  return SWAP_STATUS_TYPES[status] || 'info';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN');
}

async function fetchSwaps() {
  loading.value = true;
  try {
    const res: any = await api.get('/shift-swaps');
    swaps.value = res;
  } catch (error) {
    ElMessage.error('获取换班请求失败');
  } finally {
    loading.value = false;
  }
}

async function fetchMySchedules() {
  try {
    const res: any = await api.get('/schedules/my-week');
    mySchedules.value = res;
  } catch (error) {
    console.error('Failed to fetch my schedules:', error);
  }
}

async function fetchOtherLibrarians() {
  try {
    const res: any = await api.get('/users');
    otherLibrarians.value = res.filter((u: any) => u.role === 'LIBRARIAN' && u.id !== userStore.user?.id);
  } catch (error) {
    console.error('Failed to fetch librarians:', error);
  }
}

async function handleTargetUserChange(userId: number) {
  swapForm.value.targetScheduleId = undefined;
  try {
    const res: any = await api.get('/schedules/week', { params: { date: new Date().toISOString().split('T')[0] } });
    targetUserSchedules.value = res.filter((s: Schedule) => s.userId === userId);
  } catch (error) {
    targetUserSchedules.value = [];
  }
}

function openSwapDialog() {
  swapForm.value = {
    requesterScheduleId: undefined,
    targetUserId: undefined,
    targetScheduleId: undefined,
    reason: '',
  };
  targetUserSchedules.value = [];
  swapDialogVisible.value = true;
  fetchMySchedules();
  fetchOtherLibrarians();
}

function resetSwapForm() {
  swapFormRef.value?.resetFields();
}

async function submitSwap() {
  if (!swapFormRef.value) return;
  await swapFormRef.value.validate(async (valid) => {
    if (!valid) return;
    swapSubmitting.value = true;
    try {
      await api.post('/shift-swaps', swapForm.value);
      ElMessage.success('换班请求已提交');
      swapDialogVisible.value = false;
      fetchSwaps();
    } catch (error) {
      ElMessage.error('提交换班请求失败');
    } finally {
      swapSubmitting.value = false;
    }
  });
}

async function handleApprove(row: ShiftSwapRequest) {
  try {
    await ElMessageBox.confirm('确定同意该换班请求？同意后将交换双方排班。', '确认', { type: 'info' });
    await api.put(`/shift-swaps/${row.id}/approve`);
    ElMessage.success('已同意换班');
    fetchSwaps();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败');
    }
  }
}

async function handleReject(row: ShiftSwapRequest) {
  try {
    await ElMessageBox.confirm('确定拒绝该换班请求？', '确认', { type: 'warning' });
    await api.put(`/shift-swaps/${row.id}/reject`);
    ElMessage.success('已拒绝换班');
    fetchSwaps();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败');
    }
  }
}

async function handleCancel(row: ShiftSwapRequest) {
  try {
    await ElMessageBox.confirm('确定取消该换班请求？', '确认', { type: 'warning' });
    await api.put(`/shift-swaps/${row.id}/cancel`);
    ElMessage.success('已取消换班');
    fetchSwaps();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败');
    }
  }
}

onMounted(() => {
  fetchSwaps();
});
</script>

<style scoped lang="scss">
.shift-swaps-container {
  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  .schedule-info {
    display: flex;
    align-items: center;
    gap: 6px;

    .info-text {
      font-size: 12px;
      color: #606266;
    }
  }

  .done-text {
    color: #c0c4cc;
  }
}
</style>
