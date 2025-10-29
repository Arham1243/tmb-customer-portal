import AxiosService from './Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/customer-portal/auth`;

export const login = (payload) => {
    return AxiosService.post(`${BASE_URL}/login`, payload);
};

export const logout = () => {
    return AxiosService.post(`${BASE_URL}/logout`);
};

export const forgotPassword = (payload) => {
    return AxiosService.post(`${BASE_URL}/password/forgot`, payload);
};

export const resetPassword = (payload) => {
    return AxiosService.post(`${BASE_URL}/password/reset`, payload);
};

export const setupPassword = (payload) => {
    return AxiosService.post(`${BASE_URL}/password/set`, payload);
};

export const me = () => {
    return AxiosService.get(`${BASE_URL}/me`);
};
