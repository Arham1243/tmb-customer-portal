import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useCookies } from 'vue3-cookies';
import { updateAbility } from '@/plugins/ability';
import { AuthService } from '@/services';
import { useGlobalStore } from '@/stores';

export const useSessionStore = defineStore('SessionStore', () => {
    const globalStore = useGlobalStore();
    const { cookies } = useCookies();
    const user = ref(null);
    const menuItems = ref([]);
    const myCompany = ref({});
    const permissions = ref([]);
    const userRole = ref({});
    const intendedRoute = ref(sessionStorage.getItem('intendedRoute'));

    const startUserSession = (data) => {
        const date = new Date();

        const authCookie = getCookie() || {};
        authCookie.access_token = data.access_token;
        authCookie.expires_in = date.setSeconds(
            date.getSeconds() + data.expires_in
        );

        if (data.refresh_token) {
            authCookie.refresh_token = data.refresh_token;
        }

        setCookie(authCookie);
    };

    const clearSessionState = () => {
        cookies.remove('tmb_cookie', null);
        sessionStorage.removeItem('email');
        user.value = null;
        permissions.value = [];
    };

    const setCookie = (value) => {
        cookies.set('tmb_cookie', value, '7d');
    };

    const getCookie = () => {
        return cookies.get('tmb_cookie');
    };

    const setEmail = (value) => {
        sessionStorage.setItem('email', value);
    };

    const getEmail = () => {
        return sessionStorage.getItem('email');
    };

    const me = async () => {
        try {
            const res = (await AuthService.me()).data;
            user.value = res.data;
            permissions.value = res.permissions;
            menuItems.value = res.menu_items;
            myCompany.value = res.my_company;
            userRole.value = res.role;
            updateAbility(permissions.value);
            return user.value;
        } catch (error) {
            throw error;
        }
    };

    const setIntended = (route) => {
        intendedRoute.value = route;
        sessionStorage.setItem('intendedRoute', route);
    };

    const consumeIntended = () => {
        const route = intendedRoute.value;
        intendedRoute.value = null;
        sessionStorage.removeItem('intendedRoute');
        return route;
    };

    return {
        startUserSession,
        clearSessionState,
        me,
        user,
        permissions,
        menuItems,
        myCompany,
        userRole,

        setEmail,
        setCookie,
        getCookie,

        getEmail,
        setIntended,
        consumeIntended
    };
});
