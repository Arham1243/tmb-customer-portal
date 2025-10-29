<script setup>
import dayjs from '@/plugins/dayjs';
import { ref, onBeforeMount, watch } from 'vue';
import { useUserStore } from '@/modules/administration/stores';
import { useTimesheetStore } from '@/modules/core/stores';
import { useSessionStore } from '@/stores';
import { useHelpers } from '@/composables';
import { computed } from 'vue';
import { truncate } from 'lodash-es';
import { useRouter, useRoute } from 'vue-router';
import TimesheetDayForm from './TimesheetDayForm.vue';
import { useUserRole } from '@/composables/useUserRole';

const props = defineProps({
    isTimesheetEdit: {
        type: Boolean,
        default: false
    }
});

const { formatDate, moneyFormat, formatHours } = useHelpers();
const { isAdmin, isApprover } = useUserRole();
const router = useRouter();
const route = useRoute();
const timesheetStore = useTimesheetStore();
const sessionStore = useSessionStore();
const userStore = useUserStore();
const loadingUsers = ref(false);
const selectedUserId = ref(route.params.user_id ? route.params.user_id : null);
const users = ref([]);
const timesheetsLoading = ref(false);
const loading = ref(false);
const timesheets = ref([]);
const allowSelect = ref(false);
const isTimesheetEdit = ref(props.isTimesheetEdit);
const busy = ref(false);
const formDirty = ref(false);
const selectedTimesheet = ref(null);
const selectedTimesheets = ref([]);
const showUnsavedDialog = ref(false);
const mode = ref('form');
const selectedDate = ref('');
const isAddingNewTimesheet = ref(false);
const lastSelectedTimesheetDate = ref(null);
const timesheetInitialMode = 'daily';
const timesheetMode = ref(timesheetInitialMode);
const timesheetModeOptions = [
    { label: 'Week', value: 'weekly' },
    { label: 'Day', value: 'daily' }
];
const today = new Date();

const disableFutureDates = (date) => {
    return date > today;
};

onBeforeMount(async () => {
    if (route.params.date) {
        selectedDate.value = route.params.date;
    }
    await getTimesheets();
    await getUsers();
});

watch(
    () => timesheetMode.value,
    () => {
        navigateTimesheet();
    }
);

watch(allowSelect, (newVal) => {
    if (newVal === false) {
        selectedTimesheets.value = [];
    }
});

const totalUnsubmittedTimesheetsAmount = computed(() => {
    return timesheets.value.reduce((sum, t) => sum + (t.charge_amount || 0), 0);
});

const totalUnsubmittedTimesheetsHours = computed(() => {
    return Number(
        timesheets.value
            .reduce((sum, t) => sum + (t.input_hours || 0), 0)
            .toFixed(2)
    );
});

const hasDraftTimesheets = computed(() => {
    return timesheets.value.some((t) => t.status === 'draft');
});

const isViewingOwnTimesheets = computed(() => {
    return selectedUserId.value == sessionStore.user.id;
});

const canAddTimesheet = computed(() => {
    // Cannot add timesheets in edit mode
    if (isTimesheetEdit.value) return false;

    // Admin can add timesheets for anyone
    if (isAdmin.value) return true;

    // Approvers can only add timesheets for themselves
    if (isApprover.value) return isViewingOwnTimesheets.value;

    // Regular users can add their own timesheets
    return true;
});

const onRowClick = (event) => {
    if (event.data?.isSummary) return;
    selectedTimesheet.value = event.data;
    lastSelectedTimesheetDate.value = event.data?.date;
};

const navigateTimesheet = () => {
    if (!selectedUserId.value) return;

    if (isTimesheetEdit.value) {
        if (timesheetMode.value === 'daily') {
            router.push({
                name: 'TimesheetEditDay',
                params: {
                    user_id: selectedUserId.value,
                    date: route.params.date || dayjs().format('YYYY-MM-DD')
                }
            });
        } else {
            router.push({
                name: 'TimesheetWeekly',
                params: {
                    user_id: selectedUserId.value
                },
                query: {
                    date: route.params.date
                }
            });
        }
    } else {
        if (timesheetMode.value === 'daily') {
            router.push({
                name: 'TimesheetAddDay',
                params: { user_id: selectedUserId.value }
            });
        } else {
            router.push({
                name: 'TimesheetWeekly',
                params: { user_id: selectedUserId.value }
            });
        }
    }
};

