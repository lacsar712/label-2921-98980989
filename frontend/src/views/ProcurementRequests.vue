<template>
  <div class="procurement-requests-container">
    <el-card shadow="hover">
      <template #header>
        <div class="header-actions">
          <h3>新书采购申请</h3>
          <div class="toolbar">
            <el-input
              v-model="filterKeyword"
              placeholder="搜索申请单号、主题、申请人"
              :prefix-icon="Search"
              clearable
              style="width: 240px; margin-right: 12px"
              @clear="fetchRequests"
              @keyup.enter="fetchRequests"
            />
            <el-select
              v-model="filterStatus"
              placeholder="全部状态"
              clearable
              style="width: 140px; margin-right: 12px"
              @change="fetchRequests"
            >
              <el-option
                v-for="(label, key) in PROC_REQ_STATUS_LABELS"
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
              新建申请
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="filteredRequests"
        style="width: 100%"
        border
        stripe
        :default-sort="{ prop: 'createdAt', order: 'descending' }"
      >
        <el-table-column
          prop="requestNo"
          label="申请单号"
          width="160"
        >
          <template #default="{ row }">
            <el-text type="primary" style="font-weight: 500">
              {{ row.requestNo }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column
          prop="subject"
          label="主题"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="fundSubject"
          label="经费科目"
          width="140"
        />
        <el-table-column
          label="申请人"
          width="110"
        >
          <template #default="{ row }">
            {{ row.requestedBy?.username || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="申请时间"
          width="160"
          sortable
          prop="createdAt"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="PROC_REQ_STATUS_TAGS[row.status]"
              size="small"
            >
              {{ PROC_REQ_STATUS_LABELS[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="书目数量"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            <el-tag type="info" effect="plain">
              {{ row.items?.length || 0 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="280"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              @click="showDetailDialog(row)"
            >
              查看
            </el-button>
            <el-button
              v-if="canEditOrDelete(row)"
              link
              type="warning"
              size="small"
              @click="showEditDialog(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="canEditOrDelete(row)"
              link
              type="danger"
              size="small"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
            <el-button
              v-if="userStore.isAdmin && row.status === 'PENDING'"
              link
              type="success"
              size="small"
              @click="showApprovalDialog(row)"
            >
              审批
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div
        v-if="!loading && requests.length === 0"
        class="empty-state"
      >
        <el-empty description="暂无采购申请" />
      </div>
    </el-card>

    <el-dialog
      v-model="createDialogVisible"
      title="新建采购申请"
      width="900px"
      destroy-on-close
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item
          label="主题"
          prop="subject"
        >
          <el-input
            v-model="createForm.subject"
            placeholder="请输入申请主题"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item
          label="申请理由"
          prop="reason"
        >
          <el-input
            v-model="createForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入申请理由"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item
          label="经费科目"
          prop="fundSubject"
        >
          <el-input
            v-model="createForm.fundSubject"
            placeholder="请输入经费科目，如：图书采购专项、学术资源建设等"
          />
        </el-form-item>

        <el-divider content-position="left">书目清单</el-divider>

        <div class="items-table-wrapper">
          <el-table
            :data="createForm.items"
            border
            style="width: 100%"
          >
            <el-table-column
              label="序号"
              width="60"
              align="center"
            >
              <template #default="{ $index }">
                {{ $index + 1 }}
              </template>
            </el-table-column>
            <el-table-column label="书名" min-width="160">
              <template #default="{ row }">
                <el-form-item
                  :prop="`items[${createForm.items.indexOf(row)}].title`"
                  :rules="itemRules.title"
                  style="margin-bottom: 0"
                >
                  <el-input
                    v-model="row.title"
                    placeholder="书名"
                  />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="作者" width="120">
              <template #default="{ row }">
                <el-form-item
                  :prop="`items[${createForm.items.indexOf(row)}].author`"
                  :rules="itemRules.author"
                  style="margin-bottom: 0"
                >
                  <el-input
                    v-model="row.author"
                    placeholder="作者"
                  />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="ISBN" width="140">
              <template #default="{ row }">
                <el-form-item
                  :prop="`items[${createForm.items.indexOf(row)}].isbn`"
                  :rules="itemRules.isbn"
                  style="margin-bottom: 0"
                >
                  <el-input
                    v-model="row.isbn"
                    placeholder="ISBN"
                  />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="出版社" width="130">
              <template #default="{ row }">
                <el-form-item
                  :prop="`items[${createForm.items.indexOf(row)}].publisher`"
                  :rules="itemRules.publisher"
                  style="margin-bottom: 0"
                >
                  <el-input
                    v-model="row.publisher"
                    placeholder="出版社"
                  />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="申请册数" width="100">
              <template #default="{ row }">
                <el-form-item
                  :prop="`items[${createForm.items.indexOf(row)}].requestedQty`"
                  :rules="itemRules.requestedQty"
                  style="margin-bottom: 0"
                >
                  <el-input-number
                    v-model="row.requestedQty"
                    :min="1"
                    :max="999"
                    controls-position="right"
                    style="width: 100%"
                  />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="预估单价" width="120">
              <template #default="{ row }">
                <el-form-item
                  :prop="`items[${createForm.items.indexOf(row)}].estimatedPrice`"
                  :rules="itemRules.estimatedPrice"
                  style="margin-bottom: 0"
                >
                  <el-input-number
                    v-model="row.estimatedPrice"
                    :min="0"
                    :precision="2"
                    :step="10"
                    controls-position="right"
                    style="width: 100%"
                  />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="优先级" width="100">
              <template #default="{ row }">
                <el-form-item
                  :prop="`items[${createForm.items.indexOf(row)}].priority`"
                  :rules="itemRules.priority"
                  style="margin-bottom: 0"
                >
                  <el-select
                    v-model="row.priority"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="(label, key) in PROCUREMENT_PRIORITY_LABELS"
                      :key="key"
                      :label="label"
                      :value="key"
                    />
                  </el-select>
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="70"
              align="center"
            >
              <template #default="{ $index }">
                <el-button
                  link
                  type="danger"
                  size="small"
                  :disabled="createForm.items.length <= 1"
                  @click="removeCreateItem($index)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="items-actions">
            <el-button
              type="primary"
              plain
              @click="addCreateItem"
            >
              <el-icon><Plus /></el-icon>
              添加书目
            </el-button>
            <el-text type="info" size="small">
              共 {{ createForm.items.length }} 条，预估总金额：¥{{ createTotalAmount.toFixed(2) }}
            </el-text>
          </div>
        </div>
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
          提交申请
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editDialogVisible"
      title="编辑采购申请"
      width="900px"
      destroy-on-close
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="申请单号">
          <el-input
            :value="editForm.requestNo"
            disabled
          />
        </el-form-item>
        <el-form-item
          label="主题"
          prop="subject"
        >
          <el-input
            v-model="editForm.subject"
            placeholder="请输入申请主题"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item
          label="申请理由"
          prop="reason"
        >
          <el-input
            v-model="editForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入申请理由"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item
          label="经费科目"
          prop="fundSubject"
        >
          <el-input
            v-model="editForm.fundSubject"
            placeholder="请输入经费科目"
          />
        </el-form-item>

        <el-divider content-position="left">书目清单</el-divider>

        <div class="items-table-wrapper">
          <el-table
            :data="editForm.items"
            border
            style="width: 100%"
          >
            <el-table-column
              label="序号"
              width="60"
              align="center"
            >
              <template #default="{ $index }">
                {{ $index + 1 }}
              </template>
            </el-table-column>
            <el-table-column label="书名" min-width="160">
              <template #default="{ row }">
                <el-form-item
                  :prop="`items[${editForm.items.indexOf(row)}].title`"
                  :rules="itemRules.title"
                  style="margin-bottom: 0"
                >
                  <el-input
                    v-model="row.title"
                    placeholder="书名"
                  />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="作者" width="120">
              <template #default="{ row }">
                <el-form-item
                  :prop="`items[${editForm.items.indexOf(row)}].author`"
                  :rules="itemRules.author"
                  style="margin-bottom: 0"
                >
                  <el-input
                    v-model="row.author"
                    placeholder="作者"
                  />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="ISBN" width="140">
              <template #default="{ row }">
                <el-form-item
                  :prop="`items[${editForm.items.indexOf(row)}].isbn`"
                  :rules="itemRules.isbn"
                  style="margin-bottom: 0"
                >
                  <el-input
                    v-model="row.isbn"
                    placeholder="ISBN"
                  />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="出版社" width="130">
              <template #default="{ row }">
                <el-form-item
                  :prop="`items[${editForm.items.indexOf(row)}].publisher`"
                  :rules="itemRules.publisher"
                  style="margin-bottom: 0"
                >
                  <el-input
                    v-model="row.publisher"
                    placeholder="出版社"
                  />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="申请册数" width="100">
              <template #default="{ row }">
                <el-form-item
                  :prop="`items[${editForm.items.indexOf(row)}].requestedQty`"
                  :rules="itemRules.requestedQty"
                  style="margin-bottom: 0"
                >
                  <el-input-number
                    v-model="row.requestedQty"
                    :min="1"
                    :max="999"
                    controls-position="right"
                    style="width: 100%"
                  />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="预估单价" width="120">
              <template #default="{ row }">
                <el-form-item
                  :prop="`items[${editForm.items.indexOf(row)}].estimatedPrice`"
                  :rules="itemRules.estimatedPrice"
                  style="margin-bottom: 0"
                >
                  <el-input-number
                    v-model="row.estimatedPrice"
                    :min="0"
                    :precision="2"
                    :step="10"
                    controls-position="right"
                    style="width: 100%"
                  />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="优先级" width="100">
              <template #default="{ row }">
                <el-form-item
                  :prop="`items[${editForm.items.indexOf(row)}].priority`"
                  :rules="itemRules.priority"
                  style="margin-bottom: 0"
                >
                  <el-select
                    v-model="row.priority"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="(label, key) in PROCUREMENT_PRIORITY_LABELS"
                      :key="key"
                      :label="label"
                      :value="key"
                    />
                  </el-select>
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="70"
              align="center"
            >
              <template #default="{ $index }">
                <el-button
                  link
                  type="danger"
                  size="small"
                  :disabled="editForm.items.length <= 1"
                  @click="removeEditItem($index)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="items-actions">
            <el-button
              type="primary"
              plain
              @click="addEditItem"
            >
              <el-icon><Plus /></el-icon>
              添加书目
            </el-button>
            <el-text type="info" size="small">
              共 {{ editForm.items.length }} 条，预估总金额：¥{{ editTotalAmount.toFixed(2) }}
            </el-text>
          </div>
        </div>
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
          保存修改
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="detailDialogVisible"
      title="采购申请详情"
      width="900px"
    >
      <div v-if="currentRequest">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请单号">
            <el-text type="primary" style="font-weight: 500">
              {{ currentRequest.requestNo }}
            </el-text>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="PROC_REQ_STATUS_TAGS[currentRequest.status]">
              {{ PROC_REQ_STATUS_LABELS[currentRequest.status] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="主题" :span="2">
            {{ currentRequest.subject }}
          </el-descriptions-item>
          <el-descriptions-item label="申请人">
            {{ currentRequest.requestedBy?.username || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="经费科目">
            {{ currentRequest.fundSubject }}
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">
            {{ formatDate(currentRequest.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDate(currentRequest.updatedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="申请理由" :span="2">
            {{ currentRequest.reason || '无' }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="currentRequest.status !== 'PENDING'"
            label="审批人"
          >
            {{ currentRequest.reviewedBy?.username || '-' }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="currentRequest.status !== 'PENDING'"
            label="审批时间"
          >
            {{ currentRequest.reviewedAt ? formatDate(currentRequest.reviewedAt) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="currentRequest.reviewNote"
            label="审批备注"
            :span="2"
          >
            {{ currentRequest.reviewNote }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">书目清单</el-divider>

        <el-table
          :data="currentRequest.items"
          border
          style="width: 100%; margin-bottom: 20px"
        >
          <el-table-column
            label="序号"
            width="60"
            align="center"
          >
            <template #default="{ $index }">
              {{ $index + 1 }}
            </template>
          </el-table-column>
          <el-table-column
            prop="title"
            label="书名"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column
            prop="author"
            label="作者"
            width="100"
          />
          <el-table-column
            prop="isbn"
            label="ISBN"
            width="140"
          />
          <el-table-column
            prop="publisher"
            label="出版社"
            width="120"
          />
          <el-table-column
            label="申请册数"
            width="90"
            align="center"
          >
            <template #default="{ row }">
              {{ row.requestedQty }}
            </template>
          </el-table-column>
          <el-table-column
            v-if="currentRequest.status !== 'PENDING'"
            label="批准册数"
            width="90"
            align="center"
          >
            <template #default="{ row }">
              <span :style="{ color: (row.approvedQty ?? row.requestedQty) < row.requestedQty ? '#e6a23c' : '' }">
                {{ row.approvedQty ?? row.requestedQty }}
              </span>
            </template>
          </el-table-column>
          <el-table-column
            label="预估单价"
            width="100"
            align="right"
          >
            <template #default="{ row }">
              ¥{{ row.estimatedPrice?.toFixed(2) || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="优先级"
            width="80"
            align="center"
          >
            <template #default="{ row }">
              <el-tag
                :type="PROCUREMENT_PRIORITY_TAGS[row.priority]"
                size="small"
              >
                {{ PROCUREMENT_PRIORITY_LABELS[row.priority] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            v-if="currentRequest.status !== 'PENDING'"
            label="调整说明"
            min-width="120"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.adjustedNote || '-' }}
            </template>
          </el-table-column>
        </el-table>

        <el-divider
          v-if="currentRequest.orders && currentRequest.orders.length > 0"
          content-position="left"
        >
          关联采购单
        </el-divider>

        <el-table
          v-if="currentRequest.orders && currentRequest.orders.length > 0"
          :data="currentRequest.orders"
          border
          style="width: 100%"
        >
          <el-table-column
            prop="orderNo"
            label="采购单号"
            width="160"
          >
            <template #default="{ row }">
              <el-text type="primary">
                {{ row.orderNo }}
              </el-text>
            </template>
          </el-table-column>
          <el-table-column
            prop="supplier"
            label="供应商"
            min-width="140"
          />
          <el-table-column
            label="状态"
            width="100"
            align="center"
          >
            <template #default="{ row }">
              <el-tag
                :type="PROC_ORDER_STATUS_TAGS[row.status]"
                size="small"
              >
                {{ PROC_ORDER_STATUS_LABELS[row.status] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="总金额"
            width="110"
            align="right"
          >
            <template #default="{ row }">
              ¥{{ row.totalAmount?.toFixed(2) || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="创建人"
            width="100"
          >
            <template #default="{ row }">
              {{ row.createdBy?.username || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="创建时间"
            width="160"
          >
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <el-dialog
      v-model="approvalDialogVisible"
      title="审批采购申请"
      width="950px"
      destroy-on-close
    >
      <div v-if="currentRequest">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请单号">
            <el-text type="primary" style="font-weight: 500">
              {{ currentRequest.requestNo }}
            </el-text>
          </el-descriptions-item>
          <el-descriptions-item label="申请人">
            {{ currentRequest.requestedBy?.username || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="主题" :span="2">
            {{ currentRequest.subject }}
          </el-descriptions-item>
          <el-descriptions-item label="经费科目">
            {{ currentRequest.fundSubject }}
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">
            {{ formatDate(currentRequest.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="申请理由" :span="2">
            {{ currentRequest.reason || '无' }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">书目审批（可调整批准数量）</el-divider>

        <el-table
          :data="approvalItems"
          border
          style="width: 100%; margin-bottom: 20px"
        >
          <el-table-column
            label="序号"
            width="60"
            align="center"
          >
            <template #default="{ $index }">
              {{ $index + 1 }}
            </template>
          </el-table-column>
          <el-table-column
            label="书名"
            min-width="160"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.title }}
            </template>
          </el-table-column>
          <el-table-column
            label="作者"
            width="100"
          >
            <template #default="{ row }">
              {{ row.author }}
            </template>
          </el-table-column>
          <el-table-column
            label="ISBN"
            width="140"
          >
            <template #default="{ row }">
              {{ row.isbn }}
            </template>
          </el-table-column>
          <el-table-column
            label="申请册数"
            width="90"
            align="center"
          >
            <template #default="{ row }">
              {{ row.requestedQty }}
            </template>
          </el-table-column>
          <el-table-column
            label="批准册数"
            width="130"
            align="center"
          >
            <template #default="{ row, $index }">
              <el-form-item
                :prop="`approvalItems[${$index}].approvedQty`"
                style="margin-bottom: 0"
              >
                <el-input-number
                  v-model="row.approvedQty"
                  :min="0"
                  :max="row.requestedQty"
                  controls-position="right"
                  style="width: 100%"
                />
              </el-form-item>
            </template>
          </el-table-column>
          <el-table-column
            label="预估单价"
            width="100"
            align="right"
          >
            <template #default="{ row }">
              ¥{{ row.estimatedPrice?.toFixed(2) || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="优先级"
            width="80"
            align="center"
          >
            <template #default="{ row }">
              <el-tag
                :type="PROCUREMENT_PRIORITY_TAGS[row.priority]"
                size="small"
              >
                {{ PROCUREMENT_PRIORITY_LABELS[row.priority] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="调整说明" min-width="160">
            <template #default="{ row, $index }">
              <el-form-item
                :prop="`approvalItems[${$index}].adjustedNote`"
                style="margin-bottom: 0"
              >
                <el-input
                  v-model="row.adjustedNote"
                  placeholder="可选：调整原因说明"
                />
              </el-form-item>
            </template>
          </el-table-column>
        </el-table>

        <el-form
          ref="approvalFormRef"
          :model="approvalForm"
          :rules="approvalRules"
          label-width="100px"
        >
          <el-form-item
            label="审批结果"
            prop="status"
          >
            <el-radio-group v-model="approvalForm.status">
              <el-radio value="APPROVED">全部通过</el-radio>
              <el-radio value="PARTIAL_APPROVED">部分通过</el-radio>
              <el-radio value="REJECTED">驳回</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item
            label="审批备注"
            prop="reviewNote"
          >
            <el-input
              v-model="approvalForm.reviewNote"
              type="textarea"
              :rows="3"
              placeholder="请输入审批备注（驳回时必填）"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="approvalDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleApproval"
        >
          确认审批
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Plus } from '@element-plus/icons-vue';
import type { FormInstance } from 'element-plus';
import api from '../api';
import { useUserStore } from '../store/user';
import type {
  ProcurementRequest,
  ProcurementRequestItem,
  ProcurementRequestStatus,
  ProcurementPriority,
} from '../types';
import {
  PROC_REQ_STATUS_LABELS,
  PROC_REQ_STATUS_TAGS,
  PROCUREMENT_PRIORITY_LABELS,
  PROCUREMENT_PRIORITY_TAGS,
  PROC_ORDER_STATUS_LABELS,
  PROC_ORDER_STATUS_TAGS,
} from '../types';

type FormItem = {
  id?: number;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  requestedQty: number;
  estimatedPrice: number;
  priority: ProcurementPriority;
};

type ApprovalItem = FormItem & {
  approvedQty: number;
  adjustedNote?: string;
  requestedQty: number;
};

const userStore = useUserStore();

const requests = ref<ProcurementRequest[]>([]);
const loading = ref(false);
const submitting = ref(false);
const filterKeyword = ref('');
const filterStatus = ref<ProcurementRequestStatus | ''>('');

const createDialogVisible = ref(false);
const editDialogVisible = ref(false);
const detailDialogVisible = ref(false);
const approvalDialogVisible = ref(false);
const currentRequest = ref<ProcurementRequest | null>(null);

const createFormRef = ref<FormInstance | null>(null);
const editFormRef = ref<FormInstance | null>(null);
const approvalFormRef = ref<FormInstance | null>(null);

const createForm = ref<{
  subject: string;
  reason: string;
  fundSubject: string;
  items: FormItem[];
}>({
  subject: '',
  reason: '',
  fundSubject: '',
  items: [],
});

const editForm = ref<{
  id: number;
  requestNo: string;
  subject: string;
  reason: string;
  fundSubject: string;
  items: FormItem[];
}>({
  id: 0,
  requestNo: '',
  subject: '',
  reason: '',
  fundSubject: '',
  items: [],
});

const approvalItems = ref<ApprovalItem[]>([]);
const approvalForm = ref<{
  status: ProcurementRequestStatus;
  reviewNote: string;
}>({
  status: 'APPROVED',
  reviewNote: '',
});

const formRules = {
  subject: [{ required: true, message: '请输入申请主题', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入申请理由', trigger: 'blur' }],
  fundSubject: [{ required: true, message: '请输入经费科目', trigger: 'blur' }],
};

const itemRules = {
  title: [{ required: true, message: '请输入书名', trigger: 'blur' }],
  author: [{ required: true, message: '请输入作者', trigger: 'blur' }],
  isbn: [{ required: true, message: '请输入ISBN', trigger: 'blur' }],
  publisher: [{ required: true, message: '请输入出版社', trigger: 'blur' }],
  requestedQty: [{ required: true, message: '请输入申请册数', trigger: 'blur' }],
  estimatedPrice: [{ required: true, message: '请输入预估单价', trigger: 'blur' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
};

const approvalRules = {
  status: [{ required: true, message: '请选择审批结果', trigger: 'change' }],
  reviewNote: [
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (approvalForm.value.status === 'REJECTED' && !value.trim()) {
          callback(new Error('驳回时必须填写审批备注'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
};

const filteredRequests = computed(() => {
  return requests.value.filter((r) => {
    const matchStatus = !filterStatus.value || r.status === filterStatus.value;
    const matchKeyword = !filterKeyword.value ||
      r.requestNo?.includes(filterKeyword.value) ||
      r.subject?.includes(filterKeyword.value) ||
      r.requestedBy?.username?.includes(filterKeyword.value);
    return matchStatus && matchKeyword;
  });
});

const createTotalAmount = computed(() => {
  return createForm.value.items.reduce(
    (sum, item) => sum + (item.requestedQty || 0) * (item.estimatedPrice || 0),
    0
  );
});

const editTotalAmount = computed(() => {
  return editForm.value.items.reduce(
    (sum, item) => sum + (item.requestedQty || 0) * (item.estimatedPrice || 0),
    0
  );
});

const createEmptyItem = (): FormItem => ({
  title: '',
  author: '',
  isbn: '',
  publisher: '',
  requestedQty: 1,
  estimatedPrice: 0,
  priority: 'MEDIUM',
});

const canEditOrDelete = (row: ProcurementRequest) => {
  if (row.status !== 'PENDING') return false;
  if (userStore.isAdmin) return true;
  return row.requestedById === userStore.userId;
};

const fetchRequests = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (filterStatus.value) params.status = filterStatus.value;
    if (filterKeyword.value) params.keyword = filterKeyword.value;
    const res: any = await api.get('/procurements/requests', { params });
    requests.value = res;
  } finally {
    loading.value = false;
  }
};

const showCreateDialog = () => {
  createForm.value = {
    subject: '',
    reason: '',
    fundSubject: '',
    items: [createEmptyItem()],
  };
  createDialogVisible.value = true;
};

const addCreateItem = () => {
  createForm.value.items.push(createEmptyItem());
};

const removeCreateItem = (index: number) => {
  if (createForm.value.items.length > 1) {
    createForm.value.items.splice(index, 1);
  }
};

const handleCreate = async () => {
  if (createForm.value.items.length === 0) {
    ElMessage.warning('至少需要一条书目');
    return;
  }
  try {
    await createFormRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      subject: createForm.value.subject,
      reason: createForm.value.reason,
      fundSubject: createForm.value.fundSubject,
      items: createForm.value.items.map((item) => ({
        title: item.title,
        author: item.author,
        isbn: item.isbn,
        publisher: item.publisher,
        requestedQty: item.requestedQty,
        estimatedPrice: item.estimatedPrice,
        priority: item.priority,
      })),
    };
    await api.post('/procurements/requests', payload);
    ElMessage.success('采购申请提交成功');
    createDialogVisible.value = false;
    fetchRequests();
  } catch {
    ElMessage.error('提交失败');
  } finally {
    submitting.value = false;
  }
};

const showEditDialog = (row: ProcurementRequest) => {
  currentRequest.value = row;
  editForm.value = {
    id: row.id,
    requestNo: row.requestNo,
    subject: row.subject,
    reason: row.reason,
    fundSubject: row.fundSubject,
    items: row.items.map((item) => ({
      id: item.id,
      title: item.title,
      author: item.author,
      isbn: item.isbn,
      publisher: item.publisher,
      requestedQty: item.requestedQty,
      estimatedPrice: item.estimatedPrice,
      priority: item.priority,
    })),
  };
  editDialogVisible.value = true;
};

const addEditItem = () => {
  editForm.value.items.push(createEmptyItem());
};

const removeEditItem = (index: number) => {
  if (editForm.value.items.length > 1) {
    editForm.value.items.splice(index, 1);
  }
};

const handleEdit = async () => {
  if (editForm.value.items.length === 0) {
    ElMessage.warning('至少需要一条书目');
    return;
  }
  try {
    await editFormRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      subject: editForm.value.subject,
      reason: editForm.value.reason,
      fundSubject: editForm.value.fundSubject,
      items: editForm.value.items.map((item) => ({
        id: item.id,
        title: item.title,
        author: item.author,
        isbn: item.isbn,
        publisher: item.publisher,
        requestedQty: item.requestedQty,
        estimatedPrice: item.estimatedPrice,
        priority: item.priority,
      })),
    };
    await api.put(`/procurements/requests/${editForm.value.id}`, payload);
    ElMessage.success('修改保存成功');
    editDialogVisible.value = false;
    fetchRequests();
  } catch {
    ElMessage.error('修改失败');
  } finally {
    submitting.value = false;
  }
};

const showDetailDialog = async (row: ProcurementRequest) => {
  loading.value = true;
  try {
    const res: any = await api.get(`/procurements/requests/${row.id}`);
    currentRequest.value = res;
    detailDialogVisible.value = true;
  } catch {
    ElMessage.error('获取详情失败');
  } finally {
    loading.value = false;
  }
};

const showApprovalDialog = (row: ProcurementRequest) => {
  currentRequest.value = row;
  approvalItems.value = row.items.map((item) => ({
    id: item.id,
    title: item.title,
    author: item.author,
    isbn: item.isbn,
    publisher: item.publisher,
    requestedQty: item.requestedQty,
    estimatedPrice: item.estimatedPrice,
    priority: item.priority,
    approvedQty: item.requestedQty,
    adjustedNote: '',
  }));
  approvalForm.value = {
    status: 'APPROVED',
    reviewNote: '',
  };
  approvalDialogVisible.value = true;
};

const handleApproval = async () => {
  try {
    await approvalFormRef.value?.validate();
  } catch {
    return;
  }

  if (approvalForm.value.status === 'PARTIAL_APPROVED') {
    const hasPartial = approvalItems.value.some(
      (item) => (item.approvedQty ?? 0) < item.requestedQty
    );
    if (!hasPartial) {
      ElMessage.warning('部分通过时，至少有一条书目的批准数量要小于申请数量');
      return;
    }
  }

  submitting.value = true;
  try {
    const payload: any = {
      status: approvalForm.value.status,
      reviewNote: approvalForm.value.reviewNote || undefined,
    };
    if (approvalForm.value.status !== 'REJECTED') {
      payload.items = approvalItems.value.map((item) => ({
        id: item.id,
        approvedQty: approvalForm.value.status === 'APPROVED' ? item.requestedQty : item.approvedQty,
        adjustedNote: item.adjustedNote || undefined,
      }));
    }
    await api.put(`/procurements/requests/${currentRequest.value!.id}/review`, payload);
    ElMessage.success('审批成功');
    approvalDialogVisible.value = false;
    fetchRequests();
  } catch {
    ElMessage.error('审批失败');
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (row: ProcurementRequest) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除申请单「${row.requestNo}」吗？此操作不可恢复。`,
      '确认删除',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    );
    await api.delete(`/procurements/requests/${row.id}`);
    ElMessage.success('删除成功');
    fetchRequests();
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
  fetchRequests();
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

.items-table-wrapper {
  width: 100%;
}

.items-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}
</style>
