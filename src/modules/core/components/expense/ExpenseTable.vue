<script setup>
import { onBeforeMount, ref, watch } from 'vue';
import { useExpenseStore } from '@/modules/core/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useExportTable } from '@/composables/useExportTable';
import { useUserRole } from '@/composables/useUserRole';
import { useHelpers } from '@/composables';
import { useSessionStore } from '@/stores';
import { useUserStore } from '@/modules/administration/stores';

const { isAdmin, isApprover } = useUserRole();
const expenseStore = useExpenseStore();
const userStore = useUserStore();
const sessionStore = useSessionStore();
const { exportTable } = useExportTable();
const { formatDate, moneyFormat } = useHelpers();
const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const searchText = ref('');
const loading = ref(false);
const items = ref([]);
const totalRecords = ref();
const exportMenu = ref(null);
const loadingUsers = ref(false);
const selectedUser = ref(sessionStore.user?.id);
const users = ref([]);
const exportMenuItems = [
    {
        icon: 'pi pi-file-excel',
        label: 'To Excel',
        command: () => exportData({ table: 'expense_reports', format: 'excel' })
    },
    {
        icon: 'pi pi-file-pdf',
        label: 'To PDF',
        command: () => exportData({ table: 'expense_reports', format: 'pdf' })
    }
];

onBeforeMount(async () => {
    await getUsers();
    await getItems();
});

const showExportMenu = (event) => {
    exportMenu.value.toggle(event);
};

const exportData = async ({ table, format }) => {
    try {
        loading.value = true;
        const columns = ['name', 'created_at', 'status', 'total_amount'];

        // Add billing_status column if user has admin/approver permissions
        if (isAdmin.value || isApprover.value) {
            columns.push('billable_amount');
            columns.push('non_billable_amount');
            columns.push('credit_card_amount');
            columns.push('billing_status');
        }

        await exportTable({
            table,
            format,
            user_id: selectedUser.value,
            columns
        });
    } finally {
        loading.value = false;
    }
};

const onSortChange = (event) => {
    pagination.resetPageParams();
    sortFilters.updateSortFilters(event);
    getItems();
};

const onPageChange = (event) => {
    pagination.updatePageParams(event);
    getItems();
};

const search = async () => {
    pagination.resetPageParams();
    sortFilters.updateSearch(searchText.value);
    getItems();
};

const firstRow = ref(null);
const getItems = async () => {
    if (!selectedUser.value) {
        items.value = [];
        totalRecords.value = 0;
        return;
    }
    try {
        loading.value = true;

        const unsubmittedRes = await expenseStore.getUnsubmittedExpenses({
            user_id: selectedUser.value
        });
        firstRow.value = {
            id: 0,
            name: 'Unsubmitted Expenses',
            created_at: null,
            total_amount: unsubmittedRes.data.total_amount,
            credit_card_amount: unsubmittedRes.data.credit_card_amount,
            non_billable_amount: unsubmittedRes.data.non_billable_amount,
            billable_amount: unsubmittedRes.data.billable_amount,
            billing_status: 'unbilled',
            status: 'new'
        };

        // Fetch regular reports
        const params = { ...pagination.getPageParams() };
        const payload = {
            ...sortFilters.getSortFilters(searchText.value),
            filters: [
                { field: 'user_id', operator: '=', value: selectedUser.value }
            ]
        };
        const res = await expenseStore.getAllExpenseReports(payload, params);

        // Merge them
        res.data = (res.data || []).sort((a, b) => {
            const order = ['submitted', 'approved'];
            return order.indexOf(a.status) - order.indexOf(b.status);
        });
        items.value = [firstRow.value, ...(res.data || [])];
        totalRecords.value = (res?.meta?.total || 0) + 1;
    } finally {
        loading.value = false;
    }
};

const getUsers = async (searchText = '') => {
    try {
        loadingUsers.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            filters: [{ field: 'status', operator: '=', value: 'active' }],
            customFilters: [{ field: 'role_based_user', value: true }]
        };
        const res = await userStore.list(payload, params);
        users.value = [sessionStore.user, ...res.data];
    } finally {
        loadingUsers.value = false;
    }
};
</script>

