<script setup>
import { computed, onBeforeMount, ref, watch } from 'vue';
import { truncate, debounce } from 'lodash-es';
import { useProjectStore } from '@/modules/core/stores';
import { useProjectTypeStore } from '@/modules/administration/stores';
import { useLookupTablePreferenceStore } from '@/modules/core/stores';
import { useGlobalStore } from '@/stores';
import { useExportTable } from '@/composables/useExportTable';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useRouter } from 'vue-router';
import { useHelpers } from '@/composables';

const projectStore = useProjectStore();
const projectTypeStore = useProjectTypeStore();
const globalStore = useGlobalStore();
const lookupTablePreferenceStore = useLookupTablePreferenceStore();

const { exportTable } = useExportTable();
const { filterByPermission, moneyFormat, mapVisibleColumns } = useHelpers();
const router = useRouter();
const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const searchText = ref('');
const selectedItem = ref(null);
const loading = ref(false);
const items = ref([]);
const isEditMode = ref(false);
const busy = ref(false);
const totalRecords = ref();
const showDialog = ref(false);
const deleteDialog = ref(false);
const changeStatusDialog = ref(false);
const menu = ref();
const exportMenu = ref(null);
const loadingProjectTypes = ref(false);
const projectTypes = ref([]);
const formData = ref({
    name: null,
    short_name: null,
    project_type_id: null,
    status: true
});
const shortNameOverridden = ref(false);
const columnsMenuItems = ref([
    { field: 'name', name: 'Project Name', sortable: true, disabled: true },
    { field: 'short_name', name: 'Project Short Name', sortable: true },
    { field: 'customer.name', name: 'Customer Name', sortable: true },
    {
        field: 'projectType.name',
        name: 'Project Type',
        sortable: true,
        disabled: true
    },
    { field: 'customer_po', name: 'Customer PO', sortable: true },
    { field: 'is_global', name: 'Global', sortable: true, disabled: true },
    { field: 'project_details', name: 'Project Details', sortable: true },
    { field: 'additional_notes', name: 'Additional Notes', sortable: true },
    { field: 'retainer_amount', name: 'Retainer Amount', sortable: true },
    { field: 'retainer_label', name: 'Retainer Label', sortable: true },
    { field: 'monthly_fee_amount', name: 'Monthly Fee Amount', sortable: true },
    { field: 'monthly_fee_label', name: 'Monthly Fee Label', sortable: true },
    { field: 'customer_proposal', name: 'Customer Proposal', sortable: false },
    { field: 'status', name: 'Status', sortable: true }
]);
const visibleColumns = ref([]);
const columnSelectionsRef = ref(null);
const exportMenuItems = [
    {
        icon: 'pi pi-file-excel',
        label: 'To Excel',
        command: () => exportData({ table: 'projects', format: 'excel' })
    },
    {
        icon: 'pi pi-file-pdf',
        label: 'To PDF',
        command: () => exportData({ table: 'projects', format: 'pdf' })
    }
];

