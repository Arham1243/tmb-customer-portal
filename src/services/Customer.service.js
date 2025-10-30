import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const searchInvoices = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/invoices/search`, payload, {
        params
    });
};

export const listContactTypes = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/contact-types/list`, payload, {
        params
    });
};

export const searchContacts = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/customer-contacts/search`, payload, {
        params
    });
};

export const createContact = (payload) => {
    return AxiosService.post(`${BASE_URL}/customer-contacts`, payload);
};

export const updateContact = (id, payload) => {
    return AxiosService.put(`${BASE_URL}/customer-contacts/${id}`, payload);
};
export const exportReport = (resource, payload) => {
    return AxiosService.post(
        `${BASE_URL}/customer-portal/export-report/${resource}`,
        payload,
        {
            responseType: 'blob'
        }
    );
};
