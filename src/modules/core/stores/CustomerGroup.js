import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { CustomerGroupService } from '@/modules/core/services';

export const useCustomerGroupStore = defineStore('CustomerGroupStore', () => {
    const globalStore = useGlobalStore();

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerGroupService.search(payload, params);
            return res.data;
        });
    };
    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerGroupService.create(payload);
            globalStore.showSuccess(
                'Customer Group created',
                'Customer Group created successfully'
            );
            return res.data;
        });
    };
    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerGroupService.update(id, payload);
            globalStore.showSuccess(
                'Customer Group updated',
                'Customer Group updated successfully'
            );
            return res.data;
        });
    };
    const changeStatus = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerGroupService.changeStatus(id, payload);
            globalStore.showSuccess(
                'Customer Group status updated',
                'Customer Group status updated successfully'
            );
            return res.data;
        });
    };
    const deleteItem = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerGroupService.deleteItem(id);
            globalStore.showSuccess(
                'Customer Group deleted',
                'Customer Group deleted successfully'
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
