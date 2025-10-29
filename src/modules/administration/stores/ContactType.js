import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { ContactTypeService } from '@/modules/administration/services';

export const useContactTypeStore = defineStore('ContactTypeStore', () => {
    const globalStore = useGlobalStore();

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ContactTypeService.search(payload, params);
            return res.data;
        });
    };
    const list = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ContactTypeService.list(payload, params);
            return res.data;
        });
    };
    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ContactTypeService.create(payload);
            globalStore.showSuccess(
                'Contact Type created',
                'Contact Type created successfully'
            );
            return res.data;
        });
    };
    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ContactTypeService.update(id, payload);
            globalStore.showSuccess(
                'Contact Type updated',
                'Contact Type updated successfully'
            );
            return res.data;
        });
    };
    const changeStatus = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ContactTypeService.changeStatus(id, payload);
            globalStore.showSuccess(
                'Contact Type status updated',
                'Contact Type status updated successfully'
            );
            return res.data;
        });
    };
    const deleteItem = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await ContactTypeService.deleteItem(id);
            globalStore.showSuccess(
                'Contact Type deleted',
                'Contact Type deleted successfully'
            );
            return res.data;
        });
    };

    const makeDefault = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await ContactTypeService.makeDefault(id);
            globalStore.showSuccess(
                'Default Updated',
                'This contact type is now the default.'
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
