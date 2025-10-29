import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const search = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/project-tasks/search`, payload, {
        params
    });
};

export const list = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/project-tasks/list`, payload, {
        params
    });
};

export const getTemplates = (projectId, params) => {
    return AxiosService.get(
        `${BASE_URL}/projects/${projectId}/templates/available`,
        {
            params
        }
    );
};

export const create = (payload) => {
    return AxiosService.post(`${BASE_URL}/project-tasks`, payload);
};

export const update = (id, payload) => {
    return AxiosService.put(`${BASE_URL}/project-tasks/${id}`, payload);
};

export const changeStatus = (id, payload) => {
    return AxiosService.post(
        `${BASE_URL}/project-tasks/${id}/change-status`,
        payload
    );
};

export const deleteItem = (id) => {
    return AxiosService.delete(`${BASE_URL}/project-tasks/${id}`);
};

export const getMaxOrder = (params) => {
    return AxiosService.get(`${BASE_URL}/project-tasks/max-order`, {
        params
    });
};
