import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const search = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/email-templates/search`, payload, {
        params
    });
};

export const getItem = (id, params) => {
    return AxiosService.get(`${BASE_URL}/email-templates/${id}`, { params });
};

export const update = (id, payload) => {
    return AxiosService.put(`${BASE_URL}/email-templates/${id}`, payload);
};
