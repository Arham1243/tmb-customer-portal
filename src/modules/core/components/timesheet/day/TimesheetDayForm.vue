<script setup>
import dayjs from '@/plugins/dayjs';
import {
    ref,
    watch,
    computed,
    onUnmounted,
    onBeforeMount,
    nextTick
} from 'vue';
import {
    useProjectStore,
    useCustomerStore,
    useTimesheetStore,
    useProjectTaskStore
} from '@/modules/core/stores';
import { useUserStore } from '@/modules/administration/stores';
import { useHelpers } from '@/composables/useHelpers';
import { useFormDirty } from '@/composables/useFormDirty';
import { useRoute } from 'vue-router';
import { useUserRole } from '@/composables/useUserRole';
import { useSessionStore } from '@/stores';

const route = useRoute();
const props = defineProps({
    timesheet: { type: Object, required: false, default: null },
    isEditMode: { type: Boolean, default: false },
    isDraftStatus: { type: Boolean, default: true },
    defaultDate: { type: String, required: false, default: null }
});

const { isAdmin, isApprover } = useUserRole();
const sessionStore = useSessionStore();
const emit = defineEmits([
    'close',
    'reloadTimesheets',
    'update:timesheet',
    'dirty-change'
]);
const customerStore = useCustomerStore();
const userStore = useUserStore();
const projectStore = useProjectStore();
const projectTaskStore = useProjectTaskStore();
const isTimesheetReportEdit = ref(route.params.id ? true : false);
const timesheetStore = useTimesheetStore();
const { filterActiveWithSelected, moneyFormat } = useHelpers();
const busy = ref(false);
const today = new Date();
const isLoadingFromBackend = ref(false);

const disableFutureDates = (date) => {
    return date > today;
};
const loadingCustomers = ref(false);
const selectedUserId = ref(
    route.params.user_id ? Number(route.params.user_id) : null
);
const loadingUsers = ref(false);
const users = ref([]);
const customers = ref([]);
const loadingProjects = ref(false);
const projects = ref([]);
const loadingProjectTasks = ref(false);
const selectedUser = ref(null);
const projectTasks = ref([]);
const showUnsavedDialog = ref(false);
const deleteDialog = ref(false);
const deletingTimesheet = ref(false);
const formData = ref({
    date: dayjs().format('YYYY-MM-DD'),
    status: 'draft',
    billing_status: 'unbilled',
    description: '',
    input_hours: 0,
    billable_hours: 0,
    billing_rate: 0,
    charge_rate: 0,
    original_charge_rate: 0,
    charge_amount: 0,
    is_billable: true,
    is_reportable: true,
    customer_id: null,
    project_id: null,
    project_task_id: null
});
const { isDirty, resetDirty } = useFormDirty(formData);

// Define resetForm early so it can be used in watchers and lifecycle hooks
const resetForm = () => {
    formData.value = {
        date: props.defaultDate || dayjs().format('YYYY-MM-DD'),
        status: 'draft',
        billing_status: 'unbilled',
        description: '',
        input_hours: 0,
        billable_hours: 0,
        billing_rate: 0,
        charge_rate: 0,
        original_charge_rate: 0,
        charge_amount: 0,
        is_billable: true,
        is_reportable: true,
        customer_id: null,
        project_id: null,
        project_task_id: null
    };
    // Directly emit to parent instead of using computed properties
    emit('update:timesheet', null);
    resetDirty(formData.value);
};

// Define computed properties after resetForm
const isEditMode = computed({
    get: () => !!props.timesheet?.id,
    set: (val) => {
        if (!val) {
            emit('update:timesheet', null);
        }
    }
});

const timesheet = computed({
    get: () => props.timesheet,
    set: (val) => emit('update:timesheet', val)
});

onUnmounted(() => {
    resetForm();
    emit('dirty-change', false);
});

onBeforeMount(async () => {
    await getUsers();
});

watch(
    () => formData.value.input_hours,
    (val) => {
        // Don't sync during initial load from backend
        // This allows billable_hours to have a different value when loaded
        if (isLoadingFromBackend.value) {
            return;
        }
        // When user is typing, always sync billable_hours with input_hours
        formData.value.billable_hours = val;
    }
);

watch(
    () => formData.value.billing_rate,
    (val) => {
        // Copy billing rate to charge rate, but only if entry is billable
        if (formData.value.is_billable) {
            formData.value.charge_rate = val;
            formData.value.original_charge_rate = val;
        }
    }
);

