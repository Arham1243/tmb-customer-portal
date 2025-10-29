<script setup>
import dayjs from '@/plugins/dayjs';
import { computed, ref, watch } from 'vue';
import { useUserRole } from '@/composables/useUserRole';
import {
    useTimesheetStore,
    useCustomerStore,
    useProjectStore,
    useProjectTaskStore
} from '@/modules/core/stores';
import { useHelpers } from '@/composables/useHelpers';
import { useGlobalStore, useSessionStore } from '@/stores';

const props = defineProps({
    visible: { type: Boolean, default: false },
    selectedItem: { type: Object, default: null },
    selectedUserId: { type: String, required: true },
    selectedUser: { type: Object, default: null },
    weekList: { type: Array, required: true }
});

const emit = defineEmits(['update:visible', 'reload']);

const timesheetStore = useTimesheetStore();
const customerStore = useCustomerStore();
const projectStore = useProjectStore();
const projectTaskStore = useProjectTaskStore();
const globalStore = useGlobalStore();
const sessionStore = useSessionStore();
const { isAdmin, isApprover } = useUserRole();
const { filterActiveWithSelected, moneyFormat } = useHelpers();

const activeTab = ref(0);
const customers = ref([]);
const loadingProjects = ref(false);
const projects = ref([]);
const loadingProjectTasks = ref(false);
const loadingCustomers = ref(false);
const projectTasks = ref([]);
const deleteDialog = ref(false);
const isViewMode = ref(false);
const isEditMode = ref(false);
const busy = ref(false);
const deleting = ref(false);
const isInitialLoad = ref(false);
const loadingData = ref(false);
const myCompanyWeekBeginsFormat = ref(
    sessionStore.myCompany?.weekly_timesheet_date_format
);

const formData = ref({
    status: 'draft',
    billing_status: 'unbilled',
    customer_id: null,
    project_id: null,
    project_task_id: null,
    entries: {}
});

// Computed property to get current day data directly from entries
const currentDayData = computed({
    get: () => {
        const dayIndex =
            typeof activeTab.value === 'string'
                ? parseInt(activeTab.value)
                : activeTab.value;
        const day = props.weekList[dayIndex];
        if (!day || !formData.value.entries[day.date]) {
            return {
                input_hours: 0,
                billable_hours: 0,
                billing_rate: 0,
                charge_rate: 0,
                original_charge_rate: 0,
                charge_amount: 0,
                billing_status: 'unbilled',
                description: '',
                is_billable: true,
                is_reportable: true
            };
        }
        return formData.value.entries[day.date];
    },
    set: (val) => {
        const dayIndex =
            typeof activeTab.value === 'string'
                ? parseInt(activeTab.value)
                : activeTab.value;
        const day = props.weekList[dayIndex];
        if (day) {
            formData.value.entries[day.date] = val;
        }
    }
});

const displayDateFormat = computed(() =>
    myCompanyWeekBeginsFormat.value === 'mm/dd' ? 'MM/DD' : 'DD/MM'
);

const showDialog = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
});

const isDraftStatus = computed(() => {
    const day = currentDay.value;
    if (!day || !formData.value.entries[day.date]) return true; // Default to draft for new entries
    return formData.value.entries[day.date].status === 'draft';
});

const canUpdateTimesheet = computed(() => {
    // Check current day's status - only allow updates if current day is draft
    if (isEditMode.value && !isDraftStatus.value) return false;

    // Admin can always edit draft timesheets
    if (isAdmin.value) return true;

    // Approvers can edit any draft timesheet (like admin)
    if (isApprover.value && isEditMode.value) return true;

    // Approvers can only add timesheets for themselves
    if (isApprover.value && !isEditMode.value) {
        return props.selectedUserId == sessionStore.user.id;
    }

    // Regular users can add/edit their own draft timesheets
    return true;
});

// Field disable logic: Only disable fields if current day's status is not draft
const isFieldDisabled = computed(() => {
    if (isViewMode.value) return true;

    // Check current day's status
    const day = currentDay.value;
    if (!day || !formData.value.entries[day.date]) return false; // Allow editing new entries

    const currentStatus = formData.value.entries[day.date].status;

    // Only disable if current day is not draft
    if (isEditMode.value && currentStatus && currentStatus !== 'draft')
        return true;

    return false;
});

