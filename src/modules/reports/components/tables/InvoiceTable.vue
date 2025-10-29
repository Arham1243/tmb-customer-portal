<script setup>
import { onBeforeMount, ref, computed, watch } from 'vue';
import { debounce } from 'lodash-es';
import {
    useProjectStore,
    useCustomerStore,
    useLookupTablePreferenceStore
} from '@/modules/core/stores';
import { useUserStore } from '@/modules/administration/stores';
import { useInvoiceStore } from '@/modules/accounting/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';
import { useReportExport } from '@/composables/useReportExport';
import { invoiceStatuses, invoicesPaymentStatuses } from '@/config/enums';

const invoiceStore = useInvoiceStore();
const userStore = useUserStore();
const projectStore = useProjectStore();
const customerStore = useCustomerStore();
const { mapVisibleColumns, formatDate, moneyFormat, formatHours } =
    useHelpers();
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
const loadingProjects = ref(false);
const projects = ref([]);
const loadingCustomers = ref(false);
const customers = ref([]);
const loadingProjectTasks = ref(false);
const projectTasks = ref([]);
const filters = ref({
    date_range: [],
    projects: [],
    customers: [],
    status: [],
    payment_status: [],
    attachment: null,
    billable_hours_min: null,
    billable_hours_max: null,
    charge_amount_min: null,
    charge_amount_max: null,
    billable_expenses_min: null,
    billable_expenses_max: null,
    additional_items_total_min: null,
    additional_items_total_max: null,
    outstanding_balance_min: null,
    outstanding_balance_max: null,
    total_billable_min: null,
    total_billable_max: null
});

// Track actually applied filters (sent to API)
const appliedFilters = ref({
    date_range: [],
    projects: [],
    customers: [],
    status: [],
    payment_status: [],
    attachment: null,
    billable_hours_min: null,
    billable_hours_max: null,
    charge_amount_min: null,
    charge_amount_max: null,
    billable_expenses_min: null,
    billable_expenses_max: null,
    additional_items_total_min: null,
    additional_items_total_max: null,
    outstanding_balance_min: null,
    outstanding_balance_max: null,
    total_billable_min: null,
    total_billable_max: null
});

const yesNoOptions = ref([
    { name: 'Yes', id: 'yes' },
    { name: 'No', id: 'no' }
]);

const attachmentOptions = ref([
    { name: 'With PDF', id: 'yes' },
    { name: 'Without PDF', id: 'no' }
]);

