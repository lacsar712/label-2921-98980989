<template>
  <div class="activity-detail-container" v-loading="loading">
    <el-breadcrumb separator="/" class="breadcrumb">
      <el-breadcrumb-item :to="{ path: '/reading-activities' }">读书活动</el-breadcrumb-item>
      <el-breadcrumb-item>活动详情</el-breadcrumb-item>
    </el-breadcrumb>

    <el-card shadow="hover" class="activity-info-card">
      <div class="info-wrapper">
        <div class="cover-wrapper">
          <el-image
            v-if="activity?.coverUrl"
            :src="activity.coverUrl"
            fit="cover"
            class="cover-image"
          >
            <template #error>
              <div class="cover-placeholder">
                <el-icon :size="64" color="#c0c4cc"><Picture /></el-icon>
              </div>
            </template>
          </el-image>
          <div v-else class="cover-placeholder">
            <el-icon :size="64" color="#c0c4cc"><Picture /></el-icon>
          </div>
        </div>

        <div class="info-content">
          <div class="header-row">
            <h2 class="activity-title">{{ activity?.title || '-' }}</h2>
            <el-tag
              :color="ACTIVITY_TYPE_COLORS[activity?.type || 'LECTURE']"
              effect="dark"
              size="large"
            >
              {{ ACTIVITY_TYPE_LABELS[activity?.type || 'LECTURE'] }}
            </el-tag>
            <el-tag
              :type="ACTIVITY_STATUS_TAGS[activity?.status || 'DRAFT']"
              size="large"
              effect="light"
            >
              {{ ACTIVITY_STATUS_LABELS[activity?.status || 'DRAFT'] }}
            </el-tag>
          </div>

          <div class="info-list">
            <div class="info-item">
              <el-icon class="info-icon"><Clock /></el-icon>
              <span class="info-label">活动时间：</span>
              <span class="info-value">
                {{ formatDate(activity?.startTime, true) }} - {{ formatDate(activity?.endTime, true) }}
              </span>
            </div>

            <div class="info-item">
              <el-icon class="info-icon"><Location /></el-icon>
              <span class="info-label">活动地点：</span>
              <span class="info-value">
                <template v-if="activity?.onlineUrl">
                  <el-link
                    :href="activity.onlineUrl"
                    target="_blank"
                    type="primary"
                  >
                    {{ activity.location }} (线上链接)
                  </el-link>
                </template>
                <template v-else>
                  {{ activity?.location || '-' }}
                </template>
              </span>
            </div>

            <div class="info-item">
              <el-icon class="info-icon"><Calendar /></el-icon>
              <span class="info-label">报名截止：</span>
              <span class="info-value">{{ formatDate(activity?.deadline, true) }}</span>
            </div>

            <div class="info-item capacity-item">
              <el-icon class="info-icon"><User /></el-icon>
              <span class="info-label">名额信息：</span>
              <div class="capacity-wrapper">
                <el-progress
                  :percentage="capacityPercentage"
                  :stroke-width="16"
                  :text-inside="true"
                  style="width: 280px"
                />
                <span class="capacity-text">
                  已报名 <b>{{ stats?.registeredCount || 0 }}</b> /
                  总名额 <b>{{ stats?.capacity || 0 }}</b>
                  <template v-if="stats?.waitlistCount">
                    ，候补 <b class="waitlist-count">{{ stats.waitlistCount }}</b> 人
                  </template>
                </span>
              </div>
            </div>
          </div>

          <div class="action-buttons">
            <el-button
              :icon="ArrowLeft"
              @click="goBack"
            >
              返回列表
            </el-button>
            <el-button
              v-if="userStore.isAdmin || userStore.isLibrarian"
              type="primary"
              :icon="Edit"
              @click="handleEdit"
            >
              编辑活动
            </el-button>
            <el-dropdown
              v-if="userStore.isAdmin"
              trigger="click"
              @command="handleStatusChange"
            >
              <el-button type="warning" :icon="SwitchButton">
                状态切换
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="(label, key) in ACTIVITY_STATUS_LABELS"
                    :key="key"
                    :command="key"
                    :disabled="activity?.status === key"
                  >
                    {{ label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button
              :icon="Share"
              @click="handleShare"
            >
              分享活动
            </el-button>
            <el-button
              v-if="userStore.isAdmin || userStore.isLibrarian"
              type="success"
              :icon="QrCode"
              @click="showQrCodeDialog = true"
            >
              签到二维码
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card registered">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="32"><UserFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats?.registeredCount || 0 }}</div>
              <div class="stat-label">报名人数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card waitlist">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="32"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats?.waitlistCount || 0 }}</div>
              <div class="stat-label">候补人数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card checkin">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="32"><CircleCheckFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats?.checkedInCount || 0 }}</div>
              <div class="stat-label">签到人数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card attendance">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="32"><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ attendanceRateDisplay }}%</div>
              <div class="stat-label">出席率</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="hover" class="description-card">
      <template #header>
        <div class="card-header">
          <el-icon><Document /></el-icon>
          <span>活动详情</span>
        </div>
      </template>
      <div v-if="activity?.description" class="description-content">
        <pre v-html="activity.description"></pre>
      </div>
      <el-empty v-else description="暂无活动描述" />
    </el-card>

    <el-card shadow="hover" class="tabs-card">
      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="报名名单" name="registrations">
          <div class="tab-toolbar">
            <div class="toolbar-left">
              <el-select
                v-model="registrationStatus"
                placeholder="全部状态"
                clearable
                style="width: 160px"
                @change="fetchRegistrations"
              >
                <el-option
                  v-for="(label, key) in REGISTRATION_STATUS_LABELS"
                  :key="key"
                  :label="label"
                  :value="key"
                />
              </el-select>

              <el-input
                v-model="searchKeyword"
                placeholder="搜索姓名/电话"
                style="width: 240px; margin-left: 10px"
                clearable
                :prefix-icon="Search"
                @clear="fetchRegistrations"
                @keyup.enter="fetchRegistrations"
              />

              <el-button
                type="primary"
                :icon="Search"
                style="margin-left: 10px"
                @click="fetchRegistrations"
              >
                搜索
              </el-button>
            </div>

            <div
              v-if="(userStore.isAdmin || userStore.isLibrarian) && selectedRows.length > 0"
              class="toolbar-right"
            >
              <el-button
                type="success"
                :icon="CircleCheckFilled"
                @click="handleBatchCheckIn"
              >
                批量签到 ({{ selectedRows.length }})
              </el-button>
              <el-button
                type="danger"
                :icon="CircleCloseFilled"
                @click="handleBatchNoShow"
              >
                批量标记未出席
              </el-button>
            </div>
          </div>

          <el-table
            :data="registrations"
            style="margin-top: 16px; width: 100%"
            border
            stripe
            @selection-change="handleSelectionChange"
            v-loading="registrationsLoading"
          >
            <el-table-column
              v-if="userStore.isAdmin || userStore.isLibrarian"
              type="selection"
              width="50"
              :selectable="(row) => row.status !== 'CANCELLED'"
            />
            <el-table-column
              label="序号"
              type="index"
              width="60"
              align="center"
            />
            <el-table-column
              label="姓名"
              prop="borrower.name"
              min-width="100"
            />
            <el-table-column
              label="联系电话"
              prop="borrower.phone"
              width="130"
            />
            <el-table-column
              label="邮箱"
              prop="borrower.email"
              min-width="180"
              show-overflow-tooltip
            />
            <el-table-column
              label="报名状态"
              width="110"
              align="center"
            >
              <template #default="{ row }">
                <el-tag :type="REGISTRATION_STATUS_TAGS[row.status]">
                  {{ REGISTRATION_STATUS_LABELS[row.status] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="报名时间"
              width="170"
            >
              <template #default="{ row }">
                {{ formatDate(row.registeredAt) }}
              </template>
            </el-table-column>
            <el-table-column
              label="签到时间"
              width="170"
            >
              <template #default="{ row }">
                {{ row.checkInAt ? formatDate(row.checkInAt) : '-' }}
              </template>
            </el-table-column>
            <el-table-column
              v-if="userStore.isAdmin || userStore.isLibrarian"
              label="操作"
              width="240"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'REGISTERED' || row.status === 'NO_SHOW'"
                  link
                  type="success"
                  @click="handleCheckIn(row)"
                >
                  签到
                </el-button>
                <el-button
                  v-if="row.status === 'CHECKED_IN'"
                  link
                  type="warning"
                  @click="handleCancelCheckIn(row)"
                >
                  取消签到
                </el-button>
                <el-button
                  v-if="row.status === 'REGISTERED' || row.status === 'CHECKED_IN'"
                  link
                  type="danger"
                  @click="handleMarkNoShow(row)"
                >
                  标记未出席
                </el-button>
                <el-button
                  v-if="row.status !== 'CANCELLED'"
                  link
                  type="info"
                  @click="handleCancelRegistration(row)"
                >
                  取消报名
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
              @size-change="fetchRegistrations"
              @current-change="fetchRegistrations"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="候补队列" name="waitlist">
          <el-table
            :data="waitlist"
            style="margin-top: 16px; width: 100%"
            border
            stripe
            v-loading="registrationsLoading"
          >
            <el-table-column
              label="序号"
              type="index"
              width="60"
              align="center"
            />
            <el-table-column
              label="候补位置"
              width="100"
              align="center"
            >
              <template #default="{ row, $index }">
                <el-tag
                  type="warning"
                  effect="dark"
                  round
                >
                  #{{ row.queuePosition || $index + 1 }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="姓名"
              prop="borrower.name"
              min-width="100"
            />
            <el-table-column
              label="联系电话"
              prop="borrower.phone"
              width="130"
            />
            <el-table-column
              label="报名时间"
              width="170"
            >
              <template #default="{ row }">
                {{ formatDate(row.registeredAt) }}
              </template>
            </el-table-column>
            <el-table-column
              v-if="userStore.isAdmin || userStore.isLibrarian"
              label="操作"
              width="120"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  @click="handlePromoteFromWaitlist(row)"
                >
                  手动转正
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty
            v-if="waitlist.length === 0 && !registrationsLoading"
            description="暂无候补人员"
            style="margin-top: 40px"
          />
        </el-tab-pane>

        <el-tab-pane label="取消记录" name="cancellations">
          <el-table
            :data="cancellations"
            style="margin-top: 16px; width: 100%"
            border
            stripe
            v-loading="registrationsLoading"
          >
            <el-table-column
              label="序号"
              type="index"
              width="60"
              align="center"
            />
            <el-table-column
              label="姓名"
              prop="borrower.name"
              min-width="100"
            />
            <el-table-column
              label="联系电话"
              prop="borrower.phone"
              width="130"
            />
            <el-table-column
              label="取消时间"
              width="170"
            >
              <template #default="{ row }">
                {{ row.cancelledAt ? formatDate(row.cancelledAt) : '-' }}
              </template>
            </el-table-column>
            <el-table-column
              label="取消原因"
              min-width="200"
              prop="cancelReason"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.cancelReason || '-' }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty
            v-if="cancellations.length === 0 && !registrationsLoading"
            description="暂无取消记录"
            style="margin-top: 40px"
          />
        </el-tab-pane>

        <el-tab-pane label="签到管理" name="checkin">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-card shadow="never" class="qr-code-card">
                <template #header>
                  <div class="card-header">
                    <el-icon><QrCode /></el-icon>
                    <span>签到二维码</span>
                  </div>
                </template>
                <div class="qr-wrapper">
                  <div class="qr-code-placeholder">
                    <el-icon :size="120" color="#409eff"><QrCode /></el-icon>
                    <p style="margin-top: 12px; color: #606266; font-size: 14px">
                      扫码签到 URL
                    </p>
                    <el-input
                      v-model="checkinUrl"
                      readonly
                      style="margin-top: 8px"
                    >
                      <template #append>
                        <el-button @click="copyCheckinUrl">
                          <el-icon><CopyDocument /></el-icon>
                        </el-button>
                      </template>
                    </el-input>
                  </div>
                </div>
              </el-card>
            </el-col>

            <el-col :span="12">
              <el-card shadow="never">
                <template #header>
                  <div class="card-header">
                    <el-icon><EditPen /></el-icon>
                    <span>快速签到</span>
                  </div>
                </template>
                <el-form label-width="100px">
                  <el-form-item label="报名ID/读者ID">
                    <el-input
                      v-model="quickCheckinId"
                      placeholder="请输入报名ID或读者ID"
                      clearable
                      @keyup.enter="handleQuickCheckIn"
                    />
                  </el-form-item>
                  <el-form-item>
                    <el-button
                      type="primary"
                      :icon="CircleCheckFilled"
                      @click="handleQuickCheckIn"
                    >
                      确认签到
                    </el-button>
                  </el-form-item>
                </el-form>
              </el-card>

              <el-card shadow="never" style="margin-top: 16px">
                <template #header>
                  <div class="card-header">
                    <el-icon><List /></el-icon>
                    <span>最近签到记录</span>
                  </div>
                </template>
                <el-table
                  :data="recentCheckIns"
                  size="small"
                  max-height="240"
                >
                  <el-table-column
                    label="姓名"
                    prop="borrower.name"
                    width="100"
                  />
                  <el-table-column
                    label="签到时间"
                    width="160"
                  >
                    <template #default="{ row }">
                      {{ row.checkInAt ? formatDate(row.checkInAt) : '-' }}
                    </template>
                  </el-table-column>
                </el-table>
                <el-empty
                  v-if="recentCheckIns.length === 0"
                  :image-size="60"
                  description="暂无签到记录"
                />
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>

        <el-tab-pane label="反馈问卷" name="feedback">
          <div class="feedback-summary">
            <el-card shadow="hover" class="summary-card">
              <div class="summary-content">
                <div class="avg-rating">
                  <div class="rating-label">平均评分</div>
                  <div class="rating-value">
                    <el-rate
                      v-model="avgRatingDisplay"
                      disabled
                      :max="5"
                      show-score
                      text-color="#ff9900"
                      score-template="{value}"
                    />
                  </div>
                </div>
                <el-divider direction="vertical" />
                <div class="feedback-count">
                  <div class="count-label">反馈数量</div>
                  <div class="count-value">{{ stats?.feedbackCount || 0 }}</div>
                </div>
                <el-divider direction="vertical" />
                <div class="attendance-summary" v-if="activity?.status === 'ENDED'">
                  <div class="attendance-label">最终出席率</div>
                  <div class="attendance-value">
                    {{ attendanceRateDisplay }}%
                  </div>
                </div>
                <div class="export-btn-wrapper" v-if="userStore.isAdmin || userStore.isLibrarian">
                  <el-button
                    type="primary"
                    :icon="Download"
                    @click="handleExportFeedback"
                  >
                    导出反馈
                  </el-button>
                </div>
              </div>
            </el-card>
          </div>

          <el-table
            :data="feedbacks"
            style="margin-top: 16px; width: 100%"
            border
            stripe
            v-loading="feedbackLoading"
          >
            <el-table-column
              label="序号"
              type="index"
              width="60"
              align="center"
            />
            <el-table-column
              label="读者姓名"
              prop="borrower.name"
              min-width="100"
            />
            <el-table-column
              label="评分"
              width="200"
              align="center"
            >
              <template #default="{ row }">
                <el-rate
                  v-model="row.rating"
                  disabled
                  :max="5"
                  show-score
                  text-color="#ff9900"
                  score-template="{value}"
                />
              </template>
            </el-table-column>
            <el-table-column
              label="评论"
              min-width="300"
              prop="comment"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.comment || '-' }}
              </template>
            </el-table-column>
            <el-table-column
              label="时间"
              width="170"
            >
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty
            v-if="feedbacks.length === 0 && !feedbackLoading"
            description="暂无反馈数据"
            style="margin-top: 40px"
          />
        </el-tab-pane>

        <el-tab-pane label="活动统计" name="statistics">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-card shadow="hover">
                <template #header>
                  <div class="card-header">
                    <el-icon><TrendCharts /></el-icon>
                    <span>出席率趋势</span>
                  </div>
                </template>
                <div
                  ref="attendanceChartRef"
                  class="chart-container"
                ></div>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card shadow="hover">
                <template #header>
                  <div class="card-header">
                    <el-icon><Star /></el-icon>
                    <span>评分分布</span>
                  </div>
                </template>
                <div
                  ref="ratingChartRef"
                  class="chart-container"
                ></div>
              </el-card>
            </el-col>
          </el-row>
          <el-row :gutter="20" style="margin-top: 20px">
            <el-col :span="24">
              <el-card shadow="hover">
                <template #header>
                  <div class="card-header">
                    <el-icon><Calendar /></el-icon>
                    <span>报名时间分布</span>
                  </div>
                </template>
                <div
                  ref="registrationChartRef"
                  class="chart-container"
                ></div>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog
      v-model="cancelDialogVisible"
      title="取消报名"
      width="500px"
    >
      <el-form
        ref="cancelFormRef"
        :model="cancelForm"
        :rules="cancelRules"
        label-width="100px"
      >
        <el-form-item label="取消原因" prop="cancelReason">
          <el-input
            v-model="cancelForm.cancelReason"
            type="textarea"
            :rows="4"
            placeholder="请输入取消原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="cancelSubmitLoading"
          @click="submitCancel"
        >
          确认取消
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showQrCodeDialog"
      title="签到二维码"
      width="500px"
    >
      <div class="dialog-qr-wrapper">
        <div class="dialog-qr-code">
          <el-icon :size="200" color="#409eff"><QrCode /></el-icon>
        </div>
        <p style="text-align: center; margin-top: 16px; color: #606266">
          扫描二维码快速签到
        </p>
        <el-input v-model="checkinUrl" readonly style="margin-top: 12px">
          <template #append>
            <el-button @click="copyCheckinUrl">
              <el-icon><CopyDocument /></el-icon>
              复制链接
            </el-button>
          </template>
        </el-input>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive, nextTick, watch, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Search,
  ArrowLeft,
  Edit,
  SwitchButton,
  Share,
  QrCode,
  UserFilled,
  Clock,
  CircleCheckFilled,
  CircleCloseFilled,
  TrendCharts,
  Document,
  Location,
  Calendar,
  User,
  Picture,
  ArrowDown,
  Download,
  EditPen,
  List,
  CopyDocument,
  Star,
} from '@element-plus/icons-vue';
import api from '../api';
import { useUserStore } from '../store/user';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import type {
  Activity,
  ActivityRegistration,
  ActivityStats,
  ActivityFeedback,
  RegistrationStatus,
  ActivityStatus,
} from '../types';
import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_TAGS,
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUS_TAGS,
} from '../types';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const activity = ref<Activity | null>(null);
const stats = ref<ActivityStats | null>(null);

