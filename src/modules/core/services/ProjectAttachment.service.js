import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const search = (payload, params) => {
    return AxiosService.post(
        `${BASE_URL}/project-attachments/search`,
        payload,
        {
            params
        }
    );
};

export const create = (payload) => {
    return AxiosService.post(`${BASE_URL}/project-attachments`, payload);
};

export const deleteItem = (id) => {
    return AxiosService.delete(`${BASE_URL}/project-attachments/${id}`);
};
