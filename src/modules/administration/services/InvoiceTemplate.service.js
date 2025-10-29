import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const search = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/invoice-templates/search`, payload, {
        params
    });
};

export const list = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/invoice-templates/list`, payload, {
        params
    });
};

export const getItem = (id, params) => {
    return AxiosService.get(`${BASE_URL}/invoice-templates/${id}`, { params });
};

export const update = (id, payload) => {
    return AxiosService.put(`${BASE_URL}/invoice-templates/${id}`, payload);
};

export const makeDefault = (id) => {
    return AxiosService.post(
        `${BASE_URL}/invoice-templates/${id}/make-default`
    );
};
