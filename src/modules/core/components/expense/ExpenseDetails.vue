<script setup>
import { ref, onBeforeMount, watch, nextTick } from 'vue';
import { useUserStore } from '@/modules/administration/stores';
import { useExpenseStore } from '@/modules/core/stores';
import { useSessionStore } from '@/stores';
import { useHelpers } from '@/composables';
import { computed } from 'vue';
import { truncate } from 'lodash-es';
import { useRouter, useRoute } from 'vue-router';
import ExpenseForm from './ExpenseForm.vue';
import { useUserRole } from '@/composables/useUserRole';

const { formatDate, moneyFormat } = useHelpers();
const { isAdmin, isApprover } = useUserRole();
const sessionStore = useSessionStore();
const router = useRouter();
const route = useRoute();
const expenseStore = useExpenseStore();
const userStore = useUserStore();
const loadingUsers = ref(false);
const isExpenseReportEdit = ref(route.params.id ? true : false);
const selectedUserId = ref(route.params.user_id ? route.params.user_id : null);
const selectedUser = ref(null);
const users = ref([]);
const expensesLoading = ref(false);
const loading = ref(false);
const expenses = ref([]);
const reportName = ref('');
const allowSelect = ref(false);
const busy = ref(false);
const formDirty = ref(false);
const selectedExpense = ref(null);
const expenseReport = ref(null);
const lastSelectedExpenseDate = ref(null);
const selectedExpenses = ref([]);
const showUnsavedDialog = ref(false);
const mode = ref('form');
const expenseFormRef = ref(null);

onBeforeMount(async () => {
    await getExpenseReport();
    await getExpenses();
    await getUsers(); // Load users first to set selectedUser
});

watch(allowSelect, (newVal) => {
    if (newVal === false) {
        selectedExpenses.value = [];
    }
});

const totalUnsubmittedExpensesAmount = computed(() => {
    return expenses.value.reduce((sum, e) => sum + (e.amount || 0), 0);
});

const isViewingOwnExpenses = computed(() => {
    return selectedUserId.value == sessionStore.user.id;
});

const canAddExpenses = computed(() => {
    // Admin can add expenses for anyone
    if (isAdmin.value) return true;

    // Approvers can only add expenses for themselves
    if (isApprover.value) return isViewingOwnExpenses.value;

    // Regular users can add their own expenses
    return true;
});

function getReportName(user) {
    const today = formatDate(new Date());
    return `Expenses - ${user || 'User'} - ${today}`;
}

const onRowClick = (event) => {
    selectedExpense.value = event.data;
    lastSelectedExpenseDate.value = event.data?.date;
};

function confirmDiscard() {
    showUnsavedDialog.value = false;
    formDirty.value = false;
    closeForm();
    // Reload expenses after discarding changes
    getExpenses();
}

const pushRoute = (name, params = {}) => {
    router.push({ name, params });
};
const openSubmitView = () => {
    mode.value = 'submit';
};
const closeSubmitView = () => {
    mode.value = 'form';
    selectedExpense.value = null;
    allowSelect.value = false;
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
        selectedUserId.value =
            users.value.find((u) => u.id == selectedUserId.value)?.id ||
            sessionStore.user.id;
        const usernameForReport = users.value.find(
            (u) => u.id == selectedUserId.value
        );
        reportName.value = getReportName(usernameForReport?.name);
    } finally {
        loadingUsers.value = false;
    }
};

const getExpenseReport = async () => {
    try {
        if (!route.params.id) return;
        loading.value = true;
        const res = await expenseStore.getExpenseReport(route.params.id);
        expenseReport.value = res.data;
    } finally {
        loading.value = false;
    }
};

