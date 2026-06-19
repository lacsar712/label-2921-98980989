<template>
  <div class="schedule-container">
    <el-card shadow="hover">
      <div class="schedule-header">
        <div class="header-left">
          <el-button :icon="ArrowLeft" @click="changeWeek(-1)" />
          <span class="week-label">{{ weekLabel }}</span>
          <el-button :icon="ArrowRight" @click="changeWeek(1)" />
          <el-button type="primary" link @click="goToThisWeek">本周</el-button>
        </div>
        <div class="header-right">
          <el-select
            v-model="filterLocationId"
            placeholder="全部服务点"
            clearable
            style="width: 200px; margin-right: 10px"
            @change="fetchSchedules"
          >
            <el-option
              v-for="loc in serviceLocations"
              :key="loc.id"
              :label="loc.name"
              :value="loc.id"
            />
          </el-select>
          <el-radio-group
            v-model="viewMode"
            size="small"
          >
            <el-radio-button value="location">
              按服务点
            </el-radio-button>
            <el-radio-button value="person">
              按人员
            </el-radio-button>
          </el-radio-group>
          <el-button
            v-if="userStore.isAdmin"
            type="primary"
            :icon="Plus"
            style="margin-left: 10px"
            @click="openScheduleDialog()"
          >
            添加排班
          </el-button>
        </div>
      </div>

      <div
        v-loading="loading"
        class="schedule-grid"
      >
        <table class="schedule-table">
          <thead>
            <tr>
              <th class="corner-cell">
                {{ viewMode === 'location' ? '服务点' : '馆员' }}
              </th>
              <th
                v-for="day in weekDays"
                :key="day.dateStr"
                class="day-header"
                :class="{ 'is-today': day.isToday }"
              >
                <div class="day-label">{{ day.label }}</div>
                <div class="day-date">{{ day.dateStr }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in gridRows"
              :key="row.key"
            >
              <td class="row-label-cell">
                <span class="row-label">{{ row.label }}</span>
              </td>
              <td
                v-for="day in weekDays"
                :key="day.dateStr"
                class="shift-cell"
                :class="{ 'is-today': day.isToday }"
                @click="handleCellClick(row, day)"
              >
                <div class="shift-tags">
                  <template v-if="viewMode === 'location'">
                    <div
                      v-for="s in getSchedulesForCell(row.key, day.dateStr)"
                      :key="s.id"
                      class="shift-tag"
                      :style="{ borderLeftColor: getShiftColor(s.shiftType) }"
                    >
                      <el-tag
                        size="small"
                        :type="getShiftTagType(s.shiftType)"
                        effect="plain"
                      >
                        {{ getShiftLabel(s.shiftType) }}
                      </el-tag>
                      <span class="shift-user">{{ s.user.username }}</span>
                      <el-icon
                        v-if="s.isLeader"
                        class="leader-icon"
                        title="值班组长"
                      >
                        <Star />
                      </el-icon>
                    </div>
                  </template>
                  <template v-else>
                    <div
                      v-for="s in getSchedulesForCell(row.key, day.dateStr)"
                      :key="s.id"
                      class="shift-tag"
                      :style="{ borderLeftColor: getShiftColor(s.shiftType) }"
                    >
                      <el-tag
                        size="small"
                        :type="getShiftTagType(s.shiftType)"
                        effect="plain"
                      >
                        {{ getShiftLabel(s.shiftType) }}
                      </el-tag>
                      <span class="shift-location">{{ s.serviceLocation.name }}</span>
                      <el-icon
                        v-if="s.isLeader"
                        class="leader-icon"
                        title="值班组长"
                      >
                        <Star />
                      </el-icon>
                    </div>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </el-card>

    <el-dialog
      v-model="scheduleDialogVisible"
      :title="scheduleDialogTitle"
      width="520px"
      @close="resetScheduleForm"
    >
      <el-form
        ref="scheduleFormRef"
        :model="scheduleForm"
        :rules="scheduleRules"
        label-width="100px"
      >
        <el-form-item
          v-if="userStore.isAdmin"
          label="馆员"
          prop="userId"
        >
          <el-select
            v-model="scheduleForm.userId"
            placeholder="请选择馆员"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="u in librarians"
              :key="u.id"
              :label="u.username"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="日期"
          prop="date"
        >
          <el-date-picker
            v-model="scheduleForm.date"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item
          label="班次"
          prop="shiftType"
        >
          <el-select
            v-model="scheduleForm.shiftType"
            placeholder="请选择班次"
            style="width: 100%"
          >
            <el-option
              label="早班 (8:00-12:00)"
              value="MORNING"
            />
            <el-option
              label="中班 (12:00-17:00)"
              value="AFTERNOON"
            />
            <el-option
              label="晚班 (17:00-21:00)"
              value="EVENING"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="服务点"
          prop="serviceLocationId"
        >
          <el-select
            v-model="scheduleForm.serviceLocationId"
            placeholder="请选择服务点"
            style="width: 100%"
          >
            <el-option
              v-for="loc in serviceLocations"
              :key="loc.id"
              :label="`${loc.name} (${getLocationTypeLabel(loc.type)})`"
              :value="loc.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="值班组长">
          <el-switch v-model="scheduleForm.isLeader" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scheduleDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="scheduleSubmitting"
          @click="submitSchedule"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="cellDetailVisible"
      title="排班详情"
      width="600px"
    >
      <div
        v-if="cellDetailSchedules.length === 0"
        class="empty-cell"
      >
        <el-empty description="该时段暂无排班" />
        <el-button
          v-if="userStore.isAdmin"
          type="primary"
          @click="openScheduleDialogFromCell"
        >
          添加排班
        </el-button>
      </div>
      <el-table
        v-else
        :data="cellDetailSchedules"
        border
        size="small"
      >
        <el-table-column
          prop="shiftType"
          label="班次"
          width="80"
        >
          <template #default="{ row }">
            <el-tag
              :type="getShiftTagType(row.shiftType)"
              size="small"
            >
              {{ getShiftLabel(row.shiftType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="user.username"
          label="馆员"
          width="100"
        />
        <el-table-column
          prop="serviceLocation.name"
          label="服务点"
          min-width="120"
        />
        <el-table-column
          label="组长"
          width="60"
          align="center"
        >
          <template #default="{ row }">
            <el-icon
              v-if="row.isLeader"
              class="leader-icon"
            >
              <Star />
            </el-icon>
          </template>
        </el-table-column>
        <el-table-column
          v-if="userStore.isAdmin"
          label="操作"
          width="120"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="openEditSchedule(row)"
            >
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              @click="handleDeleteSchedule(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ArrowLeft, ArrowRight, Plus, Star } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import api from '../api';
import { useUserStore } from '../store/user';
import type { Schedule, ServiceLocation, ShiftType } from '../types';
import { SHIFT_LABELS, SHIFT_COLORS, LOCATION_TYPE_LABELS } from '../types';

const userStore = useUserStore();
const loading = ref(false);
const schedules = ref<Schedule[]>([]);
const serviceLocations = ref<ServiceLocation[]>([]);
const librarians = ref<any[]>([]);
const currentWeekStart = ref(getMonday(new Date()));
const filterLocationId = ref<number | ''>('');
const viewMode = ref<'location' | 'person'>('location');

const scheduleDialogVisible = ref(false);
const scheduleDialogTitle = ref('添加排班');
const scheduleSubmitting = ref(false);
const scheduleFormRef = ref<FormInstance>();
const isEditSchedule = ref(false);
const editScheduleId = ref<number | null>(null);

const scheduleForm = ref({
  userId: undefined as number | undefined,
  date: '',
  shiftType: '' as ShiftType | '',
  serviceLocationId: undefined as number | undefined,
  isLeader: false,
});

const scheduleRules = {
  userId: [{ required: true, message: '请选择馆员', trigger: 'change' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  shiftType: [{ required: true, message: '请选择班次', trigger: 'change' }],
  serviceLocationId: [{ required: true, message: '请选择服务点', trigger: 'change' }],
};

const cellDetailVisible = ref(false);
const cellDetailSchedules = ref<Schedule[]>([]);
const cellDetailRow = ref<any>(null);
const cellDetailDay = ref<any>(null);

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const weekDays = computed(() => {
  const days = [];
  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const today = formatDateStr(new Date());
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart.value);
    d.setDate(d.getDate() + i);
    const dateStr = formatDateStr(d);
    days.push({
      dateStr,
      label: dayNames[i],
      isToday: dateStr === today,
    });
  }
  return days;
});

const weekLabel = computed(() => {
  const start = formatDateStr(currentWeekStart.value);
  const endDate = new Date(currentWeekStart.value);
  endDate.setDate(endDate.getDate() + 6);
  const end = formatDateStr(endDate);
  return `${start} ~ ${end}`;
});

const gridRows = computed(() => {
  if (viewMode.value === 'location') {
    const locs = filterLocationId.value
      ? serviceLocations.value.filter(l => l.id === filterLocationId.value)
      : serviceLocations.value;
    return locs.map(l => ({ key: `loc_${l.id}`, label: l.name, id: l.id }));
  } else {
    const userMap = new Map<number, string>();
    schedules.value.forEach(s => {
      if (!userMap.has(s.userId)) {
        userMap.set(s.userId, s.user.username);
      }
    });
    if (filterLocationId.value) {
      const filtered = schedules.value.filter(s => s.serviceLocationId === filterLocationId.value);
      const filteredUsers = new Map<number, string>();
      filtered.forEach(s => {
        if (!filteredUsers.has(s.userId)) {
          filteredUsers.set(s.userId, s.user.username);
        }
      });
      return Array.from(filteredUsers.entries()).map(([id, name]) => ({ key: `user_${id}`, label: name, id }));
    }
    return Array.from(userMap.entries()).map(([id, name]) => ({ key: `user_${id}`, label: name, id }));
  }
});

function getSchedulesForCell(rowKey: string, dateStr: string): Schedule[] {
  return schedules.value.filter(s => {
    const sDate = s.date.split('T')[0];
    if (sDate !== dateStr) return false;
    if (viewMode.value === 'location') {
      const locId = rowKey.replace('loc_', '');
      return s.serviceLocationId === Number(locId);
    } else {
      const userId = rowKey.replace('user_', '');
      return s.userId === Number(userId);
    }
  });
}

function getShiftLabel(type: ShiftType): string {
  return SHIFT_LABELS[type] || type;
}

function getShiftColor(type: ShiftType): string {
  return SHIFT_COLORS[type] || '#909399';
}

function getShiftTagType(type: ShiftType): string {
  const map: Record<ShiftType, string> = { MORNING: 'warning', AFTERNOON: '', EVENING: 'success' };
  return map[type] || '';
}

function getLocationTypeLabel(type: string): string {
  return (LOCATION_TYPE_LABELS as any)[type] || type;
}

function changeWeek(delta: number) {
  const d = new Date(currentWeekStart.value);
  d.setDate(d.getDate() + delta * 7);
  currentWeekStart.value = d;
  fetchSchedules();
}

function goToThisWeek() {
  currentWeekStart.value = getMonday(new Date());
  fetchSchedules();
}

async function fetchSchedules() {
  loading.value = true;
  try {
    const params: any = { date: formatDateStr(currentWeekStart.value) };
    if (filterLocationId.value) {
      params.serviceLocationId = filterLocationId.value;
    }
    const res: any = await api.get('/schedules/week', { params });
    schedules.value = res;
  } catch (error) {
    ElMessage.error('获取排班数据失败');
  } finally {
    loading.value = false;
  }
}

async function fetchServiceLocations() {
  try {
    const res: any = await api.get('/service-locations');
    serviceLocations.value = res;
  } catch (error) {
    console.error('Failed to fetch service locations:', error);
  }
}

async function fetchLibrarians() {
  try {
    const res: any = await api.get('/users');
    librarians.value = res.filter((u: any) => u.role === 'LIBRARIAN');
  } catch (error) {
    console.error('Failed to fetch librarians:', error);
  }
}

function openScheduleDialog() {
  isEditSchedule.value = false;
  scheduleDialogTitle.value = '添加排班';
  scheduleForm.value = {
    userId: undefined,
    date: '',
    shiftType: '',
    serviceLocationId: undefined,
    isLeader: false,
  };
  scheduleDialogVisible.value = true;
}

function openScheduleDialogFromCell() {
  cellDetailVisible.value = false;
  scheduleForm.value = {
    userId: undefined,
    date: cellDetailDay.value?.dateStr || '',
    shiftType: '',
    serviceLocationId: viewMode.value === 'location' ? cellDetailRow.value?.id : undefined,
    isLeader: false,
  };
  isEditSchedule.value = false;
  scheduleDialogTitle.value = '添加排班';
  scheduleDialogVisible.value = true;
}

function openEditSchedule(row: Schedule) {
  isEditSchedule.value = true;
  editScheduleId.value = row.id;
  scheduleDialogTitle.value = '编辑排班';
  scheduleForm.value = {
    userId: row.userId,
    date: row.date.split('T')[0],
    shiftType: row.shiftType,
    serviceLocationId: row.serviceLocationId,
    isLeader: row.isLeader,
  };
  cellDetailVisible.value = false;
  scheduleDialogVisible.value = true;
}

function resetScheduleForm() {
  scheduleFormRef.value?.resetFields();
}

async function submitSchedule() {
  if (!scheduleFormRef.value) return;
  await scheduleFormRef.value.validate(async (valid) => {
    if (!valid) return;
    scheduleSubmitting.value = true;
    try {
      if (isEditSchedule.value && editScheduleId.value) {
        await api.put(`/schedules/${editScheduleId.value}`, {
          shiftType: scheduleForm.value.shiftType,
          serviceLocationId: scheduleForm.value.serviceLocationId,
          isLeader: scheduleForm.value.isLeader,
          date: scheduleForm.value.date,
        });
        ElMessage.success('排班更新成功');
      } else {
        await api.post('/schedules', scheduleForm.value);
        ElMessage.success('排班创建成功');
      }
      scheduleDialogVisible.value = false;
      fetchSchedules();
    } catch (error: any) {
      if (error.response?.status === 409) {
        ElMessage.warning(`排班冲突：${error.response.data.conflicts?.join('、') || '请检查排班'}`);
      } else {
        ElMessage.error(isEditSchedule.value ? '更新排班失败' : '创建排班失败');
      }
    } finally {
      scheduleSubmitting.value = false;
    }
  });
}

async function handleDeleteSchedule(row: Schedule) {
  try {
    await ElMessageBox.confirm('确定要删除该排班记录吗？', '确认', { type: 'warning' });
    await api.delete(`/schedules/${row.id}`);
    ElMessage.success('排班已删除');
    cellDetailVisible.value = false;
    fetchSchedules();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除排班失败');
    }
  }
}

function handleCellClick(row: any, day: any) {
  const cellSchedules = getSchedulesForCell(row.key, day.dateStr);
  cellDetailSchedules.value = cellSchedules;
  cellDetailRow.value = row;
  cellDetailDay.value = day;
  cellDetailVisible.value = true;
}

onMounted(() => {
  fetchServiceLocations();
  fetchLibrarians();
  fetchSchedules();
});
</script>

<style scoped lang="scss">
.schedule-container {
  .schedule-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;

      .week-label {
        font-size: 15px;
        font-weight: 600;
        color: #303133;
        min-width: 200px;
        text-align: center;
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
    }
  }

  .schedule-grid {
    margin-top: 20px;
    overflow-x: auto;
  }

  .schedule-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 900px;

    th, td {
      border: 1px solid #ebeef5;
      padding: 6px 8px;
      vertical-align: top;
      font-size: 13px;
    }

    th {
      background-color: #f5f7fa;
      font-weight: 600;
      color: #606266;
      text-align: center;
    }

    .corner-cell {
      width: 140px;
      min-width: 140px;
    }

    .day-header {
      min-width: 100px;

      .day-label {
        font-size: 14px;
        font-weight: 600;
      }

      .day-date {
        font-size: 11px;
        color: #909399;
        margin-top: 2px;
      }
    }

    .is-today {
      background-color: #ecf5ff !important;
    }

    .row-label-cell {
      background-color: #fafafa;
      font-weight: 500;
      vertical-align: middle;
      text-align: center;

      .row-label {
        font-size: 13px;
        color: #303133;
      }
    }

    .shift-cell {
      cursor: pointer;
      min-height: 50px;
      transition: background-color 0.2s;

      &:hover {
        background-color: #f0f7ff;
      }
    }

    .shift-tags {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .shift-tag {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 6px;
      border-left: 3px solid;
      border-radius: 3px;
      background: #fff;
      font-size: 12px;

      .shift-user,
      .shift-location {
        font-size: 12px;
        color: #606266;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .leader-icon {
        color: #e6a23c;
        font-size: 14px;
        margin-left: auto;
        flex-shrink: 0;
      }
    }
  }

  .empty-cell {
    text-align: center;
    padding: 20px 0;
  }
}
</style>
