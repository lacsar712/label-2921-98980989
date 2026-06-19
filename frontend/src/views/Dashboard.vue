<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col
        v-for="(val, key) in summaryMap"
        :key="key"
        :xs="24"
        :sm="12"
        :lg="6"
        class="mb-20"
      >
        <el-card
          shadow="hover"
          class="stat-card"
          body-style="display: flex; align-items: center; justify-content: space-between; padding: 20px;"
        >
          <div class="stat-content">
            <div class="stat-label">
              {{ val.label }}
            </div>
            <div class="stat-value">
              {{ summary[key] || 0 }}
            </div>
          </div>
          <el-icon
            class="stat-icon"
            :style="{ color: val.color }"
          >
            <component :is="val.icon" />
          </el-icon>
        </el-card>
      </el-col>
    </el-row>

    <el-row
      :gutter="20"
      class="mt-20"
    >
      <el-col
        :xs="24"
        :lg="16"
        class="mb-20"
      >
        <el-card
          shadow="hover"
          header="借阅趋势 (最近7天)"
        >
          <div
            ref="trendChart"
            style="height: 350px"
          />
        </el-card>
      </el-col>
      <el-col
        :xs="24"
        :lg="8"
        class="mb-20"
      >
        <el-card
          shadow="hover"
          header="图书分类占比"
        >
          <div
            ref="categoryChart"
            style="height: 350px"
          />
        </el-card>
      </el-col>
    </el-row>

    <el-row
      :gutter="20"
      class="mt-20"
    >
      <el-col
        :xs="24"
        :lg="12"
        class="mb-20"
      >
        <el-card
          shadow="hover"
          class="schedule-card"
        >
          <template #header>
            <div class="card-header">
              <span>今日班次</span>
              <router-link to="/schedule">
                <el-button
                  type="primary"
                  link
                  size="small"
                >
                  查看排班表
                </el-button>
              </router-link>
            </div>
          </template>
          <div
            v-if="todaySchedules.length === 0"
            class="empty-schedule"
          >
            <el-empty
              description="今日暂无排班"
              :image-size="60"
            />
          </div>
          <div
            v-else
            class="schedule-list"
          >
            <div
              v-for="s in todaySchedules"
              :key="s.id"
              class="schedule-item"
            >
              <el-tag
                :type="getShiftTagType(s.shiftType)"
                size="small"
                effect="dark"
              >
                {{ getShiftLabel(s.shiftType) }}
              </el-tag>
              <span class="schedule-location">{{ s.serviceLocation?.name }}</span>
              <el-icon
                v-if="s.isLeader"
                class="leader-icon"
              >
                <Star />
              </el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col
        :xs="24"
        :lg="12"
        class="mb-20"
      >
        <el-card
          shadow="hover"
          class="schedule-card"
        >
          <template #header>
            <div class="card-header">
              <span>下周排班预览</span>
              <router-link to="/schedule">
                <el-button
                  type="primary"
                  link
                  size="small"
                >
                  查看详情
                </el-button>
              </router-link>
            </div>
          </template>
          <div
            v-if="nextWeekSchedules.length === 0"
            class="empty-schedule"
          >
            <el-empty
              description="下周暂无排班"
              :image-size="60"
            />
          </div>
          <div
            v-else
            class="schedule-list compact"
          >
            <div
              v-for="s in nextWeekSchedules.slice(0, 6)"
              :key="s.id"
              class="schedule-item compact"
            >
              <span class="schedule-date">{{ formatShortDate(s.date) }}</span>
              <el-tag
                :type="getShiftTagType(s.shiftType)"
                size="small"
              >
                {{ getShiftLabel(s.shiftType) }}
              </el-tag>
              <span class="schedule-location">{{ s.serviceLocation?.name }}</span>
            </div>
            <div
              v-if="nextWeekSchedules.length > 6"
              class="more-item"
            >
              还有 {{ nextWeekSchedules.length - 6 }} 条排班...
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row
      :gutter="20"
      class="mt-20"
    >
      <el-col :span="24">
        <el-card
          shadow="hover"
        >
          <template #header>
            <div class="card-header">
              <span>待确认换班请求</span>
              <router-link to="/shift-swaps">
                <el-button
                  type="primary"
                  link
                  size="small"
                >
                  查看全部
                </el-button>
              </router-link>
            </div>
          </template>
          <div
            v-if="pendingSwaps.length === 0"
            class="empty-schedule"
          >
            <el-empty
              description="暂无待确认换班请求"
              :image-size="60"
            />
          </div>
          <el-table
            v-else
            :data="pendingSwaps"
            border
            size="small"
          >
            <el-table-column
              label="发起人"
              width="90"
            >
              <template #default="{ row }">
                {{ row.requester?.username }}
              </template>
            </el-table-column>
            <el-table-column
              label="发起人班次"
              min-width="150"
            >
              <template #default="{ row }">
                <el-tag
                  :type="getShiftTagType(row.requesterSchedule?.shiftType)"
                  size="small"
                >
                  {{ getShiftLabel(row.requesterSchedule?.shiftType) }}
                </el-tag>
                {{ formatShortDate(row.requesterSchedule?.date) }} {{ row.requesterSchedule?.serviceLocation?.name }}
              </template>
            </el-table-column>
            <el-table-column
              label="目标班次"
              min-width="150"
            >
              <template #default="{ row }">
                <el-tag
                  :type="getShiftTagType(row.targetSchedule?.shiftType)"
                  size="small"
                >
                  {{ getShiftLabel(row.targetSchedule?.shiftType) }}
                </el-tag>
                {{ formatShortDate(row.targetSchedule?.date) }} {{ row.targetSchedule?.serviceLocation?.name }}
              </template>
            </el-table-column>
            <el-table-column
              prop="reason"
              label="原因"
              min-width="100"
              show-overflow-tooltip
            />
            <el-table-column
              label="操作"
              width="120"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button
                  link
                  type="success"
                  size="small"
                  @click="handleApproveSwap(row)"
                >
                  同意
                </el-button>
                <el-button
                  link
                  type="danger"
                  size="small"
                  @click="handleRejectSwap(row)"
                >
                  拒绝
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row
      :gutter="20"
      class="mt-20"
    >
      <el-col :span="24">
        <el-card
          shadow="hover"
          header="库存预警 (库存少于5本)"
        >
          <el-table
            :data="lowStockBooks"
            style="width: 100%"
          >
            <el-table-column
              prop="title"
              label="书名"
            />
            <el-table-column
              prop="author"
              label="作者"
            />
            <el-table-column
              prop="category.name"
              label="分类"
            />
            <el-table-column
              prop="stock"
              label="当前库存"
            >
              <template #default="{ row }">
                <el-tag type="danger">
                  {{ row.stock }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import api from '../api';
import { Notebook, User, Switch, Collection, Star } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { Schedule, ShiftType, ShiftSwapRequest } from '../types';
import { SHIFT_LABELS } from '../types';

const summary = ref<any>({});
const lowStockBooks = ref<any[]>([]);
const trendChart = ref<HTMLElement | null>(null);
const categoryChart = ref<HTMLElement | null>(null);
let trendInstance: echarts.ECharts | null = null;
let categoryInstance: echarts.ECharts | null = null;

const todaySchedules = ref<Schedule[]>([]);
const nextWeekSchedules = ref<Schedule[]>([]);
const pendingSwaps = ref<ShiftSwapRequest[]>([]);

const summaryMap = {
  bookCount: { label: '总图书量', icon: Notebook, color: '#409eff' },
  userCount: { label: '总用户数', icon: User, color: '#67c23a' },
  borrowCount: { label: '当前借出', icon: Switch, color: '#e6a23c' },
  categoryCount: { label: '分类总数', icon: Collection, color: '#f56c6c' }
};

const fetchData = async () => {
  try {
    const data: any = await api.get('/stats/dashboard');
    summary.value = data.summary;
    lowStockBooks.value = data.lowStockBooks;
    initTrendChart(data.trends);
    initCategoryChart(data.categories);
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
  }
};

const initTrendChart = (trends: any[]) => {
  if (!trendChart.value) return;
  trendInstance = echarts.init(trendChart.value);
  trendInstance.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: trends.map(t => t.date) },
    yAxis: { type: 'value' },
    series: [{
      data: trends.map(t => t.count),
      type: 'line',
      smooth: true,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(64, 158, 255, 0.5)' },
          { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
        ])
      },
      lineStyle: { color: '#409eff' }
    }]
  });
};

