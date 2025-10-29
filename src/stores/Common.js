import { defineStore } from 'pinia';
import { CommonService } from '@/services';
import { useGlobalStore } from '@/stores';

export const useCommonStore = defineStore('CommonStore', () => {
    const globalStore = useGlobalStore();

    const exportTable = (params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CommonService.exportTable(params);
            return res;
        });
    };

    return {
        exportTable
    };
});
