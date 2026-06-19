<template>
  <div
    class="report-center"
    :class="{ 'print-mode': printMode }"
  >
    <div class="report-toolbar">
      <div class="toolbar-left">
        <el-date-picker
          v-model="selectedMonth"
          type="month"
          placeholder="选择月份"
          format="YYYY年MM月"
          value-format="YYYY-MM"
          :clearable="false"
          style="width: 180px"
          @change="handleMonthChange"
        />
        <el-button
          type="primary"
          :icon="Refresh"
          @click="fetchAllData"
        >
          刷新数据
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-button
          :icon="Printer"
          @click="handlePrint"
        >
          打印报表
        </el-button>
        <el-button
          type="success"
          :icon="Download"
          @click="handleExportPDF"
        >
          导出 PDF
        </el-button>
        <el-button
          :icon="Setting"
          @click="coverConfigVisible = true"
        >
          封面配置
        </el-button>
      </div>
    </div>

    <div
      ref="reportContent"
      class="report-content"
    >
      <div
        v-if="showCover"
        class="report-cover print-only"
      >
        <div class="cover-inner">
          <h1 class="cover-title">{{ coverConfig.libraryName }}</h1>
          <h2 class="cover-subtitle">统计月报</h2>
          <div class="cover-period">统计周期：{{ periodLabel }}</div>
          <div class="cover-date">生成日期：{{ todayFormatted }}</div>
        </div>
      </div>

      <div class="report-section">
        <h3 class="section-title">核心指标概览</h3>
        <el-row :gutter="16">
          <el-col
            v-for="(label, key) in METRIC_LABELS"
            :key="key"
            :xs="24"
            :sm="12"
            :lg="8"
            :xl="4"
            class="mb-16"
          >
            <el-card
              shadow="hover"
              class="metric-card"
            >
              <div class="metric-header">
                <span class="metric-label">{{ label }}</span>
              </div>
              <div class="metric-value">
                {{ reportData?.coreMetrics[key as keyof CoreMetrics]?.value ?? '-' }}
              </div>
              <div class="metric-changes">
                <span class="change-item">
                  <span class="change-label">环比</span>
                  <span
                    class="change-value"
                    :class="getChangeClass(reportData?.coreMetrics[key as keyof CoreMetrics]?.momChange)"
                  >
                    {{ formatChange(reportData?.coreMetrics[key as keyof CoreMetrics]?.momChange) }}
                  </span>
                </span>
                <span class="change-item">
                  <span class="change-label">同比</span>
                  <span
                    class="change-value"
                    :class="getChangeClass(reportData?.coreMetrics[key as keyof CoreMetrics]?.yoyChange)"
                  >
                    {{ formatChange(reportData?.coreMetrics[key as keyof CoreMetrics]?.yoyChange) }}
                  </span>
                </span>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-card
          v-if="reportData?.interpretation"
          shadow="hover"
          class="interpretation-card"
        >
          <template #header>
            <span class="section-subtitle">简要解读</span>
          </template>
          <p class="interpretation-text">{{ reportData.interpretation }}</p>
        </el-card>
      </div>

      <div class="report-section">
        <h3 class="section-title">分类借阅分布</h3>
        <el-row :gutter="20">
          <el-col
            :xs="24"
            :lg="14"
            class="mb-20"
          >
            <el-card shadow="hover">
              <div
                ref="categoryChartRef"
                style="height: 380px"
              />
            </el-card>
          </el-col>
          <el-col
            :xs="24"
            :lg="10"
            class="mb-20"
          >
            <el-card shadow="hover">
              <el-table
                :data="categoryData?.distribution || []"
                border
                size="small"
                style="width: 100%"
              >
                <el-table-column
                  prop="name"
                  label="分类名称"
                />
                <el-table-column
                  prop="count"
                  label="借阅次数"
                  width="100"
                  align="right"
                />
                <el-table-column
                  label="占比"
                  width="100"
                  align="right"
                >
                  <template #default="{ row }">
                    {{ getCategoryPercent(row.count) }}%
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <div class="report-section">
        <h3 class="section-title">热门图书 Top 榜</h3>
        <el-card shadow="hover">
          <el-table
            :data="topBooksData?.topBooks || []"
            border
            stripe
          >
            <el-table-column
              label="排名"
              width="70"
              align="center"
            >
              <template #default="{ $index }">
                <el-tag
                  v-if="$index < 3"
                  :type="$index === 0 ? 'danger' : $index === 1 ? 'warning' : ''"
                  effect="dark"
                  round
                >
                  {{ $index + 1 }}
                </el-tag>
                <span v-else>{{ $index + 1 }}</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="title"
              label="书名"
              min-width="180"
            />
            <el-table-column
              prop="author"
              label="作者"
              width="140"
            />
            <el-table-column
              prop="category"
              label="分类"
              width="120"
            />
            <el-table-column
              prop="count"
              label="借阅次数"
              width="100"
              align="right"
            >
              <template #default="{ row }">
                <span class="borrow-count">{{ row.count }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>

      <div class="report-section">
        <h3 class="section-title">馆员经办量</h3>
        <el-row :gutter="20">
          <el-col
            :xs="24"
            :lg="12"
            class="mb-20"
          >
            <el-card shadow="hover">
              <div
                ref="librarianChartRef"
                style="height: 350px"
              />
            </el-card>
          </el-col>
          <el-col
            :xs="24"
            :lg="12"
            class="mb-20"
          >
            <el-card shadow="hover">
              <el-table
                :data="librarianData?.librarianVolume || []"
                border
                size="small"
              >
                <el-table-column
                  prop="username"
                  label="馆员"
                />
                <el-table-column
                  prop="shiftCount"
                  label="排班次数"
                  width="100"
                  align="right"
                />
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <div class="report-section">
        <h3 class="section-title">逾期与罚金趋势</h3>
        <el-card shadow="hover">
          <div class="overdue-summary">
            <div class="summary-item">
              <span class="summary-label">本月逾期总量</span>
              <span class="summary-value">{{ overdueData?.summary?.totalOverdue ?? 0 }} 次</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">预估罚金总额</span>
              <span class="summary-value danger">¥ {{ overdueData?.summary?.totalFine?.toFixed(2) ?? '0.00' }}</span>
            </div>
          </div>
          <div
            ref="overdueChartRef"
            style="height: 380px"
          />
        </el-card>
      </div>
    </div>

    <el-dialog
      v-model="coverConfigVisible"
      title="报表封面配置"
      width="480px"
    >
      <el-form label-width="100px">
        <el-form-item label="馆名">
          <el-input
            v-model="coverConfig.libraryName"
            placeholder="请输入图书馆名称"
          />
        </el-form-item>
        <el-form-item label="显示封面">
          <el-switch v-model="showCover" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="coverConfigVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="saveCoverConfig"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue';
import * as echarts from 'echarts';
import api from '../api';
import { Printer, Download, Setting, Refresh } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import type {
  MonthlyReportData,
  CategoryDistributionData,
  TopBooksData,
  LibrarianVolumeData,
  OverdueTrendData,
  CoreMetrics,
} from '../types';
import { METRIC_LABELS } from '../types';

const selectedMonth = ref(new Date().toISOString().slice(0, 7));
const reportData = ref<MonthlyReportData | null>(null);
const categoryData = ref<CategoryDistributionData | null>(null);
const topBooksData = ref<TopBooksData | null>(null);
const librarianData = ref<LibrarianVolumeData | null>(null);
const overdueData = ref<OverdueTrendData | null>(null);

const printMode = ref(false);
const coverConfigVisible = ref(false);
const showCover = ref(true);
const coverConfig = ref({ libraryName: localStorage.getItem('report_library_name') || '图书管理系统' });

const categoryChartRef = ref<HTMLElement | null>(null);
const librarianChartRef = ref<HTMLElement |HTMLElement | null>(null);
const overdueChartRef = ref<HTMLElement | null>(null);
const reportContent = ref<HTMLElement | null>(null);

let categoryChartInstance: echarts.ECharts | null = null;
let librarianChartInstance: echarts.ECharts | null = null;
let overdueChartInstance: echarts.ECharts | null = null;

const periodLabel = computed(() => {
  if (!selectedMonth.value) return '';
  const [y, m] = selectedMonth.value.split('-');
  return `${y}年${parseInt(m)}月`;
});

const todayFormatted = computed(() => {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
});

const formatChange = (val?: number) => {
  if (val === undefined || val === null) return '-';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val}%`;
};

const getChangeClass = (val?: number) => {
  if (!val) return 'change-neutral';
  return val > 0 ? 'change-up' : 'change-down';
};

const getCategoryPercent = (count: number) => {
  const total = categoryData.value?.distribution.reduce((s, d) => s + d.count, 0) || 0;
  if (total === 0) return '0.0';
  return ((count / total) * 100).toFixed(1);
};

const fetchAllData = async () => {
  const month = selectedMonth.value;
  try {
    const [report, category, topBooks, librarian, overdue]: any[] = await Promise.all([
      api.get('/stats/report/monthly', { params: { month } }),
      api.get('/stats/report/category-distribution', { params: { month } }),
      api.get('/stats/report/top-books', { params: { month } }),
      api.get('/stats/report/librarian-volume', { params: { month } }),
      api.get('/stats/report/overdue-trend', { params: { month } }),
    ]);
    reportData.value = report;
    categoryData.value = category;
    topBooksData.value = topBooks;
    librarianData.value = librarian;
    overdueData.value = overdue;

    await nextTick();
    initCategoryChart();
    initLibrarianChart();
    initOverdueChart();
  } catch (error) {
    console.error('Failed to fetch report data:', error);
    ElMessage.error('获取报表数据失败');
  }
};

const handleMonthChange = () => {
  fetchAllData();
};

const initCategoryChart = () => {
  if (!categoryChartRef.value) return;
  if (categoryChartInstance) categoryChartInstance.dispose();
  categoryChartInstance = echarts.init(categoryChartRef.value);
  const data = categoryData.value?.distribution || [];
  categoryChartInstance.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
    legend: {
      bottom: '0',
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 12 },
    },
    series: [{
      type: 'pie',
      radius: ['35%', '60%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%', fontSize: 11 },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: data.map(d => ({ value: d.count, name: d.name })),
    }],
  });
};

const initLibrarianChart = () => {
  if (!librarianChartRef.value) return;
  if (librarianChartInstance) librarianChartInstance.dispose();
  librarianChartInstance = echarts.init(librarianChartRef.value);
  const data = librarianData.value?.librarianVolume || [];
  librarianChartInstance.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 80, right: 30, bottom: 30, top: 20 },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: data.map(d => d.username).reverse(),
      axisLabel: { fontSize: 12 },
    },
    series: [{
      type: 'bar',
      data: data.map(d => d.shiftCount).reverse(),
      barWidth: 20,
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#409eff' },
          { offset: 1, color: '#67c23a' },
        ]),
      },
      label: { show: true, position: 'right', fontSize: 12 },
    }],
  });
};

const initOverdueChart = () => {
  if (!overdueChartRef.value) return;
  if (overdueChartInstance) overdueChartInstance.dispose();
  overdueChartInstance = echarts.init(overdueChartRef.value);
  const data = overdueData.value?.trend || [];
  overdueChartInstance.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['逾期数量', '预估罚金(元)'], top: 0 },
    grid: { left: 60, right: 60, bottom: 30, top: 40 },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date.slice(8)),
      axisLabel: { fontSize: 11 },
    },
    yAxis: [
      { type: 'value', name: '逾期数', position: 'left' },
      { type: 'value', name: '罚金(元)', position: 'right' },
    ],
    series: [
      {
        name: '逾期数量',
        type: 'bar',
        data: data.map(d => d.overdueCount),
        itemStyle: { color: '#e6a23c', borderRadius: [2, 2, 0, 0] },
        barWidth: 12,
      },
      {
        name: '预估罚金(元)',
        type: 'line',
        yAxisIndex: 1,
        data: data.map(d => d.estimatedFine),
        smooth: true,
        lineStyle: { color: '#f56c6c' },
        itemStyle: { color: '#f56c6c' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245, 108, 108, 0.3)' },
            { offset: 1, color: 'rgba(245, 108, 108, 0.05)' },
          ]),
        },
      },
    ],
  });
};

const handleResize = () => {
  categoryChartInstance?.resize();
  librarianChartInstance?.resize();
  overdueChartInstance?.resize();
};

const saveCoverConfig = () => {
  localStorage.setItem('report_library_name', coverConfig.value.libraryName);
  coverConfigVisible.value = false;
  ElMessage.success('封面配置已保存');
};

const handlePrint = () => {
  printMode.value = true;
  nextTick(() => {
    window.print();
    printMode.value = false;
  });
};

const handleExportPDF = () => {
  printMode.value = true;
  nextTick(() => {
    window.print();
    printMode.value = false;
  });
};

watch(showCover, (val) => {
  localStorage.setItem('report_show_cover', val ? '1' : '0');
});

onMounted(() => {
  const savedName = localStorage.getItem('report_library_name');
  if (savedName) coverConfig.value.libraryName = savedName;
  const savedShow = localStorage.getItem('report_show_cover');
  if (savedShow !== null) showCover.value = savedShow === '1';

  fetchAllData();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  categoryChartInstance?.dispose();
  librarianChartInstance?.dispose();
  overdueChartInstance?.dispose();
});
</script>

<style scoped lang="scss">
.report-center {
  &.print-mode {
    .report-toolbar {
      display: none;
    }
    .print-only {
      display: block !important;
    }
  }
}

.report-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
}

.report-cover {
  display: none;
  page-break-after: always;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;

  .cover-inner {
    text-align: center;
    padding: 60px;
  }

  .cover-title {
    font-size: 36px;
    font-weight: bold;
    color: #303133;
    margin-bottom: 16px;
  }

  .cover-subtitle {
    font-size: 28px;
    color: #409eff;
    margin-bottom: 32px;
    font-weight: normal;
  }

  .cover-period,
  .cover-date {
    font-size: 16px;
    color: #606266;
    margin-bottom: 8px;
  }
}

.report-section {
  margin-bottom: 24px;

  .section-title {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 16px 0;
    padding-left: 10px;
    border-left: 3px solid #409eff;
  }

  .section-subtitle {
    font-size: 15px;
    font-weight: 600;
    color: #303133;
  }
}

.metric-card {
  .metric-header {
    margin-bottom: 8px;
  }

  .metric-label {
    font-size: 13px;
    color: #909399;
  }

  .metric-value {
    font-size: 28px;
    font-weight: 700;
    color: #303133;
    margin-bottom: 8px;
  }

  .metric-changes {
    display: flex;
    gap: 16px;

    .change-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .change-label {
      font-size: 12px;
      color: #909399;
    }

    .change-value {
      font-size: 13px;
      font-weight: 600;
    }

    .change-up {
      color: #f56c6c;
    }

    .change-down {
      color: #67c23a;
    }

    .change-neutral {
      color: #909399;
    }
  }
}

.interpretation-card {
  margin-top: 16px;

  .interpretation-text {
    font-size: 14px;
    color: #606266;
    line-height: 1.8;
    margin: 0;
  }
}

.overdue-summary {
  display: flex;
  gap: 40px;
  margin-bottom: 16px;

  .summary-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .summary-label {
    font-size: 14px;
    color: #909399;
  }

  .summary-value {
    font-size: 18px;
    font-weight: 600;
    color: #303133;

    &.danger {
      color: #f56c6c;
    }
  }
}

.borrow-count {
  font-weight: 600;
  color: #409eff;
}

.mb-16 {
  margin-bottom: 16px;
}

.mb-20 {
  margin-bottom: 20px;
}

@media print {
  .report-toolbar {
    display: none !important;
  }

  .print-only {
    display: block !important;
  }

  .report-cover {
    display: flex !important;
  }

  .report-section {
    page-break-inside: avoid;
  }

  .el-card {
    box-shadow: none !important;
    border: 1px solid #dcdfe6;
  }
}
</style>
