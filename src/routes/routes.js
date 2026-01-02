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
                path: 'login',
                name: 'Login',
                component: () => import('@/views/auth/Login.vue')
            },
            {
                path: 'register',
                name: 'Register',
                component: () => import('@/views/auth/Register.vue')
            },
            {
                path: 'password/forget',
                name: 'Password Reset Request',
                component: () => import('@/views/auth/PasswordResetRequest.vue')
            },
            {
                path: 'password/reset',
                name: 'New Password Setup',
                component: () => import('@/views/auth/PasswordResetForm.vue')
            },
            {
                path: 'verify/email',
                name: 'CodeVerification',
                component: () => import('@/views/auth/VerifyEmailCode.vue')
            }
        ]
    },
    {
        path: '/:pathMatch(.*)*',
        component: () => import('@/views/errors/NotFound.vue')
    }
];
