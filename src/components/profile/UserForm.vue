<script setup>
import { onBeforeMount, ref, nextTick } from 'vue';
import { useGlobalStore } from '@/stores';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { useProfileStore } from '@/stores';
import { useSessionStore } from '@/stores';
import UserInfo from '@/components/profile/tabs/UserInfo.vue';
import UserPermissions from '@/components/profile/tabs/UserPermissions.vue';
import { useFormDirty } from '@/composables/useFormDirty';
import { useCountryStateZip } from '@/composables/useCountryStateZip';
import { useHelpers } from '@/composables/useHelpers';

const globalStore = useGlobalStore();
const router = useRouter();
const sessionStore = useSessionStore();
const profileStore = useProfileStore();
const currentUser = sessionStore.user;
const { filterFileFields } = useHelpers();

const busy = ref(false);
const loading = ref(false);
const showUnsavedDialog = ref(false);
const activeTab = ref('0');
const userId = currentUser.id;

const resetKey = ref(0);
let nextRoute = null;

const formData = ref({
    username: '',
    name: '',
    status: 'pending',
    email: '',
    phone: '',
    role_id: '',
    supervisor_id: '',
    primary_approver_id: '',
    secondary_approver_id: '',
    street_address_1: '',
    street_address_2: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    start_date: '',
    last_day_at_service: '',
    date_of_birth: '',
    secondary_email: '',
    secondary_phone: '',
    anniversary_date: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_email: '',
    base_cost_per_hour: 0,
    average_overhead_factor: 0,
    effective_cost_per_hour: 0,
    default_user_billing_rate_per_hour: 0,
    margin_rate: 0,
    permissions: [],
    profile_image: null
});

const { isDirty, resetDirty } = useFormDirty(formData, null, {
    excludeKeys: ['permissions']
});
const { isZipValid, getStates, validateZip, statesOptions, errors } =
    useCountryStateZip(formData);

onBeforeMount(async () => {
    globalStore.clearErrors();
    await getItem();
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
    pushRoute('Dashboard');
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
            mapped[key] = value ?? formData.value[key];
        } else {
            // Preserve default values for keys not in API response
            mapped[key] = formData.value[key];
        }
    }

    mapped.role_id = data.role?.id || '';
    mapped.supervisor_id = data.supervisor?.id || '';
    mapped.primary_approver_id = data.primaryApprover?.id || '';
    mapped.secondary_approver_id = data.secondaryApprover?.id || '';

    nextTick(() => {
        formData.value = { ...formData.value, ...mapped };
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
        const payload = filterFileFields(formData.value, ['profile_image']);
        await profileStore.update(userId, payload);
        resetForm();
        window.location.reload();
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
};

const getItem = async () => {
    if (!userId) return;
    try {
        loading.value = true;
        const params = {
            include: 'role,supervisor,primaryApprover,secondaryApprover'
        };

        const res = await profileStore.getItem(userId, params);
        mapResponseToForm(res?.data);

        await nextTick();
        resetDirty(formData.value);
    } finally {
        loading.value = false;
    }
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
                            My Profile
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
                        <Tab value="0">Information</Tab>
                        <Tab value="2">Permissions</Tab>
                    </TabList>
                    <div class="py-4">
                        <TabPanels>
                            <TabPanel value="0">
                                <UserInfo
                                    :key="`info-${resetKey}`"
                                    :formData="formData"
                                    :busy="busy"
                                    @save="save"
                                    :errors="errors"
                                    :statesOptions="statesOptions"
                                    :getStates="getStates"
                                    :validateZip="validateZip"
                                />
                            </TabPanel>
                            <TabPanel value="2">
                                <UserPermissions
                                    :key="`permissions-${resetKey}`"
                                    :formData="formData"
                                    :busy="busy"
                                    @save="save"
                                />
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
