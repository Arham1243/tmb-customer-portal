<script setup>
import { computed, onBeforeMount, ref, toRefs, watch } from 'vue';
import { useRoleStore, useUserStore } from '@/modules/administration/stores';
import { useCustomerStore } from '@/modules/core/stores';
import { useSessionStore } from '@/stores';
import { useHelpers } from '@/composables/useHelpers';
import countries from '@/static/countries.json';

const roleStore = useRoleStore();
const userStore = useUserStore();
const customerStore = useCustomerStore();
const sessionStore = useSessionStore();
const { makeTitleCase } = useHelpers();

const props = defineProps({
    formData: { type: Object, required: true },
    busy: { type: Boolean, required: true, default: false },
    isEditMode: { type: Boolean, required: true, default: false },
    errors: { type: Object, required: true },
    statesOptions: { type: Array, required: true },
    getStates: { type: Function, required: true },
    validateZip: { type: Function, required: true }
});

const { formData, busy, errors, statesOptions, isEditMode } = toRefs(props);
const getStates = props.getStates;
const validateZip = props.validateZip;
const roles = ref([]);
const loadingRoles = ref(false);
const supervisors = ref([]);
const primaryApprovers = ref([]);
const secondaryApprovers = ref([]);
const loadingSupervisors = ref(false);
const loadingPrimaryApprovers = ref(false);
const loadingSecondaryApprovers = ref(false);
const loadingCustomers = ref(false);
const customers = ref([]);
const emit = defineEmits(['save']);
const save = () => {
    emit('save');
};

onBeforeMount(() => {
    getCompanyDetails();
});
watch(
    () => formData.value.last_day_at_service,
    (val) => {
        if (!isEditMode.value) return;
        if (!val) return;
        if (formData.value.status === 'pending') return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastDay = new Date(val);
        lastDay.setHours(0, 0, 0, 0);

        formData.value.status = lastDay < today ? 'inactive' : 'active';
    },
    { immediate: true }
);

const statusOptions = computed(() => {
    if (!isEditMode.value) {
        return [{ name: 'Pending', code: 'pending' }];
    }

    const base = [
        { name: 'Active', code: 'active' },
        { name: 'Inactive', code: 'inactive' }
    ];

    if (formData.value.status === 'pending') {
        base.push({ name: 'Pending', code: 'pending' });
    }

    return base;
});

const filteredPrimaryApprovers = computed(() => {
    if (!formData.value.secondary_approver_id) return primaryApprovers.value;
    return primaryApprovers.value.filter(
        (u) => u.id !== formData.value.secondary_approver_id
    );
});

const filteredSecondaryApprovers = computed(() => {
    if (!formData.value.primary_approver_id) return secondaryApprovers.value;
    return secondaryApprovers.value.filter(
        (u) => u.id !== formData.value.primary_approver_id
    );
});

const getCompanyDetails = async () => {
    if (formData.value.country !== '') return;
    try {
        formData.value.country = sessionStore.myCompany?.country;
        await getStates('load');
    } catch (error) {
        console.error(error);
    }
};

const getRoles = async (searchText = '') => {
    try {
        loadingRoles.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            sort: [{ field: 'name', order: 'asc' }],
            filters: [{ field: 'status', operator: '=', value: 1 }]
        };
        const res = await roleStore.search(payload, params);
        roles.value = res.data?.map((r) => ({
            id: r.id,
            name: makeTitleCase(r.name)
        }));
    } finally {
        loadingRoles.value = false;
    }
};

const getCustomers = async (searchText = '') => {
    try {
        loadingCustomers.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            sort: [{ field: 'name', order: 'asc' }],
            filters: [{ field: 'status', operator: '=', value: 1 }]
        };
        const res = await customerStore.search(payload, params);
        customers.value = res.data;
    } finally {
        loadingCustomers.value = false;
    }
};

const buildFilters = () => {
    const filters = [{ field: 'status', operator: '=', value: 'active' }];
    return filters;
};

const isLastDayRequired = computed(() => formData.value.status === 'inactive');

