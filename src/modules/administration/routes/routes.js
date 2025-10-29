import AppLayout from '@/layout/AppLayout.vue';

export default [
    {
        path: '/administration',
        component: AppLayout,
        redirect: '/administration/company',
        children: [
            {
                path: 'company',
                name: 'Company',
                component: () =>
                    import('@/modules/administration/views/company/index.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'Administration' },
                        { label: 'My Company' }
                    ],
                    permission: ['administration.view']
                }
            },
            {
                path: 'contact-types',
                name: 'Contact Types',
                component: () =>
                    import(
                        '@/modules/administration/views/contact-type/index.vue'
                    ),
                meta: {
                    breadcrumb: [
                        { label: 'Administration' },
                        { label: 'Contact Types' }
                    ],
                    permission: ['administration.view']
                }
            },
            {
                path: 'project-types',
                name: 'Project Types',
                component: () =>
                    import(
                        '@/modules/administration/views/project-type/index.vue'
                    ),
                meta: {
                    breadcrumb: [
                        { label: 'Administration' },
                        { label: 'Project Types' }
                    ],
                    permission: ['administration.view']
                }
            },
            {
                path: 'project-tasks',
                name: 'Project Tasks',
                component: () =>
                    import(
                        '@/modules/administration/views/project-task/index.vue'
                    ),
                meta: {
                    breadcrumb: [
                        { label: 'Administration' },
                        { label: 'Project Tasks' }
                    ],
                    permission: ['administration.view']
                }
            },
            {
                path: 'revenue-categories',
                name: 'Revenue Categories',
                component: () =>
                    import(
                        '@/modules/administration/views/revenue-category/index.vue'
                    ),
                meta: {
                    breadcrumb: [
                        { label: 'Administration' },
                        { label: 'Revenue Categories' }
                    ],
                    permission: ['administration.view']
                }
            },
            {
                path: 'expense-categories',
                name: 'Expense Categories',
                component: () =>
                    import(
                        '@/modules/administration/views/expense-category/index.vue'
                    ),
                meta: {
                    breadcrumb: [
                        { label: 'Administration' },
                        { label: 'Expense Categories' }
                    ],
                    permission: ['administration.view']
                }
            },
            {
                path: 'minimum-charges',
                name: 'Minimum Charges',
                component: () =>
                    import(
                        '@/modules/administration/views/minimum-charge/index.vue'
                    ),
                meta: {
                    breadcrumb: [
                        { label: 'Administration' },
                        { label: 'Minimum Charges' }
                    ],
                    permission: ['administration.view']
                }
            },
            {
                path: 'payment-methods',
                name: 'Payment Methods',
                component: () =>
                    import(
                        '@/modules/administration/views/payment-method/index.vue'
                    ),
                meta: {
                    breadcrumb: [
                        { label: 'Administration' },
                        { label: 'Payment Methods' }
                    ],
                    permission: ['administration.view']
                }
            },
            {
                path: 'payment-terms',
                name: 'Payment Terms',
                component: () =>
                    import(
                        '@/modules/administration/views/payment-term/index.vue'
                    ),
                meta: {
                    breadcrumb: [
                        { label: 'Administration' },
                        { label: 'Payment Terms' }
                    ],
                    permission: ['administration.view']
                }
            },
            {
                path: 'deduction-types',
                name: 'Deduction Types',
                component: () =>
                    import(
                        '@/modules/administration/views/deduction-type/index.vue'
                    ),
                meta: {
                    breadcrumb: [
                        { label: 'Administration' },
                        { label: 'Deduction Types' }
                    ],
                    permission: ['administration.view']
                }
            },
            {
                path: 'credit-cards',
                name: 'Credit Cards',
                component: () =>
                    import(
                        '@/modules/administration/views/credit-card/index.vue'
                    ),
                meta: {
                    breadcrumb: [
                        { label: 'Administration' },
                        { label: 'Credit Cards' }
                    ],
                    permission: ['administration.view']
                }
            },
            {
                path: 'users',
                children: [
                    {
                        path: '',
                        name: 'Users',
                        component: () =>
                            import(
                                '@/modules/administration/views/user/list.vue'
                            ),
                        meta: {
                            breadcrumb: [
                                { label: 'Administration' },
                                { label: 'Users' }
                            ],
                            permission: ['administration.view']
                        }
                    },
                    {
                        path: 'new',
                        name: 'NewUser',
                        component: () =>
                            import(
                                '@/modules/administration/views/user/new.vue'
                            ),
                        meta: {
                            breadcrumb: [
                                { label: 'Administration' },
                                {
                                    label: 'Users',
                                    route: '/administration/users'
                                }
                            ],
                            permission: ['administration.view']
                        }
                    },
                    {
                        path: ':id/edit',
                        name: 'EditUser',
                        component: () =>
                            import(
                                '@/modules/administration/views/user/edit.vue'
                            ),
                        meta: {
                            breadcrumb: [
                                { label: 'Administration' },
                                {
                                    label: 'Users',
                                    route: '/administration/users'
                                }
                            ],
                            permission: ['administration.edit']
                        }
                    }
                ]
            },
            {
                path: 'roles',
                component: () =>
                    import('@/modules/administration/views/role/index.vue'),
                children: [
                    {
                        path: '',
                        name: 'User Roles',
                        component: () =>
                            import(
                                '@/modules/administration/views/role/role.vue'
                            ),
                        meta: {
                            breadcrumb: [
                                { label: 'Administration' },
                                { label: 'User Roles' }
                            ],
                            permission: ['administration.view']
                        }
                    },
                    {
                        path: ':id/permissions',
                        name: 'RolePermissions',
                        component: () =>
                            import(
                                '@/modules/administration/views/role/permission.vue'
                            ),
                        meta: {
                            breadcrumb: [
                                { label: 'Administration' },
                                {
                                    label: 'User Roles',
                                    route: '/administration/roles'
                                }
                            ],
                            permission: ['administration.view']
                        }
                    }
                ]
            },
            {
                path: 'email-templates',
                children: [
                    {
                        path: '',
                        name: 'EmailTemplates',
                        component: () =>
                            import(
                                '@/modules/administration/views/email-template/list.vue'
                            ),
                        meta: {
                            breadcrumb: [
                                { label: 'Administration' },
                                { label: 'Email Templates' }
                            ],
                            permission: ['administration.view']
                        }
                    },
                    {
                        path: ':id/edit',
                        name: 'EditEmailTemplate',
                        component: () =>
                            import(
                                '@/modules/administration/views/email-template/edit.vue'
                            ),
                        meta: {
                            breadcrumb: [
                                { label: 'Administration' },
                                {
                                    label: 'Email Templates',
                                    route: '/administration/email-templates'
                                }
                            ],
                            permission: ['administration.edit']
                        }
                    }
                ]
            },
            {
                path: 'invoice-templates',
                children: [
                    {
                        path: '',
                        name: 'InvoiceTemplates',
                        component: () =>
                            import(
                                '@/modules/administration/views/invoice-template/list.vue'
                            ),
                        meta: {
                            breadcrumb: [
                                { label: 'Administration' },
                                { label: 'Invoice Templates' }
                            ],
                            permission: ['administration.view']
                        }
                    },
                    {
                        path: ':id/edit',
                        name: 'EditInvoiceTemplate',
                        component: () =>
                            import(
                                '@/modules/administration/views/invoice-template/edit.vue'
                            ),
                        meta: {
                            breadcrumb: [
                                { label: 'Administration' },
                                {
                                    label: 'Invoice Templates',
                                    route: '/administration/invoice-templates'
                                }
                            ],
                            permission: ['administration.edit']
                        }
                    }
                ]
            }
        ]
    }
];
