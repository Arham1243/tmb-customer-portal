import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const searchExpenses = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/expenses/search`, payload, {
        params
    });
};

export const searchExpensesPublic = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/expenses/list`, payload, {
        params
    });
};

export const createExpense = (payload) => {
    return AxiosService.post(`${BASE_URL}/expenses`, payload);
};

export const updateExpense = (id, payload) => {
    return AxiosService.put(`${BASE_URL}/expenses/${id}`, payload);
};

export const deleteExpense = (id) => {
    return AxiosService.delete(`${BASE_URL}/expenses/${id}`);
};

export const getExpenseReport = (id) => {
    return AxiosService.get(`${BASE_URL}/expense-reports/${id}`);
};

export const getUnsubmittedExpenses = (params) => {
    return AxiosService.get(`${BASE_URL}/expenses-unsubmitted`, { params });
};

export const deleteExpenseAttachment = (id) => {
    return AxiosService.delete(`${BASE_URL}/expenses/${id}/attachment`);
};

export const submitExpenses = (payload) => {
    return AxiosService.post(`${BASE_URL}/expense-reports`, payload);
};

export const getAllExpenseReports = (payload, params) => {
    return AxiosService.post(
        `${BASE_URL}/expense-reports-orion/search`,
        payload,
        {
            params
        }
    );
};

export const getAllExpenseReportsPublic = (payload, params) => {
    return AxiosService.post(
        `${BASE_URL}/expense-reports-orion/list`,
        payload,
        {
            params
        }
    );
};

export const approveExpenses = (payload) => {
    return AxiosService.post(`${BASE_URL}/expenses/approve`, payload);
};

export const rejectExpenses = (payload) => {
    return AxiosService.post(`${BASE_URL}/expenses/reject`, payload);
};
