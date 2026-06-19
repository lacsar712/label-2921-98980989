<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="handleVisibleChange"
    title="撰写消息"
    width="720px"
    @close="handleClose"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="消息模板" prop="templateId">
        <el-select
          v-model="form.templateId"
          placeholder="选择模板（可选）"
          clearable
          style="width: 100%"
          @change="handleTemplateChange"
        >
          <el-option
            v-for="tpl in messageStore.templates"
            :key="tpl.id"
            :label="tpl.name"
            :value="tpl.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="发送对象" prop="targetType">
        <el-radio-group v-model="form.targetType" @change="handleTargetTypeChange">
          <el-radio value="ALL_USERS">全体人员</el-radio>
          <el-radio value="ALL_ADMINS">全体管理员</el-radio>
          <el-radio value="ALL_LIBRARIANS">全体馆员</el-radio>
          <el-radio value="ROLE">指定角色</el-radio>
          <el-radio value="USER">指定用户</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item
        v-if="form.targetType === 'ROLE'"
        label="目标角色"
        prop="targetRole"
      >
        <el-select
          v-model="form.targetRole"
          placeholder="请选择角色"
          style="width: 240px"
        >
          <el-option label="管理员" value="ADMIN" />
          <el-option label="图书管理员" value="LIBRARIAN" />
        </el-select>
      </el-form-item>

      <el-form-item
        v-if="form.targetType === 'USER'"
        label="目标用户"
        prop="targetUserIds"
      >
        <el-select
          v-model="form.targetUserIds"
          multiple
          filterable
          placeholder="请选择用户"
          style="width: 100%"
        >
          <el-option
            v-for="user in systemUsers"
            :key="user.id"
            :label="`${user.username} (${user.role === 'ADMIN' ? '管理员' : '馆员'})`"
            :value="user.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="消息类型" prop="type">
        <el-select v-model="form.type" style="width: 240px">
          <el-option
            v-for="(label, value) in MESSAGE_TYPE_LABELS"
            :key="value"
            :label="label"
            :value="value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="紧急程度" prop="priority">
        <el-radio-group v-model="form.priority">
          <el-radio
            v-for="(label, value) in PRIORITY_LABELS"
            :key="value"
            :value="value"
          >
            <el-tag :type="PRIORITY_TAGS[value as PriorityLevel]" size="small" effect="light">
              {{ label }}
            </el-tag>
          </el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="消息标题" prop="title">
        <el-input
          v-model="form.title"
          placeholder="请输入消息标题"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="消息内容" prop="content">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="8"
          placeholder="请输入消息内容"
          maxlength="2000"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">
        取消
      </el-button>
      <el-button
        type="primary"
        :loading="submitting"
        @click="handleSubmit"
      >
        发送消息
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { useMessageStore } from '../store/message';
import api from '../api';
import {
  MESSAGE_TYPE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_TAGS,
} from '../types';
import type {
  MessageType,
  PriorityLevel,
  TargetType,
  CreateMessageRequest,
} from '../types';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'success'): void;
}>();

const messageStore = useMessageStore();
const formRef = ref<FormInstance>();
const submitting = ref(false);
const systemUsers = ref<any[]>([]);

const form = reactive<CreateMessageRequest & { templateId?: number }>({
  title: '',
  content: '',
  type: 'SYSTEM',
  priority: 'MEDIUM',
  targetType: 'ALL_USERS',
  targetRole: undefined,
  targetUserIds: [],
  templateId: undefined,
});

const rules: FormRules = {
  targetType: [
    { required: true, message: '请选择发送对象', trigger: 'change' },
  ],
  targetRole: [
    {
      required: () => form.targetType === 'ROLE',
      message: '请选择目标角色',
      trigger: 'change',
    },
  ],
  targetUserIds: [
    {
      required: () => form.targetType === 'USER',
      validator: (_r, value, callback) => {
        if (form.targetType === 'USER' && (!value || value.length === 0)) {
          callback(new Error('请选择目标用户'));
        } else {
          callback();
        }
      },
      trigger: 'change',
    },
  ],
  type: [{ required: true, message: '请选择消息类型', trigger: 'change' }],
  priority: [
    { required: true, message: '请选择紧急程度', trigger: 'change' },
  ],
  title: [
    { required: true, message: '请输入消息标题', trigger: 'blur' },
    { min: 2, max: 100, message: '标题长度在 2 到 100 个字符', trigger: 'blur' },
  ],
  content: [
    { required: true, message: '请输入消息内容', trigger: 'blur' },
    { min: 5, max: 2000, message: '内容长度在 5 到 2000 个字符', trigger: 'blur' },
  ],
};

const handleVisibleChange = (value: boolean) => {
  emit('update:modelValue', value);
};

const handleTargetTypeChange = () => {
  if (form.targetType !== 'ROLE') {
    form.targetRole = undefined;
  }
  if (form.targetType !== 'USER') {
    form.targetUserIds = [];
  }
};

const handleTemplateChange = (templateId: number) => {
  const tpl = messageStore.templates.find((t) => t.id === templateId);
  if (tpl) {
    form.title = tpl.title;
    form.content = tpl.content;
    form.type = tpl.type as MessageType;
    form.priority = tpl.priority as PriorityLevel;
  }
};

const resetForm = () => {
  form.title = '';
  form.content = '';
  form.type = 'SYSTEM';
  form.priority = 'MEDIUM';
  form.targetType = 'ALL_USERS';
  form.targetRole = undefined;
  form.targetUserIds = [];
  form.templateId = undefined;
  formRef.value?.resetFields();
};

const handleClose = () => {
  resetForm();
  emit('update:modelValue', false);
};

const loadSystemUsers = async () => {
  try {
    const users: any = await api.get('/users');
    systemUsers.value = users;
  } catch (_) {}
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    submitting.value = true;
    try {
      const payload: CreateMessageRequest = {
        title: form.title,
        content: form.content,
        type: form.type,
        priority: form.priority,
        targetType: form.targetType as TargetType,
      };

      if (form.targetType === 'ROLE' && form.targetRole) {
        payload.targetRole = form.targetRole;
      }
      if (form.targetType === 'USER' && form.targetUserIds?.length) {
        payload.targetUserIds = form.targetUserIds;
      }
      if (form.templateId) {
        (payload as any).templateId = form.templateId;
      }

      await messageStore.sendMessage(payload);
      ElMessage.success('消息发送成功');
      emit('success');
      handleClose();
    } catch (_) {
      ElMessage.error('消息发送失败');
    } finally {
      submitting.value = false;
    }
  });
};

watch(
  () => props.modelValue,
  async (val) => {
    if (val) {
      if (messageStore.templates.length === 0) {
        await messageStore.fetchTemplates();
      }
      if (systemUsers.value.length === 0) {
        await loadSystemUsers();
      }
    }
  }
);

onMounted(async () => {
  if (messageStore.templates.length === 0) {
    await messageStore.fetchTemplates();
  }
  if (systemUsers.value.length === 0) {
    await loadSystemUsers();
  }
});
</script>

<style scoped lang="scss">
</style>
