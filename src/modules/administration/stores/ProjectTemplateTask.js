import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { ProjectTemplateTaskService } from '@/modules/administration/services';

export const useProjectTemplateTaskStore = defineStore(
    'ProjectTemplateTaskStore',
    () => {
        const globalStore = useGlobalStore();

        const search = (payload, params) => {
            return globalStore.actionWrapper(async () => {
                const res = await ProjectTemplateTaskService.search(
                    payload,
                    params
                );
                return res.data;
            });
        };
        const create = (payload) => {
            return globalStore.actionWrapper(async () => {
                const res = await ProjectTemplateTaskService.create(payload);
                globalStore.showSuccess(
                    'Project Task created',
                    'Project Task created successfully'
                );
                return res.data;
            });
        };
        const update = (id, payload) => {
            return globalStore.actionWrapper(async () => {
                const res = await ProjectTemplateTaskService.update(
                    id,
                    payload
                );
                globalStore.showSuccess(
                    'Project Task updated',
                    'Project Task updated successfully'
                );
                return res.data;
            });
        };
        const changeStatus = (id, payload) => {
            return globalStore.actionWrapper(async () => {
                const res = await ProjectTemplateTaskService.changeStatus(
                    id,
                    payload
                );
                globalStore.showSuccess(
                    'Project Task status updated',
                    'Project Task status updated successfully'
                );
                return res.data;
            });
        };
        const deleteItem = async (id) => {
            return globalStore.actionWrapper(async () => {
                const res = await ProjectTemplateTaskService.deleteItem(id);
                globalStore.showSuccess(
                    'Project Task deleted',
                    'Project Task deleted successfully'
                );
                return res.data;
            });
        };

        const changeOrder = (id, payload) => {
            return globalStore.actionWrapper(async () => {
                const res = await ProjectTemplateTaskService.changeOrder(
                    id,
                    payload
                );
                globalStore.showSuccess(
                    'Project Task order updated',
                    'Project Task order updated successfully'
                );
                return res.data;
            });
        };

        const getMaxOrder = async () => {
            return globalStore.actionWrapper(async () => {
                const res = await ProjectTemplateTaskService.getMaxOrder();
                return res.data;
            });
        };

        return {
            changeStatus,
            search,
            create,
            update,
            deleteItem,
            changeOrder,
            getMaxOrder
        };
    }
);
