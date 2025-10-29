import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useGlobalStore } from '@/stores';
import { ProjectService } from '@/modules/core/services';

export const useProjectStore = defineStore('ProjectStore', () => {
    const globalStore = useGlobalStore();
    const currentItem = ref(null);

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectService.search(payload, params);
            return res.data;
        });
    };

    const list = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectService.list(payload, params);
            return res.data;
        });
    };

    const getItem = (id, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectService.getItem(id, params);
            currentItem.value = res.data.data;
            return res.data;
        });
    };

    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectService.create(payload);
            globalStore.showSuccess(
                'Project created',
                'Project created successfully'
            );
            return res.data;
        });
    };

    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectService.update(id, payload);
            globalStore.showSuccess(
                'Project updated',
                'Project updated successfully'
            );
            return res.data;
        });
    };

    const changeStatus = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectService.changeStatus(id, payload);
            globalStore.showSuccess(
                'Project status updated',
                'Project status updated successfully'
            );
            return res.data;
        });
    };

    const deleteItem = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectService.deleteItem(id);
            globalStore.showSuccess(
                'Project deleted',
                'Project deleted successfully'
            );
            return res.data;
        });
    };

    const deleteCustomerProposal = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectService.deleteCustomerProposal(id);
            return res.data;
        });
    };

    const searchFinancials = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectService.searchFinancials(payload, params);
            return res.data;
        });
    };

    const searchActivities = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectService.searchActivities(payload, params);
            return res.data;
        });
    };

    const searchBudget = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProjectService.searchBudget(payload, params);
            return res.data;
        });
    };

    return {
        search,
        list,
        create,
        update,
        getItem,
        currentItem,
        changeStatus,
        deleteItem,
        deleteCustomerProposal,
        searchFinancials,
        searchActivities,
        searchBudget
    };
});