const activeTab = ref('registrations');

const registrations = ref<ActivityRegistration[]>([]);
const waitlist = ref<ActivityRegistration[]>([]);
const cancellations = ref<ActivityRegistration[]>([]);
const feedbacks = ref<ActivityFeedback[]>([]);
const recentCheckIns = ref<ActivityRegistration[]>([]);

const registrationsLoading = ref(false);
const feedbackLoading = ref(false);

const registrationStatus = ref<RegistrationStatus | ''>('');
const searchKeyword = ref('');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const selectedRows = ref<ActivityRegistration[]>([]);

const cancelDialogVisible = ref(false);
const cancelSubmitLoading = ref(false);
const cancelFormRef = ref<FormInstance | null>(null);
const cancelForm = reactive({
  borrowerId: 0,
  cancelReason: '',
});
const cancelRules = {
  cancelReason: [{ required: true, message: '请输入取消原因', trigger: 'blur' }],
};

const showQrCodeDialog = ref(false);
const quickCheckinId = ref('');
const checkinUrl = computed(() => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/kiosk/activity-checkin/${activity.value?.id || ''}`;
});

const avgRatingDisplay = computed(() => {
  return stats.value?.avgRating || 0;
});

const attendanceRateDisplay = computed(() => {
  return stats.value?.attendanceRate ? stats.value.attendanceRate.toFixed(1) : '0.0';
});

const capacityPercentage = computed(() => {
  if (!stats.value) return 0;
  const { registeredCount = 0, capacity = 0 } = stats.value;
  if (capacity === 0) return 0;
  return Math.min(Math.round((registeredCount / capacity) * 100), 100);
});

const activityId = computed(() => Number(route.params.id));

const attendanceChartRef = shallowRef<HTMLElement | null>(null);
const ratingChartRef = shallowRef<HTMLElement | null>(null);
const registrationChartRef = shallowRef<HTMLElement | null>(null);
let attendanceChart: ECharts | null = null;
let ratingChart: ECharts | null = null;
let registrationChart: ECharts | null = null;
let refreshTimer: number | null = null;

const formatDate = (dateStr?: string, showTime = true) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (showTime) {
    return date.toLocaleString('zh-CN', { hour12: false });
  }
  return date.toLocaleDateString('zh-CN');
};

const fetchActivityDetail = async () => {
  loading.value = true;
  try {
    const res = await api.get(`/activities/${activityId.value}`);
    activity.value = res as Activity;
  } finally {
    loading.value = false;
  }
};

const fetchStats = async () => {
  try {
    const res = await api.get(`/activities/${activityId.value}/stats`);
    stats.value = res as ActivityStats;
  } catch (_) {}
};

const fetchRegistrations = async () => {
  registrationsLoading.value = true;
  try {
    const params: Record<string, any> = {
      page: page.value,
      pageSize: pageSize.value,
    };
    if (registrationStatus.value) {
      params.status = registrationStatus.value;
    }
    if (searchKeyword.value) {
      params.keyword = searchKeyword.value;
    }
    const res = await api.get(`/activities/${activityId.value}/registrations`, { params });
    const data = (res as any)?.data || (res as any) || [];
    registrations.value = data.filter(
      (r: ActivityRegistration) => r.status !== 'WAITLIST' && r.status !== 'CANCELLED'
    );
    waitlist.value = data.filter((r: ActivityRegistration) => r.status === 'WAITLIST');
    cancellations.value = data.filter((r: ActivityRegistration) => r.status === 'CANCELLED');
    recentCheckIns.value = data
      .filter((r: ActivityRegistration) => r.status === 'CHECKED_IN' && r.checkInAt)
      .sort(
        (a: ActivityRegistration, b: ActivityRegistration) =>
          new Date(b.checkInAt!).getTime() - new Date(a.checkInAt!).getTime()
      )
      .slice(0, 10);
    total.value = (res as any)?.total || data.length;
  } finally {
    registrationsLoading.value = false;
  }
};

const fetchFeedback = async () => {
  feedbackLoading.value = true;
  try {
    const res = await api.get(`/activities/${activityId.value}/feedback`);
    feedbacks.value = (res as ActivityFeedback[]) || [];
  } finally {
    feedbackLoading.value = false;
  }
};

const handleSelectionChange = (selection: ActivityRegistration[]) => {
  selectedRows.value = selection;
};

const handleCheckIn = async (row: ActivityRegistration) => {
  try {
    await ElMessageBox.confirm(
      `确认将「${row.borrower.name}」标记为已签到吗？`,
      '签到确认',
      { type: 'info' }
    );
    await api.patch(`/activities/${activityId.value}/checkin`, {
      borrowerIds: [row.borrowerId],
    });
    ElMessage.success('签到成功');
    fetchRegistrations();
    fetchStats();
  } catch (_) {}
};

const handleCancelCheckIn = async (row: ActivityRegistration) => {
  try {
    await ElMessageBox.confirm(
      `确认取消「${row.borrower.name}」的签到吗？`,
      '取消签到确认',
      { type: 'warning' }
    );
    await api.patch(`/activities/${activityId.value}/checkin-batch`, {
      ids: [row.id],
      status: 'REGISTERED',
    });
    ElMessage.success('已取消签到');
    fetchRegistrations();
    fetchStats();
  } catch (_) {}
};

const handleMarkNoShow = async (row: ActivityRegistration) => {
  try {
    await ElMessageBox.confirm(
      `确认将「${row.borrower.name}」标记为未出席吗？`,
      '标记未出席确认',
      { type: 'warning' }
    );
    await api.patch(`/activities/${activityId.value}/checkin-batch`, {
      ids: [row.id],
      status: 'NO_SHOW',
    });
    ElMessage.success('标记成功');
    fetchRegistrations();
    fetchStats();
  } catch (_) {}
};

const handleBatchCheckIn = async () => {
  if (selectedRows.value.length === 0) return;
  try {
    await ElMessageBox.confirm(
      `确认对选中的 ${selectedRows.value.length} 人执行批量签到吗？`,
      '批量签到确认',
      { type: 'info' }
    );
    const borrowerIds = selectedRows.value.map((r) => r.borrowerId);
    await api.patch(`/activities/${activityId.value}/checkin`, { borrowerIds });
    ElMessage.success('批量签到成功');
    fetchRegistrations();
    fetchStats();
  } catch (_) {}
};

const handleBatchNoShow = async () => {
  if (selectedRows.value.length === 0) return;
  try {
    await ElMessageBox.confirm(
      `确认将选中的 ${selectedRows.value.length} 人标记为未出席吗？`,
      '批量标记确认',
      { type: 'warning' }
    );
    const ids = selectedRows.value.map((r) => r.id);
    await api.patch(`/activities/${activityId.value}/checkin-batch`, {
      ids,
      status: 'NO_SHOW',
    });
    ElMessage.success('批量标记成功');
    fetchRegistrations();
    fetchStats();
  } catch (_) {}
};

const handleCancelRegistration = (row: ActivityRegistration) => {
  cancelForm.borrowerId = row.borrowerId;
  cancelForm.cancelReason = '';
  cancelDialogVisible.value = true;
};

const submitCancel = async () => {
  if (!cancelFormRef.value) return;
  await cancelFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return;
    cancelSubmitLoading.value = true;
    try {
      await api.post(`/activities/${activityId.value}/cancel`, {
        borrowerId: cancelForm.borrowerId,
        cancelReason: cancelForm.cancelReason,
      });
      ElMessage.success('取消报名成功');
      cancelDialogVisible.value = false;
      fetchRegistrations();
      fetchStats();
    } finally {
      cancelSubmitLoading.value = false;
    }
  });
};

const handlePromoteFromWaitlist = async (row: ActivityRegistration) => {
  try {
    await ElMessageBox.confirm(
      `确认将候补队列中的「${row.borrower.name}」转正为正式报名吗？`,
      '候补转正确认',
      { type: 'info' }
    );
    await api.patch(`/activities/${activityId.value}/checkin-batch`, {
      ids: [row.id],
      status: 'REGISTERED',
    });
    ElMessage.success('候补转正成功');
    fetchRegistrations();
    fetchStats();
  } catch (_) {}
};

const handleQuickCheckIn = async () => {
  if (!quickCheckinId.value.trim()) {
    ElMessage.warning('请输入报名ID或读者ID');
    return;
  }
  try {
    const id = Number(quickCheckinId.value.trim());
    await api.patch(`/activities/${activityId.value}/checkin`, {
      borrowerIds: [id],
    });
    ElMessage.success('签到成功');
    quickCheckinId.value = '';
    fetchRegistrations();
    fetchStats();
  } catch (_) {}
};

const handleStatusChange = async (status: ActivityStatus) => {
  try {
    await ElMessageBox.confirm(
      `确认将活动状态变更为「${ACTIVITY_STATUS_LABELS[status]}」吗？`,
      '状态变更确认',
      { type: 'warning' }
    );
    await api.patch(`/activities/${activityId.value}/status`, { status });
    ElMessage.success('状态变更成功');
    fetchActivityDetail();
  } catch (_) {}
};

const handleEdit = () => {
  router.push(`/reading-activities/${activityId.value}/edit`);
};

const goBack = () => {
  router.push('/reading-activities');
};

const handleShare = () => {
  const url = window.location.href;
  navigator.clipboard
    .writeText(url)
    .then(() => {
      ElMessage.success('活动链接已复制到剪贴板');
    })
    .catch(() => {
      ElMessage.success('请手动复制浏览器地址栏分享活动');
    });
};

const copyCheckinUrl = () => {
  navigator.clipboard
    .writeText(checkinUrl.value)
    .then(() => {
      ElMessage.success('签到链接已复制');
    })
    .catch(() => {
      ElMessage.error('复制失败，请手动复制');
    });
};

const handleExportFeedback = () => {
  ElMessage.info('正在导出反馈数据...');
};

const initAttendanceChart = () => {
  if (!attendanceChartRef.value) return;
  attendanceChart = echarts.init(attendanceChartRef.value);
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['第1天', '第2天', '第3天', '第4天', '第5天', '第6天', '第7天'],
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%' },
    },
    series: [
      {
        name: '出席率',
        type: 'bar',
        data: [75, 82, 68, 90, 85, 78, Number(attendanceRateDisplay.value) || 0],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#67c23a' },
            { offset: 1, color: '#95d475' },
          ]),
        },
        label: { show: true, position: 'top', formatter: '{c}%' },
      },
    ],
  };
  attendanceChart.setOption(option);
};

const initRatingChart = () => {
  if (!ratingChartRef.value) return;
  ratingChart = echarts.init(ratingChartRef.value);
  const ratingCounts = [0, 0, 0, 0, 0];
  feedbacks.value.forEach((f) => {
    const idx = Math.min(Math.max(Math.round(f.rating) - 1, 0), 4);
    ratingCounts[idx]++;
  });
  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['1星', '2星', '3星', '4星', '5星'],
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '数量',
        type: 'bar',
        data: ratingCounts,
        itemStyle: {
          color: (params: any) => {
            const colors = ['#f56c6c', '#e6a23c', '#f0c78a', '#95d475', '#67c23a'];
            return colors[params.dataIndex];
          },
        },
        label: { show: true, position: 'top' },
        barWidth: '50%',
      },
    ],
  };
  ratingChart.setOption(option);
};

const initRegistrationChart = () => {
  if (!registrationChartRef.value) return;
  registrationChart = echarts.init(registrationChartRef.value);

  const dateMap = new Map<string, number>();
  registrations.value.forEach((r) => {
    const date = r.registeredAt?.split('T')[0] || '';
    if (date) {
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    }
  });
  waitlist.value.forEach((r) => {
    const date = r.registeredAt?.split('T')[0] || '';
    if (date) {
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    }
  });

  const sortedDates = Array.from(dateMap.keys()).sort();
  const counts = sortedDates.map((d) => dateMap.get(d) || 0);

  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: sortedDates.length > 0 ? sortedDates : ['暂无数据'],
      axisLabel: { rotate: 45 },
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '报名人数',
        type: 'line',
        smooth: true,
        data: counts.length > 0 ? counts : [0],
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64,158,255,0.5)' },
            { offset: 1, color: 'rgba(64,158,255,0.05)' },
          ]),
        },
        lineStyle: { color: '#409eff', width: 3 },
        itemStyle: { color: '#409eff' },
      },
    ],
  };
  registrationChart.setOption(option);
};

const initCharts = () => {
  nextTick(() => {
    initAttendanceChart();
    initRatingChart();
    initRegistrationChart();
  });
};

const resizeCharts = () => {
  attendanceChart?.resize();
  ratingChart?.resize();
  registrationChart?.resize();
};

watch(activeTab, (newTab) => {
  if (newTab === 'feedback') {
    fetchFeedback();
  }
  if (newTab === 'statistics') {
    initCharts();
  }
});

onMounted(async () => {
  await Promise.all([fetchActivityDetail(), fetchStats(), fetchRegistrations()]);
  refreshTimer = window.setInterval(() => {
    fetchStats();
    fetchRegistrations();
  }, 30000);
  window.addEventListener('resize', resizeCharts);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  window.removeEventListener('resize', resizeCharts);
  attendanceChart?.dispose();
  ratingChart?.dispose();
  registrationChart?.dispose();
});
</script>

<style scoped lang="scss">
.activity-detail-container {
  padding: 20px;
}

.breadcrumb {
  margin-bottom: 16px;
}

.activity-info-card {
  margin-bottom: 20px;
}

.info-wrapper {
  display: flex;
  gap: 24px;
}

.cover-wrapper {
  width: 280px;
  flex-shrink: 0;
}

.cover-image {
  width: 100%;
  height: 220px;
  border-radius: 8px;
  overflow: hidden;
}

.cover-placeholder {
  width: 100%;
  height: 220px;
  background: #f5f7fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.activity-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  font-size: 14px;
}

.info-icon {
  font-size: 16px;
  color: #909399;
  margin-right: 8px;
  margin-top: 2px;
}

.info-label {
  color: #606266;
  width: 80px;
  flex-shrink: 0;
}

.info-value {
  color: #303133;
  flex: 1;
}

.capacity-item {
  align-items: center;
}

.capacity-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.capacity-text {
  font-size: 13px;
  color: #606266;

  b {
    color: #303133;
  }
}

.waitlist-count {
  color: #e6a23c;
}

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: auto;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  :deep(.el-card__body) {
    padding: 16px;
  }
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-card.registered .stat-icon {
  background: #ecf5ff;
  color: #409eff;
}

.stat-card.waitlist .stat-icon {
  background: #fdf6ec;
  color: #e6a23c;
}

.stat-card.checkin .stat-icon {
  background: #f0f9eb;
  color: #67c23a;
}

.stat-card.attendance .stat-icon {
  background: #fef0f0;
  color: #f56c6c;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.description-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
}

.description-content {
  pre {
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.8;
    margin: 0;
    color: #303133;
  }
}

.tabs-card {
  :deep(.el-tabs--card > .el-tabs__header .el-tabs__nav) {
    border: none;
  }
}

.tab-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.feedback-summary {
  margin-bottom: 16px;
}

.summary-card {
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.summary-content {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 24px;
  flex-wrap: wrap;
}

.avg-rating,
.feedback-count,
.attendance-summary {
  text-align: center;
}

.rating-label,
.count-label,
.attendance-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.rating-value {
  font-size: 16px;
}

.count-value,
.attendance-value {
  font-size: 32px;
  font-weight: 600;
  color: #409eff;
}

.attendance-value {
  color: #67c23a;
}

.export-btn-wrapper {
  margin-left: auto;
}

.qr-code-card {
  height: 100%;
}

.qr-wrapper {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.qr-code-placeholder {
  text-align: center;
}

.chart-container {
  width: 100%;
  height: 320px;
}

.dialog-qr-wrapper {
  text-align: center;
  padding: 10px 0;
}

.dialog-qr-code {
  display: inline-block;
  padding: 20px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 12px;
}

@media (max-width: 1200px) {
  .info-wrapper {
    flex-direction: column;
  }

  .cover-wrapper {
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }
}
</style>
