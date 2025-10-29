<script setup>
import { computed, nextTick, onBeforeMount, ref, watch } from 'vue';
import {
    useCustomerContactStore,
    useCustomerStore
} from '@/modules/core/stores';
import { useContactTypeStore } from '@/modules/administration/stores';
import { useGlobalStore } from '@/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';
import { useRoute } from 'vue-router';
import countries from '@/static/countries.json';
import { useCountryStateZip } from '@/composables/useCountryStateZip';
import { useFormDirty } from '@/composables/useFormDirty';
import { useSessionStore } from '@/stores';

const route = useRoute();
const customerStore = useCustomerStore();
const customerContactStore = useCustomerContactStore();
const contactTypeStore = useContactTypeStore();
const globalStore = useGlobalStore();
const sessionStore = useSessionStore();
const { filterByPermission, filterActiveWithSelected } = useHelpers();

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
const contactTypes = ref([]);
const loadingContactTypes = ref(false);
const defaultContactType = ref({});
const customerId = route.params.id;
const customer = customerStore.currentItem;
const formData = ref({
    first_name: '',
    last_name: '',
    title: '',
    email: '',
    phone: '',
    contact_type_id: '',
    address: customer?.address || '',
    country: '',
    state: '',
    default_invoice_receipient: false,
    city: customer?.city || '',
    zip: customer?.zip || ''
});
const { isDirty } = useFormDirty(formData, selectedItem);
const { isZipValid, getStates, validateZip, statesOptions, errors } =
    useCountryStateZip(formData);
const columnsMenuItems = ref([
    {
        field: 'first_name',
        name: 'Name',
        sortable: true,
        disabled: true
    },
    { field: 'title', name: 'Title', sortable: true },
    { field: 'contactType.name', name: 'Contact Type', sortable: true },
    { field: 'email', name: 'Email', sortable: true, disabled: true },
    { field: 'phone', name: 'Phone', sortable: true },
    { field: 'country', name: 'Country', sortable: true },
    {
        field: 'customer_portal_access',
        name: 'Customer Portal Access',
        sortable: false
    }
]);
const visibleColumns = ref([...columnsMenuItems.value]);
const columnSelectionsRef = ref(null);

onBeforeMount(async () => {
    await getItems();
    if (customer?.country) {
        await getStates('load');
    }
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
    ];

    return filterByPermission(allMenuItems);
});

const toggleColumnSelections = () => {
    columnSelectionsRef.value.show();
};

const openDialog = async (mode = 'add') => {
    getDefaultContactType();
    if (!formData.value.phone) {
        formData.value.phone = customer.phone;
    }
    if (!formData.value.address) {
        formData.value.address = sessionStore.myCompany.address;
    }
    if (!formData.value.country) {
        formData.value.country = sessionStore.myCompany.country;
    }
    if (!formData.value.city) {
        formData.value.city = sessionStore.myCompany.city;
    }
    if (!formData.value.zip) {
        formData.value.zip = sessionStore.myCompany.zip;
    }
    // nexttick()
    await getStates('load');
    if (!formData.value.state) {
        formData.value.state = sessionStore.myCompany.state;
    }
    showDialog.value = true;
    isEditMode.value = mode === 'edit';
};

const closeDialog = () => {
    showDialog.value = false;
    resetForm();
};

const onShow = () => {
    resetForm();
};

const resetForm = () => {
    formData.value.first_name = '';
    formData.value.last_name = '';
    formData.value.title = '';
    formData.value.email = '';
    formData.value.phone = '';
    formData.value.contact_type_id = '';
    formData.value.address = '';
    formData.value.country = customer.country;
    formData.value.state = '';
    formData.value.city = '';
    formData.value.zip = '';
    formData.value.default_invoice_receipient = false;
    globalStore.clearErrors();
};

