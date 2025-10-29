<script setup>
import { computed, onBeforeMount, ref, watch } from 'vue';
import { truncate, debounce } from 'lodash-es';
import { useCustomerStore } from '@/modules/core/stores';
import {
    useCustomerGroupStore,
    useLookupTablePreferenceStore
} from '@/modules/core/stores';
import { useGlobalStore, useSessionStore } from '@/stores';
import { useExportTable } from '@/composables/useExportTable';
import { PaginationOptions, SortFilterOptions } from '@/config';
import countries from '@/static/countries.json';
import { useRouter } from 'vue-router';
import { useHelpers } from '@/composables';

const customerStore = useCustomerStore();
const globalStore = useGlobalStore();
const sessionStore = useSessionStore();
const customerGroupStore = useCustomerGroupStore();
const lookupTablePreferenceStore = useLookupTablePreferenceStore();

const { exportTable } = useExportTable();
const {
    filterByPermission,
    moneyFormat,
    formatPercentage,
    mapVisibleColumns,
    makeAddress
} = useHelpers();
const router = useRouter();
const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const searchText = ref('');
const searchGroupText = ref('');
const selectedItem = ref(null);
const loading = ref(false);
const items = ref([]);
const isEditMode = ref(false);
const busy = ref(false);
const addingGroup = ref(false);
const totalRecords = ref();
const showDialog = ref(false);
const deleteDialog = ref(false);
const changeStatusDialog = ref(false);
const menu = ref();
const exportMenu = ref(null);
const loadingParentItems = ref(false);
const parentItems = ref([]);
const loadingGroups = ref(false);
const groups = ref([]);
const status = ref('all');
const formData = ref({
    name: '',
    email: '',
    parent_id: null,
    country: null,
    customer_group_id: null,
    status: true
});
const columnsMenuItems = ref([
    { field: 'name', name: 'Name', sortable: true, disabled: true },
    { field: 'email', name: 'Email', sortable: true, disabled: true },
    { field: 'parent.name', name: 'Parent Customer', sortable: false },
    { field: 'group.name', name: 'Group Name', sortable: true },
    { field: 'address', name: 'Address', sortable: true },
    { field: 'code', name: 'Code', sortable: true },
    { field: 'legal_name', name: 'Legal Name', sortable: true },
    { field: 'paymentTerm.name', name: 'Payment Term', sortable: true },
    { field: 'clientType.name', name: 'Client Type', sortable: true },
    {
        field: 'minimum_time_charge',
        name: 'Minimum Time Charge',
        sortable: true
    },
    { field: 'customer_rate', name: 'Customer Rate', sortable: true },
    { field: 'travel_charges', name: 'Travel Charges', sortable: true },
    { field: 'phone', name: 'Main Phone', sortable: true },
    { field: 'fax', name: 'Main Fax', sortable: true },
    { field: 'notes', name: 'Notes', sortable: true },

    { field: 'status', name: 'Status', sortable: true }
]);
const visibleColumns = ref([]);
const columnSelectionsRef = ref(null);
const exportMenuItems = [
    {
        icon: 'pi pi-file-excel',
        label: 'To Excel',
        command: () => exportData({ table: 'customers', format: 'excel' })
    },
    {
        icon: 'pi pi-file-pdf',
        label: 'To PDF',
        command: () => exportData({ table: 'customers', format: 'pdf' })
    }
];

onBeforeMount(async () => {
    getCompanyDetails();
    await getTablePreferences();
    await getItems();
});

watch(
    () => formData.value.customer_group_id,
    () => {
        if (formData.value.customer_group_id === 'add_new') {
            addGroup();
        }
    },
    { deep: true }
);

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

