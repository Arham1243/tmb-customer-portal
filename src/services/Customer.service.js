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

export const getPaymentMethods = () => {
    return AxiosService.get(`${BASE_URL}/customer-portal/payment-methods`);
};

export const createSetupIntent = () => {
    return AxiosService.post(
        `${BASE_URL}/customer-portal/payment-methods/setup-intent`
    );
};

export const attachPaymentMethod = (paymentMethodId) => {
    return AxiosService.post(
        `${BASE_URL}/customer-portal/payment-methods/attach`,
        {
            payment_method_id: paymentMethodId
        }
    );
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

export const checkout = (payload) => {
    return AxiosService.post(`${BASE_URL}/customer-portal/checkout`, payload);
};
