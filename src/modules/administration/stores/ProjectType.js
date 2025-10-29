import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { ProjectTypeService } from '@/modules/administration/services';

export const useProjectTypeStore = defineStore('ProjectTypeStore', () => {
    const globalStore = useGlobalStore();

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectTypeService.search(payload, params);
            return res.data;
        });
    };
    const list = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectTypeService.list(payload, params);
            return res.data;
        });
    };
    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectTypeService.create(payload);
            globalStore.showSuccess(
                'Project Type created',
                'Project Type created successfully'
            );
            return res.data;
        });
    };
    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectTypeService.update(id, payload);
            globalStore.showSuccess(
                'Project Type updated',
                'Project Type updated successfully'
            );
            return res.data;
        });
    };
    const changeStatus = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectTypeService.changeStatus(id, payload);
            globalStore.showSuccess(
                'Project Type status updated',
                'Project Type status updated successfully'
            );
            return res.data;
        });
    };
    const changeOrder = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectTypeService.changeOrder(id, payload);
            globalStore.showSuccess(
                'Project Type order updated',
                'Project Type order updated successfully'
            );
            return res.data;
        });
    };
    const deleteItem = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectTypeService.deleteItem(id);
            globalStore.showSuccess(
                'Project Type deleted',
                'Project Type deleted successfully'
            );
            return res.data;
        });
    };

    const getMaxOrder = async () => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectTypeService.getMaxOrder();
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
        changeOrder,
        getMaxOrder
    };
});
