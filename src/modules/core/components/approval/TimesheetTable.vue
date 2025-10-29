<script setup>
import { onBeforeMount, ref, computed, watch, nextTick } from 'vue';
import { truncate, debounce } from 'lodash-es';
import { ability } from '@/plugins/ability';
import { useRoute, useRouter } from 'vue-router';
import {
    useTimesheetStore,
    useLookupTablePreferenceStore
} from '@/modules/core/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useUserRole } from '@/composables/useUserRole';
import { useHelpers } from '@/composables';
import { useUserStore } from '@/modules/administration/stores';

const { isAdmin, isApprover } = useUserRole();
const timesheetStore = useTimesheetStore();
const lookupTablePreferenceStore = useLookupTablePreferenceStore();
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { formatDate, moneyFormat, formatHours, mapVisibleColumns } =
    useHelpers();
const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const searchText = ref('');
const loading = ref(false);
const items = ref([]);
const totalRecords = ref();
const loadingUsers = ref(false);
const selectedUser = ref(
    route.query.user_id ? String(route.query.user_id) : null
);
const users = ref([]);
const showDialog = ref(false);
const selectedItem = ref(null);
const selectedItems = ref([]);
const busy = ref(false);
const approveDialog = ref(false);
const rejectDialog = ref(false);
const skipWatcher = ref(false);
const formData = ref({
    user_name: '',
    date: '',
    customer_name: '',
    task_name: '',
    input_hours: 0,
    is_billable: true,
    is_reportable: true,
    billable_hours: 0,
    billing_rate: 0,
    charge_rate: 0,
    original_charge_rate: 0,
    charge_amount: 0,
    description: ''
});

