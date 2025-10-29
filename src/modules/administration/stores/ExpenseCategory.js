import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { ExpenseCategoryService } from '@/modules/administration/services';

export const useExpenseCategoryStore = defineStore(
    'ExpenseCategoryStore',
    () => {
        const globalStore = useGlobalStore();

        const search = (payload, params) => {
            return globalStore.actionWrapper(async () => {
                const res = await ExpenseCategoryService.search(
                    payload,
                    params
                );
                return res.data;
            });
        };
        const list = (payload, params) => {
            return globalStore.actionWrapper(async () => {
                const res = await ExpenseCategoryService.list(payload, params);
                return res.data;
            });
        };
        const create = (payload) => {
            return globalStore.actionWrapper(async () => {
                const res = await ExpenseCategoryService.create(payload);
                globalStore.showSuccess(
                    'Expense Category created',
                    'Expense Category created successfully'
                );
                return res.data;
            });
        };
        const update = (id, payload) => {
            return globalStore.actionWrapper(async () => {
                const res = await ExpenseCategoryService.update(id, payload);
                globalStore.showSuccess(
                    'Expense Category updated',
                    'Expense Category updated successfully'
                );
                return res.data;
            });
        };
        const changeStatus = (id, payload) => {
            return globalStore.actionWrapper(async () => {
                const res = await ExpenseCategoryService.changeStatus(
                    id,
                    payload
                );
                globalStore.showSuccess(
                    'Expense Category status updated',
                    'Expense Category status updated successfully'
                );
                return res.data;
            });
        };

        const deleteItem = async (id) => {
            return globalStore.actionWrapper(async () => {
                const res = await ExpenseCategoryService.deleteItem(id);
                globalStore.showSuccess(
                    'Expense Category deleted',
                    'Expense Category deleted successfully'
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
    }
);
