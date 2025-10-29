import AppLayout from '@/layout/AppLayout.vue';

export default [
    {
        path: '/customers',
        component: AppLayout,
        children: [
            {
                path: '',
                name: 'Customers',
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Customers' }
                    ],
                    permission: ['customers.view']
                },
                component: () =>
                    import('@/modules/core/views/customer/index.vue')
            },
            {
                path: ':id/edit',
                name: 'EditCustomer',
                component: () =>
                    import('@/modules/core/views/customer/edit.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        {
                            label: 'Customers',
                            route: '/customers'
                        }
                    ],
                    permission: ['customers.edit']
                }
            },
            {
                path: 'groups',
                name: 'CustomerGroups',
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Customer Groups' }
                    ],
                    permission: ['customers.view']
                },
                component: () =>
                    import('@/modules/core/views/customer-group/index.vue')
            },
            {
                path: 'client-types',
                name: 'ClientTypes',
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Client Types' }
                    ],
                    permission: ['customers.view']
                },
                component: () =>
                    import('@/modules/core/views/client-type/index.vue')
            }
        ]
    },
    {
        path: '/projects',
        component: AppLayout,
        children: [
            {
                path: '',
                name: 'Projects',
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Projects' }
                    ],
                    permission: ['projects.view']
                },
                component: () =>
                    import('@/modules/core/views/project/index.vue')
            },
            {
                path: ':id/edit',
                name: 'EditProject',
                component: () =>
                    import('@/modules/core/views/project/edit.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        {
                            label: 'Projects',
                            route: '/projects'
                        }
                    ],
                    permission: ['projects.edit']
                }
            }
        ]
    },
    {
        path: '/expenses',
        component: AppLayout,
        children: [
            {
                path: '',
                name: 'Expenses',
                component: () =>
                    import('@/modules/core/views/expense/index.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Expenses' }
                    ],
                    permission: ['expenses.view']
                }
            },
            {
                path: 'add/:user_id',
                name: 'ExpensesAdd',
                component: () =>
                    import('@/modules/core/views/expense/form.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Expenses', route: '/expenses' }
                    ],
                    permission: ['expenses.create']
                }
            },
            {
                path: ':id/edit/:user_id',
                name: 'ExpensesEdit',
                component: () =>
                    import('@/modules/core/views/expense/form.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Expenses', route: '/expenses' }
                    ]
                }
            },
            {
                path: 'approvals',
                name: 'Expense Approvals',
                component: () =>
                    import('@/modules/core/views/approval/expense.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Approvals' },
                        { label: 'Expenses' }
                    ],
                    permission: ['approvals.expenses.view']
                }
            }
        ]
    },
    {
        path: '/timesheets',
        component: AppLayout,
        children: [
            {
                path: '',
                name: 'Timesheets',
                component: () =>
                    import('@/modules/core/views/timesheet/index.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Timesheets' }
                    ],
                    permission: ['timesheets.view']
                }
            },
            {
                path: 'add/day/:user_id',
                name: 'TimesheetAddDay',
                component: () =>
                    import('@/modules/core/views/timesheet/day/create.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Timesheets', route: '/timesheets' }
                    ],
                    permission: ['timesheets.create']
                }
            },
            {
                path: 'edit/day/:user_id/:date',
                name: 'TimesheetEditDay',
                component: () =>
                    import('@/modules/core/views/timesheet/day/edit.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Timesheets', route: '/timesheets' }
                    ],
                    permission: ['timesheets.edit']
                }
            },
            {
                path: 'weekly/:user_id',
                name: 'TimesheetWeekly',
                component: () =>
                    import('@/modules/core/views/timesheet/week/create.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Timesheets', route: '/timesheets' }
                    ],
                    permission: ['timesheets.create']
                }
            },
            {
                path: 'approvals',
                name: 'Timesheets Approvals',
                component: () =>
                    import('@/modules/core/views/approval/timesheet.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Dashboard', route: '/' },
                        { label: 'Approvals' },
                        { label: 'Timesheets' }
                    ],
                    permission: ['approvals.timesheets.view']
                }
            }
        ]
    }
];
