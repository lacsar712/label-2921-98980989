<template>
  <div class="ill-detail-container">
    <div class="detail-header">
      <el-button
        :icon="ArrowLeft"
        text
        @click="goBack"
      >
        返回列表
      </el-button>
      <el-page-header @back="goBack">
        <template #content>
          <div class="header-main">
            <span class="main-title">{{ loan?.bookTitle || '馆际互借详情' }}</span>
            <el-tag
              :type="DIRECTION_TAGS[loan?.direction || 'BORROW_IN']"
              style="margin-left: 10px"
            >
              {{ DIRECTION_LABELS[loan?.direction || 'BORROW_IN'] }}
            </el-tag>
            <el-tag
              :type="STATUS_TYPES[loan?.status || 'PENDING']"
              style="margin-left: 8px"
            >
              {{ STATUS_LABELS[loan?.status || 'PENDING'] }}
            </el-tag>
            <el-tag
              v-if="loan?.isOverdue"
              type="danger"
              style="margin-left: 8px"
            >
              逾期 {{ loan.overdueDays }} 天
            </el-tag>
          </div>
        </template>
      </el-page-header>
    </div>

    <el-row
      v-loading="loading"
      :gutter="20"
    >
      <el-col :span="14">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><Document /></el-icon>
              <span>基本信息</span>
            </div>
          </template>

          <el-descriptions
            :column="2"
            border
            size="default"
          >
            <el-descriptions-item label="书名">
              <span class="primary-text">{{ loan?.bookTitle }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="ISBN">
              {{ loan?.isbn }}
            </el-descriptions-item>
            <el-descriptions-item label="册数">
              {{ loan?.volumeCount }}
            </el-descriptions-item>
            <el-descriptions-item label="费用承担">
              {{ FEE_PAYER_LABELS[loan?.feePayer || 'OUR_LIBRARY'] }}
            </el-descriptions-item>
            <el-descriptions-item label="对方馆名">
              <div class="lib-name">
                <el-icon><OfficeBuilding /></el-icon>
                {{ loan?.partnerLibraryName }}
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="联系人">
              <div>{{ loan?.contactPerson }}</div>
              <div class="text-muted small">{{ loan?.contactPhone || '-' }}</div>
            </el-descriptions-item>
            <el-descriptions-item label="物流单号">
              <el-tag
                v-if="loan?.trackingNumber"
                type="info"
                size="small"
              >
                <el-icon><Van /></el-icon>
                {{ loan.trackingNumber }}
              </el-tag>
              <span v-else class="text-muted">-</span>
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="STATUS_TYPES[loan?.status || 'PENDING']">
                {{ STATUS_LABELS[loan?.status || 'PENDING'] }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="借出日期">
              {{ loan?.lendDate ? fmt(loan.lendDate) : '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="应还日期">
              <span :class="loan?.isOverdue ? 'danger-text' : ''">
                {{ loan?.dueDate ? fmt(loan.dueDate) : '-' }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="实际归还日期">
              {{ loan?.actualReturnDate ? fmt(loan.actualReturnDate) : '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="创建人">
              {{ loan?.createdBy?.username || '-' }}
            </el-descriptions-item>
            <el-descriptions-item
              label="备注"
              :span="2"
            >
              <span class="text-muted" v-if="!loan?.remarks">-</span>
              <span v-else>{{ loan.remarks }}</span>
            </el-descriptions-item>
            <el-descriptions-item
              v-if="loan?.rejectionReason"
              label="拒收原因"
              :span="2"
            >
              <span class="danger-text">{{ loan.rejectionReason }}</span>
            </el-descriptions-item>
          </el-descriptions>

          <div class="action-bar">
            <el-button
              type="primary"
              :icon="Edit"
              @click="handleEdit"
            >
              编辑信息
            </el-button>
            <el-dropdown
              trigger="click"
              @command="handleStatusChange"
            >
              <el-button type="success">
                状态推进
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="s in nextStatuses"
                    :key="s.value"
                    :command="s.value"
                  >
                    → {{ s.label }}
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="nextStatuses.length === 0"
                    disabled
                  >
                    已处于终态
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button
              type="warning"
              :icon="Bell"
              @click="openReminder"
            >
              催还备注
            </el-button>
            <el-button
              type="primary"
              plain
              :icon="Clock"
              :disabled="!loan?.dueDate || loan?.status === 'RETURNED' || loan?.status === 'REJECTED'"
              @click="openExtension"
            >
              申请延期
            </el-button>
          </div>
        </el-card>

        <el-card
          shadow="hover"
          style="margin-top: 20px"
        >
          <template #header>
            <div class="card-header">
              <el-icon><Promotion /></el-icon>
              <span>状态流转</span>
            </div>
          </template>
          <el-steps
            :active="activeStepIndex"
            finish-status="success"
            :process-status="loan?.status === 'REJECTED' ? 'error' : 'process'"
          >
            <el-step
              v-for="s in STATUS_FLOW"
              :key="s.status"
              :title="s.label"
            />
          </el-steps>
        </el-card>
      </el-col>

      <el-col :span="10">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><Timer /></el-icon>
              <span>往来时间线</span>
            </div>
          </template>
          <el-timeline v-if="loan?.timelines?.length">
            <el-timeline-item
              v-for="t in loan.timelines"
              :key="t.id"
              :timestamp="fmtDateTime(t.timestamp)"
              :type="t.status ? STATUS_TYPES[t.status] : 'primary'"
              placement="top"
            >
              <div class="timeline-item">
                <div class="timeline-action">{{ t.action }}</div>
                <div
                  v-if="t.note"
                  class="timeline-note"
                >
                  {{ t.note }}
                </div>
                <div class="timeline-operator">
                  操作人：{{ t.operator?.username || '系统' }}
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty
            v-else
            description="暂无时间线记录"
            :image-size="80"
          />
        </el-card>

        <el-card
          shadow="hover"
          style="margin-top: 20px"
        >
          <template #header>
            <div class="card-header">
              <el-icon><BellFilled /></el-icon>
              <span>催还记录</span>
              <el-button
                text
                type="primary"
                style="margin-left: auto"
                :icon="Plus"
                @click="openReminder"
              >
                追加
              </el-button>
            </div>
          </template>
          <div
            v-if="loan?.reminders?.length"
            class="reminder-list"
          >
            <div
              v-for="r in loan.reminders"
              :key="r.id"
              class="reminder-item"
            >
              <div class="reminder-header">
                <el-avatar :size="28">
                  <el-icon><UserFilled /></el-icon>
                </el-avatar>
                <div class="reminder-meta">
                  <span class="reminder-operator">
                    {{ r.operator?.username || '系统' }}
                  </span>
                  <span class="reminder-time">{{ fmtDateTime(r.createdAt) }}</span>
                </div>
              </div>
              <div class="reminder-content">
                {{ r.content }}
              </div>
            </div>
          </div>
          <el-empty
            v-else
            description="暂无催还记录"
            :image-size="80"
          />
        </el-card>

        <el-card
          shadow="hover"
          style="margin-top: 20px"
        >
          <template #header>
            <div class="card-header">
              <el-icon><Calendar /></el-icon>
              <span>延期申请</span>
              <el-button
                text
                type="primary"
                style="margin-left: auto"
                :icon="Plus"
                :disabled="!loan?.dueDate || loan?.status === 'RETURNED' || loan?.status === 'REJECTED'"
                @click="openExtension"
              >
                新增申请
              </el-button>
            </div>
          </template>
          <div
            v-if="loan?.extensions?.length"
            class="extension-list"
          >
            <div
              v-for="e in loan.extensions"
              :key="e.id"
              class="extension-item"
            >
              <div class="ext-row">
                <el-tag size="small">原应还：{{ fmt(e.originalDueDate) }}</el-tag>
                <el-icon><ArrowRight /></el-icon>
                <el-tag
                  type="success"
                  size="small"
                >
                  新应还：{{ fmt(e.newDueDate) }}
                </el-tag>
                <el-tag
                  :type="extStatusType[e.status]"
                  size="small"
                  style="margin-left: auto"
                >
                  {{ extStatusLabel[e.status] }}
                </el-tag>
              </div>
              <div class="ext-reason">
                <el-icon><EditPen /></el-icon>
                理由：{{ e.reason }}
              </div>
              <div class="ext-meta text-muted small">
                提交时间：{{ fmtDateTime(e.createdAt) }}
                <span v-if="e.approvedBy">
                  ｜审批人：{{ e.approvedBy?.username }}
                </span>
                <span v-if="e.approvedAt">
                  ｜审批时间：{{ fmtDateTime(e.approvedAt) }}
                </span>
              </div>
              <div
                v-if="e.status === 'PENDING'"
                class="ext-actions"
              >
                <el-button
                  size="small"
                  type="success"
                  @click="reviewExtension(e, 'APPROVED')"
                >
                  通过
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  @click="reviewExtension(e, 'REJECTED')"
                >
                  驳回
                </el-button>
              </div>
            </div>
          </div>
          <el-empty
            v-else
            description="暂无延期申请"
            :image-size="80"
          />
        </el-card>
      </el-col>
    </el-row>

    <el-dialog
      v-model="formDialogVisible"
      title="编辑信息"
      width="640px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="流转方向" prop="direction">
              <el-radio-group v-model="form.direction">
                <el-radio-button label="BORROW_IN">
                  <el-icon><Download /></el-icon>
                  借入
                </el-radio-button>
                <el-radio-button label="LEND_OUT">
                  <el-icon><Upload /></el-icon>
                  借出
                </el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="费用承担" prop="feePayer">
              <el-select
                v-model="form.feePayer"
                style="width: 100%"
              >
                <el-option label="本馆承担" value="OUR_LIBRARY" />
                <el-option label="对方馆承担" value="OTHER_LIBRARY" />
                <el-option label="双方分摊" value="SPLIT" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="书名" prop="bookTitle">
          <el-input v-model="form.bookTitle" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="16">
            <el-form-item label="ISBN" prop="isbn">
              <el-input v-model="form.isbn" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="册数" prop="volumeCount">
              <el-input-number
                v-model="form.volumeCount"
                :min="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="对方馆名" prop="partnerLibraryName">
          <el-input v-model="form.partnerLibraryName" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="联系人" prop="contactPerson">
              <el-input v-model="form.contactPerson" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="contactPhone">
              <el-input v-model="form.contactPhone" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="物流单号" prop="trackingNumber">
          <el-input v-model="form.trackingNumber" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="借出日期" prop="lendDate">
              <el-date-picker
                v-model="form.lendDate"
                type="date"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="应还日期" prop="dueDate">
              <el-date-picker
                v-model="form.dueDate"
                type="date"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注" prop="remarks">
          <el-input
            v-model="form.remarks"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="submitEdit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="statusDialogVisible"
      title="状态流转"
      width="480px"
      destroy-on-close
    >
      <el-steps
        :active="statusStepIndex"
        direction="horizontal"
        finish-status="success"
        :process-status="statusForm.status === 'REJECTED' ? 'error' : 'process'"
      >
        <el-step
          v-for="s in STATUS_FLOW"
          :key="s.status"
          :title="s.label"
        />
      </el-steps>
      <el-form
        ref="statusFormRef"
        :model="statusForm"
        label-width="100px"
        style="margin-top: 24px"
      >
        <el-form-item label="目标状态">
          <el-tag
            :type="STATUS_TYPES[statusForm.status as any]"
            size="large"
          >
            {{ STATUS_LABELS[statusForm.status as any] }}
          </el-tag>
        </el-form-item>
        <el-form-item
          v-if="statusForm.status === 'SHIPPED' || statusForm.status === 'IN_TRANSIT'"
          label="物流单号"
        >
          <el-input v-model="statusForm.trackingNumber" />
        </el-form-item>
        <el-form-item
          v-if="['SHIPPED', 'IN_TRANSIT', 'IN_USE'].includes(statusForm.status as string)"
          label="借出日期"
        >
          <el-date-picker
            v-model="statusForm.lendDate"
            type="date"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item
          v-if="statusForm.status === 'IN_USE'"
          label="应还日期"
        >
          <el-date-picker
            v-model="statusForm.dueDate"
            type="date"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item
          v-if="statusForm.status === 'RETURNED'"
          label="归还日期"
        >
          <el-date-picker
            v-model="statusForm.actualReturnDate"
            type="date"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item
          v-if="statusForm.status === 'REJECTED'"
          label="拒收原因"
        >
          <el-input
            v-model="statusForm.rejectionReason"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="statusForm.note"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="statusLoading"
          @click="submitStatus"
        >
          确认
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="reminderDialogVisible"
      title="追加催还备注"
      width="480px"
      destroy-on-close
    >
      <el-form
        ref="reminderFormRef"
        :model="reminderForm"
        :rules="reminderRules"
        label-width="80px"
      >
        <el-form-item
          label="催还内容"
          prop="content"
        >
          <el-input
            v-model="reminderForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入催还内容、沟通记录等"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reminderDialogVisible = false">取消</el-button>
        <el-button
          type="warning"
          :loading="reminderLoading"
          @click="submitReminder"
        >
          提交
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="extensionDialogVisible"
      title="申请延期"
      width="480px"
      destroy-on-close
    >
      <el-alert
        v-if="loan?.dueDate"
        :title="`当前应还日期：${fmt(loan.dueDate)}`"
        type="info"
        :closable="false"
        style="margin-bottom: 16px"
      />
      <el-form
        ref="extensionFormRef"
        :model="extensionForm"
        :rules="extensionRules"
        label-width="100px"
      >
        <el-form-item
          label="新应还日期"
          prop="newDueDate"
        >
          <el-date-picker
            v-model="extensionForm.newDueDate"
            type="date"
            style="width: 100%"
            value-format="YYYY-MM-DD"
            :disabled-date="disabledDate"
          />
        </el-form-item>
        <el-form-item
          label="延期理由"
          prop="reason"
        >
          <el-input
            v-model="extensionForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请说明延期原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="extensionDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="extensionLoading"
          @click="submitExtension"
        >
          提交申请
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  ArrowLeft,
  Document,
  OfficeBuilding,
  Van,
  Edit,
  ArrowDown,
  Bell,
  Clock,
  Promotion,
  Timer,
  BellFilled,
  Calendar,
  Plus,
  Download,
  Upload,
  UserFilled,
  ArrowRight,
  EditPen,
} from '@element-plus/icons-vue';
import api from '../api';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import type {
  InterLibraryLoan,
  InterLibraryLoanStatus,
  InterLibraryLoanExtension,
} from '../types';
import {
  DIRECTION_LABELS,
  DIRECTION_TAGS,
  STATUS_LABELS,
  STATUS_TYPES,
  FEE_PAYER_LABELS,
  STATUS_FLOW,
} from '../types';

const router = useRouter();
const route = useRoute();
const loanId = Number(route.params.id);

const loading = ref(false);
const loan = ref<InterLibraryLoan | null>(null);

const fmt = (s: string) => s?.split('T')[0] || s;
const fmtDateTime = (s: string) => {
  if (!s) return '';
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const fetchDetail = async () => {
  loading.value = true;
  try {
    const res = await api.get(`/interlibrary-loans/${loanId}`);
    loan.value = res as InterLibraryLoan;
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push('/interlibrary-loans');
};

const activeStepIndex = computed(() => {
  if (!loan.value) return 0;
  const statuses = STATUS_FLOW.map((s) => s.status);
  const idx = statuses.indexOf(loan.value.status);
  return idx >= 0 ? idx + 1 : 0;
});

const nextStatuses = computed(() => {
  if (!loan.value) return [];
  const cur = loan.value.status;
  if (cur === 'RETURNED' || cur === 'REJECTED') return [];
  return STATUS_FLOW.filter((s) => {
    if (!s.from) return s.status !== cur;
    return s.from.includes(cur);
  }).map((s) => ({ value: s.status, label: s.label }));
});

const extStatusLabel: Record<string, string> = {
  PENDING: '待审批',
  APPROVED: '已通过',
  REJECTED: '已驳回',
};
const extStatusType: Record<string, 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

const formDialogVisible = ref(false);
const submitLoading = ref(false);
const formRef = ref<FormInstance | null>(null);
const form = reactive<any>({
  direction: 'BORROW_IN',
  feePayer: 'OUR_LIBRARY',
  bookTitle: '',
  isbn: '',
  volumeCount: 1,
  partnerLibraryName: '',
  contactPerson: '',
  contactPhone: '',
  trackingNumber: '',
  lendDate: '',
  dueDate: '',
  remarks: '',
});
const rules = {
  direction: [{ required: true, message: '请选择方向', trigger: 'change' }],
  bookTitle: [{ required: true, message: '请输入书名', trigger: 'blur' }],
  isbn: [{ required: true, message: '请输入 ISBN', trigger: 'blur' }],
  partnerLibraryName: [
    { required: true, message: '请输入对方馆名', trigger: 'blur' },
  ],
  contactPerson: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  volumeCount: [
    {
      validator: (_: any, v: number, cb: any) =>
        v >= 1 ? cb() : cb('册数至少为1'),
      trigger: 'blur',
    },
  ],
};

const handleEdit = () => {
  if (!loan.value) return;
  Object.assign(form, {
    direction: loan.value.direction,
    feePayer: loan.value.feePayer,
    bookTitle: loan.value.bookTitle,
    isbn: loan.value.isbn,
    volumeCount: loan.value.volumeCount,
    partnerLibraryName: loan.value.partnerLibraryName,
    contactPerson: loan.value.contactPerson,
    contactPhone: loan.value.contactPhone || '',
    trackingNumber: loan.value.trackingNumber || '',
    lendDate: loan.value.lendDate ? fmt(loan.value.lendDate) : '',
    dueDate: loan.value.dueDate ? fmt(loan.value.dueDate) : '',
    remarks: loan.value.remarks || '',
  });
  formDialogVisible.value = true;
};

const submitEdit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitLoading.value = true;
    try {
      await api.put(`/interlibrary-loans/${loanId}`, form);
      ElMessage.success('更新成功');
      formDialogVisible.value = false;
      fetchDetail();
    } finally {
      submitLoading.value = false;
    }
  });
};

const statusDialogVisible = ref(false);
const statusLoading = ref(false);
const statusFormRef = ref<FormInstance | null>(null);
const statusForm = reactive<any>({
  status: '',
  trackingNumber: '',
  lendDate: '',
  dueDate: '',
  actualReturnDate: '',
  note: '',
  rejectionReason: '',
});

const statusStepIndex = computed(() => {
  const statuses = STATUS_FLOW.map((s) => s.status);
  const idx = statuses.indexOf(statusForm.status as any);
  return idx >= 0 ? idx + 1 : 0;
});

const handleStatusChange = (status: string) => {
  Object.assign(statusForm, {
    status,
    trackingNumber: loan.value?.trackingNumber || '',
    lendDate: loan.value?.lendDate ? fmt(loan.value.lendDate) : '',
    dueDate: loan.value?.dueDate ? fmt(loan.value.dueDate) : '',
    actualReturnDate: '',
    note: '',
    rejectionReason: '',
  });
  if (status === 'RETURNED') {
    statusForm.actualReturnDate = new Date()
      .toISOString()
      .split('T')[0];
  }
  statusDialogVisible.value = true;
};

const submitStatus = async () => {
  statusLoading.value = true;
  try {
    await api.post(`/interlibrary-loans/${loanId}/status`, statusForm);
    ElMessage.success('状态更新成功');
    statusDialogVisible.value = false;
    fetchDetail();
  } finally {
    statusLoading.value = false;
  }
};

const reminderDialogVisible = ref(false);
const reminderLoading = ref(false);
const reminderFormRef = ref<FormInstance | null>(null);
const reminderForm = reactive({ content: '' });
const reminderRules = {
  content: [{ required: true, message: '请输入催还内容', trigger: 'blur' }],
};

const openReminder = () => {
  reminderForm.content = '';
  reminderDialogVisible.value = true;
};

const submitReminder = async () => {
  if (!reminderFormRef.value) return;
  await reminderFormRef.value.validate(async (valid) => {
    if (!valid) return;
    reminderLoading.value = true;
    try {
      await api.post(`/interlibrary-loans/${loanId}/reminders`, reminderForm);
      ElMessage.success('催还备注添加成功');
      reminderDialogVisible.value = false;
      fetchDetail();
    } finally {
      reminderLoading.value = false;
    }
  });
};

const extensionDialogVisible = ref(false);
const extensionLoading = ref(false);
const extensionFormRef = ref<FormInstance | null>(null);
const extensionForm = reactive({ newDueDate: '', reason: '' });
const extensionRules = {
  newDueDate: [{ required: true, message: '请选择新应还日期', trigger: 'change' }],
  reason: [{ required: true, message: '请输入延期理由', trigger: 'blur' }],
};

const disabledDate = (time: Date) => {
  const due = loan.value?.dueDate ? new Date(loan.value.dueDate) : new Date();
  return time.getTime() < due.getTime();
};

const openExtension = () => {
  Object.assign(extensionForm, { newDueDate: '', reason: '' });
  extensionDialogVisible.value = true;
};

const submitExtension = async () => {
  if (!extensionFormRef.value) return;
  await extensionFormRef.value.validate(async (valid) => {
    if (!valid) return;
    extensionLoading.value = true;
    try {
      await api.post(`/interlibrary-loans/${loanId}/extensions`, extensionForm);
      ElMessage.success('延期申请已提交');
      extensionDialogVisible.value = false;
      fetchDetail();
    } finally {
      extensionLoading.value = false;
    }
  });
};

const reviewExtension = (ext: InterLibraryLoanExtension, action: 'APPROVED' | 'REJECTED') => {
  const actionText = action === 'APPROVED' ? '通过' : '驳回';
  ElMessageBox.confirm(`确定${actionText}该延期申请？`, '提示', {
    type: action === 'APPROVED' ? 'success' : 'warning',
  })
    .then(async () => {
      try {
        await api.post(
          `/interlibrary-loans/${loanId}/extensions/${ext.id}/review`,
          { status: action }
        );
        ElMessage.success(`已${actionText}`);
        fetchDetail();
      } catch (_e) {}
    })
    .catch(() => {});
};

onMounted(() => {
  fetchDetail();
});
</script>

<style scoped lang="scss">
.ill-detail-container {
  .detail-header {
    margin-bottom: 16px;

    .header-main {
      display: flex;
      align-items: center;

      .main-title {
        font-size: 18px;
        font-weight: 600;
      }
    }
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }

  .text-muted {
    color: #909399;
  }

  .small {
    font-size: 12px;
  }

  .primary-text {
    font-weight: 600;
    color: #303133;
    font-size: 15px;
  }

  .danger-text {
    color: #f56c6c;
    font-weight: 600;
  }

  .lib-name {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .action-bar {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px dashed #ebeef5;
  }

  .timeline-item {
    .timeline-action {
      font-weight: 600;
      color: #303133;
    }

    .timeline-note {
      margin-top: 4px;
      color: #606266;
      background: #f5f7fa;
      padding: 6px 10px;
      border-radius: 4px;
      border-left: 3px solid #409eff;
    }

    .timeline-operator {
      margin-top: 6px;
      color: #909399;
      font-size: 12px;
    }
  }

  .reminder-list {
    display: flex;
    flex-direction: column;
    gap: 14px;

    .reminder-item {
      padding: 12px;
      background: #fdf6ec;
      border-left: 3px solid #e6a23c;
      border-radius: 4px;

      .reminder-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;

        .reminder-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;

          .reminder-operator {
            font-weight: 600;
            color: #606266;
          }

          .reminder-time {
            font-size: 12px;
            color: #909399;
          }
        }
      }

      .reminder-content {
        color: #303133;
        line-height: 1.5;
      }
    }
  }

  .extension-list {
    display: flex;
    flex-direction: column;
    gap: 14px;

    .extension-item {
      padding: 12px;
      background: #ecf5ff;
      border-radius: 6px;
      border-left: 3px solid #409eff;

      .ext-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .ext-reason {
        display: flex;
        align-items: flex-start;
        gap: 4px;
        color: #606266;
        margin-bottom: 6px;
      }

      .ext-meta {
        margin-bottom: 8px;
      }

      .ext-actions {
        display: flex;
        gap: 8px;
        padding-top: 8px;
        border-top: 1px dashed #d9ecff;
      }
    }
  }
}
</style>
