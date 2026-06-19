<template>
  <div class="purchase-requests-container">
    <el-card shadow="hover">
      <div class="header-actions">
        <el-input
          v-model="search"
          placeholder="搜索系列名称"
          style="width: 300px"
          clearable
          @clear="fetchRequests"
          @keyup.enter="fetchRequests"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <div class="right">
          <el-select
            v-model="filterStatus"
            placeholder="全部状态"
            clearable
            style="width: 150px; margin-right: 10px"
            @change="fetchRequests"
          >
            <el-option
              v-for="(label, key) in PURCHASE_STATUS_LABELS"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="filteredRequests"
        style="width: 100%; margin-top: 20px"
        border
        stripe
      >
        <el-table-column
          label="系列名称"
          min-width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-link
              type="primary"
              @click="goToSeries(row.seriesId)"
            >
              {{ row.series?.name }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column
          label="册序号"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <el-tag type="primary" effect="dark">
              第{{ row.volume?.volumeNumber }}册
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="申请人"
          width="120"
        >
          <template #default="{ row }">
            {{ row.requestedBy?.username }}
          </template>
        </el-table-column>
        <el-table-column
          label="预估价格"
          width="120"
        >
          <template #default="{ row }">
            ¥{{ row.estimatedPrice?.toFixed(2) || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <el-tag :type="PURCHASE_STATUS_TYPES[row.status]">
              {{ PURCHASE_STATUS_LABELS[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="审核人"
          width="120"
        >
          <template #default="{ row }">
            {{ row.reviewedBy?.username || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="申请时间"
          width="180"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="审核时间"
          width="180"
        >
          <template #default="{ row }">
            {{ row.reviewedAt ? formatDate(row.reviewedAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="200"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              v-if="userStore.isAdmin && row.status === 'PENDING'"
              link
              type="primary"
              @click="handleReview(row)"
            >
              审核
            </el-button>
            <el-button
              link
              type="primary"
              @click="handleViewDetail(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="reviewDialogVisible"
      title="审核采购申请"
      width="500px"
    >
      <el-form
        ref="reviewFormRef"
        :model="reviewForm"
        :rules="reviewRules"
        label-width="100px"
      >
        <el-form-item label="系列">
          <el-input
            :value="currentRequest?.series?.name"
            disabled
          />
        </el-form-item>
        <el-form-item label="册序号">
          <el-input
            :value="`第${currentRequest?.volume?.volumeNumber}册`"
            disabled
          />
        </el-form-item>
        <el-form-item label="申请人">
          <el-input
            :value="currentRequest?.requestedBy?.username"
            disabled
          />
        </el-form-item>
        <el-form-item label="预估价格">
          <el-input
            :value="`¥${currentRequest?.estimatedPrice?.toFixed(2)}`"
            disabled
          />
        </el-form-item>
        <el-form-item label="申请理由">
          <el-input
            :value="currentRequest?.reason || '无'"
            type="textarea"
            :rows="3"
            disabled
          />
        </el-form-item>
        <el-form-item
          label="审核结果"
          prop="status"
        >
          <el-radio-group v-model="reviewForm.status">
            <el-radio value="APPROVED">批准</el-radio>
            <el-radio value="REJECTED">拒绝</el-radio>
            <el-radio value="PURCHASED">已采购</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          label="审核备注"
          prop="reviewNote"
        >
          <el-input
            v-model="reviewForm.reviewNote"
            type="textarea"
            :rows="3"
            placeholder="请输入审核备注（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="reviewSubmitLoading"
          @click="submitReview"
        >
          确认审核
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="detailDialogVisible"
      title="采购申请详情"
      width="500px"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="系列名称">
          {{ currentRequest?.series?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="册序号">
          第{{ currentRequest?.volume?.volumeNumber }}册
        </el-descriptions-item>
        <el-descriptions-item label="申请人">
          {{ currentRequest?.requestedBy?.username }}
        </el-descriptions-item>
        <el-descriptions-item label="预估价格">
          ¥{{ currentRequest?.estimatedPrice?.toFixed(2) || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="申请理由">
          {{ currentRequest?.reason || '无' }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="PURCHASE_STATUS_TYPES[currentRequest?.status || 'NONE']">
            {{ PURCHASE_STATUS_LABELS[currentRequest?.status || 'NONE'] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="审核人">
          {{ currentRequest?.reviewedBy?.username || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">
          {{ formatDate(currentRequest?.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="审核时间">
          {{ currentRequest?.reviewedAt ? formatDate(currentRequest?.reviewedAt) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="采购时间">
          {{ currentRequest?.purchasedAt ? formatDate(currentRequest?.purchasedAt) : '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { Search } from '@element-plus/icons-vue';
import api from '../api';
import { useUserStore } from '../store/user';
import { ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';
import type { PurchaseRequest, PurchaseStatus } from '../types';
import { PURCHASE_STATUS_LABELS, PURCHASE_STATUS_TYPES } from '../types';

const router = useRouter();
const userStore = useUserStore();
const requests = ref<PurchaseRequest[]>([]);
const loading = ref(false);
const search = ref('');
const filterStatus = ref<PurchaseStatus | ''>('');

const reviewDialogVisible = ref(false);
const detailDialogVisible = ref(false);
const reviewSubmitLoading = ref(false);
const reviewFormRef = ref<FormInstance | null>(null);
const currentRequest = ref<PurchaseRequest | null>(null);

const reviewForm = reactive({
  status: 'APPROVED' as 'APPROVED' | 'REJECTED' | 'PURCHASED',
  reviewNote: '',
});

const reviewRules = {
  status: [{ required: true, message: '请选择审核结果', trigger: 'change' }],
};

const filteredRequests = computed(() => {
  return requests.value.filter((r) => {
    const matchSearch = !search.value ||
      r.series?.name?.includes(search.value);
    const matchStatus = !filterStatus.value || r.status === filterStatus.value;
    return matchSearch && matchStatus;
  });
});

const fetchRequests = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (filterStatus.value) params.status = filterStatus.value;
    const res = await api.get('/series/purchase-requests', { params });
    requests.value = res as PurchaseRequest[];
  } finally {
    loading.value = false;
  }
};

const goToSeries = (id: number) => {
  router.push(`/series/${id}`);
};

const handleReview = (row: PurchaseRequest) => {
  currentRequest.value = row;
  Object.assign(reviewForm, {
    status: 'APPROVED' as const,
    reviewNote: '',
  });
  reviewDialogVisible.value = true;
};

const handleViewDetail = (row: PurchaseRequest) => {
  currentRequest.value = row;
  detailDialogVisible.value = true;
};

const submitReview = async () => {
  if (!reviewFormRef.value || !currentRequest.value) return;
  await reviewFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      reviewSubmitLoading.value = true;
      try {
        await api.put(
          `/series/purchase-requests/${currentRequest.value.id}/review`,
          reviewForm
        );
        ElMessage.success('审核成功');
        reviewDialogVisible.value = false;
        fetchRequests();
      } finally {
        reviewSubmitLoading.value = false;
      }
    }
  });
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

onMounted(() => {
  fetchRequests();
});
</script>

<style scoped lang="scss">
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
