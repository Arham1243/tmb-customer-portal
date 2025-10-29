import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { CustomerService } from '@/services';

export const useCustomerStore = defineStore('CustomerStore', () => {
    const globalStore = useGlobalStore();

    const searchInvoices = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.searchInvoices(payload, params);
            return res.data;
        });
    };

    return {
        searchInvoices 
    };
});
