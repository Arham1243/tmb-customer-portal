import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const getMyCompany = async () => {
    const res = await AxiosService.get(`${BASE_URL}/companies/my`);
    return res.data || null;
};

export const saveCompany = (id, payload) => {
    if (id) {
        return AxiosService.patch(`${BASE_URL}/companies/${id}`, payload);
    } else {
        return AxiosService.post(`${BASE_URL}/companies`, payload);
    }
};