<template>
    <div
        class="mb-6 flex flex-col lg:flex-row items-center justify-between gap-4"
    >
        <div class="w-full lg:w-1/3 text-center lg:text-left">
            <h1 class="text-2xl lg:text-3xl font-bold">Expenses</h1>
        </div>

        <div class="w-full lg:w-1/3 flex justify-center lg:justify-end">
            <ApiDropdown
                filter
                placeholder="Select User"
                :loading="loadingUsers"
                @search="getUsers"
                @change="getItems"
                :options="users"
                optionLabel="name"
                optionValue="id"
                id="user_id"
                class="w-64 md:w-80"
                v-model="selectedUser"
                :disabled="loadingUsers || (!isAdmin && !isApprover) || loading"
            />
        </div>
    </div>

    <Card class="py-3 px-2">
        <template #content>
            <BaseTable
                :value="items"
                :page="pagination.page"
                :rows="pagination.limit"
                :total-records="totalRecords"
                :loading="loading"
                @sort="onSortChange"
                @page="onPageChange"
            >
                <template #header>
                    <div
                        class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-2 sm:gap-4"
                    >
                        <div class="w-full sm:w-1/2 md:w-1/3 lg:w-1/3">
                            <Search
                                v-model="searchText"
                                @search="search"
                                class="w-full"
                            />
                        </div>
                        <div
                            class="flex flex-row gap-2 items-center mt-2 sm:mt-0"
                        >
                            <Button
                                label="Export"
                                icon="pi pi-download"
                                variant="outlined"
                                size="medium"
                                @click="showExportMenu($event)"
                                :disabled="items.length === 0 || loading"
                            />
                            <Menu
                                ref="exportMenu"
                                :model="exportMenuItems"
                                :popup="true"
                            />
                        </div>
                    </div>
                </template>
                <Column
                    :sortable="true"
                    field="name"
                    header="Expense Report"
                    class="whitespace-nowrap"
                >
                    <template #body="{ data }">
                        <router-link
                            v-if="
                                data.id == 0 && $ability.can('expenses.create')
                            "
                            :to="{
                                name: 'ExpensesAdd',
                                params: { user_id: selectedUser }
                            }"
                            class="text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                            {{ data.name }}
                        </router-link>
                        <router-link
                            v-else-if="data.id != 0"
                            :to="{
                                name: 'ExpensesEdit',
                                params: { id: data.id, user_id: selectedUser }
                            }"
                            class="text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                            {{ data.name }}
                        </router-link>
                        <span v-else>{{ data.name }}</span>
                    </template>
                </Column>
                <Column
                    :sortable="true"
                    field="created_at"
                    header="Submitted On"
                >
                    <template #body="{ data }">
                        {{ formatDate(data.created_at) }}
                    </template>
                </Column>

                <Column :sortable="true" field="status" header="Status">
                    <template #body="{ data }">
                        <StatusTag :status="data.status" />
                    </template>
                </Column>

                <Column
                    :sortable="true"
                    field="total_amount"
                    header="Total Amount"
                    class="amount-column"
                >
                    <template #body="{ data }">
                        {{ moneyFormat(data.total_amount) }}
                    </template>
                </Column>

                <Column
                    v-if="isAdmin || isApprover"
                    :sortable="true"
                    field="billable_amount"
                    header="Billable Amount"
                    class="amount-column"
                >
                    <template #body="{ data }">
                        {{ moneyFormat(data.billable_amount) }}
                    </template>
                </Column>

                <Column
                    v-if="isAdmin || isApprover"
                    :sortable="true"
                    field="non_billable_amount"
                    header="Non-Billable Amount"
                    class="amount-column"
                >
                    <template #body="{ data }">
                        {{ moneyFormat(data.non_billable_amount) }}
                    </template>
                </Column>

                <Column
                    v-if="isAdmin || isApprover"
                    :sortable="true"
                    field="credit_card_amount"
                    header="Credit Card Amount"
                    class="amount-column"
                >
                    <template #body="{ data }">
                        {{ moneyFormat(data.credit_card_amount) }}
                    </template>
                </Column>

                <Column
                    v-if="isAdmin || isApprover"
                    :sortable="true"
                    field="billing_status"
                    header="Billing Status"
                >
                    <template #body="{ data }">
                        <StatusTag :status="data.billing_status" />
                    </template>
                </Column>

                <template #empty>
                    <div v-if="!selectedUser">
                        Please select a user to view expense reports.
                    </div>
                    <div v-else>No expense reports found.</div></template
                >
            </BaseTable>
        </template>
    </Card>
</template>