const getUsers = async (key, searchText = '') => {
    const userConfigs = {
        supervisors: {
            list: supervisors,
            loading: loadingSupervisors,
            role: 'manager'
        },
        primaryApprovers: {
            list: primaryApprovers,
            loading: loadingPrimaryApprovers,
            role: 'approver'
        },
        secondaryApprovers: {
            list: secondaryApprovers,
            loading: loadingSecondaryApprovers,
            role: 'approver'
        }
    };
    const { list, loading } = userConfigs[key];
    loading.value = true;
    try {
        const res = await userStore.search(
            {
                search: { value: searchText },
                sort: [{ field: 'name', order: 'asc' }],
                filters: buildFilters()
            },
            { limit: 300 }
        );
        list.value =
            res.data?.map((u) => ({ id: u.id, name: makeTitleCase(u.name) })) ||
            [];
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3 required">Username</label>
            <InputField
                id="username"
                :disabled="busy"
                class="w-full"
                v-model="formData.username"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3 required">Full Name</label>
            <InputField
                id="name"
                :disabled="busy"
                class="w-full"
                v-model="formData.name"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3 required">Status</label>
            <InputField
                id="status"
                :disabled="busy"
                class="w-full"
                v-model="formData.status"
                placeholder="Select"
                variant="dropdown"
                optionLabel="name"
                optionValue="code"
                :options="statusOptions"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3 required">Primary Email</label>
            <InputField
                id="email"
                :disabled="busy"
                class="w-full"
                v-model="formData.email"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3 required">Mobile Phone</label>
            <InputField
                id="phone"
                :disabled="busy"
                class="w-full"
                v-model="formData.phone"
                variant="phone"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3 required">Role</label>
            <ApiDropdown
                id="role_id"
                showClear
                filter
                @search="getRoles"
                placeholder="Select"
                class="w-full"
                v-model="formData.role_id"
                :loading="loadingRoles"
                :options="roles"
                optionLabel="name"
                optionValue="id"
                :disabled="busy || loadingRoles"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label
                class="block mb-3"
                :class="{ required: supervisors.length > 0 }"
            >
                Supervisor/Manager
            </label>
            <ApiDropdown
                id="supervisor_id"
                placeholder="Select"
                class="w-full"
                showClear
                filter
                :loading="loadingSupervisors"
                @search="getUsers('supervisors')"
                v-model="formData.supervisor_id"
                :options="supervisors"
                optionLabel="name"
                optionValue="id"
                :disabled="busy || loadingSupervisors"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label
                class="block mb-3"
                :class="{ required: filteredPrimaryApprovers.length > 0 }"
            >
                Primary Approver
            </label>

            <ApiDropdown
                showClear
                filter
                id="primary_approver_id"
                placeholder="Select"
                class="w-full"
                :loading="loadingPrimaryApprovers"
                @search="getUsers('primaryApprovers')"
                v-model="formData.primary_approver_id"
                :options="filteredPrimaryApprovers"
                optionLabel="name"
                optionValue="id"
                :disabled="busy || loadingPrimaryApprovers"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Secondary Approver</label>
            <ApiDropdown
                showClear
                filter
                id="secondary_approver_id"
                placeholder="Select"
                class="w-full"
                :loading="loadingSecondaryApprovers"
                @search="getUsers('secondaryApprovers')"
                v-model="formData.secondary_approver_id"
                :options="filteredSecondaryApprovers"
                optionLabel="name"
                optionValue="id"
                :disabled="busy || loadingSecondaryApprovers"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
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
                @change="() => getStates('change')"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">State/Province</label>
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

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">City</label>
            <InputField
                id="city"
                :disabled="busy"
                class="w-full"
                v-model="formData.city"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">ZIP</label>
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

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Street Address 1</label>
            <InputField
                id="street_address_1"
                :disabled="busy"
                class="w-full"
                v-model="formData.street_address_1"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Street Address 2</label>
            <InputField
                id="street_address_2"
                :disabled="busy"
                class="w-full"
                v-model="formData.street_address_2"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3 required">Start Date</label>
            <InputField
                id="start_date"
                :disabled="busy"
                class="w-full"
                v-model="formData.start_date"
                variant="date"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3" :class="{ required: isLastDayRequired }"
                >Last Day at Service</label
            >
            <InputField
                id="last_day_at_service"
                :disabled="busy"
                class="w-full"
                v-model="formData.last_day_at_service"
                variant="date"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Date of Birth</label>
            <InputField
                id="date_of_birth"
                :disabled="busy"
                class="w-full"
                v-model="formData.date_of_birth"
                variant="date"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Secondary Email</label>
            <InputField
                id="secondary_email"
                :disabled="busy"
                class="w-full"
                v-model="formData.secondary_email"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Secondary Phone</label>
            <InputField
                id="secondary_phone"
                :disabled="busy"
                class="w-full"
                v-model="formData.secondary_phone"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Anniversary Date</label>
            <InputField
                id="anniversary_date"
                :disabled="busy"
                class="w-full"
                v-model="formData.anniversary_date"
                variant="date"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Emergency Contact Name</label>
            <InputField
                id="emergency_contact_name"
                :disabled="busy"
                class="w-full"
                v-model="formData.emergency_contact_name"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Emergency Contact Phone</label>
            <InputField
                id="emergency_contact_phone"
                :disabled="busy"
                class="w-full"
                v-model="formData.emergency_contact_phone"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Emergency Contact Email</label>
            <InputField
                id="emergency_contact_email"
                :disabled="busy"
                class="w-full"
                v-model="formData.emergency_contact_email"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 flex items-center gap-3">
            <InputField
                id="can_work_all_customers"
                binary
                inputId="can_work_all_customers"
                variant="checkbox"
                v-model="formData.can_work_all_customers"
                :disabled="busy"
            />
            <label class="cursor-pointer" for="can_work_all_customers">
                Can Work With All Customers
            </label>
        </div>

        <div
            class="col-span-12 sm:col-span-6 lg:col-span-4"
            v-if="!formData.can_work_all_customers"
        >
            <label class="block mb-3">
                Select Customers this User Can Work With
            </label>
            <ApiMultiselect
                id="customers"
                placeholder="Select"
                class="w-full"
                showClear
                filter
                :loading="loadingCustomers"
                @search="getCustomers"
                v-model="formData.customers"
                :options="customers"
                optionLabel="name"
                optionValue="id"
                :disabled="busy || loadingCustomers"
            />
        </div>
    </div>
</template>
