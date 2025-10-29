import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useGlobalStore } from '@/stores';
import { InvoiceTemplateService } from '@/modules/administration/services';

export const useInvoiceTemplateStore = defineStore(
    'InvoiceTemplateStore',
    () => {
        const globalStore = useGlobalStore();
        const currentItem = ref(null);

        const search = (payload, params) => {
            return globalStore.actionWrapper(async () => {
                const res = await InvoiceTemplateService.search(
                    payload,
                    params
                );
                return res.data;
            });
        };

        const list = (payload, params) => {
            return globalStore.actionWrapper(async () => {
                const res = await InvoiceTemplateService.list(payload, params);
                return res.data;
            });
        };

        const getItem = (id, params) => {
            return globalStore.actionWrapper(async () => {
                const res = await InvoiceTemplateService.getItem(id, params);
                currentItem.value = res.data.data;
                return res.data;
            });
        };

        const update = (id, payload) => {
            return globalStore.actionWrapper(async () => {
                const res = await InvoiceTemplateService.update(id, payload);
                globalStore.showSuccess(
                    'Invoice Template updated',
                    'Invoice Template updated successfully'
                );
                return res.data;
            });
        };

        const makeDefault = async (id) => {
            return globalStore.actionWrapper(async () => {
                const res = await InvoiceTemplateService.makeDefault(id);
                globalStore.showSuccess(
                    'Default Updated',
                    'This invoice template is now the default.'
                );
                return res.data;
            });
        };

        return {
            search,
            list,
            getItem,
            currentItem,
            update,
            makeDefault
        };
    }
);
