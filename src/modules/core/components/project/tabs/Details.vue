<script setup>
import { ref, toRefs, watch } from 'vue';
import { statusOptions, yesNoOptions } from '@/config/enums';
import { useProjectTypeStore } from '@/modules/administration/stores';
import { useProjectStore, useCustomerStore } from '@/modules/core/stores';
import { useRoute } from 'vue-router';
import { useConfirm } from 'primevue/useconfirm';
import { useHelpers } from '@/composables/useHelpers';

const props = defineProps({
    formData: { type: Object, required: true },
    busy: { type: Boolean, required: true, default: false }
});

const confirm = useConfirm();
const emit = defineEmits(['save']);
const { formData, busy } = toRefs(props);
const route = useRoute();
const projectTypeStore = useProjectTypeStore();
const projectStore = useProjectStore();
const customerStore = useCustomerStore();
const shortNameOverridden = ref(false);
const loadingProjectTypes = ref(false);
const projectTypes = ref([]);
const loadingCustomers = ref(false);
const deletingProposal = ref(false);
const customers = ref([]);
const customerProposalFilename = ref('');
const customerProposalFile = ref(null);
const projectId = ref(route.params.id);
const showProposalDialog = ref(false);
const { isValidUrl, filterActiveWithSelected } = useHelpers();

watch(
    () => formData.value.name,
    (newVal) => {
        if (!shortNameOverridden.value) {
            formData.value.short_name = newVal ? newVal.slice(0, 50) : null;
        }
    }
);

watch(
    () => formData.value.short_name,
    (newVal, oldVal) => {
        if (
            oldVal !== null &&
            newVal !== (formData.value.name?.slice(0, 50) ?? null)
        ) {
            shortNameOverridden.value = true;
        }
    }
);

const save = () => {
    emit('save');
};

function onFileSelect(event) {
    const file = event.files[0];
    if (!file) return;
    customerProposalFile.value = file;
    customerProposalFilename.value = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
        formData.value.customer_proposal = e.target.result;
    };
    reader.readAsDataURL(file);
}

const deleteCustomerProposal = async () => {
    try {
        deletingProposal.value = true;
        await projectStore.deleteCustomerProposal(projectId.value);
        formData.value.customer_proposal = null;
        customerProposalFilename.value = '';
        customerProposalFile.value = null;
    } catch (error) {
        console.error(error);
    } finally {
        deletingProposal.value = false;
    }
};

const confirmDeleteProposal = (event) => {
    confirm.require({
        target: event.currentTarget,
        message: 'Are you sure you want to delete this file?',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: {
            label: 'Cancel',
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: 'Delete',
            severity: 'danger'
        },
        accept: () => {
            deleteCustomerProposal();
        }
    });
};

const viewProposal = () => {
    showProposalDialog.value = true;
};

const getProposalUrl = () => {
    if (isValidUrl(formData.value.customer_proposal)) {
        return formData.value.customer_proposal;
    }
    if (customerProposalFile.value) {
        return URL.createObjectURL(customerProposalFile.value);
    }
    return formData.value.customer_proposal;
};

const isPreviewableFile = () => {
    const filename = customerProposalFilename.value || '';
    return filename.toLowerCase().endsWith('.pdf');
};

const downloadProposal = () => {
    const url = getProposalUrl();
    const link = document.createElement('a');
    link.href = url;
    link.download = customerProposalFilename.value || 'proposal';
    link.click();
};

const getProjectTypes = async (searchText = '') => {
    try {
        loadingProjectTypes.value = true;
        const params = { limit: 300 };
        const payload = {
            search: {
                value: searchText
            }
        };
        const res = await projectTypeStore.list(payload, params);
        projectTypes.value = filterActiveWithSelected(
            res.data,
            formData.value.project_type_id
        );
    } finally {
        loadingProjectTypes.value = false;
    }
};

