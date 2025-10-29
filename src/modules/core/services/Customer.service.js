import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const search = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/customers/search`, payload, {
        params
    });
};

export const list = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/customers/list`, payload, {
        params
    });
};

export const getItem = (id, params) => {
    return AxiosService.get(`${BASE_URL}/customers/${id}`, { params });
};

export const create = (payload) => {
    return AxiosService.post(`${BASE_URL}/customers`, payload);
};

export const update = (id, payload) => {
    return AxiosService.put(`${BASE_URL}/customers/${id}`, payload);
};

export const changeStatus = (id, payload) => {
    return AxiosService.post(
        `${BASE_URL}/customers/${id}/change-status`,
        payload
    );
};

export const deleteItem = (id) => {
    return AxiosService.delete(`${BASE_URL}/customers/${id}`);
};

export const searchPortalAudit = (payload, params) => {
    return Promise.resolve({
        data: {
            data: [],
            meta: {
                total: 0
            }
        }
    });
};

export const searchFinancials = (payload, params) => {
    return Promise.resolve({
        data: {
            data: [],
            meta: {
                total: 0
            }
        }
    });
};

export const searchActivities = (payload, params) => {
    return Promise.resolve({
        data: {
            data: [],
            meta: {
                total: 0
            }
        }
    });
};

export const searchProjects = (payload, params) => {
    return Promise.resolve({
        data: {
            data: [],
            meta: {
                total: 0
            }
        }
    });
};