const initCategoryChart = (categories: any[]) => {
  if (!categoryChart.value) return;
  categoryInstance = echarts.init(categoryChart.value);
  categoryInstance.setOption({
    tooltip: { trigger: 'item' },
    legend: { 
      bottom: '0', 
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 12 }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
      data: categories.map(c => ({ value: c.count, name: c.name }))
    }]
  });
};

const handleResize = () => {
  trendInstance?.resize();
  categoryInstance?.resize();
};

function getShiftLabel(type: ShiftType): string {
  return SHIFT_LABELS[type] || type;
}

function getShiftTagType(type: ShiftType): string {
  const map: Record<ShiftType, string> = { MORNING: 'warning', AFTERNOON: '', EVENING: 'success' };
  return map[type] || '';
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const fetchScheduleData = async () => {
  try {
    const [today, nextWeek, swaps]: any[] = await Promise.all([
      api.get('/schedules/today'),
      api.get('/schedules/next-week'),
      api.get('/shift-swaps/pending'),
    ]);
    todaySchedules.value = today;
    nextWeekSchedules.value = nextWeek;
    pendingSwaps.value = swaps;
  } catch (error) {
    console.error('Failed to fetch schedule data:', error);
  }
};

const handleApproveSwap = async (row: ShiftSwapRequest) => {
  try {
    await ElMessageBox.confirm('确定同意该换班请求？', '确认', { type: 'info' });
    await api.put(`/shift-swaps/${row.id}/approve`);
    ElMessage.success('已同意换班');
    fetchScheduleData();
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('操作失败');
  }
};

const handleRejectSwap = async (row: ShiftSwapRequest) => {
  try {
    await ElMessageBox.confirm('确定拒绝该换班请求？', '确认', { type: 'warning' });
    await api.put(`/shift-swaps/${row.id}/reject`);
    ElMessage.success('已拒绝换班');
    fetchScheduleData();
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('操作失败');
  }
};

onMounted(() => {
  fetchData();
  fetchScheduleData();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped lang="scss">
.mt-20 { margin-top: 20px; }

  .stat-card {
    .stat-content {
      .stat-label { font-size: 14px; color: #909399; margin-bottom: 8px; }
      .stat-value { font-size: 24px; font-weight: bold; color: #303133; }
    }

    .stat-icon {
      font-size: 40px;
      opacity: 0.8;
    }
  }

  .schedule-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .empty-schedule {
      padding: 10px 0;
    }

    .schedule-list {
      display: flex;
      flex-direction: column;
      gap: 8px;

      &.compact {
        gap: 6px;
      }
    }

    .schedule-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: #f9fafc;
      border-radius: 6px;

      &.compact {
        padding: 4px 8px;
        font-size: 12px;
      }

      .schedule-location {
        font-size: 13px;
        color: #606266;
      }

      .schedule-date {
        font-size: 12px;
        color: #909399;
        min-width: 36px;
      }

      .leader-icon {
        color: #e6a23c;
        margin-left: auto;
      }
    }

    .more-item {
      text-align: center;
      font-size: 12px;
      color: #909399;
      padding: 4px 0;
    }
  }
</style>
