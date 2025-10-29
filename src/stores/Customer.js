import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';

export const useCustomerStore = defineStore('CustomerStore', () => {
    const globalStore = useGlobalStore();

    return {};
});
