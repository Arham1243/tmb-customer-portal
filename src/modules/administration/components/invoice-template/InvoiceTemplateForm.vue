<script setup>
import { ref, onBeforeMount, computed } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { useInvoiceTemplateStore } from '@/modules/administration/stores';
import useEventsBus from '@/composables/useEventsBus';
import { useFormDirty } from '@/composables/useFormDirty';
import { useGlobalStore } from '@/stores';

const { emit } = useEventsBus();
const router = useRouter();
const route = useRoute();
const invoiceTemplateStore = useInvoiceTemplateStore();
const globalStore = useGlobalStore();
const busy = ref(false);
const loading = ref(false);
const templateId = ref(route.params.id);
const showUnsavedDialog = ref(false);
let nextRoute = null;
const previewMenu = ref();

const previewMenuItems = [
    {
        label: 'Single Project',
        icon: 'pi pi-file',
        command: () => openSingleProjectPreview()
    },
    {
        label: 'Multiple Projects',
        icon: 'pi pi-copy',
        command: () => openMultipleProjectsPreview()
    }
];

const templateVariables = {
    'multi-project-invoice': {
        body: [
            '{{ invoice_number }}',
            '{{ projects_list }}',
            '{{ outstanding_balance }}'
        ],
        greeting: ['{{ name }}'],
        footer: ['{{ year }}']
    }
};

const isMultiProject = computed(
    () => invoiceTemplateStore.currentItem?.slug === 'multi-project-invoice'
);

const supportedVariables = computed(
    () => templateVariables[invoiceTemplateStore.currentItem?.slug] || {}
);

const formData = ref({
    name: '',
    from: '',
    subject: '',
    greeting: '',
    body: '',
    footer: '',
    bcc_recipients: []
});
const { isDirty, resetDirty } = useFormDirty(formData);

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
}

onBeforeMount(async () => {
    await getItem();
    emit('updateDetailsBreadcrumb', invoiceTemplateStore.currentItem?.name);
});

onBeforeRouteLeave((to, from, next) => {
    if (isDirty.value) {
        showUnsavedDialog.value = true;
        nextRoute = next;
    } else {
        next();
    }
});

const pushRoute = (name, params = {}) => router.push({ name, params });

function cancel() {
    if (isDirty.value) {
        showUnsavedDialog.value = true;
    } else {
        getItem();
    }
}

function confirmDiscard() {
    showUnsavedDialog.value = false;
    if (nextRoute) {
        const go = nextRoute;
        nextRoute = null;
        go();
    } else {
        getItem();
    }
}

async function resetForm() {
    Object.assign(formData.value, {
        name: '',
        from: '',
        subject: '',
        greeting: '',
        body: '',
        footer: '',
        bcc_recipients: []
    });
    resetDirty(formData.value);
    globalStore.clearErrors();
}

const save = async () => {
    try {
        busy.value = true;
        await invoiceTemplateStore.update(templateId.value, formData.value);
        resetForm();
        await getItem();
    } catch (error) {
        bccRecipientsErrors.value = error.response.data.errors.bcc_recipients;
    } finally {
        busy.value = false;
    }
};

const getItem = async () => {
    if (!templateId.value) return;
    try {
        loading.value = true;
        const res = await invoiceTemplateStore.getItem(templateId.value);
        formData.value = {
            name: res.data.name || '',
            from: res.data.from || '',
            subject: res.data.subject || '',
            greeting: res.data.greeting || '',
            body: res.data.body || '',
            footer: res.data.footer || '',
            bcc_recipients: res.data.bcc_recipients || []
        };
        resetDirty(formData.value);
    } finally {
        loading.value = false;
    }
};

const openSingleProjectPreview = () => {
    const previewPath = invoiceTemplateStore.currentItem?.preview_path;
    if (previewPath) window.open(previewPath, '_blank');
};

const openMultipleProjectsPreview = () => {
    const previewPath = invoiceTemplateStore.currentItem?.preview_multiple_path;
    if (previewPath) window.open(previewPath, '_blank');
};

const openDefaultPreview = () => {
    const previewPath = invoiceTemplateStore.currentItem?.preview_path;
    if (previewPath) window.open(previewPath, '_blank');
};
</script>

