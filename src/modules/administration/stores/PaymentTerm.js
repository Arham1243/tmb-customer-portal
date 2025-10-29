import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { PaymentTermService } from '@/modules/administration/services';

export const usePaymentTermStore = defineStore('PaymentTermStore', () => {
    const globalStore = useGlobalStore();

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await PaymentTermService.search(payload, params);
            return res.data;
        });
    };

    const list = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await PaymentTermService.list(payload, params);
            return res.data;
        });
    };

    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await PaymentTermService.create(payload);
            globalStore.showSuccess(
                'Payment Term created',
                'Payment Term created successfully'
            );
            return res.data;
        });
    };
    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await PaymentTermService.update(id, payload);
            globalStore.showSuccess(
                'Payment Term updated',
                'Payment Term updated successfully'
            );
            return res.data;
        });
    };
    const changeStatus = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await PaymentTermService.changeStatus(id, payload);
            globalStore.showSuccess(
                'Payment Term status updated',
                'Payment Term status updated successfully'
            );
            return res.data;
        });
    };
    const deleteItem = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await PaymentTermService.deleteItem(id);
            globalStore.showSuccess(
                'Payment Term deleted',
                'Payment Term deleted successfully'
            );
            return res.data;
        });
    };

    const makeDefault = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await PaymentTermService.makeDefault(id);
            globalStore.showSuccess(
                'Default Updated',
                'This payment term is now the default.'
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
        deleteItem,
        makeDefault
    };
});
