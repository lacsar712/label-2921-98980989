<template>
  <div class="procurement-ledger-container">
    <el-row :gutter="20">
      <el-col
        v-for="(item, key) in statConfig"
        :key="key"
        :xs="24"
        :sm="12"
        :md="8"
        :lg="6"
        class="mb-20"
      >
        <el-card shadow="hover" class="stat-card">
          <el-statistic
            :title="item.label"
            :value="stats[key as keyof typeof stats] || 0"
            :value-style="{ color: item.color, fontSize: '24px' }"
          >
            <template #prefix>
              <el-icon class="stat-icon" :style="{ color: item.color }">
                <component :is="item.icon" />
              </el-icon>
            </template>
            <template v-if="key === 'totalAmount'" #suffix>
              元
            </template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>

    <el-row class="mt-20">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="header-actions">
            <div class="header-title">
              <el-icon class="title-icon"><Document /></el-icon>
              <span>采购台账列表</span>
            </div>
            <div class="header-filters">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索申请单号/主题/申请人"
                style="width: 280px; margin-right: 12px"
                clearable
                @clear="filterData"
                @keyup.enter="filterData"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-select
                v-model="filterStatus"
                placeholder="全部状态"
                clearable
                style="width: 150px"
                @change="filterData"
              >
                <el-option
                  v-for="(label, key) in PROC_REQ_STATUS_LABELS"
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
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="expand-content">
                  <el-collapse v-model="activePanels">
                    <el-collapse-item title="时间轴视图" name="timeline">
                      <el-timeline>
                        <el-timeline-item
                          v-for="(event, idx) in buildTimeline(row)"
                          :key="idx"
                          :timestamp="event.time"
                          :type="event.type"
                          :color="event.color"
                          placement="top"
                        >
                          <el-card shadow="never" class="timeline-card">
                            <div class="timeline-title">
                              <el-icon class="event-icon">
                                <component :is="event.icon" />
                              </el-icon>
                              <span>{{ event.title }}</span>
                            </div>
                            <div class="timeline-user">操作人：{{ event.user || '系统' }}</div>
                            <div v-if="event.detail" class="timeline-detail">
                              {{ event.detail }}
                            </div>
                          </el-card>
                        </el-timeline-item>
                      </el-timeline>
                    </el-collapse-item>

                    <el-collapse-item title="申请阶段" name="apply">
                      <el-descriptions :column="2" border size="small">
                        <el-descriptions-item label="申请单号">
                          {{ row.requestNo }}
                        </el-descriptions-item>
                        <el-descriptions-item label="申请主题">
                          {{ row.subject }}
                        </el-descriptions-item>
                        <el-descriptions-item label="申请人">
                          {{ row.requestedBy?.username || '-' }}
                        </el-descriptions-item>
                        <el-descriptions-item label="申请时间">
                          {{ formatDate(row.createdAt) }}
                        </el-descriptions-item>
                        <el-descriptions-item label="申请理由">
                          {{ row.reason || '-' }}
                        </el-descriptions-item>
                        <el-descriptions-item label="经费科目">
                          {{ row.fundSubject || '-' }}
                        </el-descriptions-item>
                      </el-descriptions>
                      <el-divider content-position="left">书目明细</el-divider>
                      <el-table :data="row.items" size="small" border>
                        <el-table-column prop="title" label="书名" min-width="200" show-overflow-tooltip />
                        <el-table-column prop="author" label="作者" width="120" />
                        <el-table-column prop="isbn" label="ISBN" width="160" />
                        <el-table-column prop="publisher" label="出版社" width="150" />
                        <el-table-column label="优先级" width="100" align="center">
                          <template #default="{ row: item }">
                            <el-tag :type="PROCUREMENT_PRIORITY_TAGS[item.priority]">
                              {{ PROCUREMENT_PRIORITY_LABELS[item.priority] }}
                            </el-tag>
                          </template>
                        </el-table-column>
                        <el-table-column prop="requestedQty" label="申请数量" width="100" align="center" />
                        <el-table-column label="预估单价" width="120" align="center">
                          <template #default="{ row: item }">
                            ¥{{ item.estimatedPrice?.toFixed(2) || '-' }}
                          </template>
                        </el-table-column>
                        <el-table-column label="分类" width="100">
                          <template #default="{ row: item }">
                            {{ item.category?.name || '-' }}
                          </template>
                        </el-table-column>
                      </el-table>
                    </el-collapse-item>

                    <el-collapse-item title="审批阶段" name="review">
                      <el-descriptions :column="2" border size="small">
                        <el-descriptions-item label="审批状态">
                          <el-tag :type="PROC_REQ_STATUS_TAGS[row.status]">
                            {{ PROC_REQ_STATUS_LABELS[row.status] }}
                          </el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item label="审批人">
                          {{ row.reviewedBy?.username || '-' }}
                        </el-descriptions-item>
                        <el-descriptions-item label="审批时间">
                          {{ row.reviewedAt ? formatDate(row.reviewedAt) : '-' }}
                        </el-descriptions-item>
                        <el-descriptions-item label="审批备注">
                          {{ row.reviewNote || '-' }}
                        </el-descriptions-item>
                      </el-descriptions>
                      <el-divider content-position="left">各书目审批数量调整</el-divider>
                      <el-table :data="row.items" size="small" border>
                        <el-table-column prop="title" label="书名" min-width="200" show-overflow-tooltip />
                        <el-table-column prop="isbn" label="ISBN" width="160" />
                        <el-table-column prop="requestedQty" label="申请数量" width="100" align="center" />
                        <el-table-column label="审批数量" width="100" align="center">
                          <template #default="{ row: item }">
                            <el-tag v-if="item.approvedQty != null" type="success">
                              {{ item.approvedQty }}
                            </el-tag>
                            <span v-else>-</span>
                          </template>
                        </el-table-column>
                        <el-table-column label="调整备注" min-width="150" show-overflow-tooltip>
                          <template #default="{ row: item }">
                            {{ item.adjustedNote || '-' }}
                          </template>
                        </el-table-column>
                      </el-table>
                    </el-collapse-item>

                    <el-collapse-item title="采购阶段" name="purchase">
                      <el-table
                        v-if="row.orders && row.orders.length > 0"
                        :data="row.orders"
                        size="small"
                        border
                      >
                        <el-table-column prop="orderNo" label="采购单号" width="160" />
                        <el-table-column prop="supplier" label="供应商" min-width="150" show-overflow-tooltip />
                        <el-table-column label="联系人" width="100">
                          <template #default="{ row: order }">
                            {{ order.contactPerson || '-' }}
                          </template>
                        </el-table-column>
                        <el-table-column label="联系电话" width="120">
                          <template #default="{ row: order }">
                            {{ order.contactPhone || '-' }}
                          </template>
                        </el-table-column>
                        <el-table-column label="状态" width="110" align="center">
                          <template #default="{ row: order }">
                            <el-tag :type="PROC_ORDER_STATUS_TAGS[order.status]">
                              {{ PROC_ORDER_STATUS_LABELS[order.status] }}
                            </el-tag>
                          </template>
                        </el-table-column>
                        <el-table-column label="金额(元)" width="120" align="center">
                          <template #default="{ row: order }">
                            ¥{{ order.totalAmount?.toFixed(2) || '-' }}
                          </template>
                        </el-table-column>
                        <el-table-column label="预计到货" width="150">
                          <template #default="{ row: order }">
                            {{ order.expectedArrival ? formatDate(order.expectedArrival) : '-' }}
                          </template>
                        </el-table-column>
                        <el-table-column label="下单时间" width="150">
                          <template #default="{ row: order }">
                            {{ order.orderedAt ? formatDate(order.orderedAt) : '-' }}
                          </template>
                        </el-table-column>
                        <el-table-column label="创建人" width="100">
                          <template #default="{ row: order }">
                            {{ order.createdBy?.username || '-' }}
                          </template>
                        </el-table-column>
                      </el-table>
                      <el-empty
                        v-else
                        description="暂无采购单"
                        :image-size="60"
                      />
                    </el-collapse-item>

                    <el-collapse-item title="到货阶段" name="arrival">
                      <template
                        v-for="order in row.orders"
                        :key="order.id"
                      >
                        <el-divider v-if="order.arrivalRecords && order.arrivalRecords.length > 0">
                          采购单：{{ order.orderNo }}
                        </el-divider>
                        <el-table
                          v-if="order.arrivalRecords && order.arrivalRecords.length > 0"
                          :data="order.arrivalRecords"
                          size="small"
                          border
                        >
                          <el-table-column prop="arrivalNo" label="到货单号" width="160" />
                          <el-table-column prop="arrivalDate" label="到货日期" width="160">
                            <template #default="{ row: record }">
                              {{ formatDate(record.arrivalDate) }}
                            </template>
                          </el-table-column>
                          <el-table-column prop="totalReceived" label="到货总数" width="100" align="center" />
                          <el-table-column label="操作人" width="100">
                            <template #default="{ row: record }">
                              {{ record.operator?.username || '-' }}
                            </template>
                          </el-table-column>
                          <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
                          <el-table-column label="到货明细" width="80" align="center">
                            <template #default="{ row: record, $index }">
                              <el-popover
                                placement="right"
                                :width="700"
                                trigger="click"
                              >
                                <template #reference>
                                  <el-button type="primary" link size="small">查看</el-button>
                                </template>
                                <el-table :data="record.items" size="small" border>
                                  <el-table-column prop="title" label="书名" min-width="180" show-overflow-tooltip />
                                  <el-table-column prop="isbn" label="ISBN" width="150" />
                                  <el-table-column prop="receivedQty" label="到货数量" width="90" align="center" />
                                  <el-table-column label="单价(元)" width="100" align="center">
                                    <template #default="{ row: item }">
                                      ¥{{ item.unitPrice?.toFixed(2) }}
                                    </template>
                                  </el-table-column>
                                  <el-table-column label="入库状态" width="100" align="center">
                                    <template #default="{ row: item }">
                                      <el-tag v-if="item.stockInStatus" type="success">已入库</el-tag>
                                      <el-tag v-else type="info">待入库</el-tag>
                                    </template>
                                  </el-table-column>
                                  <el-table-column label="入库时间" width="160">
                                    <template #default="{ row: item }">
                                      {{ item.stockInAt ? formatDate(item.stockInAt) : '-' }}
                                    </template>
                                  </el-table-column>
                                </el-table>
                              </el-popover>
                            </template>
                          </el-table-column>
                        </el-table>
                      </template>
                      <el-empty
                        v-if="!hasArrivalRecords(row)"
                        description="暂无到货记录"
                        :image-size="60"
                      />
                    </el-collapse-item>

                    <el-collapse-item title="退货阶段" name="return">
                      <template
                        v-for="order in row.orders"
                        :key="order.id"
                      >
                        <el-divider v-if="order.returnRecords && order.returnRecords.length > 0">
                          采购单：{{ order.orderNo }}
                        </el-divider>
                        <el-table
                          v-if="order.returnRecords && order.returnRecords.length > 0"
                          :data="order.returnRecords"
                          size="small"
                          border
                        >
                          <el-table-column prop="returnNo" label="退货单号" width="160" />
                          <el-table-column prop="returnDate" label="退货日期" width="160">
                            <template #default="{ row: record }">
                              {{ formatDate(record.returnDate) }}
                            </template>
                          </el-table-column>
                          <el-table-column prop="totalReturned" label="退货总数" width="100" align="center" />
                          <el-table-column label="退款金额(元)" width="120" align="center">
                            <template #default="{ row: record }">
                              <span style="color: #f56c6c">¥{{ record.totalRefund?.toFixed(2) }}</span>
                            </template>
                          </el-table-column>
                          <el-table-column label="操作人" width="100">
                            <template #default="{ row: record }">
                              {{ record.operator?.username || '-' }}
                            </template>
                          </el-table-column>
                          <el-table-column prop="reason" label="原因" min-width="120" show-overflow-tooltip />
                          <el-table-column label="退货明细" width="80" align="center">
                            <template #default="{ row: record }">
                              <el-popover
                                placement="right"
                                :width="600"
                                trigger="click"
                              >
                                <template #reference>
                                  <el-button type="danger" link size="small">查看</el-button>
                                </template>
                                <el-table :data="record.items" size="small" border>
                                  <el-table-column prop="title" label="书名" min-width="180" show-overflow-tooltip />
                                  <el-table-column prop="isbn" label="ISBN" width="150" />
                                  <el-table-column prop="returnedQty" label="退货数量" width="90" align="center" />
                                  <el-table-column label="单价(元)" width="100" align="center">
                                    <template #default="{ row: item }">
                                      ¥{{ item.unitPrice?.toFixed(2) }}
                                    </template>
                                  </el-table-column>
                                  <el-table-column label="退款(元)" width="100" align="center">
                                    <template #default="{ row: item }">
                                      <span style="color: #f56c6c">¥{{ item.refundAmount?.toFixed(2) }}</span>
                                    </template>
                                  </el-table-column>
                                </el-table>
                              </el-popover>
                            </template>
                          </el-table-column>
                        </el-table>
                      </template>
                      <el-empty
                        v-if="!hasReturnRecords(row)"
                        description="暂无退货记录"
                        :image-size="60"
                      />
                    </el-collapse-item>

                    <el-collapse-item title="入库阶段" name="stockin">
                      <el-descriptions :column="2" border size="small">
                        <el-descriptions-item label="采购单总数">
                          {{ row.orders?.length || 0 }}
                        </el-descriptions-item>
                        <el-descriptions-item label="总书目数">
                          {{ row.items?.length || 0 }}
                        </el-descriptions-item>
                        <el-descriptions-item label="总申请册数">
                          {{ getTotalRequestedQty(row) }}
                        </el-descriptions-item>
                        <el-descriptions-item label="已入库册数">
                          <el-tag type="success">{{ getTotalStockInQty(row) }}</el-tag>
                        </el-descriptions-item>
                      </el-descriptions>
                      <el-divider content-position="left">各书目入库明细</el-divider>
                      <el-table :data="getStockInDetails(row)" size="small" border>
                        <el-table-column prop="title" label="书名" min-width="200" show-overflow-tooltip />
                        <el-table-column prop="isbn" label="ISBN" width="160" />
                        <el-table-column prop="orderQty" label="采购数量" width="100" align="center" />
                        <el-table-column prop="receivedQty" label="到货数量" width="100" align="center" />
                        <el-table-column prop="returnedQty" label="退货数量" width="100" align="center" />
                        <el-table-column label="入库数量" width="100" align="center">
                          <template #default="{ row: item }">
                            <el-tag v-if="item.stockInQty > 0" type="success">
                              {{ item.stockInQty }}
                            </el-tag>
                            <span v-else>0</span>
                          </template>
                        </el-table-column>
                        <el-table-column label="入库进度" width="200">
                          <template #default="{ row: item }">
                            <el-progress
                              :percentage="item.orderQty > 0 ? Math.round(item.stockInQty / item.orderQty * 100) : 0"
                              :status="item.stockInQty >= item.orderQty ? 'success' : ''"
                            />
                          </template>
                        </el-table-column>
                        <el-table-column label="关联图书" width="150">
                          <template #default="{ row: item }">
                            <el-tag v-if="item.bookCreated" type="success" size="small">
                              {{ item.bookUpdated ? '已更新' : '已创建' }}
                            </el-tag>
                            <el-tag v-else type="info" size="small">未创建</el-tag>
                          </template>
                        </el-table-column>
                      </el-table>
                    </el-collapse-item>
                  </el-collapse>
                </div>
              </template>
            </el-table-column>

            <el-table-column
              label="申请单号"
              min-width="160"
              fixed
            >
              <template #default="{ row }">
                <el-link type="primary" :underline="false">
                  {{ row.requestNo }}
                </el-link>
              </template>
            </el-table-column>

            <el-table-column
              label="主题"
              min-width="200"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.subject }}
              </template>
            </el-table-column>

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
              width="170"
            >
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>

            <el-table-column
              label="申请状态"
              width="110"
              align="center"
            >
              <template #default="{ row }">
                <el-tag :type="PROC_REQ_STATUS_TAGS[row.status]" effect="dark">
                  {{ PROC_REQ_STATUS_LABELS[row.status] }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column
              label="审批信息"
              min-width="220"
            >
              <template #default="{ row }">
                <div class="review-info">
                  <div>审批人：{{ row.reviewedBy?.username || '-' }}</div>
                  <div>审批时间：{{ row.reviewedAt ? formatDate(row.reviewedAt) : '-' }}</div>
                  <div class="review-note" :title="row.reviewNote">
                    审批备注：{{ row.reviewNote || '-' }}
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column
              label="书目概要"
              min-width="260"
            >
              <template #default="{ row }">
                <div class="books-summary">
                  <el-tooltip
                    v-if="row.items && row.items.length > 0"
                    placement="top"
                  >
                    <template #content>
                      <div class="books-tooltip">
                        <div
                          v-for="(item, idx) in row.items"
                          :key="item.id"
                          class="tooltip-book-item"
                        >
                          <span class="book-index">{{ idx + 1 }}.</span>
                          <span>{{ item.title }}</span>
                          <el-tag size="small" style="margin-left: 8px">
                            ×{{ item.requestedQty }}
                          </el-tag>
                        </div>
                      </div>
                    </template>
                    <div class="books-display">
                      <span
                        v-for="(item, idx) in row.items.slice(0, 3)"
                        :key="item.id"
                        class="book-name"
                      >
                        {{ item.title }}
                      </span>
                      <el-tag
                        v-if="row.items.length > 3"
                        type="info"
                        size="small"
                      >
                        +{{ row.items.length - 3 }}
                      </el-tag>
                    </div>
                  </el-tooltip>
                  <span v-else class="empty-books">-</span>
                </div>
              </template>
            </el-table-column>

            <el-table-column
              label="采购单进度"
              min-width="280"
            >
              <template #default="{ row }">
                <div class="progress-wrapper">
                  <el-steps
                    :active="getProgressStep(row)"
                    finish-status="success"
                    size="small"
                  >
                    <el-step title="已创建" />
                    <el-step title="已下单" />
                    <el-step title="到货进度" :description="getArrivalProgressText(row)" />
                    <el-step title="入库进度" :description="getStockInProgressText(row)" />
                  </el-steps>
                  <div class="progress-bars">
                    <div class="progress-item">
                      <span class="progress-label">到货</span>
                      <el-progress
                        :percentage="getArrivalPercentage(row)"
                        :stroke-width="6"
                        :show-text="false"
                        status="warning"
                      />
                      <span class="progress-value">{{ getArrivalPercentage(row) }}%</span>
                    </div>
                    <div class="progress-item">
                      <span class="progress-label">入库</span>
                      <el-progress
                        :percentage="getStockInPercentage(row)"
                        :stroke-width="6"
                        :show-text="false"
                      />
                      <span class="progress-value">{{ getStockInPercentage(row) }}%</span>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column
              label="操作"
              width="100"
              fixed="right"
              align="center"
            >
              <template #default="{ row, $index }">
                <el-button
                  type="primary"
                  link
                  @click="toggleExpand($index)"
                >
                  {{ isExpanded($index) ? '收起' : '展开详情' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import {
  Document,
  Search,
  Files,
  Clock,
  CircleCheck,
  CircleClose,
  List,
  Money,
  Collection,
  Box,
  User,
  Edit,
  ShoppingCart,
  Van,
  RefreshLeft,
  FolderChecked,
} from '@element-plus/icons-vue';
import api from '../api';
import type {
  ProcurementLedgerResponse,
  ProcurementLedgerStats,
  ProcurementRequest,
  ProcurementOrder,
} from '../types';
import {
  PROC_REQ_STATUS_LABELS,
  PROC_REQ_STATUS_TAGS,
  PROCUREMENT_PRIORITY_LABELS,
  PROCUREMENT_PRIORITY_TAGS,
  PROC_ORDER_STATUS_LABELS,
  PROC_ORDER_STATUS_TAGS,
} from '../types';

const loading = ref(false);
const searchKeyword = ref('');
const filterStatus = ref<string>('');
const activePanels = ref<string[]>(['timeline', 'apply', 'review', 'purchase', 'arrival', 'return', 'stockin']);
const expandedRows = ref<Set<number>>(new Set());

const stats = ref<ProcurementLedgerStats>({
  totalRequests: 0,
  pendingRequests: 0,
  approvedRequests: 0,
  rejectedRequests: 0,
  totalOrders: 0,
  totalAmount: 0,
  totalItems: 0,
  totalStockIn: 0,
});

const requests = ref<ProcurementRequest[]>([]);

const statConfig = {
  totalRequests: { label: '总申请数', icon: Files, color: '#409eff' },
  pendingRequests: { label: '待审核数', icon: Clock, color: '#e6a23c' },
  approvedRequests: { label: '已通过数', icon: CircleCheck, color: '#67c23a' },
  rejectedRequests: { label: '已驳回数', icon: CircleClose, color: '#f56c6c' },
  totalOrders: { label: '总采购单数', icon: List, color: '#8e44ad' },
  totalAmount: { label: '采购总金额', icon: Money, color: '#27ae60' },
  totalItems: { label: '总书目数', icon: Collection, color: '#d35400' },
  totalStockIn: { label: '已入库册数', icon: Box, color: '#16a085' },
};

const filteredRequests = computed(() => {
  return requests.value.filter((r) => {
    const matchSearch = !searchKeyword.value ||
      r.requestNo?.includes(searchKeyword.value) ||
      r.subject?.includes(searchKeyword.value) ||
      r.requestedBy?.username?.includes(searchKeyword.value);
    const matchStatus = !filterStatus.value || r.status === filterStatus.value;
    return matchSearch && matchStatus;
  });
});

const filterData = () => {};

const fetchLedger = async () => {
  loading.value = true;
  try {
    const res = await api.get('/procurements/ledger');
    const data = res as ProcurementLedgerResponse;
    requests.value = data.requests || [];
    if (data.stats) {
      stats.value = data.stats;
    }
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

const toggleExpand = (index: number) => {
  if (expandedRows.value.has(index)) {
    expandedRows.value.delete(index);
  } else {
    expandedRows.value.add(index);
  }
};

const isExpanded = (index: number) => {
  return expandedRows.value.has(index);
};

const hasArrivalRecords = (row: ProcurementRequest) => {
  return row.orders?.some(o => o.arrivalRecords && o.arrivalRecords.length > 0);
};

const hasReturnRecords = (row: ProcurementRequest) => {
  return row.orders?.some(o => o.returnRecords && o.returnRecords.length > 0);
};

const getTotalRequestedQty = (row: ProcurementRequest) => {
  return row.items?.reduce((sum, item) => sum + (item.requestedQty || 0), 0) || 0;
};

const getTotalStockInQty = (row: ProcurementRequest) => {
  let total = 0;
  row.orders?.forEach((order) => {
    order.items?.forEach((item) => {
      total += item.stockInQty || 0;
    });
  });
  return total;
};

const getTotalOrderQty = (row: ProcurementRequest) => {
  let total = 0;
  row.orders?.forEach((order) => {
    order.items?.forEach((item) => {
      total += item.orderQty || 0;
    });
  });
  return total;
};

const getTotalReceivedQty = (row: ProcurementRequest) => {
  let total = 0;
  row.orders?.forEach((order) => {
    order.items?.forEach((item) => {
      total += item.receivedQty || 0;
    });
  });
  return total;
};

const getProgressStep = (row: ProcurementRequest) => {
  const orders = row.orders || [];
  if (orders.length === 0) return 0;

  const hasOrdered = orders.some(o => o.orderedAt);
  const totalOrderQty = getTotalOrderQty(row);
  const totalReceivedQty = getTotalReceivedQty(row);
  const totalStockInQty = getTotalStockInQty(row);

  if (!hasOrdered) return 1;
  if (totalReceivedQty === 0) return 2;
  if (totalStockInQty < totalOrderQty && totalStockInQty > 0) return 3;
  if (totalStockInQty >= totalOrderQty && totalOrderQty > 0) return 4;
  return 2;
};

const getArrivalPercentage = (row: ProcurementRequest) => {
  const total = getTotalOrderQty(row);
  if (total === 0) return 0;
  const received = getTotalReceivedQty(row);
  return Math.min(Math.round((received / total) * 100), 100);
};

const getStockInPercentage = (row: ProcurementRequest) => {
  const total = getTotalOrderQty(row);
  if (total === 0) return 0;
  const stockIn = getTotalStockInQty(row);
  return Math.min(Math.round((stockIn / total) * 100), 100);
};

const getArrivalProgressText = (row: ProcurementRequest) => {
  const received = getTotalReceivedQty(row);
  const total = getTotalOrderQty(row);
  return `${received}/${total}`;
};

const getStockInProgressText = (row: ProcurementRequest) => {
  const stockIn = getTotalStockInQty(row);
  const total = getTotalOrderQty(row);
  return `${stockIn}/${total}`;
};

const getStockInDetails = (row: ProcurementRequest) => {
  const map = new Map<number, any>();

  row.items?.forEach((reqItem) => {
    map.set(reqItem.id, {
      title: reqItem.title,
      isbn: reqItem.isbn,
      orderQty: 0,
      receivedQty: 0,
      returnedQty: 0,
      stockInQty: 0,
      bookCreated: false,
      bookUpdated: false,
    });
  });

  row.orders?.forEach((order) => {
    order.items?.forEach((orderItem) => {
      const existing = map.get(orderItem.requestItemId) || {
        title: orderItem.title,
        isbn: orderItem.isbn,
        orderQty: 0,
        receivedQty: 0,
        returnedQty: 0,
        stockInQty: 0,
        bookCreated: false,
        bookUpdated: false,
      };
      existing.orderQty += orderItem.orderQty || 0;
      existing.receivedQty += orderItem.receivedQty || 0;
      existing.returnedQty += orderItem.returnedQty || 0;
      existing.stockInQty += orderItem.stockInQty || 0;

      orderItem.arrivalItems?.forEach((ai) => {
        if (ai.stockInStatus) {
          existing.bookCreated = true;
          if (ai.stockInAt) existing.bookUpdated = true;
        }
      });

      map.set(orderItem.requestItemId, existing);
    });
  });

  return Array.from(map.values());
};

interface TimelineEvent {
  time: string;
  title: string;
  user: string;
  detail?: string;
  icon: any;
  type: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  color?: string;
}

const buildTimeline = (row: ProcurementRequest): TimelineEvent[] => {
  const events: TimelineEvent[] = [];

  events.push({
    time: formatDate(row.createdAt),
    title: '提交采购申请',
    user: row.requestedBy?.username || '',
    detail: `申请主题：${row.subject}，共 ${row.items?.length || 0} 个书目`,
    icon: Edit,
    type: 'primary',
  });

  if (row.reviewedAt) {
    const reviewType = row.status === 'REJECTED' ? 'danger' :
      row.status === 'PARTIAL_APPROVED' ? 'warning' : 'success';
    events.push({
      time: formatDate(row.reviewedAt),
      title: `审批完成（${PROC_REQ_STATUS_LABELS[row.status]}）`,
      user: row.reviewedBy?.username || '',
      detail: row.reviewNote,
      icon: reviewType === 'success' ? CircleCheck : CircleClose,
      type: reviewType as any,
    });
  }

  row.orders?.forEach((order) => {
    events.push({
      time: formatDate(order.createdAt),
      title: `创建采购单：${order.orderNo}`,
      user: order.createdBy?.username || '',
      detail: `供应商：${order.supplier}，金额：¥${order.totalAmount?.toFixed(2)}`,
      icon: ShoppingCart,
      type: 'info',
    });

    if (order.orderedAt) {
      events.push({
        time: formatDate(order.orderedAt),
        title: `采购单已下单：${order.orderNo}`,
        user: order.createdBy?.username || '',
        detail: `预计到货：${order.expectedArrival ? formatDate(order.expectedArrival) : '未设置'}`,
        icon: ShoppingCart,
        type: 'primary',
      });
    }

    order.arrivalRecords?.forEach((record) => {
      events.push({
        time: formatDate(record.arrivalDate),
        title: `到货登记：${record.arrivalNo}`,
        user: record.operator?.username || '',
        detail: `到货总数：${record.totalReceived} 册，采购单：${order.orderNo}`,
        icon: Van,
        type: 'warning',
      });

      record.items?.forEach((item) => {
        if (item.stockInStatus && item.stockInAt) {
          events.push({
            time: formatDate(item.stockInAt),
            title: `图书入库：${item.title}`,
            user: item.stockInBy?.username || '',
            detail: `ISBN: ${item.isbn}，入库 ${item.receivedQty} 册`,
            icon: FolderChecked,
            type: 'success',
          });
        }
      });
    });

    order.returnRecords?.forEach((record) => {
      events.push({
        time: formatDate(record.returnDate),
        title: `退货登记：${record.returnNo}`,
        user: record.operator?.username || '',
        detail: `退货 ${record.totalReturned} 册，退款 ¥${record.totalRefund?.toFixed(2)}`,
        icon: RefreshLeft,
        type: 'danger',
      });
    });

    if (order.completedAt) {
      events.push({
        time: formatDate(order.completedAt),
        title: `采购单完成：${order.orderNo}`,
        user: '',
        detail: `所有流程已完成`,
        icon: CircleCheck,
        type: 'success',
      });
    }
  });

  events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  return events;
};

onMounted(() => {
  fetchLedger();
});
</script>

<style scoped lang="scss">
.mt-20 { margin-top: 20px; }
.mb-20 { margin-bottom: 20px; }

.procurement-ledger-container {
  .stat-card {
    :deep(.el-statistic__head) {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stat-icon {
      font-size: 18px;
      margin-right: 4px;
    }
  }

  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #303133;

      .title-icon {
        color: #409eff;
        font-size: 20px;
      }
    }

    .header-filters {
      display: flex;
      align-items: center;
    }
  }

  .expand-content {
    padding: 10px 20px 20px;

    .timeline-card {
      margin-bottom: 4px;

      .timeline-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: #303133;
        margin-bottom: 6px;

        .event-icon {
          color: #409eff;
        }
      }

      .timeline-user {
        font-size: 12px;
        color: #909399;
        margin-bottom: 4px;
      }

      .timeline-detail {
        font-size: 13px;
        color: #606266;
      }
    }
  }

  .review-info {
    font-size: 12px;
    line-height: 1.6;
    color: #606266;

    .review-note {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .books-summary {
    .books-display {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 8px;

      .book-name {
        display: inline-block;
        max-width: 100px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
        padding: 2px 6px;
        background: #ecf5ff;
        color: #409eff;
        border-radius: 4px;
      }
    }

    .empty-books {
      color: #c0c4cc;
    }
  }

  .books-tooltip {
    max-height: 300px;
    overflow-y: auto;

    .tooltip-book-item {
      padding: 4px 0;
      font-size: 13px;
      display: flex;
      align-items: center;

      .book-index {
        color: #909399;
        margin-right: 4px;
      }
    }
  }

  .progress-wrapper {
    padding: 4px 0;

    .progress-bars {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;

      .progress-item {
        display: flex;
        align-items: center;
        gap: 8px;

        .progress-label {
          width: 36px;
          font-size: 12px;
          color: #606266;
          flex-shrink: 0;
        }

        :deep(.el-progress) {
          flex: 1;
          min-width: 0;
        }

        .progress-value {
          width: 40px;
          font-size: 12px;
          color: #909399;
          text-align: right;
          flex-shrink: 0;
        }
      }
    }
  }
}
</style>