const menuItems = computed(() => {
    if (!selectedItem.value) return [];

    const allMenuItems = [
        {
            label: 'Edit',
            icon: 'pi pi-pencil',
            command: () => goToEdit(),
            permission: 'customers.edit'
        },
        {
            label: isItemActive.value ? 'Make Inactive' : 'Make Active',
            icon: isItemActive.value ? 'pi pi-times' : 'pi pi-check',
            command: () => showChangeStatusDialog(),
            permission: 'customers.edit'
        },
        {
            label: 'Delete',
            icon: 'pi pi-trash',
            command: () => showDeleteDialog(),
            permission: 'customers.delete'
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
    getParentItems();
    getGroups();
};

const goToEdit = () => {
    router.push({
        name: 'EditCustomer',
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
    formData.value.name = '';
    formData.value.email = '';
    formData.value.description = '';
    formData.value.parent_id = null;
    formData.value.customer_group_id = null;
    formData.value.country = null;
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

        const lookups = {};
        if (columns.includes('parent.name')) {
            lookups['parent_id'] = 'customers.name';
        }
        if (columns.includes('group.name')) {
            lookups['customer_group_id'] = 'customer_groups.name';
        }

        const dbColumns = columns.map((c) => {
            if (c === 'parent.name') return 'parent_id';
            if (c === 'group.name') return 'customer_group_id';
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

const getCompanyDetails = async () => {
    try {
        formData.value.country = sessionStore.myCompany?.country;
    } catch (error) {
        console.error(error);
    }
};

const getItems = async () => {
    try {
        loading.value = true;
        const params = {
            ...pagination.getPageParams()
        };
        const payload = {
            ...sortFilters.getSortFilters(searchText.value),
            includes: [
                { relation: 'parent' },
                { relation: 'group' },
                { relation: 'paymentTerm' },
                { relation: 'clientType' }
            ]
        };

        if (!payload.sort || payload.sort.length === 0) {
            payload.sort = [
                { field: 'status', direction: 'desc' },
                { field: 'name', direction: 'asc' }
            ];
        }
        const res = await customerStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res?.meta?.total;
    } finally {
        loading.value = false;
    }
};

const getTablePreferences = async () => {
    try {
        loading.value = true;
        const params = { table_key: 'customers' };
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

const getParentItems = async (searchText = '') => {
    try {
        loadingParentItems.value = true;
        const params = { limit: 300 };
        const payload = {
            search: {
                value: searchText
            },
            filters: [
                {
                    field: 'status',
                    operator: '=',
                    value: true
                }
            ]
        };
        const res = await customerStore.search(payload, params);
        parentItems.value = res.data;
    } finally {
        loadingParentItems.value = false;
    }
};

const addGroup = async () => {
    try {
        addingGroup.value = true;
        const payload = { name: searchGroupText.value, status: true };
        const res = await customerGroupStore.create(payload);
        await getGroups();
        formData.value.customer_group_id = res.data?.id;
    } catch (error) {
        console.error(error);
    } finally {
        addingGroup.value = false;
    }
};

const getGroups = async (searchText = '') => {
    try {
        searchGroupText.value = searchText;
        loadingGroups.value = true;
        const params = { limit: 300 };
        const payload = {
            search: {
                value: searchText
            },
            filters: [
                {
                    field: 'status',
                    operator: '=',
                    value: true
                }
            ]
        };
        const res = await customerGroupStore.search(payload, params);
        const data = res.data || [];

        if (data.length === 0 && searchText) {
            groups.value = [
                { id: 'add_new', name: `Click to create '${searchText}'` }
            ];
        } else {
            groups.value = data;
        }
    } finally {
        loadingGroups.value = false;
    }
};

const save = async () => {
    try {
        busy.value = true;
        const res = await customerStore.create(formData.value);
        closeDialog();
        selectedItem.value = {};
        router.push({
            name: 'EditCustomer',
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
            await customerStore.deleteItem(selectedItem.value.id);
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
            await customerStore.changeStatus(selectedItem.value.id, {
                status: selectedItem.value.status === true ? false : true
            });
        }
        await getItems();
        selectedItem.value = {};
    } finally {
        loading.value = false;
    }
};

const statusOptions = [
    { name: 'All', code: 'all' },
    { name: 'Active', code: 1 },
    { name: 'Inactive', code: 0 }
];

const onStatusFilterChange = (value) => {
    // value here will be the `code` you selected
    if (value !== 'all') {
        sortFilters.updateFilters('status', value);
    } else {
        sortFilters.filters = [];
    }
    pagination.resetPageParams();
    getItems();
};
</script>

<template>
    <TitleHeader>
        <template #title>
            <div>
                <h1 class="text-2xl sm:text-3xl font-bold">Customers</h1>
                <p class="mt-2 text-sm sm:text-base mx-auto sm:mx-0 mb-0">
                    These are all the customers in the system.
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
                v-if="$ability.can('customers.create')"
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
                        <div class="flex justify-end items-end flex-wrap gap-4">
                            <div>
                                <div class="flex flex-col w-full md:w-56">
                                    <label
                                        for="status"
                                        class="mb-1 text-sm font-medium text-gray-700"
                                    >
                                        Filter by Status
                                    </label>
                                    <InputField
                                        v-model="status"
                                        id="status"
                                        class="w-full"
                                        placeholder="Select Status"
                                        variant="dropdown"
                                        optionLabel="name"
                                        optionValue="code"
                                        :options="statusOptions"
                                        @update:modelValue="
                                            onStatusFilterChange
                                        "
                                    />
                                </div>
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
                                            'customers',
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
                <template #empty> No customers found. </template>
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
                            v-if="$ability.can('customers.edit')"
                            :to="{
                                name: 'EditCustomer',
                                params: { id: data.id }
                            }"
                            class="text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                            {{ data.name }}
                        </router-link>
                        <span v-else>{{ data.name }}</span>
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
                        v-else-if="col.field === 'customer_rate'"
                        #body="{ data }"
                    >
                        {{ moneyFormat(data.customer_rate) }}
                    </template>
                    <template
                        v-else-if="col.field === 'travel_charges'"
                        #body="{ data }"
                    >
                        {{ formatPercentage(data.travel_charges) }}
                    </template>

                    <template
                        v-else-if="col.field === 'address'"
                        #body="{ data }"
                    >
                        <span
                            v-tooltip.top="
                                makeAddress({
                                    address: data.address,
                                    city: data.city,
                                    country: data.country,
                                    state: data.state,
                                    zip: data.zip
                                })
                            "
                        >
                            {{
                                truncate(
                                    makeAddress({
                                        address: data.address,
                                        city: data.city,
                                        country: data.country,
                                        state: data.state,
                                        zip: data.zip
                                    }),
                                    { length: 30 }
                                ) || '-'
                            }}
                        </span>
                    </template>

                    <template
                        v-else-if="['notes', 'legal_name'].includes(col.field)"
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
                        $ability.can('customers.edit') ||
                        $ability.can('customers.delete')
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
        v-if="$ability.can('customers.create')"
        v-model:visible="showDialog"
        @update:visible="onShow"
        :busy="busy"
        :isEditMode="isEditMode"
        :header="isEditMode ? 'Edit Customer' : 'Create New Customer'"
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
            <label class="block required mb-3" for="email">Email</label>
            <InputField
                variant="text"
                id="email"
                v-model="formData.email"
                class="w-full"
                @keyup.enter="save"
                :disabled="busy"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block mb-3" for="parent_id">Parent Customer</label>
            <ApiDropdown
                showClear
                filter
                placeholder="Select"
                :loading="loadingParentItems"
                @search="getParentItems"
                :options="parentItems"
                optionLabel="name"
                optionValue="id"
                id="parent_id"
                v-model="formData.parent_id"
                class="w-full"
                :disabled="busy || loadingParentItems"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block mb-3" for="customer_group_id"
                >Customer Group</label
            >
            <ApiDropdown
                showClear
                filter
                placeholder="Select"
                :loading="loadingGroups"
                @search="getGroups"
                :options="groups"
                optionLabel="name"
                optionValue="id"
                id="customer_group_id"
                v-model="formData.customer_group_id"
                class="w-full"
                :disabled="busy || loadingGroups"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block mb-3 required">Country</label>
            <InputField
                id="country"
                showClear
                filter
                :disabled="busy"
                class="w-full"
                v-model="formData.country"
                variant="dropdown"
                placeholder="Select"
                optionLabel="name"
                optionValue="name"
                :options="countries"
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
        v-if="$ability.can('customers.delete')"
        v-model="deleteDialog"
        variant="danger"
        header="Delete Customer"
        content="Are you sure you want to delete this customer?"
        @confirm="deleteItem"
    />

    <Confirmation
        v-if="$ability.can('customers.edit')"
        v-model="changeStatusDialog"
        variant="danger"
        :header="isItemActive ? 'Make Inactive' : 'Make Active'"
        :content="`Are you sure you want to make this customer ${isItemActive ? 'inactive' : 'active'}?`"
        :confirmButtonText="isItemActive ? 'Make Inactive' : 'Make Active'"
        @confirm="changeStatus"
    />
</template>