<template>
    <Loader v-if="loading" />
    <template v-else>
        <TitleHeader>
            <template #title>
                <div class="flex items-center gap-5">
                    <Button
                        variant="outlined"
                        icon="pi pi-chevron-left"
                        @click="pushRoute('InvoiceTemplates')"
                    />
                    <h1 class="text-2xl font-bold">
                        {{ invoiceTemplateStore.currentItem?.name }}
                    </h1>
                </div>
            </template>
            <template #actions>
                <SplitButton
                    v-if="isMultiProject"
                    icon="pi pi-eye"
                    class="p-button-outlined"
                    label="View Invoice PDF"
                    :model="previewMenuItems"
                />
                <Button
                    v-else
                    label="View Invoice PDF"
                    icon="pi pi-eye"
                    variant="outlined"
                    @click="openDefaultPreview"
                />
                <Button
                    label="Cancel"
                    variant="outlined"
                    @click="cancel"
                    :disabled="!isDirty || busy"
                />
                <Button
                    :disabled="!isDirty || busy"
                    label="Save"
                    icon="pi pi-check"
                    @click="save"
                    :loading="busy"
                />
            </template>
        </TitleHeader>

        <Card class="py-3 px-2">
            <template #content>
                <div class="grid grid-cols-12 gap-4 space-y-2">
                    <div class="col-span-12">
                        <label class="block mb-2 required">Template Name</label>
                        <InputField
                            variant="text"
                            id="name"
                            v-model="formData.name"
                            @keyup.enter="save"
                            :disabled="busy"
                            class="w-full"
                        />
                    </div>
                    <div class="col-span-12">
                        <label class="block mb-2 required">from</label>
                        <InputField
                            variant="text"
                            id="from"
                            v-model="formData.from"
                            @keyup.enter="save"
                            :disabled="busy"
                            class="w-full"
                        />
                    </div>
                    <div class="col-span-12">
                        <label class="block mb-2 required"
                            >BCC Recipients</label
                        >
                        <BccRecipientsField
                            id="bcc_recipients"
                            v-model="formData.bcc_recipients"
                            :disabled="busy"
                            placeholder="Add recipients"
                        />
                    </div>
                    <div class="col-span-12">
                        <label class="block mb-2 required">Subject</label>
                        <InputField
                            variant="text"
                            id="subject"
                            v-model="formData.subject"
                            @keyup.enter="save"
                            :disabled="busy"
                            class="w-full"
                        />
                    </div>
                    <div class="col-span-12">
                        <label class="block mb-2 required">Greeting</label>
                        <InputField
                            variant="text"
                            id="greeting"
                            v-model="formData.greeting"
                            :disabled="busy"
                            class="w-full"
                            @keyup.enter="save"
                        />
                        <div class="mt-1 flex flex-wrap gap-2 items-center">
                            <span class="text-gray-600 text-sm font-medium">
                                Supported Variables:
                            </span>
                            <span
                                v-tooltip.top="`Click to copy`"
                                v-for="v in supportedVariables.greeting"
                                :key="v"
                                class="flex items-center bg-blue-50 text-blue-800 text-sm font-medium px-3 py-1 rounded-full shadow-sm cursor-pointer transition hover:bg-blue-100"
                                @click="copyToClipboard(v)"
                            >
                                {{ v }}
                            </span>
                        </div>
                        <p class="text-gray-500 text-sm mt-1">
                            The <code>name</code> variable will be replaced with
                            the selected customer contact.
                        </p>
                    </div>
                    <div class="col-span-12">
                        <label class="block mb-2 required">Body</label>
                        <InputField
                            variant="textarea"
                            id="body"
                            v-model="formData.body"
                            :disabled="busy"
                            class="w-full h-40"
                        />

                        <div
                            class="mt-1 flex flex-wrap gap-2 items-center"
                            v-if="supportedVariables?.body?.length"
                        >
                            <span class="text-gray-600 text-sm font-medium">
                                Supported Variables:
                            </span>
                            <span
                                v-tooltip.top="`Click to copy`"
                                v-for="v in supportedVariables.body"
                                :key="v"
                                class="flex items-center bg-blue-50 text-blue-800 text-sm font-medium px-3 py-1 rounded-full shadow-sm cursor-pointer transition hover:bg-blue-100"
                                @click="copyToClipboard(v)"
                            >
                                {{ v }}
                            </span>
                        </div>
                    </div>
                    <div class="col-span-12">
                        <label class="block mb-2 required">Footer</label>
                        <InputField
                            variant="text"
                            id="footer"
                            v-model="formData.footer"
                            :disabled="busy"
                            class="w-full"
                            @keyup.enter="save"
                        />
                        <div class="mt-1 flex flex-wrap gap-2 items-center">
                            <span class="text-gray-600 text-sm font-medium">
                                Supported Variables:
                            </span>
                            <span
                                v-tooltip.top="`Click to copy`"
                                v-for="v in supportedVariables.footer"
                                :key="v"
                                class="flex items-center bg-blue-50 text-blue-800 text-sm font-medium px-3 py-1 rounded-full shadow-sm cursor-pointer transition hover:bg-blue-100"
                                @click="copyToClipboard(v)"
                            >
                                {{ v }}
                            </span>
                        </div>
                    </div>
                </div>
            </template>
        </Card>

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
</template>
