import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useGlobalStore } from '@/stores';
import { InvoiceService } from '@/modules/accounting/services';

export const useInvoiceStore = defineStore('InvoiceStore', () => {
    const globalStore = useGlobalStore();
    const currentCustomer = ref(null);

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await InvoiceService.search(payload, params);
            return res.data;
        });
    };

    const getUnbilledItems = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await InvoiceService.getUnbilledItems(payload);
            return res.data;
        });
    };

    const getCustomerUnbilledDetails = (customerId, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await InvoiceService.getCustomerUnbilledDetails(
                customerId,
                payload
            );
            currentCustomer.value = res.data?.data?.customer;
            return res.data;
        });
    };

    const createConsolidatedInvoices = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res =
                await InvoiceService.createConsolidatedInvoices(payload);
            globalStore.showSuccess(
                'Invoice generated',
                'Invoice generated successfully'
            );
            return res.data;
        });
    };

    const createIndividualInvoices = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await InvoiceService.createIndividualInvoices(payload);
            globalStore.showSuccess(
                'Invoice generated',
                'Invoice generated successfully'
            );
            return res.data;
        });
    };

    const getInvoiceDetails = (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await InvoiceService.getInvoiceDetails(id);
            return res.data;
        });
    };

    const approveInvoice = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await InvoiceService.approveInvoice(id, payload);
            globalStore.showSuccess(
                'Invoice approved',
                'Invoice approved successfully'
            );
            return res.data;
        });
    };

    const bulkUpdateTimesheets = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await InvoiceService.bulkUpdateTimesheets(payload);
            globalStore.showSuccess(
                'Timesheets updated',
                'Timesheets updated successfully'
            );
            return res.data;
        });
    };

    const bulkUpdateExpenses = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await InvoiceService.bulkUpdateExpenses(payload);
            globalStore.showSuccess(
                'Expenses updated',
                'Expenses updated successfully'
            );
            return res.data;
        });
    };

    const bulkUpdateInvoiceTimesheets = (invoiceId, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await InvoiceService.bulkUpdateInvoiceTimesheets(
                invoiceId,
                payload
            );
            globalStore.showSuccess(
                'Timesheets updated',
                'Timesheets updated successfully'
            );
            return res.data;
        });
    };

    const bulkUpdateInvoiceExpenses = (invoiceId, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await InvoiceService.bulkUpdateInvoiceExpenses(
                invoiceId,
                payload
            );
            globalStore.showSuccess(
                'Expenses updated',
                'Expenses updated successfully'
            );
            return res.data;
        });
    };

    const bulkUpdateInvoiceAdditionalItems = (invoiceId, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await InvoiceService.bulkUpdateInvoiceAdditionalItems(
                invoiceId,
                payload
            );
            globalStore.showSuccess(
                'Additional items updated',
                'Additional items updated successfully'
            );
            return res.data;
        });
    };

    return {
        search,
        currentCustomer,
        getInvoiceDetails,
        getUnbilledItems,
        getCustomerUnbilledDetails,
        createConsolidatedInvoices,
        createIndividualInvoices,
        approveInvoice,
        bulkUpdateTimesheets,
        bulkUpdateExpenses,
        bulkUpdateInvoiceTimesheets,
        bulkUpdateInvoiceExpenses,
        bulkUpdateInvoiceAdditionalItems
    };
});
