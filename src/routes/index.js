import { createRouter, createWebHistory } from 'vue-router';
import routes from './routes';
import { useSessionStore, useGlobalStore } from '@/stores';
import { ability } from '@/plugins/ability';

const router = createRouter({
    history: createWebHistory(),
    routes: routes
});

router.beforeEach(async (to, from, next) => {
    const sessionStore = useSessionStore();
    const { access_token: accessToken } = sessionStore.getCookie() || {};

    const isAuth = to.path.startsWith('/auth');

    if (!accessToken) {
        if (isAuth) {
            next();
        } else {
            sessionStore.setIntended(to.fullPath);
            next({ name: 'Login' });
        }
    } else if (accessToken && !isAuth) {
        next();
    } else {
        next({ name: 'Dashboard' });
    }
});

router.beforeEach(async (to, from, next) => {
    const globalStore = useGlobalStore();

    let requiredPermissions = to.meta.permission;

    globalStore.setRouteForbidden(false);

    if (!requiredPermissions) {
        return next();
    }

    const sessionStore = useSessionStore();
    if (!sessionStore.user) {
        try {
            await sessionStore.me();
        } catch (err) {
            /* empty */
        }
    }

    requiredPermissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    const hasPermission = requiredPermissions.some((permission) => {
        return ability.can(permission);
    });

    if (!hasPermission) {
        if (to.meta.hasTabs) {
            const parentRecord = to.matched[to.matched.length - 2];

            const children = parentRecord?.children || [];

            for (const child of children) {
                let childPerms = child.meta?.permission;
                if (!childPerms) {
                    return next({ name: child.name });
                }

                childPerms = Array.isArray(childPerms) ? childPerms : [childPerms];

                const canViewChild = childPerms.some((p) => ability.can(p));
                if (canViewChild) {
                    return next({ name: child.name });
                }
            }
        }
        globalStore.setRouteForbidden(true);
    }

    next();
});

export default router;
