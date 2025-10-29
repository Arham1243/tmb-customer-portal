<script setup>
import { computed, onBeforeMount, ref } from 'vue';
import { useRevenueCategoryStore } from '@/modules/administration/stores';
import { useGlobalStore } from '@/stores';
import { useExportTable } from '@/composables/useExportTable';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';

const helpers = useHelpers();

const revenueCategoryStore = useRevenueCategoryStore();
const globalStore = useGlobalStore();

const { exportTable } = useExportTable();
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
const loadingActiveDropdownItems = ref(false);
const exportMenu = ref(null);
const defaultDialog = ref(false);
const activeDropdownItems = ref([]);
const formData = ref({
    name: '',
    description: '',
    parent_id: null,
    code: '',
    system_link: 'NC',
    is_billable: false,
    is_travel_charge: false,
    is_taxable: false,
    status: true
});

onBeforeMount(async () => {
    await getItems();
});

const menuItems = computed(() => {
    if (!selectedItem.value) return [];

    const allMenuItems = [
        {
            label: 'Edit',
            icon: 'pi pi-pencil',
            command: () => editItem(),
            permission: 'administration.edit'
        },
        {
            label: isItemActive.value ? 'Make Inactive' : 'Make Active',
            icon: isItemActive.value ? 'pi pi-times' : 'pi pi-check',
            command: () => showChangeStatusDialog(),
            permission: 'administration.edit'
        },
        isItemActive.value &&
            !isItemDefault.value && {
                label: 'Set as Default',
                icon: 'pi pi-star',
                command: () => showDefaultDialog(),
                permission: 'administration.edit'
            },
        {
            label: 'Delete',
            icon: 'pi pi-trash',
            command: () => showDeleteDialog(),
            permission: 'administration.delete'
        }
    ].filter(Boolean);

    return helpers.filterByPermission(allMenuItems);
});

const isItemActive = computed(() => {
    return selectedItem.value && selectedItem.value.status;
});

const isItemDefault = computed(() => {
    return selectedItem.value && selectedItem.value.is_default;
});

const exportMenuItems = [
    {
        icon: 'pi pi-file-excel',
        label: 'To Excel',
        command: () =>
            exportData({ table: 'revenue_categories', format: 'excel' })
    },
    {
        icon: 'pi pi-file-pdf',
        label: 'To PDF',
        command: () =>
            exportData({ table: 'revenue_categories', format: 'pdf' })
    }
];

const openDialog = (mode = 'add') => {
    isEditMode.value = mode === 'edit';
    showDialog.value = true;
    getActiveDropdownItems();
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
    formData.value.description = '';
    formData.value.parent_id = null;
    formData.value.code = '';
    formData.value.is_billable = false;
    formData.value.system_link = 'NC';
    formData.value.is_travel_charge = false;
    formData.value.is_taxable = false;
    formData.value.is_default = false;
    formData.value.status = true;
    globalStore.clearErrors();
};

const editItem = () => {
    resetForm();
    console.log(selectedItem.value);
    formData.value.name = selectedItem.value.name;
    formData.value.description = selectedItem.value.description;
    formData.value.parent_id = selectedItem.value.parent_id;
    formData.value.code = selectedItem.value.code;
    formData.value.is_billable = selectedItem.value.is_billable;
    formData.value.system_link = selectedItem.value.system_link;
    formData.value.is_travel_charge = selectedItem.value.is_travel_charge;
    formData.value.is_taxable = selectedItem.value.is_taxable;
    formData.value.is_default = selectedItem.value.is_default;
    formData.value.status = selectedItem.value.status;
    openDialog('edit');
};

const showDeleteDialog = () => {
    deleteDialog.value = true;
};

const showChangeStatusDialog = () => {
    changeStatusDialog.value = true;
};

const showDefaultDialog = () => {
    defaultDialog.value = true;
};

const showActions = (event, item) => {
    selectedItem.value = item;
    menu.value.toggle(event);
};

const showExportMenu = (event) => {
    exportMenu.value.toggle(event);
};

const exportData = async ({ table, format }) => {
    try {
        loading.value = true;
        const columns = ['display_name', 'code', 'status'];
        await exportTable({ table, format, columns });
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
        const payload = sortFilters.getSortFilters(searchText.value);
        const res = await revenueCategoryStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};

const getActiveDropdownItems = async (searchText = '') => {
    try {
        loadingActiveDropdownItems.value = true;
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
                },
                isEditMode.value && selectedItem.value?.id
                    ? {
                          field: 'id',
                          operator: '!=',
                          value: selectedItem.value.id
                      }
                    : null
            ].filter(Boolean)
        };
        const res = await revenueCategoryStore.search(payload, params);
        activeDropdownItems.value = res.data;
    } finally {
        loadingActiveDropdownItems.value = false;
    }
};