watch(
    () => formData.value.is_billable,
    (val) => {
        // If marked as non-billable, store original and set charge rate to zero
        // If marked as billable, restore from billing rate
        if (!val) {
            // Non-billable: Set billable hours same as input hours (unless non-reportable)
            if (formData.value.is_reportable) {
                formData.value.billable_hours = formData.value.input_hours;
            }
            // Store original charge rate before setting to zero
            if (formData.value.charge_rate > 0) {
                formData.value.original_charge_rate =
                    formData.value.charge_rate;
            }
            formData.value.charge_rate = 0;
        } else {
            // Billable: Restore charge rate and uncheck non-reportable
            formData.value.charge_rate = formData.value.billing_rate;
            formData.value.original_charge_rate = formData.value.billing_rate;
            formData.value.is_reportable = true;
        }
    }
);

watch(
    () => formData.value.is_reportable,
    (val) => {
        if (!val) {
            // Non-reportable (NR):
            // 1. Must be non-billable first
            if (formData.value.is_billable) {
                formData.value.is_billable = false;
            }
            // 2. Set billable hours to zero
            formData.value.billable_hours = 0;
        } else {
            // Reportable again:
            // If it's non-billable, restore billable hours to input hours
            if (!formData.value.is_billable) {
                formData.value.billable_hours = formData.value.input_hours;
            }
        }
    }
);

// Calculate charge amount when billable hours changes
watch(
    () => formData.value.billable_hours,
    () => {
        formData.value.charge_amount =
            (formData.value.billable_hours || 0) *
            (formData.value.charge_rate || 0);
    }
);

// Calculate charge amount when charge rate changes
watch(
    () => formData.value.charge_rate,
    () => {
        formData.value.charge_amount =
            (formData.value.billable_hours || 0) *
            (formData.value.charge_rate || 0);
    }
);

watch(
    () => props.timesheet,
    async (newTimesheet) => {
        if (newTimesheet) {
            // Set flag to prevent input_hours watcher from syncing during load
            isLoadingFromBackend.value = true;
            formData.value = {
                ...formData.value,
                ...newTimesheet,
                date: newTimesheet.date
                    ? dayjs.utc(newTimesheet.date).format('YYYY-MM-DD')
                    : dayjs().format('YYYY-MM-DD')
            };
            await getCustomers();

            if (newTimesheet.customer_id) {
                formData.value.customer_id = newTimesheet.customer_id;
                await getProjects();
            }

            if (newTimesheet.project_id) {
                formData.value.project_id = newTimesheet.project_id;
                await getProjectTasks();
            }

            // Wait for all watchers to complete before resetting dirty state
            await nextTick();
            resetDirty();
            // Clear flag after load is complete
            isLoadingFromBackend.value = false;
        } else if (newTimesheet === null) {
            // Reset form when timesheet becomes null (switching to add mode)
            resetForm();
        }
    },
    { immediate: true }
);

watch(isDirty, (val) => {
    emit('dirty-change', val);
});

const isTimeSheetInvoiced = computed(() => {
    return props.timesheet?.billing_status === 'invoiced';
});

const canUpdateTimesheet = computed(() => {
    // In edit mode, only allow updates if timesheet is in draft status
    // This applies to everyone - admin, approver, and regular users
    if (props.isEditMode && !props.isDraftStatus) return false;

    // Admin can always edit draft timesheets
    if (isAdmin.value) return true;

    // Approvers can edit any draft timesheet (like admin)
    if (isApprover.value && props.isEditMode) return true;

    // Approvers can only add timesheets for themselves
    if (isApprover.value && !props.isEditMode) {
        return selectedUserId.value == sessionStore.user.id;
    }

    // Regular users can add/edit their own draft timesheets
    if (!isTimesheetReportEdit.value) return true;

    return false;
});

// Centralized field disable logic - Only draft timesheets can be edited
const isFieldDisabled = computed(() => {
    // In edit mode, only allow editing if status is draft
    return props.isEditMode && !props.isDraftStatus;
});

const isReportableEditable = computed(() => !formData.value.is_billable);

// Centralized button visibility logic - Only show buttons for draft timesheets
const showActionButtons = computed(() => {
    // Only show buttons if not editing or if editing draft status
    return (
        canUpdateTimesheet.value && (!props.isEditMode || props.isDraftStatus)
    );
});

