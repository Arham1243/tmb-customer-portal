import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useGlobalStore } from '@/stores';
import { CustomerService } from '@/modules/core/services';

export const useCustomerStore = defineStore('CustomerStore', () => {
    const globalStore = useGlobalStore();
    const currentItem = ref(null);

    const getTablePreferences = (params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.getTablePreferences(params);
            return res.data;
        });
    };

    const saveTablePreferences = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.saveTablePreferences(payload);
            return res.data;
        });
    };

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.search(payload, params);
            return res.data;
        });
    };

    const list = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.list(payload, params);
            return res.data;
        });
    };

    const getItem = (id, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.getItem(id, params);
            currentItem.value = res.data.data;
            return res.data;
        });
    };

    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.create(payload);
            globalStore.showSuccess(
                'Customer created',
                'Customer created successfully'
            );
            return res.data;
        });
    };

    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.update(id, payload);
            globalStore.showSuccess(
                'Customer updated',
                'Customer updated successfully'
            );
            return res.data;
        });
    };

    const changeStatus = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.changeStatus(id, payload);
            globalStore.showSuccess(
                'Customer status updated',
                'Customer status updated successfully'
            );
            return res.data;
        });
    };

    const deleteItem = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.deleteItem(id);
            globalStore.showSuccess(
                'Customer deleted',
                'Customer deleted successfully'
            );
            return res.data;
        });
    };

    const searchPortalAudit = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.searchPortalAudit(
                payload,
                params
            );
            return res.data;
        });
    };

    const searchFinancials = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.searchFinancials(payload, params);
            return res.data;
        });
    };

    const searchActivities = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.searchActivities(payload, params);
            return res.data;
        });
    };

    const searchProjects = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.searchProjects(payload, params);
            return res.data;
        });
    };

    return {
        search,
        getTablePreferences,
        saveTablePreferences,
        create,
        update,
        getItem,
        list,
        currentItem,
        changeStatus,
        deleteItem,
        searchPortalAudit,
        searchFinancials,
        searchActivities,
        searchProjects
    };
});
