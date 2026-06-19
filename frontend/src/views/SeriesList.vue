<template>
  <div class="series-container">
    <el-card shadow="hover">
      <div class="header-actions">
        <el-input
          v-model="search"
          placeholder="搜索系列名称"
          style="width: 300px"
          clearable
          @clear="fetchSeries"
          @keyup.enter="fetchSeries"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <div class="right">
          <el-select
            v-model="filterType"
            placeholder="全部类型"
            clearable
            style="width: 150px; margin-right: 10px"
            @change="fetchSeries"
          >
            <el-option
              v-for="(label, key) in SERIES_TYPE_LABELS"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
          <el-button
            v-if="userStore.isLibrarian"
            type="primary"
            :icon="Plus"
            @click="handleAdd"
          >
            添加系列
          </el-button>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="seriesList"
        style="width: 100%; margin-top: 20px"
        border
        stripe
      >
        <el-table-column
          label="封面"
          width="100"
        >
          <template #default="{ row }">
            <el-image
              v-if="row.coverUrl"
              :src="row.coverUrl"
              :preview-src-list="[row.coverUrl]"
              :preview-teleported="true"
              style="width: 60px; height: 80px; object-fit: cover"
              fit="cover"
            />
            <el-avatar
              v-else
              :size="60"
              icon="Collection"
            />
          </template>
        </el-table-column>
        <el-table-column
          prop="name"
          label="系列名称"
          min-width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-link
              type="primary"
              @click="goToDetail(row.id)"
            >
              {{ row.name }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column
          label="系列类型"
          width="120"
        >
          <template #default="{ row }">
            <el-tag>{{ SERIES_TYPE_LABELS[row.seriesType] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="完成度"
          width="200"
        >
          <template #default="{ row }">
            <div class="progress-wrapper">
              <el-progress
                :percentage="Math.round(row.completion || 0)"
                :stroke-width="10"
              />
              <span class="progress-text">
                {{ row.collectedCount || 0 }}/{{ row.expectedTotalVolumes }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="已收录册数"
          width="120"
        >
          <template #default="{ row }">
            <el-tag type="success">{{ row.collectedCount || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="缺册数"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              v-if="row.missingCount > 0"
              type="danger"
            >
              {{ row.missingCount }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column
          label="在借比例"
          width="120"
        >
          <template #default="{ row }">
            <el-tag
              v-if="row.borrowRatio && row.borrowRatio > 0"
              type="warning"
            >
              {{ row.borrowRatio.toFixed(1) }}%
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column
          label="创建时间"
          width="180"
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
              @click="goToDetail(row.id)"
            >
              详情
            </el-button>
            <el-button
              v-if="userStore.isLibrarian"
              link
              type="primary"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="userStore.isAdmin"
              link
              type="danger"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item
          label="系列名称"
          prop="name"
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item
          label="系列类型"
          prop="seriesType"
        >
          <el-select
            v-model="form.seriesType"
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
            v-model="form.expectedTotalVolumes"
            :min="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="封面图片"
          prop="coverUrl"
        >
          <el-input
            v-model="form.coverUrl"
            placeholder="请输入封面图片URL"
          />
        </el-form-item>
        <el-form-item
          label="简介"
          prop="description"
        >
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="submitForm"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { Search, Plus } from '@element-plus/icons-vue';
import api from '../api';
import { useUserStore } from '../store/user';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import type { BookSeries, SeriesType } from '../types';
import { SERIES_TYPE_LABELS } from '../types';

const router = useRouter();
const userStore = useUserStore();
const seriesList = ref<BookSeries[]>([]);
const loading = ref(false);
const search = ref('');
const filterType = ref<SeriesType | ''>('');

const dialogVisible = ref(false);
const dialogTitle = ref('添加系列');
const submitLoading = ref(false);
const formRef = ref<FormInstance | null>(null);
const isEdit = ref(false);

const form = reactive({
  id: undefined as number | undefined,
  name: '',
  seriesType: 'OTHER' as SeriesType,
  expectedTotalVolumes: 1,
  coverUrl: '',
  description: '',
});

const rules = {
  name: [{ required: true, message: '请输入系列名称', trigger: 'blur' }],
  seriesType: [{ required: true, message: '请选择系列类型', trigger: 'change' }],
  expectedTotalVolumes: [{ required: true, message: '请输入预期总册数', trigger: 'blur' }],
};

const fetchSeries = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (search.value) params.search = search.value;
    if (filterType.value) params.seriesType = filterType.value;
    const res = await api.get('/series', { params });
    seriesList.value = res as BookSeries[];
  } finally {
    loading.value = false;
  }
};

const goToDetail = (id: number) => {
  router.push(`/series/${id}`);
};

const handleAdd = () => {
  isEdit.value = false;
  dialogTitle.value = '添加系列';
  Object.assign(form, {
    id: undefined,
    name: '',
    seriesType: 'OTHER',
    expectedTotalVolumes: 1,
    coverUrl: '',
    description: '',
  });
  dialogVisible.value = true;
};

const handleEdit = (row: BookSeries) => {
  isEdit.value = true;
  dialogTitle.value = '编辑系列';
  Object.assign(form, {
    id: row.id,
    name: row.name,
    seriesType: row.seriesType,
    expectedTotalVolumes: row.expectedTotalVolumes,
    coverUrl: row.coverUrl || '',
    description: row.description || '',
  });
  dialogVisible.value = true;
};

const handleDelete = (row: BookSeries) => {
  ElMessageBox.confirm('确定要删除这个系列吗？', '警告', { type: 'warning' }).then(async () => {
    await api.delete(`/series/${row.id}`);
    ElMessage.success('删除成功');
    fetchSeries();
  });
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitLoading.value = true;
      try {
        if (isEdit.value && form.id) {
          await api.put(`/series/${form.id}`, form);
          ElMessage.success('更新成功');
        } else {
          await api.post('/series', form);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        fetchSeries();
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN');
};

onMounted(() => {
  fetchSeries();
});
</script>

<style scoped lang="scss">
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;

  .progress-text {
    font-size: 12px;
    color: #909399;
    min-width: 50px;
  }
}
</style>
