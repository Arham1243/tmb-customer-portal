import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { ExpenseService } from '@/modules/core/services';

export const useExpenseStore = defineStore('ExpenseStore', () => {
    const globalStore = useGlobalStore();

    const searchExpenses = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ExpenseService.searchExpenses(payload, params);
            return res.data;
        });
    };

    const searchExpensesPublic = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ExpenseService.searchExpensesPublic(
                payload,
                params
            );
            return res.data;
        });
    };

    const createExpense = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ExpenseService.createExpense(payload);
            globalStore.showSuccess(
                'Expense created',
                'Expense created successfully'
            );
            return res.data;
        });
    };

    const updateExpense = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ExpenseService.updateExpense(id, payload);
            globalStore.showSuccess(
                'Expense updated',
                'Expense updated successfully'
            );
            return res.data;
        });
    };

    const deleteExpense = (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await ExpenseService.deleteExpense(id);
            globalStore.showSuccess(
                'Expense deleted',
                'Expense deleted successfully'
            );
            return res.data;
        });
    };

    const getExpenseReport = (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await ExpenseService.getExpenseReport(id);
            return res.data;
        });
    };

    const getUnsubmittedExpenses = (params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ExpenseService.getUnsubmittedExpenses(params);
            return res.data;
        });
    };

    const deleteExpenseAttachment = (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await ExpenseService.deleteExpenseAttachment(id);
            return res.data;
        });
    };

    const submitExpenses = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ExpenseService.submitExpenses(payload);
            globalStore.showSuccess(
                'Expenses submitted',
                `${payload.expense_ids.length} expense${payload.expense_ids.length > 1 ? 's' : ''} submitted successfully`
            );
            return res.data;
        });
    };

    const getAllExpenseReports = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ExpenseService.getAllExpenseReports(
                payload,
                params
            );
            return res.data;
        });
    };

    const getAllExpenseReportsPublic = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ExpenseService.getAllExpenseReportsPublic(
                payload,
                params
            );
            return res.data;
        });
    };

    const approveExpenses = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ExpenseService.approveExpenses(payload);
            globalStore.showSuccess(
                'Expenses approved',
                `${payload.resources.length} expense${payload.resources.length > 1 ? 's' : ''} approved successfully`
            );
            return res.data;
        });
    };

    const rejectExpenses = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ExpenseService.rejectExpenses(payload);
            globalStore.showSuccess(
                'Expenses rejected',
                `${payload.resources.length} expense${payload.resources.length > 1 ? 's' : ''} rejected successfully`
            );
            return res.data;
        });
    };

    return {
        searchExpenses,
        searchExpensesPublic,
        createExpense,
        updateExpense,
        deleteExpense,
        deleteExpenseAttachment,
        submitExpenses,
        getUnsubmittedExpenses,
        getAllExpenseReports,
        getAllExpenseReportsPublic,
        getExpenseReport,
        approveExpenses,
        rejectExpenses
    };
});
