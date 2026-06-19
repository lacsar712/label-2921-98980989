<template>
  <div class="compensations-container">
    <el-card shadow="hover">
      <template #header>
        <div class="header-actions">
          <h3>丢书赔偿管理</h3>
          <div class="toolbar">
            <el-input
              v-model="filterKeyword"
              placeholder="搜索书名、ISBN、借阅人"
              :prefix-icon="Search"
              clearable
              style="width: 220px; margin-right: 12px"
            />
            <el-select
              v-model="filterStatus"
              placeholder="赔偿状态"
              clearable
              style="width: 130px; margin-right: 12px"
            >
              <el-option
                v-for="(label, key) in COMP_STATUS_LABELS"
                :key="key"
                :label="label"
                :value="key"
              />
            </el-select>
            <el-select
              v-model="filterLossType"
              placeholder="丢失类型"
              clearable
              style="width: 130px; margin-right: 12px"
            >
              <el-option
                v-for="(label, key) in LOSS_TYPE_LABELS"
                :key="key"
                :label="label"
                :value="key"
              />
            </el-select>
            <el-button
              type="primary"
              @click="showCreateDialog"
            >
              <el-icon><Plus /></el-icon>
              新建赔偿单
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="compensations"
        style="width: 100%"
        border
        stripe
        :default-sort="{ prop: 'createdAt', order: 'descending' }"
      >
        <el-table-column
          prop="book.title"
          label="书名"
          min-width="140"
        >
          <template #default="{ row }">
            <el-text
              type="primary"
              style="font-weight: 500"
            >
              {{ row.book.title }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column
          prop="borrower.name"
          label="借阅人"
          width="100"
        />
        <el-table-column
          prop="lossType"
          label="丢失类型"
          width="110"
        >
          <template #default="{ row }">
            <el-tag
              :type="LOSS_TYPE_TAGS[row.lossType]"
              size="small"
            >
              {{ LOSS_TYPE_LABELS[row.lossType] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="status"
          label="赔偿状态"
          width="110"
        >
          <template #default="{ row }">
            <el-tag
              :type="COMP_STATUS_TAGS[row.status]"
              size="small"
            >
              {{ COMP_STATUS_LABELS[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="bookPrice"
          label="图书定价"
          width="90"
          align="right"
        >
          <template #default="{ row }">
            ¥{{ row.bookPrice.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="multiplier"
          label="赔偿倍率"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            ×{{ row.multiplier }}
          </template>
        </el-table-column>
        <el-table-column
          prop="depreciationRate"
          label="折旧率"
          width="80"
          align="center"
        >
          <template #default="{ row }">
            {{ (row.depreciationRate * 100).toFixed(0) }}%
          </template>
        </el-table-column>
        <el-table-column
          prop="calculatedAmount"
          label="计算金额"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            ¥{{ row.calculatedAmount.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column
          label="应赔金额"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            <span style="font-weight: 600; color: #f56c6c">
              ¥{{ (row.adjustedAmount ?? row.calculatedAmount).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="已付金额"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            <span :style="{ color: row.paidAmount > 0 ? '#67c23a' : '#909399' }">
              ¥{{ row.paidAmount.toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          prop="paymentMethod"
          label="付款方式"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            {{ row.paymentMethod ? PAYMENT_METHOD_LABELS[row.paymentMethod] : '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="经办人"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            {{ row.handler?.username || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          prop="createdAt"
          label="创建时间"
          width="160"
          sortable
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="180"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              @click="showDetailDialog(row)"
            >
              详情
            </el-button>
            <el-button
              v-if="row.status === 'PENDING' || row.status === 'INSTALLMENT'"
              link
              type="warning"
              size="small"
              @click="showEditDialog(row)"
            >
              调整
            </el-button>
            <el-button
              v-if="row.status === 'PENDING' || row.status === 'INSTALLMENT'"
              link
              type="success"
              size="small"
              @click="showStatusDialog(row)"
            >
              处理
            </el-button>
            <el-button
              v-if="row.status === 'PENDING'"
              link
              type="danger"
              size="small"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div
        v-if="!loading && compensations.length === 0"
        class="empty-state"
      >
        <el-empty description="暂无赔偿记录" />
      </div>
    </el-card>

    <el-dialog
      v-model="createDialogVisible"
      title="新建赔偿单"
      width="650px"
      destroy-on-close
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="100px"
      >
        <el-form-item
          label="借阅记录"
          prop="borrowRecordId"
        >
          <el-select
            v-model="createForm.borrowRecordId"
            placeholder="选择未归还的借阅记录"
            filterable
            style="width: 100%"
            @change="onBorrowRecordSelect"
          >
            <el-option
              v-for="br in activeBorrows"
              :key="br.id"
              :label="`[${br.id}] ${br.book.title} - ${br.borrower.name} (${formatDate(br.borrowDate)})`"
              :value="br.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="丢失类型"
          prop="lossType"
        >
          <el-radio-group v-model="createForm.lossType">
            <el-radio
              v-for="(label, key) in LOSS_TYPE_LABELS"
              :key="key"
              :value="key"
            >
              {{ label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          label="赔偿倍率"
          prop="multiplier"
        >
          <el-input-number
            v-model="createForm.multiplier"
            :min="0.1"
            :max="10"
            :step="0.5"
            :precision="1"
          />
        </el-form-item>
        <el-form-item
          label="折旧率"
          prop="depreciationRate"
        >
          <el-slider
            v-model="depreciationPercent"
            :min="0"
            :max="100"
            :step="5"
            show-input
            :show-input-controls="false"
            input-size="small"
          />
        </el-form-item>
        <el-form-item label="计算金额">
          <el-text
            type="danger"
            size="large"
            style="font-weight: 600"
          >
            ¥{{ previewAmount.toFixed(2) }}
          </el-text>
          <el-text
            type="info"
            size="small"
            style="margin-left: 12px"
          >
            (定价 ¥{{ selectedBookPrice.toFixed(2) }} × 倍率 {{ createForm.multiplier }} × 折旧系数 {{ (1 - createForm.depreciationRate).toFixed(2) }})
          </el-text>
        </el-form-item>
        <el-form-item
          label="人工调整金额"
          prop="adjustedAmount"
        >
          <el-input-number
            v-model="createForm.adjustedAmount"
            :min="0"
            :precision="2"
            placeholder="留空则使用计算金额"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item
          label="处理说明"
          prop="note"
        >
          <el-input
            v-model="createForm.note"
            type="textarea"
            :rows="3"
            placeholder="可选：记录处理说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleCreate"
        >
          确认创建
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editDialogVisible"
      title="调整赔偿金额"
      width="550px"
      destroy-on-close
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        label-width="110px"
      >
        <el-form-item label="图书定价">
          ¥{{ editForm.bookPrice?.toFixed(2) }}
        </el-form-item>
        <el-form-item label="赔偿倍率">
          <el-input-number
            v-model="editForm.multiplier"
            :min="0.1"
            :max="10"
            :step="0.5"
            :precision="1"
          />
        </el-form-item>
        <el-form-item label="折旧率">
          <el-slider
            v-model="editDepreciationPercent"
            :min="0"
            :max="100"
            :step="5"
            show-input
            :show-input-controls="false"
            input-size="small"
          />
        </el-form-item>
        <el-form-item label="计算金额">
          <el-text
            type="danger"
            size="large"
            style="font-weight: 600"
          >
            ¥{{ editPreviewAmount.toFixed(2) }}
          </el-text>
        </el-form-item>
        <el-form-item label="人工调整金额">
          <el-input-number
            v-model="editForm.adjustedAmount"
            :min="0"
            :precision="2"
            placeholder="留空则使用计算金额"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="处理说明">
          <el-input
            v-model="editForm.note"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleEdit"
        >
          保存调整
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="statusDialogVisible"
      title="处理赔偿"
      width="550px"
      destroy-on-close
    >
      <el-form
        ref="statusFormRef"
        :model="statusForm"
        :rules="statusRules"
        label-width="100px"
      >
        <el-form-item label="当前状态">
          <el-tag :type="COMP_STATUS_TAGS[currentCompensation?.status as CompensationStatus]">
            {{ COMP_STATUS_LABELS[currentCompensation?.status as CompensationStatus] }}
          </el-tag>
        </el-form-item>
        <el-form-item
          label="目标状态"
          prop="status"
        >
          <el-select
            v-model="statusForm.status"
            style="width: 100%"
          >
            <el-option
              v-for="(label, key) in availableStatusOptions"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="statusForm.status === 'INSTALLMENT' || statusForm.status === 'SETTLED'"
          label="付款方式"
          prop="paymentMethod"
        >
          <el-select
            v-model="statusForm.paymentMethod"
            placeholder="选择付款方式"
            style="width: 100%"
          >
            <el-option
              v-for="(label, key) in PAYMENT_METHOD_LABELS"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="statusForm.status === 'INSTALLMENT'"
          label="本次付款金额"
          prop="paidAmount"
        >
          <el-input-number
            v-model="statusForm.paidAmount"
            :min="0"
            :precision="2"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item
          label="处理说明"
          prop="note"
        >
          <el-input
            v-model="statusForm.note"
            type="textarea"
            :rows="3"
            placeholder="记录处理说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleStatusUpdate"
        >
          确认处理
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="detailDialogVisible"
      title="赔偿详情"
      width="750px"
    >
      <el-descriptions
        v-if="currentCompensation"
        :column="2"
        border
      >
        <el-descriptions-item label="图书名称">
          {{ currentCompensation.book.title }}
        </el-descriptions-item>
        <el-descriptions-item label="作者">
          {{ currentCompensation.book.author }}
        </el-descriptions-item>
        <el-descriptions-item label="ISBN">
          {{ currentCompensation.book.isbn }}
        </el-descriptions-item>
        <el-descriptions-item label="分类">
          {{ currentCompensation.book.category?.name || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="借阅人">
          {{ currentCompensation.borrower.name }}
        </el-descriptions-item>
        <el-descriptions-item label="借阅时间">
          {{ formatDate(currentCompensation.borrowRecord.borrowDate) }}
        </el-descriptions-item>
        <el-descriptions-item label="丢失类型">
          <el-tag
            :type="LOSS_TYPE_TAGS[currentCompensation.lossType]"
            size="small"
          >
            {{ LOSS_TYPE_LABELS[currentCompensation.lossType] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="赔偿状态">
          <el-tag
            :type="COMP_STATUS_TAGS[currentCompensation.status]"
            size="small"
          >
            {{ COMP_STATUS_LABELS[currentCompensation.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="图书定价">
          ¥{{ currentCompensation.bookPrice.toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="赔偿倍率">
          ×{{ currentCompensation.multiplier }}
        </el-descriptions-item>
        <el-descriptions-item label="折旧率">
          {{ (currentCompensation.depreciationRate * 100).toFixed(0) }}%
        </el-descriptions-item>
        <el-descriptions-item label="计算金额">
          ¥{{ currentCompensation.calculatedAmount.toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="应赔金额">
          <span style="color: #f56c6c; font-weight: 600">
            ¥{{ (currentCompensation.adjustedAmount ?? currentCompensation.calculatedAmount).toFixed(2) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="已付金额">
          <span style="color: #67c23a; font-weight: 600">
            ¥{{ currentCompensation.paidAmount.toFixed(2) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="付款方式">
          {{ currentCompensation.paymentMethod ? PAYMENT_METHOD_LABELS[currentCompensation.paymentMethod] : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="经办人">
          {{ currentCompensation.handler?.username || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="结案时间">
          {{ currentCompensation.settledAt ? formatDate(currentCompensation.settledAt) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="currentCompensation.note"
          label="处理说明"
          :span="2"
        >
          {{ currentCompensation.note }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatDate(currentCompensation.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">
          {{ formatDate(currentCompensation.updatedAt) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Plus } from '@element-plus/icons-vue';
import api from '../api';
import type {
  Compensation,
  CompensationLossType,
  CompensationStatus,
  PaymentMethod,
  BorrowRecord,
} from '../types';
import {
  LOSS_TYPE_LABELS,
  LOSS_TYPE_TAGS,
  COMP_STATUS_LABELS,
  COMP_STATUS_TAGS,
  PAYMENT_METHOD_LABELS,
} from '../types';

const compensations = ref<Compensation[]>([]);
const activeBorrows = ref<any[]>([]);
const loading = ref(false);
const submitting = ref(false);
const filterKeyword = ref('');
const filterStatus = ref<CompensationStatus | ''>('');
const filterLossType = ref<CompensationLossType | ''>('');

const createDialogVisible = ref(false);
const editDialogVisible = ref(false);
const statusDialogVisible = ref(false);
const detailDialogVisible = ref(false);
const currentCompensation = ref<Compensation | null>(null);

const createFormRef = ref();
const editFormRef = ref();
const statusFormRef = ref();

const createForm = ref<{
  borrowRecordId: number | undefined;
  lossType: CompensationLossType;
  multiplier: number;
  depreciationRate: number;
  adjustedAmount: number | undefined;
  note: string;
}>({
  borrowRecordId: undefined,
  lossType: 'LOST',
  multiplier: 2.0,
  depreciationRate: 0.0,
  adjustedAmount: undefined,
  note: '',
});

const editForm = ref<{
  id: number;
  bookPrice: number;
  multiplier: number;
  depreciationRate: number;
  adjustedAmount: number | undefined;
  note: string;
}>({
  id: 0,
  bookPrice: 0,
  multiplier: 2.0,
  depreciationRate: 0.0,
  adjustedAmount: undefined,
  note: '',
});

const statusForm = ref<{
  status: CompensationStatus;
  paymentMethod: PaymentMethod | undefined;
  paidAmount: number;
  note: string;
}>({
  status: 'SETTLED',
  paymentMethod: undefined,
  paidAmount: 0,
  note: '',
});

const createRules = {
  borrowRecordId: [{ required: true, message: '请选择借阅记录', trigger: 'change' }],
  lossType: [{ required: true, message: '请选择丢失类型', trigger: 'change' }],
  multiplier: [{ required: true, message: '请输入赔偿倍率', trigger: 'blur' }],
};

const statusRules = {
  status: [{ required: true, message: '请选择目标状态', trigger: 'change' }],
  paymentMethod: [{ required: true, message: '请选择付款方式', trigger: 'change' }],
};

const depreciationPercent = computed({
  get: () => Math.round(createForm.value.depreciationRate * 100),
  set: (val: number) => {
    createForm.value.depreciationRate = val / 100;
  },
});

const editDepreciationPercent = computed({
  get: () => Math.round(editForm.value.depreciationRate * 100),
  set: (val: number) => {
    editForm.value.depreciationRate = val / 100;
  },
});

const selectedBookPrice = computed(() => {
  if (!createForm.value.borrowRecordId) return 0;
  const record = activeBorrows.value.find((b) => b.id === createForm.value.borrowRecordId);
  return record?.book?.price ?? 0;
});

const previewAmount = computed(() => {
  return selectedBookPrice.value * createForm.value.multiplier * (1 - createForm.value.depreciationRate);
});

const editPreviewAmount = computed(() => {
  return editForm.value.bookPrice * editForm.value.multiplier * (1 - editForm.value.depreciationRate);
});

const availableStatusOptions = computed(() => {
  if (!currentCompensation.value) return {};
  const current = currentCompensation.value.status;
  const options: Record<string, string> = {};
  if (current === 'PENDING') {
    options.INSTALLMENT = COMP_STATUS_LABELS.INSTALLMENT;
    options.SETTLED = COMP_STATUS_LABELS.SETTLED;
    options.WAIVED = COMP_STATUS_LABELS.WAIVED;
  }
  if (current === 'INSTALLMENT') {
    options.SETTLED = COMP_STATUS_LABELS.SETTLED;
    options.WAIVED = COMP_STATUS_LABELS.WAIVED;
    options.PENDING = COMP_STATUS_LABELS.PENDING;
  }
  return options;
});

const fetchCompensations = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (filterStatus.value) params.status = filterStatus.value;
    if (filterLossType.value) params.lossType = filterLossType.value;
    if (filterKeyword.value) params.keyword = filterKeyword.value;
    const res: any = await api.get('/compensations', { params });
    compensations.value = res;
  } finally {
    loading.value = false;
  }
};

const fetchActiveBorrows = async () => {
  try {
    const res: any = await api.get('/borrows/current');
    activeBorrows.value = res;
  } catch {
    ElMessage.error('获取借阅记录失败');
  }
};

const onBorrowRecordSelect = () => {
  // previewAmount will auto-update via computed
};

const showCreateDialog = () => {
  createForm.value = {
    borrowRecordId: undefined,
    lossType: 'LOST',
    multiplier: 2.0,
    depreciationRate: 0.0,
    adjustedAmount: undefined,
    note: '',
  };
  createDialogVisible.value = true;
};

const handleCreate = async () => {
  try {
    await createFormRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    const payload: any = {
      borrowRecordId: createForm.value.borrowRecordId,
      lossType: createForm.value.lossType,
      multiplier: createForm.value.multiplier,
      depreciationRate: createForm.value.depreciationRate,
      note: createForm.value.note || undefined,
    };
    if (createForm.value.adjustedAmount !== undefined && createForm.value.adjustedAmount > 0) {
      payload.adjustedAmount = createForm.value.adjustedAmount;
    }
    await api.post('/compensations', payload);
    ElMessage.success('赔偿单创建成功');
    createDialogVisible.value = false;
    fetchCompensations();
  } catch {
    ElMessage.error('创建失败');
  } finally {
    submitting.value = false;
  }
};

const showEditDialog = (row: Compensation) => {
  currentCompensation.value = row;
  editForm.value = {
    id: row.id,
    bookPrice: row.bookPrice,
    multiplier: row.multiplier,
    depreciationRate: row.depreciationRate,
    adjustedAmount: row.adjustedAmount ?? undefined,
    note: row.note ?? '',
  };
  editDialogVisible.value = true;
};

const handleEdit = async () => {
  submitting.value = true;
  try {
    const payload: any = {
      multiplier: editForm.value.multiplier,
      depreciationRate: editForm.value.depreciationRate,
      note: editForm.value.note || undefined,
    };
    if (editForm.value.adjustedAmount !== undefined && editForm.value.adjustedAmount > 0) {
      payload.adjustedAmount = editForm.value.adjustedAmount;
    }
    await api.put(`/compensations/${editForm.value.id}`, payload);
    ElMessage.success('调整成功');
    editDialogVisible.value = false;
    fetchCompensations();
  } catch {
    ElMessage.error('调整失败');
  } finally {
    submitting.value = false;
  }
};

const showStatusDialog = (row: Compensation) => {
  currentCompensation.value = row;
  statusForm.value = {
    status: 'SETTLED',
    paymentMethod: row.paymentMethod ?? undefined,
    paidAmount: 0,
    note: '',
  };
  statusDialogVisible.value = true;
};

const handleStatusUpdate = async () => {
  try {
    await statusFormRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    const payload: any = {
      status: statusForm.value.status,
      note: statusForm.value.note || undefined,
    };
    if (statusForm.value.paymentMethod) {
      payload.paymentMethod = statusForm.value.paymentMethod;
    }
    if (statusForm.value.status === 'INSTALLMENT' && statusForm.value.paidAmount > 0) {
      payload.paidAmount = statusForm.value.paidAmount;
    }
    await api.patch(`/compensations/${currentCompensation.value!.id}/status`, payload);
    ElMessage.success('处理成功');
    statusDialogVisible.value = false;
    fetchCompensations();
  } catch {
    ElMessage.error('处理失败');
  } finally {
    submitting.value = false;
  }
};

const showDetailDialog = (row: Compensation) => {
  currentCompensation.value = row;
  detailDialogVisible.value = true;
};

const handleDelete = async (row: Compensation) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除《${row.book.title}》的赔偿单吗？删除后借阅状态将恢复为借阅中。`,
      '确认删除',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    );
    await api.delete(`/compensations/${row.id}`);
    ElMessage.success('删除成功');
    fetchCompensations();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

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

onMounted(() => {
  fetchCompensations();
  fetchActiveBorrows();
});
</script>

<style scoped lang="scss">
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  h3 { margin: 0; }
}

.toolbar {
  display: flex;
  align-items: center;
}

.empty-state {
  padding: 60px 0;
}
</style>
