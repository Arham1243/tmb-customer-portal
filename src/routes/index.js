import { createRouter, createWebHistory } from 'vue-router';
import routes from './routes';
import { useSessionStore } from '@/stores';

const router = createRouter({
    history: createWebHistory(),
    routes: routes
});

router.beforeEach(async (to, from, next) => {
    const sessionStore = useSessionStore();
    const currentCustomerUuid = sessionStore.user?.uuid;
    const { access_token: accessToken } = sessionStore.getCookie() || {};

    const isAuth = to.path.startsWith('/auth');

    if (!accessToken) {
        if (isAuth) {
            next();
        } else {
            next({
                name: 'Login',
                params: { customer_id: currentCustomerUuid }
            });
        }
    } else if (accessToken && !isAuth) {
        next();
    } else {
        next({ name: 'Dashboard' });
    }
});

export default router;
