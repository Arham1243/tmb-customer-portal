<script setup>
import { onBeforeMount, ref, computed, watch, nextTick } from 'vue';
import { truncate, debounce } from 'lodash-es';
import { ability } from '@/plugins/ability';
import { useRoute, useRouter } from 'vue-router';
import {
    useExpenseStore,
    useLookupTablePreferenceStore
} from '@/modules/core/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useCreditCardStore } from '@/modules/administration/stores';
import { useUserRole } from '@/composables/useUserRole';
import { useHelpers } from '@/composables';
import { useUserStore } from '@/modules/administration/stores';

const { isAdmin, isApprover } = useUserRole();
const expenseStore = useExpenseStore();
const { mapVisibleColumns, formatDate, moneyFormat, filterActiveWithSelected } =
    useHelpers();
const lookupTablePreferenceStore = useLookupTablePreferenceStore();
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const creditCardStore = useCreditCardStore();

const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const searchText = ref('');
const loading = ref(false);
const items = ref([]);
const totalRecords = ref();
const loadingCreditCards = ref(false);
const creditCards = ref([]);
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
    user: '',
    date: '',
    customer: '',
    project: '',
    expense_category: '',
    is_billable: true,
    is_reimbursable: true,
    amount: 0,
    billable_amount: 0,
    original_billable_amount: 0,
    description: '',
    credit_card_id: null
});

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
const visibleColumns = ref([]);
const columnSelectionsRef = ref(null);

const isEditMode = computed(() => !!selectedItem.value?.id);

const isBillableAmountEditable = computed(() => formData.value.is_billable);
const isCreditCardEditable = computed(() => !formData.value.is_reimbursable);
const hasSelectedItems = computed(() => selectedItems.value.length > 0);

// Calculate totals for current page items
const totalAmount = computed(() => {
    return items.value.reduce((sum, item) => sum + (item.amount || 0), 0);
});

const totalBillableAmount = computed(() => {
    return items.value.reduce(
        (sum, item) => sum + (item.billable_amount || 0),
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
            // If billable, restore original billable amount
            formData.value.billable_amount =
                formData.value.original_billable_amount;
        } else {
            // If non-billable, save current billable amount as original and set to 0
            formData.value.original_billable_amount =
                formData.value.billable_amount;
            formData.value.billable_amount = 0;
        }
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
    if (!ability.can('approvals.expenses.edit')) return;
    selectedItem.value = event.data;
    populateFormData();
    getCreditCards();
    showDialog.value = true;
};

const populateFormData = async () => {
    if (!selectedItem.value) return;
    selectedUser.value = selectedItem.value.user_id;

    // Skip watcher during form population
    skipWatcher.value = true;

    formData.value = {
        report_name: selectedItem.value.report_name || '',
        user_name: selectedItem.value.user?.name || '',
        date: formatDate(selectedItem.value.date) || '',
        customer_name: selectedItem.value.customer?.name || '',
        project_name: selectedItem.value.project?.name || '',
        expense_category_name: selectedItem.value.expenseCategory?.name || '',
        is_billable: selectedItem.value.is_billable ?? true,
        is_reimbursable: selectedItem.value.is_reimbursable ?? true,
        amount: selectedItem.value.amount || 0,
        billable_amount: selectedItem.value.billable_amount || 0,
        original_billable_amount:
            selectedItem.value.original_billable_amount || 0,
        description: selectedItem.value.description || '',
        attachment: selectedItem.value.attachment || '',
        credit_card_id: selectedItem.value.credit_card_id || null
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
        user: '',
        date: '',
        customer: '',
        project: '',
        expense_category: '',
        is_billable: true,
        is_reimbursable: true,
        amount: 0,
        billable_amount: 0,
        description: '',
        credit_card_id: null
    };
    selectedUser.value = null;
};

const save = async () => {
    try {
        busy.value = true;

        const payload = {
            date: selectedItem.value.date,
            customer_id: selectedItem.value.customer_id,
            project_id: selectedItem.value.project_id,
            expense_category_id: selectedItem.value.expense_category_id,
            is_billable: formData.value.is_billable,
            is_reimbursable: formData.value.is_reimbursable,
            amount: selectedItem.value.amount,
            billable_amount: formData.value.billable_amount,
            original_billable_amount: formData.value.original_billable_amount,
            description: formData.value.description,
            credit_card_id: formData.value.credit_card_id || null
        };

        await expenseStore.updateExpense(selectedItem.value.id, payload);
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
        const expenseIds = selectedItems.value.map((item) => item.id);
        await expenseStore.approveExpenses({ resources: expenseIds });
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
        const expenseIds = selectedItems.value.map((item) => item.id);
        await expenseStore.rejectExpenses({ resources: expenseIds });
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
                { relation: 'expenseCategory' },
                { relation: 'project' },
                { relation: 'customer' },
                { relation: 'creditCard' },
                { relation: 'user' }
            ]
        };

        const res = await expenseStore.searchExpenses(payload, params);
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
                { field: 'role_based_user_for_approvals', value: true }
            ]
        };
        const res = await userStore.list(payload, params);
        users.value = res.data;
    } finally {
        loadingUsers.value = false;
    }
};

