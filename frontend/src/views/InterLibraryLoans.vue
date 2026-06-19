<template>
  <div class="ill-container">
    <el-card shadow="hover">
      <div class="filter-bar">
        <div class="filter-left">
          <el-input
            v-model="keyword"
            placeholder="搜索书名、ISBN、对方馆、联系人、物流单号"
            style="width: 320px"
            clearable
            @clear="fetchList"
            @keyup.enter="fetchList"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-select
            v-model="filterDirection"
            placeholder="全部方向"
            clearable
            style="width: 130px; margin-left: 10px"
            @change="fetchList"
          >
            <el-option label="借入" value="BORROW_IN" />
            <el-option label="借出" value="LEND_OUT" />
          </el-select>

          <el-select
            v-model="filterStatus"
            placeholder="全部状态"
            clearable
            style="width: 130px; margin-left: 10px"
            @change="fetchList"
          >
            <el-option
              v-for="s in STATUS_OPTIONS"
              :key="s.value"
              :label="s.label"
              :value="s.value"
            />
          </el-select>

          <el-input
            v-model="filterLibrary"
            placeholder="对方馆名"
            style="width: 180px; margin-left: 10px"
            clearable
            @clear="fetchList"
            @keyup.enter="fetchList"
          />

          <el-switch
            v-model="onlyOverdue"
            active-text="仅看逾期"
            style="margin-left: 10px"
            @change="fetchList"
          />
        </div>

        <div class="filter-right">
          <el-radio-group
            v-model="groupBy"
            size="default"
          >
            <el-radio-button value="none">
              <el-icon><Tickets /></el-icon>
              不分组
            </el-radio-button>
            <el-radio-button value="direction">
              <el-icon><Sort /></el-icon>
              按方向
            </el-radio-button>
            <el-radio-button value="status">
              <el-icon><CircleCheck /></el-icon>
              按状态
            </el-radio-button>
            <el-radio-button value="library">
              <el-icon><OfficeBuilding /></el-icon>
              按对方馆
            </el-radio-button>
          </el-radio-group>

          <el-button
            type="primary"
            :icon="Plus"
            style="margin-left: 12px"
            @click="handleAdd"
          >
            新建记录
          </el-button>
        </div>
      </div>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="列表视图" name="list">
          <template v-if="groupBy === 'none'">
            <el-table
              v-loading="loading"
              :data="loans"
              style="width: 100%; margin-top: 16px"
              border
              stripe
              :row-class-name="rowClass"
            >
              <el-table-column label="方向" width="80">
                <template #default="{ row }">
                  <el-tag :type="DIRECTION_TAGS[row.direction]">
                    {{ DIRECTION_LABELS[row.direction] }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column
                label="书名"
                min-width="160"
                show-overflow-tooltip
              >
                <template #default="{ row }">
                  <el-link
                    type="primary"
                    @click="goDetail(row.id)"
                  >
                    {{ row.bookTitle }}
                  </el-link>
                  <el-tag
                    v-if="row.isOverdue"
                    type="danger"
                    size="small"
                    style="margin-left: 6px"
                  >
                    逾期 {{ row.overdueDays }} 天
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column
                prop="isbn"
                label="ISBN"
                width="140"
              />

              <el-table-column
                label="册数"
                width="70"
                align="center"
              >
                <template #default="{ row }">{{ row.volumeCount }}</template>
              </el-table-column>

              <el-table-column
                label="对方馆"
                min-width="150"
                show-overflow-tooltip
              >
                <template #default="{ row }">
                  <div class="library-cell">
                    <el-icon><OfficeBuilding /></el-icon>
                    <span>{{ row.partnerLibraryName }}</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="联系人/电话" width="140">
                <template #default="{ row }">
                  <div>{{ row.contactPerson }}</div>
                  <div class="text-muted small">{{ row.contactPhone || '-' }}</div>
                </template>
              </el-table-column>

              <el-table-column
                prop="trackingNumber"
                label="物流单号"
                width="150"
                show-overflow-tooltip
              />

              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="STATUS_TYPES[row.status]">
                    {{ STATUS_LABELS[row.status] }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column label="借出/应还" width="180">
                <template #default="{ row }">
                  <div>借出：{{ row.lendDate ? fmt(row.lendDate) : '-' }}</div>
                  <div
                    :class="['text-muted small', row.isOverdue ? 'danger-text' : '']"
                  >
                    应还：{{ row.dueDate ? fmt(row.dueDate) : '-' }}
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="费用" width="100">
                <template #default="{ row }">
                  {{ FEE_PAYER_LABELS[row.feePayer] }}
                </template>
              </el-table-column>

              <el-table-column
                label="操作"
                width="260"
                fixed="right"
              >
                <template #default="{ row }">
                  <el-button
                    link
                    type="primary"
                    @click="goDetail(row.id)"
                  >
                    详情
                  </el-button>
                  <el-button
                    link
                    type="primary"
                    @click="handleEdit(row)"
                  >
                    编辑
                  </el-button>
                  <el-dropdown
                    trigger="click"
                    @command="(cmd: any) => handleStatusChange(row, cmd)"
                  >
                    <el-button link type="success">
                      推进
                      <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item
                          v-for="s in getNextStatuses(row.status)"
                          :key="s.value"
                          :command="s.value"
                        >
                          → {{ s.label }}
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                  <el-button
                    link
                    type="danger"
                    @click="handleDelete(row)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>

          <template v-else>
            <div
              v-loading="loading"
              class="grouped-view"
            >
              <template v-for="group in groupedData" :key="group.key">
                <div class="group-section">
                  <div class="group-header">
                    <span class="group-title">
                      {{ group.title }}
                    </span>
                    <el-tag
                      size="small"
                      class="group-count"
                    >
                      {{ group.items.length }} 条
                    </el-tag>
                    <el-tag
                      v-if="group.overdueCount > 0"
                      type="danger"
                      size="small"
                      class="group-count"
                    >
                      逾期 {{ group.overdueCount }}
                    </el-tag>
                  </div>

                  <el-table
                    :data="group.items"
                    size="small"
                    border
                    stripe
                    :row-class-name="rowClass"
                  >
                    <el-table-column label="方向" width="70">
                      <template #default="{ row }">
                        <el-tag
                          :type="DIRECTION_TAGS[row.direction]"
                          size="small"
                        >
                          {{ DIRECTION_LABELS[row.direction] }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column
                      label="书名"
                      min-width="150"
                      show-overflow-tooltip
                    >
                      <template #default="{ row }">
                        <el-link
                          type="primary"
                          @click="goDetail(row.id)"
                        >
                          {{ row.bookTitle }}
                        </el-link>
                        <el-tag
                          v-if="row.isOverdue"
                          type="danger"
                          size="small"
                          style="margin-left: 4px"
                        >
                          逾期{{ row.overdueDays }}天
                        </el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column prop="isbn" label="ISBN" width="130" />
                    <el-table-column
                      v-if="groupBy !== 'status'"
                      label="状态"
                      width="90"
                    >
                      <template #default="{ row }">
                        <el-tag
                          :type="STATUS_TYPES[row.status]"
                          size="small"
                        >
                          {{ STATUS_LABELS[row.status] }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column
                      v-if="groupBy !== 'library'"
                      label="对方馆"
                      min-width="130"
                      show-overflow-tooltip
                    >
                      <template #default="{ row }">
                        {{ row.partnerLibraryName }}
                      </template>
                    </el-table-column>
                    <el-table-column label="应还日期" width="110">
                      <template #default="{ row }">
                        <span
                          :class="row.isOverdue ? 'danger-text' : ''"
                        >
                          {{ row.dueDate ? fmt(row.dueDate) : '-' }}
                        </span>
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="200" fixed="right">
                      <template #default="{ row }">
                        <el-button
                          link
                          type="primary"
                          size="small"
                          @click="goDetail(row.id)"
                        >
                          详情
                        </el-button>
                        <el-dropdown
                          trigger="click"
                          @command="(cmd: any) => handleStatusChange(row, cmd)"
                        >
                          <el-button link type="success" size="small">
                            推进
                            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                          </el-button>
                          <template #dropdown>
                            <el-dropdown-menu>
                              <el-dropdown-item
                                v-for="s in getNextStatuses(row.status)"
                                :key="s.value"
                                :command="s.value"
                              >
                                → {{ s.label }}
                              </el-dropdown-item>
                            </el-dropdown-menu>
                          </template>
                        </el-dropdown>
                        <el-button
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
                </div>
              </template>
            </div>
          </template>
        </el-tab-pane>

        <el-tab-pane label="看板视图" name="board">
          <div
            v-loading="loading"
            class="board-view"
          >
            <div
              v-for="col in boardColumns"
              :key="col.status"
              class="board-column"
            >
              <div
                class="board-header"
                :style="{ borderColor: STATUS_COLORS[col.status] }"
              >
                <el-tag :type="STATUS_TYPES[col.status]">
                  {{ STATUS_LABELS[col.status] }}
                </el-tag>
                <span class="col-count">{{ col.items.length }}</span>
              </div>
              <div class="board-cards">
                <div
                  v-for="item in col.items"
                  :key="item.id"
                  :class="['board-card', item.isOverdue ? 'overdue-card' : '']"
                  @click="goDetail(item.id)"
                >
                  <div class="card-top">
                    <el-tag
                      :type="DIRECTION_TAGS[item.direction]"
                      size="small"
                    >
                      {{ DIRECTION_LABELS[item.direction] }}
                    </el-tag>
                    <el-tag
                      v-if="item.isOverdue"
                      type="danger"
                      size="small"
                    >
                      逾期{{ item.overdueDays }}天
                    </el-tag>
                    <span
                      v-if="item.volumeCount > 1"
                      class="vol-count"
                    >
                      ×{{ item.volumeCount }}
                    </span>
                  </div>
                  <div class="card-title">{{ item.bookTitle }}</div>
                  <div class="card-info text-muted small">{{ item.isbn }}</div>
                  <div class="card-info text-muted small">
                    <el-icon><OfficeBuilding /></el-icon>
                    {{ item.partnerLibraryName }}
                  </div>
                  <div class="card-info text-muted small">
                    {{ item.contactPerson }}
                  </div>
                  <div
                    v-if="item.trackingNumber"
                    class="card-info small"
                  >
                    <el-icon><Van /></el-icon>
                    {{ item.trackingNumber }}
                  </div>
                  <div
                    v-if="item.dueDate"
                    :class="['card-info small', item.isOverdue ? 'danger-text' : '']"
                  >
                    应还：{{ fmt(item.dueDate) }}
                  </div>
                </div>
                <div v-if="col.items.length === 0" class="empty-card">
                  暂无记录
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog
      v-model="formDialogVisible"
      :title="isEdit ? '编辑馆际互借记录' : '新建馆际互借记录'"
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
          <el-input v-model="form.bookTitle" placeholder="请输入书名" />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="16">
            <el-form-item label="ISBN" prop="isbn">
              <el-input v-model="form.isbn" placeholder="请输入 ISBN" />
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
          <el-input
            v-model="form.partnerLibraryName"
            placeholder="请输入对方图书馆名称"
          />
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
          <el-input v-model="form.trackingNumber" placeholder="可选" />
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
            placeholder="可选"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="formDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="submitForm"
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
        :active="activeStepIndex"
        direction="horizontal"
        :process-status="activeStepStatus"
        finish-status="success"
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
            :type="STATUS_TYPES[statusForm.status]"
            size="large"
          >
            {{ STATUS_LABELS[statusForm.status] }}
          </el-tag>
        </el-form-item>

        <el-form-item
          v-if="statusForm.status === 'SHIPPED' || statusForm.status === 'IN_TRANSIT'"
          label="物流单号"
        >
          <el-input v-model="statusForm.trackingNumber" />
        </el-form-item>

        <el-form-item
          v-if="statusForm.status === 'IN_USE' || statusForm.status === 'IN_TRANSIT' || statusForm.status === 'SHIPPED'"
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
            placeholder="可选"
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Search,
  Plus,
  Sort,
  CircleCheck,
  OfficeBuilding,
  ArrowDown,
  Download,
  Upload,
  Tickets,
  Van,
} from '@element-plus/icons-vue';
import api from '../api';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import type { InterLibraryLoan, InterLibraryLoanStatus } from '../types';
import {
  DIRECTION_LABELS,
  DIRECTION_TAGS,
  STATUS_LABELS,
  STATUS_TYPES,
  STATUS_COLORS,
  FEE_PAYER_LABELS,
  STATUS_FLOW,
} from '../types';

const router = useRouter();

const loading = ref(false);
const loans = ref<InterLibraryLoan[]>([]);
const keyword = ref('');
const filterDirection = ref('');
const filterStatus = ref('');
const filterLibrary = ref('');
const onlyOverdue = ref(false);
const groupBy = ref<'none' | 'direction' | 'status' | 'library'>('direction');
const activeTab = ref('list');

const STATUS_OPTIONS = [
  { value: 'PENDING', label: '申请中' },
  { value: 'SHIPPED', label: '已发货' },
  { value: 'IN_TRANSIT', label: '运输中' },
  { value: 'IN_USE', label: '在馆使用' },
  { value: 'RETURNED', label: '已归还' },
  { value: 'REJECTED', label: '已拒收' },
];

const fmt = (s: string) => s?.split('T')[0] || s;

const fetchList = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (keyword.value) params.keyword = keyword.value;
    if (filterDirection.value) params.direction = filterDirection.value;
    if (filterStatus.value) params.status = filterStatus.value;
    if (filterLibrary.value) params.partnerLibraryName = filterLibrary.value;
    if (onlyOverdue.value) params.isOverdue = true;
    const res = await api.get('/interlibrary-loans', { params });
    loans.value = res as InterLibraryLoan[];
  } finally {
    loading.value = false;
  }
};

const rowClass = ({ row }: { row: InterLibraryLoan }) => {
  if (row.isOverdue) return 'overdue-row';
  return '';
};

const groupedData = computed(() => {
  const map = new Map<string, InterLibraryLoan[]>();
  const overdueMap = new Map<string, number>();

  let titleGetter: (r: InterLibraryLoan) => string;
  let labelMap: Record<string, string> | null = null;

  switch (groupBy.value) {
    case 'direction':
      titleGetter = (r) => r.direction;
      labelMap = DIRECTION_LABELS as any;
      break;
    case 'status':
      titleGetter = (r) => r.status;
      labelMap = STATUS_LABELS as any;
      break;
    case 'library':
      titleGetter = (r) => r.partnerLibraryName;
      break;
    default:
      return [];
  }

  for (const item of loans.value) {
    const key = titleGetter(item);
    if (!map.has(key)) {
      map.set(key, []);
      overdueMap.set(key, 0);
    }
    map.get(key)!.push(item);
    if (item.isOverdue) {
      overdueMap.set(key, (overdueMap.get(key) || 0) + 1);
    }
  }

  return Array.from(map.keys()).map((key) => ({
    key,
    title: labelMap ? labelMap[key] || key : key,
    items: map.get(key) || [],
    overdueCount: overdueMap.get(key) || 0,
  }));
});

const boardColumns = computed(() => {
  return STATUS_FLOW.map((s) => ({
    status: s.status,
    items: loans.value.filter((l) => l.status === s.status),
  }));
});

const getNextStatuses = (current: InterLibraryLoanStatus) => {
  if (current === 'RETURNED' || current === 'REJECTED') return [];
  const result = STATUS_FLOW.filter((s) => {
    if (!s.from) return s.status !== current;
    return s.from.includes(current);
  });
  return result.map((s) => ({ value: s.status, label: s.label }));
};

const goDetail = (id: number) => {
  router.push(`/interlibrary-loans/${id}`);
};

const formDialogVisible = ref(false);
const isEdit = ref(false);
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

const resetForm = () => {
  Object.assign(form, {
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
    id: undefined,
  });
};

const handleAdd = () => {
  isEdit.value = false;
  resetForm();
  formDialogVisible.value = true;
};

const handleEdit = (row: InterLibraryLoan) => {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    direction: row.direction,
    feePayer: row.feePayer,
    bookTitle: row.bookTitle,
    isbn: row.isbn,
    volumeCount: row.volumeCount,
    partnerLibraryName: row.partnerLibraryName,
    contactPerson: row.contactPerson,
    contactPhone: row.contactPhone || '',
    trackingNumber: row.trackingNumber || '',
    lendDate: row.lendDate ? fmt(row.lendDate) : '',
    dueDate: row.dueDate ? fmt(row.dueDate) : '',
    remarks: row.remarks || '',
  });
  formDialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitLoading.value = true;
    try {
      if (isEdit.value) {
        await api.put(`/interlibrary-loans/${form.id}`, form);
        ElMessage.success('更新成功');
      } else {
        await api.post('/interlibrary-loans', form);
        ElMessage.success('创建成功');
      }
      formDialogVisible.value = false;
      fetchList();
    } finally {
      submitLoading.value = false;
    }
  });
};

