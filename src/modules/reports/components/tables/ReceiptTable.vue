<script setup>
import { onBeforeMount, ref, computed, watch } from 'vue';
import { debounce } from 'lodash-es';
import {
    useCustomerStore,
    useLookupTablePreferenceStore
} from '@/modules/core/stores';
import { usePaymentMethodStore } from '@/modules/administration/stores';
import { useReceiptStore } from '@/modules/accounting/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';
import { useReportExport } from '@/composables/useReportExport';
import { paymentTypes } from '@/config/enums';

const receiptStore = useReceiptStore();
const customerStore = useCustomerStore();
const paymentMethodStore = usePaymentMethodStore();
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
const loadingCustomers = ref(false);
const customers = ref([]);
const loadingPaymentMethods = ref(false);
const paymentMethods = ref([]);

const filters = ref({
    receipt_date_range: [],
    customers: [],
    payment_methods: [],
    payment_types: [],
    amount_received_min: null,
    amount_received_max: null
});

const appliedFilters = ref({
    receipt_date_range: [],
    customers: [],
    payment_methods: [],
    payment_types: [],
    amount_received_min: null,
    amount_received_max: null
});

const activeChips = computed({
    get() {
        const chips = [];
        if (appliedFilters.value.receipt_date_range.length) {
            chips.push({
                field: 'receipt_date_range',
                label: `Receipt Date: ${appliedFilters.value.receipt_date_range[0]} → ${appliedFilters.value.receipt_date_range[1]}`
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
        if (appliedFilters.value.payment_methods.length) {
            appliedFilters.value.payment_methods.forEach((pm) => {
                const method = paymentMethods.value.find((x) => x.id === pm);
                if (method)
                    chips.push({
                        field: 'payment_methods',
                        value: pm,
                        label: `Payment Method: ${method.name}`
                    });
            });
        }
        if (appliedFilters.value.payment_types.length) {
            appliedFilters.value.payment_types.forEach((pt) => {
                const type = paymentTypes.find((x) => x.code === pt);
                if (type)
                    chips.push({
                        field: 'payment_types',
                        value: pt,
                        label: `Payment Type: ${type.name}`
                    });
            });
        }
        if (
            appliedFilters.value.amount_received_min !== null ||
            appliedFilters.value.amount_received_max !== null
        ) {
            const min = appliedFilters.value.amount_received_min ?? 'Any';
            const max = appliedFilters.value.amount_received_max ?? 'Any';
            chips.push({
                field: 'amount_received_range',
                label: `Amount: ${min} → ${max}`
            });
        }
        return chips;
    },
    set(newVal) {
        // handled via @remove
    }
});

function onRemoveFilter(chip) {
    if (chip.field === 'receipt_date_range')
        filters.value.receipt_date_range = [];
    if (chip.field === 'customers') {
        filters.value.customers = filters.value.customers.filter(
            (id) => id !== chip.value
        );
    }
    if (chip.field === 'payment_methods') {
        filters.value.payment_methods = filters.value.payment_methods.filter(
            (id) => id !== chip.value
        );
    }
    if (chip.field === 'payment_types') {
        filters.value.payment_types = filters.value.payment_types.filter(
            (id) => id !== chip.value
        );
    }
    if (chip.field === 'amount_received_range') {
        filters.value.amount_received_min = null;
        filters.value.amount_received_max = null;
    }
    applyFilters();
}

function clearFilters() {
    filters.value.receipt_date_range = [];
    filters.value.customers = [];
    filters.value.payment_methods = [];
    filters.value.payment_types = [];
    filters.value.amount_received_min = null;
    filters.value.amount_received_max = null;
    applyFilters();
}

const columnsMenuItems = ref([
    { field: 'reference_number', name: 'Reference Number', sortable: true },
    {
        field: 'customer.name',
        name: 'Customer',
        sortable: true,
        disabled: true
    },
    { field: 'receipt_date', name: 'Receipt Date', sortable: true },
    { field: 'amount_received', name: 'Amount Received', sortable: true },
    { field: 'paymentMethod.name', name: 'Payment Method', sortable: true },
    { field: 'payment_type', name: 'Payment Type', sortable: true }
]);

const exportMenuItems = [
    {
        icon: 'pi pi-file-excel',
        label: 'To Excel',
        command: () =>
            exportFilteredReport({ resource: 'receipts', format: 'excel' })
    },
    {
        icon: 'pi pi-file-pdf',
        label: 'To PDF',
        command: () =>
            exportFilteredReport({ resource: 'receipts', format: 'pdf' })
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

const totalAmountReceived = computed(() => {
    return items.value.reduce(
        (sum, item) => sum + (item.amount_received || 0),
        0
    );
});

const hasAppliedFilters = computed(() => {
    return (
        appliedFilters.value.receipt_date_range.length > 0 ||
        appliedFilters.value.customers.length > 0 ||
        appliedFilters.value.payment_methods.length > 0 ||
        appliedFilters.value.payment_types.length > 0 ||
        appliedFilters.value.amount_received_min !== null ||
        appliedFilters.value.amount_received_max !== null
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
    if (appliedFilters.value.payment_methods.length) {
        filtersPayload.push({
            field: 'payment_method_id',
            operator: 'in',
            value: appliedFilters.value.payment_methods
        });
    }
    if (appliedFilters.value.payment_types.length) {
        filtersPayload.push({
            field: 'payment_type',
            operator: 'in',
            value: appliedFilters.value.payment_types
        });
    }
    if (appliedFilters.value.amount_received_min !== null) {
        filtersPayload.push({
            field: 'amount_received',
            operator: '>=',
            value: appliedFilters.value.amount_received_min
        });
    }
    if (appliedFilters.value.amount_received_max !== null) {
        filtersPayload.push({
            field: 'amount_received',
            operator: '<=',
            value: appliedFilters.value.amount_received_max
        });
    }
    return filtersPayload;
};

const makeCustomFiltersPayload = () => {
    const customFilters = [];
    if (appliedFilters.value.receipt_date_range.length) {
        customFilters.push({
            field: 'receipt_date_range',
            value: appliedFilters.value.receipt_date_range
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
            includes: [{ relation: 'customer' }, { relation: 'paymentMethod' }]
        };

        const res = await receiptStore.search(payload, params);
        items.value = res.data || [];
        totalRecords.value = res?.meta?.total || 0;
    } finally {
        loading.value = false;
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

const getPaymentMethods = async (searchText = '') => {
    try {
        loadingPaymentMethods.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText }
        };
        const res = await paymentMethodStore.list(payload, params);
        paymentMethods.value = res.data;
    } finally {
        loadingPaymentMethods.value = false;
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
            includes: [{ relation: 'customer' }, { relation: 'paymentMethod' }]
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
        const params = { table_key: 'report_receipts' };
        const res =
            await lookupTablePreferenceStore.getTablePreferences(params);
        const visible_columns = res.data?.visible_columns || [];
        visibleColumns.value = mapVisibleColumns(
            visible_columns,
            columnsMenuItems.value
        );

        if (!visibleColumns.value.length) {
            const defaultFields = [
                'reference_number',
                'customer.name',
                'receipt_date',
                'amount_received',
                'paymentMethod.name',
                'payment_type'
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
                <h1 class="text-2xl sm:text-3xl font-bold">Receipts</h1>
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
                                    'report_receipts',
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
                        'amount-column': ['amount_received'].includes(col.field)
                    }"
                >
                    <template
                        v-if="col.field === 'receipt_date'"
                        #body="{ data }"
                    >
                        {{ formatDate(data.receipt_date) }}
                    </template>

                    <template
                        v-else-if="col.field === 'amount_received'"
                        #body="{ data }"
                    >
                        {{ moneyFormat(data.amount_received) }}
                    </template>

                    <template
                        v-else-if="col.field === 'payment_type'"
                        #body="{ data }"
                    >
                        {{
                            paymentTypes.find(
                                (pt) => pt.code === data.payment_type
                            )?.name || data.payment_type
                        }}
                    </template>

                    <template v-if="col.field === 'amount_received'" #footer>
                        <span class="font-semibold text-lg">{{
                            moneyFormat(totalAmountReceived)
                        }}</span>
                    </template>
                </Column>

                <template #empty> No receipts found</template>
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
                <label class="block mb-3">Receipt Date</label>
                <InputField
                    placeholder="Select Date Range"
                    :disabled="busy"
                    v-model="filters.receipt_date_range"
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
                    v-model="filters.customers"
                    :options="customers"
                    optionLabel="name"
                    optionValue="id"
                    :disabled="busy || loadingCustomers"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Select Payment Methods</label>
                <ApiMultiselect
                    id="payment_methods"
                    placeholder="Select"
                    class="w-full"
                    showClear
                    filter
                    :loading="loadingPaymentMethods"
                    @search="getPaymentMethods"
                    v-model="filters.payment_methods"
                    :options="paymentMethods"
                    optionLabel="name"
                    optionValue="id"
                    :disabled="busy || loadingPaymentMethods"
                />
            </div>
            <div class="mb-3 col-span-12">
                <label class="block mb-3">Select Payment Types</label>
                <ApiMultiselect
                    id="payment_types"
                    placeholder="Select"
                    class="w-full"
                    showClear
                    filter
                    v-model="filters.payment_types"
                    :options="paymentTypes"
                    optionLabel="name"
                    optionValue="code"
                    :disabled="busy"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Amount Received (Min)</label>
                <InputField
                    id="amount_received_min"
                    variant="number"
                    class="w-full"
                    v-model="filters.amount_received_min"
                    :disabled="busy"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="mb-3 col-span-12 sm:col-span-6">
                <label class="block mb-3">Amount Received (Max)</label>
                <InputField
                    id="amount_received_max"
                    variant="number"
                    class="w-full"
                    v-model="filters.amount_received_max"
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
