<script setup>
import { ref, onBeforeMount, watch, computed, nextTick } from 'vue';
import { useCustomerContactStore } from '@/modules/core/stores';
import { useRoute, useRouter } from 'vue-router';
import useEventsBus from '@/composables/useEventsBus';
import { useHelpers } from '@/composables/useHelpers';
import { useInvoiceStore } from '@/modules/accounting/stores';
import SummaryBox from '@/modules/accounting/components/approval/SummaryBox.vue';
import TimesheetTable from '@/modules/accounting/components/approval/tables/TimesheetTable.vue';
import ExpenseTable from '@/modules/accounting/components/approval/tables/ExpenseTable.vue';
import AdditionalItemsTable from '@/modules/accounting/components/approval/tables/AdditionalItemsTable.vue';
import { useInvoiceTemplateStore } from '@/modules/administration/stores';
import BccRecipientsField from '@/components/common/BccRecipientsField.vue';
const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}`;

const router = useRouter();
const route = useRoute();
const { emit } = useEventsBus();
const invoiceTemplateStore = useInvoiceTemplateStore();
const invoiceStore = useInvoiceStore();
const customerContactStore = useCustomerContactStore();
const { moneyFormat } = useHelpers();

const loading = ref(false);
const busy = ref(false);
const savingResources = ref(false);
const showUnsavedDialog = ref(false);
const invoiceId = ref(route.params.id);
const activeTab = ref('0');
const activeProjectTab = ref('0');
const details = ref(null);
const changedItems = ref({
    timesheets: new Map(),
    expenses: new Map(),
    additionalItems: new Map()
});
const customerNotes = ref('');
const printCustomerNotesOnInvoice = ref(false);
const approvalDialogVisible = ref(false);
const projectNotes = ref({});
const invoiceTemplates = ref([]);
const loadingInvoiceTemplates = ref(false);
const printProjectNotesOnInvoice = ref({});
const bccRecipients = ref([]);
const customerContacts = ref([]);
const loadingContacts = ref(false);
const customerNotesError = ref('');
const projectNotesErrors = ref({});
const advancePayment = ref(0);
const allowedCreditLocal = ref(0);

const formData = ref({
    invoice_template: {},
    bcc_recipients: [],
    selected_contacts: []
});

// Clear customer notes error when switch is turned off or user types
watch(printCustomerNotesOnInvoice, (newVal) => {
    if (!newVal) {
        customerNotesError.value = '';
    }
});

watch(customerNotes, () => {
    if (customerNotesError.value) {
        customerNotesError.value = '';
    }
});

// Clear project notes errors when switch is turned off or user types
watch(
    printProjectNotesOnInvoice,
    (newVal, oldVal) => {
        Object.keys(newVal).forEach((projectId) => {
            if (!newVal[projectId] && oldVal[projectId]) {
                delete projectNotesErrors.value[projectId];
            }
        });
    },
    { deep: true }
);

watch(
    projectNotes,
    (newVal, oldVal) => {
        Object.keys(newVal).forEach((projectId) => {
            if (
                newVal[projectId] !== oldVal[projectId] &&
                projectNotesErrors.value[projectId]
            ) {
                delete projectNotesErrors.value[projectId];
            }
        });
    },
    { deep: true }
);

onBeforeMount(async () => {
    await getInvoiceDetails();
    emit('updateDetailsBreadcrumb', details.value?.invoice?.invoice_number);
});

const hasChanges = computed({
    get: () =>
        changedItems.value.timesheets.size > 0 ||
        changedItems.value.expenses.size > 0 ||
        changedItems.value.additionalItems.size > 0,
    set: (val) => {
        if (!val) {
            changedItems.value.timesheets.clear();
            changedItems.value.expenses.clear();
            changedItems.value.additionalItems.clear();
        }
    }
});

const previousTab = ref('1');
const handleTabChange = (newValue) => {
    if (hasChanges.value) {
        showUnsavedDialog.value = true;
        // revert immediately so PrimeVue doesn’t switch visually
        nextTick(() => (activeTab.value = previousTab.value));
        return;
    }
    previousTab.value = newValue;
};

const confirmDiscard = () => {
    showUnsavedDialog.value = false;
    hasChanges.value = false;
    nextTick(() => {
        activeTab.value = '0';
        previousTab.value = '0';
        getInvoiceDetails();
    });
};

const cancelDiscard = () => {
    showUnsavedDialog.value = false;
    nextTick(() => (activeTab.value = previousTab.value));
};

const handleItemChanged = ({ id, type, data }) => {
    if (type === 'timesheet') {
        changedItems.value.timesheets.set(id, data);
    } else if (type === 'expense') {
        changedItems.value.expenses.set(id, data);
    } else if (type === 'additional_item') {
        changedItems.value.additionalItems.set(id, data);
    }
};

const saveAll = async () => {
    try {
        savingResources.value = true;
        const promises = [];

        // Bulk update timesheets
        if (changedItems.value.timesheets.size > 0) {
            const timesheets = Array.from(
                changedItems.value.timesheets.values()
            ).map((ts) => ({
                id: ts.id,
                billable_hours: ts.billable_hours,
                charge_rate: ts.charge_rate,
                description: ts.description
            }));
            promises.push(
                invoiceStore.bulkUpdateInvoiceTimesheets(invoiceId.value, {
                    timesheets
                })
            );
        }

        // Bulk update expenses
        if (changedItems.value.expenses.size > 0) {
            const expenses = Array.from(
                changedItems.value.expenses.values()
            ).map((exp) => ({
                id: exp.id,
                billable_amount: exp.billable_amount,
                description: exp.description
            }));
            promises.push(
                invoiceStore.bulkUpdateInvoiceExpenses(invoiceId.value, {
                    expenses
                })
            );
        }

        // Bulk update additional items
        if (changedItems.value.additionalItems.size > 0) {
            const additionalItems = Array.from(
                changedItems.value.additionalItems.values()
            ).map((item) => ({
                id: item.id,
                billable_amount: item.billable_amount,
                description: item.description
            }));
            promises.push(
                invoiceStore.bulkUpdateInvoiceAdditionalItems(invoiceId.value, {
                    additional_items: additionalItems
                })
            );
        }

        await Promise.all(promises);

        // Clear changed items after successful save
        changedItems.value.timesheets.clear();
        changedItems.value.expenses.clear();
        changedItems.value.additionalItems.clear();

        // Refresh data
        await getInvoiceDetails();
    } catch (error) {
        console.error('Error saving changes:', error);
    } finally {
        savingResources.value = false;
    }
};

const isPopupApproveButtonDisabled = computed(() => {
    return (
        busy.value ||
        loadingContacts.value ||
        !formData.value.invoice_template?.id ||
        formData.value.selected_contacts?.length === 0
    );
});

const getInvoiceDetails = async () => {
    loading.value = true;
    try {
        const res = await invoiceStore.getInvoiceDetails(invoiceId.value);
        details.value = res?.data;
        allowedCreditLocal.value = details.value?.allowed_customer_credit || 0;
        populateNotes();
    } catch (error) {
        pushRoute('InvoiceApprovals');
    } finally {
        loading.value = false;
    }
};

const openApprovalDialog = async () => {
    getCustomerContacts();
    getInvoiceTemplates();
    approvalDialogVisible.value = true;
};

const onShow = () => {
    resetForm();
};

const resetForm = () => {
    formData.value.invoice_template = {};
    bccRecipients.value = [];
    customerNotesError.value = '';
    projectNotesErrors.value = {};
    advancePayment.value = 0;
    formData.value.selected_contacts = customerContacts.value.filter(
        (contact) => contact.default_invoice_receipient
    );
};

const closeApprovalDialog = () => {
    approvalDialogVisible.value = false;
};

const populateNotes = () => {
    // Customer Notes
    customerNotes.value = details.value?.invoice?.customer?.notes || '';

    // Project Notes
    projectNotes.value = {};
    printProjectNotesOnInvoice.value = {};
    details.value?.projects?.forEach((project) => {
        projectNotes.value[project.id] = project.additional_notes || '';
        printProjectNotesOnInvoice.value[project.id] = true;
    });
};
const pushRoute = (name) => {
    router.push({ name });
};

const handleTimesheetRefresh = async () => {
    await getInvoiceDetails();
};

const handleExpenseRefresh = async () => {
    await getInvoiceDetails();
};

const handleAdditionalItemRefresh = async () => {
    await getInvoiceDetails();
};

function transformNotesPayload(data) {
    return {
        customer: {
            notes: data.customer_notes,
            print_on_invoice: data.print_customer_notes_on_invoice
        },
        projects: Object.keys(data.project_notes || {}).map((id) => ({
            id: Number(id),
            notes: data.project_notes[id],
            print_on_invoice: data.print_project_notes_on_invoice?.[id] || false
        }))
    };
}

const validateNotes = () => {
    let isValid = true;
    customerNotesError.value = '';
    projectNotesErrors.value = {};

    // Validate customer notes
    if (printCustomerNotesOnInvoice.value && !customerNotes.value?.trim()) {
        customerNotesError.value =
            'Customer notes are required when "Print on Invoice" is enabled';
        isValid = false;
    }

    // Validate project notes
    details.value?.projects?.forEach((project) => {
        if (
            printProjectNotesOnInvoice.value[project.id] &&
            !projectNotes.value[project.id]?.trim()
        ) {
            projectNotesErrors.value[project.id] =
                'Project notes are required when "Print on Invoice" is enabled';
            isValid = false;
        }
    });

    return isValid;
};

const approveInvoice = async () => {
    // Validate notes before submitting
    if (!validateNotes()) {
        // Close dialog and switch to Summary tab to show errors
        approvalDialogVisible.value = false;
        activeTab.value = '0'; // Switch to Summary tab
        return;
    }

    try {
        busy.value = true;
        const notesData = {
            customer_notes: customerNotes.value,
            print_customer_notes_on_invoice: printCustomerNotesOnInvoice.value,
            project_notes: projectNotes.value,
            print_project_notes_on_invoice: printProjectNotesOnInvoice.value
        };
        const payload = {
            ...transformNotesPayload(notesData),
            bcc_recipients: bccRecipients.value,
            selected_contacts: formData.value.selected_contacts.map(
                (contact) => contact.id
            ),
            invoice_template_id: formData.value.invoice_template?.id,
            applied_credits: advancePayment.value
        };
        await invoiceStore.approveInvoice(invoiceId.value, payload);
        closeApprovalDialog();
        pushRoute('InvoiceApprovals');
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
};

const getInvoiceTemplates = async (searchText = '') => {
    try {
        loadingInvoiceTemplates.value = true;
        const params = {
            limit: 300
        };
        const payload = {
            search: {
                value: searchText
            }
        };
        const res = await invoiceTemplateStore.list(payload, params);
        invoiceTemplates.value = res.data;
        formData.value.invoice_template = invoiceTemplates.value.find(
            (item) => item.is_default
        );
        bccRecipients.value =
            formData.value.invoice_template?.bcc_recipients || [];
    } finally {
        loadingInvoiceTemplates.value = false;
    }
};

const getCustomerContacts = async () => {
    if (!details.value?.invoice?.customer_id) return;

    loadingContacts.value = true;
    try {
        const payload = {
            filters: [
                {
                    field: 'customer_id',
                    operator: '=',
                    value: details.value.invoice.customer_id
                }
            ]
        };
        const res = await customerContactStore.search(payload, { limit: 300 });
        customerContacts.value = res.data || [];

        // Auto-select default invoice recipients
        formData.value.selected_contacts = customerContacts.value.filter(
            (contact) => contact.default_invoice_receipient
        );
    } catch (error) {
        console.error(error);
    } finally {
        loadingContacts.value = false;
    }
};

const openInvoiceTemplatePreview = (event, includeTemplateId = false) => {
    includeTemplateId
        ? window.open(
              `${API_BASE_URL}/invoice/${invoiceId.value}/preview?template_id=${formData.value.invoice_template?.id}`,
              '_blank'
          )
        : window.open(
              `${API_BASE_URL}/invoice/${invoiceId.value}/preview`,
              '_blank'
          );
};
</script>

<template>
    <Loader v-if="loading" />
    <div v-else>
        <TitleHeader>
            <template #title>
                <div class="flex items-center gap-5">
                    <Button
                        type="button"
                        variant="outlined"
                        icon="pi pi-chevron-left"
                        size="large"
                        @click="pushRoute('InvoiceApprovals')"
                        iconClass="!text-sm"
                        :disabled="busy"
                    />
                    <div class="flex flex-col">
                        <h1 class="text-2xl sm:text-3xl font-bold capitalize">
                            {{ details?.invoice?.customer?.name }}
                        </h1>
                        <div
                            class="flex flex-wrap items-center gap-2 text-sm text-gray-600"
                        >
                            <span
                                >Invoice Number:
                                {{ details?.invoice?.invoice_number }}</span
                            >
                            <span>•</span>
                            <span
                                >Total Amount:
                                {{
                                    moneyFormat(
                                        details?.invoice?.total_billable
                                    )
                                }}</span
                            >
                        </div>
                    </div>
                </div>
            </template>
            <template #actions>
                <Button
                    @click="openInvoiceTemplatePreview"
                    label="Preview"
                    icon="pi pi-eye"
                    class="w-full sm:w-auto"
                    :disabled="busy"
                />
                <Button
                    label="Save"
                    class="w-full sm:w-auto"
                    @click="saveAll"
                    :loading="savingResources"
                    :disabled="!hasChanges || savingResources || busy"
                />
                <Button
                    label="Approve"
                    severity="success"
                    class="w-full sm:w-auto"
                    :disabled="busy"
                    :loading="busy"
                    @click="openApprovalDialog"
                />
            </template>
        </TitleHeader>

        <Card class="tabs-card">
            <template #content>
                <Tabs v-model:value="activeTab" @update:value="handleTabChange">
                    <TabList>
                        <Tab value="0">Summary</Tab>
                        <Tab value="1">Details</Tab>
                    </TabList>
                    <div>
                        <TabPanels>
                            <TabPanel value="0">
                                <div
                                    class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"
                                >
                                    <div class="lg:col-span-2 pt-3">
                                        <div
                                            class="grid grid-cols-12 gap-4 space-y-4"
                                        >
                                            <div class="col-span-12">
                                                <div
                                                    class="flex items-center justify-between mb-3"
                                                >
                                                    <label
                                                        class="block font-semibold"
                                                        for="customer_notes"
                                                    >
                                                        Customer Notes:
                                                    </label>

                                                    <div
                                                        class="flex items-center gap-2 mt-4 lg:mt-0"
                                                    >
                                                        <label
                                                            class="cursor-pointer font-semibold"
                                                            for="customer_notes_print_on_invoice"
                                                        >
                                                            Print on Invoice
                                                        </label>
                                                        <InputField
                                                            inputId="customer_notes_print_on_invoice"
                                                            variant="switch"
                                                            v-model="
                                                                printCustomerNotesOnInvoice
                                                            "
                                                            :disabled="busy"
                                                        />
                                                    </div>
                                                </div>
                                                <InputField
                                                    id="customer_notes"
                                                    :disabled="busy"
                                                    class="w-full"
                                                    rows="5"
                                                    v-model="customerNotes"
                                                    variant="textarea"
                                                    :errorMessages="
                                                        customerNotesError
                                                            ? [
                                                                  customerNotesError
                                                              ]
                                                            : []
                                                    "
                                                />
                                            </div>
                                            <div
                                                class="col-span-12"
                                                v-for="project in details?.projects"
                                                :key="project.id"
                                            >
                                                <div
                                                    class="flex items-center justify-between mb-3"
                                                >
                                                    <label
                                                        class="block font-semibold"
                                                        :for="`project_notes_${project.id}`"
                                                    >
                                                        Project Notes:
                                                        {{ project.name }}
                                                    </label>

                                                    <div
                                                        class="flex items-center gap-2 mt-4 lg:mt-0"
                                                    >
                                                        <label
                                                            class="cursor-pointer font-semibold"
                                                            :for="`project_notes_print_on_invoice_${project.id}`"
                                                        >
                                                            Print on Invoice
                                                        </label>
                                                        <InputField
                                                            :inputId="`project_notes_print_on_invoice_${project.id}`"
                                                            variant="switch"
                                                            v-model="
                                                                printProjectNotesOnInvoice[
                                                                    project.id
                                                                ]
                                                            "
                                                            :disabled="busy"
                                                        />
                                                    </div>
                                                </div>

                                                <InputField
                                                    :id="`project_notes_${project.id}`"
                                                    :disabled="busy"
                                                    class="w-full"
                                                    rows="5"
                                                    v-model="
                                                        projectNotes[project.id]
                                                    "
                                                    variant="textarea"
                                                    :errorMessages="
                                                        projectNotesErrors[
                                                            project.id
                                                        ]
                                                            ? [
                                                                  projectNotesErrors[
                                                                      project.id
                                                                  ]
                                                              ]
                                                            : []
                                                    "
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div class="lg:col-span-1">
                                        <SummaryBox
                                            :summary="details?.invoice"
                                            :allowed-credit="allowedCreditLocal"
                                            v-model:advance-payment="
                                                advancePayment
                                            "
                                        />
                                    </div>
                                </div>
                            </TabPanel>
                            <TabPanel value="1">
                                <Tabs v-model:value="activeProjectTab">
                                    <TabList>
                                        <Tab
                                            v-for="(
                                                project, i
                                            ) in details?.projects"
                                            :key="i"
                                            :value="i.toString()"
                                        >
                                            {{ project.name }}
                                        </Tab>
                                    </TabList>

                                    <TabPanels>
                                        <TabPanel
                                            v-for="(
                                                project, i
                                            ) in details?.projects"
                                            :key="i"
                                            :value="i.toString()"
                                        >
                                            <div class="mt-4">
                                                <!-- View Attachment Button -->
                                                <div
                                                    v-if="
                                                        project.customer_proposal
                                                    "
                                                    class="flex justify-end mb-4"
                                                >
                                                    <Button
                                                        as="a"
                                                        :href="
                                                            project.customer_proposal
                                                        "
                                                        target="_blank"
                                                        icon="pi pi-eye"
                                                        label="View Customer Proposal"
                                                        variant="outlined"
                                                    />
                                                </div>

                                                <!-- Timesheets Table -->
                                                <div class="mb-16">
                                                    <h3
                                                        class="text-xl font-semibold text-gray-900 mb-3"
                                                    >
                                                        Timesheets
                                                    </h3>
                                                    <TimesheetTable
                                                        :timesheets="
                                                            project.timesheets ||
                                                            []
                                                        "
                                                        @refresh="
                                                            handleTimesheetRefresh
                                                        "
                                                        @item-changed="
                                                            handleItemChanged
                                                        "
                                                    />
                                                </div>

                                                <!-- Expenses Table -->
                                                <div class="mb-16">
                                                    <h3
                                                        class="text-xl font-semibold text-gray-900 mb-3"
                                                    >
                                                        Expenses
                                                    </h3>
                                                    <ExpenseTable
                                                        :expenses="
                                                            project.expenses ||
                                                            []
                                                        "
                                                        @refresh="
                                                            handleExpenseRefresh
                                                        "
                                                        @item-changed="
                                                            handleItemChanged
                                                        "
                                                    />
                                                </div>

                                                <!-- Additional Items Table -->
                                                <div
                                                    v-if="
                                                        project.additional_items
                                                            ?.length
                                                    "
                                                >
                                                    <h3
                                                        class="text-xl font-semibold text-gray-900 mb-3"
                                                    >
                                                        Additional Items
                                                    </h3>
                                                    <AdditionalItemsTable
                                                        :additional-items="
                                                            project.additional_items
                                                        "
                                                        @refresh="
                                                            handleAdditionalItemRefresh
                                                        "
                                                        @item-changed="
                                                            handleItemChanged
                                                        "
                                                    />
                                                </div>
                                            </div>
                                        </TabPanel>
                                    </TabPanels>
                                </Tabs>
                            </TabPanel>
                        </TabPanels>
                    </div>
                </Tabs>
            </template>
        </Card>
    </div>

    <Dialog
        v-model:visible="approvalDialogVisible"
        :modal="true"
        @update:visible="onShow"
        header="Approve Invoice"
        class="w-full sm:w-2/3 md:w-1/2 lg:w-6/12"
    >
        <div class="grid grid-cols-12 gap-4 space-y-1 py-4">
            <div
                class="col-span-12 flex flex-col sm:flex-row sm:items-end sm:gap-3"
            >
                <div class="flex-1">
                    <label class="block mb-2" for="invoice_template_id"
                        >Select Invoice Template</label
                    >
                    <ApiDropdown
                        showClear
                        filter
                        placeholder="Select"
                        :loading="loadingInvoiceTemplates"
                        @search="getInvoiceTemplates"
                        :options="invoiceTemplates"
                        optionLabel="name"
                        id="invoice_template_id"
                        v-model="formData.invoice_template"
                        class="w-full"
                        :disabled="busy || loadingInvoiceTemplates"
                    />
                </div>
                <Button
                    :disabled="
                        !formData.invoice_template?.preview_path ||
                        loadingInvoiceTemplates
                    "
                    @click="openInvoiceTemplatePreview(event, true)"
                    rounded
                    outlined
                    icon="pi pi-eye"
                    class="mt-2 sm:mt-0"
                />
            </div>

            <div class="!my-4 !mb-5 col-span-12">
                <label class="block mb-2"
                    >Select Customer's Recipient(s): To</label
                >
                <BaseTableClient
                    :loading="loadingContacts"
                    :value="customerContacts"
                    v-model:selection="formData.selected_contacts"
                    :paginator="false"
                    dataKey="id"
                >
                    <Column
                        selectionMode="multiple"
                        headerStyle="width: 3rem"
                    />
                    <Column
                        class="whitespace-nowrap"
                        field="first_name"
                        header="Name"
                    >
                        <template #body="{ data }">
                            <div>
                                <span class="whitespace-nowrap"
                                    >{{ data.first_name }}
                                    {{ data.last_name }}</span
                                >
                            </div>
                        </template>
                    </Column>
                    <Column
                        class="whitespace-nowrap"
                        field="email"
                        header="Email"
                    />
                    <template #empty> No contacts found. </template>
                </BaseTableClient>
            </div>
            <div class="mb-3 col-span-12">
                <label class="block font-semibold mb-2"
                    >Bcc Recipient(s):</label
                >
                <BccRecipientsField
                    v-model="bccRecipients"
                    :disabled="busy || loadingInvoiceTemplates"
                    placeholder="Add recipients"
                />
            </div>
        </div>

        <template #footer>
            <Button
                text
                variant="outlined"
                label="Cancel"
                @click="closeApprovalDialog"
                :disabled="busy || loadingContacts"
                class="mr-2"
            />
            <Button
                :loading="busy"
                icon="pi pi-check"
                :disabled="isPopupApproveButtonDisabled"
                severity="success"
                label="Approve"
                @click="approveInvoice"
            />
        </template>
    </Dialog>

    <Confirmation
        v-model="showUnsavedDialog"
        header="Unsaved Changes"
        content="You have unsaved changes. If you continue, those changes will be lost. Do you want to discard them?"
        variant="danger"
        confirmButtonText="Discard Changes"
        cancelButtonText="Keep Editing"
        @confirm="confirmDiscard"
        @cancel="cancelDiscard"
    />
</template>
