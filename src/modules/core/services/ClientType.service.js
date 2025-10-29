import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const search = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/client-types/search`, payload, {
        params
    });
};

export const getItem = (id, params) => {
    return AxiosService.get(`${BASE_URL}/client-types/${id}`, { params });
};

export const create = (payload) => {
    return AxiosService.post(`${BASE_URL}/client-types`, payload);
};

export const update = (id, payload) => {
    return AxiosService.put(`${BASE_URL}/client-types/${id}`, payload);
};

export const changeStatus = (id, payload) => {
    return AxiosService.post(
        `${BASE_URL}/client-types/${id}/change-status`,
        payload
    );
};

export const deleteItem = (id) => {
    return AxiosService.delete(`${BASE_URL}/client-types/${id}`);
};