const save = async () => {
    try {
        if (items.value.length === 0) {
            formData.value.is_default = true;
        }
        busy.value = true;
        if (isEditMode.value) {
            await revenueCategoryStore.update(
                selectedItem.value.id,
                formData.value
            );
        } else {
            await revenueCategoryStore.create(formData.value);
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

const deleteItem = async () => {
    try {
        loading.value = true;
        if (selectedItem.value) {
            await revenueCategoryStore.deleteItem(selectedItem.value.id);
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
            await revenueCategoryStore.changeStatus(selectedItem.value.id);
        }
        await getItems();
        selectedItem.value = {};
    } finally {
        loading.value = false;
    }
};

const makeDefault = async () => {
    try {
        loading.value = true;
        if (selectedItem.value) {
            await revenueCategoryStore.makeDefault(selectedItem.value.id);
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
                <h1 class="text-2xl sm:text-3xl font-bold">
                    Revenue Category Setup
                </h1>
                <p class="mt-2 text-sm sm:text-base mx-auto sm:mx-0 mb-0">
                    These category items identify Revenue streams.
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
                v-if="$ability.can('administration.create')"
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
                    <div class="flex justify-end mb-5">
                        <Search
                            v-model="searchText"
                            @search="search"
                            class="w-full sm:w-1/2 md:w-1/3 lg:w-1/3"
                        />
                    </div>
                </template>
                <template #empty> No revenue categories found. </template>
                <Column
                    class="w-[30rem]"
                    :sortable="true"
                    field="display_name"
                    header="Name"
                >
                    <template #body="{ data }">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="flex items-center gap-4 flex-wrap">
                                    <span>
                                        {{ data.display_name }}
                                    </span>
                                    <Tag
                                        severity="info"
                                        v-if="data.is_default"
                                        value="Default"
                                    />
                                </div>
                            </div>

                            <i
                                v-tooltip.top="data.system_link"
                                v-if="data.system_link !== 'NC'"
                                class="pi pi-link ml-2 cursor-pointer text-blue-500"
                            ></i>
                        </div>
                    </template>
                </Column>

                <Column
                    class="w-[25rem]"
                    :sortable="true"
                    field="code"
                    header="Code"
                />

                <Column header="Status" :sortable="true" field="status">
                    <template #body="{ data }">
                        <StatusTag
                            :status="data.status ? 'active' : 'inactive'"
                        />
                    </template>
                </Column>

                <Column
                    v-if="
                        $ability.can('administration.edit') ||
                        $ability.can('administration.delete')
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
        v-if="
            $ability.can('administration.edit') ||
            $ability.can('administration.create')
        "
        v-model:visible="showDialog"
        @update:visible="onShow"
        :busy="busy"
        :isEditMode="isEditMode"
        :header="isEditMode ? 'Edit Revenue Category' : 'New Revenue Category'"
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
            <label class="block mb-3" for="parent_id">Parent Account</label>
            <ApiDropdown
                showClear
                filter
                placeholder="Select"
                :loading="loadingActiveDropdownItems"
                @search="getActiveDropdownItems"
                :options="activeDropdownItems"
                optionLabel="name"
                optionValue="id"
                id="parent_id"
                v-model="formData.parent_id"
                class="w-full"
                :disabled="busy || loadingActiveDropdownItems"
            />
        </div>

        <div class="mb-3 col-span-12 sm:col-span-12">
            <label class="block mb-3" for="code">Code</label>
            <InputField
                variant="text"
                id="code"
                v-model="formData.code"
                class="w-full"
                @keyup.enter="save"
                :disabled="busy"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block mb-3" for="description">Description</label>
            <InputField
                variant="textarea"
                id="description"
                v-model="formData.description"
                class="w-full"
                :disabled="busy"
            />
        </div>

        <div class="mb-4 col-span-12">
            <label class="block mb-3" for="system_link">System Link</label>
            <InputField
                variant="text"
                id="system_link"
                v-model="formData.system_link"
                class="w-full"
                @keyup.enter="save"
                :disabled="true"
            />
        </div>

        <div class="mb-2 col-span-12 flex flex-col gap-2">
            <div class="flex items-center gap-2 mb-2">
                <InputField
                    id="is_billable"
                    binary
                    inputId="is_billable"
                    variant="checkbox"
                    v-model="formData.is_billable"
                    :disabled="busy"
                />
                <label class="cursor-pointer" for="is_billable">
                    This category is non-billable
                </label>
            </div>

            <div class="flex items-center gap-2 mb-2">
                <InputField
                    id="is_travel_charge"
                    binary
                    inputId="is_travel_charge"
                    variant="checkbox"
                    v-model="formData.is_travel_charge"
                    :disabled="busy"
                />
                <label class="cursor-pointer" for="is_travel_charge">
                    This category is Travel Charge
                </label>
            </div>
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
        v-if="$ability.can('administration.delete')"
        v-model="deleteDialog"
        variant="danger"
        header="Delete Revenue Category"
        content="Are you sure you want to delete this revenue category?"
        @confirm="deleteItem"
    />

    <Confirmation
        v-if="$ability.can('administration.edit')"
        v-model="changeStatusDialog"
        variant="danger"
        :header="isItemActive ? 'Make Inactive' : 'Make Active'"
        :content="`Are you sure you want to make this revenue category ${isItemActive ? 'inactive' : 'active'}?`"
        :confirmButtonText="isItemActive ? 'Make Inactive' : 'Make Active'"
        @confirm="changeStatus"
    />

    <Confirmation
        v-if="$ability.can('administration.edit')"
        v-model="defaultDialog"
        variant="success"
        :header="`Set ${selectedItem?.name} as Default`"
        :content="`Are you sure you want to make this revenue category default?`"
        @confirm="makeDefault"
    />
</template>
