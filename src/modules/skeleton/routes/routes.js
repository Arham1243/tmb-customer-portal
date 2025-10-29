import AppLayout from '@/layout/AppLayout.vue';

export default [
    {
        path: '/skeleton',
        component: AppLayout,
        children: [
            {
                path: '/skeleton',
                name: 'Skeleton',
                meta: { breadcrumb: ['Skeleton'] },
                component: () =>
                    import('@/modules/skeleton/components/SkeletonIndex.vue')
            }
        ]
    }
];
