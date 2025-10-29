import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const search = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/revenue-categories/search`, payload, {
        params
    });
};

export const list = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/revenue-categories/list`, payload, {
        params
    });
};

export const create = (payload) => {
    return AxiosService.post(`${BASE_URL}/revenue-categories`, payload);
};

export const update = (id, payload) => {
    return AxiosService.put(`${BASE_URL}/revenue-categories/${id}`, payload);
};

export const changeStatus = (id, payload) => {
    return AxiosService.post(
        `${BASE_URL}/revenue-categories/${id}/change-status`,
        payload
    );
};

export const deleteItem = (id) => {
    return AxiosService.delete(`${BASE_URL}/revenue-categories/${id}`);
};

export const makeDefault = (id) => {
    return AxiosService.post(
        `${BASE_URL}/revenue-categories/${id}/make-default`
    );
};
