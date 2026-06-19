<template>
  <div class="series-detail-container">
    <div class="header-section">
      <el-button
        type="default"
        :icon="ArrowLeft"
        @click="goBack"
        style="margin-bottom: 20px"
      >
        返回列表
      </el-button>

      <el-card v-loading="loading">
        <div class="series-header" v-if="seriesDetail">
          <div class="series-cover">
            <el-image
              v-if="seriesDetail.coverUrl"
              :src="seriesDetail.coverUrl"
              :preview-src-list="[seriesDetail.coverUrl]"
              :preview-teleported="true"
              style="width: 160px; height: 220px; object-fit: cover"
              fit="cover"
            />
            <el-avatar
              v-else
              :size="160"
              icon="Collection"
            />
          </div>
          <div class="series-info">
            <h2 class="series-name">{{ seriesDetail.name }}</h2>
            <div class="series-meta">
              <el-tag size="large" style="margin-right: 10px">
                {{ SERIES_TYPE_LABELS[seriesDetail.seriesType] }}
              </el-tag>
              <span class="meta-text">
                预期总册数：{{ seriesDetail.expectedTotalVolumes }} 册
              </span>
            </div>
            <p v-if="seriesDetail.description" class="series-desc">
              {{ seriesDetail.description }}
            </p>

            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value">{{ seriesDetail.stats?.collectedCount || 0 }}</div>
                <div class="stat-label">已收录</div>
              </div>
              <div class="stat-item">
                <div class="stat-value missing">{{ seriesDetail.stats?.missingCount || 0 }}</div>
                <div class="stat-label">缺册</div>
              </div>
              <div class="stat-item">
                <div class="stat-value pending">{{ seriesDetail.stats?.pendingPurchaseCount || 0 }}</div>
                <div class="stat-label">待采购</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ (seriesDetail.stats?.borrowRatio || 0).toFixed(1) }}%</div>
                <div class="stat-label">在借比例</div>
              </div>
            </div>

            <div class="completion-section">
              <div class="completion-header">
                <span>完成度</span>
                <span class="completion-text">
                  {{ seriesDetail.stats?.collectedCount || 0 }}/{{ seriesDetail.expectedTotalVolumes }}
                  ({{ (seriesDetail.stats?.completion || 0).toFixed(1) }}%)
                </span>
              </div>
              <el-progress
                :percentage="Math.round(seriesDetail.stats?.completion || 0)"
                :stroke-width="16"
              />
            </div>

            <div class="header-actions">
              <el-button
                v-if="userStore.isLibrarian"
                type="primary"
                :icon="Plus"
                @click="handleAddVolume"
              >
                添加卷册
              </el-button>
              <el-button
                v-if="userStore.isLibrarian"
                type="warning"
                :icon="Edit"
                @click="handleEditSeries"
              >
                编辑系列
              </el-button>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <el-tabs v-model="activeTab" style="margin-top: 20px">
      <el-tab-pane label="全部卷册" name="all">
        <el-card>
          <div class="tab-header">
            <span class="tab-title">按册序号排列</span>
          </div>
          <el-table
            :data="seriesDetail?.volumes || []"
            style="width: 100%; margin-top: 10px"
            border
            stripe
          >
            <el-table-column
              prop="volumeNumber"
              label="册序号"
              width="100"
              align="center"
            >
              <template #default="{ row }">
                <el-tag type="primary" effect="dark">
                  第{{ row.volumeNumber }}册
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="图书信息"
              min-width="200"
            >
              <template #default="{ row }">
                <div v-if="row.book" class="book-info">
                  <div class="book-title">{{ row.book.title }}</div>
                  <div class="book-meta">
                    <span>作者：{{ row.book.author }}</span>
                    <span>ISBN：{{ row.book.isbn }}</span>
                  </div>
                </div>
                <el-tag
                  v-else-if="row.isMissing"
                  type="danger"
                >
                  缺册
                </el-tag>
                <span v-else class="text-muted">未收录</span>
              </template>
            </el-table-column>
            <el-table-column
              label="状态"
              width="120"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  v-if="row.isMissing"
                  type="danger"
                >
                  缺册
                </el-tag>
                <el-tag
                  v-else-if="row.book"
                  type="success"
                >
                  已收录
                </el-tag>
                <el-tag v-else type="info">
                  待收录
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="采购状态"
              width="120"
              align="center"
            >
              <template #default="{ row }">
                <el-tag :type="PURCHASE_STATUS_TYPES[row.purchaseStatus]">
                  {{ PURCHASE_STATUS_LABELS[row.purchaseStatus] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="库存"
              width="100"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  v-if="row.book"
                  :type="row.book.stock > 0 ? 'success' : 'danger'"
                >
                  {{ row.book.stock }}
                </el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="280"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button
                  v-if="row.isMissing && row.purchaseStatus === 'NONE' && userStore.isLibrarian"
                  link
                  type="warning"
                  @click="handleRequestPurchase(row)"
                >
                  申请采购
                </el-button>
                <el-button
                  v-if="row.book && userStore.isLibrarian"
                  link
                  type="primary"
                  @click="handleEditVolume(row)"
                >
                  编辑
                </el-button>
                <el-button
                  v-if="!row.book && userStore.isLibrarian"
                  link
                  type="primary"
                  @click="handleLinkBook(row)"
                >
                  关联图书
                </el-button>
                <el-button
                  v-if="userStore.isAdmin"
                  link
                  type="danger"
                  @click="handleDeleteVolume(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="缺册清单" name="missing">
        <el-card>
          <div class="tab-header">
            <span class="tab-title">缺册列表 ({{ seriesDetail?.missingVolumes?.length || 0 }})</span>
          </div>
          <el-table
            :data="seriesDetail?.missingVolumes || []"
            style="width: 100%; margin-top: 10px"
            border
            stripe
            empty-text="暂无缺册"
          >
            <el-table-column
              prop="volumeNumber"
              label="册序号"
              width="120"
              align="center"
            >
              <template #default="{ row }">
                <el-tag type="danger" effect="dark">
                  第{{ row.volumeNumber }}册
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="采购状态"
              width="150"
              align="center"
            >
              <template #default="{ row }">
                <el-tag :type="PURCHASE_STATUS_TYPES[row.purchaseStatus]">
                  {{ PURCHASE_STATUS_LABELS[row.purchaseStatus] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="200"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button
                  v-if="row.purchaseStatus === 'NONE' && userStore.isLibrarian"
                  link
                  type="warning"
                  @click="handleRequestPurchase(row)"
                >
                  申请采购
                </el-button>
                <el-button
                  v-if="userStore.isLibrarian"
                  link
                  type="primary"
                  @click="handleLinkBook(row)"
                >
                  关联图书
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="待采购" name="purchase">
        <el-card>
          <div class="tab-header">
            <span class="tab-title">待采购列表 ({{ seriesDetail?.pendingPurchase?.length || 0 }})</span>
          </div>
          <el-table
            :data="seriesDetail?.pendingPurchase || []"
            style="width: 100%; margin-top: 10px"
            border
            stripe
            empty-text="暂无待采购"
          >
            <el-table-column
              prop="volumeNumber"
              label="册序号"
              width="120"
              align="center"
            >
              <template #default="{ row }">
                <el-tag type="warning" effect="dark">
                  第{{ row.volumeNumber }}册
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="采购状态"
              width="150"
              align="center"
            >
              <template #default="{ row }">
                <el-tag :type="PURCHASE_STATUS_TYPES[row.purchaseStatus]">
                  {{ PURCHASE_STATUS_LABELS[row.purchaseStatus] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="最新采购申请"
              min-width="200"
            >
              <template #default="{ row }">
                <div v-if="row.purchaseRequests && row.purchaseRequests.length > 0">
                  <div>申请人：{{ row.purchaseRequests[0]?.requestedBy?.username }}</div>
                  <div>申请时间：{{ formatDate(row.purchaseRequests[0]?.createdAt) }}</div>
                </div>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="volumeDialogVisible"
      :title="volumeDialogTitle"
      width="500px"
    >
      <el-form
        ref="volumeFormRef"
        :model="volumeForm"
        :rules="volumeRules"
        label-width="100px"
      >
        <el-form-item
          label="册序号"
          prop="volumeNumber"
        >
          <el-input-number
            v-model="volumeForm.volumeNumber"
            :min="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="关联图书"
          prop="bookId"
        >
          <el-select
            v-model="volumeForm.bookId"
            placeholder="请选择图书（可选）"
            style="width: 100%"
            filterable
            clearable
          >
            <el-option
              v-for="book in availableBooks"
              :key="book.id"
              :label="`${book.title} - ${book.author}`"
              :value="book.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="是否缺册"
          prop="isMissing"
        >
          <el-switch v-model="volumeForm.isMissing" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="volumeDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="volumeSubmitLoading"
          @click="submitVolumeForm"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="purchaseDialogVisible"
      title="采购申请"
      width="500px"
    >
      <el-form
        ref="purchaseFormRef"
        :model="purchaseForm"
        :rules="purchaseRules"
        label-width="100px"
      >
        <el-form-item label="系列">
          <el-input
            :value="seriesDetail?.name"
            disabled
          />
        </el-form-item>
        <el-form-item label="册序号">
          <el-input
            :value="`第${currentVolume?.volumeNumber}册`"
            disabled
          />
        </el-form-item>
        <el-form-item
          label="预估价格"
          prop="estimatedPrice"
        >
          <el-input-number
            v-model="purchaseForm.estimatedPrice"
            :min="0"
            :precision="2"
            :step="10"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="申请理由"
          prop="reason"
        >
          <el-input
            v-model="purchaseForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入采购理由"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="purchaseDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="purchaseSubmitLoading"
          @click="submitPurchaseForm"
        >
          提交申请
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="seriesDialogVisible"
      title="编辑系列"
      width="500px"
    >
      <el-form
        ref="seriesFormRef"
        :model="seriesForm"
        :rules="seriesRules"
        label-width="100px"
      >
        <el-form-item
          label="系列名称"
          prop="name"
        >
          <el-input v-model="seriesForm.name" />
        </el-form-item>
        <el-form-item
          label="系列类型"
          prop="seriesType"
        >
          <el-select
            v-model="seriesForm.seriesType"
            placeholder="请选择类型"
            style="width: 100%"
          >
            <el-option
              v-for="(label, key) in SERIES_TYPE_LABELS"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="预期总册数"
          prop="expectedTotalVolumes"
        >
          <el-input-number
            v-model="seriesForm.expectedTotalVolumes"
            :min="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="封面图片"
          prop="coverUrl"
        >
          <el-input
            v-model="seriesForm.coverUrl"
            placeholder="请输入封面图片URL"
          />
        </el-form-item>
        <el-form-item
          label="简介"
          prop="description"
        >
          <el-input
            v-model="seriesForm.description"
            type="textarea"
            :rows="4"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="seriesDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="seriesSubmitLoading"
          @click="submitSeriesForm"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Plus, Edit } from '@element-plus/icons-vue';
import api from '../api';
import { useUserStore } from '../store/user';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import type {
  SeriesDetail,
  SeriesVolume,
  Book,
  SeriesType,
} from '../types';
import {
  SERIES_TYPE_LABELS,
  PURCHASE_STATUS_LABELS,
  PURCHASE_STATUS_TYPES,
} from '../types';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const seriesDetail = ref<SeriesDetail | null>(null);
const loading = ref(false);
const activeTab = ref('all');
const availableBooks = ref<Book[]>([]);

const volumeDialogVisible = ref(false);
const volumeDialogTitle = ref('添加卷册');
const volumeSubmitLoading = ref(false);
const volumeFormRef = ref<FormInstance | null>(null);
const isVolumeEdit = ref(false);
const currentVolume = ref<SeriesVolume | null>(null);

const purchaseDialogVisible = ref(false);
const purchaseSubmitLoading = ref(false);
const purchaseFormRef = ref<FormInstance | null>(null);

const seriesDialogVisible = ref(false);
const seriesSubmitLoading = ref(false);
const seriesFormRef = ref<FormInstance | null>(null);

const volumeForm = reactive({
  id: undefined as number | undefined,
  volumeNumber: 1,
  bookId: undefined as number | undefined,
  isMissing: false,
});

const purchaseForm = reactive({
  reason: '',
  estimatedPrice: 0,
});

const seriesForm = reactive({
  id: undefined as number | undefined,
  name: '',
  seriesType: 'OTHER' as SeriesType,
  expectedTotalVolumes: 1,
  coverUrl: '',
  description: '',
});

const volumeRules = {
  volumeNumber: [{ required: true, message: '请输入册序号', trigger: 'blur' }],
};

const purchaseRules = {
  estimatedPrice: [{ required: true, message: '请输入预估价格', trigger: 'blur' }],
};

const seriesRules = {
  name: [{ required: true, message: '请输入系列名称', trigger: 'blur' }],
  seriesType: [{ required: true, message: '请选择系列类型', trigger: 'change' }],
  expectedTotalVolumes: [{ required: true, message: '请输入预期总册数', trigger: 'blur' }],
};

const fetchSeriesDetail = async () => {
  const id = Number(route.params.id);
  if (!id) return;

  loading.value = true;
  try {
    const res = await api.get(`/series/${id}`);
    seriesDetail.value = res as SeriesDetail;
  } finally {
    loading.value = false;
  }
};

const fetchAvailableBooks = async () => {
  try {
    const res = await api.get('/books');
    availableBooks.value = res as Book[];
  } catch (error) {
    console.error('Failed to fetch books:', error);
  }
};

const goBack = () => {
  router.push('/series');
};

const handleAddVolume = () => {
  isVolumeEdit.value = false;
  volumeDialogTitle.value = '添加卷册';
  Object.assign(volumeForm, {
    id: undefined,
    volumeNumber: (seriesDetail.value?.volumes?.length || 0) + 1,
    bookId: undefined,
    isMissing: false,
  });
  fetchAvailableBooks();
  volumeDialogVisible.value = true;
};

const handleEditVolume = (row: SeriesVolume) => {
  isVolumeEdit.value = true;
  volumeDialogTitle.value = '编辑卷册';
  currentVolume.value = row;
  Object.assign(volumeForm, {
    id: row.id,
    volumeNumber: row.volumeNumber,
    bookId: row.bookId,
    isMissing: row.isMissing,
  });
  fetchAvailableBooks();
  volumeDialogVisible.value = true;
};

const handleLinkBook = (row: SeriesVolume) => {
  isVolumeEdit.value = true;
  volumeDialogTitle.value = '关联图书';
  currentVolume.value = row;
  Object.assign(volumeForm, {
    id: row.id,
    volumeNumber: row.volumeNumber,
    bookId: row.bookId,
    isMissing: false,
  });
  fetchAvailableBooks();
  volumeDialogVisible.value = true;
};

const handleDeleteVolume = (row: SeriesVolume) => {
  ElMessageBox.confirm('确定要删除这个卷册吗？', '警告', { type: 'warning' }).then(async () => {
    const seriesId = Number(route.params.id);
    await api.delete(`/series/${seriesId}/volumes/${row.id}`);
    ElMessage.success('删除成功');
    fetchSeriesDetail();
  });
};

const handleRequestPurchase = (row: SeriesVolume) => {
  currentVolume.value = row;
  Object.assign(purchaseForm, {
    reason: '',
    estimatedPrice: 0,
  });
  purchaseDialogVisible.value = true;
};

const handleEditSeries = () => {
  if (!seriesDetail.value) return;
  Object.assign(seriesForm, {
    id: seriesDetail.value.id,
    name: seriesDetail.value.name,
    seriesType: seriesDetail.value.seriesType,
    expectedTotalVolumes: seriesDetail.value.expectedTotalVolumes,
    coverUrl: seriesDetail.value.coverUrl || '',
    description: seriesDetail.value.description || '',
  });
  seriesDialogVisible.value = true;
};

const submitVolumeForm = async () => {
  if (!volumeFormRef.value) return;
  await volumeFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      volumeSubmitLoading.value = true;
      try {
        const seriesId = Number(route.params.id);
        if (isVolumeEdit.value && volumeForm.id) {
          await api.put(`/series/${seriesId}/volumes/${volumeForm.id}`, volumeForm);
          ElMessage.success('更新成功');
        } else {
          await api.post(`/series/${seriesId}/volumes`, volumeForm);
          ElMessage.success('添加成功');
        }
        volumeDialogVisible.value = false;
        fetchSeriesDetail();
      } finally {
        volumeSubmitLoading.value = false;
      }
    }
  });
};

const submitPurchaseForm = async () => {
  if (!purchaseFormRef.value || !currentVolume.value) return;
  await purchaseFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      purchaseSubmitLoading.value = true;
      try {
        const seriesId = Number(route.params.id);
        await api.post(
          `/series/${seriesId}/volumes/${currentVolume.value.id}/purchase`,
          purchaseForm
        );
        ElMessage.success('采购申请已提交');
        purchaseDialogVisible.value = false;
        fetchSeriesDetail();
      } finally {
        purchaseSubmitLoading.value = false;
      }
    }
  });
};

