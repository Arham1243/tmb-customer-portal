<script setup>
import { onBeforeMount, ref, computed, watch } from 'vue';
import { truncate, debounce } from 'lodash-es';
import {
    useExpenseStore,
    useProjectStore,
    useCustomerStore,
    useLookupTablePreferenceStore
} from '@/modules/core/stores';
import {
    useUserStore,
    useExpenseCategoryStore,
    useCreditCardStore
} from '@/modules/administration/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';
import { useReportExport } from '@/composables/useReportExport';
import { expenseStatuses } from '@/config/enums';

const expenseStore = useExpenseStore();
const userStore = useUserStore();
const projectStore = useProjectStore();
const creditCardStore = useCreditCardStore();
const expenseCategoryStore = useExpenseCategoryStore();
const customerStore = useCustomerStore();
const { mapVisibleColumns, formatDate, moneyFormat } = useHelpers();
const { exportReport } = useReportExport();
const lookupTablePreferenceStore = useLookupTablePreferenceStore();

const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const searchText = ref('');
const loading = ref(false);
const items = ref([]);
const exportMenu = ref(null);
const totalRecords = ref();
const busy = ref(false);
const filterDialog = ref(false);
const visibleColumns = ref([]);
const columnSelectionsRef = ref(null);
const loadingUsers = ref(false);
const users = ref([]);
const loadingReports = ref(false);
const reports = ref([]);
const loadingProjects = ref(false);
const projects = ref([]);
const loadingCustomers = ref(false);
const customers = ref([]);
const loadingExpenseCategories = ref(false);
const expenseCategories = ref([]);
const loadingCreditCards = ref(false);
const creditCards = ref([]);
const filters = ref({
    date_range: [],
    users: [],
    reports: [],
    projects: [],
    customers: [],
    expenseCategories: [],
    creditCards: [],
    status: [],
    attachment: null,
    is_reimbursable: null,
    is_billable: null,
    amount_min: null,
    amount_max: null,
    billable_amount_min: null,
    billable_amount_max: null
});

// Track actually applied filters (sent to API)
const appliedFilters = ref({
    date_range: [],
    users: [],
    reports: [],
    projects: [],
    customers: [],
    expenseCategories: [],
    creditCards: [],
    status: [],
    attachment: null,
    is_reimbursable: null,
    is_billable: null,
    amount_min: null,
    amount_max: null,
    billable_amount_min: null,
    billable_amount_max: null
});

const yesNoOptions = ref([
    { name: 'Yes', id: 'yes' },
    { name: 'No', id: 'no' }
]);

const attachmentOptions = ref([
    { id: 'with_attachment', name: 'With Attachment' },
    { id: 'without_attachment', name: 'Without Attachment' }
]);

