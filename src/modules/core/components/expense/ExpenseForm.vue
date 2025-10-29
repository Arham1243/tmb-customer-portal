<script setup>
import dayjs from '@/plugins/dayjs';
import { ref, watch, computed, onUnmounted, nextTick } from 'vue';
import {
    useProjectStore,
    useCustomerStore,
    useExpenseStore
} from '@/modules/core/stores';
import { useHelpers } from '@/composables/useHelpers';
import { useExpenseCategoryStore } from '@/modules/administration/stores';
import { useCreditCardStore } from '@/modules/administration/stores';
import { useConfirm } from 'primevue/useconfirm';
import { useFormDirty } from '@/composables/useFormDirty';
import { useRoute } from 'vue-router';
import { useUserRole } from '@/composables/useUserRole';
import { useSessionStore } from '@/stores';

const route = useRoute();
const props = defineProps({
    expense: { type: Object, required: false, default: null },
    isEditMode: { type: Boolean, default: false },
    defaultDate: { type: String, required: false, default: null }
});

const { isAdmin, isApprover } = useUserRole();
const sessionStore = useSessionStore();
const confirm = useConfirm();
const emit = defineEmits([
    'close',
    'reloadExpenses',
    'update:expense',
    'dirty-change'
]);
const customerStore = useCustomerStore();
const projectStore = useProjectStore();
const expenseCategoryStore = useExpenseCategoryStore();
const isExpenseReportEdit = ref(route.params.id ? true : false);
const expenseStore = useExpenseStore();
const creditCardStore = useCreditCardStore();
const { isValidUrl, filterActiveWithSelected, moneyFormat, filterFileFields } =
    useHelpers();
const busy = ref(false);
const today = new Date();

const disableFutureDates = (date) => {
    return date > today;
};
const loadingCustomers = ref(false);
const selectedUserId = ref(
    route.params.user_id ? Number(route.params.user_id) : null
);
const customers = ref([]);
const loadingProjects = ref(false);
const projects = ref([]);
const loadingExpenseCategories = ref(false);
const expenseCategories = ref([]);
const loadingCreditCards = ref(false);
const attachmentFilename = ref('');
const deletingAttachment = ref(false);
const creditCards = ref([]);
const showUnsavedDialog = ref(false);
const deleteDialog = ref(false);
const isExpenseCategoryUom = ref(false);
const deletingExpense = ref(false);
const selectedExpenseCategory = ref(null);
const skipAutoCalc = ref(false);
const formData = ref({
    date: dayjs().format('YYYY-MM-DD'),
    status: 'draft',
    billing_status: 'unbilled',
    description: '',
    uom_miles: '',
    uom_cost_rate: 0,
    uom_sale_price: 0,
    is_billable: true,
    attachment: null,
    credit_card_id: null,
    is_reimbursable: true,
    customer_id: null,
    project_id: null,
    expense_category_id: null,
    amount: 0,
    billable_amount: 0,
    original_billable_amount: 0
});
const { isDirty, resetDirty } = useFormDirty(formData);

onUnmounted(() => {
    resetForm();
    emit('dirty-change', false);
});

const isDraftStatus = computed(() => {
    return formData.value.status === 'draft';
});

const canUpdateExpense = computed(() => {
    // In edit mode, only allow updates if expense is in draft status
    // This applies to everyone - admin, approver, and regular users
    if (isEditMode.value && !isDraftStatus.value) return false;

    // Admin can always edit draft expenses
    if (isAdmin.value) return true;

    // Approvers can edit any draft expense (like admin)
    if (isApprover.value && isEditMode.value) return true;

    // Approvers can only add expenses for themselves
    if (isApprover.value && !isEditMode.value) {
        return selectedUserId.value == sessionStore.user.id;
    }

    // Regular users can add/edit their own draft expenses
    if (!isExpenseReportEdit.value) return true;

    return false;
});

const isEditMode = computed({
    get: () => !!props.expense?.id,
    set: (val) => {
        if (!val) {
            emit('update:expense', null);
        }
    }
});

const expense = computed({
    get: () => props.expense,
    set: (val) => emit('update:expense', val)
});

const getCustomers = async (searchText = '') => {
    try {
        loadingCustomers.value = true;
        const params = { limit: 300 };
        const payload = {
            search: {
                value: searchText
            },
            customFilters: [
                {
                    field: 'user_id',
                    operator: '=',
                    value: selectedUserId.value
                }
            ]
        };
        const res = await customerStore.list(payload, params);
        customers.value = filterActiveWithSelected(
            res.data,
            formData.value.customer_id
        );
    } finally {
        loadingCustomers.value = false;
    }
};