const editItem = () => {
    resetForm();
    formData.value.country = selectedItem.value.country;
    formData.value.first_name = selectedItem.value.first_name;
    formData.value.last_name = selectedItem.value.last_name;
    formData.value.title = selectedItem.value.title;
    formData.value.email = selectedItem.value.email;
    formData.value.phone = selectedItem.value.phone;
    formData.value.contact_type_id = selectedItem.value.contact_type_id;
    formData.value.address = selectedItem.value.address;
    formData.value.city = selectedItem.value.city;
    formData.value.zip = selectedItem.value.zip;
    formData.value.default_invoice_receipient =
        selectedItem.value.default_invoice_receipient;
    // nextTick(() => {
    formData.value.state = selectedItem.value.state;
    // });
    getStates('load');
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

const getContactTypes = async (searchText = '') => {
    try {
        loadingContactTypes.value = true;
        const params = { limit: 300 };
        const payload = {
            search: {
                value: searchText
            }
        };
        const res = await contactTypeStore.list(payload, params);
        contactTypes.value = filterActiveWithSelected(
            res.data,
            formData.value.contact_type_id
        );
    } finally {
        loadingContactTypes.value = false;
    }
};

const getDefaultContactType = async () => {
    if (formData.value.contact_type_id) return;
    try {
        const payload = {
            filters: [{ field: 'is_default', operator: '=', value: 1 }]
        };
        const res = await contactTypeStore.list(payload, { limit: 1 });
        defaultContactType.value = res.data.length > 0 ? res.data[0].id : null;
        formData.value.contact_type_id = defaultContactType.value;
    } catch (error) {
        console.log(error);
    }
};

const getItems = async () => {
    try {
        loading.value = true;
        const params = { ...pagination.getPageParams() };
        const payload = {
            ...sortFilters.getSortFilters(searchText.value),
            includes: [{ relation: 'contactType' }],
            filters: [
                {
                    field: 'customer_id',
                    operator: '=',
                    value: customerId
                }
            ]
        };
        const res = await customerContactStore.search(payload, params);
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
            await customerContactStore.update(
                selectedItem.value.id,
                modifiedFormData
            );
        } else {
            await customerContactStore.create(modifiedFormData);
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
        console.log(selectedItem.value.id);
        loading.value = true;
        if (selectedItem.value) {
            await customerContactStore.deleteItem(selectedItem.value.id);
        }
        await getItems();
        selectedItem.value = {};
    } finally {
        loading.value = false;
    }
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
        class="custom-spacing-th"
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
                        :options="columnsMenuItems"
                        optionLabel="name"
                        optionDisabled="disabled"
                        style="width: 1px !important"
                    />
                    <Button
                        v-if="$ability.can('customers.create')"
                        label="Add Contact"
                        @click="openDialog('add')"
                    />
                </div>
            </div>
        </template>
        <template #empty> No contacts found. </template>

        <Column
            v-for="(col, idx) in visibleColumns"
            :key="col.field + '_' + idx"
            :field="col.field"
            :header="col.name"
            :sortable="col.sortable"
        >
            <template v-if="col.field === 'first_name'" #body="{ data }">
                <div>
                    <span class="whitespace-nowrap"
                        >{{ data.first_name }} {{ data.last_name }}</span
                    >
                    <br />
                    <Tag
                        severity="info"
                        v-if="data.default_invoice_receipient"
                        value="Invoice Recipient"
                        class="mt-2"
                    />
                </div>
            </template>
            <template v-else-if="col.field === 'email'" #body="{ data }">
                <span>{{ data.email }}</span>
            </template>

            <template v-else-if="col.field === 'status'" #body="{ data }">
                <StatusTag :status="data.status ? 'active' : 'inactive'" />
            </template>
            <template
                v-else-if="col.field === 'customer_portal_access'"
                #body="{ data }"
            >
                <StatusTag
                    v-if="data.customer_portal_access"
                    :status="data.customer_portal_access ? 'Yes' : 'No'"
                />
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
        v-if="
            $ability.can('customers.edit') || $ability.can('customers.create')
        "
        v-model:visible="showDialog"
        @update:visible="onShow"
        :busy="busy"
        :isEditMode="isEditMode"
        :header="isEditMode ? 'Edit Contact' : 'New Contact'"
        :confirmLabel="isEditMode ? 'Update' : 'Save'"
        :formData="formData"
        :initialData="isEditMode ? selectedItem : null"
        :enableDirtyCheck="true"
        @cancel="closeDialog"
        @confirm="save"
    >
        <div class="mb-3 col-span-12">
            <label class="block mb-3" for="customer_name">Customer name</label>
            <InputField
                variant="text"
                id="customer_name"
                v-model="customer.name"
                class="w-full"
                :disabled="true"
            />
        </div>
        <div class="mb-3 col-span-6">
            <label class="block required mb-3" for="first_name"
                >First Name</label
            >
            <InputField
                variant="text"
                id="first_name"
                v-model="formData.first_name"
                class="w-full"
                @keyup.enter="save"
                :disabled="busy"
            />
        </div>
        <div class="mb-3 col-span-6">
            <label class="block required mb-3" for="last_name">Last Name</label>
            <InputField
                variant="text"
                id="last_name"
                v-model="formData.last_name"
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
            <label class="block mb-3" for="phone">Phone</label>
            <InputField
                variant="phone"
                id="phone"
                v-model="formData.phone"
                class="w-full"
                @keyup.enter="save"
                :disabled="busy"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block mb-3" for="title">Title</label>
            <InputField
                variant="text"
                id="title"
                v-model="formData.title"
                class="w-full"
                @keyup.enter="save"
                :disabled="busy"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block mb-3 required" for="contact_type_id"
                >Contact Type</label
            >
            <ApiDropdown
                showClear
                filter
                placeholder="Select"
                :loading="loadingContactTypes"
                @search="getContactTypes"
                :options="contactTypes"
                optionLabel="name"
                optionValue="id"
                id="contact_type_id"
                v-model="formData.contact_type_id"
                class="w-full"
                :disabled="busy || loadingContactTypes"
            />
        </div>
        <div class="col-span-12 !mt-0">
            <label class="block mb-2">Street Address</label>
            <InputField
                id="address"
                :disabled="busy"
                class="w-full"
                v-model="formData.address"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12">
            <label class="block mb-2 required">Country</label>
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
                @change="() => getStates('change')"
            />
        </div>

        <div class="col-span-12">
            <label class="block mb-2">State/Province</label>
            <InputField
                id="state"
                showClear
                filter
                :disabled="busy"
                class="w-full"
                v-model="formData.state"
                variant="dropdown"
                placeholder="Select"
                optionLabel="name"
                optionValue="name"
                :options="statesOptions"
                :errorMessages="errors.state"
            />
        </div>

        <div class="col-span-12">
            <label class="block mb-2">City</label>
            <InputField
                id="city"
                :disabled="busy"
                class="w-full"
                v-model="formData.city"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12">
            <label class="block mb-2">ZIP</label>
            <InputField
                id="zip"
                v-model="formData.zip"
                variant="text"
                class="w-full"
                :disabled="busy"
                :errorMessages="errors.zip"
                @input="validateZip"
            />
        </div>
        <div class="mb-3 col-span-12">
            <div class="flex items-center gap-3">
                <InputField
                    inputId="default_invoice_receipient"
                    variant="checkbox"
                    binary
                    v-model="formData.default_invoice_receipient"
                    :disabled="busy"
                />
                <label class="cursor-pointer" for="default_invoice_receipient">
                    Default Invoice Recipient
                </label>
            </div>
        </div>

        <template #footer>
            <Button
                text
                variant="outlined"
                label="Cancel"
                @click="closeDialog"
                :disabled="busy"
                class="mr-2"
                type="button"
            />
            <Button
                icon="pi pi-check"
                iconPos="left"
                :loading="busy"
                :disabled="!isDirty || busy || !isZipValid"
                :label="isEditMode ? 'Update' : 'Save'"
                @click="save"
            />
        </template>
    </BaseDialog>

    <Confirmation
        v-if="$ability.can('customers.delete')"
        v-model="deleteDialog"
        variant="danger"
        header="Delete Contact"
        content="Are you sure you want to delete this contact?"
        @confirm="deleteItem"
    />
</template>
<style>
.custom-spacing-th th {
    padding-inline: 0.5rem;
}
</style>