const isReportableEditable = computed(() => !currentDayData.value.is_billable);

const currentDay = computed(() => {
    const dayIndex =
        typeof activeTab.value === 'string'
            ? parseInt(activeTab.value)
            : activeTab.value;
    return props.weekList[dayIndex];
});

const dialogHeader = computed(() => {
    // Show loading state in header
    if (loadingData.value) {
        return 'Loading Timesheet...';
    }

    if (!isEditMode.value) {
        return 'New Timesheet';
    }

    // Get customer, project, and task names
    const customer = customers.value.find(
        (c) => c.id === formData.value.customer_id
    );
    const project = projects.value.find(
        (p) => p.id === formData.value.project_id
    );
    const task = projectTasks.value.find(
        (t) => t.id === formData.value.project_task_id
    );

    // Check if current day is submitted (not draft)
    const isCurrentDaySubmitted = !isDraftStatus.value;

    // Build header with customer/project/task info
    let header = isCurrentDaySubmitted ? 'Edit Timesheet:' : 'Edit Timesheet:';
    if (customer?.name) header += ` ${customer.name}`;
    if (project?.name) header += ` : ${project.name}`;
    if (task?.name) header += ` : ${task.name}`;

    return header;
});

// Watchers for form calculations
watch(
    () => currentDayData.value.input_hours,
    (val) => {
        const day = currentDay.value;
        if (day && formData.value.entries[day.date]) {
            // Skip copying during initial load in edit mode to preserve saved billable_hours
            if (isInitialLoad.value && isEditMode.value) {
                return;
            }
            // Always copy input_hours to billable_hours
            // Non-reportable logic will override this to 0 if needed
            formData.value.entries[day.date].billable_hours = val;
        }
    }
);

watch(
    () => currentDayData.value.billing_rate,
    (val) => {
        const day = currentDay.value;
        if (
            day &&
            formData.value.entries[day.date] &&
            formData.value.entries[day.date].is_billable
        ) {
            // Only copy billing_rate to charge_rate if:
            // 1. Not in edit mode (new entry), OR
            // 2. Entry doesn't have a saved timesheet_id (not yet saved)
            if (
                !isEditMode.value ||
                !formData.value.entries[day.date].timesheet_id
            ) {
                formData.value.entries[day.date].charge_rate = val;
                formData.value.entries[day.date].original_charge_rate = val;
            }
        }
    }
);

watch(
    () => currentDayData.value.is_billable,
    (val) => {
        const day = currentDay.value;
        if (day && formData.value.entries[day.date]) {
            if (!val) {
                // Non-billable: Set billable hours same as input hours (unless non-reportable)
                if (formData.value.entries[day.date].is_reportable) {
                    formData.value.entries[day.date].billable_hours =
                        formData.value.entries[day.date].input_hours;
                }
                // Store original charge rate and set to zero
                if (formData.value.entries[day.date].charge_rate > 0) {
                    formData.value.entries[day.date].original_charge_rate =
                        formData.value.entries[day.date].charge_rate;
                }
                formData.value.entries[day.date].charge_rate = 0;
            } else {
                // Billable: Restore charge rate and uncheck non-reportable
                formData.value.entries[day.date].charge_rate =
                    formData.value.entries[day.date].billing_rate;
                formData.value.entries[day.date].original_charge_rate =
                    formData.value.entries[day.date].billing_rate;
                formData.value.entries[day.date].is_reportable = true;
            }
        }
    }
);

watch(
    () => currentDayData.value.is_reportable,
    (val) => {
        const day = currentDay.value;
        if (day && formData.value.entries[day.date]) {
            if (!val) {
                // Non-reportable (NR):
                // 1. Must be non-billable first
                if (formData.value.entries[day.date].is_billable) {
                    formData.value.entries[day.date].is_billable = false;
                }
                // 2. Set billable hours to zero
                formData.value.entries[day.date].billable_hours = 0;
            } else {
                // Reportable again:
                // If it's non-billable, restore billable hours to input hours
                if (!formData.value.entries[day.date].is_billable) {
                    formData.value.entries[day.date].billable_hours =
                        formData.value.entries[day.date].input_hours;
                }
            }
        }
    }
);