const showTaskFields = computed(() => {
    return formData.value.project_task_id;
});

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
        selectedUser.value = users.value.find(
            (u) => Number(u.id) === Number(selectedUserId.value)
        );
    } finally {
        loadingUsers.value = false;
    }
};

const getCustomers = async (searchText = '') => {
    try {
        loadingCustomers.value = true;
        const params = { limit: 300 };
        const payload = {
            search: {
                value: searchText
            },
            includes: [
                {
                    relation: 'users'
                }
            ],
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

const getProjectTasks = async (searchText = '') => {
    try {
        if (!formData.value.project_id) return;
        loadingProjectTasks.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            filters: [
                {
                    field: 'project_id',
                    value: formData.value.project_id
                }
            ],
            includes: [
                {
                    relation: 'users'
                },
                {
                    relation: 'revenueCategory'
                }
            ]
        };
        const res = await projectTaskStore.list(payload, params);
        projectTasks.value = filterActiveWithSelected(
            res.data,
            formData.value.project_task_id
        );
    } finally {
        loadingProjectTasks.value = false;
    }
};

const showDeleteDialog = () => {
    deleteDialog.value = true;
};

const deleteTimesheet = async () => {
    try {
        deletingTimesheet.value = true;
        if (timesheet.value) {
            await timesheetStore.deleteItem(timesheet.value.id);
        }
        closeForm();
        emit('reloadTimesheets');
    } finally {
        deletingTimesheet.value = false;
    }
};

const onCustomerChange = () => {
    formData.value.project_id = null;
    formData.value.project_task_id = null;
    projects.value = [];
    projectTasks.value = [];

    if (formData.value.customer_id) {
        getProjects();
    }
};

const onProjectChange = () => {
    formData.value.project_task_id = null;
    projectTasks.value = [];

    if (formData.value.project_id) {
        getProjectTasks('');
    }
};

const onProjectTaskChange = () => {
    const billingRate = getBillingRate();
    const travelChargePercentage = getTravelChargePercentage();
    const selectedProjectTask = projectTasks.value.find(
        (t) => t.id == formData.value.project_task_id
    );
    const isProjectTaskTravel =
        selectedProjectTask.revenueCategory.is_travel_charge;

    const userFoundInProjectTask = selectedProjectTask.users?.find(
        (u) => u.id == selectedUserId.value
    );

    if (isProjectTaskTravel) {
        if (
            userFoundInProjectTask &&
            +userFoundInProjectTask.project_task_rate > 0
        ) {
            formData.value.billing_rate =
                userFoundInProjectTask.project_task_rate;
        } else {
            formData.value.billing_rate =
                (billingRate * travelChargePercentage) / 100;
        }
    } else {
        formData.value.billing_rate = billingRate;
    }
};

const getTravelChargePercentage = () => {
    const selectedCustomer = customers.value.find(
        (t) => t.id == formData.value.customer_id
    );
    const userFoundInCustomerTeam = selectedCustomer.users?.find(
        (u) => u.id == selectedUserId.value
    );
    if (userFoundInCustomerTeam) {
        return userFoundInCustomerTeam.travel_charges;
    }
    return selectedCustomer.travel_charges;
};

const getBillingRate = () => {
    const selectedProjectTask = projectTasks.value.find(
        (t) => t.id == formData.value.project_task_id
    );
    const selectedCustomer = customers.value.find(
        (t) => t.id == formData.value.customer_id
    );
    const userFoundInProjectTask = selectedProjectTask.users?.find(
        (u) => u.id == selectedUserId.value
    );
    const userFoundInCustomerTeam = selectedCustomer.users?.find(
        (u) => u.id == selectedUserId.value
    );
    if (userFoundInProjectTask) {
        return userFoundInProjectTask.project_task_rate;
    }
    if (userFoundInCustomerTeam) {
        return userFoundInCustomerTeam.customer_rate;
    }
    if (selectedCustomer.has_customer_rate) {
        return selectedCustomer.customer_rate;
    }
    return selectedUser.value.default_user_billing_rate_per_hour;
};

const save = async () => {
    try {
        busy.value = true;
        const payload = {
            ...formData.value,
            user_id: selectedUserId.value
        };

        if (isEditMode.value) {
            // Existing entry -> just update
            const res = await timesheetStore.update(
                timesheet.value.id,
                payload
            );
            // Stay on same page, don't force close
            timesheet.value = res.data;
            emit('update:timesheet', res.data);
            resetDirty(formData.value);
        } else {
            // New entry -> create
            const res = await timesheetStore.create(payload);

            // Switch to edit mode for this new entry
            timesheet.value = res.data;
            emit('update:timesheet', res.data);

            resetDirty(formData.value);
        }

        emit('reloadTimesheets');
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
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
    // Emit close event to parent component first
    emit('close');
    // Then reset form data
    resetForm();
}
</script>

<template>
    <BlockUI :blocked="deletingTimesheet">
        <div class="grid grid-cols-12 gap-6">
            <div class="col-span-12">
                <div
                    class="flex items-center justify-between py-5 px-4 bg-gray-100"
                >
                    <div class="font-bold capitalize">
                        {{
                            !canUpdateTimesheet
                                ? 'View Time Entry Details'
                                : !isEditMode
                                  ? 'Add Time Entry Details'
                                  : 'Edit Time Entry Details'
                        }}
                    </div>

                    <Button
                        v-if="canUpdateTimesheet"
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
                    :disabled="busy || !canUpdateTimesheet || isFieldDisabled"
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
                    :disabled="
                        busy ||
                        loadingCustomers ||
                        !canUpdateTimesheet ||
                        isFieldDisabled
                    "
                />
            </div>
            <div v-if="formData.customer_id" class="col-span-12">
                <div class="grid grid-cols-12 gap-6">
                    <div class="col-span-12">
                        <label class="block mb-3 required" for="project_id"
                            >Project</label
                        >
                        <ApiDropdown
                            showClear
                            filter
                            placeholder="Select"
                            :loading="loadingProjects || loadingCustomers"
                            @search="getProjects"
                            @change="onProjectChange"
                            :options="projects"
                            optionLabel="name"
                            optionValue="id"
                            id="project_id"
                            v-model="formData.project_id"
                            class="w-full"
                            :disabled="
                                busy ||
                                loadingProjects ||
                                loadingCustomers ||
                                !canUpdateTimesheet ||
                                isFieldDisabled
                            "
                        />
                    </div>
                </div>
            </div>
            <div v-if="formData.project_id" class="col-span-12">
                <div class="grid grid-cols-12 gap-6">
                    <div class="col-span-12">
                        <label class="block mb-3 required" for="project_task_id"
                            >Task</label
                        >
                        <ApiDropdown
                            filter
                            showClear
                            placeholder="Select"
                            :loading="loadingProjectTasks || loadingProjects"
                            @change="onProjectTaskChange"
                            @search="getProjectTasks"
                            :options="projectTasks"
                            optionLabel="name"
                            optionValue="id"
                            id="project_task_id"
                            v-model="formData.project_task_id"
                            class="w-full"
                            :disabled="
                                busy ||
                                loadingProjects ||
                                loadingProjectTasks ||
                                !canUpdateTimesheet ||
                                isFieldDisabled
                            "
                        />
                    </div>
                    <div
                        v-if="showTaskFields"
                        class="col-span-12 sm:col-span-6"
                    >
                        <label class="block mb-3 required">Input Hours</label>
                        <InputField
                            :disabled="busy || isFieldDisabled"
                            class="w-full"
                            inputClass="w-full"
                            id="input_hours"
                            v-model="formData.input_hours"
                            :useGrouping="false"
                            variant="number"
                            :maxFractionDigits="2"
                            :minFractionDigits="2"
                            @keyup.enter="save"
                            :min="0"
                        />
                    </div>
                    <div
                        class="col-span-12 sm:col-span-6"
                        v-if="showTaskFields && (isAdmin || isApprover)"
                    >
                        <label class="block mb-3 required"
                            >Billable Hours</label
                        >
                        <InputField
                            :disabled="isFieldDisabled"
                            class="w-full"
                            inputClass="w-full"
                            id="billable_hours"
                            v-model="formData.billable_hours"
                            :useGrouping="false"
                            variant="number"
                            :maxFractionDigits="2"
                            :minFractionDigits="2"
                            @keyup.enter="save"
                            :min="0"
                        />
                    </div>
                    <div
                        class="col-span-12 sm:col-span-4"
                        v-if="showTaskFields && (isAdmin || isApprover)"
                    >
                        <label class="block mb-3 required">Billing Rate </label>
                        <InputField
                            :disabled="true"
                            class="w-full"
                            inputClass="w-full"
                            id="billing_rate"
                            v-model="formData.billing_rate"
                            variant="number"
                            :maxFractionDigits="2"
                            :minFractionDigits="2"
                            @keyup.enter="save"
                            prefix="$"
                            :min="0"
                        />
                    </div>
                    <div
                        class="col-span-12 sm:col-span-4"
                        v-if="showTaskFields && (isAdmin || isApprover)"
                    >
                        <label class="block mb-3 required">Charge Rate</label>
                        <div class="relative">
                            <InputField
                                :disabled="
                                    busy ||
                                    isTimeSheetInvoiced ||
                                    !formData.is_billable ||
                                    isFieldDisabled
                                "
                                class="w-full"
                                inputClass="w-full"
                                id="charge_rate"
                                v-model="formData.charge_rate"
                                variant="number"
                                :maxFractionDigits="2"
                                :minFractionDigits="2"
                                @keyup.enter="save"
                                prefix="$"
                                :min="0"
                            />
                            <!-- Original amount overlay when non-billable -->
                            <div
                                v-if="
                                    !formData.is_billable &&
                                    formData.original_charge_rate > 0
                                "
                                class="absolute inset-y-0 left-16 flex items-center pointer-events-none"
                            >
                                <span
                                    class="text-base text-gray-400 line-through px-1 ml-2"
                                >
                                    {{
                                        moneyFormat(
                                            formData.original_charge_rate
                                        )
                                    }}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div
                        class="col-span-12 sm:col-span-4"
                        v-if="showTaskFields && (isAdmin || isApprover)"
                    >
                        <label class="block mb-3 required">Charge Amount</label>
                        <InputField
                            :disabled="true"
                            class="w-full"
                            inputClass="w-full"
                            id="charge_amount"
                            v-model="formData.charge_amount"
                            variant="number"
                            :maxFractionDigits="2"
                            :minFractionDigits="2"
                            @keyup.enter="save"
                            prefix="$"
                            :min="0"
                        />
                    </div>
                    <div
                        class="col-span-12"
                        v-if="showTaskFields && (isAdmin || isApprover)"
                    >
                        <label class="block mb-3">Billing Status</label>
                        <StatusTag :status="formData.billing_status" />
                    </div>
                    <div v-if="showTaskFields" class="col-span-12">
                        <label class="block required mb-2">Description</label>
                        <InputField
                            id="description"
                            :disabled="
                                busy || !canUpdateTimesheet || isFieldDisabled
                            "
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
                            {{ 1000 - (formData.description?.length || 0) }}
                            characters left
                        </span>
                    </div>
                    <div
                        v-if="showTaskFields"
                        class="col-span-12 flex items-center gap-3"
                    >
                        <InputField
                            id="is_billable"
                            binary
                            inputId="is_billable"
                            variant="checkbox"
                            v-model="formData.is_billable"
                            :trueValue="false"
                            :falseValue="true"
                            :disabled="
                                busy || !canUpdateTimesheet || isFieldDisabled
                            "
                        />
                        <label class="cursor-pointer" for="is_billable">
                            This time is non-billable
                        </label>
                    </div>
                    <div
                        v-if="showTaskFields"
                        class="col-span-12 flex items-center gap-3"
                    >
                        <InputField
                            id="is_reportable"
                            binary
                            inputId="is_reportable"
                            variant="checkbox"
                            v-model="formData.is_reportable"
                            :trueValue="false"
                            :falseValue="true"
                            :disabled="
                                busy ||
                                !canUpdateTimesheet ||
                                isFieldDisabled ||
                                !isReportableEditable
                            "
                        />
                        <label class="cursor-pointer" for="is_reportable">
                            This time is non-reportable
                        </label>
                    </div>
                    <div v-if="showTaskFields" class="col-span-12 mt-5 pb-20">
                        <div class="flex justify-between">
                            <div>
                                <Button
                                    v-if="
                                        $ability.can('timesheets.delete') &&
                                        isEditMode &&
                                        showActionButtons
                                    "
                                    @click="showDeleteDialog"
                                    label="Delete"
                                    severity="danger"
                                    :disabled="busy"
                                    class="mr-2"
                                />
                            </div>
                            <div class="flex gap-5" v-if="showActionButtons">
                                <Button
                                    :loading="busy"
                                    label="Save"
                                    @click="save"
                                    :disabled="!isDirty || busy"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </BlockUI>

    <Confirmation
        v-model="deleteDialog"
        variant="danger"
        header="Delete Time Entry"
        content="Are you sure you want to delete this time entry?"
        @confirm="deleteTimesheet"
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
