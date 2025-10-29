<script setup>
import { computed, ref, toRefs, watch } from 'vue';
import { useCustomerStore } from '@/modules/core/stores';
import { useClientTypeStore } from '@/modules/core/stores';
import { useCustomerGroupStore } from '@/modules/core/stores';
import { usePaymentTermStore } from '@/modules/administration/stores';
import { useRoute } from 'vue-router';
import { useHelpers } from '@/composables';
import countries from '@/static/countries.json';

const { filterActiveWithSelected } = useHelpers();
const customerStore = useCustomerStore();
const clientTypeStore = useClientTypeStore();
const paymentTermStore = usePaymentTermStore();
const customerGroupStore = useCustomerGroupStore();
const route = useRoute();

const props = defineProps({
    formData: { type: Object, required: true },
    busy: { type: Boolean, required: true, default: false },
    errors: { type: Object, required: true },
    statesOptions: { type: Array, required: true },
    getStates: { type: Function, required: true },
    validateZip: { type: Function, required: true }
});

const { formData, busy } = toRefs(props);
const emit = defineEmits(['save']);
const save = () => {
    emit('save');
};

const customers = ref([]);
const loadingCustomers = ref(false);
const groups = ref([]);
const loadingGroups = ref(false);
const paymentTerms = ref([]);
const loadingPaymentTerms = ref(false);
const clientTypes = ref([]);
const loadingClientTypes = ref(false);
const searchGroupText = ref('');
const searchClientTypeText = ref('');
const addingGroups = ref(false);
const addingClientTypes = ref(false);
const legalNameOverridden = ref(false);

const statusOptions = computed(() => {
    const base = [
        { name: 'Active', code: true },
        { name: 'Inactive', code: false }
    ];
    return base;
});

watch(
    () => formData.value.name,
    (newVal) => {
        if (!legalNameOverridden.value) {
            formData.value.legal_name = newVal ? newVal : null;
        }
    },
    { immediate: true }
);

watch(
    () => formData.value.legal_name,
    (newVal, oldVal) => {
        if (oldVal !== null && newVal !== (formData.value.name ?? null)) {
            legalNameOverridden.value = true;
        }
    }
);

const minutesDisplay = computed(() => {
    if (!formData.value.minimum_time_charge) return '';
    return Math.round(parseFloat(formData.value.minimum_time_charge) * 60);
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

watch(
    () => formData.value.client_type_id,
    () => {
        if (formData.value.client_type_id === 'add_new') {
            addClientType();
        }
    },
    { deep: true }
);

const getCustomers = async (searchText = '') => {
    try {
        loadingCustomers.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            filters: [
                { field: 'status', operator: '=', value: true },
                { field: 'id', operator: '!=', value: route.params.id }
            ]
        };
        const res = await customerStore.search(payload, params);
        customers.value = res.data;
    } finally {
        loadingCustomers.value = false;
    }
};

const getGroups = async (searchText = '') => {
    try {
        searchGroupText.value = searchText;
        loadingGroups.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            filters: [{ field: 'status', operator: '=', value: true }]
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

const addGroup = async () => {
    try {
        addingGroups.value = true;
        const payload = { name: searchGroupText.value, status: true };
        const res = await customerGroupStore.create(payload);
        await getGroups();
        formData.value.customer_group_id = res.data?.id;
    } catch (error) {
        console.error(error);
    } finally {
        addingGroups.value = false;
    }
};

const addClientType = async () => {
    try {
        addingClientTypes.value = true;
        const payload = { name: searchClientTypeText.value, status: true };
        const res = await clientTypeStore.create(payload);
        await getClientTypes();
        formData.value.client_type_id = res.data?.id;
    } catch (error) {
        console.error(error);
    } finally {
        addingClientTypes.value = false;
    }
};

const getPaymentTerms = async (searchText = '') => {
    try {
        loadingPaymentTerms.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText }
        };
        const res = await paymentTermStore.list(payload, params);
        paymentTerms.value = filterActiveWithSelected(
            res.data,
            formData.value.payment_term_id
        );
    } finally {
        loadingPaymentTerms.value = false;
    }
};

const getClientTypes = async (searchText = '') => {
    try {
        searchClientTypeText.value = searchText;
        loadingClientTypes.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            filters: [{ field: 'status', operator: '=', value: true }]
        };
        const res = await clientTypeStore.search(payload, params);
        const data = res.data || [];

        if (data.length === 0 && searchText) {
            clientTypes.value = [
                { id: 'add_new', name: `Click to create '${searchText}'` }
            ];
        } else {
            clientTypes.value = data;
        }
    } finally {
        loadingClientTypes.value = false;
    }
};
</script>