const activeChips = computed({
    get() {
        const chips = [];
        if (appliedFilters.value.date_range.length) {
            chips.push({
                field: 'date_range',
                label: `Date: ${appliedFilters.value.date_range[0]} → ${appliedFilters.value.date_range[1]}`
            });
        }
        if (appliedFilters.value.users.length) {
            appliedFilters.value.users.forEach((u) => {
                const user = users.value.find((x) => x.id === u);
                if (user)
                    chips.push({
                        field: 'users',
                        value: u,
                        label: `User: ${user.name}`
                    });
            });
        }
        if (appliedFilters.value.reports.length) {
            appliedFilters.value.reports.forEach((r) => {
                const report = reports.value.find((x) => x.id === r);
                if (report)
                    chips.push({
                        field: 'reports',
                        value: r,
                        label: `Report: ${report.name}`
                    });
            });
        }
        if (appliedFilters.value.projects.length) {
            appliedFilters.value.projects.forEach((p) => {
                const project = projects.value.find((x) => x.id === p);
                if (project)
                    chips.push({
                        field: 'projects',
                        value: p,
                        label: `Project: ${project.name}`
                    });
            });
        }
        if (appliedFilters.value.customers.length) {
            appliedFilters.value.customers.forEach((c) => {
                const customer = customers.value.find((x) => x.id === c);
                if (customer)
                    chips.push({
                        field: 'customers',
                        value: c,
                        label: `Customer: ${customer.name}`
                    });
            });
        }
        if (appliedFilters.value.expenseCategories.length) {
            appliedFilters.value.expenseCategories.forEach((e) => {
                const expenseCategory = expenseCategories.value.find(
                    (x) => x.id === e
                );
                if (expenseCategory)
                    chips.push({
                        field: 'expenseCategories',
                        value: e,
                        label: `Expense Category: ${expenseCategory.name}`
                    });
            });
        }
        if (appliedFilters.value.creditCards.length) {
            appliedFilters.value.creditCards.forEach((c) => {
                const creditCard = creditCards.value.find((x) => x.id === c);
                if (creditCard)
                    chips.push({
                        field: 'creditCards',
                        value: c,
                        label: `Credit Card: ${creditCard.name}`
                    });
            });
        }
        if (appliedFilters.value.status.length) {
            appliedFilters.value.status.forEach((s) => {
                const status = expenseStatuses.find((x) => x.id === s);
                if (status)
                    chips.push({
                        field: 'status',
                        value: s,
                        label: `Status: ${status.name}`
                    });
            });
        }
        if (appliedFilters.value.attachment) {
            const attachment = attachmentOptions.value.find(
                (x) => x.id === appliedFilters.value.attachment
            );
            if (attachment)
                chips.push({
                    field: 'attachment',
                    value: appliedFilters.value.attachment,
                    label: attachment.name
                });
        }
        if (appliedFilters.value.is_reimbursable) {
            const isReimbursable = yesNoOptions.value.find(
                (x) => x.id === appliedFilters.value.is_reimbursable
            );
            if (isReimbursable)
                chips.push({
                    field: 'is_reimbursable',
                    value: appliedFilters.value.is_reimbursable,
                    label: `Non Reimbursable: ${isReimbursable.name}`
                });
        }
        if (appliedFilters.value.is_billable) {
            const isBillable = yesNoOptions.value.find(
                (x) => x.id === appliedFilters.value.is_billable
            );
            if (isBillable)
                chips.push({
                    field: 'is_billable',
                    value: appliedFilters.value.is_billable,
                    label: `Non Billable: ${isBillable.name}`
                });
        }
        if (
            appliedFilters.value.amount_min !== null ||
            appliedFilters.value.amount_max !== null
        ) {
            const min = appliedFilters.value.amount_min ?? 'Any';
            const max = appliedFilters.value.amount_max ?? 'Any';
            chips.push({
                field: 'amount_range',
                label: `Amount: ${min} → ${max}`
            });
        }
        if (
            appliedFilters.value.billable_amount_min !== null ||
            appliedFilters.value.billable_amount_max !== null
        ) {
            const min = appliedFilters.value.billable_amount_min ?? 'Any';
            const max = appliedFilters.value.billable_amount_max ?? 'Any';
            chips.push({
                field: 'billable_amount_range',
                label: `Billable Amount: ${min} → ${max}`
            });
        }
        return chips;
    },

    set(newVal) {
        // handled via @remove
    }
});

