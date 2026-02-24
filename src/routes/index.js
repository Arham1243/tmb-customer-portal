import { createRouter, createWebHistory } from 'vue-router';
import routes from './routes';
import { useSessionStore } from '@/stores';

const router = createRouter({
    history: createWebHistory(),
    routes: routes
});

router.beforeEach(async (to, from, next) => {
    const sessionStore = useSessionStore();
    const { access_token: accessToken } = sessionStore.getCookie() || {};

    const isAuth = to.path.startsWith('/auth');
    const isSelectCustomer = to.name === 'SelectCustomer';

    if (!accessToken) {
        if (isAuth) {
            next();
        } else {
            next({
                name: 'Login'
            });
        }
    } else if (accessToken && !isAuth) {
        next();
    } else {
        next({ name: 'SelectCustomer' });
    }
});

export default router;
