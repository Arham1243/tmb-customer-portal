import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { MinimumChargeService } from '@/modules/administration/services';

export const useMinimumChargeStore = defineStore('MinimumChargeStore', () => {
    const globalStore = useGlobalStore();

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await MinimumChargeService.search(payload, params);
            return res.data;
        });
    };
    const list = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await MinimumChargeService.list(payload, params);
            return res.data;
        });
    };
    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await MinimumChargeService.create(payload);
            globalStore.showSuccess(
                'Minimum Charge created',
                'Minimum Charge created successfully'
            );
            return res.data;
        });
    };
    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await MinimumChargeService.update(id, payload);
            globalStore.showSuccess(
                'Minimum Charge updated',
                'Minimum Charge updated successfully'
            );
            return res.data;
        });
    };
    const changeStatus = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await MinimumChargeService.changeStatus(id, payload);
            globalStore.showSuccess(
                'Minimum Charge status updated',
                'Minimum Charge status updated successfully'
            );
            return res.data;
        });
    };
    const deleteItem = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await MinimumChargeService.deleteItem(id);
            globalStore.showSuccess(
                'Minimum Charge deleted',
                'Minimum Charge deleted successfully'
            );
            return res.data;
        });
    };

    return {
        changeStatus,
        search,
        list,
        create,
        update,
        deleteItem
    };
});