function onRemoveFilter(chip) {
    if (chip.field === 'date_range') filters.value.date_range = [];
    if (chip.field === 'users') {
        filters.value.users = filters.value.users.filter(
            (id) => id !== chip.value
        );
    }
    if (chip.field === 'reports') {
        filters.value.reports = filters.value.reports.filter(
            (id) => id !== chip.value
        );
    }
    if (chip.field === 'projects') {
        filters.value.projects = filters.value.projects.filter(
            (id) => id !== chip.value
        );
    }
    if (chip.field === 'customers') {
        filters.value.customers = filters.value.customers.filter(
            (id) => id !== chip.value
        );
    }
    if (chip.field === 'expenseCategories') {
        filters.value.expenseCategories =
            filters.value.expenseCategories.filter((id) => id !== chip.value);
    }
    if (chip.field === 'creditCards') {
        filters.value.creditCards = filters.value.creditCards.filter(
            (id) => id !== chip.value
        );
    }
    if (chip.field === 'status') {
        filters.value.status = filters.value.status.filter(
            (id) => id !== chip.value
        );
    }
    if (chip.field === 'attachment') {
        filters.value.attachment = null;
    }
    if (chip.field === 'is_reimbursable') {
        filters.value.is_reimbursable = null;
    }
    if (chip.field === 'is_billable') {
        filters.value.is_billable = null;
    }
    if (chip.field === 'amount_range') {
        filters.value.amount_min = null;
        filters.value.amount_max = null;
    }
    if (chip.field === 'billable_amount_range') {
        filters.value.billable_amount_min = null;
        filters.value.billable_amount_max = null;
    }
    applyFilters();
}

function clearFilters() {
    filters.value.date_range = [];
    filters.value.users = [];
    filters.value.reports = [];
    filters.value.projects = [];
    filters.value.customers = [];
    filters.value.expenseCategories = [];
    filters.value.creditCards = [];
    filters.value.status = [];
    filters.value.attachment = null;
    filters.value.is_reimbursable = null;
    filters.value.is_billable = null;
    filters.value.amount_min = null;
    filters.value.amount_max = null;
    filters.value.billable_amount_min = null;
    filters.value.billable_amount_max = null;
    applyFilters();
}

const columnsMenuItems = ref([
    {
        field: 'report_name',
        name: 'Report Name',
        sortable: false,
        disabled: true
    },
    { field: 'user.name', name: 'User Name', sortable: true, disabled: true },
    { field: 'date', name: 'Date', sortable: true },
    { field: 'customer.name', name: 'Customer', sortable: true },
    { field: 'project.name', name: 'Project', sortable: true },
    { field: 'expenseCategory.name', name: 'Expense Category', sortable: true },
    { field: 'is_billable', name: 'Non Billable', sortable: true },
    { field: 'is_reimbursable', name: 'Non Reimbursable', sortable: true },
    { field: 'amount', name: 'Amount', sortable: true },
    { field: 'billable_amount', name: 'Billable Amount', sortable: true },
    { field: 'attachment', name: 'Attachment', sortable: false },
    { field: 'creditCard.name', name: 'Credit Card', sortable: true },
    { field: 'description', name: 'Description', sortable: true },
    { field: 'status', name: 'Status', sortable: true }
]);

const exportMenuItems = [
    {
        icon: 'pi pi-file-excel',
        label: 'To Excel',
        command: () =>
            exportFilteredReport({ resource: 'expenses', format: 'excel' })
    },
    {
        icon: 'pi pi-file-pdf',
        label: 'To PDF',
        command: () =>
            exportFilteredReport({ resource: 'expenses', format: 'pdf' })
    }
];

onBeforeMount(async () => {
    await getTablePreferences();
    await getItems();
});

const showFilterDialog = () => {
    filterDialog.value = true;
};

const closeFilterDialog = () => {
    filterDialog.value = false;
};

const totalAmount = computed(() => {
    return items.value.reduce((sum, item) => sum + (item.amount || 0), 0);
});

const totalBillableAmount = computed(() => {
    return items.value.reduce(
        (sum, item) => sum + (item.billable_amount || 0),
        0
    );
});

