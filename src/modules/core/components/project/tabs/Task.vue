<script setup>
import { computed, onBeforeMount, ref, watch, nextTick } from 'vue';
import { useProjectTaskStore, useProjectStore } from '@/modules/core/stores';
import {
    useRevenueCategoryStore,
    useUserStore
} from '@/modules/administration/stores';
import { useGlobalStore } from '@/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { truncate } from 'lodash-es';
import { useHelpers } from '@/composables';

const projectTaskStore = useProjectTaskStore();
const revenueCategoryStore = useRevenueCategoryStore();
const projectStore = useProjectStore();
const globalStore = useGlobalStore();
const userStore = useUserStore();
const { formatDate, moneyFormat, filterActiveWithSelected } = useHelpers();

const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const searchText = ref('');
const menu = ref();
const selectedItem = ref(null);
const loading = ref(false);
const items = ref([]);
const isEditMode = ref(false);
const busy = ref(false);
const totalRecords = ref();
const showDialog = ref(false);
const deleteDialog = ref(false);
const changeStatusDialog = ref(false);
const revenueCategories = ref([]);
const loadingRevenueCategories = ref(false);
const disableRevenueCategory = ref(false);
const loadingUsers = ref(false);
const project = projectStore.currentItem;
const isProjectGlobal = project.is_global;
const selectedUsers = ref([]);
const maxOrderLoading = ref(false);
const selectedUsersIds = ref([]);
const autoCompleteRef = ref(null);
const templates = ref([]);
const searchTemplatesText = ref('');
const loadingTemplates = ref(false);
const selectedTemplate = ref('');
const users = ref([]);
const formData = ref({
    order: null,
    name: '',
    budgeted_hours: 0.0,
    budgeted_rate: 0.0,
    budgeted_amount: 0.0,
    users: [],
    due_date: null,
    revenue_category_id: null,
    create_template: false,
    status: true,
    is_default: true
});

onBeforeMount(async () => {
    await getItems();
});

watch(
    () => formData.value.revenue_category_id,
    (newVal) => {
        if (revenueCategories.value.length > 0) {
            setIsSelectedRevenueCategoryTravel();
        }
    }
);

watch(
    selectedUsers,
    (newVal) => {
        formData.value.users = newVal.map((u) => ({
            id: u.id,
            name: u.name,
            default_user_billing_rate_per_hour:
                u.default_user_billing_rate_per_hour || 0,
            customer_rate: !isProjectGlobal ? u.customer_rate : null,
            project_task_rate: u.project_task_rate
        }));
    },
    { deep: true, immediate: true }
);

watch(
    selectedUsersIds,
    (newIds) => {
        selectedUsers.value = newIds.map((id) => {
            const existing = selectedUsers.value.find((u) => u.id === id);
            if (existing) return existing;

            let user = users.value.find((u) => u.id === id) || {
                id,
                name: '',
                default_user_billing_rate_per_hour: 0,
                customer_rate: !isProjectGlobal ? 0 : 0,
                project_task_rate: 0,
                travel_charges: 0,
                original_customer_rate: 0,
                original_project_task_rate: 0
            };

            // always store originals
            user.original_customer_rate = user.customer_rate;
            user.original_project_task_rate = user.project_task_rate;

            // if current category is travel, apply multiplier right away
            if (
                isSelectedRevenueCategoryTravelCharge.value &&
                user.travel_charges
            ) {
                user.customer_rate = !isProjectGlobal
                    ? (user.original_customer_rate * user.travel_charges) / 100
                    : null;
                user.project_task_rate =
                    (user.original_project_task_rate * user.travel_charges) /
                    100;
            }

            return user;
        });
    },
    { deep: true, immediate: true }
);

const budgetedAmount = computed(() => {
    return (
        Number(formData.value.budgeted_hours) *
        Number(formData.value.budgeted_rate)
    );
});