watch(
    () => currentDayData.value.billable_hours,
    () => {
        const day = currentDay.value;
        if (day && formData.value.entries[day.date]) {
            formData.value.entries[day.date].charge_amount =
                (formData.value.entries[day.date].billable_hours || 0) *
                (formData.value.entries[day.date].charge_rate || 0);
        }
    }
);

watch(
    () => currentDayData.value.charge_rate,
    () => {
        const day = currentDay.value;
        if (day && formData.value.entries[day.date]) {
            formData.value.entries[day.date].charge_amount =
                (formData.value.entries[day.date].billable_hours || 0) *
                (formData.value.entries[day.date].charge_rate || 0);
        }
    }
);

const initWeekEntries = () => {
    props.weekList.forEach((day) => {
        if (!formData.value.entries[day.date]) {
            formData.value.entries[day.date] = {
                date: day.date,
                status: 'draft',
                description: '',
                input_hours: 0,
                billable_hours: 0,
                billing_rate: 0,
                charge_rate: 0,
                original_charge_rate: 0,
                charge_amount: 0,
                billing_status: 'unbilled',
                is_billable: true,
                is_reportable: true
            };
        }
    });
};

const resetForm = () => {
    formData.value = {
        customer_id: null,
        project_id: null,
        project_task_id: null,
        entries: {}
    };

    currentDayData.value = {
        status: 'draft',
        input_hours: 0,
        billable_hours: 0,
        billing_rate: 0,
        charge_rate: 0,
        original_charge_rate: 0,
        charge_amount: 0,
        billing_status: 'unbilled',
        description: '',
        is_billable: true,
        is_reportable: true
    };

    initWeekEntries();
    globalStore.clearErrors();
};

const populateFormData = async () => {
    try {
        loadingData.value = true;
        const item = props.selectedItem;

        // Set initial load flag to prevent watchers from overriding saved values
        isInitialLoad.value = true;

        formData.value = {
            customer_id: item.customer_id || null,
            project_id: item.project_id || null,
            project_task_id: item.project_task_id || null,
            entries: item.entries || {}
        };

        // Ensure all week days have entries
        props.weekList.forEach((day) => {
            if (!formData.value.entries[day.date]) {
                formData.value.entries[day.date] = {
                    date: day.date,
                    status: 'draft',
                    description: '',
                    input_hours: 0,
                    billable_hours: 0,
                    billing_rate: 0,
                    charge_rate: 0,
                    original_charge_rate: 0,
                    charge_amount: 0,
                    billing_status: 'unbilled',
                    is_billable: true,
                    is_reportable: true
                };
            }
        });

        // Load cascading data: Customer -> Project -> Project Tasks
        await getCustomers();
        if (formData.value.customer_id) {
            await getProjects();
            if (formData.value.project_id) {
                await getProjectTasks();
            }
        }

        // Reset initial load flag after a short delay to allow watchers to settle
        setTimeout(() => {
            isInitialLoad.value = false;
        }, 100);

        // Recalculate billing rates for days with billing_rate = 0 (after data is loaded)
        await recalculateBillingRates();
    } finally {
        loadingData.value = false;
    }
};

const recalculateBillingRates = () => {
    if (!formData.value.project_task_id || !projectTasks.value.length) return;

    const billingRate = getBillingRate();
    const travelChargePercentage = getTravelChargePercentage();
    const selectedProjectTask = projectTasks.value.find(
        (t) => t.id == formData.value.project_task_id
    );

    if (selectedProjectTask) {
        const isProjectTaskTravel =
            selectedProjectTask.revenueCategory.is_travel_charge;
        const rate = isProjectTaskTravel
            ? (billingRate * travelChargePercentage) / 100
            : billingRate;

        // Apply billing rate to all days that don't have backend data
        // (billing_rate = 0 OR input_hours = 0 means no backend data)
        props.weekList.forEach((day) => {
            const entry = formData.value.entries[day.date];
            if (!entry) return;

            const hasNoBackendData =
                entry.billing_rate === 0 || entry.input_hours === 0;

            if (hasNoBackendData) {
                // Set default calculated billing rate
                entry.billing_rate = rate;

                // Set charge rate from billing rate (always set for unsaved data)
                entry.charge_rate = rate;
                entry.original_charge_rate = rate;

                // Recalculate charge amount based on input_hours and charge_rate
                const inputHours = entry.input_hours || 0;
                entry.charge_amount = inputHours * rate;

                // Also ensure billable_hours is set to input_hours if not already set
                if (entry.billable_hours === 0 && inputHours > 0) {
                    entry.billable_hours = inputHours;
                }
            }
        });
    }
};

