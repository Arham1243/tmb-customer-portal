import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { ClientTypeService } from '@/modules/core/services';

export const useClientTypeStore = defineStore('ClientTypeStore', () => {
    const globalStore = useGlobalStore();

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ClientTypeService.search(payload, params);
            return res.data;
        });
    };
    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ClientTypeService.create(payload);
            globalStore.showSuccess(
                'Client Type created',
                'Client Type created successfully'
            );
            return res.data;
        });
    };
    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ClientTypeService.update(id, payload);
            globalStore.showSuccess(
                'Client Type updated',
                'Client Type updated successfully'
            );
            return res.data;
        });
    };
    const changeStatus = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ClientTypeService.changeStatus(id, payload);
            globalStore.showSuccess(
                'Client Type status updated',
                'Client Type status updated successfully'
            );
            return res.data;
        });
    };
    const deleteItem = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await ClientTypeService.deleteItem(id);
            globalStore.showSuccess(
                'Client Type deleted',
                'Client Type deleted successfully'
            );
            return res.data;
        });
    };

    return {
        changeStatus,
        search,
        create,
        update,
        deleteItem
    };
});