const getProjects = async (searchText = '') => {
    try {
        loadingProjects.value = true;
        projects.value = [];
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            customFilters: [
                {
                    field: 'customer_id',
                    value: formData.value.customer_id || null
                }
            ]
        };
        const res = await projectStore.list(payload, params);
        projects.value = filterActiveWithSelected(
            res.data,
            formData.value.project_id
        );
    } finally {
        loadingProjects.value = false;
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
        expenseCategories.value = filterActiveWithSelected(
            res.data,
            formData.value.expense_category_id
        );
        selectedExpenseCategory.value = expenseCategories.value.find(
            (item) => item.id === formData.value.expense_category_id
        );
    } finally {
        loadingExpenseCategories.value = false;
    }
};

const getCreditCards = async (searchText = '') => {
    try {
        if (!selectedUserId.value) return;
        loadingCreditCards.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            filters: [
                {
                    field: 'users.id',
                    operator: '=',
                    value: selectedUserId.value
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

const confirmDeleteAttachment = (event) => {
    confirm.require({
        target: event.currentTarget,
        message: 'Are you sure you want to delete this file?',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: {
            label: 'Cancel',
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: 'Delete',
            severity: 'danger'
        },
        accept: () => {
            deleteAttachment();
        }
    });
};

const showDeleteDialog = () => {
    deleteDialog.value = true;
};

function onFileSelect(event) {
    const file = event.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        formData.value.attachment = e.target.result;
        attachmentFilename.value = file.name;
    };
    reader.readAsDataURL(file);
}

const deleteAttachment = async () => {
    try {
        deletingAttachment.value = true;
        await expenseStore.deleteExpenseAttachment(expense.value.id);
        formData.value.attachment = null;
        attachmentFilename.value = '';
        emit('reloadExpenses');
    } catch (error) {
        console.error(error);
    } finally {
        deletingAttachment.value = false;
    }
};

const updateAmounts = () => {
    if (skipAutoCalc.value) return;
    if (selectedExpenseCategory.value?.force_uom_entry) {
        const miles = Number(formData.value.uom_miles) || 0;
        const costRate = Number(formData.value.uom_cost_rate) || 0;
        const salePrice = Number(formData.value.uom_sale_price) || 0;

        formData.value.amount = miles * costRate;
        formData.value.original_billable_amount = miles * salePrice;
        formData.value.billable_amount = formData.value.is_billable
            ? formData.value.original_billable_amount
            : 0;
    } else {
        const amount = Number(formData.value.amount) || 0;
        const markup =
            Number(selectedExpenseCategory.value?.default_markup) || 0;

        formData.value.original_billable_amount =
            amount + (amount * markup) / 100;
        formData.value.billable_amount = formData.value.is_billable
            ? formData.value.original_billable_amount
            : 0;
    }
};

const onExpenseCategoryChange = (event) => {
    selectedExpenseCategory.value = expenseCategories.value.find(
        (item) => item.id === event.value
    );
    isExpenseCategoryUom.value = selectedExpenseCategory.value.force_uom_entry;

    formData.value.uom_cost_rate = selectedExpenseCategory.value.uom_cost_rate;
    formData.value.uom_sale_price =
        selectedExpenseCategory.value.uom_sale_price;
    formData.value.amount = 0;
    formData.value.billable_amount = 0;

    updateAmounts();
};

watch(() => formData.value.uom_miles, updateAmounts);
watch(() => formData.value.uom_sale_price, updateAmounts);
watch(() => formData.value.amount, updateAmounts);
watch(
    () => formData.value.is_billable,
    () => {
        updateAmounts();
    }
);

// Auto-enable is_billable when billable_amount becomes greater than 0
watch(
    () => formData.value.billable_amount,
    (newValue, oldValue) => {
        // Only trigger if:
        // 1. Previous value was 0 (or falsy)
        // 2. New value is greater than 0
        // 3. is_billable is currently false
        const wasZero = !oldValue || Number(oldValue) === 0;
        const isNowPositive = Number(newValue) > 0;

        if (wasZero && isNowPositive && !formData.value.is_billable) {
            formData.value.is_billable = true;
        }
    }
);

watch(
    () => props.expense,
    async (newExpense) => {
        if (newExpense) {
            skipAutoCalc.value = true; // freeze recalculation on load

            formData.value = {
                ...formData.value,
                ...newExpense,
                date: newExpense.date
                    ? dayjs.utc(newExpense.date).format('YYYY-MM-DD')
                    : dayjs().format('YYYY-MM-DD')
            };

            if (newExpense.customer_id) {
                formData.value.customer_id = newExpense.customer_id;
                await getProjects();
            }

            if (newExpense.project_id) {
                formData.value.project_id = newExpense.project_id;
            }
            getExpenseCategories();
            getCreditCards();

            if (newExpense.expense_category_id) {
                selectedExpenseCategory.value = expenseCategories.value.find(
                    (item) => item.id === newExpense.expense_category_id
                );
                isExpenseCategoryUom.value =
                    selectedExpenseCategory.value?.force_uom_entry || false;
            }

            // Use nextTick to ensure formData is fully updated before resetting dirty state
            nextTick(() => {
                resetDirty(formData.value);
                setTimeout(() => (skipAutoCalc.value = false), 0);
            });
        } else {
            // When expense becomes null (switching to add mode), reset dirty state
            nextTick(() => {
                resetDirty(formData.value);
            });
        }
    },
    { immediate: true }
);

watch(isDirty, (val) => {
    emit('dirty-change', val);
});

const deleteExpense = async () => {
    try {
        deletingExpense.value = true;
        if (expense.value) {
            await expenseStore.deleteExpense(expense.value.id);
        }
        closeForm();
        emit('reloadExpenses');
    } finally {
        deletingExpense.value = false;
    }
};

const onCustomerChange = () => {
    formData.value.project_id = null;
    projects.value = [];

    if (formData.value.customer_id) {
        getProjects();
    }
};

const save = async () => {
    try {
        busy.value = true;
        const initPayload = {
            ...formData.value,
            is_expense_category_uom: isExpenseCategoryUom.value,
            user_id: selectedUserId.value,
            credit_card_id: formData.value.credit_card_id || null
        };

        const payload = filterFileFields(initPayload, ['attachment']);

        let savedExpense;
        if (isEditMode.value) {
            // Existing entry -> just update
            const res = await expenseStore.updateExpense(
                expense.value.id,
                payload
            );
            // Stay on same page, don't force close
            const savedExpense = res.data || res;
            expense.value = savedExpense;
            emit('update:expense', savedExpense);
            // Wait for next tick to ensure all reactive updates are complete
            await nextTick();
            resetDirty(formData.value);
        } else {
            // New entry -> create
            const res = await expenseStore.createExpense(payload);

            // Switch to edit mode for this new entry
            const savedExpense = res.data || res;
            expense.value = savedExpense;
            emit('update:expense', savedExpense);

            // Update form data with the saved expense data (including ID)
            formData.value = {
                ...formData.value,
                ...savedExpense,
                date: savedExpense.date
                    ? dayjs.utc(savedExpense.date).format('YYYY-MM-DD')
                    : formData.value.date
            };

            // Wait for next tick to ensure all reactive updates are complete
            await nextTick();
            resetDirty(formData.value);
        }

        emit('reloadExpenses');
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
};

const resetForm = () => {
    formData.value = {
        date: props.defaultDate || dayjs().format('YYYY-MM-DD'),
        status: 'draft',
        billing_status: 'unbilled',
        description: '',
        uom_miles: '',
        uom_cost_rate: 0,
        uom_sale_price: 0,
        is_billable: true,
        attachment: null,
        credit_card_id: null,
        is_reimbursable: true,
        customer_id: null,
        project_id: null,
        expense_category_id: null,
        amount: 0,
        billable_amount: 0
    };
    isEditMode.value = false;
    expense.value = null;
    resetDirty(formData.value);
    emit('dirty-change', false);
};

const handleCloseClick = () => {
    if (isDirty.value) {
        showUnsavedDialog.value = true;
    } else {
        closeForm();
    }
};

function confirmDiscard() {
    showUnsavedDialog.value = false;
    closeForm();
}

function closeForm() {
    resetForm();
    emit('close');
}

defineExpose({
    resetForm
});
</script>

<template>
    <BlockUI :blocked="deletingExpense">
        <div class="grid grid-cols-12 gap-6">
            <div class="col-span-12">
                <div
                    class="flex items-center justify-between py-5 px-4 bg-gray-100"
                >
                    <div class="font-bold capitalize">
                        {{
                            !canUpdateExpense
                                ? 'View Expense Details'
                                : !isEditMode
                                  ? 'Add Expense Details'
                                  : 'Edit Expense Details'
                        }}
                    </div>

                    <Button
                        v-if="canUpdateExpense"
                        variant="outlined"
                        rounded
                        icon="pi pi-times"
                        @click="handleCloseClick"
                    />
                </div>
            </div>
            <div class="col-span-12 sm:col-span-6">
                <label class="block mb-3 required">Date</label>
                <InputField
                    id="date"
                    :disabled="busy || !canUpdateExpense"
                    class="w-full"
                    v-model="formData.date"
                    variant="date"
                    :disabled-date="disableFutureDates"
                    :max="today"
                />
            </div>
            <div class="col-span-12 sm:col-span-6">
                <label class="block mb-3">Status</label>
                <StatusTag :status="formData.status" />
            </div>
            <div class="col-span-12">
                <label class="block mb-3 required" for="customer_id"
                    >Customer</label
                >
                <ApiDropdown
                    showClear
                    filter
                    placeholder="Select"
                    :loading="loadingCustomers"
                    @search="getCustomers"
                    @change="onCustomerChange"
                    :options="customers"
                    optionLabel="name"
                    optionValue="id"
                    id="customer_id"
                    v-model="formData.customer_id"
                    class="w-full"
                    :disabled="busy || loadingCustomers || !canUpdateExpense"
                />
            </div>
            <div class="col-span-12">
                <label class="block mb-3 required" for="project_id"
                    >Project</label
                >
                <ApiDropdown
                    showClear
                    filter
                    placeholder="Select"
                    :loading="loadingProjects"
                    @search="getProjects"
                    :options="projects"
                    optionLabel="name"
                    optionValue="id"
                    id="project_id"
                    v-model="formData.project_id"
                    class="w-full"
                    :disabled="busy || loadingProjects || !canUpdateExpense"
                />
            </div>
            <div class="col-span-12">
                <label class="block mb-3 required" for="expense_category_id"
                    >Expense Category</label
                >
                <ApiDropdown
                    showClear
                    filter
                    placeholder="Select"
                    :loading="loadingExpenseCategories"
                    @change="onExpenseCategoryChange"
                    @search="getExpenseCategories"
                    :options="expenseCategories"
                    optionLabel="name"
                    optionValue="id"
                    id="expense_category_id"
                    v-model="formData.expense_category_id"
                    class="w-full"
                    :disabled="
                        busy || loadingExpenseCategories || !canUpdateExpense
                    "
                />
            </div>
            <div
                :class="
                    isAdmin || isApprover
                        ? 'col-span-12 sm:col-span-4'
                        : 'col-span-12 sm:col-span-6'
                "
                v-if="isExpenseCategoryUom"
            >
                <label class="block mb-3 required">{{
                    selectedExpenseCategory.uom_miles
                }}</label>
                <InputField
                    id="uom_miles"
                    :disabled="busy || !canUpdateExpense"
                    class="w-full"
                    inputClass="w-full"
                    v-model="formData.uom_miles"
                    :useGrouping="false"
                    variant="number"
                    :maxFractionDigits="2"
                    :minFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div
                :class="
                    isAdmin || isApprover
                        ? 'col-span-12 sm:col-span-4'
                        : 'col-span-12 sm:col-span-6'
                "
                v-if="isExpenseCategoryUom"
            >
                <label class="block mb-3 required">Cost Rate</label>
                <InputField
                    id="uom_cost_rate"
                    :disabled="true"
                    class="w-full"
                    inputClass="w-full"
                    prefix="$"
                    v-model="formData.uom_cost_rate"
                    variant="number"
                    :maxFractionDigits="2"
                    :minFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div
                class="col-span-12 sm:col-span-4"
                v-if="isExpenseCategoryUom && (isAdmin || isApprover)"
            >
                <label class="block mb-3 required">Sale Price</label>
                <InputField
                    id="uom_sale_price"
                    :disabled="busy || !canUpdateExpense"
                    class="w-full"
                    inputClass="w-full"
                    prefix="$"
                    v-model="formData.uom_sale_price"
                    variant="number"
                    :maxFractionDigits="2"
                    :minFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div
                :class="
                    isAdmin || isApprover
                        ? 'col-span-12 sm:col-span-6'
                        : 'col-span-12'
                "
            >
                <label class="block mb-3 required">Amount</label>
                <InputField
                    id="amount"
                    :disabled="isExpenseCategoryUom || !canUpdateExpense"
                    class="w-full"
                    inputClass="w-full"
                    v-model="formData.amount"
                    variant="number"
                    prefix="$"
                    :maxFractionDigits="2"
                    :minFractionDigits="2"
                    :min="0"
                    :step="1"
                />
            </div>
            <div class="col-span-12 sm:col-span-6" v-if="isAdmin || isApprover">
                <label class="block mb-3 required">Billable Amount</label>
                <div class="relative">
                    <InputField
                        id="billable_amount"
                        :disabled="
                            !canUpdateExpense ||
                            (isExpenseCategoryUom ? true : false)
                        "
                        class="w-full"
                        inputClass="w-full"
                        v-model="formData.billable_amount"
                        variant="number"
                        prefix="$"
                        :maxFractionDigits="2"
                        :minFractionDigits="2"
                        :min="0"
                        :step="1"
                    />
                    <!-- Original amount overlay when non-billable -->
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
            <div class="col-span-12">
                <label class="block required mb-2">Expense Description</label>
                <InputField
                    id="description"
                    :disabled="busy || !canUpdateExpense"
                    class="w-full h-[8rem]"
                    v-model="formData.description"
                    variant="textarea"
                    maxlength="1000"
                />
                <span
                    :class="[
                        'block text-sm',
                        formData.description?.length >= 1000
                            ? 'text-red-500'
                            : 'text-gray-600'
                    ]"
                >
                    {{ 1000 - (formData.description?.length || 0) }} characters
                    left
                </span>
            </div>
            <div class="col-span-12">
                <label class="block mb-3">Attachment</label>
                <div
                    v-if="!isValidUrl(formData.attachment)"
                    class="p-inputtext w-full flex gap-4 items-center"
                >
                    <FileUpload
                        name="attachment"
                        mode="basic"
                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                        :disabled="busy || !canUpdateExpense"
                        :auto="true"
                        customUpload
                        @uploader="onFileSelect"
                    />
                    {{ attachmentFilename ?? 'No file chosen' }}
                </div>

                <div v-else class="w-full">
                    <BlockUI
                        :blocked="deletingAttachment"
                        class="flex items-center gap-4 w-full py-2"
                    >
                        <Button
                            as="a"
                            :href="formData.attachment"
                            target="_blank"
                            label="View Attachment"
                            icon="pi pi-file"
                            variant="outlined"
                        />
                        <ConfirmPopup></ConfirmPopup>
                        <Button
                            icon="pi pi-trash"
                            size="large"
                            text
                            rounded
                            severity="danger"
                            :disabled="deletingAttachment || !canUpdateExpense"
                            @click="confirmDeleteAttachment($event)"
                        />
                    </BlockUI>
                </div>
            </div>
            <div class="col-span-12 sm:col-span-6" v-if="isAdmin || isApprover">
                <label class="block mb-3">Billing Status</label>
                <StatusTag :status="formData.billing_status" />
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
                    :disabled="busy || !canUpdateExpense"
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
                    :disabled="busy || !canUpdateExpense"
                />
                <label class="cursor-pointer" for="is_reimbursable">
                    This expense is non reimbursable
                </label>
            </div>
            <div class="col-span-12" v-if="!formData.is_reimbursable">
                <label class="block mb-3 required" for="credit_card_id"
                    >Company Credit/Debit Card</label
                >
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
                    :disabled="busy || loadingCreditCards || !canUpdateExpense"
                />
            </div>
            <div class="col-span-12 mt-5 pb-20">
                <div class="flex justify-between">
                    <div>
                        <Button
                            v-if="
                                $ability.can('expenses.delete') &&
                                isEditMode &&
                                canUpdateExpense
                            "
                            @click="showDeleteDialog"
                            label="Delete"
                            severity="danger"
                            :disabled="busy"
                            class="mr-2"
                        />
                    </div>
                    <div>
                        <Button
                            v-if="canUpdateExpense"
                            iconPos="left"
                            :loading="busy"
                            label="Save"
                            @click="save"
                            :disabled="!isDirty || busy"
                        />
                    </div>
                </div>
            </div>
        </div>
    </BlockUI>

    <Confirmation
        v-model="deleteDialog"
        variant="danger"
        header="Delete Expense"
        content="Are you sure you want to delete this expense?"
        @confirm="deleteExpense"
    />

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
