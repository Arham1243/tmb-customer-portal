import AppLayout from '@/layout/AppLayout.vue';

export default [
    {
        path: '/invoices',
        component: AppLayout,
        children: [
            {
                path: '',
                name: 'Invoices',
                component: () =>
                    import('@/modules/accounting/views/invoice/index.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Invoices' }
                    ],
                    permission: ['invoicing.create.view']
                }
            },
            {
                path: 'create/:customer_id',
                name: 'CreateInvoiceCustomer',
                component: () =>
                    import('@/modules/accounting/views/invoice/create.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Invoices', route: '/invoices' }
                    ],
                    permission: ['invoicing.create.create']
                }
            },
            {
                path: 'approvals',
                name: 'InvoiceApprovals',
                component: () =>
                    import('@/modules/accounting/views/approval/index.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Invoices Approval' }
                    ],
                    permission: ['invoicing.approve.view']
                }
            },
            {
                path: 'approvals/:id',
                name: 'InvoiceApprovalDetails',
                component: () =>
                    import('@/modules/accounting/views/approval/details.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        {
                            label: 'Invoices Approval',
                            route: '/invoices/approvals'
                        }
                    ],
                    permission: ['invoicing.approve.edit']
                }
            }
        ]
    },
    {
        path: '/receipts',
        component: AppLayout,
        children: [
            {
                path: '',
                name: 'Receipts',
                component: () =>
                    import('@/modules/accounting/views/receipts/index.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Receipts' }
                    ],
                    permission: ['receipts.view']
                }
            },
            {
                path: 'generate',
                name: 'ReceiptsGenerate',
                component: () =>
                    import('@/modules/accounting/views/receipts/generate.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Receipts', route: '/receipts' },
                        { label: 'Generate' }
                    ],
                    permission: ['receipts.create']
                }
            },
            {
                path: ':id/details',
                name: 'ReceiptsDetails',
                component: () =>
                    import('@/modules/accounting/views/receipts/details.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Receipts', route: '/receipts' },
                        { label: 'Details' }
                    ],
                    permission: ['receipts.view']
                }
            }
        ]
    }
];
