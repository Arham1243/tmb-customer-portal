import { defineStore } from 'pinia';
import { CompanyService } from '@/modules/administration/services';
import { useGlobalStore } from '@/stores';

export const useCompanyStore = defineStore('CompanyStore', () => {
    const globalStore = useGlobalStore();

    const getMyCompany = () => {
        return globalStore.actionWrapper(async () => {
            const res = await CompanyService.getMyCompany();
            return res?.data || null;
        });
    };

    const saveCompany = (id = null, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CompanyService.saveCompany(id, payload);

            globalStore.showSuccess(
                'Company updated',
                'Company details updated successfully'
            );

            return res.data;
        });
    };

    return {
        getMyCompany,
        saveCompany
    };
});
