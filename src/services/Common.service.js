import AxiosService from './Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const exportTable = (params) => {
    return AxiosService.get(`${BASE_URL}/export-table`, {
        params,
        responseType: 'blob',
    });
};