import { useCommonStore } from '@/stores';
const commonStore = useCommonStore();

export const useExportTable = () => {
    const exportTable = async (params) => {
        try {
            const param = {
                ...params,
                responseType: 'blob'
            };
            const res = await commonStore.exportTable(param);

            const mimeType =
                params.format === 'pdf'
                    ? 'application/pdf'
                    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

            const blob = new Blob([res.data], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${params.table}.${params.format === 'pdf' ? 'pdf' : 'xlsx'}`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed', err);
        }
    };

    return { exportTable };
};
