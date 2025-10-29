import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { ProjectAttachmentService } from '@/modules/core/services';

export const useProjectAttachmentStore = defineStore(
    'ProjectAttachmentStore',
    () => {
        const globalStore = useGlobalStore();

        const search = (payload, params) => {
            return globalStore.actionWrapper(async () => {
                const res = await ProjectAttachmentService.search(
                    payload,
                    params
                );
                return res.data;
            });
        };

        const create = (payload) => {
            return globalStore.actionWrapper(async () => {
                const res = await ProjectAttachmentService.create(payload);
                globalStore.showSuccess(
                    'Attachment Added',
                    'Attachment added successfully'
                );
                return res.data;
            });
        };

        const deleteItem = async (id) => {
            return globalStore.actionWrapper(async () => {
                const res = await ProjectAttachmentService.deleteItem(id);
                globalStore.showSuccess(
                    'Attachment deleted',
                    'Attachment deleted successfully'
                );
                return res.data;
            });
        };

        return {
            search,
            create,
            deleteItem
        };
    }
);
