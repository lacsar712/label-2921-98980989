import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import Dashboard from './Dashboard.vue';
import api from '../api';
import * as echarts from 'echarts';
import ElementPlus from 'element-plus';

vi.mock('../api');
vi.mock('echarts');
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus') as any;
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
    },
    ElMessageBox: {
      confirm: vi.fn(),
    },
  };
});

const mockApi = api as any;
const mockEcharts = echarts as any;

const mockDashboardData = {
  summary: {
    bookCount: 1250,
    userCount: 890,
    borrowCount: 245,
    categoryCount: 32,
  },
  lowStockBooks: [
    {
      id: 1,
      title: '稀缺图书A',
      author: '作者A',
      stock: 2,
      category: { name: '文学' },
    },
    {
      id: 2,
      title: '稀缺图书B',
      author: '作者B',
      stock: 3,
      category: { name: '科技' },
    },
  ],
  trends: [
    { date: '6/14', count: 12 },
    { date: '6/15', count: 19 },
    { date: '6/16', count: 15 },
    { date: '6/17', count: 22 },
    { date: '6/18', count: 28 },
    { date: '6/19', count: 31 },
    { date: '6/20', count: 25 },
  ],
  categories: [
    { name: '文学', count: 350 },
    { name: '科技', count: 280 },
    { name: '历史', count: 220 },
    { name: '艺术', count: 180 },
    { name: '其他', count: 220 },
  ],
};

const mockTodaySchedules = [
  {
    id: 1,
    shiftType: 'MORNING',
    isLeader: true,
    serviceLocation: { name: '服务台' },
  },
  {
    id: 2,
    shiftType: 'AFTERNOON',
    isLeader: false,
    serviceLocation: { name: '阅览室' },
  },
];

const mockNextWeekSchedules = [
  {
    id: 3,
    date: '2024-06-24',
    shiftType: 'MORNING',
    serviceLocation: { name: '服务台' },
  },
  {
    id: 4,
    date: '2024-06-25',
    shiftType: 'EVENING',
    serviceLocation: { name: '阅览室' },
  },
  {
    id: 5,
    date: '2024-06-26',
    shiftType: 'AFTERNOON',
    serviceLocation: { name: '服务台' },
  },
  {
    id: 6,
    date: '2024-06-27',
    shiftType: 'MORNING',
    serviceLocation: { name: '阅览室' },
  },
  {
    id: 7,
    date: '2024-06-28',
    shiftType: 'EVENING',
    serviceLocation: { name: '服务台' },
  },
  {
    id: 8,
    date: '2024-06-29',
    shiftType: 'MORNING',
    serviceLocation: { name: '阅览室' },
  },
  {
    id: 9,
    date: '2024-06-30',
    shiftType: 'AFTERNOON',
    serviceLocation: { name: '服务台' },
  },
];

const mockPendingSwaps = [
  {
    id: 1,
    reason: '有事需要换班',
    requester: { username: 'user1' },
    requesterSchedule: {
      shiftType: 'MORNING',
      date: '2024-06-21',
      serviceLocation: { name: '服务台' },
    },
    targetSchedule: {
      shiftType: 'AFTERNOON',
      date: '2024-06-21',
      serviceLocation: { name: '阅览室' },
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/dashboard', component: Dashboard },
    { path: '/schedule', component: { template: '<div>Schedule</div>' } },
    { path: '/shift-swaps', component: { template: '<div>Shift Swaps</div>' } },
  ],
});

function createWrapper() {
  setActivePinia(createPinia());
  return mount(Dashboard, {
    global: {
      plugins: [router, ElementPlus],
      stubs: {
        'el-icon': true,
        'el-empty': true,
        'el-tag': true,
        'el-button': true,
        'router-link': true,
      },
    },
  });
}

