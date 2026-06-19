import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '../store/user';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
      meta: { guest: true },
    },
    {
      path: '/kiosk',
      name: 'BookKiosk',
      component: () => import('../views/BookKiosk.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('../layout/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('../views/Dashboard.vue'),
        },
        {
          path: 'books',
          name: 'Books',
          component: () => import('../views/Books.vue'),
        },
        {
          path: 'series',
          name: 'Series',
          component: () => import('../views/SeriesList.vue'),
        },
        {
          path: 'series/:id',
          name: 'SeriesDetail',
          component: () => import('../views/SeriesDetail.vue'),
        },
        {
          path: 'purchase-requests',
          name: 'PurchaseRequests',
          component: () => import('../views/PurchaseRequests.vue'),
        },
        {
          path: 'categories',
          name: 'Categories',
          component: () => import('../views/Categories.vue'),
        },
        {
          path: 'borrowers',
          name: 'Borrowers',
          component: () => import('../views/Borrowers.vue'),
        },
        {
          path: 'system-settings',
          name: 'SystemSettings',
          component: () => import('../views/SystemSettings.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'borrows',
          name: 'Borrows',
          component: () => import('../views/Borrows.vue'),
        },
        {
          path: 'current-borrows',
          name: 'CurrentBorrows',
          component: () => import('../views/CurrentBorrows.vue'),
        },
        {
          path: 'schedule',
          name: 'Schedule',
          component: () => import('../views/Schedule.vue'),
        },
        {
          path: 'shift-swaps',
          name: 'ShiftSwaps',
          component: () => import('../views/ShiftSwaps.vue'),
        },
        {
          path: 'recommendations',
          name: 'Recommendations',
          component: () => import('../views/Recommendations.vue'),
        },
        {
          path: 'messages',
          name: 'Messages',
          component: () => import('../views/Messages.vue'),
        },
        {
          path: 'report-center',
          name: 'ReportCenter',
          component: () => import('../views/ReportCenter.vue'),
        },
        {
          path: 'interlibrary-loans',
          name: 'InterLibraryLoans',
          component: () => import('../views/InterLibraryLoans.vue'),
        },
        {
          path: 'interlibrary-loans/:id',
          name: 'InterLibraryLoanDetail',
          component: () => import('../views/InterLibraryLoanDetail.vue'),
        },
        {
          path: 'compensations',
          name: 'Compensations',
          component: () => import('../views/Compensations.vue'),
        },
        {
          path: 'procurement-requests',
          name: 'ProcurementRequests',
          component: () => import('../views/ProcurementRequests.vue'),
        },
        {
          path: 'procurement-orders',
          name: 'ProcurementOrders',
          component: () => import('../views/ProcurementOrders.vue'),
        },
        {
          path: 'procurement-ledger',
          name: 'ProcurementLedger',
          component: () => import('../views/ProcurementLedger.vue'),
        },

      ],
    },
  ],
});

router.beforeEach((to, _, next) => {
  const userStore = useUserStore();
  if (to.meta.public) {
    next();
  } else if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    next('/login');
  } else if (to.meta.requiresAdmin && !userStore.isAdmin) {
    next('/');
  } else if (to.meta.guest && userStore.isAuthenticated) {
    next('/');
  } else {
    next();
  }
});

export default router;
