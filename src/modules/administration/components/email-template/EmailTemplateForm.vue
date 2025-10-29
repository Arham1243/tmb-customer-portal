<script setup>
import { ref, onBeforeMount, computed } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { useEmailTemplateStore } from '@/modules/administration/stores';
import useEventsBus from '@/composables/useEventsBus';
import { useFormDirty } from '@/composables/useFormDirty';
import { useGlobalStore } from '@/stores';
import { useHelpers } from '@/composables';

const props = defineProps({
    mode: { type: String, required: true }
});

const { emit } = useEventsBus();
const { makeSlugToTitleCase } = useHelpers();
const router = useRouter();
const route = useRoute();
const emailTemplateStore = useEmailTemplateStore();
const globalStore = useGlobalStore();
const busy = ref(false);
const loading = ref(false);
const templateId = ref(route.params.id);
const isEditMode = ref(props.mode === 'edit');
const showUnsavedDialog = ref(false);
let nextRoute = null;
const previewImage = ref('');
const formData = ref({
    name: '',
    from: '',
    bcc_recipients: [],
    subject: '',
    greeting: '',
    body: '',
    button_text: '',
    footer: ''
});
const { isDirty, resetDirty } = useFormDirty(formData);
const templateVariables = {
    'reset-password': {
        greeting: ['{{ name }}'],
        body: ['{{ name }}'],
        footer: ['{{ year }}']
    },
    'setup-password': {
        greeting: ['{{ name }}'],
        body: ['{{ name }}'],
        footer: ['{{ year }}']
    },
    'expense-report-submitted-for-approver': {
        greeting: ['{{ name }}'],
        body: ['{{ submitted_by }}'],
        footer: ['{{ year }}']
    },
    'timesheet-submitted-for-approver': {
        greeting: ['{{ name }}'],
        body: ['{{ submitted_by }}'],
        footer: ['{{ year }}']
    },
    'expense-report-approved': {
        greeting: ['{{ name }}'],
        footer: ['{{ year }}']
    },
    'expense-report-rejected': {
        greeting: ['{{ name }}'],
        footer: ['{{ year }}']
    }
};
const supportedVariables = computed(
    () => templateVariables[emailTemplateStore.currentItem?.slug] || {}
);

onBeforeMount(async () => {
    if (isEditMode.value) {
        await getItem();
        emit(
            'updateDetailsBreadcrumb',
            makeSlugToTitleCase(emailTemplateStore.currentItem?.name)
        );
    }
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

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
}

async function resetForm() {
    if (isEditMode.value) {
        await getItem();
    } else {
        Object.assign(formData.value, {
            subject: '',
            name: '',
            from: '',
            bcc_recipients: [],
            greeting: '',
            body: '',
            button_text: '',
            footer: ''
        });
    }
    globalStore.clearErrors();
}

const save = async () => {
    try {
        busy.value = true;
        if (props.mode === 'new') {
            const res = await emailTemplateStore.create(formData.value);
            resetForm();
            pushRoute('EditEmailTemplate', { id: res?.data?.id });
        } else {
            await emailTemplateStore.update(templateId.value, formData.value);
            resetForm();
        }
        await getItem();
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
};

const getItem = async () => {
    if (!templateId.value) return;
    try {
        loading.value = true;
        const res = await emailTemplateStore.getItem(templateId.value);
        formData.value = {
            subject: res.data.subject || '',
            name: res.data.name || '',
            from: res.data.from || '',
            bcc_recipients: res.data.bcc_recipients || [],
            greeting: res.data.greeting || '',
            body: res.data.body || '',
            button_text: res.data.button_text || '',
            footer: res.data.footer || ''
        };
        resetDirty(formData.value);
        previewImage.value = res.data.preview_path;
    } finally {
        loading.value = false;
    }
};

function goBack() {
    pushRoute('EmailTemplates');
}
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
                        @click="goBack"
                    />
                    <h1 class="text-2xl font-bold">
                        {{
                            isEditMode
                                ? makeSlugToTitleCase(
                                      emailTemplateStore.currentItem?.slug
                                  )
                                : 'New Email Template'
                        }}
                    </h1>
                </div>
            </template>
            <template #actions>
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
                        <label class="block mb-2">BCC Recipients</label>
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
                        <label class="block mb-2 required">Button Text</label>
                        <InputField
                            variant="text"
                            id="button_text"
                            v-model="formData.button_text"
                            :disabled="busy"
                            class="w-full"
                            @keyup.enter="save"
                        />
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
                    <div class="col-span-12 !mt-10 text-center">
                        <h3 class="mb-6 text-black text-3xl font-bold">
                            Preview Image
                        </h3>
                        <Image
                            :src="previewImage"
                            :alt="formData.name"
                            preview
                            class="cursor-pointer max-w-fullrounded-lg border border-gray-200"
                            style="object-fit: contain"
                        />
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
