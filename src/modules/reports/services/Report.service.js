import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const exportReport = (resource, payload) => {
    return AxiosService.post(`${BASE_URL}/export-report/${resource}`, payload, {
        responseType: 'blob'
    });
};
