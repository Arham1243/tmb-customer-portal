<script setup>
import { computed, onBeforeMount, ref } from 'vue';
import { useCustomerUserStore, useCustomerStore } from '@/modules/core/stores';
import { useGlobalStore } from '@/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';
import { useRoute } from 'vue-router';

const { filterByPermission, moneyFormat } = useHelpers();
const route = useRoute();

const customerUserStore = useCustomerUserStore();
const customerStore = useCustomerStore();
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
const deleteDialog = ref(false);
const customerId = route.params.id;
const customer = customerStore.currentItem;
const users = ref([]);
const loadingUsers = ref(false);
const formData = ref({
    user_id: '',
    customer_rate: 0,
    default_user_billing_rate_per_hour: 0,
    travel_charges: 0
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

const openDialog = (mode = 'add') => {
    isEditMode.value = mode === 'edit';
    showDialog.value = true;
    getUsers();
};

const closeDialog = () => {
    showDialog.value = false;
    resetForm();
};

const onShow = () => {
    resetForm();
};

const resetForm = () => {
    formData.value.user_id = '';
    formData.value.customer_rate = 0;
    formData.value.default_user_billing_rate_per_hour = 0;
    formData.value.travel_charges = 0;
    globalStore.clearErrors();
};

const editItem = () => {
    resetForm();
    formData.value.user_id = selectedItem.value.user_id;
    formData.value.customer_rate = selectedItem.value.customer_rate;
    formData.value.default_user_billing_rate_per_hour =
        selectedItem.value.default_user_billing_rate_per_hour;
    formData.value.travel_charges = selectedItem.value.travel_charges;
    openDialog('edit');
};

const showDeleteDialog = () => {
    deleteDialog.value = true;
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
        const payload = {
            ...sortFilters.getSortFilters(searchText.value),
            includes: [{ relation: 'user' }],
            filters: [
                { field: 'customer_id', operator: '=', value: customerId }
            ]
        };
        const res = await customerUserStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};

const save = async () => {
    try {
        const modifiedFormData = {
            ...formData.value,
            customer_id: customerId
        };
        busy.value = true;
        if (isEditMode.value) {
            await customerUserStore.update(
                selectedItem.value.id,
                modifiedFormData
            );
        } else {
            await customerUserStore.create(modifiedFormData);
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
            await customerUserStore.deleteItem(selectedItem.value.id);
        }
        await getItems();
        selectedItem.value = {};
    } finally {
        loading.value = false;
    }
};

const updateDefaults = async () => {
    if (!formData.value.customer_rate) {
        if (customer.has_customer_rate) {
            formData.value.customer_rate = customer.customer_rate;
        } else {
            formData.value.customer_rate =
                formData.value.default_user_billing_rate_per_hour;
        }
    }
    if (!formData.value.travel_charges) {
        formData.value.travel_charges = customer.travel_charges;
    }
};

const getUsers = async (searchText = '') => {
    try {
        loadingUsers.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            sort: [{ field: 'name', order: 'asc' }],
            filters: [{ field: 'status', operator: '=', value: 'active' }],
            customFilters: [
                {
                    field: 'customer',
                    operator: '=',
                    value: customerId
                }
            ]
        };
        const res = await customerUserStore.unassignedUsers(
            customerId,
            payload,
            params
        );
        users.value = res.data;
    } finally {
        loadingUsers.value = false;
    }
};

const onChangeUser = (user) => {
    const userId = user.value;
    const userObj = users.value.find((user) => user.id === userId);
    formData.value.default_user_billing_rate_per_hour =
        userObj?.default_user_billing_rate_per_hour;
    updateDefaults();
};
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
                    <Button
                        v-if="$ability.can('customers.create')"
                        label="Add Member"
                        @click="openDialog('add')"
                    />
                </div>
            </div>
        </template>
        <template #empty> No team members found. </template>

        <Column :sortable="true" field="user.name" header="User Name" />

        <Column
            :sortable="true"
            field="default_user_billing_rate_per_hour"
            header="Default User Bill Rate"
        >
            <template #body="{ data }">
                {{ moneyFormat(data.default_user_billing_rate_per_hour) }}
            </template>
        </Column>

        <Column :sortable="true" field="customer_rate" header="Customer Rate">
            <template #body="{ data }">
                {{ moneyFormat(data.customer_rate) }}
            </template>
        </Column>

        <Column :sortable="true" field="travel_charges" header="Travel Charges">
            <template #body="{ data }"> {{ data.travel_charges }}% </template>
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

    <BaseDialog
        v-if="
            $ability.can('customers.edit') || $ability.can('customers.create')
        "
        v-model:visible="showDialog"
        @update:visible="onShow"
        :busy="busy"
        :isEditMode="isEditMode"
        :header="isEditMode ? 'Edit User' : 'New User'"
        :confirmLabel="isEditMode ? 'Update' : 'Save'"
        :formData="formData"
        :initialData="isEditMode ? selectedItem : null"
        :enableDirtyCheck="true"
        @cancel="closeDialog"
        @confirm="save"
    >
        <div class="mb-3 col-span-12">
            <label
                class="block mb-3"
                :class="{ required: !isEditMode }"
                for="user_id"
            >
                {{ isEditMode ? 'User' : 'Select User' }}</label
            >
            <ApiDropdown
                v-if="!isEditMode"
                showClear
                filter
                placeholder="Select"
                :loading="loadingUsers"
                @search="getUsers"
                @change="onChangeUser"
                :options="users"
                optionLabel="name"
                optionValue="id"
                id="user_id"
                v-model="formData.user_id"
                class="w-full"
                :disabled="busy || loadingUsers"
            />
            <InputField
                v-else
                :disabled="true"
                class="w-full"
                v-model="selectedItem.user.name"
                variant="text"
            />
        </div>
        <div class="mb-3 col-span-12" v-if="formData.user_id">
            <label class="block mb-3">Default User Bill Rate</label>
            <InputField
                id="default_user_billing_rate_per_hour"
                :disabled="true"
                class="w-full"
                v-model="formData.default_user_billing_rate_per_hour"
                variant="number"
                @keyup.enter="save"
                prefix="$"
                :maxFractionDigits="2"
                :minFractionDigits="2"
                :step="0.01"
                :min="0.01"
            />
        </div>
        <div class="mb-3 col-span-12" v-if="formData.user_id">
            <label class="block mb-3 required">Customer Rate</label>
            <InputField
                id="customer_rate"
                :disabled="busy"
                class="w-full"
                v-model="formData.customer_rate"
                variant="number"
                @keyup.enter="save"
                prefix="$"
                :min="0"
                :maxFractionDigits="2"
                :minFractionDigits="2"
            />
        </div>
        <div class="mb-3 col-span-12" v-if="formData.user_id">
            <label class="block mb-3 required">Travel Charges</label>
            <InputField
                id="travel_charges"
                :disabled="busy"
                class="w-full"
                v-model="formData.travel_charges"
                variant="number"
                @keyup.enter="save"
                :maxFractionDigits="2"
                :minFractionDigits="2"
                :min="0"
                :max="99"
                suffix="%"
                :useGrouping="false"
            />
        </div>
    </BaseDialog>

    <Confirmation
        v-if="$ability.can('customers.delete')"
        v-model="deleteDialog"
        variant="danger"
        header="Delete Contact Type"
        content="Are you sure you want to delete this user?"
        @confirm="deleteItem"
    />
</template>
