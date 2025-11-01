import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useCookies } from 'vue3-cookies';
import { AuthService } from '@/services';

export const useSessionStore = defineStore('SessionStore', () => {
    const { cookies } = useCookies();
    const user = ref(null);
    const customerCompany = ref(null);
    const myCompany = ref({});
    const info = ref({});
    const customer = ref(null);

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
        cookies.remove('tmb_customer_portal_cookie', null);
        sessionStorage.removeItem('email');
        user.value = null;
    };

    const setCookie = (value) => {
        cookies.set('tmb_customer_portal_cookie', value, '7d');
    };

    const getCookie = () => {
        return cookies.get('tmb_customer_portal_cookie');
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
            customer.value = res.customer;
            myCompany.value = res.my_company;
            info.value = res.info;
            return user.value;
        } catch (error) {
            throw error;
        }
    };

    const meCustomer = async () => {
        try {
            const res = await AuthService.meCustomer();
            customerCompany.value = res?.data?.my_company;
            return customerCompany.value;
        } catch (error) {
            throw error;
        }
    };

    return {
        startUserSession,
        clearSessionState,
        me,
        meCustomer,
        user,
        customer,
        customerCompany,
        myCompany,
        info,
        setEmail,
        setCookie,
        getCookie,

        getEmail
    };
});
