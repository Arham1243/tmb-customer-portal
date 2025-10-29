import { useReportStore } from '@/modules/reports/stores';
const reportStore = useReportStore();

export const useReportExport = () => {
    const exportReport = async (resource, payload) => {
        try {
            const res = await reportStore.exportReport(resource, payload);

            const mimeType =
                payload.format === 'pdf'
                    ? 'application/pdf'
                    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

            const blob = new Blob([res], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${resource}.${payload.format === 'pdf' ? 'pdf' : 'xlsx'}`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed', err);
        }
    };

    return { exportReport };
};
