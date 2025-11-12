import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { CustomerService } from '@/services';

export const useCustomerStore = defineStore('CustomerStore', () => {
    const globalStore = useGlobalStore();
    const selectedInvoices = ref([]);

    const setSelectedInvoices = (invoices) => {
        selectedInvoices.value = invoices;
    };

    const searchInvoices = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.searchInvoices(payload, params);
            return res.data;
        });
    };

    const exportReport = (resource, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.exportReport(resource, payload);
            return res.data;
        });
    };

    const listContactTypes = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.listContactTypes(payload, params);
            return res.data;
        });
    };

    const searchContacts = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.searchContacts(payload, params);
            return res.data;
        });
    };

    const createContact = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.createContact(payload);
            globalStore.showSuccess(
                'Contact created',
                'Contact created successfully'
            );
            return res.data;
        });
    };

    const updateContact = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.updateContact(id, payload);
            globalStore.showSuccess(
                'Contact updated',
                'Contact updated successfully'
            );
            return res.data;
        });
    };

    const getPaymentMethods = () => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.getPaymentMethods();
            return res.data;
        });
    };

    const createSetupIntent = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.createSetupIntent(payload);
            return res.data;
        });
    };

    const attachPaymentMethod = (paymentMethodId) => {
        return globalStore.actionWrapper(async () => {
            const res =
                await CustomerService.attachPaymentMethod(paymentMethodId);
            return res.data;
        });
    };

    const checkout = async (payload) => {
        const res = await CustomerService.checkout(payload);
        globalStore.showSuccess(
            'Payment Successful',
            'Your payment has been processed successfully'
        );
        selectedInvoices.value = [];
        return res.data;
    };

    const changeProfilePassword = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await CustomerService.changeProfilePassword(payload);
            globalStore.showSuccess(
                'Password updated',
                'Password updated successfully'
            );
            return res.data;
        });
    };

    return {
        selectedInvoices,
        setSelectedInvoices,
        searchInvoices,
        exportReport,
        listContactTypes,
        searchContacts,
        createContact,
        updateContact,
        getPaymentMethods,
        createSetupIntent,
        attachPaymentMethod,
        checkout,
        changeProfilePassword
    };
});