const getExpenses = async () => {
    try {
        expensesLoading.value = true;
        const params = {
            limit: 300
        };
        const payload = {
            filters: [
                {
                    field: 'user_id',
                    operator: '=',
                    value: selectedUserId.value
                }
            ],
            includes: [
                { relation: 'expenseCategory' },
                { relation: 'project' },
                { relation: 'customer' },
                { relation: 'creditCard' }
            ],
            customFilters: [],
            customSorts: [
                {
                    field: 'status',
                    order: ['draft', 'submitted', 'approved', 'billed']
                }
            ]
        };

        if (isExpenseReportEdit.value) {
            payload.customFilters.push({
                field: 'expense_report_id',
                operator: '=',
                value: route.params.id
            });
        } else {
            payload.filters.push({
                field: 'status',
                operator: '=',
                value: 'draft'
            });
        }
        const res = await expenseStore.searchExpenses(payload, params);
        expenses.value = res.data;
    } finally {
        expensesLoading.value = false;
    }
};

const submitExpenses = async () => {
    try {
        busy.value = true;
        const ids =
            selectedExpenses.value.length > 0
                ? selectedExpenses.value.map((e) => e.id)
                : expenses.value.map((e) => e.id);

        const payload = {
            expense_ids: ids,
            user_id: selectedUserId.value,
            name: reportName.value
        };

        await expenseStore.submitExpenses(payload);
        pushRoute('Expenses');
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
};

const isAddingNewExpense = ref(false);

const openNewExpenseForm = async () => {
    if (selectedExpense.value?.date) {
        lastSelectedExpenseDate.value = selectedExpense.value.date;
    }
    // If form exists and is dirty, reset it first before changing state
    if (expenseFormRef.value) {
        expenseFormRef.value.resetForm();
    }

    // Reset parent dirty state immediately
    formDirty.value = false;

    // Now change the state to switch to add mode
    selectedExpense.value = null;
    isAddingNewExpense.value = true;
    mode.value = 'form';

    // Wait for the new form to be mounted, then ensure it's reset
    await nextTick();
    if (expenseFormRef.value) {
        expenseFormRef.value.resetForm();
    }
};

const closeForm = () => {
    selectedExpense.value = null;
    isAddingNewExpense.value = false;
    formDirty.value = false;
};

const rowClass = (data) => {
    return {
        'bg-custom-gray highlight-row': selectedExpense.value?.id === data.id
    };
};

const onUserChange = async (event) => {
    // Update the selected user
    selectedUser.value = users.value.find((u) => u.id == event.value) || null;
    reportName.value = getReportName(selectedUser.value?.name);

    // Close the form if it's open
    if (selectedExpense.value || isAddingNewExpense.value) {
        if (formDirty.value) {
            showUnsavedDialog.value = true;
            return; // Don't proceed with user change if form is dirty
        } else {
            closeForm();
        }
    }

    // Update route parameter if not in edit mode
    if (!isExpenseReportEdit.value) {
        router.replace({
            name: route.name,
            params: {
                ...route.params,
                user_id: event.value
            }
        });
    }

    // Reload expenses with new user ID
    await getExpenses();
};
</script>

<template>
    <Loader v-if="loading" />
    <template v-else>
        <div
            class="mb-6 flex flex-col lg:flex-row items-center justify-between gap-4"
        >
            <div class="flex-1 flex items-center w-full md:w-1/2 gap-5">
                <Button
                    variant="outlined"
                    icon="pi pi-chevron-left"
                    size="large"
                    :disabled="busy"
                    @click="pushRoute('Expenses')"
                    iconClass="!text-sm"
                />
                <h1 class="text-2xl sm:text-3xl font-bold capitalize">
                    {{ expenseReport?.name ?? 'Expense History' }}
                </h1>
            </div>

            <div
                class="flex-1 flex w-full justify-between md:w-1/2"
                v-if="!isExpenseReportEdit"
            >
                <div>
                    <Button
                        v-if="
                            mode !== 'submit' &&
                            selectedExpense &&
                            canAddExpenses
                        "
                        label="Add Expenses"
                        @click="openNewExpenseForm"
                    />
                </div>
                <ApiDropdown
                    filter
                    placeholder="Select"
                    :loading="loadingUsers"
                    @search="getUsers"
                    @change="onUserChange"
                    :options="users"
                    optionLabel="name"
                    optionValue="id"
                    id="user_id"
                    class="w-full sm:w-64 md:w-80"
                    v-model="selectedUserId"
                    :disabled="loadingUsers || (!isAdmin && !isApprover)"
                />
            </div>
        </div>

        <div class="flex flex-col h-screen gap-7">
            <!-- Main content area -->
            <div class="flex flex-1 overflow-hidden md:flex-row flex-col gap-7">
                <Card
                    class="flex-1 flex flex-col overflow-auto w-full md:w-1/2"
                >
                    <template #content>
                        <div class="h-full">
                            <BaseTable
                                :rowClass="rowClass"
                                class="unhighlight-row-table remove-datatable-header-padding"
                                dataKey="id"
                                v-model:selection="selectedExpenses"
                                selectionMode="multiple"
                                :value="expenses"
                                :loading="expensesLoading"
                                :paginator="false"
                                @row-click="onRowClick"
                            >
                                <template #empty> No expenses found. </template>
                                <template #header>
                                    <div
                                        class="flex items-center justify-between py-7 px-4 bg-gray-100"
                                    >
                                        <div class="font-bold capitalize">
                                            {{
                                                isExpenseReportEdit
                                                    ? 'Total Expenses'
                                                    : 'Unsubmitted Expenses'
                                            }}
                                        </div>
                                        <div class="font-bold">
                                            {{
                                                moneyFormat(
                                                    totalUnsubmittedExpensesAmount
                                                )
                                            }}
                                        </div>
                                    </div>
                                </template>
                                <Column
                                    v-if="allowSelect"
                                    selectionMode="multiple"
                                    headerStyle="width: 2rem;"
                                />
                                <Column
                                    :sortable="false"
                                    field="customer.name"
                                    class="!py-6 !px-4"
                                    :headerStyle="{ padding: '0 !important' }"
                                >
                                    <template #body="{ data }">
                                        <div
                                            class="flex flex-col gap-2 leading-tight"
                                        >
                                            <!-- Status Tag -->
                                            <div>
                                                <StatusTag
                                                    :status="data.status"
                                                />
                                            </div>
                                            <div
                                                class="flex flex-wrap items-center gap-2 font-bold mb-1"
                                            >
                                                <span
                                                    class="line-clamp-1"
                                                    v-tooltip.top="
                                                        data.customer?.name
                                                    "
                                                    >{{
                                                        data.customer?.name
                                                    }}</span
                                                >
                                                <span>-</span>
                                                <span
                                                    class="line-clamp-1"
                                                    v-tooltip.top="
                                                        data.project?.name
                                                    "
                                                    >{{
                                                        data.project?.name
                                                    }}</span
                                                >
                                                <span class="text-sm">
                                                    {{
                                                        data.is_billable
                                                            ? '(billable)'
                                                            : '(non-billable)'
                                                    }}
                                                </span>
                                            </div>
                                            <div
                                                class="flex items-center gap-2 text-sm leading-tight"
                                            >
                                                <span
                                                    class="w-4 h-4 inline-block"
                                                    :class="
                                                        data.attachment
                                                            ? 'bg-green-500'
                                                            : 'bg-gray-400'
                                                    "
                                                ></span>
                                                <span
                                                    >{{
                                                        formatDate(data.date)
                                                    }}:</span
                                                >
                                                <span
                                                    class="line-clamp-1"
                                                    v-tooltip.top="
                                                        data.expenseCategory
                                                            ?.name
                                                    "
                                                    >{{
                                                        data.expenseCategory
                                                            ?.name
                                                    }}</span
                                                >
                                            </div>
                                            <div>
                                                <span class="text-sm">
                                                    {{
                                                        truncate(
                                                            data.description,
                                                            { length: 80 }
                                                        )
                                                    }}</span
                                                >
                                            </div>
                                        </div>
                                    </template>
                                </Column>
                                <Column
                                    field="amount"
                                    class="!text-right !px-4"
                                    :headerStyle="{ padding: '0 !important' }"
                                >
                                    <template #body="{ data }">
                                        <span class="font-bold">
                                            {{ moneyFormat(data.amount) }}
                                        </span>
                                    </template>
                                </Column>
                            </BaseTable>
                        </div>
                    </template>
                </Card>

                <!-- Right Column -->
                <Card
                    class="flex-1 flex flex-col overflow-auto w-full md:w-1/2"
                >
                    <template #content>
                        <div
                            v-if="
                                !selectedExpense &&
                                !isAddingNewExpense &&
                                mode !== 'submit' &&
                                !isExpenseReportEdit &&
                                canAddExpenses
                            "
                            class="h-full"
                        >
                            <div class="text-center flex flex-col mt-8 gap-4">
                                <Button
                                    class="self-center"
                                    label="Add Expenses"
                                    @click="openNewExpenseForm"
                                />
                                <p>
                                    Clicking the Add Expense button<br />
                                    will create new expenses which<br />
                                    you'll be able to review/edit and/or<br />
                                    submit for approval.
                                </p>
                            </div>
                        </div>
                        <ExpenseForm
                            ref="expenseFormRef"
                            v-if="
                                (selectedExpense || isAddingNewExpense) &&
                                mode !== 'submit'
                            "
                            :expense="selectedExpense"
                            :isEditMode="
                                !!(selectedExpense && selectedExpense.id)
                            "
                            :defaultDate="
                                selectedExpense?.date || lastSelectedExpenseDate
                            "
                            @reloadExpenses="getExpenses()"
                            @close="closeForm"
                            @dirty-change="formDirty = $event"
                            @update:expense="selectedExpense = $event"
                        />
                        <div v-else-if="mode === 'submit'" class="space-y-4">
                            <div class="grid grid-cols-12 gap-6">
                                <div class="col-span-12 mt-5">
                                    <label class="block mb-3"
                                        >Expenses Report Name</label
                                    >
                                    <InputField
                                        id="name"
                                        :disabled="busy"
                                        class="w-full"
                                        v-model="reportName"
                                        @keyup.enter="submitExpenses"
                                        variant="text"
                                    />
                                </div>
                                <div
                                    class="col-span-12 flex items-center gap-3"
                                >
                                    <InputField
                                        id="allow_select"
                                        binary
                                        inputId="allow_select"
                                        variant="checkbox"
                                        v-model="allowSelect"
                                        :disabled="busy"
                                    />
                                    <label
                                        class="cursor-pointer"
                                        for="allow_select"
                                    >
                                        Allow me to select the expenses I would
                                        like to include
                                    </label>
                                </div>
                                <div class="col-span-12 mt-5">
                                    <div class="flex justify-between">
                                        <Button
                                            label="Cancel"
                                            variant="outlined"
                                            class="w-full sm:w-auto"
                                            :disabled="busy"
                                            @click="closeSubmitView"
                                        />
                                        <Button
                                            :disabled="
                                                busy ||
                                                (allowSelect &&
                                                    selectedExpenses.length ===
                                                        0)
                                            "
                                            label="Submit Expenses"
                                            @click="submitExpenses"
                                            iconPos="left"
                                            class="w-full sm:w-auto"
                                            :loading="busy"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </Card>
            </div>

            <!-- Fixed Bottom Bar -->
            <Card
                class="w-full flex-shrink-0"
                v-if="mode === 'form' && !isExpenseReportEdit && canAddExpenses"
            >
                <template #content>
                    <div
                        class="flex flex-col md:flex-row justify-center items-center gap-4 py-3"
                    >
                        <span class="font-semibold text-center md:text-left">
                            There are
                            {{ moneyFormat(totalUnsubmittedExpensesAmount) }}
                            unsubmitted expenses in this report.
                        </span>
                        <Button
                            :disabled="totalUnsubmittedExpensesAmount === 0"
                            @click="openSubmitView"
                            label="Submit Expenses"
                            icon="pi pi-arrow-right"
                            iconPos="right"
                        />
                    </div>
                </template>
            </Card>
        </div>

        <Confirmation
            v-model="showUnsavedDialog"
            header="Unsaved Changes"
            content="You have unsaved changes. If you continue, those changes will be lost. Do you want to discard them?"
            variant="danger"
            confirmButtonText="Discard Changes"
            cancelButtonText="Keep Editing"
            @confirm="confirmDiscard"
        />
    </template>
</template>
