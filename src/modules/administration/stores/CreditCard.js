import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { CreditCardService } from '@/modules/administration/services';

export const useCreditCardStore = defineStore('CreditCardStore', () => {
    const globalStore = useGlobalStore();

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CreditCardService.search(payload, params);
            return res.data;
        });
    };
    const list = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CreditCardService.list(payload, params);
            return res.data;
        });
    };
    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CreditCardService.create(payload);
            globalStore.showSuccess(
                'Credit Card created',
                'Credit Card created successfully'
            );
            return res.data;
        });
    };
    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CreditCardService.update(id, payload);
            globalStore.showSuccess(
                'Credit Card updated',
                'Credit Card updated successfully'
            );
            return res.data;
        });
    };
    const changeStatus = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CreditCardService.changeStatus(id, payload);
            globalStore.showSuccess(
                'Credit Card status updated',
                'Credit Card status updated successfully'
            );
            return res.data;
        });
    };
    const deleteItem = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await CreditCardService.deleteItem(id);
            globalStore.showSuccess(
                'Credit Card deleted',
                'Credit Card deleted successfully'
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
