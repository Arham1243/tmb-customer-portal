import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { RevenueCategoryService } from '@/modules/administration/services';

export const useRevenueCategoryStore = defineStore(
    'RevenueCategoryStore',
    () => {
        const globalStore = useGlobalStore();

        const search = (payload, params) => {
            return globalStore.actionWrapper(async () => {
                const res = await RevenueCategoryService.search(
                    payload,
                    params
                );
                return res.data;
            });
        };
        const list = (payload, params) => {
            return globalStore.actionWrapper(async () => {
                const res = await RevenueCategoryService.list(payload, params);
                return res.data;
            });
        };
        const create = (payload) => {
            return globalStore.actionWrapper(async () => {
                const res = await RevenueCategoryService.create(payload);
                globalStore.showSuccess(
                    'Revenue Category created',
                    'Revenue Category created successfully'
                );
                return res.data;
            });
        };
        const update = (id, payload) => {
            return globalStore.actionWrapper(async () => {
                const res = await RevenueCategoryService.update(id, payload);
                globalStore.showSuccess(
                    'Revenue Category updated',
                    'Revenue Category updated successfully'
                );
                return res.data;
            });
        };
        const changeStatus = (id, payload) => {
            return globalStore.actionWrapper(async () => {
                const res = await RevenueCategoryService.changeStatus(
                    id,
                    payload
                );
                globalStore.showSuccess(
                    'Revenue Category status updated',
                    'Revenue Category status updated successfully'
                );
                return res.data;
            });
        };

        const deleteItem = async (id) => {
            return globalStore.actionWrapper(async () => {
                const res = await RevenueCategoryService.deleteItem(id);
                globalStore.showSuccess(
                    'Revenue Category deleted',
                    'Revenue Category deleted successfully'
                );
                return res.data;
            });
        };

        const makeDefault = async (id) => {
            return globalStore.actionWrapper(async () => {
                const res = await RevenueCategoryService.makeDefault(id);
                globalStore.showSuccess(
                    'Default Updated',
                    'This revenue category is now the default.'
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
            makeDefault,
            deleteItem
        };
    }
);