function confirmDiscard() {
    showUnsavedDialog.value = false;
    formDirty.value = false;
    closeForm();
}

const pushRoute = (name, params = {}, query = {}) => {
    router.push({ name, params, query });
};
const openSubmitView = () => {
    mode.value = 'submit';
    getTimesheets();
};
const closeSubmitView = () => {
    mode.value = 'form';
    selectedTimesheet.value = null;
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
    } finally {
        loadingUsers.value = false;
    }
};

const getTimesheets = async () => {
    try {
        timesheetsLoading.value = true;
        const params = { limit: 300 };

        const payload = {
            includes: [
                { relation: 'projectTask' },
                { relation: 'customer' },
                { relation: 'project' }
            ],
            filters: [
                { field: 'user_id', operator: '=', value: selectedUserId.value }
            ],
            customSorts: [
                {
                    field: 'status',
                    order: ['draft', 'submitted', 'approved', 'billed']
                }
            ]
        };

        if (mode.value === 'submit') {
            payload.filters.push({
                field: 'status',
                operator: '=',
                value: 'draft'
            });
        }

        if (selectedDate.value) {
            payload.filters.push({
                field: 'date',
                operator: '=',
                value: selectedDate.value
            });
        }

        const res = await timesheetStore.search(payload, params);
        timesheets.value = res.data;
    } finally {
        timesheetsLoading.value = false;
    }
};

// Watch for user selection changes
watch(
    () => selectedDate.value,
    (newDate) => {
        // Call getTimesheets when date is selected OR when date is cleared
        getTimesheets();
    }
);

const onUserChange = (data) => {
    // Reset form state when user changes
    selectedTimesheet.value = null;
    isAddingNewTimesheet.value = false;
    formDirty.value = false;

    // Update URL parameters
    router.push({
        ...route,
        params: {
            ...route.params,
            user_id: data.value
        }
    });
    // Refetch timesheets for the selected user
    getTimesheets();
};

