import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const search = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/payment-terms/search`, payload, {
        params
    });
};

export const list = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/payment-terms/list`, payload, {
        params
    });
};

export const create = (payload) => {
    return AxiosService.post(`${BASE_URL}/payment-terms`, payload);
};

export const update = (id, payload) => {
    return AxiosService.put(`${BASE_URL}/payment-terms/${id}`, payload);
};

export const changeStatus = (id, payload) => {
    return AxiosService.post(
        `${BASE_URL}/payment-terms/${id}/change-status`,
        payload
    );
};

export const deleteItem = (id) => {
    return AxiosService.delete(`${BASE_URL}/payment-terms/${id}`);
};

export const makeDefault = (id) => {
    return AxiosService.post(`${BASE_URL}/payment-terms/${id}/make-default`);
};
