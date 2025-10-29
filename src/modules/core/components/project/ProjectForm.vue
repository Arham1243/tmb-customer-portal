<script setup>
import { onBeforeMount, ref, nextTick } from 'vue';
import { useProjectStore } from '@/modules/core/stores';
import { useGlobalStore } from '@/stores';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import useEventsBus from '@/composables/useEventsBus';
import { useFormDirty } from '@/composables/useFormDirty';
import Details from '@/modules/core/components/project/tabs/Details.vue';
import Task from '@/modules/core/components/project/tabs/Task.vue';
import Budget from '@/modules/core/components/project/tabs/Budget.vue';
import Financial from '@/modules/core/components/project/tabs/Financial.vue';
import Activity from '@/modules/core/components/project/tabs/Activity.vue';
import Attachment from '@/modules/core/components/project/tabs/Attachment.vue';
import { useHelpers } from '@/composables/useHelpers';

const globalStore = useGlobalStore();
const { filterFileFields } = useHelpers();
const { emit } = useEventsBus();
const router = useRouter();
const route = useRoute();
const projectStore = useProjectStore();
const busy = ref(false);
const loading = ref(false);
const projectId = ref(route.params.id);
const showUnsavedDialog = ref(false);
const activeTab = ref('0');
const resetKey = ref(0);
let nextRoute = null;

const formData = ref({
    name: null,
    short_name: null,
    project_type_id: null,
    customer_id: null,
    customer_po: null,
    project_details: null,
    additional_notes: null,
    retainer_amount: null,
    retainer_label: null,
    monthly_fee_amount: null,
    monthly_fee_label: null,
    is_global: false,
    status: true,
    customer_proposal: null
});
const { isDirty, resetDirty } = useFormDirty(formData);

onBeforeMount(async () => {
    globalStore.clearErrors();
    await getItem();
    emit('updateDetailsBreadcrumb', projectStore.currentItem?.name || '');
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
    pushRoute('Projects');
}

function mapResponseToForm(data = {}) {
    const allowedKeys = Object.keys(formData.value);
    const mapped = {};

    for (const key of allowedKeys) {
        if (key in data) {
            const value = data[key];
            mapped[key] = value == null ? formData.value[key] : value;
        }
    }

    mapped.customer_id = data.customer?.id || '';
    mapped.customer_po = data.customer_po || '';
    mapped.customer_proposal = data.customer_proposal || '';
    mapped.project_type_id = data.projectType?.id || '';

    nextTick(() => {
        formData.value = {
            ...formData.value,
            ...mapped
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
        const payload = filterFileFields(formData.value, ['customer_proposal']);
        await projectStore.update(projectId.value, payload);
        resetForm();
        await getItem();
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
};

const getItem = async () => {
    if (!projectId.value) return;
    try {
        loading.value = true;
        const params = {
            include: 'customer,projectType'
        };
        const res = await projectStore.getItem(projectId.value, params);
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
                            {{ projectStore.currentItem?.name }}
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
                    :disabled="busy || !isDirty"
                    :loading="busy"
                />
            </template>
        </TitleHeader>

        <Card class="tabs-card">
            <template #content>
                <Tabs v-model:value="activeTab">
                    <TabList>
                        <Tab value="0">Details</Tab>
                        <Tab value="1">Tasks</Tab>
                        <Tab value="2">Budget</Tab>
                        <Tab value="3">Activities</Tab>
                        <Tab value="4">Financials</Tab>
                        <Tab value="5">Attachments</Tab>
                    </TabList>
                    <div class="py-4">
                        <TabPanels>
                            <TabPanel value="0">
                                <Details
                                    :key="`details-${resetKey}`"
                                    :formData="formData"
                                    :busy="busy"
                                    @save="save"
                                />
                            </TabPanel>
                            <TabPanel value="1">
                                <Task :key="`task-${resetKey}`" />
                            </TabPanel>
                            <TabPanel value="2">
                                <Budget :key="`budget-${resetKey}`" />
                            </TabPanel>
                            <TabPanel value="3">
                                <Activity :key="`activity-${resetKey}`" />
                            </TabPanel>
                            <TabPanel value="4">
                                <Financial :key="`financial-${resetKey}`" />
                            </TabPanel>
                            <TabPanel value="5">
                                <Attachment :key="`attachment-${resetKey}`" />
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