const handleDelete = (row: InterLibraryLoan) => {
  ElMessageBox.confirm(
    `确定删除《${row.bookTitle}》的${DIRECTION_LABELS[row.direction]}记录？`,
    '警告',
    { type: 'warning' }
  )
    .then(async () => {
      await api.delete(`/interlibrary-loans/${row.id}`);
      ElMessage.success('删除成功');
      fetchList();
    })
    .catch(() => {});
};

const statusDialogVisible = ref(false);
const statusLoading = ref(false);
const statusFormRef = ref<FormInstance | null>(null);
const statusCurrentRow = ref<InterLibraryLoan | null>(null);
const statusForm = reactive<any>({
  status: '',
  trackingNumber: '',
  lendDate: '',
  dueDate: '',
  actualReturnDate: '',
  note: '',
  rejectionReason: '',
});

const activeStepIndex = computed(() => {
  const statuses = STATUS_FLOW.map((s) => s.status);
  const idx = statuses.indexOf(statusForm.status as any);
  return idx >= 0 ? idx + 1 : 0;
});

const activeStepStatus = computed(() => {
  return statusForm.status === 'REJECTED' ? 'error' : 'process';
});

const handleStatusChange = (row: InterLibraryLoan, status: string) => {
  statusCurrentRow.value = row;
  Object.assign(statusForm, {
    status,
    trackingNumber: row.trackingNumber || '',
    lendDate: row.lendDate ? fmt(row.lendDate) : '',
    dueDate: row.dueDate ? fmt(row.dueDate) : '',
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
  if (!statusCurrentRow.value) return;
  statusLoading.value = true;
  try {
    await api.post(
      `/interlibrary-loans/${statusCurrentRow.value.id}/status`,
      statusForm
    );
    ElMessage.success('状态更新成功');
    statusDialogVisible.value = false;
    fetchList();
  } finally {
    statusLoading.value = false;
  }
};

onMounted(() => {
  fetchList();
});
</script>

<style scoped lang="scss">
.ill-container {
  .filter-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;

    .filter-left,
    .filter-right {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
    }
  }

  .library-cell {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .text-muted {
    color: #909399;
  }

  .small {
    font-size: 12px;
  }

  .danger-text {
    color: #f56c6c;
    font-weight: 600;
  }

  :deep(.overdue-row) {
    background-color: #fef0f0 !important;

    td.el-table__cell {
      background-color: #fef0f0 !important;
    }
  }

  .grouped-view {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .group-section {
    .group-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;

      .group-title {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
      }

      .group-count {
        margin-left: 0;
      }
    }
  }

  .board-view {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    padding: 16px 0;
    min-height: 500px;

    .board-column {
      flex: 1;
      min-width: 220px;
      background: #f5f7fa;
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;

      .board-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 10px;
        margin-bottom: 10px;
        border-bottom: 3px solid;

        .col-count {
          background: #fff;
          color: #606266;
          border: 1px solid #dcdfe6;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
        }
      }

      .board-cards {
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex: 1;
      }

      .board-card {
        background: #fff;
        border-radius: 6px;
        padding: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        cursor: pointer;
        transition: all 0.2s;
        border-left: 3px solid transparent;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .card-top {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;

          .vol-count {
            margin-left: auto;
            color: #909399;
            font-size: 12px;
          }
        }

        .card-title {
          font-weight: 600;
          color: #303133;
          margin-bottom: 6px;
          word-break: break-all;
        }

        .card-info {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
        }
      }

      .overdue-card {
        border-left-color: #f56c6c;
        background: linear-gradient(90deg, #fef0f0 0%, #fff 30%);
      }

      .empty-card {
        text-align: center;
        color: #c0c4cc;
        padding: 30px 0;
        font-size: 13px;
      }
    }
  }
}
</style>
