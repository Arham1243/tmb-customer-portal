import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { ProjectTaskService } from '@/modules/core/services';

export const useProjectTaskStore = defineStore('ProjectTaskStore', () => {
    const globalStore = useGlobalStore();

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectTaskService.search(payload, params);
            return res.data;
        });
    };

    const list = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectTaskService.list(payload, params);
            return res.data;
        });
    };

    const getTemplates = (projectId, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectTaskService.getTemplates(
                projectId,
                params
            );
            return res.data;
        });
    };
    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectTaskService.create(payload);
            globalStore.showSuccess(
                'Project Task created',
                'Project Task created successfully'
            );
            return res.data;
        });
    };
    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectTaskService.update(id, payload);
            globalStore.showSuccess(
                'Project Task updated',
                'Project Task updated successfully'
            );
            return res.data;
        });
    };
    const changeStatus = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectTaskService.changeStatus(id, payload);
            globalStore.showSuccess(
                'Project Task status updated',
                'Project Task status updated successfully'
            );
            return res.data;
        });
    };
    const deleteItem = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectTaskService.deleteItem(id);
            globalStore.showSuccess(
                'Project Task deleted',
                'Project Task deleted successfully'
            );
            return res.data;
        });
    };

    const getMaxOrder = async (params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectTaskService.getMaxOrder(params);
            return res.data;
        });
    };

    return {
        changeStatus,
        search,
        list,
        getTemplates,
        create,
        update,
        deleteItem,
        getMaxOrder
    };
});
