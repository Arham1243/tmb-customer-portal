<script setup>
import { onBeforeMount, ref, computed, watch } from 'vue';
import { truncate, debounce } from 'lodash-es';
import {
    useTimesheetStore,
    useProjectStore,
    useProjectTaskStore,
    useCustomerStore,
    useLookupTablePreferenceStore
} from '@/modules/core/stores';
import { useUserStore } from '@/modules/administration/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';
import { useReportExport } from '@/composables/useReportExport';
import { timesheetStatuses } from '@/config/enums';

const timesheetStore = useTimesheetStore();
const userStore = useUserStore();
const projectStore = useProjectStore();
const projectTaskStore = useProjectTaskStore();
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
    users: [],
    projects: [],
    customers: [],
    projectTasks: [],
    status: [],
    is_billable: null,
    is_reportable: null,
    input_hours_min: null,
    input_hours_max: null,
    billable_hours_min: null,
    billable_hours_max: null,
    billing_rate_min: null,
    billing_rate_max: null,
    charge_rate_min: null,
    charge_rate_max: null,
    charge_amount_min: null,
    charge_amount_max: null
});

// Track actually applied filters (sent to API)
const appliedFilters = ref({
    date_range: [],
    users: [],
    projects: [],
    customers: [],
    projectTasks: [],
    status: [],
    is_billable: null,
    is_reportable: null,
    input_hours_min: null,
    input_hours_max: null,
    billable_hours_min: null,
    billable_hours_max: null,
    billing_rate_min: null,
    billing_rate_max: null,
    charge_rate_min: null,
    charge_rate_max: null,
    charge_amount_min: null,
    charge_amount_max: null
});

