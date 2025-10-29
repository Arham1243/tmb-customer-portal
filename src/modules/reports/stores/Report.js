import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { ReportService } from '@/modules/reports/services';

export const useReportStore = defineStore('ReportStore', () => {
    const globalStore = useGlobalStore();

    const exportReport = (resource, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ReportService.exportReport(resource, payload);
            return res.data;
        });
    };

    return {
        exportReport
    };
});