const openDialog = async (mode, tabIndex = 0) => {
    isEditMode.value = mode === 'edit';
    isViewMode.value = mode === 'view';

    // Set loading state immediately for edit/view modes
    if (mode === 'edit' || mode === 'view') {
        loadingData.value = true;
    }

    if (mode === 'add') {
        resetForm();
        // For add mode, load customers immediately
        await getCustomers();
    }

    initWeekEntries();
    // Set the active tab to the clicked day (or default to 0)
    activeTab.value = tabIndex;
};

const closeDialog = () => {
    showDialog.value = false;
    resetForm();
};

const onShow = () => {
    if (!showDialog.value) {
        resetForm();
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
                    value: props.selectedUserId
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

const getTravelChargePercentage = () => {
    const selectedCustomer = customers.value.find(
        (t) => t.id == formData.value.customer_id
    );
    const userFoundInCustomerTeam = selectedCustomer.users?.find(
        (u) => u.id == props.selectedUserId
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
        (u) => u.id == props.selectedUserId
    );
    const userFoundInCustomerTeam = selectedCustomer.users?.find(
        (u) => u.id == props.selectedUserId
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
    return props.selectedUser.default_user_billing_rate_per_hour;
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
        (u) => u.id == props.selectedUserId
    );

    let rate;
    if (isProjectTaskTravel) {
        if (
            userFoundInProjectTask &&
            +userFoundInProjectTask.project_task_rate > 0
        ) {
            rate = userFoundInProjectTask.project_task_rate;
        } else {
            rate = (billingRate * travelChargePercentage) / 100;
        }
    } else {
        rate = billingRate;
    }

    // Ensure entries are initialized before updating
    if (Object.keys(formData.value.entries).length === 0) {
        initWeekEntries();
    }

    // Apply billing rate to ALL days in the week
    props.weekList.forEach((day) => {
        if (formData.value.entries[day.date]) {
            formData.value.entries[day.date].billing_rate = rate;
            // Copy billing rate to charge rate (user can override later)
            // Only update charge rate if:
            // 1. Entry is billable, AND
            // 2. Not in edit mode OR entry doesn't have a saved timesheet_id
            if (formData.value.entries[day.date].is_billable) {
                if (
                    !isEditMode.value ||
                    !formData.value.entries[day.date].timesheet_id
                ) {
                    formData.value.entries[day.date].charge_rate = rate;
                    formData.value.entries[day.date].original_charge_rate =
                        rate;
                }
            }
        }
    });
};

const showDeleteDialog = () => {
    deleteDialog.value = true;
};

const deleteTimesheet = async () => {
    try {
        deleting.value = true;
        const day = currentDay.value;

        if (day && formData.value.entries[day.date]?.timesheet_id) {
            // Delete the specific day's timesheet
            await timesheetStore.deleteItem(
                formData.value.entries[day.date].timesheet_id
            );

            closeDialog();
            emit('reload');
        }
    } finally {
        deleting.value = false;
    }
};

const save = async () => {
    try {
        busy.value = true;
        globalStore.clearErrors(); // Clear any previous errors

        // Collect all week entries with input_hours > 0
        const weekPayload = [];
        
        props.weekList.forEach((day) => {
            const dayData = formData.value.entries[day.date];
            
            // Only include days where input_hours > 0
            if (dayData && dayData.input_hours > 0) {
                const payload = {
                    date: day.date,
                    user_id: props.selectedUserId,
                    customer_id: formData.value.customer_id,
                    project_id: formData.value.project_id,
                    project_task_id: formData.value.project_task_id,
                    status: dayData.status || 'draft',
                    billing_status: dayData.billing_status || 'unbilled',
                    description: dayData.description || '',
                    input_hours: dayData.input_hours,
                    billable_hours: dayData.billable_hours,
                    billing_rate: dayData.billing_rate,
                    charge_rate: dayData.charge_rate,
                    original_charge_rate: dayData.original_charge_rate,
                    charge_amount: dayData.charge_amount,
                    is_billable: dayData.is_billable,
                    is_reportable: dayData.is_reportable,
                    enable_validation_by_day: day.date
                };

                // Include timesheet_id if it exists (for updates)
                if (dayData.timesheet_id) {
                    payload.timesheet_id = dayData.timesheet_id;
                }

                weekPayload.push(payload);
            }
        });

        // Only proceed if there's at least one entry with input_hours > 0
        if (weekPayload.length === 0) {
            globalStore.showError(
                'No entries to save',
                'Please enter input hours for at least one day'
            );
            return;
        }
        
        // Save the entire week data
        await timesheetStore.saveWeeklyTimesheet(weekPayload);
        
        // Emit reload first to refresh data, then close dialog
        emit('reload');
        
        // Small delay to ensure data is refreshed before closing
        await new Promise(resolve => setTimeout(resolve, 100));
        
        closeDialog();
    } catch (error) {
        console.error('Save error:', error);
        
        // Switch to the tab with validation errors
        if (globalStore.errors && Object.keys(globalStore.errors).length > 0) {
            // Get the first error key (e.g., "2025-10-19.description")
            const firstErrorKey = Object.keys(globalStore.errors)[0];
            
            // Extract the date from the error key
            const errorDate = firstErrorKey.split('.')[0];
            
            // Find the tab index for this date
            const tabIndex = props.weekList.findIndex(day => day.date === errorDate);
            
            // Switch to that tab if found
            if (tabIndex !== -1) {
                activeTab.value = tabIndex;
            }
        }
        
        // Error is already handled by actionWrapper in the store
        // which calls setError and displays toast
    } finally {
        busy.value = false;
    }
};

defineExpose({
    openDialog,
    populateFormData
});
</script>

<template>
    <BaseDialog
        v-if="
            $ability.can('timesheets.edit') || $ability.can('timesheets.create')
        "
        v-model:visible="showDialog"
        class="w-full sm:w-2/3 md:w-1/2 lg:w-6/12"
        @update:visible="onShow"
        :busy="busy"
        :isEditMode="isEditMode"
        :header="dialogHeader"
        :confirmLabel="isEditMode ? 'Update' : 'Save'"
        :hideFooter="!canUpdateTimesheet || loadingData"
        :formData="formData"
        :initialData="isEditMode ? props.selectedItem : null"
        :enableDirtyCheck="false"
        @cancel="closeDialog"
        @confirm="save"
    >
        <div class="col-span-12">
            <div
                v-if="loadingData"
                class="col-span-12 flex flex-col items-center justify-center py-12 gap-4"
            >
                <i class="pi pi-spin pi-spinner !text-4xl text-gray-400"></i>
                <p class="text-gray-600">Loading timesheet data...</p>
            </div>
            <BlockUI :blocked="deleting" v-else>
                <div class="grid grid-cols-12 gap-4 space-y-1">
                    <div class="col-span-12" v-if="!isEditMode">
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
                                busy || loadingCustomers || isFieldDisabled
                            "
                        />
                    </div>
                    <div
                        v-if="formData.customer_id && !isEditMode"
                        class="col-span-12"
                    >
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
                                isFieldDisabled
                            "
                        />
                    </div>
                    <div
                        v-if="formData.project_id && !isEditMode"
                        class="col-span-12"
                    >
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
                                isFieldDisabled
                            "
                        />
                    </div>
                    <div
                        v-if="formData.project_task_id"
                        class="col-span-12 !mt-7"
                    >
                        <Tabs class="week-tabs" v-model:value="activeTab" lazy>
                            <TabList>
                                <Tab
                                    v-for="(day, i) in weekList"
                                    :key="day.date"
                                    :value="i"
                                    class="!px-10 !pt-0"
                                >
                                    <div class="flex flex-col items-center">
                                        <span
                                            class="text-lg font-bold leading-tight"
                                        >
                                            {{ dayjs(day.date).format('ddd') }}
                                        </span>
                                        <span class="text-sm text-gray-500">{{
                                            dayjs(day.date).format(
                                                displayDateFormat
                                            )
                                        }}</span>
                                    </div>
                                </Tab>
                            </TabList>
                            <TabPanels>
                                <div class="pt-2">
                                    <TabPanel
                                        v-for="(day, i) in weekList"
                                        :key="day.date"
                                        :value="i"
                                    >
                                        <div
                                            class="grid grid-cols-12 gap-4 space-y-1"
                                        >
                                            <div
                                                class="col-span-12 sm:col-span-6"
                                            >
                                                <label
                                                    class="block mb-3 required"
                                                    >Input Hours</label
                                                >
                                                <InputField
                                                    :disabled="
                                                        busy || isFieldDisabled
                                                    "
                                                    class="w-full"
                                                    inputClass="w-full"
                                                    :id="`${currentDay.date}.input_hours`"
                                                    v-model="
                                                        currentDayData.input_hours
                                                    "
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
                                                v-if="isAdmin || isApprover"
                                            >
                                                <label
                                                    class="block mb-3 required"
                                                    >Billable Hours</label
                                                >
                                                <InputField
                                                    :disabled="
                                                        isFieldDisabled || busy
                                                    "
                                                    class="w-full"
                                                    inputClass="w-full"
                                                    :id="`${currentDay.date}.billable_hours`"
                                                    v-model="
                                                        currentDayData.billable_hours
                                                    "
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
                                                v-if="isAdmin || isApprover"
                                            >
                                                <label
                                                    class="block mb-3 required"
                                                    >Billing Rate
                                                </label>
                                                <InputField
                                                    :disabled="true"
                                                    class="w-full"
                                                    inputClass="w-full"
                                                    :id="`${currentDay.date}.billing_rate`"
                                                    v-model="
                                                        currentDayData.billing_rate
                                                    "
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
                                                v-if="isAdmin || isApprover"
                                            >
                                                <label
                                                    class="block mb-3 required"
                                                    >Charge Rate</label
                                                >
                                                <div class="relative">
                                                    <InputField
                                                        :disabled="
                                                            busy ||
                                                            !currentDayData.is_billable ||
                                                            isFieldDisabled
                                                        "
                                                        class="w-full"
                                                        inputClass="w-full"
                                                        :id="`${currentDay.date}.charge_rate`"
                                                        v-model="
                                                            currentDayData.charge_rate
                                                        "
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
                                                            !currentDayData.is_billable &&
                                                            currentDayData.original_charge_rate >
                                                                0
                                                        "
                                                        class="absolute inset-y-0 left-16 flex items-center pointer-events-none"
                                                    >
                                                        <span
                                                            class="text-base text-gray-400 line-through px-1 ml-2"
                                                        >
                                                            {{
                                                                moneyFormat(
                                                                    currentDayData.original_charge_rate
                                                                )
                                                            }}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div
                                                class="col-span-12 sm:col-span-4"
                                                v-if="isAdmin || isApprover"
                                            >
                                                <label
                                                    class="block mb-3 required"
                                                    >Charge Amount</label
                                                >
                                                <InputField
                                                    :disabled="true"
                                                    class="w-full"
                                                    inputClass="w-full"
                                                    :id="`${currentDay.date}.charge_amount`"
                                                    v-model="
                                                        currentDayData.charge_amount
                                                    "
                                                    variant="number"
                                                    :maxFractionDigits="2"
                                                    :minFractionDigits="2"
                                                    @keyup.enter="save"
                                                    prefix="$"
                                                    :min="0"
                                                />
                                            </div>
                                            <div class="col-span-12">
                                                <label
                                                    class="block required mb-2"
                                                    >Description</label
                                                >
                                                <InputField
                                                    :id="`${currentDay.date}.description`"
                                                    :disabled="
                                                        busy || isFieldDisabled
                                                    "
                                                    class="w-full h-[8rem]"
                                                    v-model="
                                                        currentDayData.description
                                                    "
                                                    variant="textarea"
                                                    maxlength="1000"
                                                />
                                                <span
                                                    :class="[
                                                        'block text-sm',
                                                        currentDayData
                                                            .description
                                                            ?.length >= 1000
                                                            ? 'text-red-500'
                                                            : 'text-gray-600'
                                                    ]"
                                                >
                                                    {{
                                                        1000 -
                                                        (currentDayData
                                                            .description
                                                            ?.length || 0)
                                                    }}
                                                    characters left
                                                </span>
                                            </div>
                                            <div class="col-span-12 mt-5">
                                                <div
                                                    class="grid grid-cols-12 gap-4 space-y-1"
                                                >
                                                    <div class="col-span-6">
                                                        <div
                                                            class="grid grid-cols-12 gap-4 space-y-1"
                                                        >
                                                            <div
                                                                class="col-span-12 flex items-center gap-3"
                                                            >
                                                                <InputField
                                                                    :id="`${currentDay.date}.is_billable`"
                                                                    binary
                                                                    :inputId="`${currentDay.date}.is_billable.input`"
                                                                    variant="checkbox"
                                                                    v-model="
                                                                        currentDayData.is_billable
                                                                    "
                                                                    :trueValue="
                                                                        false
                                                                    "
                                                                    :falseValue="
                                                                        true
                                                                    "
                                                                    :disabled="
                                                                        busy ||
                                                                        isFieldDisabled
                                                                    "
                                                                />
                                                                <label
                                                                    class="cursor-pointer"
                                                                    :for="`${currentDay.date}.is_billable.input`"
                                                                >
                                                                    This time is
                                                                    non-billable
                                                                </label>
                                                            </div>
                                                            <div
                                                                class="col-span-12 flex items-center gap-3"
                                                            >
                                                                <InputField
                                                                    :id="`${currentDay.date}.is_reportable`"
                                                                    binary
                                                                    :inputId="`${currentDay.date}.is_reportable.input`"
                                                                    variant="checkbox"
                                                                    v-model="
                                                                        currentDayData.is_reportable
                                                                    "
                                                                    :trueValue="
                                                                        false
                                                                    "
                                                                    :falseValue="
                                                                        true
                                                                    "
                                                                    :disabled="
                                                                        busy ||
                                                                        isFieldDisabled ||
                                                                        !isReportableEditable
                                                                    "
                                                                />
                                                                <label
                                                                    class="cursor-pointer"
                                                                    :for="`${currentDay.date}.is_reportable.input`"
                                                                >
                                                                    This time is
                                                                    non-reportable
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-span-6">
                                                        <div
                                                            class="grid grid-cols-12 gap-4 space-y-1"
                                                        >
                                                            <div
                                                                class="col-span-12 sm:col-span-6"
                                                                v-if="
                                                                    isAdmin ||
                                                                    isApprover
                                                                "
                                                            >
                                                                <label
                                                                    class="block mb-3"
                                                                    >Billing
                                                                    Status</label
                                                                >
                                                                <StatusTag
                                                                    :status="
                                                                        currentDayData.billing_status
                                                                    "
                                                                />
                                                            </div>
                                                            <div
                                                                class="col-span-12 sm:col-span-6"
                                                            >
                                                                <label
                                                                    class="block mb-3"
                                                                    >Status</label
                                                                >
                                                                <StatusTag
                                                                    :status="
                                                                        currentDayData.status ||
                                                                        'draft'
                                                                    "
                                                                    class="text-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div
                                                v-if="
                                                    isEditMode &&
                                                    isDraftStatus &&
                                                    currentDayData.timesheet_id &&
                                                    currentDayData.input_hours >
                                                        0
                                                "
                                                class="col-span-12"
                                            >
                                                <Button
                                                    v-if="
                                                        $ability.can(
                                                            'timesheets.delete'
                                                        )
                                                    "
                                                    @click="showDeleteDialog"
                                                    :loading="deleting"
                                                    label="Delete"
                                                    severity="danger"
                                                    :disabled="deleting"
                                                    class="mr-2"
                                                />
                                            </div>
                                        </div>
                                    </TabPanel>
                                </div>
                            </TabPanels>
                        </Tabs>
                    </div>
                </div>
            </BlockUI>
        </div>
    </BaseDialog>

    <Confirmation
        v-model="deleteDialog"
        variant="danger"
        header="Delete Time Entry"
        :content="`Are you sure you want to delete the timesheet for ${currentDay ? dayjs(currentDay.date).format('dddd, MMMM D, YYYY') : 'this date'}?`"
        @confirm="deleteTimesheet"
    />
</template>
<style>
.week-tabs .p-tablist-tab-list {
    width: fit-content;
    margin: auto;
    justify-content: center;
}
</style>
