import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const search = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/invoices/search`, payload, {
        params
    });
};

export const getUnbilledItems = (payload) => {
    return AxiosService.post(`${BASE_URL}/invoices/unbilled-items`, payload);
};

export const getCustomerUnbilledDetails = (customerId, payload) => {
    return AxiosService.post(
        `${BASE_URL}/invoices/unbilled-items/${customerId}`,
        payload
    );
};

export const createConsolidatedInvoices = (payload) => {
    return AxiosService.post(
        `${BASE_URL}/invoices/create/consolidated`,
        payload
    );
};

export const createIndividualInvoices = (payload) => {
    return AxiosService.post(`${BASE_URL}/invoices/create/individual`, payload);
};

export const createCustomerProjectInvoice = (
    customerId,
    projectId,
    payload
) => {
    return AxiosService.post(
        `${BASE_URL}/invoices/create/${customerId}/${projectId}`,
        payload
    );
};

export const getInvoiceDetails = (id) => {
    return AxiosService.get(`${BASE_URL}/invoices/${id}/details`);
};

export const updateInvoiceTimesheet = (invoiceId, timesheetId, payload) => {
    return AxiosService.patch(
        `${BASE_URL}/invoices/${invoiceId}/timesheets/${timesheetId}`,
        payload
    );
};

export const updateInvoiceExpense = (invoiceId, expenseId, payload) => {
    return AxiosService.patch(
        `${BASE_URL}/invoices/${invoiceId}/expenses/${expenseId}`,
        payload
    );
};

export const updateInvoiceAdditionalItem = (
    invoiceId,
    additionalItemId,
    payload
) => {
    return AxiosService.patch(
        `${BASE_URL}/invoices/${invoiceId}/additional-items/${additionalItemId}`,
        payload
    );
};

export const approveInvoice = (id, payload) => {
    return AxiosService.post(`${BASE_URL}/invoices/${id}/approve`, payload);
};

export const bulkUpdateTimesheets = (payload) => {
    return AxiosService.post(
        `${BASE_URL}/invoices/timesheets/bulk-update`,
        payload
    );
};

export const bulkUpdateExpenses = (payload) => {
    return AxiosService.post(
        `${BASE_URL}/invoices/expenses/bulk-update`,
        payload
    );
};

export const bulkUpdateInvoiceTimesheets = (invoiceId, payload) => {
    return AxiosService.post(
        `${BASE_URL}/invoices/${invoiceId}/timesheets/bulk-update`,
        payload
    );
};

export const bulkUpdateInvoiceExpenses = (invoiceId, payload) => {
    return AxiosService.post(
        `${BASE_URL}/invoices/${invoiceId}/expenses/bulk-update`,
        payload
    );
};

export const bulkUpdateInvoiceAdditionalItems = (invoiceId, payload) => {
    return AxiosService.post(
        `${BASE_URL}/invoices/${invoiceId}/additional-items/bulk-update`,
        payload
    );
};