const menuItems = computed(() => {
    if (!selectedItem.value) return [];

    const allMenuItems = [
        {
            label: 'Edit',
            icon: 'pi pi-pencil',
            command: () => editItem()
        },
        {
            label: isItemActive.value ? 'Make Inactive' : 'Make Active',
            icon: isItemActive.value ? 'pi pi-times' : 'pi pi-check',
            command: () => showChangeStatusDialog()
        },
        {
            label: 'Delete',
            icon: 'pi pi-trash',
            command: () => showDeleteDialog()
        }
    ];

    return allMenuItems;
});

const isItemActive = computed(() => {
    return selectedItem.value && selectedItem.value.status;
});

const selectedRevenueCategory = ref({});
const isSelectedRevenueCategoryTravelCharge = ref(false);

const openDialog = async (mode = 'add', item = {}) => {
    isEditMode.value = mode === 'edit';
    showDialog.value = true;
    if (!isEditMode.value) {
        getMaxOrder();
    }
    getRevenueCategories();
    getProjectTasksTemplates();
    getUsers();
    selectedItem.value = item;
};

const setIsSelectedRevenueCategoryTravel = () => {
    selectedRevenueCategory.value = revenueCategories.value.find(
        (rc) => Number(rc.id) === Number(formData.value.revenue_category_id)
    );
    isSelectedRevenueCategoryTravelCharge.value =
        selectedRevenueCategory.value?.is_travel_charge || false;
};

watch(isSelectedRevenueCategoryTravelCharge, (isTravel) => {
    selectedUsers.value = selectedUsers.value.map((u) => {
        let customerRate = u.original_customer_rate;
        let projectTaskRate = u.original_project_task_rate;

        if (isTravel && u.travel_charges) {
            customerRate = (customerRate * u.travel_charges) / 100;
            projectTaskRate = (projectTaskRate * u.travel_charges) / 100;
        }

        return {
            ...u,
            customer_rate: !isProjectGlobal ? customerRate : null,
            project_task_rate: projectTaskRate
        };
    });
});

const closeDialog = () => {
    showDialog.value = false;
    resetForm();
};

const onShow = () => {
    resetForm();
};

// Add this flag near your other refs (around line 50)
const isInitializingEdit = ref(false);

// Replace the existing selectedTemplate watcher with this:
watch(
    () => selectedTemplate.value,
    (newTemplate) => {
        // Skip watcher during edit mode initialization
        if (isInitializingEdit.value) {
            return;
        }

        if (newTemplate?.id === 'add_new') {
            // User clicked "Click to create '...'" option
            const newTpl = { name: newTemplate.rawName };
            templates.value = [
                ...templates.value.filter((t) => t.id !== 'add_new'),
                newTpl
            ];
            selectedTemplate.value = newTpl;

            formData.value.name = newTpl.name;
            formData.value.create_template = true;
            // ENABLE revenue category for manual selection
            disableRevenueCategory.value = false;
            // Clear any pre-selected revenue category
            formData.value.revenue_category_id = null;
        } else if (newTemplate && newTemplate.id) {
            // Existing template selected - populate and disable revenue category
            formData.value.name = newTemplate?.name || '';
            formData.value.revenue_category_id =
                Number(newTemplate?.revenue_category_id) || null;
            formData.value.create_template = false;
            // DISABLE revenue category as it comes from template
            disableRevenueCategory.value = true;
        } else if (newTemplate && !newTemplate.id && newTemplate.name) {
            // New template object without id (from "Click to create")
            formData.value.name = newTemplate?.name || '';
            formData.value.create_template = true;
            // ENABLE revenue category for manual selection
            disableRevenueCategory.value = false;
            formData.value.revenue_category_id = null;
        } else {
            // No template selected - clear and enable (only in create mode)
            if (!isEditMode.value) {
                disableRevenueCategory.value = false;
                formData.value.name = '';
                formData.value.revenue_category_id = null;
                formData.value.create_template = false;
            }
        }
    },
    { immediate: true }
);