const hasAppliedFilters = computed(() => {
    return (
        appliedFilters.value.date_range.length > 0 ||
        appliedFilters.value.users.length > 0 ||
        appliedFilters.value.reports.length > 0 ||
        appliedFilters.value.projects.length > 0 ||
        appliedFilters.value.customers.length > 0 ||
        appliedFilters.value.expenseCategories.length > 0 ||
        appliedFilters.value.creditCards.length > 0 ||
        appliedFilters.value.status.length > 0 ||
        appliedFilters.value.attachment !== null ||
        appliedFilters.value.is_reimbursable !== null ||
        appliedFilters.value.is_billable !== null ||
        appliedFilters.value.amount_min !== null ||
        appliedFilters.value.amount_max !== null ||
        appliedFilters.value.billable_amount_min !== null ||
        appliedFilters.value.billable_amount_max !== null
    );
});

watch(visibleColumns, (newVal) => {
    const required = columnsMenuItems.value.filter((c) => c.disabled);

    const ordered = columnsMenuItems.value.filter(
        (col) =>
            required.includes(col) || newVal.some((v) => v.field === col.field)
    );

    const changed =
        ordered.length !== newVal.length ||
        ordered.some((c, i) => c.field !== newVal[i].field);

    if (changed) {
        visibleColumns.value = ordered;
    }
});

const toggleColumnSelections = () => {
    columnSelectionsRef.value.show();
};

const showExportMenu = (event) => {
    exportMenu.value.toggle(event);
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

const applyFilters = async () => {
    try {
        busy.value = true;
        pagination.resetPageParams();
        // Copy current filters to appliedFilters
        appliedFilters.value = JSON.parse(JSON.stringify(filters.value));
        await getItems();
        closeFilterDialog();
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
};

const makeFiltersPayload = () => {
    const filtersPayload = [];
    if (appliedFilters.value.users.length) {
        filtersPayload.push({
            field: 'user_id',
            operator: 'in',
            value: appliedFilters.value.users
        });
    }
    if (appliedFilters.value.projects.length) {
        filtersPayload.push({
            field: 'project_id',
            operator: 'in',
            value: appliedFilters.value.projects
        });
    }
    if (appliedFilters.value.customers.length) {
        filtersPayload.push({
            field: 'customer_id',
            operator: 'in',
            value: appliedFilters.value.customers
        });
    }
    if (appliedFilters.value.expenseCategories.length) {
        filtersPayload.push({
            field: 'expense_category_id',
            operator: 'in',
            value: appliedFilters.value.expenseCategories
        });
    }
    if (appliedFilters.value.creditCards.length) {
        filtersPayload.push({
            field: 'credit_card_id',
            operator: 'in',
            value: appliedFilters.value.creditCards
        });
    }
    if (appliedFilters.value.status.length) {
        filtersPayload.push({
            field: 'status',
            operator: 'in',
            value: appliedFilters.value.status
        });
    }
    if (appliedFilters.value.attachment) {
        if (appliedFilters.value.attachment === 'with_attachment') {
            filtersPayload.push({
                field: 'attachment',
                operator: '!=',
                value: null
            });
        } else {
            filtersPayload.push({
                field: 'attachment',
                operator: '=',
                value: null
            });
        }
    }
    if (appliedFilters.value.is_reimbursable) {
        filtersPayload.push({
            field: 'is_reimbursable',
            operator: '=',
            value: appliedFilters.value.is_reimbursable === 'yes' ? false : true
        });
    }
    if (appliedFilters.value.is_billable) {
        filtersPayload.push({
            field: 'is_billable',
            operator: '=',
            value: appliedFilters.value.is_billable === 'yes' ? false : true
        });
    }
    if (appliedFilters.value.amount_min !== null) {
        filtersPayload.push({
            field: 'amount',
            operator: '>=',
            value: appliedFilters.value.amount_min
        });
    }
    if (appliedFilters.value.amount_max !== null) {
        filtersPayload.push({
            field: 'amount',
            operator: '<=',
            value: appliedFilters.value.amount_max
        });
    }
    if (appliedFilters.value.billable_amount_min !== null) {
        filtersPayload.push({
            field: 'billable_amount',
            operator: '>=',
            value: appliedFilters.value.billable_amount_min
        });
    }
    if (appliedFilters.value.billable_amount_max !== null) {
        filtersPayload.push({
            field: 'billable_amount',
            operator: '<=',
            value: appliedFilters.value.billable_amount_max
        });
    }
    return filtersPayload;
};

const makeCustomFiltersPayload = () => {
    const customFilters = [];
    if (appliedFilters.value.date_range.length) {
        customFilters.push({
            field: 'date_range',
            value: appliedFilters.value.date_range
        });
    }
    if (appliedFilters.value.reports.length) {
        customFilters.push({
            field: 'report_id',
            operator: 'in',
            value: appliedFilters.value.reports
        });
    }
    return customFilters;
};

const getItems = async () => {
    try {
        loading.value = true;
        const params = {
            ...pagination.getPageParams()
        };

        const filtersPayload = makeFiltersPayload();
        const customFilters = makeCustomFiltersPayload();

        const payload = {
            ...sortFilters.getSortFilters(searchText.value),
            filters: filtersPayload,
            customFilters,
            includes: [
                { relation: 'expenseCategory' },
                { relation: 'project' },
                { relation: 'customer' },
                { relation: 'creditCard' },
                { relation: 'user' }
            ]
        };

        const res = await expenseStore.searchExpensesPublic(payload, params);
        // Deduplicate items by ID to prevent duplicate key warnings
        const uniqueItems = [];
        const seenIds = new Set();
        (res.data || []).forEach((item) => {
            if (!seenIds.has(item.id)) {
                seenIds.add(item.id);
                uniqueItems.push(item);
            }
        });
        items.value = uniqueItems;
        totalRecords.value = res?.meta?.total || 0;
    } finally {
        loading.value = false;
    }
};

const getCreditCards = async (searchText = '') => {
    try {
        loadingCreditCards.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            filters: [{ field: 'status', operator: '=', value: 1 }]
        };
        const res = await creditCardStore.list(payload, params);
        creditCards.value = res.data;
    } finally {
        loadingCreditCards.value = false;
    }
};

const getUsers = async (searchText = '') => {
    try {
        loadingUsers.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            filters: [{ field: 'status', operator: '=', value: 'active' }]
        };
        const res = await userStore.list(payload, params);
        users.value = res.data;
    } finally {
        loadingUsers.value = false;
    }
};

