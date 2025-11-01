import AppLayout from '@/layout/AppLayout.vue';
import AuthLayout from '@/layout/AuthLayout.vue';

export default [
    {
        path: '/',
        component: AppLayout,
        children: [
            {
                path: '/',
                name: 'Dashboard',
                component: () => import('@/views/dashboard/index.vue')
            },
            {
                path: '/checkout',
                name: 'Checkout',
                component: () => import('@/views/dashboard/checkout.vue')
            },
            {
                path: 'history',
                name: 'History',
                component: () => import('@/views/dashboard/history.vue')
            },
            {
                path: 'profile',
                name: 'Profile',
                component: () => import('@/views/dashboard/profile.vue')
            }
        ]
    },
    {
        path: '/auth',
        component: AuthLayout,
        children: [
            {
                path: 'login/:customer_id',
                name: 'Login',
                component: () => import('@/views/auth/Login.vue')
            },
            {
                path: 'register/:customer_id',
                name: 'Register',
                component: () => import('@/views/auth/Register.vue')
            },
            {
                path: 'password/forget/:customer_id',
                name: 'Password Reset Request',
                component: () => import('@/views/auth/PasswordResetRequest.vue')
            },
            {
                path: 'password/reset/:customer_id',
                name: 'New Password Setup',
                component: () => import('@/views/auth/PasswordResetForm.vue')
            }
        ]
    },
    {
        path: '/:pathMatch(.*)*',
        component: () => import('@/views/errors/NotFound.vue')
    }
];
