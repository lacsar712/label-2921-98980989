<template>
  <div class="procurement-orders-container">
    <el-card shadow="hover">
      <div class="filter-bar">
        <div class="filter-left">
          <el-input
            v-model="keyword"
            placeholder="搜索采购单号、申请单号、供应商、创建人"
            style="width: 320px"
            clearable
            @clear="fetchOrders"
            @keyup.enter="fetchOrders"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-select
            v-model="filterStatus"
            placeholder="全部状态"
            clearable
            style="width: 150px; margin-left: 10px"
            @change="fetchOrders"
          >
            <el-option
              v-for="(label, key) in PROC_ORDER_STATUS_LABELS"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </div>

        <div class="filter-right">
          <el-button
            v-if="userStore.isAdmin"
            type="primary"
            :icon="Plus"
            @click="openCreateDialog"
          >
            创建采购单
          </el-button>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="filteredOrders"
        style="width: 100%; margin-top: 16px"
        border
        stripe
      >
        <el-table-column
          label="采购单号"
          width="160"
        >
          <template #default="{ row }">
            <el-link
              type="primary"
              @click="openDetailDialog(row)"
            >
              {{ row.orderNo }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column
          label="关联申请单号"
          width="160"
        >
          <template #default="{ row }">
            {{ row.request?.requestNo || '-' }}
          </template>
        </el-table-column>

        <el-table-column
          label="供应商"
          min-width="180"
          show-overflow-tooltip
          prop="supplier"
        />

        <el-table-column
          label="预计到货日"
          width="130"
          align="center"
        >
          <template #default="{ row }">
            {{ row.expectedArrival ? formatDate(row.expectedArrival, false) : '-' }}
          </template>
        </el-table-column>

        <el-table-column
          label="总金额"
          width="120"
          align="right"
        >
          <template #default="{ row }">
            ¥{{ row.totalAmount?.toFixed(2) || '0.00' }}
          </template>
        </el-table-column>

        <el-table-column
          label="状态"
          width="110"
          align="center"
        >
          <template #default="{ row }">
            <el-tag :type="PROC_ORDER_STATUS_TAGS[row.status]">
              {{ PROC_ORDER_STATUS_LABELS[row.status] }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          label="创建人"
          width="110"
        >
          <template #default="{ row }">
            {{ row.createdBy?.username || '-' }}
          </template>
        </el-table-column>

        <el-table-column
          label="创建时间"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column
          label="操作"
          width="320"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="openDetailDialog(row)"
            >
              详情
            </el-button>
            <el-button
              v-if="(userStore.isAdmin || userStore.isLibrarian) && canConfirmArrival(row)"
              link
              type="success"
              @click="openArrivalDialog(row)"
            >
              到货确认
            </el-button>
            <el-button
              v-if="userStore.isAdmin && canReturn(row)"
              link
              type="warning"
              @click="openReturnDialog(row)"
            >
              退货
            </el-button>
            <el-button
              v-if="(userStore.isAdmin || userStore.isLibrarian) && canStockIn(row)"
              link
              type="primary"
              @click="openStockInDialog(row)"
            >
              入库
            </el-button>
            <el-dropdown
              v-if="userStore.isAdmin && canChangeStatus(row)"
              trigger="click"
              @command="(cmd) => handleStatusChange(row, cmd)"
            >
              <el-button link type="primary">
                状态流转
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-if="row.status === 'CREATED'"
                    command="ORDERED"
                  >
                    标记为已下单
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="row.status === 'FULLY_ARRIVED'"
                    command="COMPLETED"
                  >
                    标记为已完成
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="createDialogVisible"
      title="创建采购单"
      width="900px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="120px"
      >
        <el-form-item
          label="关联采购申请"
          prop="requestId"
        >
          <el-select
            v-model="createForm.requestId"
            placeholder="请选择采购申请"
            style="width: 100%"
            filterable
            @change="onRequestChange"
          >
            <el-option
              v-for="req in approvedRequests"
              :key="req.id"
              :label="`${req.requestNo} - ${req.subject}`"
              :value="req.id"
            />
          </el-select>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item
              label="供应商"
              prop="supplier"
            >
              <el-input
                v-model="createForm.supplier"
                placeholder="请输入供应商名称"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="联系人"
              prop="contactPerson"
            >
              <el-input
                v-model="createForm.contactPerson"
                placeholder="请输入联系人"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item
              label="联系电话"
              prop="contactPhone"
            >
              <el-input
                v-model="createForm.contactPhone"
                placeholder="请输入联系电话"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="预计到货日"
              prop="expectedArrival"
            >
              <el-date-picker
                v-model="createForm.expectedArrival"
                type="date"
                placeholder="选择预计到货日"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">书目明细</el-divider>

        <el-table
          :data="createForm.items"
          border
          style="width: 100%"
        >
          <el-table-column
            label="选择"
            width="55"
            align="center"
          >
            <template #default="{ row }">
              <el-checkbox v-model="row._selected" />
            </template>
          </el-table-column>
          <el-table-column
            label="书名"
            min-width="180"
            show-overflow-tooltip
            prop="title"
          />
          <el-table-column
            label="作者"
            width="120"
            prop="author"
          />
          <el-table-column
            label="ISBN"
            width="140"
            prop="isbn"
          />
          <el-table-column
            label="出版社"
            width="140"
            prop="publisher"
          />
          <el-table-column
            label="批准数量"
            width="90"
            align="center"
            prop="approvedQty"
          />
          <el-table-column
            label="采购册数"
            width="130"
          >
            <template #default="{ row }">
              <el-input-number
                v-model="row.orderQty"
                :min="0"
                :max="row.approvedQty || 9999"
                :disabled="!row._selected"
                controls-position="right"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column
            label="单价(¥)"
            width="130"
          >
            <template #default="{ row }">
              <el-input-number
                v-model="row.unitPrice"
                :min="0"
                :precision="2"
                :disabled="!row._selected"
                controls-position="right"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column
            label="优先级"
            width="110"
          >
            <template #default="{ row }">
              <el-select
                v-model="row.priority"
                :disabled="!row._selected"
                size="small"
              >
                <el-option
                  v-for="(label, key) in PROCUREMENT_PRIORITY_LABELS"
                  :key="key"
                  :label="label"
                  :value="key"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column
            label="小计"
            width="110"
            align="right"
          >
            <template #default="{ row }">
              ¥{{ ((row.orderQty || 0) * (row.unitPrice || 0)).toFixed(2) }}
            </template>
          </el-table-column>
        </el-table>

        <el-row style="margin-top: 16px">
          <el-col
            :span="24"
            style="text-align: right"
          >
            <span class="total-label">总金额：</span>
            <span class="total-amount">¥{{ calculateCreateTotal().toFixed(2) }}</span>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="createDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="createSubmitLoading"
          @click="submitCreate"
        >
          确认创建
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="detailDialogVisible"
      title="采购单详情"
      width="1100px"
      @open="fetchOrderDetail"
    >
      <el-descriptions
        :column="2"
        border
        style="margin-bottom: 20px"
      >
        <el-descriptions-item label="采购单号">
          <span class="primary-text">{{ currentOrder?.orderNo }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="PROC_ORDER_STATUS_TAGS[currentOrder?.status || 'CREATED']">
            {{ PROC_ORDER_STATUS_LABELS[currentOrder?.status || 'CREATED'] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="关联申请单号">
          {{ currentOrder?.request?.requestNo || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="供应商">
          {{ currentOrder?.supplier }}
        </el-descriptions-item>
        <el-descriptions-item label="联系人">
          {{ currentOrder?.contactPerson || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="联系电话">
          {{ currentOrder?.contactPhone || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="预计到货日">
          {{ currentOrder?.expectedArrival ? formatDate(currentOrder.expectedArrival, false) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="总金额">
          ¥{{ currentOrder?.totalAmount?.toFixed(2) || '0.00' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建人">
          {{ currentOrder?.createdBy?.username || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ currentOrder?.createdAt ? formatDate(currentOrder.createdAt) : '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <el-tabs v-model="detailActiveTab">
        <el-tab-pane
          label="书目列表"
          name="items"
        >
          <el-table
            :data="currentOrder?.items || []"
            border
            style="width: 100%"
          >
            <el-table-column
              label="书名"
              min-width="180"
              show-overflow-tooltip
              prop="title"
            />
            <el-table-column
              label="作者"
              width="100"
              prop="author"
            />
            <el-table-column
              label="ISBN"
              width="130"
              prop="isbn"
            />
            <el-table-column
              label="出版社"
              width="120"
              prop="publisher"
            />
            <el-table-column
              label="优先级"
              width="90"
              align="center"
            >
              <template #default="{ row }">
                <el-tag :type="PROCUREMENT_PRIORITY_TAGS[row.priority]">
                  {{ PROCUREMENT_PRIORITY_LABELS[row.priority] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="订购数量"
              width="90"
              align="center"
              prop="orderQty"
            />
            <el-table-column
              label="进度"
              width="300"
            >
              <template #default="{ row }">
                <div class="progress-item">
                  <span class="progress-label">已订购</span>
                  <el-progress
                    :percentage="row.orderQty ? 100 : 0"
                    :stroke-width="12"
                    :show-text="false"
                  />
                  <span class="progress-value">{{ row.orderQty }}</span>
                </div>
                <div class="progress-item">
                  <span class="progress-label">已到货</span>
                  <el-progress
                    :percentage="row.orderQty ? Math.round((row.receivedQty / row.orderQty) * 100) : 0"
                    :stroke-width="12"
                    :show-text="false"
                    status="success"
                  />
                  <span class="progress-value">{{ row.receivedQty }}</span>
                </div>
                <div class="progress-item">
                  <span class="progress-label">已退货</span>
                  <el-progress
                    :percentage="row.receivedQty ? Math.round((row.returnedQty / row.receivedQty) * 100) : 0"
                    :stroke-width="12"
                    :show-text="false"
                    status="exception"
                  />
                  <span class="progress-value">{{ row.returnedQty }}</span>
                </div>
                <div class="progress-item">
                  <span class="progress-label">已入库</span>
                  <el-progress
                    :percentage="(row.receivedQty - row.returnedQty) ? Math.round((row.stockInQty / (row.receivedQty - row.returnedQty)) * 100) : 0"
                    :stroke-width="12"
                    :show-text="false"
                  />
                  <span class="progress-value">{{ row.stockInQty }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column
              label="单价"
              width="90"
              align="right"
            >
              <template #default="{ row }">
                ¥{{ row.unitPrice?.toFixed(2) }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane
          label="到货记录"
          name="arrivals"
        >
          <el-timeline>
            <el-timeline-item
              v-for="(record, idx) in currentOrder?.arrivalRecords || []"
              :key="record.id"
              :timestamp="formatDate(record.createdAt)"
              placement="top"
              :type="idx === 0 ? 'primary' : ''"
              :hollow="idx !== 0"
            >
              <el-card
                shadow="never"
                style="margin-bottom: 10px"
              >
                <div class="timeline-card-header">
                  <el-tag type="success" size="small">
                    {{ record.arrivalNo }}
                  </el-tag>
                  <span class="timeline-operator">
                    操作人：{{ record.operator?.username || '-' }}
                  </span>
                </div>
                <div style="margin: 8px 0">
                  <span style="margin-right: 20px">到货日期：{{ formatDate(record.arrivalDate, false) }}</span>
                  <span>到货总数：{{ record.totalReceived }} 册</span>
                </div>
                <el-table
                  :data="record.items"
                  size="small"
                  border
                >
                  <el-table-column
                    label="书名"
                    min-width="160"
                    show-overflow-tooltip
                    prop="title"
                  />
                  <el-table-column
                    label="ISBN"
                    width="130"
                    prop="isbn"
                  />
                  <el-table-column
                    label="到货数量"
                    width="90"
                    align="center"
                    prop="receivedQty"
                  />
                  <el-table-column
                    label="单价"
                    width="90"
                    align="right"
                  >
                    <template #default="{ row }">
                      ¥{{ row.unitPrice?.toFixed(2) }}
                    </template>
                  </el-table-column>
                  <el-table-column
                    label="入库状态"
                    width="90"
                    align="center"
                  >
                    <template #default="{ row }">
                      <el-tag
                        :type="row.stockInStatus ? 'success' : 'warning'"
                        size="small"
                      >
                        {{ row.stockInStatus ? '已入库' : '待入库' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column
                    label="备注"
                    min-width="100"
                    show-overflow-tooltip
                    prop="remark"
                  />
                </el-table>
                <div v-if="record.remark" style="margin-top: 8px">
                  <span class="text-muted">备注：{{ record.remark }}</span>
                </div>
              </el-card>
            </el-timeline-item>
            <el-timeline-item
              v-if="!currentOrder?.arrivalRecords?.length"
              type="info"
            >
              暂无到货记录
            </el-timeline-item>
          </el-timeline>
        </el-tab-pane>

        <el-tab-pane
          label="退货记录"
          name="returns"
        >
          <el-timeline>
            <el-timeline-item
              v-for="(record, idx) in currentOrder?.returnRecords || []"
              :key="record.id"
              :timestamp="formatDate(record.createdAt)"
              placement="top"
              :type="idx === 0 ? 'warning' : ''"
              :hollow="idx !== 0"
            >
              <el-card
                shadow="never"
                style="margin-bottom: 10px"
              >
                <div class="timeline-card-header">
                  <el-tag type="warning" size="small">
                    {{ record.returnNo }}
                  </el-tag>
                  <span class="timeline-operator">
                    操作人：{{ record.operator?.username || '-' }}
                  </span>
                </div>
                <div style="margin: 8px 0">
                  <span style="margin-right: 20px">退货日期：{{ formatDate(record.returnDate, false) }}</span>
                  <span style="margin-right: 20px">退货总数：{{ record.totalReturned }} 册</span>
                  <span>退款总额：¥{{ record.totalRefund?.toFixed(2) || '0.00' }}</span>
                </div>
                <el-table
                  :data="record.items"
                  size="small"
                  border
                >
                  <el-table-column
                    label="书名"
                    min-width="160"
                    show-overflow-tooltip
                    prop="title"
                  />
                  <el-table-column
                    label="ISBN"
                    width="130"
                    prop="isbn"
                  />
                  <el-table-column
                    label="退货数量"
                    width="90"
                    align="center"
                    prop="returnedQty"
                  />
                  <el-table-column
                    label="单价"
                    width="90"
                    align="right"
                  >
                    <template #default="{ row }">
                      ¥{{ row.unitPrice?.toFixed(2) }}
                    </template>
                  </el-table-column>
                  <el-table-column
                    label="退款金额"
                    width="100"
                    align="right"
                  >
                    <template #default="{ row }">
                      ¥{{ row.refundAmount?.toFixed(2) }}
                    </template>
                  </el-table-column>
                  <el-table-column
                    label="退货原因"
                    min-width="120"
                    show-overflow-tooltip
                    prop="reason"
                  />
                </el-table>
                <div v-if="record.reason" style="margin-top: 8px">
                  <span class="text-muted">总体原因：{{ record.reason }}</span>
                </div>
              </el-card>
            </el-timeline-item>
            <el-timeline-item
              v-if="!currentOrder?.returnRecords?.length"
              type="info"
            >
              暂无退货记录
            </el-timeline-item>
          </el-timeline>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <el-dialog
      v-model="arrivalDialogVisible"
      title="到货确认"
      width="900px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="arrivalFormRef"
        :model="arrivalForm"
        :rules="arrivalRules"
        label-width="100px"
      >
        <el-form-item
          label="到货日期"
          prop="arrivalDate"
        >
          <el-date-picker
            v-model="arrivalForm.arrivalDate"
            type="date"
            placeholder="选择到货日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="arrivalForm.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注（可选）"
          />
        </el-form-item>

        <el-divider content-position="left">到货明细</el-divider>

        <el-table
          :data="arrivalForm.items"
          border
          style="width: 100%"
        >
          <el-table-column
            label="书名"
            min-width="180"
            show-overflow-tooltip
            prop="title"
          />
          <el-table-column
            label="ISBN"
            width="130"
            prop="isbn"
          />
          <el-table-column
            label="待到货"
            width="80"
            align="center"
          >
            <template #default="{ row }">
              {{ row.orderQty - row.receivedQty }}
            </template>
          </el-table-column>
          <el-table-column
            label="到货数量"
            width="130"
          >
            <template #default="{ row }">
              <el-input-number
                v-model="row._receivedQty"
                :min="0"
                :max="row.orderQty - row.receivedQty"
                controls-position="right"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column
            label="单价(¥)"
            width="130"
          >
            <template #default="{ row }">
              <el-input-number
                v-model="row._unitPrice"
                :min="0"
                :precision="2"
                controls-position="right"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column
            label="小计"
            width="110"
            align="right"
          >
            <template #default="{ row }">
              ¥{{ ((row._receivedQty || 0) * (row._unitPrice || 0)).toFixed(2) }}
            </template>
          </el-table-column>
        </el-table>

        <el-row style="margin-top: 16px">
          <el-col
            :span="24"
            style="text-align: right"
          >
            <span class="total-label">本次到货总数：</span>
            <span class="total-amount">{{ calculateArrivalTotal().qty }} 册</span>
            <span style="margin-left: 20px" class="total-label">总金额：</span>
            <span class="total-amount">¥{{ calculateArrivalTotal().amount.toFixed(2) }}</span>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="arrivalDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="arrivalSubmitLoading"
          @click="submitArrival"
        >
          确认到货
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="returnDialogVisible"
      title="退货记录"
      width="900px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="returnFormRef"
        :model="returnForm"
        :rules="returnRules"
        label-width="100px"
      >
        <el-form-item
          label="退货日期"
          prop="returnDate"
        >
          <el-date-picker
            v-model="returnForm.returnDate"
            type="date"
            placeholder="选择退货日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="总体原因">
          <el-input
            v-model="returnForm.reason"
            type="textarea"
            :rows="2"
            placeholder="请输入总体退货原因（可选）"
          />
        </el-form-item>

        <el-divider content-position="left">退货明细</el-divider>

        <el-table
          :data="returnForm.items"
          border
          style="width: 100%"
        >
          <el-table-column
            label="书名"
            min-width="180"
            show-overflow-tooltip
            prop="title"
          />
          <el-table-column
            label="ISBN"
            width="130"
            prop="isbn"
          />
          <el-table-column
            label="可退货"
            width="80"
            align="center"
          >
            <template #default="{ row }">
              {{ row.receivedQty - row.returnedQty - row.stockInQty }}
            </template>
          </el-table-column>
          <el-table-column
            label="退货数量"
            width="130"
          >
            <template #default="{ row }">
              <el-input-number
                v-model="row._returnedQty"
                :min="0"
                :max="row.receivedQty - row.returnedQty - row.stockInQty"
                controls-position="right"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column
            label="单价(¥)"
            width="130"
          >
            <template #default="{ row }">
              <el-input-number
                v-model="row._unitPrice"
                :min="0"
                :precision="2"
                controls-position="right"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column
            label="退款金额(¥)"
            width="140"
          >
            <template #default="{ row }">
              <el-input-number
                v-model="row._refundAmount"
                :min="0"
                :precision="2"
                controls-position="right"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column
            label="退货原因"
            min-width="150"
          >
            <template #default="{ row }">
              <el-input
                v-model="row._reason"
                size="small"
                placeholder="可选"
              />
            </template>
          </el-table-column>
        </el-table>

        <el-row style="margin-top: 16px">
          <el-col
            :span="24"
            style="text-align: right"
          >
            <span class="total-label">本次退货总数：</span>
            <span class="total-amount">{{ calculateReturnTotal().qty }} 册</span>
            <span style="margin-left: 20px" class="total-label">退款总额：</span>
            <span class="total-amount">¥{{ calculateReturnTotal().refund.toFixed(2) }}</span>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="returnDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="returnSubmitLoading"
          @click="submitReturn"
        >
          确认退货
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="stockInDialogVisible"
      title="入库操作"
      width="900px"
      :close-on-click-modal="false"
    >
      <el-alert
        title="选择需要入库的到货明细，勾选后点击确认入库。系统将自动更新图书记录（新书创建/已有书增加库存）。"
        type="info"
        :closable="false"
        style="margin-bottom: 16px"
      />

      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        "
      >
        <el-checkbox
          :model-value="isAllStockInSelected"
          :indeterminate="isStockInIndeterminate"
          @change="toggleAllStockIn"
        >
          全选
        </el-checkbox>
        <span>
          已选择 <b style="color: #409eff">{{ selectedStockInCount }}</b> 项，共
          <b style="color: #67c23a">{{ selectedStockInTotalQty }}</b> 册
        </span>
      </div>

      <el-table
        :data="stockInItems"
        border
        style="width: 100%"
        @selection-change="onStockInSelectionChange"
        ref="stockInTableRef"
      >
        <el-table-column
          type="selection"
          width="55"
          :selectable="(row) => !row.stockInStatus"
        />
        <el-table-column
          label="书名"
          min-width="180"
          show-overflow-tooltip
          prop="title"
        />
        <el-table-column
          label="ISBN"
          width="130"
          prop="isbn"
        />
        <el-table-column
          label="关联到货单"
          width="150"
          prop="arrivalNo"
        />
        <el-table-column
          label="到货数量"
          width="90"
          align="center"
          prop="receivedQty"
        />
        <el-table-column
          label="入库状态"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.stockInStatus ? 'success' : 'warning'"
              size="small"
            >
              {{ row.stockInStatus ? '已入库' : '待入库' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="到货日期"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            {{ row.arrivalDate ? formatDate(row.arrivalDate, false) : '-' }}
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="stockInDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="stockInSubmitLoading"
          :disabled="selectedStockInCount === 0"
          @click="submitStockIn"
        >
          确认入库
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, nextTick } from 'vue';
import {
  Search,
  Plus,
  ArrowDown,
} from '@element-plus/icons-vue';
import api from '../api';
import { useUserStore } from '../store/user';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, ElTable } from 'element-plus';
import type {
  ProcurementOrder,
  ProcurementOrderItem,
  ArrivalRecord,
  ReturnRecord,
  ProcurementRequest,
  ProcurementRequestItem,
  ArrivalRecordItem,
  ProcurementOrderStatus,
  ProcurementPriority,
} from '../types';
import {
  PROC_ORDER_STATUS_LABELS,
  PROC_ORDER_STATUS_TAGS,
  PROCUREMENT_PRIORITY_LABELS,
  PROCUREMENT_PRIORITY_TAGS,
  PROC_REQ_STATUS_LABELS,
} from '../types';

const userStore = useUserStore();
const orders = ref<ProcurementOrder[]>([]);
const loading = ref(false);
const keyword = ref('');
const filterStatus = ref<ProcurementOrderStatus | ''>('');

const approvedRequests = ref<ProcurementRequest[]>([]);

const createDialogVisible = ref(false);
const createSubmitLoading = ref(false);
const createFormRef = ref<FormInstance | null>(null);

type CreateFormItem = ProcurementRequestItem & {
  _selected: boolean;
  orderQty: number;
  unitPrice: number;
  priority: ProcurementPriority;
};

const createForm = reactive({
  requestId: null as number | null,
  supplier: '',
  contactPerson: '',
  contactPhone: '',
  expectedArrival: '',
  items: [] as CreateFormItem[],
});

const createRules = {
  requestId: [{ required: true, message: '请选择关联采购申请', trigger: 'change' }],
  supplier: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }],
  contactPerson: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  contactPhone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  expectedArrival: [{ required: true, message: '请选择预计到货日', trigger: 'change' }],
};

const detailDialogVisible = ref(false);
const detailActiveTab = ref('items');
const currentOrder = ref<ProcurementOrder | null>(null);

const arrivalDialogVisible = ref(false);
const arrivalSubmitLoading = ref(false);
const arrivalFormRef = ref<FormInstance | null>(null);

type ArrivalFormItem = ProcurementOrderItem & {
  _receivedQty: number;
  _unitPrice: number;
};

const arrivalForm = reactive({
  arrivalDate: '',
  remark: '',
  items: [] as ArrivalFormItem[],
});

const arrivalRules = {
  arrivalDate: [{ required: true, message: '请选择到货日期', trigger: 'change' }],
};

const returnDialogVisible = ref(false);
const returnSubmitLoading = ref(false);
const returnFormRef = ref<FormInstance | null>(null);

type ReturnFormItem = ProcurementOrderItem & {
  _returnedQty: number;
  _unitPrice: number;
  _refundAmount: number;
  _reason: string;
};

const returnForm = reactive({
  returnDate: '',
  reason: '',
  items: [] as ReturnFormItem[],
});

const returnRules = {
  returnDate: [{ required: true, message: '请选择退货日期', trigger: 'change' }],
};

const stockInDialogVisible = ref(false);
const stockInSubmitLoading = ref(false);
const stockInTableRef = ref<InstanceType<typeof ElTable> | null>(null);

type StockInItem = ArrivalRecordItem & {
  arrivalNo?: string;
  arrivalDate?: string;
};

const stockInItems = ref<StockInItem[]>([]);
const selectedStockInItems = ref<StockInItem[]>([]);

const selectedStockInCount = computed(() => selectedStockInItems.value.length);
const selectedStockInTotalQty = computed(() =>
  selectedStockInItems.value.reduce((sum, item) => sum + (item.receivedQty || 0), 0)
);

const isAllStockInSelected = computed(() => {
  const pendingItems = stockInItems.value.filter((i) => !i.stockInStatus);
  return pendingItems.length > 0 && selectedStockInItems.value.length === pendingItems.length;
});

const isStockInIndeterminate = computed(() => {
  const pendingItems = stockInItems.value.filter((i) => !i.stockInStatus);
  return selectedStockInItems.value.length > 0 && selectedStockInItems.value.length < pendingItems.length;
});

const filteredOrders = computed(() => {
  return orders.value.filter((o) => {
    const matchKeyword = !keyword.value ||
      o.orderNo.includes(keyword.value) ||
      o.request?.requestNo?.includes(keyword.value) ||
      o.supplier.includes(keyword.value) ||
      o.createdBy?.username?.includes(keyword.value);
    const matchStatus = !filterStatus.value || o.status === filterStatus.value;
    return matchKeyword && matchStatus;
  });
});

const fetchOrders = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (filterStatus.value) params.status = filterStatus.value;
    if (keyword.value) params.keyword = keyword.value;
    const res = await api.get('/procurements/orders', { params });
    orders.value = res as ProcurementOrder[];
  } finally {
    loading.value = false;
  }
};

const fetchApprovedRequests = async () => {
  try {
    const res = await api.get('/procurements/requests', {
      params: { status: ['APPROVED', 'PARTIAL_APPROVED'] },
    });
    approvedRequests.value = res as ProcurementRequest[];
  } catch (_) {}
};

const openCreateDialog = async () => {
  await fetchApprovedRequests();
  Object.assign(createForm, {
    requestId: null,
    supplier: '',
    contactPerson: '',
    contactPhone: '',
    expectedArrival: '',
    items: [],
  });
  createDialogVisible.value = true;
};

const onRequestChange = (reqId: number) => {
  const req = approvedRequests.value.find((r) => r.id === reqId);
  createForm.items = (req?.items || []).map((item) => ({
    ...item,
    _selected: false,
    orderQty: item.approvedQty || 0,
    unitPrice: item.estimatedPrice || 0,
    priority: item.priority || 'MEDIUM',
  })) as CreateFormItem[];
};

const calculateCreateTotal = () => {
  return createForm.items
    .filter((i) => i._selected)
    .reduce((sum, i) => sum + (i.orderQty || 0) * (i.unitPrice || 0), 0);
};

const submitCreate = async () => {
  if (!createFormRef.value) return;
  await createFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return;

    const selectedItems = createForm.items.filter((i) => i._selected && i.orderQty > 0);
    if (selectedItems.length === 0) {
      ElMessage.warning('请至少选择一个书目并填写采购册数');
      return;
    }

    createSubmitLoading.value = true;
    try {
      await api.post('/procurements/orders', {
        requestId: createForm.requestId,
        supplier: createForm.supplier,
        contactPerson: createForm.contactPerson,
        contactPhone: createForm.contactPhone,
        expectedArrival: createForm.expectedArrival,
        items: selectedItems.map((i) => ({
          requestItemId: i.id,
          title: i.title,
          author: i.author,
          isbn: i.isbn,
          publisher: i.publisher,
          orderQty: i.orderQty,
          unitPrice: i.unitPrice,
          priority: i.priority,
          categoryId: i.categoryId,
        })),
      });
      ElMessage.success('创建采购单成功');
      createDialogVisible.value = false;
      fetchOrders();
    } finally {
      createSubmitLoading.value = false;
    }
  });
};

const openDetailDialog = async (row: ProcurementOrder) => {
  currentOrder.value = row;
  detailActiveTab.value = 'items';
  detailDialogVisible.value = true;
};

const fetchOrderDetail = async () => {
  if (!currentOrder.value) return;
  try {
    const res = await api.get(`/procurements/orders/${currentOrder.value.id}`);
    currentOrder.value = res as ProcurementOrder;
  } catch (_) {}
};

const canConfirmArrival = (row: ProcurementOrder) => {
  return ['CREATED', 'ORDERED', 'PARTIAL_ARRIVED'].includes(row.status) &&
    row.items.some((i) => i.receivedQty < i.orderQty);
};

const canReturn = (row: ProcurementOrder) => {
  return ['PARTIAL_ARRIVED', 'FULLY_ARRIVED'].includes(row.status) &&
    row.items.some((i) => i.receivedQty - i.returnedQty - i.stockInQty > 0);
};

const canStockIn = (row: ProcurementOrder) => {
  return row.items.some((i) => i.arrivalItems?.some((a) => !a.stockInStatus));
};

const canChangeStatus = (row: ProcurementOrder) => {
  return ['CREATED', 'FULLY_ARRIVED'].includes(row.status);
};

const handleStatusChange = async (row: ProcurementOrder, status: ProcurementOrderStatus) => {
  try {
    await ElMessageBox.confirm(
      `确认将采购单 ${row.orderNo} 标记为「${PROC_ORDER_STATUS_LABELS[status]}」吗？`,
      '状态变更确认',
      { type: 'warning' }
    );
    await api.put(`/procurements/orders/${row.id}`, { status });
    ElMessage.success('状态变更成功');
    fetchOrders();
  } catch (_) {}
};

const openArrivalDialog = async (row: ProcurementOrder) => {
  arrivalForm.arrivalDate = new Date().toISOString().split('T')[0];
  arrivalForm.remark = '';
  arrivalForm.items = row.items
    .filter((i) => i.receivedQty < i.orderQty)
    .map((i) => ({
      ...i,
      _receivedQty: Math.min(i.orderQty - i.receivedQty, i.orderQty - i.receivedQty),
      _unitPrice: i.unitPrice || 0,
    })) as ArrivalFormItem[];
  currentOrder.value = row;
  arrivalDialogVisible.value = true;
};

const calculateArrivalTotal = () => {
  let qty = 0;
  let amount = 0;
  arrivalForm.items.forEach((i) => {
    qty += i._receivedQty || 0;
    amount += (i._receivedQty || 0) * (i._unitPrice || 0);
  });
  return { qty, amount };
};

const submitArrival = async () => {
  if (!arrivalFormRef.value || !currentOrder.value) return;
  await arrivalFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return;

    const validItems = arrivalForm.items.filter((i) => (i._receivedQty || 0) > 0);
    if (validItems.length === 0) {
      ElMessage.warning('请至少填写一个书目的到货数量');
      return;
    }

    arrivalSubmitLoading.value = true;
    try {
      await api.post('/procurements/arrivals', {
        orderId: currentOrder.value.id,
        arrivalDate: arrivalForm.arrivalDate,
        remark: arrivalForm.remark,
        items: validItems.map((i) => ({
          orderItemId: i.id,
          title: i.title,
          isbn: i.isbn,
          receivedQty: i._receivedQty,
          unitPrice: i._unitPrice,
        })),
      });
      ElMessage.success('到货确认成功');
      arrivalDialogVisible.value = false;
      fetchOrders();
    } finally {
      arrivalSubmitLoading.value = false;
    }
  });
};

const openReturnDialog = async (row: ProcurementOrder) => {
  returnForm.returnDate = new Date().toISOString().split('T')[0];
  returnForm.reason = '';
  returnForm.items = row.items
    .filter((i) => i.receivedQty - i.returnedQty - i.stockInQty > 0)
    .map((i) => ({
      ...i,
      _returnedQty: Math.min(i.receivedQty - i.returnedQty - i.stockInQty, i.receivedQty - i.returnedQty - i.stockInQty),
      _unitPrice: i.unitPrice || 0,
      _refundAmount: ((i.receivedQty - i.returnedQty - i.stockInQty) * (i.unitPrice || 0)),
      _reason: '',
    })) as ReturnFormItem[];
  currentOrder.value = row;
  returnDialogVisible.value = true;
};

const calculateReturnTotal = () => {
  let qty = 0;
  let refund = 0;
  returnForm.items.forEach((i) => {
    qty += i._returnedQty || 0;
    refund += i._refundAmount || 0;
  });
  return { qty, refund };
};

const submitReturn = async () => {
  if (!returnFormRef.value || !currentOrder.value) return;
  await returnFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return;

    const validItems = returnForm.items.filter((i) => (i._returnedQty || 0) > 0);
    if (validItems.length === 0) {
      ElMessage.warning('请至少填写一个书目的退货数量');
      return;
    }

    returnSubmitLoading.value = true;
    try {
      await api.post('/procurements/returns', {
        orderId: currentOrder.value.id,
        returnDate: returnForm.returnDate,
        reason: returnForm.reason,
        items: validItems.map((i) => ({
          orderItemId: i.id,
          title: i.title,
          isbn: i.isbn,
          returnedQty: i._returnedQty,
          unitPrice: i._unitPrice,
          refundAmount: i._refundAmount,
          reason: i._reason,
        })),
      });
      ElMessage.success('退货记录成功');
      returnDialogVisible.value = false;
      fetchOrders();
    } finally {
      returnSubmitLoading.value = false;
    }
  });
};

const openStockInDialog = async (row: ProcurementOrder) => {
  const items: StockInItem[] = [];
  (row.arrivalRecords || []).forEach((record) => {
    (record.items || []).forEach((item) => {
      items.push({
        ...item,
        arrivalNo: record.arrivalNo,
        arrivalDate: record.arrivalDate,
      });
    });
  });
  stockInItems.value = items.sort((a, b) => {
    if (a.stockInStatus === b.stockInStatus) return 0;
    return a.stockInStatus ? 1 : -1;
  });
  currentOrder.value = row;
  selectedStockInItems.value = [];
  nextTick(() => {
    stockInTableRef.value?.clearSelection();
  });
  stockInDialogVisible.value = true;
};

const onStockInSelectionChange = (selection: StockInItem[]) => {
  selectedStockInItems.value = selection.filter((i) => !i.stockInStatus);
};

const toggleAllStockIn = (val: boolean) => {
  if (!stockInTableRef.value) return;
  if (val) {
    stockInItems.value.forEach((item) => {
      if (!item.stockInStatus) {
        stockInTableRef.value?.toggleRowSelection(item, true);
      }
    });
  } else {
    stockInTableRef.value.clearSelection();
  }
};

const submitStockIn = async () => {
  if (!currentOrder.value || selectedStockInItems.value.length === 0) return;
  try {
    await ElMessageBox.confirm(
      `确认入库 ${selectedStockInCount.value} 项共 ${selectedStockInTotalQty.value} 册图书吗？`,
      '入库确认',
      { type: 'warning' }
    );
    stockInSubmitLoading.value = true;
    await api.post('/procurements/stock-in', {
      orderId: currentOrder.value.id,
      arrivalItemIds: selectedStockInItems.value.map((i) => i.id),
    });
    ElMessage.success('入库成功');
    stockInDialogVisible.value = false;
    fetchOrders();
  } catch (_) {
  } finally {
    stockInSubmitLoading.value = false;
  }
};

const formatDate = (dateStr?: string, showTime = true) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (showTime) {
    return date.toLocaleString('zh-CN', { hour12: false });
  }
  return date.toLocaleDateString('zh-CN');
};

onMounted(() => {
  fetchOrders();
});
</script>

<style scoped lang="scss">
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-left,
.filter-right {
  display: flex;
  align-items: center;
}

.primary-text {
  color: #409eff;
  font-weight: 600;
}

.total-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.total-amount {
  font-size: 18px;
  font-weight: 600;
  color: #f56c6c;
}

.progress-item {
  display: flex;
  align-items: center;
  margin-bottom: 4px;

  &:last-child {
    margin-bottom: 0;
  }

  .progress-label {
    width: 56px;
    font-size: 12px;
    color: #606266;
    flex-shrink: 0;
  }

  .el-progress {
    flex: 1;
    margin: 0 10px;
  }

  .progress-value {
    width: 36px;
    text-align: right;
    font-size: 12px;
    font-weight: 500;
    flex-shrink: 0;
  }
}

.timeline-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.timeline-operator {
  font-size: 12px;
  color: #909399;
}

.text-muted {
  color: #909399;
  font-size: 12px;
}

.small {
  font-size: 12px;
}
</style>
