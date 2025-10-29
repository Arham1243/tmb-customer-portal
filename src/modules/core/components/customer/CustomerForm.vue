<script setup>
import { onBeforeMount, ref, nextTick } from 'vue';
import { useCustomerStore } from '@/modules/core/stores';
import {
    usePaymentTermStore,
    useMinimumChargeStore
} from '@/modules/administration/stores';
import { useGlobalStore, useSessionStore } from '@/stores';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useFormDirty } from '@/composables/useFormDirty';
import { useCountryStateZip } from '@/composables/useCountryStateZip';
import useEventsBus from '@/composables/useEventsBus';
import Details from '@/modules/core/components/customer/tabs/Details.vue';
import Contact from '@/modules/core/components/customer/tabs/Contact.vue';
import Audit from '@/modules/core/components/customer/tabs/Audit.vue';
import Financial from '@/modules/core/components/customer/tabs/Financial.vue';
import Activity from '@/modules/core/components/customer/tabs/Activity.vue';
import Project from '@/modules/core/components/customer/tabs/Project.vue';
import Team from '@/modules/core/components/customer/tabs/Team.vue';
import Billing from '@/modules/core/components/customer/tabs/billing/index.vue';

const globalStore = useGlobalStore();
const { emit } = useEventsBus();
const router = useRouter();
const route = useRoute();
const customerStore = useCustomerStore();
const paymentTermStore = usePaymentTermStore();
const minimumChargeStore = useMinimumChargeStore();
const sessionStore = useSessionStore();
const busy = ref(false);
const loading = ref(false);
const customerId = ref(route.params.id);
const showUnsavedDialog = ref(false);
const defaultPaymentTerm = ref({});
const myCompany = sessionStore?.myCompany;
const minimumTimeCharge = ref({});
const defaultCustomerTravelCharge = ref({});
const activeTab = ref('0');
const resetKey = ref(0);
let nextRoute = null;

const formData = ref({
    name: '',
    email: '',
    code: '',
    status: true,
    has_customer_rate: false,
    legal_name: '',
    parent_id: '',
    customer_rate: 0,
    travel_charges: 0,
    customer_group_id: '',
    payment_term_id: '',
    client_type_id: '',
    minimum_time_charge: 0,
    address: '',
    country: '',
    state: '',
    city: '',
    zip: '',
    phone: '',
    fax: '',
    notes: '',
    integration_customer_link: 'NC',
    consolidate_invoices: true,
    invoice_reminders: true
});
const { isDirty, resetDirty } = useFormDirty(formData);
const { isZipValid, getStates, validateZip, statesOptions, errors } =
    useCountryStateZip(formData);

onBeforeMount(async () => {
    globalStore.clearErrors();
    getDefaultPaymentTerm();
    getMinimumTimeCharge();
    getDefaultCustomerTravelCharge();
    await getItem();
    emit('updateDetailsBreadcrumb', customerStore.currentItem?.name || '');
});

onBeforeRouteLeave((to, from, next) => {
    if (isDirty.value) {
        showUnsavedDialog.value = true;
        nextRoute = next;
    } else {
        next();
    }
});

const pushRoute = (name, params = {}) => {
    router.push({ name, params });
};

function cancel() {
    showUnsavedDialog.value = true;
}

function goBack() {
    pushRoute('Customers');
}

function mapResponseToForm(data = {}) {
    const allowedKeys = Object.keys(formData.value);
    const mapped = {};

    if (data.country) {
        formData.value.country = data.country;
        getStates('load');
    }

    for (const key of allowedKeys) {
        if (key in data) {
            const value = data[key];
            mapped[key] = value == null ? formData.value[key] : value;
        }
    }
    mapped.customer_group_id = data.group?.id || '';
    mapped.parent_id = data.parent?.id || '';
    mapped.payment_term_id = data.payment_term?.id || '';
    mapped.client_type_id = data.client_type?.id || '';
    if (
        data.minimum_time_charge === undefined ||
        data.minimum_time_charge === null
    ) {
        mapped.minimum_time_charge = minimumTimeCharge.value;
    }
    if (
        Number(mapped.travel_charges) === 0 ||
        mapped.travel_charges === undefined ||
        mapped.travel_charges === null
    ) {
        mapped.travel_charges = defaultCustomerTravelCharge.value;
    }

    nextTick(() => {
        formData.value = {
            ...formData.value,
            ...mapped,
            payment_term_id: mapped.payment_term_id || defaultPaymentTerm.value
        };
    });
}

function confirmDiscard() {
    showUnsavedDialog.value = false;
    if (nextRoute) {
        const go = nextRoute;
        nextRoute = null;
        go();
    } else {
        resetForm();
    }
}

async function resetForm() {
    globalStore.clearErrors();
    await getItem();
    resetKey.value++;
    resetDirty(formData.value);
}