const columnsMenuItems = ref([
    { field: 'user.name', name: 'User Name', sortable: true, disabled: true },
    { field: 'date', name: 'Date', sortable: true },
    { field: 'customer.name', name: 'Customer', sortable: true },
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
const visibleColumns = ref([]);
const columnSelectionsRef = ref(null);

const isEditMode = computed(() => !!selectedItem.value?.id);

const isBillableHoursEditable = computed(() => formData.value.is_billable);
const isChargeRateEditable = computed(() => formData.value.is_billable);
const isReportableEditable = computed(() => !formData.value.is_billable);
const hasSelectedItems = computed(() => selectedItems.value.length > 0);

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

onBeforeMount(async () => {
    await getTablePreferences();
    await getUsers();
    await getItems();
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

watch(
    () => formData.value.is_billable,
    (newValue) => {
        if (skipWatcher.value) return;

        if (newValue) {
            // If billable, restore original charge rate
            formData.value.charge_rate = formData.value.original_charge_rate;
            // Also uncheck non-reportable since it requires non-billable
            formData.value.is_reportable = true;
        } else {
            // If non-billable:
            // 1. Set billable hours same as input hours (unless it's also non-reportable)
            if (formData.value.is_reportable) {
                formData.value.billable_hours = formData.value.input_hours;
            }
            // 2. Save current charge rate as original and set to 0
            formData.value.original_charge_rate = formData.value.charge_rate;
            formData.value.charge_rate = 0;
        }

        // Recalculate charge amount
        formData.value.charge_amount =
            formData.value.billable_hours * formData.value.charge_rate;
    }
);

watch(
    () => formData.value.is_reportable,
    (newValue) => {
        if (skipWatcher.value) return;

        if (!newValue) {
            // If non-reportable (NR):
            // 1. Must be non-billable first
            if (formData.value.is_billable) {
                // Force non-billable first
                formData.value.is_billable = false;
            }
            // 2. Set billable hours to zero
            formData.value.billable_hours = 0;
        } else {
            // If reportable again:
            // If it's non-billable, restore billable hours to input hours
            if (!formData.value.is_billable) {
                formData.value.billable_hours = formData.value.input_hours;
            }
        }

        // Recalculate charge amount
        formData.value.charge_amount =
            formData.value.billable_hours * formData.value.charge_rate;
    }
);

const toggleColumnSelections = () => {
    columnSelectionsRef.value.show();
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

const onUserChange = async () => {
    // Update URL query parameter
    if (selectedUser.value) {
        await router.push({
            ...route,
            query: {
                ...route.query,
                user_id: selectedUser.value
            }
        });
    } else {
        // Remove user_id from query if empty
        const { user_id, ...restQuery } = route.query;
        await router.push({
            ...route,
            query: restQuery
        });
    }

    await getItems();
};

const onRowClick = (event) => {
    if (!ability.can('approvals.timesheets.edit')) return;
    selectedItem.value = event.data;
    populateFormData();
    showDialog.value = true;
};

const populateFormData = async () => {
    if (!selectedItem.value) return;

    // Skip watcher during form population
    skipWatcher.value = true;

    formData.value = {
        user_name: selectedItem.value.user?.name || '',
        date: formatDate(selectedItem.value.date) || '',
        customer_name: selectedItem.value.customer?.name || '',
        task_name: selectedItem.value.projectTask?.name || '',
        input_hours: selectedItem.value.input_hours || 0,
        is_billable: selectedItem.value.is_billable ?? true,
        is_reportable: selectedItem.value.is_reportable ?? true,
        billable_hours: selectedItem.value.billable_hours || 0,
        billing_rate: selectedItem.value.billing_rate || 0,
        charge_rate: selectedItem.value.charge_rate || 0,
        original_charge_rate: selectedItem.value.original_charge_rate || 0,
        charge_amount: selectedItem.value.charge_amount || 0,
        description: selectedItem.value.description || ''
    };

    // Re-enable watcher after form is populated
    await nextTick();
    skipWatcher.value = false;
};

const onShow = () => {
    resetForm();
};

const closeDialog = () => {
    showDialog.value = false;
    resetForm();
    selectedItem.value = null;
};

const resetForm = () => {
    formData.value = {
        user_name: '',
        date: '',
        customer_name: '',
        task_name: '',
        input_hours: 0,
        is_billable: true,
        is_reportable: true,
        billable_hours: 0,
        billing_rate: 0,
        charge_rate: 0,
        charge_amount: 0,
        description: ''
    };
    selectedUser.value = null;
};

const save = async () => {
    try {
        busy.value = true;

        const payload = {
            date: selectedItem.value.date,
            user_id: selectedItem.value.user_id,
            customer_id: selectedItem.value.customer_id,
            project_id: selectedItem.value.project_id,
            project_task_id: selectedItem.value.project_task_id,
            status: selectedItem.value.status,
            input_hours: selectedItem.value.input_hours,
            billing_rate: selectedItem.value.billing_rate,
            original_charge_rate: selectedItem.value.original_charge_rate,
            is_billable: formData.value.is_billable,
            is_reportable: formData.value.is_reportable,
            billable_hours: formData.value.billable_hours,
            charge_rate: formData.value.charge_rate,
            charge_amount: formData.value.charge_amount,
            description: formData.value.description
        };

        await timesheetStore.update(selectedItem.value.id, payload);
        await getItems();
        closeDialog();
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
};

const showApproveDialog = () => {
    approveDialog.value = true;
};

const showRejectDialog = () => {
    rejectDialog.value = true;
};

const approveSelected = async () => {
    try {
        loading.value = true;
        const timesheetIds = selectedItems.value.map((item) => item.id);
        await timesheetStore.approveTimesheets({ resources: timesheetIds });
        selectedItems.value = [];
        await getItems();
        approveDialog.value = false;
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const rejectSelected = async () => {
    try {
        loading.value = true;
        const timesheetIds = selectedItems.value.map((item) => item.id);
        await timesheetStore.rejectTimesheets({ resources: timesheetIds });
        selectedItems.value = [];
        await getItems();
        rejectDialog.value = false;
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const getItems = async () => {
    try {
        loading.value = true;

        const params = {
            ...pagination.getPageParams()
        };

        const filters = [
            {
                field: 'status',
                operator: '=',
                value: 'submitted'
            }
        ];

        if (selectedUser.value) {
            filters.unshift({
                field: 'user_id',
                operator: '=',
                value: selectedUser.value
            });
        } else if (users.value?.length) {
            const userIds = users.value.map((u) => u.id);
            filters.unshift({
                field: 'user_id',
                operator: 'in',
                value: userIds
            });
        }

        const payload = {
            ...sortFilters.getSortFilters(searchText.value),
            filters,
            includes: [
                { relation: 'projectTask' },
                { relation: 'project' },
                { relation: 'customer' },
                { relation: 'user' }
            ]
        };

        const res = await timesheetStore.search(payload, params);
        items.value = res.data || [];
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
            filters: [{ field: 'status', operator: '=', value: 'active' }],
            customFilters: [
                { field: 'role_based_user_for_approvals ', value: true }
            ]
        };
        const res = await userStore.list(payload, params);
        users.value = res.data;
    } finally {
        loadingUsers.value = false;
    }
};

const getTablePreferences = async () => {
    try {
        loading.value = true;
        const params = { table_key: 'approval_timesheets' };
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
                'user.name',
                'date',
                'customer.name',
                'projectTask.name',
                'input_hours'
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

// Watch for changes in billable_hours or charge_rate to compute charge_amount
watch(
    () => [formData.value.billable_hours, formData.value.charge_rate],
    () => {
        if (formData.value.is_billable) {
            formData.value.charge_amount =
                (formData.value.billable_hours || 0) *
                (formData.value.charge_rate || 0);
        }
    }
);
</script>

<template>
    <div
        class="mb-6 flex flex-col lg:flex-row items-center justify-between gap-4"
    >
        <div class="w-full lg:w-1/3 text-center lg:text-left">
            <h1 class="text-2xl lg:text-3xl font-bold">Timesheets Approval</h1>
        </div>

        <div class="w-full lg:w-1/3 flex justify-center lg:justify-end">
            <ApiDropdown
                :showClear="isAdmin || isApprover"
                filter
                placeholder="Select User"
                :loading="loadingUsers"
                @search="getUsers"
                @change="onUserChange"
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
                v-model:selection="selectedItems"
                :value="items"
                :page="pagination.page"
                :rows="pagination.limit"
                :total-records="totalRecords"
                :loading="loading"
                @sort="onSortChange"
                @page="onPageChange"
                @row-click="onRowClick"
                :class="{
                    'cursor-pointer-rows': $ability.can(
                        'approvals.timesheets.edit'
                    )
                }"
            >
                <template #header>
                    <div
                        class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-5"
                    >
                        <div
                            class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto"
                        >
                            <Button
                                label="Approve Selected"
                                icon="pi pi-check"
                                severity="success"
                                :disabled="!hasSelectedItems || loading"
                                @click="showApproveDialog"
                                class="flex-1 sm:flex-none truncate text-center"
                            />
                            <Button
                                label="Reject Selected"
                                icon="pi pi-times"
                                severity="danger"
                                :disabled="!hasSelectedItems || loading"
                                @click="showRejectDialog"
                                class="flex-1 sm:flex-none truncate text-center"
                            />
                        </div>

                        <div
                            class="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-4 mt-3 sm:mt-0 w-full sm:w-auto"
                        >
                            <div class="w-full sm:w-64 md:w-80">
                                <Search
                                    v-model="searchText"
                                    @search="search"
                                    class="w-full"
                                />
                            </div>

                            <div
                                class="flex flex-wrap sm:flex-row gap-2 items-center w-full sm:w-auto"
                            >
                                <Button
                                    variant="outlined"
                                    size="medium"
                                    label="Columns"
                                    icon="pi pi-cog"
                                    @click="toggleColumnSelections()"
                                    :badge="`${visibleColumns.length}`"
                                    badgeSeverity="primary"
                                    class="w-full sm:w-auto text-center"
                                />

                                <MultiSelect
                                    filter
                                    ref="columnSelectionsRef"
                                    class="p-multiselect-label-empty w-full sm:w-auto"
                                    v-model="visibleColumns"
                                    @change="
                                        debouncedSaveTablePreferences(
                                            'approval_timesheets',
                                            visibleColumns
                                        )
                                    "
                                    :options="columnsMenuItems"
                                    optionLabel="name"
                                    optionDisabled="disabled"
                                    style="width: 1px !important"
                                />
                            </div>
                        </div>
                    </div>
                </template>

                <Column selectionMode="multiple" headerStyle="width: 3rem" />

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

    <BaseDialog
        v-if="$ability.can('approvals.timesheets.edit')"
        v-model:visible="showDialog"
        @update:visible="onShow"
        :busy="busy"
        :isEditMode="isEditMode"
        header="Edit Timesheet"
        confirmLabel="Update"
        :formData="formData"
        :initialData="isEditMode ? selectedItem : null"
        :enableDirtyCheck="false"
        @cancel="closeDialog"
        @confirm="save"
    >
        <div class="col-span-12">
            <label class="block mb-3">User Name</label>
            <InputField
                variant="text"
                v-model="formData.user_name"
                class="w-full"
                :disabled="true"
            />
        </div>

        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-3">Date</label>
            <InputField
                variant="text"
                v-model="formData.date"
                class="w-full"
                :disabled="true"
            />
        </div>

        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-3">Customer</label>
            <InputField
                variant="text"
                v-model="formData.customer_name"
                class="w-full"
                :disabled="true"
            />
        </div>

        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-3">Task</label>
            <InputField
                variant="text"
                v-model="formData.task_name"
                class="w-full"
                :disabled="true"
            />
        </div>

        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-3">Input Hours</label>
            <InputField
                variant="number"
                v-model="formData.input_hours"
                class="w-full"
                inputClass="w-full"
                :disabled="true"
                :maxFractionDigits="2"
                :minFractionDigits="2"
            />
        </div>

        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-3">Billable Hours</label>
            <InputField
                variant="number"
                v-model="formData.billable_hours"
                class="w-full"
                inputClass="w-full"
                :disabled="busy || !isBillableHoursEditable"
                :maxFractionDigits="2"
                :minFractionDigits="2"
            />
        </div>

        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-3">Billing Rate</label>
            <InputField
                variant="number"
                prefix="$"
                v-model="formData.billing_rate"
                class="w-full"
                inputClass="w-full"
                :disabled="true"
                :maxFractionDigits="2"
                :minFractionDigits="2"
            />
        </div>

        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-3">Charge Rate</label>
            <div class="relative">
                <InputField
                    variant="number"
                    prefix="$"
                    v-model="formData.charge_rate"
                    class="w-full"
                    inputClass="w-full"
                    :disabled="busy || !isChargeRateEditable"
                    :maxFractionDigits="2"
                    :minFractionDigits="2"
                />

                <div
                    v-if="!formData.is_billable"
                    class="absolute inset-y-0 left-16 flex items-center pointer-events-none"
                >
                    <span
                        class="text-base text-gray-400 line-through px-1 ml-2"
                    >
                        {{ moneyFormat(formData.original_charge_rate) }}
                    </span>
                </div>
            </div>
        </div>

        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-3">Charge Amount</label>
            <InputField
                variant="number"
                prefix="$"
                v-model="formData.charge_amount"
                class="w-full"
                inputClass="w-full"
                :disabled="true"
                :maxFractionDigits="2"
                :minFractionDigits="2"
            />
        </div>

        <div class="col-span-12">
            <label class="block mb-3">Description</label>
            <InputField
                variant="textarea"
                v-model="formData.description"
                class="w-full h-[8rem]"
                maxlength="1000"
                :disabled="busy"
            />
            <span
                :class="[
                    'block text-sm',
                    formData.description?.length >= 1000
                        ? 'text-red-500'
                        : 'text-gray-600'
                ]"
            >
                {{ 1000 - (formData.description?.length || 0) }} characters left
            </span>
        </div>

        <div class="col-span-12 flex items-center gap-3">
            <InputField
                id="is_billable"
                binary
                inputId="is_billable"
                variant="checkbox"
                v-model="formData.is_billable"
                :trueValue="false"
                :falseValue="true"
                :disabled="busy"
            />
            <label class="cursor-pointer" for="is_billable">
                This time is non-billable
            </label>
        </div>
        <div class="col-span-12 flex items-center gap-3">
            <InputField
                id="is_reportable"
                binary
                inputId="is_reportable"
                variant="checkbox"
                v-model="formData.is_reportable"
                :trueValue="false"
                :falseValue="true"
                :disabled="busy || !isReportableEditable"
            />
            <label class="cursor-pointer" for="is_reportable">
                This time is non-reportable
            </label>
        </div>
    </BaseDialog>

    <Confirmation
        v-model="approveDialog"
        variant="success"
        header="Approve Selected Timesheets"
        :content="`Are you sure you want to approve ${selectedItems.length} selected timesheet(s)?`"
        @confirm="approveSelected"
    />

    <Confirmation
        v-model="rejectDialog"
        variant="danger"
        header="Reject Selected Timesheets"
        :content="`Are you sure you want to reject ${selectedItems.length} selected timesheet(s)?`"
        @confirm="rejectSelected"
    />
</template>
