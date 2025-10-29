import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { TimesheetService } from '@/modules/core/services';

export const useTimesheetStore = defineStore('TimesheetStore', () => {
    const globalStore = useGlobalStore();

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await TimesheetService.search(payload, params);
            return res.data;
        });
    };

    const list = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await TimesheetService.list(payload, params);
            return res.data;
        });
    };

    const saveWeeklyTimesheet = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await TimesheetService.saveWeeklyTimesheet(payload);
            const count = Array.isArray(payload) ? payload.length : 1;
            globalStore.showSuccess(
                'Timesheet Saved',
                `Timesheet Saved successfully`
            );
            return res.data;
        });
    };

    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await TimesheetService.create(payload);
            globalStore.showSuccess(
                'Timesheet Added',
                'Timesheet Added successfully'
            );
            return res.data;
        });
    };

    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await TimesheetService.update(id, payload);
            globalStore.showSuccess(
                'Timesheet updated',
                'Timesheet updated successfully'
            );
            return res.data;
        });
    };

    const deleteItem = (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await TimesheetService.deleteItem(id);
            globalStore.showSuccess(
                'Timesheet deleted',
                'Timesheet deleted successfully'
            );
            return res.data;
        });
    };

    const submitTimesheets = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await TimesheetService.submitTimesheets(payload);
            globalStore.showSuccess(
                'Timesheets submitted',
                `${payload.timesheet_ids.length} timesheet${payload.timesheet_ids.length > 1 ? 's' : ''} submitted successfully`
            );
            return res.data;
        });
    };

    const submitDraftTimesheets = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await TimesheetService.submitDraftTimesheets(payload);
            globalStore.showSuccess(
                'Timesheets submitted',
                `${res.data.submitted} timesheet${res.data.submitted > 1 ? 's' : ''} submitted successfully`
            );
            return res.data;
        });
    };

    const approveTimesheets = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await TimesheetService.approveTimesheets(payload);
            globalStore.showSuccess(
                'Timesheets approved',
                `${payload.resources.length} timesheet${payload.resources.length > 1 ? 's' : ''} approved successfully`
            );
            return res.data;
        });
    };

    const rejectTimesheets = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await TimesheetService.rejectTimesheets(payload);
            globalStore.showSuccess(
                'Timesheets rejected',
                `${payload.resources.length} timesheet${payload.resources.length > 1 ? 's' : ''} rejected successfully`
            );
            return res.data;
        });
    };

    return {
        search,
        list,
        create,
        update,
        deleteItem,
        submitTimesheets,
        submitDraftTimesheets,
        saveWeeklyTimesheet,
        approveTimesheets,
        rejectTimesheets
    };
});