const save = async () => {
    try {
        busy.value = true;
        await customerStore.update(customerId.value, formData.value);
        resetForm();
        await getItem();
    } catch (error) {
        if (error.response?.data?.errors?.zip?.length > 0) {
            errors.value.zip = error.response.data.errors.zip;
        }
        if (error.response?.data?.errors?.state?.length > 0) {
            errors.value.state = error.response.data.errors.state;
        }
    } finally {
        busy.value = false;
    }
};

const getItem = async () => {
    if (!customerId.value) return;
    try {
        loading.value = true;
        await getMinimumTimeCharge();
        const params = {
            include: 'parent,group,clientType,paymentTerm'
        };
        const res = await customerStore.getItem(customerId.value, params);
        mapResponseToForm(res?.data);
        await nextTick();
        resetDirty(formData.value);
    } finally {
        loading.value = false;
    }
};

const getDefaultPaymentTerm = async () => {
    if (formData.value.payment_term_id) return;
    try {
        const payload = {
            filters: [{ field: 'is_default', operator: '=', value: 1 }]
        };
        const res = await paymentTermStore.list(payload, { limit: 1 });
        defaultPaymentTerm.value = res.data.length > 0 ? res.data[0].id : null;
    } catch (error) {
        console.log(error);
    }
};

const getMinimumTimeCharge = async () => {
    try {
        const payload = {
            filters: [
                { field: 'module_name', operator: '=', value: 'timesheets' },
                { field: 'status', operator: '=', value: 1 }
            ]
        };
        const res = await minimumChargeStore.list(payload, { limit: 1 });
        minimumTimeCharge.value = res.data[0]?.decimal_time ?? 0;
    } catch (error) {
        minimumTimeCharge.value = 0;
    }
};

const getDefaultCustomerTravelCharge = async () => {
    defaultCustomerTravelCharge.value =
        myCompany?.customer_default_travel_charge ?? 0;
};
</script>

<template>
    <Loader v-if="loading" />
    <template v-else>
        <TitleHeader>
            <template #title>
                <div class="flex items-center gap-5">
                    <Button
                        type="button"
                        variant="outlined"
                        icon="pi pi-chevron-left"
                        size="large"
                        @click="goBack"
                        iconClass="!text-sm"
                        :loading="busy"
                    />
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-bold capitalize">
                            {{ customerStore.currentItem?.name }}
                        </h1>
                    </div>
                </div>
            </template>
            <template #actions>
                <Button
                    label="Cancel"
                    variant="outlined"
                    class="w-full sm:w-auto"
                    @click="cancel"
                    :disabled="busy || !isDirty"
                />
                <Button
                    label="Save"
                    icon="pi pi-check"
                    iconPos="left"
                    class="w-full sm:w-auto"
                    @click="save"
                    :disabled="busy || !isDirty || !isZipValid"
                    :loading="busy"
                />
            </template>
        </TitleHeader>

        <Card class="tabs-card">
            <template #content>
                <Tabs v-model:value="activeTab">
                    <TabList>
                        <Tab value="0">Details</Tab>
                        <Tab value="1">Contacts</Tab>
                        <Tab value="2">Teams</Tab>
                        <Tab value="3">Projects</Tab>
                        <Tab value="4">Billing</Tab>
                        <Tab value="5">Activities</Tab>
                        <Tab value="6">Financials</Tab>
                        <Tab value="7">Portal Audit</Tab>
                    </TabList>
                    <div class="py-4">
                        <TabPanels>
                            <TabPanel value="0">
                                <Details
                                    :key="`details-${resetKey}`"
                                    :formData="formData"
                                    :busy="busy"
                                    @save="save"
                                    :errors="errors"
                                    :statesOptions="statesOptions"
                                    :getStates="getStates"
                                    :validateZip="validateZip"
                                />
                            </TabPanel>
                            <TabPanel value="1">
                                <Contact :key="`contacts-${resetKey}`" />
                            </TabPanel>
                            <TabPanel value="2">
                                <Team :key="`team-${resetKey}`" />
                            </TabPanel>
                            <TabPanel value="3">
                                <Project :key="`project-${resetKey}`" />
                            </TabPanel>
                            <TabPanel value="4">
                                <Billing :key="`billing-${resetKey}`" />
                            </TabPanel>
                            <TabPanel value="5">
                                <Activity :key="`activity-${resetKey}`" />
                            </TabPanel>
                            <TabPanel value="6">
                                <Financial :key="`financial-${resetKey}`" />
                            </TabPanel>
                            <TabPanel value="7">
                                <Audit :key="`audit-${resetKey}`" />
                            </TabPanel>
                        </TabPanels>
                    </div>
                </Tabs>
            </template>
        </Card>
    </template>

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
