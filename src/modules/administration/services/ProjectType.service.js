import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const search = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/project-types/search`, payload, {
        params
    });
};

export const list = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/project-types/list`, payload, {
        params
    });
};

export const create = (payload) => {
    return AxiosService.post(`${BASE_URL}/project-types`, payload);
};

export const update = (id, payload) => {
    return AxiosService.put(`${BASE_URL}/project-types/${id}`, payload);
};

export const changeStatus = (id, payload) => {
    return AxiosService.post(
        `${BASE_URL}/project-types/${id}/change-status`,
        payload
    );
};

export const changeOrder = (id, payload) => {
    return AxiosService.post(
        `${BASE_URL}/project-types/${id}/change-order`,
        payload
    );
};

export const deleteItem = (id) => {
    return AxiosService.delete(`${BASE_URL}/project-types/${id}`);
};

export const getMaxOrder = () => {
    return AxiosService.get(`${BASE_URL}/project-types/max-order`);
};
