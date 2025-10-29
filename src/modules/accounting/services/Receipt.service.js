import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const search = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/receipts/search`, payload, {
        params
    });
};

export const getItem = (id, params) => {
    return AxiosService.get(`${BASE_URL}/receipts/${id}`, { params });
};

export const create = (payload) => {
    return AxiosService.post(`${BASE_URL}/receipts`, payload);
};
