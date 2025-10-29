import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { DeductionTypeService } from '@/modules/administration/services';

export const useDeductionTypeStore = defineStore('DeductionTypeStore', () => {
    const globalStore = useGlobalStore();

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await DeductionTypeService.search(payload, params);
            return res.data;
        });
    };
    const list = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await DeductionTypeService.list(payload, params);
            return res.data;
        });
    };
    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await DeductionTypeService.create(payload);
            globalStore.showSuccess(
                'Deduction Type created',
                'Deduction Type created successfully'
            );
            return res.data;
        });
    };
    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await DeductionTypeService.update(id, payload);
            globalStore.showSuccess(
                'Deduction Type updated',
                'Deduction Type updated successfully'
            );
            return res.data;
        });
    };
    const changeStatus = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await DeductionTypeService.changeStatus(id, payload);
            globalStore.showSuccess(
                'Deduction Type status updated',
                'Deduction Type status updated successfully'
            );
            return res.data;
        });
    };
    const deleteItem = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await DeductionTypeService.deleteItem(id);
            globalStore.showSuccess(
                'Deduction Type deleted',
                'Deduction Type deleted successfully'
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
