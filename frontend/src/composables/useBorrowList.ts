import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';

export interface UseBorrowListOptions {
  fetchEndpoint: string;
  searchFields?: string[];
  confirmReturn?: boolean;
  extraFilter?: (item: any) => boolean;
}

const DEFAULT_SEARCH_FIELDS = ['book.title', 'borrower.name'];

const getNestedValue = (obj: any, path: string): string => {
  return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? '';
};

export function useBorrowList(options: UseBorrowListOptions) {
  const {
    fetchEndpoint,
    searchFields = DEFAULT_SEARCH_FIELDS,
    confirmReturn = false,
    extraFilter
  } = options;

  const borrows = ref<any[]>([]);
  const loading = ref(false);
  const searchQuery = ref('');

  const filteredBorrows = computed(() => {
    let result = borrows.value;

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) =>
          getNestedValue(item, field).toLowerCase().includes(query)
        )
      );
    }

    if (extraFilter) {
      result = result.filter(extraFilter);
    }

    return result;
  });

  const fetchBorrows = async () => {
    loading.value = true;
    try {
      const res: any = await api.get(fetchEndpoint);
      borrows.value = res;
    } finally {
      loading.value = false;
    }
  };

  const handleReturn = async (row: any) => {
    try {
      if (confirmReturn) {
        await ElMessageBox.confirm(
          `确定要归还《${row.book.title}》吗？`,
          '确认归还',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );
      }

      await api.post(`/borrows/${row.id}/return`);
      ElMessage.success('归还成功');
      fetchBorrows();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('归还失败');
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
      minute: '2-digit'
    });
  };

  onMounted(fetchBorrows);

  return {
    borrows,
    loading,
    searchQuery,
    filteredBorrows,
    fetchBorrows,
    handleReturn,
    formatDate
  };
}