const resetForm = () => {
    formData.value.order = null;
    formData.value.name = '';
    formData.value.revenue_category_id = null;
    selectedTemplate.value = '';
    formData.value.status = true;
    formData.value.users = [];
    selectedUsers.value = [];
    selectedUsersIds.value = [];
    formData.value.create_template = false;
    formData.value.budgeted_hours = 0.0;
    formData.value.budgeted_rate = 0.0;
    formData.value.budgeted_amount = 0.0;
    formData.value.due_date = null;
    formData.value.is_default = true;
    formData.value.users = [];
    // In create mode, revenue category should be enabled by default
    disableRevenueCategory.value = false;
    globalStore.clearErrors();
};

// Replace the editItem function with this:
const editItem = async () => {
    resetForm();
    selectedItem.value = selectedItem.value;

    // Set edit mode FIRST
    isEditMode.value = true;

    // CRITICAL: Set flag to prevent watcher from running during initialization
    isInitializingEdit.value = true;

    // Set revenue category and other fields BEFORE setting template
    formData.value.revenue_category_id =
        selectedItem.value.revenue_category_id || null;
    formData.value.order = selectedItem.value.order;
    formData.value.name = selectedItem.value.name;
    formData.value.budgeted_hours = selectedItem.value.budgeted_hours;
    formData.value.budgeted_rate = selectedItem.value.budgeted_rate;
    formData.value.budgeted_amount = selectedItem.value.budgeted_amount;
    formData.value.due_date = selectedItem.value.due_date;
    formData.value.is_default = selectedItem.value.is_default;
    formData.value.users = selectedItem.value.users || [];
    formData.value.status = selectedItem.value.status;

    // In edit mode, disable revenue category if task has an existing template
    disableRevenueCategory.value = !!selectedItem.value.templates?.[0]?.id;

    const usersWithOriginalRates = (selectedItem.value.users || []).map(
        (u) => ({
            ...u,
            original_customer_rate: u.customer_rate,
            original_project_task_rate: u.project_task_rate
        })
    );

    selectedUsers.value = usersWithOriginalRates;
    selectedUsersIds.value = usersWithOriginalRates.map((u) => u.id);

    // Open dialog and load templates
    await openDialog('edit', selectedItem.value);

    // Set template AFTER everything else is loaded
    const tpl = templates.value.find(
        (t) => t.id === selectedItem.value.templates?.[0]?.id
    );

    // This assignment will NOT trigger watcher logic because isInitializingEdit = true
    selectedTemplate.value = tpl || {
        name: selectedItem.value.templates?.[0]?.name,
        revenue_category_id: selectedItem.value.revenue_category_id
    };

    // Re-enable watcher after initialization is complete
    // Use nextTick to ensure all reactive updates are done
    await nextTick();
    isInitializingEdit.value = false;
};

const showDeleteDialog = () => {
    deleteDialog.value = true;
};

const showChangeStatusDialog = () => {
    changeStatusDialog.value = true;
};

const showActions = (event, item) => {
    selectedItem.value = item;
    menu.value.toggle(event);
};

