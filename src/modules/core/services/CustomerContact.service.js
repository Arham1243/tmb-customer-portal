import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const search = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/customer-contacts/search`, payload, {
        params
    });
};

export const searchPublic = (payload, params) => {
    return AxiosService.post(
        `${BASE_URL}/customer-contacts/search-public`,
        payload,
        {
            params
        }
    );
};

export const create = (payload) => {
    return AxiosService.post(`${BASE_URL}/customer-contacts`, payload);
};

export const update = (id, payload) => {
    return AxiosService.put(`${BASE_URL}/customer-contacts/${id}`, payload);
};

export const deleteItem = (id) => {
    return AxiosService.delete(`${BASE_URL}/customer-contacts/${id}`);
};