onBeforeMount(async () => {
    await getTablePreferences();
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
    () => formData.value.name,
    (newVal) => {
        if (!shortNameOverridden.value) {
            formData.value.short_name = newVal ? newVal.slice(0, 50) : null;
        }
    }
);

watch(
    () => formData.value.name,
    (newVal) => {
        if (!shortNameOverridden.value) {
            formData.value.short_name = newVal ? newVal.slice(0, 50) : '';
        }
    }
);

const menuItems = computed(() => {
    if (!selectedItem.value) return [];

    const allMenuItems = [
        {
            label: 'Edit',
            icon: 'pi pi-pencil',
            command: () => goToEdit(),
            permission: 'projects.edit'
        },
        {
            label: isItemActive.value ? 'Make Inactive' : 'Make Active',
            icon: isItemActive.value ? 'pi pi-times' : 'pi pi-check',
            command: () => showChangeStatusDialog(),
            permission: 'projects.edit'
        },
        {
            label: 'Delete',
            icon: 'pi pi-trash',
            command: () => showDeleteDialog(),
            permission: 'projects.delete'
        }
    ].filter(Boolean);

    return filterByPermission(allMenuItems);
});

const isItemActive = computed(() => {
    return selectedItem.value && selectedItem.value.status;
});

const toggleColumnSelections = () => {
    columnSelectionsRef.value.show();
};

const openDialog = (mode = 'add') => {
    isEditMode.value = mode === 'edit';
    showDialog.value = true;
    getProjectTypes();
};

const goToEdit = () => {
    router.push({
        name: 'EditProject',
        params: { id: selectedItem.value?.id }
    });
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

const closeDialog = () => {
    showDialog.value = false;
    resetForm();
};

const onShow = () => {
    resetForm();
};

const resetForm = () => {
    formData.value.name = null;
    formData.value.short_name = null;
    formData.value.project_type_id = null;
    formData.value.status = true;
    globalStore.clearErrors();
};

const showExportMenu = (event) => {
    exportMenu.value.toggle(event);
};

const exportData = async ({ table, format }) => {
    try {
        loading.value = true;

        const columns = visibleColumns.value.map((col) => col.field);

        // build lookup map from special fields
        const lookups = {};
        if (columns.includes('customer.name')) {
            lookups['customer_id'] = 'customers.name';
        }
        if (columns.includes('projectType.name')) {
            lookups['project_type_id'] = 'project_types.name';
        }

        // convert nested fields to real db columns
        const dbColumns = columns.map((c) => {
            if (c === 'customer.name') return 'customer_id';
            if (c === 'projectType.name') return 'project_type_id';
            return c;
        });

        await exportTable({ table, format, columns: dbColumns, lookups });
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

const getItems = async () => {
    try {
        loading.value = true;
        const params = {
            ...pagination.getPageParams()
        };
        const payload = {
            ...sortFilters.getSortFilters(searchText.value),
            includes: [{ relation: 'customer' }, { relation: 'projectType' }]
        };

        if (!payload.sort || payload.sort.length === 0) {
            payload.sort = [
                { field: 'status', direction: 'desc' },
                { field: 'name', direction: 'asc' }
            ];
        }
        const res = await projectStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res?.meta?.total;
    } finally {
        loading.value = false;
    }
};

const getTablePreferences = async () => {
    try {
        loading.value = true;
        const params = { table_key: 'projects' };
        const res =
            await lookupTablePreferenceStore.getTablePreferences(params);
        const visible_columns = res.data?.visible_columns || [];
        visibleColumns.value = mapVisibleColumns(
            visible_columns,
            columnsMenuItems.value
        );

        // fallback if backend returns nothing
        if (!visibleColumns.value.length) {
            visibleColumns.value = columnsMenuItems.value.filter(
                (c) => c.disabled
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

const getProjectTypes = async (searchText = '') => {
    try {
        loadingProjectTypes.value = true;
        const params = { limit: 300 };
        const payload = {
            search: {
                value: searchText
            },
            filters: [
                {
                    field: 'status',
                    operator: '=',
                    value: 1
                }
            ]
        };
        const res = await projectTypeStore.list(payload, params);
        projectTypes.value = res.data;
    } finally {
        loadingProjectTypes.value = false;
    }
};

const save = async () => {
    try {
        busy.value = true;
        const res = await projectStore.create(formData.value);
        closeDialog();
        selectedItem.value = {};
        router.push({
            name: 'EditProject',
            params: { id: res.data?.id }
        });
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
            await projectStore.deleteItem(selectedItem.value.id);
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
            await projectStore.changeStatus(selectedItem.value.id, {
                status: selectedItem.value.status === true ? false : true
            });
        }
        await getItems();
        selectedItem.value = {};
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <TitleHeader>
        <template #title>
            <div>
                <h1 class="text-2xl sm:text-3xl font-bold">Projects</h1>
                <p class="mt-2 text-sm sm:text-base mx-auto sm:mx-0 mb-0">
                    These are all the projects in the system.
                </p>
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
            <Button
                v-if="$ability.can('projects.create')"
                label="Add New"
                @click="openDialog('add')"
            />
        </template>
    </TitleHeader>

    <Card class="py-3 px-2">
        <template #content>
            <BaseTable
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
                        class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-2 sm:gap-4"
                    >
                        <div class="w-full sm:w-1/2 md:w-1/3 lg:w-1/3">
                            <Search
                                v-model="searchText"
                                @search="search"
                                class="w-full"
                            />
                        </div>
                        <div
                            class="flex flex-row gap-2 items-center mt-2 sm:mt-0"
                        >
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
                                class="p-multiselect-label-empty"
                                v-model="visibleColumns"
                                @change="
                                    debouncedSaveTablePreferences(
                                        'projects',
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
                </template>
                <template #empty> No projects found. </template>
                <Column
                    v-for="(col, idx) in visibleColumns"
                    :key="col.field + '_' + idx"
                    :field="col.field"
                    :header="col.name"
                    :sortable="col.sortable"
                    class="whitespace-nowrap"
                >
                    <template v-if="col.field === 'name'" #body="{ data }">
                        <router-link
                            v-if="$ability.can('projects.edit')"
                            :to="{
                                name: 'EditProject',
                                params: { id: data.id }
                            }"
                            class="text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                            {{ data.name }}
                        </router-link>
                        <span v-else>{{ data.name }}</span>
                    </template>

                    <template
                        v-else-if="col.field === 'is_global'"
                        #body="{ data }"
                    >
                        <Tag
                            v-if="data.is_global"
                            class="!text-xs"
                            :severity="data.is_global ? 'info' : 'warn'"
                            :value="data.is_global ? 'Yes' : 'No'"
                        />
                    </template>

                    <template
                        v-else-if="col.field === 'customer_proposal'"
                        #body="{ data }"
                    >
                        <Button
                            as="a"
                            :href="data.customer_proposal"
                            target="_blank"
                            rounded
                            size="small"
                            class="mx-auto !flex"
                            variant="outlined"
                            icon="pi pi-eye"
                            v-if="data.customer_proposal"
                        />
                    </template>

                    <template
                        v-else-if="col.field === 'status'"
                        #body="{ data }"
                    >
                        <StatusTag
                            :status="data.status ? 'active' : 'inactive'"
                        />
                    </template>
                    <template
                        v-else-if="col.field === 'retainer_amount'"
                        #body="{ data }"
                    >
                        {{ moneyFormat(data.retainer_amount) }}
                    </template>

                    <template
                        v-else-if="col.field === 'monthly_fee_amount'"
                        #body="{ data }"
                    >
                        {{ moneyFormat(data.monthly_fee_amount) }}
                    </template>

                    <template
                        v-else-if="
                            [
                                'project_details',
                                'additional_notes',
                                'retainer_label',
                                'monthly_fee_label'
                            ].includes(col.field)
                        "
                        #body="{ data }"
                    >
                        <span v-tooltip.top="data[col.field]">
                            {{
                                truncate(data[col.field], { length: 30 }) || '-'
                            }}
                        </span>
                    </template>
                </Column>
                <Column
                    v-if="
                        $ability.can('projects.edit') ||
                        $ability.can('projects.delete')
                    "
                    header="Actions"
                    class="flex justify-end"
                >
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
        </template>
    </Card>

    <BaseDialog
        v-if="$ability.can('projects.create')"
        v-model:visible="showDialog"
        @update:visible="onShow"
        :busy="busy"
        :isEditMode="isEditMode"
        :header="isEditMode ? 'Edit Project' : 'Create New Project'"
        :confirmLabel="isEditMode ? 'Update' : 'Save'"
        :formData="formData"
        :initialData="isEditMode ? selectedItem : null"
        :enableDirtyCheck="true"
        @cancel="closeDialog"
        @confirm="save"
    >
        <div class="mb-3 col-span-12">
            <label class="block required mb-3" for="name">Name</label>
            <InputField
                variant="text"
                id="name"
                v-model="formData.name"
                class="w-full"
                @keyup.enter="save"
                :disabled="busy"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block required mb-3" for="name">Short Name</label>
            <InputField
                variant="text"
                id="short_name"
                v-model="formData.short_name"
                class="w-full"
                @keyup.enter="save"
                :disabled="busy"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block mb-3 required" for="project_type_id"
                >Project Type</label
            >
            <ApiDropdown
                showClear
                filter
                placeholder="Select"
                :loading="loadingProjectTypes"
                @search="getProjectTypes"
                :options="projectTypes"
                optionLabel="name"
                optionValue="id"
                id="project_type_id"
                v-model="formData.project_type_id"
                class="w-full"
                :disabled="busy || loadingProjectTypes"
            />
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
        v-if="$ability.can('projects.delete')"
        v-model="deleteDialog"
        variant="danger"
        header="Delete Project"
        content="Are you sure you want to delete this project?"
        @confirm="deleteItem"
    />

    <Confirmation
        v-if="$ability.can('projects.edit')"
        v-model="changeStatusDialog"
        variant="danger"
        :header="isItemActive ? 'Make Inactive' : 'Make Active'"
        :content="`Are you sure you want to make this project ${isItemActive ? 'inactive' : 'active'}?`"
        :confirmButtonText="isItemActive ? 'Make Inactive' : 'Make Active'"
        @confirm="changeStatus"
    />
</template>
