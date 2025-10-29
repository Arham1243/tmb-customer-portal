import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const search = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/timesheets/search`, payload, {
        params
    });
};

export const list = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/timesheets/list`, payload, {
        params
    });
};

export const create = (payload) => {
    return AxiosService.post(`${BASE_URL}/timesheets`, payload);
};

export const saveWeeklyTimesheet = (payload) => {
    return AxiosService.post(`${BASE_URL}/timesheets/save-week-data`, payload);
};

export const update = (id, payload) => {
    return AxiosService.put(`${BASE_URL}/timesheets/${id}`, payload);
};

export const deleteItem = (id) => {
    return AxiosService.delete(`${BASE_URL}/timesheets/${id}`);
};

export const submitTimesheets = (payload) => {
    return AxiosService.post(`${BASE_URL}/timesheets/submit`, payload);
};

export const submitDraftTimesheets = (payload) => {
    return AxiosService.post(`${BASE_URL}/timesheets/submit-draft`, payload);
};

export const approveTimesheets = (payload) => {
    return AxiosService.post(`${BASE_URL}/timesheets/approve`, payload);
};

export const rejectTimesheets = (payload) => {
    return AxiosService.post(`${BASE_URL}/timesheets/reject`, payload);
};