const getCreditCards = async (searchText = '') => {
    try {
        if (!selectedUser.value) return;
        loadingCreditCards.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            filters: [
                {
                    field: 'users.id',
                    operator: '=',
                    value: selectedUser.value
                }
            ]
        };
        const res = await creditCardStore.list(payload, params);
        const list = filterActiveWithSelected(
            res.data,
            formData.value.credit_card_id
        );
        creditCards.value = list;

        if (!formData.value.credit_card_id && list.length > 0) {
            formData.value.credit_card_id = list[0].id;
        }
    } finally {
        loadingCreditCards.value = false;
    }
};

const getTablePreferences = async () => {
    try {
        loading.value = true;
        const params = { table_key: 'approval_expenses' };
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
    <div
        class="mb-6 flex flex-col lg:flex-row items-center justify-between gap-4"
    >
        <div class="w-full lg:w-1/3 text-center lg:text-left">
            <h1 class="text-2xl lg:text-3xl font-bold">Expenses Approval</h1>
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
                        'approvals.expenses.edit'
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
                                    class="flex-1 sm:flex-none"
                                />

                                <MultiSelect
                                    filter
                                    ref="columnSelectionsRef"
                                    class="p-multiselect-label-empty w-full sm:w-auto"
                                    v-model="visibleColumns"
                                    @change="
                                        debouncedSaveTablePreferences(
                                            'approval_expenses',
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

    <BaseDialog
        v-if="$ability.can('approvals.expenses.edit')"
        v-model:visible="showDialog"
        @update:visible="onShow"
        :busy="busy"
        :isEditMode="isEditMode"
        header="Edit Expense"
        confirmLabel="Update"
        :formData="formData"
        :initialData="isEditMode ? selectedItem : null"
        :enableDirtyCheck="false"
        @cancel="closeDialog"
        @confirm="save"
    >
        <div class="col-span-12">
            <label class="block mb-3">Report Name</label>
            <InputField
                variant="text"
                v-model="formData.report_name"
                class="w-full"
                :disabled="true"
            />
        </div>

        <div class="col-span-12 sm:col-span-6">
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
            <label class="block mb-3">Project</label>
            <InputField
                variant="text"
                v-model="formData.project_name"
                class="w-full"
                :disabled="true"
            />
        </div>

        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-3">Expense Category</label>
            <InputField
                variant="text"
                v-model="formData.expense_category_name"
                class="w-full"
                :disabled="true"
            />
        </div>

        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-3">Amount</label>
            <InputField
                variant="number"
                prefix="$"
                v-model="formData.amount"
                class="w-full"
                inputClass="w-full"
                :disabled="true"
                :maxFractionDigits="2"
                :minFractionDigits="2"
            />
        </div>

        <div class="col-span-12 sm:col-span-6">
            <label class="block required mb-3">Billable Amount</label>
            <div class="relative">
                <InputField
                    variant="number"
                    prefix="$"
                    v-model="formData.billable_amount"
                    class="w-full"
                    inputClass="w-full"
                    :disabled="busy || !isBillableAmountEditable"
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
                        {{ moneyFormat(formData.original_billable_amount) }}
                    </span>
                </div>
            </div>
        </div>

        <div class="col-span-12 sm:col-span-6" v-if="isCreditCardEditable">
            <label class="block required mb-3">Card Used</label>
            <ApiDropdown
                showClear
                filter
                placeholder="Select"
                :loading="loadingCreditCards"
                @search="getCreditCards"
                :options="creditCards"
                optionLabel="name"
                optionValue="id"
                id="credit_card_id"
                v-model="formData.credit_card_id"
                class="w-full"
                :disabled="busy || loadingCreditCards"
            />
        </div>

        <div class="col-span-12">
            <label class="block required mb-3">Description</label>
            <InputField
                id="description"
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

        <div class="col-span-12" v-if="formData.attachment">
            <label class="block mb-3">Attachment</label>
            <Button
                as="a"
                :href="formData.attachment"
                target="_blank"
                variant="outlined"
                label="View Attachment"
                icon="pi pi-eye"
            />
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
                This expense is non-billable
            </label>
        </div>
        <div class="col-span-12 flex items-center gap-3">
            <InputField
                id="is_reimbursable"
                binary
                inputId="is_reimbursable"
                variant="checkbox"
                v-model="formData.is_reimbursable"
                :trueValue="false"
                :falseValue="true"
                :disabled="busy"
            />
            <label class="cursor-pointer" for="is_reimbursable">
                This expense is non reimbursable
            </label>
        </div>
    </BaseDialog>

    <Confirmation
        v-model="approveDialog"
        variant="success"
        header="Approve Selected Expenses"
        :content="`Are you sure you want to approve ${selectedItems.length} selected expense(s)?`"
        @confirm="approveSelected"
    />

    <Confirmation
        v-model="rejectDialog"
        variant="danger"
        header="Reject Selected Expenses"
        :content="`Are you sure you want to reject ${selectedItems.length} selected expense(s)?`"
        @confirm="rejectSelected"
    />
</template>