<template>
    <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-2 required">Customer Name</label>
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
            <label class="block mb-2">Code</label>
            <InputField
                id="code"
                :disabled="busy"
                class="w-full"
                v-model="formData.code"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3 required">Email</label>
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
            <label class="block mb-2 required">Status</label>
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
            <label class="block mb-2 required">Customer Legal Name</label>
            <InputField
                id="legal_name"
                :disabled="busy"
                class="w-full"
                v-model="formData.legal_name"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-2">Parent Customer</label>
            <ApiDropdown
                id="parent_id"
                showClear
                filter
                @search="getCustomers"
                placeholder="Select"
                class="w-full"
                v-model="formData.parent_id"
                :loading="loadingCustomers"
                :options="customers"
                optionLabel="name"
                optionValue="id"
                :disabled="busy || loadingCustomers"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-2">Customer Group</label>
            <ApiDropdown
                id="customer_group_id"
                showClear
                filter
                @search="getGroups"
                placeholder="Select"
                class="w-full"
                v-model="formData.customer_group_id"
                :loading="loadingGroups"
                :options="groups"
                optionLabel="name"
                optionValue="id"
                :disabled="busy || loadingGroups || addingGroups"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-2 required">Payment Term</label>
            <ApiDropdown
                id="payment_term_id"
                showClear
                filter
                @search="getPaymentTerms"
                placeholder="Select"
                class="w-full"
                v-model="formData.payment_term_id"
                :loading="loadingPaymentTerms"
                :options="paymentTerms"
                optionLabel="name"
                optionValue="id"
                :disabled="busy || loadingPaymentTerms"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-2">Client Type</label>
            <ApiDropdown
                id="client_type_id"
                showClear
                filter
                @search="getClientTypes"
                placeholder="Select"
                class="w-full"
                v-model="formData.client_type_id"
                :loading="loadingClientTypes"
                :options="clientTypes"
                optionLabel="name"
                optionValue="id"
                :disabled="busy || loadingClientTypes"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-2">Minimum Time Charge in Decimal</label>
            <InputField
                id="minimum_time_charge"
                v-model="formData.minimum_time_charge"
                variant="number"
                mode="decimal"
                :min="0"
                :maxFractionDigits="2"
                :minFractionDigits="2"
                inputClass="w-full"
                :useGrouping="false"
                class="w-full"
                @keyup.enter="save"
                :disabled="busy"
            />
            <p v-if="minutesDisplay" class="mt-1 mb-0 text-sm text-gray-600">
                {{ minutesDisplay }} minutes
            </p>
        </div>
        <div class="col-span-12">
            <div class="flex items-center gap-3">
                <InputField
                    inputId="has_customer_rate"
                    variant="switch"
                    v-model="formData.has_customer_rate"
                    :disabled="busy"
                />
                <label class="cursor-pointer mt-1" for="has_customer_rate"
                    >Enable if you wish to charge a common rate for this
                    customer for all employees.</label
                >
            </div>
        </div>
        <div class="col-span-12" v-if="formData.has_customer_rate">
            <label class="block mb-3 required">Customer Rate</label>
            <InputField
                id="customer_rate"
                :disabled="busy"
                class="w-full"
                v-model="formData.customer_rate"
                variant="number"
                @keyup.enter="save"
                prefix="$"
                :maxFractionDigits="2"
                :minFractionDigits="2"
                :min="0"
                :step="1"
            />
        </div>

        <div class="col-span-12">
            <label class="block mb-3 required">Travel Charges</label>
            <InputField
                id="travel_charges"
                :disabled="busy"
                class="w-full"
                v-model="formData.travel_charges"
                variant="number"
                @keyup.enter="save"
                :step="1"
                :min="0"
                :max="99.99"
                suffix="%"
                :useGrouping="false"
                :maxFractionDigits="2"
                :minFractionDigits="2"
            />
        </div>

        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-2 required">Customer Street Address</label>
            <InputField
                id="address"
                :disabled="busy"
                class="w-full"
                v-model="formData.address"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6">
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

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-2 required">State/Province</label>
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
            <label class="block mb-2 required">City</label>
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
            <label class="block mb-2 required">ZIP</label>
            <InputField
                id="zip"
                v-model="formData.zip"
                variant="text"
                class="w-full"
                :disabled="busy"
                @keyup.enter="save"
                :errorMessages="errors.zip"
                @input="validateZip"
            />
        </div>

        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-2">Customer Main Phone</label>
            <InputField
                id="phone"
                :disabled="busy"
                class="w-full"
                v-model="formData.phone"
                variant="phone"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-2">Customer Main Fax</label>
            <InputField
                id="fax"
                :disabled="busy"
                class="w-full"
                v-model="formData.fax"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12">
            <label class="block mb-2">Customer Notes</label>
            <InputField
                id="notes"
                :disabled="busy"
                class="w-full h-[8rem]"
                v-model="formData.notes"
                variant="textarea"
                maxlength="500"
            />
            <span
                :class="[
                    'block text-sm',
                    formData.notes?.length === 500
                        ? 'text-red-500'
                        : 'text-gray-600'
                ]"
            >
                {{ formData.notes?.length }} / 500 characters
            </span>
        </div>

        <div class="col-span-12">
            <label class="block mb-2">Integration Customer Link</label>
            <InputField
                id="integration_customer_link"
                :disabled="busy || true"
                class="w-full"
                v-model="formData.integration_customer_link"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 flex items-center gap-3 mt-3">
            <InputField
                id="consolidate_invoices"
                binary
                inputId="consolidate_invoices"
                variant="checkbox"
                v-model="formData.consolidate_invoices"
                :disabled="busy"
            />
            <label class="cursor-pointer" for="consolidate_invoices">
                Consolidate Invoices: Automatically combine project invoices
                into one customer invoice (same date only)
            </label>
        </div>

        <div class="col-span-12 flex items-center gap-3">
            <InputField
                id="invoice_reminders"
                binary
                inputId="invoice_reminders"
                variant="checkbox"
                v-model="formData.invoice_reminders"
                :disabled="busy"
            />
            <label class="cursor-pointer" for="invoice_reminders">
                Invoice Reminders: Send this customer email reminders about
                unpaid invoices
            </label>
        </div>
    </div>
</template>
