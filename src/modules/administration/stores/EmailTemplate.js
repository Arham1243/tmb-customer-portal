import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useGlobalStore } from '@/stores';
import { EmailTemplateService } from '@/modules/administration/services';

export const useEmailTemplateStore = defineStore('EmailTemplateStore', () => {
    const globalStore = useGlobalStore();
    const currentItem = ref(null);

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await EmailTemplateService.search(payload, params);
            return res.data;
        });
    };

    const getItem = (id, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await EmailTemplateService.getItem(id, params);
            currentItem.value = res.data.data;
            return res.data;
        });
    };

    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await EmailTemplateService.update(id, payload);
            globalStore.showSuccess(
                'Email Template updated',
                'Email Template updated successfully'
            );
            return res.data;
        });
    };

    return {
        search,
        getItem,
        currentItem,
        update
    };
});
