import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { UserService } from '@/modules/administration/services';

export const useUserStore = defineStore('UserStore', () => {
    const globalStore = useGlobalStore();
    const currentItem = ref(null);

    const list = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.list(payload, params);
            return res.data;
        });
    };

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.search(payload, params);
            return res.data;
        });
    };

    const getItem = (id, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.getItem(id, params);
            currentItem.value = res.data.data;
            return res.data;
        });
    };

    const getUserPermissions = (id, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.getUserPermissions(id, params);
            return res.data;
        });
    };

    const listUserPermissions = (id, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.listUserPermissions(id, params);
            return res.data;
        });
    };

    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.create(payload);
            globalStore.showSuccess(
                'User created',
                'User created successfully'
            );
            return res.data;
        });
    };
    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.update(id, payload);
            globalStore.showSuccess(
                'User updated',
                'User updated successfully'
            );
            return res.data;
        });
    };
    const changeStatus = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.changeStatus(id, payload);
            globalStore.showSuccess(
                'User status updated',
                'User status updated successfully'
            );
            return res.data;
        });
    };

    const deleteItem = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.deleteItem(id);
            globalStore.showSuccess(
                'User deleted',
                'User deleted successfully'
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
        currentItem,
        getUserPermissions,
        listUserPermissions,
        getItem
    };
});