const getReports = async (searchText = '') => {
    try {
        loadingReports.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText }
        };
        const res = await expenseStore.getAllExpenseReportsPublic(
            payload,
            params
        );
        reports.value = res.data;
    } finally {
        loadingReports.value = false;
    }
};

const getProjects = async (searchText = '') => {
    try {
        loadingProjects.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            customFilters: [
                {
                    field: 'customer_ids',
                    value: filters.value.customers || null
                }
            ]
        };
        const res = await projectStore.list(payload, params);
        projects.value = res.data;
    } finally {
        loadingProjects.value = false;
    }
};

const getCustomers = async (searchText = '') => {
    try {
        loadingCustomers.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText }
        };
        const res = await customerStore.list(payload, params);
        customers.value = res.data;
    } finally {
        loadingCustomers.value = false;
    }
};

const getExpenseCategories = async (searchText = '') => {
    try {
        loadingExpenseCategories.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText }
        };
        const res = await expenseCategoryStore.list(payload, params);
        expenseCategories.value = res.data;
    } finally {
        loadingExpenseCategories.value = false;
    }
};

const exportFilteredReport = async ({ resource, format }) => {
    try {
        loading.value = true;

        const filtersPayload = makeFiltersPayload();
        const customFilters = makeCustomFiltersPayload();

        const payload = {
            format,
            columns: visibleColumns.value.map((c) => c.field),
            filters: filtersPayload,
            customFilters: customFilters,
            includes: [
                { relation: 'expenseCategory' },
                { relation: 'project' },
                { relation: 'customer' },
                { relation: 'creditCard' },
                { relation: 'user' }
            ]
        };

        await exportReport(resource, payload);
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const getTablePreferences = async () => {
    try {
        loading.value = true;
        const params = { table_key: 'report_expenses' };
        const res =
            await lookupTablePreferenceStore.getTablePreferences(params);
        const visible_columns = res.data?.visible_columns || [];
        visibleColumns.value = mapVisibleColumns(
            visible_columns,
            columnsMenuItems.value
        );

        // fallback if backend returns nothing - show default columns
        if (!visibleColumns.value.length) {
            const defaultFields = [
                'report_name',
                'user.name',
                'date',
                'customer.name',
                'project.name'
            ];
            visibleColumns.value = columnsMenuItems.value.filter((c) =>
                defaultFields.includes(c.field)
            );
        }
    } finally {
        loading.value = false;
    }
};

const saveTablePreferences = async (tableKey, visibleColumns) => {
    try {
        await lookupTablePreferenceStore.saveTablePreferences({
            table_key: tableKey,
            preferences: { visible_columns: visibleColumns.map((c) => c.field) }
        });
    } catch (e) {
        console.error('Failed to save table preferences', e);
    }
};

const debouncedSaveTablePreferences = debounce((tableKey, columns) => {
    saveTablePreferences(tableKey, columns);
}, 500);
</script>

<template>
    <TitleHeader>
        <template #title>
            <div>
                <h1 class="text-2xl sm:text-3xl font-bold">Expenses</h1>
            </div>
        </template>
        <template #actions>
            <Button
                label="Export"
                icon="pi pi-download"
                variant="outlined"
                size="medium"
                @click="showExportMenu($event)"
                :disabled="items.length === 0 || loading"
            />

            <Menu ref="exportMenu" :model="exportMenuItems" :popup="true" />
        </template>
    </TitleHeader>

    <Card class="py-3 px-2">
        <template #content>
            <BaseTable
                dataKey="id"
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
                        class="flex flex-col sm:flex-row sm:items-center gap-3 mb-5"
                    >
                        <Button
                            variant="outlined"
                            size="medium"
                            label="Filter"
                            icon="pi pi-filter"
                            @click="showFilterDialog"
                            :badge="`${activeChips.length}`"
                            badgeSeverity="primary"
                        />

                        <Button
                            variant="outlined"
                            size="medium"
                            label="Columns"
                            icon="pi pi-cog"
                            @click="toggleColumnSelections()"
                            :badge="`${visibleColumns.length}`"
                            badgeSeverity="primary"
                        />

                        <MultiSelect
                            filter
                            ref="columnSelectionsRef"
                            class="hidden p-multiselect-label-empty"
                            v-model="visibleColumns"
                            @change="
                                debouncedSaveTablePreferences(
                                    'report_expenses',
                                    visibleColumns
                                )
                            "
                            :options="columnsMenuItems"
                            optionLabel="name"
                            optionDisabled="disabled"
                            style="width: 1px !important"
                        />
                    </div>
                    <div
                        v-if="hasAppliedFilters"
                        class="flex flex-wrap gap-2 my-3"
                    >
                        <Chip
                            v-for="(chip, index) in activeChips"
                            :key="
                                chip.field +
                                '-' +
                                (chip.value ?? chip.label) +
                                '-' +
                                index
                            "
                            :label="chip.label"
                            removable
                            @remove="onRemoveFilter(chip)"
                        />
                        <Button
                            v-if="activeChips.length"
                            link
                            label="Clear Filters"
                            @click="clearFilters()"
                        />
                    </div>
                </template>

                <Column
                    v-for="(col, idx) in visibleColumns"
                    :key="col.field + '_' + idx"
                    :field="col.field"
                    :header="col.name"
                    :sortable="col.sortable"
                    :class="{
                        'whitespace-nowrap': true,
                        'amount-column': ['amount', 'billable_amount'].includes(
                            col.field
                        )
                    }"
                >
                    <template v-if="col.field === 'date'" #body="{ data }">
                        {{ formatDate(data.date) }}
                    </template>
                    <template
                        v-else-if="col.field === 'is_billable'"
                        #body="{ data }"
                    >
                        <StatusTag
                            v-if="!data.is_billable"
                            :status="!data.is_billable ? 'Yes' : 'No'"
                        />
                    </template>
                    <template
                        v-else-if="col.field === 'is_reimbursable'"
                        #body="{ data }"
                    >
                        <StatusTag
                            v-if="!data.is_reimbursable"
                            :status="!data.is_reimbursable ? 'Yes' : 'No'"
                        />
                    </template>
                    <template
                        v-else-if="col.field === 'report_name'"
                        #body="{ data }"
                    >
                        <span v-tooltip.top="data.report_name">
                            {{
                                truncate(data.report_name, {
                                    length: 50
                                })
                            }}
                        </span>
                    </template>
                    <template
                        v-else-if="col.field === 'description'"
                        #body="{ data }"
                    >
                        <span v-tooltip.top="data.description">
                            {{
                                truncate(data.description, {
                                    length: 30
                                })
                            }}
                        </span>
                    </template>
                    <template
                        v-else-if="col.field === 'amount'"
                        #body="{ data }"
                    >
                        {{ moneyFormat(data.amount) }}
                    </template>
                    <template
                        v-else-if="col.field === 'billable_amount'"
                        #body="{ data }"
                    >
                        {{ moneyFormat(data.billable_amount) }}
                    </template>
                    <template
                        v-else-if="col.field === 'attachment'"
                        #body="{ data }"
                    >
                        <Button
                            v-if="data.attachment"
                            as="a"
                            :href="data.attachment"
                            target="_blank"
                            rounded
                            variant="outlined"
                            icon="pi pi-eye"
                            size="small"
                            class="mx-auto !flex"
                        />
                    </template>
                    <template
                        v-else-if="col.field === 'status'"
                        #body="{ data }"
                    >
                        <StatusTag :status="data.status" />
                    </template>

                    <template v-if="col.field === 'amount'" #footer>
                        <span class="font-semibold text-lg">
                            {{ moneyFormat(totalAmount) }}</span
                        >
                    </template>
                    <template
                        v-else-if="col.field === 'billable_amount'"
                        #footer
                    >
                        <span class="font-semibold text-lg">
                            {{ moneyFormat(totalBillableAmount) }}</span
                        >
                    </template>
                </Column>

                <template #empty> No expenses found</template>
            </BaseTable>
        </template>
    </Card>

    <Dialog
        v-model:visible="filterDialog"
        class="w-full sm:w-2/3 md:w-1/2 lg:w-6/12"
        header="Filters"
        :modal="true"
    >
        <div class="grid grid-cols-12 gap-4 space-y-1">
            <div class="mb-3 col-span-12">
                <label class="block mb-3">Date</label>
                <InputField
                    placeholder="Select Date Range"
                    :disabled="busy"
                    v-model="filters.date_range"
                    clearable
                    :range="true"
                    variant="date"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Select Users</label>
                <ApiMultiselect
                    id="users"
                    placeholder="Select"
                    class="w-full"
                    showClear
                    filter
                    :loading="loadingUsers"
                    @search="getUsers"
                    v-model="filters.users"
                    :options="users"
                    optionLabel="name"
                    optionValue="id"
                    :disabled="busy || loadingUsers"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Select Reports</label>
                <ApiMultiselect
                    id="reports"
                    placeholder="Select"
                    class="w-full"
                    showClear
                    filter
                    :loading="loadingReports"
                    @search="getReports"
                    v-model="filters.reports"
                    :options="reports"
                    optionLabel="name"
                    optionValue="id"
                    :disabled="busy || loadingReports"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Select Customers</label>
                <ApiMultiselect
                    id="customers"
                    placeholder="Select"
                    class="w-full"
                    showClear
                    filter
                    :loading="loadingCustomers"
                    @search="getCustomers"
                    @change="getProjects('')"
                    v-model="filters.customers"
                    :options="customers"
                    optionLabel="name"
                    optionValue="id"
                    :disabled="busy || loadingCustomers"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Select Projects</label>
                <ApiMultiselect
                    id="projects"
                    placeholder="Select"
                    class="w-full"
                    showClear
                    filter
                    :loading="loadingProjects"
                    @search="getProjects"
                    v-model="filters.projects"
                    :options="projects"
                    optionLabel="name"
                    optionValue="id"
                    :disabled="busy || loadingProjects || loadingCustomers"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Select Expense Categories</label>
                <ApiMultiselect
                    id="expenseCategories"
                    placeholder="Select"
                    class="w-full"
                    showClear
                    filter
                    :loading="loadingExpenseCategories"
                    @search="getExpenseCategories"
                    v-model="filters.expenseCategories"
                    :options="expenseCategories"
                    optionLabel="name"
                    optionValue="id"
                    :disabled="busy || loadingExpenseCategories"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Select Credit Cards</label>
                <ApiMultiselect
                    id="creditCards"
                    placeholder="Select"
                    class="w-full"
                    showClear
                    filter
                    :loading="loadingCreditCards"
                    @search="getCreditCards"
                    v-model="filters.creditCards"
                    :options="creditCards"
                    optionLabel="name"
                    optionValue="id"
                    :disabled="busy || loadingCreditCards"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Attachment</label>
                <InputField
                    id="attachment"
                    placeholder="Select"
                    variant="dropdown"
                    class="w-full"
                    showClear
                    v-model="filters.attachment"
                    :options="attachmentOptions"
                    optionLabel="name"
                    optionValue="id"
                    :disabled="busy"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Select Status</label>
                <ApiMultiselect
                    id="status"
                    placeholder="Select"
                    class="w-full"
                    showClear
                    filter
                    v-model="filters.status"
                    :options="expenseStatuses"
                    optionLabel="name"
                    optionValue="id"
                    :disabled="busy"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Non Billable</label>
                <InputField
                    id="nonBillable"
                    placeholder="Select"
                    variant="dropdown"
                    class="w-full"
                    showClear
                    v-model="filters.is_billable"
                    :options="yesNoOptions"
                    optionLabel="name"
                    optionValue="id"
                    :disabled="busy"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Non Reimbursable</label>
                <InputField
                    id="nonReimburseable"
                    placeholder="Select"
                    variant="dropdown"
                    class="w-full"
                    showClear
                    v-model="filters.is_reimbursable"
                    :options="yesNoOptions"
                    optionLabel="name"
                    optionValue="id"
                    :disabled="busy"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Amount (Min)</label>
                <InputField
                    id="amount_min"
                    variant="number"
                    class="w-full"
                    v-model="filters.amount_min"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Amount (Max)</label>
                <InputField
                    id="amount_max"
                    variant="number"
                    class="w-full"
                    v-model="filters.amount_max"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Billable Amount (Min)</label>
                <InputField
                    id="billable_amount_min"
                    variant="number"
                    class="w-full"
                    v-model="filters.billable_amount_min"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Billable Amount (Max)</label>
                <InputField
                    id="billable_amount_max"
                    variant="number"
                    class="w-full"
                    v-model="filters.billable_amount_max"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
        </div>
        <template #footer>
            <Button
                text
                variant="outlined"
                label="Cancel"
                @click="closeFilterDialog"
                :disabled="busy"
                class="mr-2"
                type="button"
            />
            <Button
                :loading="busy"
                :disabled="busy"
                label="Apply Filters"
                @click="applyFilters"
            />
        </template>
    </Dialog>
</template>
