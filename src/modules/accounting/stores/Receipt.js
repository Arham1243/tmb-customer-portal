import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { ReceiptService } from '@/modules/accounting/services';

export const useReceiptStore = defineStore('ReceiptStore', () => {
    const globalStore = useGlobalStore();
    const currentItem = ref({});

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ReceiptService.search(payload, params);
            return res.data;
        });
    };

    const getItem = (id, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ReceiptService.getItem(id, params);
            currentItem.value = res.data.data;
            return res.data;
        });
    };

    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ReceiptService.create(payload);
            globalStore.showSuccess(
                'Receipt created',
                'Receipt created successfully'
            );
            return res.data;
        });
    };

    return {
        create,
        search,
        getItem,
        currentItem
    };
});
