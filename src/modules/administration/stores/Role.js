import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { RoleService } from '@/modules/administration/services';

export const useRoleStore = defineStore('RoleStore', () => {
    const globalStore = useGlobalStore();
    const currentItem = ref({});
    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await RoleService.search(payload, params);
            return res.data;
        });
    };

    const list = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await RoleService.list(payload, params);
            return res.data;
        });
    };

    const getItem = (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await RoleService.getItem(id);
            currentItem.value = res.data.data;
            return res.data;
        });
    };

    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await RoleService.create(payload);
            globalStore.showSuccess(
                'Role created',
                'Role created successfully'
            );
            return res.data;
        });
    };
    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await RoleService.update(id, payload);
            globalStore.showSuccess(
                'Role updated',
                'Role updated successfully'
            );
            return res.data;
        });
    };

    const changeStatus = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await RoleService.changeStatus(id, payload);
            globalStore.showSuccess(
                'Role status updated',
                'Role status updated successfully'
            );
            return res.data;
        });
    };

    const deleteItem = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await RoleService.deleteItem(id);
            globalStore.showSuccess(
                'Role deleted',
                'Role deleted successfully'
            );
            return res.data;
        });
    };

    const getRolePermissions = (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await RoleService.getRolePermissions(id);
            return res.data;
        });
    };

    const listRolePermissions = (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await RoleService.listRolePermissions(id);
            return res.data;
        });
    };

    const syncRolePermissions = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await RoleService.syncRolePermissions(id, payload);
            globalStore.showSuccess(
                'Role permissions synced',
                'Role permissions synced successfully'
            );
            return res.data;
        });
    };

    return {
        search,
        list,
        create,
        update,
        deleteItem,
        changeStatus,
        getItem,
        getRolePermissions,
        listRolePermissions,
        syncRolePermissions,
        currentItem
    };
});