const submitTimesheets = async () => {
    try {
        busy.value = true;
        const ids =
            selectedTimesheets.value.length > 0
                ? selectedTimesheets.value.map((t) => t.id)
                : timesheets.value.map((t) => t.id);

        const payload = {
            timesheet_ids: ids,
            user_id: selectedUserId.value
        };

        await timesheetStore.submitTimesheets(payload);

        // Redirect to timesheets page with day mode
        router.push({
            name: 'Timesheets',
            query: { mode: 'day' }
        });
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
};

const openNewTimesheetForm = () => {
    // Preserve the date from selected timesheet before clearing
    if (selectedTimesheet.value?.date) {
        lastSelectedTimesheetDate.value = selectedTimesheet.value.date;
    }
    selectedTimesheet.value = null;
    isAddingNewTimesheet.value = true;
};

const closeForm = () => {
    selectedTimesheet.value = null;
    isAddingNewTimesheet.value = false;
    formDirty.value = false;
};

const switchToAddNew = () => {
    // Preserve the date from selected timesheet before clearing
    if (selectedTimesheet.value?.date) {
        lastSelectedTimesheetDate.value = selectedTimesheet.value.date;
    }
    selectedTimesheet.value = null;
    isAddingNewTimesheet.value = true;
    formDirty.value = false;
};

const rowClass = (data) => {
    if (data.isSummary) return '!bg-gray-100 font-bold !cursor-default';
    return selectedTimesheet.value?.id === data.id
        ? 'bg-custom-gray highlight-row cursor-pointer'
        : 'cursor-pointer';
};

const tableWithTotals = computed(() => {
    if (!timesheets.value?.length) return [];
    const totalRow = {
        id: 'summary',
        isSummary: true,
        customer: { name: 'Time Entries' },
        input_hours: totalUnsubmittedTimesheetsHours.value,
        charge_amount: totalUnsubmittedTimesheetsAmount.value
    };
    return [totalRow, ...timesheets.value];
});

const isSelectedTimesheetDraft = computed(() => {
    return selectedTimesheet.value?.status === 'draft';
});
</script>

<template>
    <Loader v-if="loading" />
    <template v-else>
        <div
            class="grid grid-cols-1 md:grid-cols-3 items-center w-full gap-4 mb-7"
        >
            <div class="flex items-center gap-5 justify-start">
                <Button
                    :disabled="busy"
                    variant="outlined"
                    icon="pi pi-chevron-left"
                    size="large"
                    @click="pushRoute('Timesheets', {}, { mode: 'daily' })"
                    iconClass="!text-sm"
                />
                <h1 class="text-2xl sm:text-3xl font-bold capitalize">
                    Timesheets
                </h1>
            </div>

            <div class="flex justify-center gap-4">
                <SelectButton
                    :disabled="busy"
                    size="large"
                    v-model="timesheetMode"
                    :options="timesheetModeOptions"
                    optionLabel="label"
                    optionValue="value"
                />
            </div>

            <div class="flex justify-center md:justify-end items-center gap-4">
                <Button
                    v-if="
                        selectedTimesheet && mode === 'form' && canAddTimesheet
                    "
                    class="whitespace-nowrap flex-shrink-0"
                    label="Add Time Entry"
                    @click="switchToAddNew"
                />
                <ApiDropdown
                    filter
                    placeholder="Select"
                    @change="onUserChange"
                    :loading="loadingUsers"
                    @search="getUsers"
                    :options="users"
                    optionLabel="name"
                    optionValue="id"
                    id="user_id"
                    class="w-full sm:w-64 md:w-80"
                    v-model="selectedUserId"
                    :disabled="
                        loadingUsers || (!isAdmin && !isApprover) || busy
                    "
                />
            </div>
        </div>

        <div class="flex flex-col h-screen gap-7">
            <!-- Main content area -->
            <div class="flex flex-1 md:flex-row flex-col gap-7">
                <Card
                    class="flex-1 flex flex-col overflow-auto w-full md:w-1/2"
                >
                    <template #content>
                        <div class="h-[30rem]">
                            <div v-if="mode !== 'submit'">
                                <label
                                    class="block mb-2 text-sm font-medium text-gray-700"
                                    >Filter by Date</label
                                >
                                <InputField
                                    placeholder="Select Date"
                                    v-model="selectedDate"
                                    variant="date"
                                    class="mb-4"
                                    :disabled-date="disableFutureDates"
                                    :max="today"
                                />
                            </div>

                            <BaseTable
                                :rowClass="rowClass"
                                class="unhighlight-row-table remove-datatable-header-padding"
                                dataKey="id"
                                v-model:selection="selectedTimesheets"
                                selectionMode="multiple"
                                :value="tableWithTotals"
                                :loading="timesheetsLoading"
                                :paginator="false"
                                @row-click="onRowClick"
                            >
                                <template #empty>
                                    No time entries found.
                                </template>

                                <Column
                                    v-if="allowSelect"
                                    selectionMode="multiple"
                                    headerStyle="width: 2rem;"
                                />

                                <Column
                                    field="customer.name"
                                    class="!py-6 !px-4"
                                    :headerStyle="{ padding: '0 !important' }"
                                >
                                    <template #body="{ data }">
                                        <div
                                            v-if="data.isSummary"
                                            class="font-bold text-gray-700"
                                        >
                                            {{ data.customer?.name }}
                                        </div>
                                        <div
                                            v-else
                                            class="flex flex-col gap-2 leading-tight"
                                        >
                                            <div>
                                                <StatusTag
                                                    :status="data.status"
                                                />
                                            </div>
                                            <div
                                                class="flex flex-wrap items-center gap-2 font-bold"
                                            >
                                                <span
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
                                            </div>
                                            <div
                                                class="flex flex-wrap items-center gap-2 text-sm"
                                            >
                                                <span
                                                    >{{
                                                        formatDate(data.date)
                                                    }}:</span
                                                >
                                                <span
                                                    class="line-clamp-1"
                                                    v-tooltip.top="
                                                        data.projectTask?.name
                                                    "
                                                    >{{
                                                        data.projectTask?.name
                                                    }}</span
                                                >
                                            </div>
                                            <div
                                                v-if="isApprover || isAdmin"
                                                class="font-semibold"
                                            >
                                                {{
                                                    data.is_billable
                                                        ? '(billable)'
                                                        : '(non-billable)'
                                                }}
                                            </div>
                                            <div>
                                                <span
                                                    v-tooltip.top="
                                                        data.description
                                                    "
                                                    class="text-sm"
                                                    :title="data.description"
                                                >
                                                    {{
                                                        truncate(
                                                            data.description,
                                                            { length: 80 }
                                                        )
                                                    }}
                                                </span>
                                            </div>
                                        </div>
                                    </template>
                                </Column>

                                <Column
                                    class="!text-right !px-4"
                                    :headerStyle="{ padding: '0 !important' }"
                                >
                                    <template #body="{ data }">
                                        <span class="font-bold">
                                            {{ formatHours(data.input_hours) }}
                                        </span>
                                    </template>
                                </Column>

                                <Column
                                    v-if="isAdmin || isApprover"
                                    class="!text-right !px-4"
                                    :headerStyle="{ padding: '0 !important' }"
                                >
                                    <template #body="{ data }">
                                        <span class="font-bold">
                                            {{
                                                moneyFormat(data.charge_amount)
                                            }}
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
                                !selectedTimesheet &&
                                !isAddingNewTimesheet &&
                                mode !== 'submit'
                            "
                            class="h-full"
                        >
                            <div
                                v-if="canAddTimesheet"
                                class="text-center flex flex-col mt-8 gap-4"
                            >
                                <Button
                                    class="self-center"
                                    label="Add Time Entry"
                                    @click="openNewTimesheetForm"
                                />
                                <p>
                                    Clicking the Add Time Entry <br />
                                    button will create new time record <br />
                                    which you'll be able to review/edit <br />
                                    and/or submit for approval.
                                </p>
                            </div>
                        </div>
                        <TimesheetDayForm
                            v-if="
                                (selectedTimesheet || isAddingNewTimesheet) &&
                                mode !== 'submit'
                            "
                            :timesheet="selectedTimesheet"
                            :isEditMode="
                                !!(selectedTimesheet && selectedTimesheet.id)
                            "
                            :isDraftStatus="isSelectedTimesheetDraft"
                            :defaultDate="
                                selectedTimesheet?.date ||
                                lastSelectedTimesheetDate
                            "
                            @reloadTimesheets="getTimesheets()"
                            @close="closeForm"
                            @dirty-change="formDirty = $event"
                            @update:timesheet="selectedTimesheet = $event"
                        />
                        <div v-else-if="mode === 'submit'" class="space-y-4">
                            <div class="grid grid-cols-12 gap-6 pt-10">
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
                                        Allow me to select the time entries I
                                        would like to include
                                    </label>
                                </div>
                                <div class="col-span-12 mt-5">
                                    <div class="flex justify-between">
                                        <Button
                                            label="Cancel"
                                            variant="outlined"
                                            class="w-full sm:w-auto"
                                            @click="closeSubmitView"
                                            :disabled="busy"
                                        />
                                        <Button
                                            :disabled="
                                                busy ||
                                                (allowSelect &&
                                                    selectedTimesheets.length ===
                                                        0)
                                            "
                                            label="Submit Time Entries"
                                            @click="submitTimesheets"
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
                v-if="mode === 'form' && hasDraftTimesheets"
            >
                <template #content>
                    <div
                        class="flex flex-col md:flex-row justify-center items-center gap-4 py-3"
                    >
                        <span class="font-semibold text-center md:text-left">
                            There are
                            {{ formatHours(totalUnsubmittedTimesheetsHours) }}
                            hours of unsubmitted time in this report.
                        </span>
                        <Button
                            :disabled="totalUnsubmittedTimesheetsHours === 0"
                            @click="openSubmitView"
                            label="Submit Time Entries"
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
