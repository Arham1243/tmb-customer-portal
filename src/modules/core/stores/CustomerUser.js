import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { CustomerUserService } from '@/modules/core/services';

export const useCustomerUserStore = defineStore('CustomerUserStore', () => {
    const globalStore = useGlobalStore();

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerUserService.search(payload, params);
            return res.data;
        });
    };

    const unassignedUsers = (id, payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerUserService.unassignedUsers(
                id,
                payload,
                params
            );
            return res.data;
        });
    };

    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerUserService.create(payload);
            globalStore.showSuccess(
                'User added to customer',
                'The user has been successfully added to the customer'
            );
            return res.data;
        });
    };
    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerUserService.update(id, payload);
            globalStore.showSuccess(
                'Customer user updated',
                'User details for the customer have been updated successfully'
            );
            return res.data;
        });
    };
    const deleteItem = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerUserService.deleteItem(id);
            globalStore.showSuccess(
                'User removed from customer',
                'The user has been successfully removed from the customer'
            );
            return res.data;
        });
    };

    return {
        search,
        unassignedUsers,
        create,
        update,
        deleteItem
    };
});
