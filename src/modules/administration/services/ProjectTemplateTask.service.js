import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const search = (payload, params) => {
    return AxiosService.post(
        `${BASE_URL}/project-task-templates/search`,
        payload,
        {
            params
        }
    );
};

export const create = (payload) => {
    return AxiosService.post(`${BASE_URL}/project-task-templates`, payload);
};

export const update = (id, payload) => {
    return AxiosService.put(
        `${BASE_URL}/project-task-templates/${id}`,
        payload
    );
};

export const changeStatus = (id, payload) => {
    return AxiosService.post(
        `${BASE_URL}/project-task-templates/${id}/change-status`,
        payload
    );
};

export const deleteItem = (id) => {
    return AxiosService.delete(`${BASE_URL}/project-task-templates/${id}`);
};

export const changeOrder = (id, payload) => {
    return AxiosService.post(
        `${BASE_URL}/project-task-templates/${id}/change-order`,
        payload
    );
};

export const getMaxOrder = () => {
    return AxiosService.get(`${BASE_URL}/project-task-templates/max-order`);
};
