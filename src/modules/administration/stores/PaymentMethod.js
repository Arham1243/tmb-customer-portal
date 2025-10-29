import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { PaymentMethodService } from '@/modules/administration/services';

export const usePaymentMethodStore = defineStore('PaymentMethodStore', () => {
    const globalStore = useGlobalStore();

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await PaymentMethodService.search(payload, params);
            return res.data;
        });
    };
    const list = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await PaymentMethodService.list(payload, params);
            return res.data;
        });
    };
    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await PaymentMethodService.create(payload);
            globalStore.showSuccess(
                'Payment Method created',
                'Payment Method created successfully'
            );
            return res.data;
        });
    };
    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await PaymentMethodService.update(id, payload);
            globalStore.showSuccess(
                'Payment Method updated',
                'Payment Method updated successfully'
            );
            return res.data;
        });
    };
    const changeStatus = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await PaymentMethodService.changeStatus(id, payload);
            globalStore.showSuccess(
                'Payment Method status updated',
                'Payment Method status updated successfully'
            );
            return res.data;
        });
    };
    const deleteItem = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await PaymentMethodService.deleteItem(id);
            globalStore.showSuccess(
                'Payment Method deleted',
                'Payment Method deleted successfully'
            );
            return res.data;
        });
    };

    const makeDefault = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await PaymentMethodService.makeDefault(id);
            globalStore.showSuccess(
                'Default Updated',
                'This payment method is now the default.'
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
