import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const getTablePreferences = (params) => {
    return AxiosService.get(`${BASE_URL}/lookup-table-preferences`, {
        params
    });
};

export const saveTablePreferences = (payload) => {
    return AxiosService.post(`${BASE_URL}/lookup-table-preferences`, payload);
};