const yesNoOptions = ref([
    { name: 'Yes', id: 'yes' },
    { name: 'No', id: 'no' }
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
        if (appliedFilters.value.projectTasks.length) {
            appliedFilters.value.projectTasks.forEach((t) => {
                const task = projectTasks.value.find((x) => x.id === t);
                if (task)
                    chips.push({
                        field: 'projectTasks',
                        value: t,
                        label: `Task: ${task.name}`
                    });
            });
        }
        if (appliedFilters.value.status.length) {
            appliedFilters.value.status.forEach((s) => {
                const status = timesheetStatuses.find((x) => x.id === s);
                if (status)
                    chips.push({
                        field: 'status',
                        value: s,
                        label: `Status: ${status.name}`
                    });
            });
        }
        if (appliedFilters.value.is_reportable) {
            const isReportable = yesNoOptions.value.find(
                (x) => x.id === appliedFilters.value.is_reportable
            );
            if (isReportable)
                chips.push({
                    field: 'is_reportable',
                    value: appliedFilters.value.is_reportable,
                    label: `Non Reportable: ${isReportable.name}`
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
            appliedFilters.value.input_hours_min !== null ||
            appliedFilters.value.input_hours_max !== null
        ) {
            const min = appliedFilters.value.input_hours_min ?? 'Any';
            const max = appliedFilters.value.input_hours_max ?? 'Any';
            chips.push({
                field: 'input_hours_range',
                label: `Input Hours: ${min} → ${max}`
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
            appliedFilters.value.billing_rate_min !== null ||
            appliedFilters.value.billing_rate_max !== null
        ) {
            const min = appliedFilters.value.billing_rate_min ?? 'Any';
            const max = appliedFilters.value.billing_rate_max ?? 'Any';
            chips.push({
                field: 'billing_rate_range',
                label: `Billing Rate: ${min} → ${max}`
            });
        }
        if (
            appliedFilters.value.charge_rate_min !== null ||
            appliedFilters.value.charge_rate_max !== null
        ) {
            const min = appliedFilters.value.charge_rate_min ?? 'Any';
            const max = appliedFilters.value.charge_rate_max ?? 'Any';
            chips.push({
                field: 'charge_rate_range',
                label: `Charge Rate: ${min} → ${max}`
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
    if (chip.field === 'projectTasks') {
        filters.value.projectTasks = filters.value.projectTasks.filter(
            (id) => id !== chip.value
        );
    }
    if (chip.field === 'status') {
        filters.value.status = filters.value.status.filter(
            (id) => id !== chip.value
        );
    }
    if (chip.field === 'is_reportable') {
        filters.value.is_reportable = null;
    }
    if (chip.field === 'is_billable') {
        filters.value.is_billable = null;
    }
    if (chip.field === 'input_hours_range') {
        filters.value.input_hours_min = null;
        filters.value.input_hours_max = null;
    }
    if (chip.field === 'billable_hours_range') {
        filters.value.billable_hours_min = null;
        filters.value.billable_hours_max = null;
    }
    if (chip.field === 'billing_rate_range') {
        filters.value.billing_rate_min = null;
        filters.value.billing_rate_max = null;
    }
    if (chip.field === 'charge_rate_range') {
        filters.value.charge_rate_min = null;
        filters.value.charge_rate_max = null;
    }
    if (chip.field === 'charge_amount_range') {
        filters.value.charge_amount_min = null;
        filters.value.charge_amount_max = null;
    }
    applyFilters();
}

function clearFilters() {
    filters.value.date_range = [];
    filters.value.users = [];
    filters.value.projects = [];
    filters.value.customers = [];
    filters.value.projectTasks = [];
    filters.value.status = [];
    filters.value.is_reportable = null;
    filters.value.is_billable = null;
    filters.value.input_hours_min = null;
    filters.value.input_hours_max = null;
    filters.value.billable_hours_min = null;
    filters.value.billable_hours_max = null;
    filters.value.billing_rate_min = null;
    filters.value.billing_rate_max = null;
    filters.value.charge_rate_min = null;
    filters.value.charge_rate_max = null;
    filters.value.charge_amount_min = null;
    filters.value.charge_amount_max = null;
    applyFilters();
}

const columnsMenuItems = ref([
    { field: 'user.name', name: 'User Name', sortable: true, disabled: true },
    { field: 'date', name: 'Date', sortable: true },
    { field: 'customer.name', name: 'Customer', sortable: true },
    { field: 'project.name', name: 'Project', sortable: true },
    { field: 'projectTask.name', name: 'Task', sortable: true },
    { field: 'input_hours', name: 'Input Hours', sortable: true },
    { field: 'is_billable', name: 'Non Billable', sortable: true },
    { field: 'is_reportable', name: 'Non Reportable', sortable: true },
    { field: 'billable_hours', name: 'Billable Hours', sortable: true },
    { field: 'billing_rate', name: 'Billing Rate', sortable: true },
    { field: 'charge_rate', name: 'Charge Rate', sortable: true },
    { field: 'charge_amount', name: 'Charge Amount', sortable: true },
    { field: 'description', name: 'Description', sortable: true },
    { field: 'status', name: 'Status', sortable: true }
]);

const exportMenuItems = [
    {
        icon: 'pi pi-file-excel',
        label: 'To Excel',
        command: () =>
            exportFilteredReport({ resource: 'timesheets', format: 'excel' })
    },
    {
        icon: 'pi pi-file-pdf',
        label: 'To PDF',
        command: () =>
            exportFilteredReport({ resource: 'timesheets', format: 'pdf' })
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
const totalInputHours = computed(() => {
    return items.value.reduce((sum, item) => sum + (item.input_hours || 0), 0);
});

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

const hasAppliedFilters = computed(() => {
    return (
        appliedFilters.value.date_range.length > 0 ||
        appliedFilters.value.users.length > 0 ||
        appliedFilters.value.projects.length > 0 ||
        appliedFilters.value.customers.length > 0 ||
        appliedFilters.value.projectTasks.length > 0 ||
        appliedFilters.value.status.length > 0 ||
        appliedFilters.value.is_reportable !== null ||
        appliedFilters.value.is_billable !== null ||
        appliedFilters.value.input_hours_min !== null ||
        appliedFilters.value.input_hours_max !== null ||
        appliedFilters.value.billable_hours_min !== null ||
        appliedFilters.value.billable_hours_max !== null ||
        appliedFilters.value.billing_rate_min !== null ||
        appliedFilters.value.billing_rate_max !== null ||
        appliedFilters.value.charge_rate_min !== null ||
        appliedFilters.value.charge_rate_max !== null ||
        appliedFilters.value.charge_amount_min !== null ||
        appliedFilters.value.charge_amount_max !== null
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
    if (appliedFilters.value.projectTasks.length) {
        filtersPayload.push({
            field: 'project_task_id',
            operator: 'in',
            value: appliedFilters.value.projectTasks
        });
    }
    if (appliedFilters.value.status.length) {
        filtersPayload.push({
            field: 'status',
            operator: 'in',
            value: appliedFilters.value.status
        });
    }
    if (appliedFilters.value.is_reportable) {
        filtersPayload.push({
            field: 'is_reportable',
            operator: '=',
            value: appliedFilters.value.is_reportable === 'yes' ? false : true
        });
    }
    if (appliedFilters.value.is_billable) {
        filtersPayload.push({
            field: 'is_billable',
            operator: '=',
            value: appliedFilters.value.is_billable === 'yes' ? false : true
        });
    }
    if (appliedFilters.value.input_hours_min !== null) {
        filtersPayload.push({
            field: 'input_hours',
            operator: '>=',
            value: appliedFilters.value.input_hours_min
        });
    }
    if (appliedFilters.value.input_hours_max !== null) {
        filtersPayload.push({
            field: 'input_hours',
            operator: '<=',
            value: appliedFilters.value.input_hours_max
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
    if (appliedFilters.value.billing_rate_min !== null) {
        filtersPayload.push({
            field: 'billing_rate',
            operator: '>=',
            value: appliedFilters.value.billing_rate_min
        });
    }
    if (appliedFilters.value.billing_rate_max !== null) {
        filtersPayload.push({
            field: 'billing_rate',
            operator: '<=',
            value: appliedFilters.value.billing_rate_max
        });
    }
    if (appliedFilters.value.charge_rate_min !== null) {
        filtersPayload.push({
            field: 'charge_rate',
            operator: '>=',
            value: appliedFilters.value.charge_rate_min
        });
    }
    if (appliedFilters.value.charge_rate_max !== null) {
        filtersPayload.push({
            field: 'charge_rate',
            operator: '<=',
            value: appliedFilters.value.charge_rate_max
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
                { relation: 'projectTask' },
                { relation: 'project' },
                { relation: 'customer' },
                { relation: 'user' }
            ]
        };

        const res = await timesheetStore.list(payload, params);
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

const getProjectTasks = async (searchText = '') => {
    try {
        loadingProjectTasks.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            filters: [
                {
                    field: 'project_id',
                    operator: 'in',
                    value: filters.value.projects || null
                }
            ]
        };
        const res = await projectTaskStore.list(payload, params);
        projectTasks.value = res.data;
    } finally {
        loadingProjectTasks.value = false;
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
                { relation: 'projectTask' },
                { relation: 'project' },
                { relation: 'customer' },
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
        const params = { table_key: 'report_timesheets' };
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
                <h1 class="text-2xl sm:text-3xl font-bold">Timesheets</h1>
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
                                    'report_timesheets',
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
                            'billing_rate',
                            'charge_rate',
                            'charge_amount'
                        ].includes(col.field)
                    }"
                >
                    <template v-if="col.field === 'date'" #body="{ data }">
                        {{ formatDate(data.date) }}
                    </template>
                    <template
                        v-else-if="col.field === 'input_hours'"
                        #body="{ data }"
                    >
                        {{ formatHours(data.input_hours) }}
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
                        v-else-if="col.field === 'is_reportable'"
                        #body="{ data }"
                    >
                        <StatusTag
                            v-if="!data.is_reportable"
                            :status="!data.is_reportable ? 'Yes' : 'No'"
                        />
                    </template>
                    <template
                        v-else-if="col.field === 'billable_hours'"
                        #body="{ data }"
                    >
                        {{ formatHours(data.billable_hours) }}
                    </template>
                    <template
                        v-else-if="col.field === 'description'"
                        #body="{ data }"
                    >
                        <span v-tooltip.top="data.description">
                            {{
                                truncate(data.description, {
                                    length: 20
                                })
                            }}
                        </span>
                    </template>
                    <template
                        v-else-if="col.field === 'billing_rate'"
                        #body="{ data }"
                    >
                        {{ moneyFormat(data.billing_rate) }}
                    </template>
                    <template
                        v-else-if="col.field === 'charge_rate'"
                        #body="{ data }"
                    >
                        {{ moneyFormat(data.charge_rate) }}
                    </template>
                    <template
                        v-else-if="col.field === 'charge_amount'"
                        #body="{ data }"
                    >
                        {{ moneyFormat(data.charge_amount) }}
                    </template>
                    <template
                        v-else-if="col.field === 'status'"
                        #body="{ data }"
                    >
                        <StatusTag :status="data.status" />
                    </template>

                    <template v-if="col.field === 'input_hours'" #footer>
                        <span class="font-semibold text-lg">
                            {{ formatHours(totalInputHours) }}</span
                        >
                    </template>
                    <template
                        v-else-if="col.field === 'billable_hours'"
                        #footer
                    >
                        <span class="font-semibold text-lg">
                            {{ formatHours(totalBillableHours) }}</span
                        >
                    </template>
                    <template v-else-if="col.field === 'charge_amount'" #footer>
                        <span class="font-semibold text-lg">
                            {{ moneyFormat(totalChargeAmount) }}</span
                        >
                    </template>
                </Column>

                <template #empty> No timesheets found</template>
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
                    @change="getProjectTasks('')"
                    v-model="filters.projects"
                    :options="projects"
                    optionLabel="name"
                    optionValue="id"
                    :disabled="busy || loadingProjects || loadingCustomers"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Select Project Tasks</label>
                <ApiMultiselect
                    id="projectTasks"
                    placeholder="Select"
                    class="w-full"
                    showClear
                    filter
                    :loading="loadingProjectTasks"
                    @search="getProjectTasks"
                    @change="getProjectTasks('')"
                    v-model="filters.projectTasks"
                    :options="projectTasks"
                    optionLabel="name"
                    optionValue="id"
                    :disabled="
                        busy ||
                        loadingProjectTasks ||
                        loadingProjects ||
                        projectTasks.length === 0
                    "
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
                    :options="timesheetStatuses"
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
                <label class="block mb-3">Non Reportable</label>
                <InputField
                    id="nonReportable"
                    placeholder="Select"
                    variant="dropdown"
                    class="w-full"
                    showClear
                    v-model="filters.is_reportable"
                    :options="yesNoOptions"
                    optionLabel="name"
                    optionValue="id"
                    :disabled="busy"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Input Hours (Min)</label>
                <InputField
                    id="input_hours_min"
                    variant="number"
                    class="w-full"
                    v-model="filters.input_hours_min"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="0.25"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Input Hours (Max)</label>
                <InputField
                    id="input_hours_max"
                    variant="number"
                    class="w-full"
                    v-model="filters.input_hours_max"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="0.25"
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
                    :step="0.25"
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
                    :step="0.25"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Billing Rate (Min)</label>
                <InputField
                    id="billing_rate_min"
                    variant="number"
                    class="w-full"
                    v-model="filters.billing_rate_min"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Billing Rate (Max)</label>
                <InputField
                    id="billing_rate_max"
                    variant="number"
                    class="w-full"
                    v-model="filters.billing_rate_max"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Charge Rate (Min)</label>
                <InputField
                    id="charge_rate_min"
                    variant="number"
                    class="w-full"
                    v-model="filters.charge_rate_min"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Charge Rate (Max)</label>
                <InputField
                    id="charge_rate_max"
                    variant="number"
                    class="w-full"
                    v-model="filters.charge_rate_max"
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