const submitSeriesForm = async () => {
  if (!seriesFormRef.value || !seriesForm.id) return;
  await seriesFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      seriesSubmitLoading.value = true;
      try {
        await api.put(`/series/${seriesForm.id}`, seriesForm);
        ElMessage.success('更新成功');
        seriesDialogVisible.value = false;
        fetchSeriesDetail();
      } finally {
        seriesSubmitLoading.value = false;
      }
    }
  });
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN');
};

onMounted(() => {
  fetchSeriesDetail();
});
</script>

<style scoped lang="scss">
.series-header {
  display: flex;
  gap: 30px;
}

.series-cover {
  flex-shrink: 0;
}

.series-info {
  flex: 1;
}

.series-name {
  margin: 0 0 15px 0;
  font-size: 24px;
  font-weight: bold;
}

.series-meta {
  margin-bottom: 15px;

  .meta-text {
    color: #909399;
    font-size: 14px;
  }
}

.series-desc {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;

  .stat-value {
    font-size: 28px;
    font-weight: bold;
    color: #409eff;
    margin-bottom: 5px;

    &.missing {
      color: #f56c6c;
    }

    &.pending {
      color: #e6a23c;
    }
  }

  .stat-label {
    font-size: 14px;
    color: #909399;
  }
}

.completion-section {
  margin-bottom: 20px;
}

.completion-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-weight: bold;

  .completion-text {
    color: #409eff;
  }
}

.header-actions {
  display: flex;
  gap: 10px;
}

.tab-header {
  margin-bottom: 10px;

  .tab-title {
    font-size: 16px;
    font-weight: bold;
  }
}

.book-info {
  .book-title {
    font-weight: bold;
    margin-bottom: 5px;
  }

  .book-meta {
    font-size: 12px;
    color: #909399;
    display: flex;
    gap: 15px;
  }
}

.text-muted {
  color: #909399;
}
</style>
