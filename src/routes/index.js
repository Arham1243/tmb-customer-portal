import { createRouter, createWebHistory } from 'vue-router';
import routes from './routes';
import { useSessionStore, useGlobalStore } from '@/stores';

const router = createRouter({
    history: createWebHistory(),
    routes: routes
});

router.beforeEach(async (to, from, next) => {
    const sessionStore = useSessionStore();
    const globalStore = useGlobalStore();

    const { access_token: accessToken } = sessionStore.getCookie() || {};
    const isAuth = to.path.startsWith('/auth');

    // Reset forbidden state
    globalStore.setRouteForbidden(false);

    // Not logged in
    if (!accessToken) {
        if (isAuth) return next();
        return next({ name: 'Login' });
    }

    // Logged in, prevent going to auth pages
    if (accessToken && isAuth) return next({ name: 'SelectCustomer' });

    // Ensure user is loaded
    if (!sessionStore.user) {
        try {
            await sessionStore.me();
        } catch (err) {
            return next({ name: 'Login' });
        }
    }

    // Only check menu_flag
    const menuFlag = to.meta.menu_flag || null;
    const hasMenu =
        !menuFlag || (sessionStore.menuLimits || []).includes(menuFlag);

    if (!hasMenu) {
        globalStore.setRouteForbidden(true);
        return next();
    }

    // Everything okay
    next();
});

export default router;