const activeChips = computed({
    get() {
        const chips = [];
        if (appliedFilters.value.date_range.length) {
            chips.push({
                field: 'date_range',
                label: `Invoice Date: ${appliedFilters.value.date_range[0]} → ${appliedFilters.value.date_range[1]}`
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
        if (appliedFilters.value.status.length) {
            appliedFilters.value.status.forEach((s) => {
                const status = invoiceStatuses.find((x) => x.id === s);
                if (status)
                    chips.push({
                        field: 'status',
                        value: s,
                        label: `Status: ${status.name}`
                    });
            });
        }
        if (appliedFilters.value.payment_status.length) {
            appliedFilters.value.payment_status.forEach((s) => {
                const status = invoicesPaymentStatuses.find((x) => x.id === s);
                if (status)
                    chips.push({
                        field: 'payment_status',
                        value: s,
                        label: `Billing Status: ${status.name}`
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
                    label: `PDF: ${attachment.name}`
                });
        }
        if (
            appliedFilters.value.billable_hours_min !== null ||
            appliedFilters.value.billable_hours_max !== null
        ) {
            const min = appliedFilters.value.billable_hours_min ?? 'Any';
            const max = appliedFilters.value.billable_hours_max ?? 'Any';
            chips.push({
                field: 'billable_hours_range',
                label: `Billable Hours: ${min} → ${max}`
            });
        }
        if (
            appliedFilters.value.charge_amount_min !== null ||
            appliedFilters.value.charge_amount_max !== null
        ) {
            const min = appliedFilters.value.charge_amount_min ?? 'Any';
            const max = appliedFilters.value.charge_amount_max ?? 'Any';
            chips.push({
                field: 'charge_amount_range',
                label: `Charge Amount: ${min} → ${max}`
            });
        }
        if (
            appliedFilters.value.billable_expenses_min !== null ||
            appliedFilters.value.billable_expenses_max !== null
        ) {
            const min = appliedFilters.value.billable_expenses_min ?? 'Any';
            const max = appliedFilters.value.billable_expenses_max ?? 'Any';
            chips.push({
                field: 'billable_expenses_range',
                label: `Billable Expenses: ${min} → ${max}`
            });
        }
        if (
            appliedFilters.value.additional_items_total_min !== null ||
            appliedFilters.value.additional_items_total_max !== null
        ) {
            const min =
                appliedFilters.value.additional_items_total_min ?? 'Any';
            const max =
                appliedFilters.value.additional_items_total_max ?? 'Any';
            chips.push({
                field: 'additional_items_total_range',
                label: `Additional Items: ${min} → ${max}`
            });
        }
        if (
            appliedFilters.value.outstanding_balance_min !== null ||
            appliedFilters.value.outstanding_balance_max !== null
        ) {
            const min = appliedFilters.value.outstanding_balance_min ?? 'Any';
            const max = appliedFilters.value.outstanding_balance_max ?? 'Any';
            chips.push({
                field: 'outstanding_balance_range',
                label: `Outstanding Balance: ${min} → ${max}`
            });
        }
        if (
            appliedFilters.value.total_billable_min !== null ||
            appliedFilters.value.total_billable_max !== null
        ) {
            const min = appliedFilters.value.total_billable_min ?? 'Any';
            const max = appliedFilters.value.total_billable_max ?? 'Any';
            chips.push({
                field: 'total_billable_range',
                label: `Total Billable: ${min} → ${max}`
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
    if (chip.field === 'status') {
        filters.value.status = filters.value.status.filter(
            (id) => id !== chip.value
        );
    }
    if (chip.field === 'payment_status') {
        filters.value.payment_status = filters.value.payment_status.filter(
            (id) => id !== chip.value
        );
    }
    if (chip.field === 'attachment') {
        filters.value.attachment = null;
    }
    if (chip.field === 'billable_hours_range') {
        filters.value.billable_hours_min = null;
        filters.value.billable_hours_max = null;
    }
    if (chip.field === 'charge_amount_range') {
        filters.value.charge_amount_min = null;
        filters.value.charge_amount_max = null;
    }
    if (chip.field === 'billable_expenses_range') {
        filters.value.billable_expenses_min = null;
        filters.value.billable_expenses_max = null;
    }
    if (chip.field === 'additional_items_total_range') {
        filters.value.additional_items_total_min = null;
        filters.value.additional_items_total_max = null;
    }
    if (chip.field === 'outstanding_balance_range') {
        filters.value.outstanding_balance_min = null;
        filters.value.outstanding_balance_max = null;
    }
    if (chip.field === 'total_billable_range') {
        filters.value.total_billable_min = null;
        filters.value.total_billable_max = null;
    }
    applyFilters();
}

function clearFilters() {
    filters.value.date_range = [];
    filters.value.projects = [];
    filters.value.customers = [];
    filters.value.status = [];
    filters.value.payment_status = [];
    filters.value.attachment = null;
    filters.value.billable_hours_min = null;
    filters.value.billable_hours_max = null;
    filters.value.charge_amount_min = null;
    filters.value.charge_amount_max = null;
    filters.value.billable_expenses_min = null;
    filters.value.billable_expenses_max = null;
    filters.value.additional_items_total_min = null;
    filters.value.additional_items_total_max = null;
    filters.value.outstanding_balance_min = null;
    filters.value.outstanding_balance_max = null;
    filters.value.total_billable_min = null;
    filters.value.total_billable_max = null;
    applyFilters();
}

const columnsMenuItems = ref([
    { field: 'invoice_number', name: 'Invoice Number', sortable: true },
    { field: 'invoice_date', name: 'Invoice Date', sortable: true },
    { field: 'customer.name', name: 'Customer', sortable: true },
    { field: 'projects', name: 'Projects', sortable: false },
    { field: 'billable_hours', name: 'Billable Hours', sortable: true },
    { field: 'charge_amount', name: 'Charge Amount', sortable: true },
    { field: 'billable_expenses', name: 'Billable Expenses', sortable: true },
    {
        field: 'additional_items_total',
        name: 'Additional Items',
        sortable: true
    },
    {
        field: 'outstanding_balance',
        name: 'Outstanding Balance',
        sortable: true
    },
    { field: 'total_billable', name: 'Total Billable', sortable: true },
    {
        field: 'pdf_path',
        name: 'Invoice PDF',
        sortable: false
    },
    { field: 'status', name: 'Status', sortable: true },
    { field: 'payment_status', name: 'Billing Status', sortable: true }
]);

const exportMenuItems = [
    {
        icon: 'pi pi-file-excel',
        label: 'To Excel',
        command: () =>
            exportFilteredReport({ resource: 'invoices', format: 'excel' })
    },
    {
        icon: 'pi pi-file-pdf',
        label: 'To PDF',
        command: () =>
            exportFilteredReport({ resource: 'invoices', format: 'pdf' })
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

// Calculate totals for current page items
const totalBillableHours = computed(() => {
    return items.value.reduce(
        (sum, item) => sum + (item.billable_hours || 0),
        0
    );
});

const totalChargeAmount = computed(() => {
    return items.value.reduce(
        (sum, item) => sum + (item.charge_amount || 0),
        0
    );
});

const totalBillableExpenses = computed(() => {
    return items.value.reduce(
        (sum, item) => sum + (item.billable_expenses || 0),
        0
    );
});

const totalAdditionalItemsTotal = computed(() => {
    return items.value.reduce(
        (sum, item) => sum + (item.additional_items_total || 0),
        0
    );
});

const totalOutstandingBalance = computed(() => {
    return items.value.reduce(
        (sum, item) => sum + (item.outstanding_balance || 0),
        0
    );
});

const totalTotalBillable = computed(() => {
    return items.value.reduce(
        (sum, item) => sum + (item.total_billable || 0),
        0
    );
});

const hasAppliedFilters = computed(() => {
    return (
        appliedFilters.value.date_range.length > 0 ||
        appliedFilters.value.projects.length > 0 ||
        appliedFilters.value.customers.length > 0 ||
        appliedFilters.value.status.length > 0 ||
        appliedFilters.value.payment_status.length > 0 ||
        appliedFilters.value.attachment !== null ||
        appliedFilters.value.billable_hours_min !== null ||
        appliedFilters.value.billable_hours_max !== null ||
        appliedFilters.value.charge_amount_min !== null ||
        appliedFilters.value.charge_amount_max !== null ||
        appliedFilters.value.billable_expenses_min !== null ||
        appliedFilters.value.billable_expenses_max !== null ||
        appliedFilters.value.additional_items_total_min !== null ||
        appliedFilters.value.additional_items_total_max !== null ||
        appliedFilters.value.outstanding_balance_min !== null ||
        appliedFilters.value.outstanding_balance_max !== null ||
        appliedFilters.value.total_billable_min !== null ||
        appliedFilters.value.total_billable_max !== null
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

const getFooter = (field) => {
    switch (field) {
        case 'billable_hours':
            return formatHours(totalBillableHours.value);
        case 'charge_amount':
            return moneyFormat(totalChargeAmount.value);
        case 'billable_expenses':
            return moneyFormat(totalBillableExpenses.value);
        case 'additional_items_total':
            return moneyFormat(totalAdditionalItemsTotal.value);
        case 'outstanding_balance':
            return moneyFormat(totalOutstandingBalance.value);
        case 'total_billable':
            return moneyFormat(totalTotalBillable.value);
        default:
            return '';
    }
};

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
    if (appliedFilters.value.customers.length) {
        filtersPayload.push({
            field: 'customer_id',
            operator: 'in',
            value: appliedFilters.value.customers
        });
    }
    if (appliedFilters.value.status.length) {
        filtersPayload.push({
            field: 'status',
            operator: 'in',
            value: appliedFilters.value.status
        });
    }
    if (appliedFilters.value.payment_status.length) {
        filtersPayload.push({
            field: 'payment_status',
            operator: 'in',
            value: appliedFilters.value.payment_status
        });
    }
    if (appliedFilters.value.billable_hours_min !== null) {
        filtersPayload.push({
            field: 'billable_hours',
            operator: '>=',
            value: appliedFilters.value.billable_hours_min
        });
    }
    if (appliedFilters.value.billable_hours_max !== null) {
        filtersPayload.push({
            field: 'billable_hours',
            operator: '<=',
            value: appliedFilters.value.billable_hours_max
        });
    }
    if (appliedFilters.value.charge_amount_min !== null) {
        filtersPayload.push({
            field: 'charge_amount',
            operator: '>=',
            value: appliedFilters.value.charge_amount_min
        });
    }
    if (appliedFilters.value.charge_amount_max !== null) {
        filtersPayload.push({
            field: 'charge_amount',
            operator: '<=',
            value: appliedFilters.value.charge_amount_max
        });
    }
    if (appliedFilters.value.billable_expenses_min !== null) {
        filtersPayload.push({
            field: 'billable_expenses',
            operator: '>=',
            value: appliedFilters.value.billable_expenses_min
        });
    }
    if (appliedFilters.value.billable_expenses_max !== null) {
        filtersPayload.push({
            field: 'billable_expenses',
            operator: '<=',
            value: appliedFilters.value.billable_expenses_max
        });
    }
    if (appliedFilters.value.additional_items_total_min !== null) {
        filtersPayload.push({
            field: 'additional_items_total',
            operator: '>=',
            value: appliedFilters.value.additional_items_total_min
        });
    }
    if (appliedFilters.value.additional_items_total_max !== null) {
        filtersPayload.push({
            field: 'additional_items_total',
            operator: '<=',
            value: appliedFilters.value.additional_items_total_max
        });
    }
    if (appliedFilters.value.outstanding_balance_min !== null) {
        filtersPayload.push({
            field: 'outstanding_balance',
            operator: '>=',
            value: appliedFilters.value.outstanding_balance_min
        });
    }
    if (appliedFilters.value.outstanding_balance_max !== null) {
        filtersPayload.push({
            field: 'outstanding_balance',
            operator: '<=',
            value: appliedFilters.value.outstanding_balance_max
        });
    }
    if (appliedFilters.value.total_billable_min !== null) {
        filtersPayload.push({
            field: 'total_billable',
            operator: '>=',
            value: appliedFilters.value.total_billable_min
        });
    }
    if (appliedFilters.value.total_billable_max !== null) {
        filtersPayload.push({
            field: 'total_billable',
            operator: '<=',
            value: appliedFilters.value.total_billable_max
        });
    }
    return filtersPayload;
};

const makeCustomFiltersPayload = () => {
    const customFilters = [];
    if (appliedFilters.value.date_range.length) {
        customFilters.push({
            field: 'invoice_date_range',
            value: appliedFilters.value.date_range
        });
    }
    if (appliedFilters.value.projects.length) {
        customFilters.push({
            field: 'project_ids',
            value: appliedFilters.value.projects
        });
    }
    if (appliedFilters.value.attachment) {
        customFilters.push({
            field: 'pdf_path',
            value:
                appliedFilters.value.attachment === 'yes' ? 'not_null' : 'null'
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
                { relation: 'customer' },
                { relation: 'project' },
                { relation: 'consolidatedProjects' }
            ]
        };

        const res = await invoiceStore.search(payload, params);
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
                { relation: 'customer' },
                { relation: 'project' },
                { relation: 'consolidatedProjects' }
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
        const params = { table_key: 'report_invoices' };
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
                <h1 class="text-2xl sm:text-3xl font-bold">Invoices</h1>
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
                                    'report_invoices',
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
                        'amount-column': [
                            'charge_amount',
                            'billable_expenses',
                            'additional_items_total',
                            'total_billable',
                            'outstanding_balance'
                        ].includes(col.field)
                    }"
                >
                    <template
                        v-if="col.field === 'invoice_date'"
                        #body="{ data }"
                    >
                        {{ formatDate(data.invoice_date) }}
                    </template>

                    <template
                        v-else-if="col.field === 'projects'"
                        #body="{ data }"
                    >
                        <div class="flex flex-wrap gap-1">
                            <Chip
                                v-for="project in Array.isArray(data.projects)
                                    ? data.projects
                                    : [data.projects]"
                                :key="project?.id"
                                :label="project?.name"
                            />
                        </div>
                    </template>

                    <template
                        v-else-if="col.field === 'billable_hours'"
                        #body="{ data }"
                    >
                        {{ formatHours(data.billable_hours) }}
                    </template>

                    <template
                        v-else-if="col.field === 'charge_amount'"
                        #body="{ data }"
                    >
                        {{ moneyFormat(data.charge_amount) }}
                    </template>

                    <template
                        v-else-if="col.field === 'billable_expenses'"
                        #body="{ data }"
                    >
                        {{ moneyFormat(data.billable_expenses) }}
                    </template>

                    <template
                        v-else-if="col.field === 'additional_items_total'"
                        #body="{ data }"
                    >
                        {{ moneyFormat(data.additional_items_total) }}
                    </template>

                    <template
                        v-else-if="col.field === 'outstanding_balance'"
                        #body="{ data }"
                    >
                        {{ moneyFormat(data.outstanding_balance) }}
                    </template>

                    <template
                        v-else-if="col.field === 'total_billable'"
                        #body="{ data }"
                    >
                        {{ moneyFormat(data.total_billable) }}
                    </template>

                    <template
                        v-else-if="col.field === 'pdf_path'"
                        #body="{ data }"
                    >
                        <Button
                            v-if="data.pdf_path"
                            as="a"
                            :href="data.pdf_path"
                            target="_blank"
                            rounded
                            variant="outlined"
                            icon="pi pi-eye"
                            size="small"
                            class="mx-auto !flex"
                        />
                    </template>

                    <template
                        v-else-if="col.field === 'payment_status'"
                        #body="{ data }"
                    >
                        <StatusTag :status="data.payment_status" />
                    </template>

                    <template
                        v-else-if="col.field === 'status'"
                        #body="{ data }"
                    >
                        <StatusTag :status="data.status" />
                    </template>

                    <template v-if="col.field === 'billable_hours'" #footer>
                        <span class="font-semibold text-lg">{{
                            formatHours(totalBillableHours)
                        }}</span>
                    </template>

                    <template v-else-if="col.field === 'charge_amount'" #footer>
                        <span class="font-semibold text-lg">{{
                            moneyFormat(totalChargeAmount)
                        }}</span>
                    </template>

                    <template
                        v-else-if="col.field === 'billable_expenses'"
                        #footer
                    >
                        <span class="font-semibold text-lg">{{
                            moneyFormat(totalBillableExpenses)
                        }}</span>
                    </template>

                    <template
                        v-else-if="col.field === 'additional_items_total'"
                        #footer
                    >
                        <span class="font-semibold text-lg">{{
                            moneyFormat(totalAdditionalItemsTotal)
                        }}</span>
                    </template>

                    <template
                        v-else-if="col.field === 'outstanding_balance'"
                        #footer
                    >
                        <span class="font-semibold text-lg">{{
                            moneyFormat(totalOutstandingBalance)
                        }}</span>
                    </template>

                    <template
                        v-else-if="col.field === 'total_billable'"
                        #footer
                    >
                        <span class="font-semibold text-lg">{{
                            moneyFormat(totalTotalBillable)
                        }}</span>
                    </template>
                </Column>

                <template #empty> No invoices found</template>
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
                <label class="block mb-3">Select Status</label>
                <ApiMultiselect
                    id="status"
                    placeholder="Select"
                    class="w-full"
                    showClear
                    filter
                    v-model="filters.status"
                    :options="invoiceStatuses"
                    optionLabel="name"
                    optionValue="id"
                    :disabled="busy"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Select Billing Status</label>
                <ApiMultiselect
                    id="payment_status"
                    placeholder="Select"
                    class="w-full"
                    showClear
                    filter
                    v-model="filters.payment_status"
                    :options="invoicesPaymentStatuses"
                    optionLabel="name"
                    optionValue="id"
                    :disabled="busy"
                />
            </div>
            <div class="mb-3 col-span-12">
                <label class="block mb-3">Invoice PDF</label>
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
                <label class="block mb-3">Billable Hours (Min)</label>
                <InputField
                    id="billable_hours_min"
                    variant="number"
                    class="w-full"
                    v-model="filters.billable_hours_min"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Billable Hours (Max)</label>
                <InputField
                    id="billable_hours_max"
                    variant="number"
                    class="w-full"
                    v-model="filters.billable_hours_max"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Charge Amount (Min)</label>
                <InputField
                    id="charge_amount_min"
                    variant="number"
                    class="w-full"
                    v-model="filters.charge_amount_min"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Charge Amount (Max)</label>
                <InputField
                    id="charge_amount_max"
                    variant="number"
                    class="w-full"
                    v-model="filters.charge_amount_max"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Billable Expenses (Min)</label>
                <InputField
                    id="billable_expenses_min"
                    variant="number"
                    class="w-full"
                    v-model="filters.billable_expenses_min"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Billable Expenses (Max)</label>
                <InputField
                    id="billable_expenses_max"
                    variant="number"
                    class="w-full"
                    v-model="filters.billable_expenses_max"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Additional Items Total (Min)</label>
                <InputField
                    id="additional_items_total_min"
                    variant="number"
                    class="w-full"
                    v-model="filters.additional_items_total_min"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Additional Items Total (Max)</label>
                <InputField
                    id="additional_items_total_max"
                    variant="number"
                    class="w-full"
                    v-model="filters.additional_items_total_max"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Outstanding Balance (Min)</label>
                <InputField
                    id="outstanding_balance_min"
                    variant="number"
                    class="w-full"
                    v-model="filters.outstanding_balance_min"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Outstanding Balance (Max)</label>
                <InputField
                    id="outstanding_balance_max"
                    variant="number"
                    class="w-full"
                    v-model="filters.outstanding_balance_max"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Total Billable (Min)</label>
                <InputField
                    id="total_billable_min"
                    variant="number"
                    class="w-full"
                    v-model="filters.total_billable_min"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Total Billable (Max)</label>
                <InputField
                    id="total_billable_max"
                    variant="number"
                    class="w-full"
                    v-model="filters.total_billable_max"
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