const onRowReorder = async (event) => {
    const { dragIndex, dropIndex } = event;
    const pageOffset = pagination.limit * (pagination.page - 1);
    const movedItem = items.value[dragIndex - pageOffset];
    const movedItemId = movedItem.id;

    try {
        loading.value = true;
        const payload = {
            order: dropIndex + 1
        };
        await projectTaskStore.changeOrder(movedItemId, payload);
        await getItems();
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
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

const getUsers = async (searchText = '') => {
    try {
        loadingUsers.value = true;
        const params = {
            limit: 300
        };
        if (!project.is_global && project.customer_id) {
            params.customer_id = project.customer_id;
        }
        const payload = {
            search: { value: searchText },
            sort: [{ field: 'name', order: 'asc' }],
            filters: [{ field: 'status', operator: '=', value: 'active' }],
            customFilters: [
                {
                    field: 'customer',
                    operator: '=',
                    value: project.is_global ? 'global' : project.customer_id
                }
            ]
        };

        if (!project.is_global && project.customer_id) {
            payload.customIncludes = [
                { relation: 'effectiveCustomerRateForTask' },
                { relation: 'effectiveTravelChargesForTask' }
            ];
        }

        const res = await userStore.list(payload, params);
        users.value = res.data.map((u) => ({
            ...u,
            project_task_rate: isProjectGlobal
                ? (u.project_task_rate ?? u.default_user_billing_rate_per_hour)
                : (u.project_task_rate ?? u.customer_rate),
            original_customer_rate: u.customer_rate,
            original_project_task_rate: u.project_task_rate
        }));
    } finally {
        loadingUsers.value = false;
    }
};

const getProjectTasksTemplates = async (event = {}) => {
    const searchText = event.query || '';
    searchTemplatesText.value = searchText;
    loadingTemplates.value = true;

    const res = await projectTaskStore.getTemplates(project.id, {
        limit: 300,
        search: searchText
    });

    templates.value = res.data || [];

    if (templates.value.length == 0 && searchText.trim()) {
        // Only show "Click to create" if there's actual search text and no results
        templates.value = [
            {
                id: 'add_new',
                name: `Click to create '${searchText}'`,
                rawName: searchText
            }
        ];
    } else {
        // If search is empty or results found, show the actual results
        templates.value = res.data;
        if (!searchText.trim()) {
            // Clear searchTemplatesText when input is empty
            searchTemplatesText.value = '';
        }
    }

    loadingTemplates.value = false;
};

const getItems = async () => {
    try {
        loading.value = true;
        const params = { ...pagination.getPageParams() };
        const payload = {
            ...sortFilters.getSortFilters(searchText.value),
            includes: [
                { relation: 'revenueCategory' },
                { relation: 'users' },
                { relation: 'templates' }
            ],
            filters: [
                {
                    field: 'project_id',
                    operator: '=',
                    value: project.id
                }
            ]
        };
        const res = await projectTaskStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const getRevenueCategories = async (searchText = '') => {
    try {
        loadingRevenueCategories.value = true;
        const params = { limit: 300 };
        const payload = {
            search: {
                value: searchText
            }
        };
        const res = await revenueCategoryStore.list(payload, params);
        revenueCategories.value = filterActiveWithSelected(
            res.data,
            formData.value.revenue_category_id
        );
    } finally {
        loadingRevenueCategories.value = false;
    }
};

const getMaxOrder = async () => {
    try {
        maxOrderLoading.value = true;
        const res = await projectTaskStore.getMaxOrder({
            project_id: project.id
        });
        formData.value.order = res + 1;
    } finally {
        maxOrderLoading.value = false;
    }
};

const save = async () => {
    try {
        const modifiedFormData = {
            ...formData.value,
            project_id: project.id,
            budgeted_amount: budgetedAmount.value,
            selected_template: selectedTemplate.value
        };
        busy.value = true;
        if (isEditMode.value) {
            await projectTaskStore.update(
                selectedItem.value.id,
                modifiedFormData
            );
        } else {
            await projectTaskStore.create(modifiedFormData);
        }

        closeDialog();
        await getItems();
        selectedItem.value = {};
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
};

const removeUser = async (rowId, userId) => {
    try {
        busy.value = true;

        const rowIndex = items.value.findIndex((item) => item.id === rowId);
        if (rowIndex === -1) return;

        const updatedRow = { ...items.value[rowIndex] };

        updatedRow.users = updatedRow.users.filter((u) => u.id !== userId);

        projectTaskStore.update(rowId, updatedRow);
        selectedItem.value = {};
        await getItems();
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
};

const deleteItem = async () => {
    try {
        loading.value = true;
        if (selectedItem.value) {
            await projectTaskStore.deleteItem(selectedItem.value.id);
        }
        await getItems();
        selectedItem.value = {};
    } finally {
        loading.value = false;
    }
};

const changeStatus = async () => {
    try {
        loading.value = true;
        if (selectedItem.value) {
            await projectTaskStore.changeStatus(selectedItem.value.id);
        }
        await getItems();
        selectedItem.value = {};
    } finally {
        loading.value = false;
    }
};

const openDropdown = () => {
    getProjectTasksTemplates({ query: '' });
    autoCompleteRef.value?.show();
};

const onTemplateSelect = () => {
    // Hide dropdown after selection
    autoCompleteRef.value?.hide();
};

const onTemplateFocus = () => {
    // Always show dropdown when input gets focus, preserve current search
    getProjectTasksTemplates({ query: searchTemplatesText.value || '' });
    autoCompleteRef.value?.show();
};

const onTemplateClick = () => {
    // Force show dropdown when clicking on input, preserve current search
    getProjectTasksTemplates({ query: searchTemplatesText.value || '' });
    autoCompleteRef.value?.show();
};

const onTemplateInput = (event) => {
    // Handle input changes, including when field is cleared
    const inputValue = event.target.value || '';
    if (!inputValue.trim()) {
        // If input is empty, reset search and show default templates
        searchTemplatesText.value = '';
        getProjectTasksTemplates({ query: '' });
    }
};

watch(selectedTemplate, (val) => {
    if (val) {
        autoCompleteRef.value?.hide();
    }
});
</script>

<template>
    <BaseTable
        :value="items"
        :page="pagination.page"
        :rows="pagination.limit"
        :total-records="totalRecords"
        :loading="loading"
        @sort="onSortChange"
        @page="onPageChange"
        @rowReorder="onRowReorder"
    >
        <template #header>
            <div
                class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3 sm:gap-4"
            >
                <div class="w-full sm:w-1/2 md:w-1/3 lg:w-1/3">
                    <Search
                        v-model="searchText"
                        @search="search"
                        class="w-full"
                    />
                </div>
                <div class="flex flex-row gap-2 items-center mt-2 sm:mt-0">
                    <Button label="Add Task" @click="openDialog('add')" />
                </div>
            </div>
        </template>
        <template #empty> No project tasks found. </template>

        <Column :sortable="true" field="order" header="Order" />

        <Column
            class="whitespace-nowrap"
            :sortable="true"
            field="name"
            header="Task"
        >
            <template #body="{ data }">
                <div class="flex flex-row items-center gap-2">
                    <span
                        class="text-blue-600 hover:text-blue-800 cursor-pointer"
                        @click="
                            () => {
                                selectedItem = data;
                                editItem();
                            }
                        "
                        v-tooltip.top="
                            data.name?.length > 30 ? data.name : undefined
                        "
                    >
                        {{
                            truncate(data.templates?.[0]?.name || data.name, {
                                length: 30
                            })
                        }}
                        <Tag
                            class="mt-2"
                            severity="info"
                            v-if="data.template_id"
                            value="Default"
                        />
                    </span>
                </div>
            </template>
        </Column>

        <Column
            :sortable="true"
            field="revenueCategory.name"
            header="Revenue Category"
        />

        <Column
            :sortable="true"
            field="budgeted_hours"
            header="Budgeted Hours"
        />
        <Column :sortable="true" field="budgeted_rate" header="Budgeted Rate">
            <template #body="{ data }">
                {{ moneyFormat(data.budgeted_rate, true) }}
            </template>
        </Column>
        <Column
            :sortable="true"
            field="budgeted_amount"
            header="Budgeted Amount"
        >
            <template #body="{ data }">
                {{ moneyFormat(data.budgeted_amount, true) }}
            </template>
        </Column>
        <Column
            :sortable="true"
            field="due_date"
            header="Due Date"
            class="whitespace-nowrap"
        >
            <template #body="{ data }">
                {{ formatDate(data.due_date) }}
            </template>
        </Column>

        <Column field="users" header="Assignment">
            <template #body="{ data }">
                <div class="flex flex-wrap gap-2">
                    <Chip
                        class="whitespace-nowrap"
                        v-for="user in data.users"
                        :key="user.id"
                        :label="user.name"
                        removable
                        @remove="removeUser(data.id, user.id)"
                    />
                </div>
            </template>
        </Column>

        <Column header="Status" :sortable="true" field="status">
            <template #body="{ data }">
                <StatusTag :status="data.status ? 'active' : 'inactive'" />
            </template>
        </Column>

        <Column header="Actions" class="flex justify-end">
            <template #body="{ data }">
                <Button
                    class="!px-3 !py-2"
                    label="Actions"
                    variant="outlined"
                    iconPos="right"
                    icon="pi pi-chevron-down"
                    size="small"
                    @click="showActions($event, data)"
                />

                <Menu
                    ref="menu"
                    id="overlay_menu"
                    :model="menuItems"
                    :popup="true"
                />
            </template>
        </Column>
    </BaseTable>

    <BaseDialog
        v-model:visible="showDialog"
        class="w-full sm:w-2/3 md:w-1/2 lg:w-6/12"
        @update:visible="onShow"
        :busy="busy"
        :isEditMode="isEditMode"
        :header="isEditMode ? 'Edit Project Task' : 'New Project Task'"
        :confirmLabel="isEditMode ? 'Update' : 'Save'"
        :formData="formData"
        :initialData="isEditMode ? selectedItem : null"
        :enableDirtyCheck="false"
        @cancel="closeDialog"
        @confirm="save"
    >
        <div class="mb-3 col-span-12">
            <label class="block required mb-3" for="name">Order</label>
            <InputField
                variant="text"
                id="order"
                v-model="formData.order"
                class="w-full"
                @keyup.enter="save"
                :disabled="busy || maxOrderLoading"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block required mb-3" for="name">Project Task</label>
            <AutoComplete
                ref="autoCompleteRef"
                class="auto-complete-inp w-full"
                v-model="selectedTemplate"
                :suggestions="templates"
                optionLabel="name"
                placeholder="Select or type to create"
                :loading="loadingTemplates"
                @complete="getProjectTasksTemplates"
                :disabled="busy"
                forceSelection
                @focus="onTemplateFocus"
                @click="onTemplateClick"
                @item-select="onTemplateSelect"
                @input="onTemplateInput"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block required mb-2" for="revenue_category_id"
                >Revenue Category</label
            >
            <ApiDropdown
                showClear
                filter
                placeholder="Select"
                :loading="loadingRevenueCategories"
                @search="getRevenueCategories"
                :options="revenueCategories"
                optionLabel="name"
                optionValue="id"
                id="revenue_category_id"
                v-model="formData.revenue_category_id"
                class="w-full"
                :disabled="
                    busy || loadingRevenueCategories || disableRevenueCategory
                "
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block mb-2" for="budgeted_hours"
                >Budgeted Hours</label
            >
            <InputField
                variant="number"
                :min="0"
                :minFractionDigits="2"
                :maxFractionDigits="2"
                id="budgeted_hours"
                :useGrouping="false"
                v-model="formData.budgeted_hours"
                class="w-full"
                @keyup.enter="save"
                :disabled="busy"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block mb-2" for="budgeted_rate">Budgeted Rate</label>
            <InputField
                variant="number"
                prefix="$"
                :min="0"
                :minFractionDigits="2"
                :maxFractionDigits="2"
                id="budgeted_rate"
                v-model="formData.budgeted_rate"
                class="w-full"
                @keyup.enter="save"
                :disabled="busy"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block mb-2" for="budgeted_amount"
                >Budgeted Amount</label
            >
            <InputField
                variant="number"
                prefix="$"
                :min="0"
                :minFractionDigits="2"
                :maxFractionDigits="2"
                id="budgeted_amount"
                v-model="budgetedAmount"
                class="w-full"
                @keyup.enter="save"
                :disabled="true"
            />
        </div>
        <div class="mb-3 col-span-12">
            <label class="block mb-2" for="due_date">Due Date</label>
            <InputField
                variant="date"
                id="due_date"
                v-model="formData.due_date"
                class="w-full"
                @keyup.enter="save"
                :disabled="busy"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block mb-3">Assigned To </label>
            <ApiMultiselect
                id="users"
                placeholder="Select"
                class="w-full"
                showClear
                filter
                :loading="loadingUsers"
                @search="getUsers"
                :options="users"
                optionLabel="name"
                optionValue="id"
                :disabled="busy || loadingUsers"
                v-model="selectedUsersIds"
            />
        </div>

        <div v-if="selectedUsers.length" class="mb-3 !mt-4 col-span-12">
            <label class="block font-semibold text-2xl mb-2">Rates</label>
            <BaseTable :value="selectedUsers">
                <Column class="whitespace-nowrap" field="name" header="Name">
                    <template #body="{ data }">
                        {{ data.name }}
                    </template>
                </Column>

                <Column
                    field="default_user_billing_rate_per_hour"
                    header="Default User Bill Rate"
                >
                    <template #body="{ index, data }">
                        <InputField
                            :id="`users.${index}.default_user_billing_rate_per_hour`"
                            v-model="data.default_user_billing_rate_per_hour"
                            :disabled="true"
                            class="w-full"
                            inputClass="w-full"
                            variant="number"
                            prefix="$"
                            :min="0.01"
                            :minFractionDigits="2"
                            :maxFractionDigits="2"
                            :step="1"
                            @keyup.enter="save"
                        />
                    </template>
                </Column>

                <Column
                    v-if="!isProjectGlobal"
                    field="customer_rate"
                    header="Default Customer Rate"
                >
                    <template #body="{ index, data }">
                        <InputField
                            :id="`users.${index}.customer_rate`"
                            v-model="data.customer_rate"
                            :disabled="true"
                            class="w-full"
                            inputClass="w-full"
                            variant="number"
                            prefix="$"
                            :min="0"
                            :minFractionDigits="2"
                            :maxFractionDigits="2"
                            :step="1"
                            @keyup.enter="save"
                        />
                    </template>
                </Column>
                <Column
                    field="project_task_rate"
                    header="Project Task Charge Rate"
                >
                    <template #body="{ index, data }">
                        <InputField
                            :id="`users.${index}.project_task_rate`"
                            v-model="data.project_task_rate"
                            :disabled="busy"
                            class="w-full"
                            inputClass="w-full"
                            variant="number"
                            prefix="$"
                            :min="0"
                            :minFractionDigits="2"
                            :maxFractionDigits="2"
                            :step="1"
                            @keyup.enter="save"
                        />
                    </template>
                </Column>
            </BaseTable>
        </div>

        <div class="mb-3 col-span-12">
            <label class="block mb-3">Status</label>
            <div class="flex items-center gap-3">
                <InputField
                    inputId="status"
                    variant="switch"
                    v-model="formData.status"
                    :disabled="busy"
                />
                <label class="cursor-pointer mt-1" for="status">{{
                    formData.status ? 'Active' : 'Inactive'
                }}</label>
            </div>
        </div>
    </BaseDialog>

    <Confirmation
        v-model="deleteDialog"
        variant="danger"
        header="Delete Project Task"
        content="Are you sure you want to delete this project task?"
        @confirm="deleteItem"
    />

    <Confirmation
        v-model="changeStatusDialog"
        variant="danger"
        :header="isItemActive ? 'Make Inactive' : 'Make Active'"
        :content="`Are you sure you want to make this project task ${isItemActive ? 'inactive' : 'active'}?`"
        :confirmButtonText="isItemActive ? 'Make Inactive' : 'Make Active'"
        @confirm="changeStatus"
    />
</template>
<style>
.auto-complete-inp input {
    width: 100%;
}
</style>