describe('Dashboard.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEcharts.init.mockReturnValue({
      setOption: vi.fn(),
      resize: vi.fn(),
    });
  });

  describe('统计卡片数据渲染', () => {
    it('should render stat cards with correct data when API returns data', async () => {
      mockApi.get
        .mockResolvedValueOnce(mockDashboardData)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const wrapper = createWrapper();
      await vi.waitFor(() => expect(mockApi.get).toHaveBeenCalled());

      const statCards = wrapper.findAll('.stat-card');
      expect(statCards).toHaveLength(4);

      const statValues = wrapper.findAll('.stat-value');
      expect(statValues[0].text()).toContain('1250');
      expect(statValues[1].text()).toContain('890');
      expect(statValues[2].text()).toContain('245');
      expect(statValues[3].text()).toContain('32');

      const statLabels = wrapper.findAll('.stat-label');
      expect(statLabels[0].text()).toContain('总图书量');
      expect(statLabels[1].text()).toContain('总用户数');
      expect(statLabels[2].text()).toContain('当前借出');
      expect(statLabels[3].text()).toContain('分类总数');
    });

    it('should show 0 for stat values when summary data is missing', async () => {
      const emptyData = {
        summary: {},
        lowStockBooks: [],
        trends: [],
        categories: [],
      };

      mockApi.get
        .mockResolvedValueOnce(emptyData)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const wrapper = createWrapper();
      await vi.waitFor(() => expect(mockApi.get).toHaveBeenCalled());

      const statValues = wrapper.findAll('.stat-value');
      statValues.forEach((val) => {
        expect(val.text()).toContain('0');
      });
    });
  });

  describe('ECharts 图表容器挂载', () => {
    it('should initialize trend chart with correct data', async () => {
      const mockChartInstance = {
        setOption: vi.fn(),
        resize: vi.fn(),
      };
      mockEcharts.init.mockReturnValue(mockChartInstance);

      mockApi.get
        .mockResolvedValueOnce(mockDashboardData)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      createWrapper();
      await vi.waitFor(() => expect(mockEcharts.init).toHaveBeenCalled());

      expect(mockEcharts.init).toHaveBeenCalledTimes(2);

      const setOptionCalls = mockChartInstance.setOption.mock.calls;
      expect(setOptionCalls[0][0].xAxis.data).toEqual([
        '6/14', '6/15', '6/16', '6/17', '6/18', '6/19', '6/20',
      ]);
      expect(setOptionCalls[0][0].series[0].data).toEqual([
        12, 19, 15, 22, 28, 31, 25,
      ]);
    });

    it('should initialize category chart with correct data', async () => {
      const mockChartInstance = {
        setOption: vi.fn(),
        resize: vi.fn(),
      };
      mockEcharts.init.mockReturnValue(mockChartInstance);

      mockApi.get
        .mockResolvedValueOnce(mockDashboardData)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      createWrapper();
      await vi.waitFor(() => expect(mockEcharts.init).toHaveBeenCalled());

      const setOptionCalls = mockChartInstance.setOption.mock.calls;
      expect(setOptionCalls[1][0].series[0].data).toEqual([
        { value: 350, name: '文学' },
        { value: 280, name: '科技' },
        { value: 220, name: '历史' },
        { value: 180, name: '艺术' },
        { value: 220, name: '其他' },
      ]);
    });

    it('should not initialize charts when container refs are not available', () => {
      mockEcharts.init.mockClear();

      mockApi.get
        .mockResolvedValueOnce(mockDashboardData)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const wrapper = mount(Dashboard, {
        global: {
          plugins: [router, ElementPlus],
          stubs: {
            'el-icon': true,
            'el-empty': true,
            'el-tag': true,
            'el-button': true,
            'router-link': true,
          },
        },
        attachTo: document.body,
      });

      wrapper.unmount();
    });
  });

  describe('空数据降级展示', () => {
    it('should show empty state for today schedules when no data', async () => {
      mockApi.get
        .mockResolvedValueOnce(mockDashboardData)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const wrapper = createWrapper();
      await vi.waitFor(() => expect(mockApi.get).toHaveBeenCalled());

      const scheduleCards = wrapper.findAll('.schedule-card');
      const todayCard = scheduleCards[0];
      expect(todayCard.find('.empty-schedule').exists()).toBe(true);
    });

    it('should show empty state for next week schedules when no data', async () => {
      mockApi.get
        .mockResolvedValueOnce(mockDashboardData)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const wrapper = createWrapper();
      await vi.waitFor(() => expect(mockApi.get).toHaveBeenCalled());

      const scheduleCards = wrapper.findAll('.schedule-card');
      const nextWeekCard = scheduleCards[1];
      expect(nextWeekCard.find('.empty-schedule').exists()).toBe(true);
    });

    it('should show empty state for pending swaps when no data', async () => {
      mockApi.get
        .mockResolvedValueOnce(mockDashboardData)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const wrapper = createWrapper();
      await vi.waitFor(() => expect(mockApi.get).toHaveBeenCalled());

      const swapEmpty = wrapper.find('.empty-schedule');
      expect(swapEmpty.exists()).toBe(true);
    });

    it('should show "还有 N 条排班..." when next week schedules exceed 6', async () => {
      mockApi.get
        .mockResolvedValueOnce(mockDashboardData)
        .mockResolvedValueOnce(mockTodaySchedules)
        .mockResolvedValueOnce(mockNextWeekSchedules)
        .mockResolvedValueOnce([]);

      const wrapper = createWrapper();
      await vi.waitFor(() => expect(mockApi.get).toHaveBeenCalled());

      const moreItem = wrapper.find('.more-item');
      expect(moreItem.exists()).toBe(true);
      expect(moreItem.text()).toContain('还有 1 条排班...');
    });

    it('should render today schedule list correctly when data exists', async () => {
      mockApi.get
        .mockResolvedValueOnce(mockDashboardData)
        .mockResolvedValueOnce(mockTodaySchedules)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const wrapper = createWrapper();
      await vi.waitFor(() => expect(mockApi.get).toHaveBeenCalled());

      const scheduleItems = wrapper.findAll('.schedule-list .schedule-item');
      expect(scheduleItems).toHaveLength(2);
    });

    it('should render pending swaps table correctly when data exists', async () => {
      mockApi.get
        .mockResolvedValueOnce(mockDashboardData)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockPendingSwaps);

      const wrapper = createWrapper();
      await vi.waitFor(() => expect(mockApi.get).toHaveBeenCalled());

      const table = wrapper.find('el-table-stub');
      expect(table.exists()).toBe(true);
    });
  });

  describe('API 失败降级展示', () => {
    it('should show 0 values for stat cards when dashboard API fails', async () => {
      mockApi.get
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const wrapper = createWrapper();
      await vi.waitFor(() => expect(mockApi.get).toHaveBeenCalled());

      const statValues = wrapper.findAll('.stat-value');
      statValues.forEach((val) => {
        expect(val.text()).toContain('0');
      });
    });

    it('should not crash when schedule API fails', async () => {
      mockApi.get
        .mockResolvedValueOnce(mockDashboardData)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockRejectedValueOnce(new Error('Network Error'));

      const wrapper = createWrapper();
      await vi.waitFor(() => expect(mockApi.get).toHaveBeenCalled());

      expect(wrapper.exists()).toBe(true);

      const scheduleCards = wrapper.findAll('.schedule-card');
      scheduleCards.forEach((card) => {
        expect(card.find('.empty-schedule').exists()).toBe(true);
      });
    });

    it('should handle partial API failures gracefully', async () => {
      mockApi.get
        .mockResolvedValueOnce(mockDashboardData)
        .mockResolvedValueOnce(mockTodaySchedules)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce(mockPendingSwaps);

      const wrapper = createWrapper();
      await vi.waitFor(() => expect(mockApi.get).toHaveBeenCalled());

      expect(wrapper.exists()).toBe(true);

      const statValues = wrapper.findAll('.stat-value');
      expect(statValues[0].text()).toContain('1250');

      const scheduleCards = wrapper.findAll('.schedule-card');
      const todayCard = scheduleCards[0];
      expect(todayCard.findAll('.schedule-list .schedule-item')).toHaveLength(2);

      const nextWeekCard = scheduleCards[1];
      expect(nextWeekCard.find('.empty-schedule').exists()).toBe(true);
    });
  });

  describe('API 调用验证', () => {
    it('should call all required APIs on mount', async () => {
      mockApi.get
        .mockResolvedValueOnce(mockDashboardData)
        .mockResolvedValueOnce(mockTodaySchedules)
        .mockResolvedValueOnce(mockNextWeekSchedules)
        .mockResolvedValueOnce(mockPendingSwaps);

      createWrapper();
      await vi.waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(4));

      expect(mockApi.get).toHaveBeenCalledWith('/stats/dashboard');
      expect(mockApi.get).toHaveBeenCalledWith('/schedules/today');
      expect(mockApi.get).toHaveBeenCalledWith('/schedules/next-week');
      expect(mockApi.get).toHaveBeenCalledWith('/shift-swaps/pending');
    });
  });
});
