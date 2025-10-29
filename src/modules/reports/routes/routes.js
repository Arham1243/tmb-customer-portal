import AppLayout from '@/layout/AppLayout.vue';

export default [
    {
        path: '/reports',
        component: AppLayout,
        children: [
            {
                path: 'timesheets',
                name: 'Timesheets Reports',
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Timesheets' }
                    ],
                    permission: ['reports.view']
                },
                component: () =>
                    import('@/modules/reports/views/report/timesheet.vue')
            },
            {
                path: 'expenses',
                name: 'Expenses Reports',
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Expenses' }
                    ],
                    permission: ['reports.view']
                },
                component: () =>
                    import('@/modules/reports/views/report/expense.vue')
            },
            {
                path: 'invoices',
                name: 'Invoices Reports',
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Invoices' }
                    ],
                    permission: ['reports.view']
                },
                component: () =>
                    import('@/modules/reports/views/report/invoice.vue')
            },
            {
                path: 'receipts',
                name: 'Receipts Reports',
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Receipts' }
                    ],
                    permission: ['reports.view']
                },
                component: () =>
                    import('@/modules/reports/views/report/receipt.vue')
            }
        ]
    }
];
