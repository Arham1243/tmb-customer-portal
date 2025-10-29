import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { CustomerContactService } from '@/modules/core/services';

export const useCustomerContactStore = defineStore(
    'CustomerContactStore',
    () => {
        const globalStore = useGlobalStore();

        const search = (payload, params) => {
            return globalStore.actionWrapper(async () => {
                const res = await CustomerContactService.search(
                    payload,
                    params
                );
                return res.data;
            });
        };
        const searchPublic = (payload, params) => {
            return globalStore.actionWrapper(async () => {
                const res = await CustomerContactService.searchPublic(
                    payload,
                    params
                );
                return res.data;
            });
        };
        const create = (payload) => {
            return globalStore.actionWrapper(async () => {
                const res = await CustomerContactService.create(payload);
                globalStore.showSuccess(
                    'Contact created',
                    'Contact created successfully'
                );
                return res.data;
            });
        };
        const update = (id, payload) => {
            return globalStore.actionWrapper(async () => {
                const res = await CustomerContactService.update(id, payload);
                globalStore.showSuccess(
                    'Contact updated',
                    'Contact updated successfully'
                );
                return res.data;
            });
        };
        const deleteItem = async (id) => {
            return globalStore.actionWrapper(async () => {
                const res = await CustomerContactService.deleteItem(id);
                globalStore.showSuccess(
                    'Contact deleted',
                    'Contact deleted successfully'
                );
                return res.data;
            });
        };

        return {
            search,
            searchPublic,
            create,
            update,
            deleteItem
        };
    }
);
