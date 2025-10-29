<script setup>
import { computed, onBeforeMount, ref } from 'vue';
import { useMinimumChargeStore } from '@/modules/administration/stores';
import { useGlobalStore } from '@/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';

const helpers = useHelpers();

const minimumChargeStore = useMinimumChargeStore();
const globalStore = useGlobalStore();

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
const changeStatusDialog = ref(false);
const formData = ref({
    module_name: '',
    minimum_minutes: 0,
    decimal_time: 0,
    update_customers_charge: false,
    status: true
});

onBeforeMount(async () => {
    await getItems();
});

const decimalTime = computed(() => {
    const min = Number(formData.value.minimum_minutes);
    if (!min) return '0.00';
    const v = Math.ceil((min / 60) * 100) / 100;
    return v.toFixed(2);
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
        }
    ];

    return helpers.filterByPermission(allMenuItems);
});

const isItemActive = computed(() => {
    return selectedItem.value && selectedItem.value.status;
});

const openDialog = (mode = 'add') => {
    isEditMode.value = mode === 'edit';
    showDialog.value = true;
};

const closeDialog = () => {
    showDialog.value = false;
    resetForm();
};

const onShow = () => {
    resetForm();
};

const resetForm = () => {
    formData.value.module_name = '';
    formData.value.minimum_minutes = 0;
    formData.value.decimal_time = 0;
    formData.value.update_customers_charge = false;
    formData.value.status = true;
    globalStore.clearErrors();
};

const editItem = () => {
    resetForm();
    formData.value.module_name = selectedItem.value.module_name;
    formData.value.minimum_minutes = selectedItem.value.minimum_minutes;
    formData.value.decimal_time = selectedItem.value.decimal_time;
    formData.value.update_customers_charge = false;
    formData.value.status = selectedItem.value.status;
    selectedItem.value.update_customers_charge =
        formData.value.update_customers_charge;
    openDialog('edit');
};

const showChangeStatusDialog = () => {
    changeStatusDialog.value = true;
};

const showActions = (event, item) => {
    selectedItem.value = item;
    menu.value.toggle(event);
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
        const params = { ...pagination.getPageParams() };
        const payload = sortFilters.getSortFilters(searchText.value);
        const res = await minimumChargeStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};

const save = async () => {
    try {
        formData.value.decimal_time = decimalTime.value;
        busy.value = true;
        if (isEditMode.value) {
            await minimumChargeStore.update(
                selectedItem.value.id,
                formData.value
            );
        } else {
            await minimumChargeStore.create(formData.value);
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
            await minimumChargeStore.deleteItem(selectedItem.value.id);
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
            await minimumChargeStore.changeStatus(selectedItem.value.id);
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
                    Minimum Charges Defaults
                </h1>
                <p class="mt-2 text-sm sm:text-base mx-auto sm:mx-0 mb-0">
                    These items will be used to define minimums.
                </p>
            </div>
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
                <template #empty> No minimum charges found. </template>
                <Column
                    class="capitalize"
                    :sortable="true"
                    field="module_name"
                    header="Activity"
                />

                <Column
                    :sortable="true"
                    field="minimum_minutes"
                    header="Minimum Minutes"
                />

                <Column
                    :sortable="true"
                    field="decimal_time"
                    header="Decimal Time"
                />

                <Column header="Status" :sortable="true" field="status">
                    <template #body="{ data }">
                        <StatusTag
                            :status="data.status ? 'active' : 'inactive'"
                        />
                    </template>
                </Column>

                <Column
                    v-if="$ability.can('administration.edit')"
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
        :header="isEditMode ? 'Edit Minimum Charge' : 'New Minimum Charge'"
        :confirmLabel="isEditMode ? 'Update' : 'Save'"
        :formData="formData"
        :initialData="isEditMode ? selectedItem : null"
        :enableDirtyCheck="true"
        @cancel="closeDialog"
        @confirm="save"
    >
        <div class="mb-3 col-span-12">
            <label class="block required mb-3" for="module_name">Activty</label>
            <InputField
                variant="text"
                id="module_name"
                v-model="formData.module_name"
                class="w-full"
                @keyup.enter="save"
                :disabled="busy"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block required mb-3" for="minimum_minutes"
                >Minimum Minutes</label
            >
            <InputField
                variant="number"
                id="minimum_minutes"
                v-model.number="formData.minimum_minutes"
                class="w-full"
                @keyup.enter="save"
                :useGrouping="false"
                inputClass="w-full"
                :disabled="busy"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block mb-3" for="decimal_time">Decimal Time</label>
            <InputField
                variant="text"
                id="decimal_time"
                :value="decimalTime"
                class="w-full"
                disabled
            />
        </div>

        <div class="mb-3 col-span-12 flex flex-col gap-2" v-if="isEditMode">
            <div class="flex items-center gap-2">
                <InputField
                    binary
                    inputId="is_update_customers_charge"
                    variant="checkbox"
                    v-model="formData.update_customers_charge"
                    :disabled="busy"
                />
                <label class="cursor-pointer" for="is_update_customers_charge">
                    Update All Customers Time Charge
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
        v-if="$ability.can('administration.edit')"
        v-model="changeStatusDialog"
        variant="danger"
        :header="isItemActive ? 'Make Inactive' : 'Make Active'"
        :content="`Are you sure you want to make this minimum charge ${isItemActive ? 'inactive' : 'active'}?`"
        :confirmButtonText="isItemActive ? 'Make Inactive' : 'Make Active'"
        @confirm="changeStatus"
    />
</template>
