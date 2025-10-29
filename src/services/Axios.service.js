import axios from 'axios';
import { useSessionStore } from '@/stores';

const axiosApi = axios.create({
    headers: {
        Accept: 'application/json'
    }
});

axiosApi.interceptors.request.use(
    async (config) => {
        const sessionStore = useSessionStore();
        const authCookie = sessionStore.getCookie() || {};
        const { access_token } = authCookie;
        config.headers['authorization'] = `Bearer ${access_token}`;
        config.headers['accept-language'] = 'en';
        return config;
    },
    (error) => Promise.reject(error)
);

axiosApi.interceptors.response.use(
    (response) => response,
    async (error) => {
        const sessionStore = useSessionStore();

        if (error.response && error.response.status === 401) {
            sessionStore.clearSessionState();
            window.location.reload();
        }

        return Promise.reject(error);
    }
);

export default axiosApi;