const getCustomers = async (searchText = '') => {
    try {
        loadingCustomers.value = true;
        const params = { limit: 300 };
        const payload = {
            search: {
                value: searchText
            }
        };
        const res = await customerStore.list(payload, params);
        customers.value = filterActiveWithSelected(
            res.data,
            formData.value.customer_id
        );
    } finally {
        loadingCustomers.value = false;
    }
};
</script>
<template>
    <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-3 required">Project Name</label>
            <InputField
                id="name"
                :disabled="busy"
                class="w-full"
                v-model="formData.name"
                variant="text"
                @keyup.enter="save"
            />
        </div>
        <div class="col-span-12 sm:col-span-6">
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
        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-3 required">Project Short Name</label>
            <InputField
                id="short_name"
                :disabled="busy"
                class="w-full"
                v-model="formData.short_name"
                variant="text"
                @keyup.enter="save"
            />
        </div>
        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-3 required" for="project_type_id"
                >Project Type</label
            >
            <ApiDropdown
                showClear
                filter
                placeholder="Select"
                :loading="loadingProjectTypes"
                @search="getProjectTypes"
                :options="projectTypes"
                optionLabel="name"
                optionValue="id"
                id="project_type_id"
                v-model="formData.project_type_id"
                class="w-full"
                :disabled="busy || loadingProjectTypes"
            />
        </div>
        <div class="col-span-12">
            <label class="block mb-3"
                >Is this a Global Project to be used by all customers.</label
            >
            <InputField
                id="is_global"
                :disabled="busy"
                class="w-full"
                v-model="formData.is_global"
                placeholder="Select"
                variant="dropdown"
                optionLabel="name"
                optionValue="code"
                :options="yesNoOptions"
            />
        </div>
        <div class="col-span-12 sm:col-span-6" v-if="!formData.is_global">
            <label class="block mb-3 required" for="customer_id"
                >Customer</label
            >
            <ApiDropdown
                showClear
                filter
                placeholder="Select"
                :loading="loadingCustomers"
                @search="getCustomers"
                :options="customers"
                optionLabel="name"
                optionValue="id"
                id="customer_id"
                v-model="formData.customer_id"
                class="w-full"
                :disabled="busy || loadingCustomers"
            />
        </div>
        <div class="col-span-12 sm:col-span-6" v-if="!formData.is_global">
            <label class="block mb-3">Customer Purchase Order (PO)</label>
            <InputField
                id="customer_po"
                :disabled="busy"
                class="w-full"
                v-model="formData.customer_po"
                variant="text"
                @keyup.enter="save"
            />
        </div>
        <div class="col-span-12" v-if="!formData.is_global">
            <label class="block mb-3">Attach Proposal</label>
            <div
                v-if="!isValidUrl(formData.customer_proposal)"
                class="p-inputtext w-full flex gap-4 items-center"
            >
                <FileUpload
                    name="customerProposal"
                    mode="basic"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    :disabled="busy"
                    :auto="true"
                    customUpload
                    @uploader="onFileSelect"
                />
                <span
                    v-if="customerProposalFilename"
                    class="text-primary-500 cursor-pointer hover:underline"
                    @click="viewProposal"
                >
                    {{ customerProposalFilename }}
                </span>
                <span v-else>No file chosen</span>
            </div>

            <div v-else class="w-full">
                <BlockUI
                    :blocked="deletingProposal"
                    class="flex items-center gap-4 w-full py-2"
                >
                    <Button
                        as="a"
                        :href="formData.customer_proposal"
                        target="_blank"
                        label="View Proposal"
                        icon="pi pi-file"
                        variant="outlined"
                    />
                    <ConfirmPopup></ConfirmPopup>
                    <Button
                        icon="pi pi-trash"
                        size="large"
                        text
                        rounded
                        severity="danger"
                        :disabled="deletingProposal"
                        @click="confirmDeleteProposal($event)"
                    />
                </BlockUI>
            </div>
        </div>

        <div class="col-span-12">
            <label class="block mb-3">Project Details</label>
            <InputField
                id="project_details"
                :disabled="busy"
                class="w-full h-40"
                v-model="formData.project_details"
                variant="textarea"
            />
        </div>
        <div class="col-span-12">
            <label class="block mb-3">Additional Invoice Notes</label>
            <InputField
                id="additional_notes"
                :disabled="busy"
                class="w-full"
                v-model="formData.additional_notes"
                variant="textarea"
            />
        </div>
        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-3">Retainer Amount</label>
            <InputField
                v-model="formData.retainer_amount"
                variant="number"
                prefix="$"
                :min="0"
                :minFractionDigits="2"
                :maxFractionDigits="2"
                :disabled="busy"
                class="w-full"
                inputId="retainer_amount"
                @keyup.enter="save"
            />
        </div>
        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-3">Monthly Fee</label>
            <InputField
                v-model="formData.monthly_fee_amount"
                variant="number"
                prefix="$"
                :min="0"
                :minFractionDigits="2"
                :maxFractionDigits="2"
                :disabled="busy"
                class="w-full"
                inputId="monthly_fee"
                @keyup.enter="save"
            />
        </div>
        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-3">Retainer (Customer friendly name)</label>
            <InputField
                id="retainer_label"
                :disabled="busy"
                class="w-full"
                v-model="formData.retainer_label"
                variant="text"
                @keyup.enter="save"
            />
        </div>
        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-3"
                >Monthly Fee (Customer friendly name)</label
            >
            <InputField
                id="monthly_fee_label"
                :disabled="busy"
                class="w-full"
                v-model="formData.monthly_fee_label"
                variant="text"
                @keyup.enter="save"
            />
        </div>
    </div>

    <Dialog
        maximizable
        v-model:visible="showProposalDialog"
        modal
        header="Proposal Preview"
        :style="{ width: '90vw', height: '90vh' }"
        :contentStyle="{ height: 'calc(90vh - 100px)' }"
    >
        <div class="h-full w-full">
            <div v-if="isPreviewableFile()" class="h-full w-full">
                <iframe
                    :src="getProposalUrl()"
                    class="w-full h-full border-0"
                    title="Proposal Document"
                />
            </div>
            <div
                v-else
                class="flex flex-col items-center justify-center h-full gap-4"
            >
                <i class="pi pi-file !text-6xl text-gray-400"></i>
                <p class="text-lg text-gray-600">
                    {{ customerProposalFilename }}
                </p>
                <p class="text-sm text-gray-500">
                    Preview not available for this file type
                </p>
                <Button
                    label="Download File"
                    icon="pi pi-download"
                    @click="downloadProposal"
                />
            </div>
        </div>
    </Dialog>
</template>
