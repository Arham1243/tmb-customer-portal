<script setup>
import { ref, computed, onBeforeMount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHelpers } from '@/composables/useHelpers';
import { useInvoiceStore } from '@/modules/accounting/stores';
import TimesheetTable from '@/modules/accounting/components/invoice/tables/TimesheetTable.vue';
import ExpenseTable from '@/modules/accounting/components/invoice/tables/ExpenseTable.vue';
import AdditionalItemsTable from '@/modules/accounting/components/invoice/tables/AdditionalItemsTable.vue';
import { useUserRole } from '@/composables/useUserRole';

const route = useRoute();
const router = useRouter();
const { isAdmin, isApprover } = useUserRole();
const { moneyFormat, formatHours, formatDate } = useHelpers();

const invoiceDate = ref(route.query.invoice_date);
const unbilledItemsLastDate = ref(route.query.unbilled_last_date);
const loading = ref(false);
const busy = ref(false);
const savingResources = ref(false);
const customerId = ref(route.params.customer_id);
const projectIds = ref(
    Array.isArray(route.query.project_ids)
        ? route.query.project_ids
        : route.query.project_ids
          ? [route.query.project_ids]
          : []
);
const invoiceStore = useInvoiceStore();
const activeTab = ref('0');
const activeProjectTab = ref('0');
const showUnsavedDialog = ref(false);
const confirmDialog = ref(false);
const changedItems = ref({
    timesheets: new Map(),
    expenses: new Map(),
    additionalItems: new Map()
});

// Single state object to manage all project data, selections, and totals
const projectsState = ref({
    projects: [],
    selections: {},
    totals: {}
});

const formData = ref({
    invoice_date: invoiceDate.value,
    unbilled_last_date: unbilledItemsLastDate.value
});

onBeforeMount(async () => {
    await getUnbilledDetails();
});

const canEdit = computed(() => isAdmin.value || isApprover.value);

const hasChanges = computed({
    get: () =>
        changedItems.value.timesheets.size > 0 ||
        changedItems.value.expenses.size > 0,
    set: (val) => {
        if (!val) {
            changedItems.value.timesheets.clear();
            changedItems.value.expenses.clear();
        }
    }
});

const hasSelections = computed(() => {
    return Object.values(projectsState.value.selections).some(
        (selection) =>
            selection.timesheets.length > 0 || selection.expenses.length > 0
    );
});

const summaryData = computed(() => {
    let billableHours = 0;
    let chargeAmount = 0;
    let billableExpenses = 0;
    let additionalItemsTotal = 0;

    // Aggregate selections from all projects
    Object.values(projectsState.value.selections).forEach((selection) => {
        // Use the actual edited values from changed items if available, otherwise use original
        selection.timesheets.forEach((ts) => {
            const changedItem = changedItems.value.timesheets.get(ts.id);
            if (changedItem) {
                billableHours += parseFloat(changedItem.billable_hours) || 0;
                chargeAmount += parseFloat(changedItem.charge_amount) || 0;
            } else {
                billableHours += parseFloat(ts.billable_hours) || 0;
                chargeAmount += parseFloat(ts.charge_amount) || 0;
            }
        });

        selection.expenses.forEach((e) => {
            const changedItem = changedItems.value.expenses.get(e.id);
            if (changedItem) {
                billableExpenses +=
                    parseFloat(changedItem.billable_amount) || 0;
            } else {
                billableExpenses += parseFloat(e.billable_amount) || 0;
            }
        });

        // Additional items - use edited values from state
        selection.additionalItems.forEach((a) => {
            additionalItemsTotal += parseFloat(a.billable_amount) || 0;
        });
    });

    const totalBillable =
        chargeAmount + billableExpenses + additionalItemsTotal;

    return {
        billable_hours: billableHours,
        charge_amount: chargeAmount,
        billable_expenses: billableExpenses,
        additional_items_total: additionalItemsTotal,
        total_billable: totalBillable
    };
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
        getUnbilledDetails();
    });
};

const cancelDiscard = () => {
    showUnsavedDialog.value = false;
    nextTick(() => (activeTab.value = previousTab.value));
};

const pushRoute = (name, query = {}) => {
    router.push({ name, query });
};
const goBack = () => {
    pushRoute('Invoices', {
        invoice_date: invoiceDate.value,
        unbilled_last_date: unbilledItemsLastDate.value
    });
};

const calculateProjectTotals = (projectsList) => {
    const totals = {};

    projectsList.forEach((project, index) => {
        const timesheets = project.timesheets || [];
        const expenses = project.expenses || [];
        const additionalItems = project.additional_items || [];

        totals[index] = {
            timesheets: {
                billableHours: timesheets.reduce(
                    (sum, item) => sum + (parseFloat(item.billable_hours) || 0),
                    0
                ),
                chargeAmount: timesheets.reduce(
                    (sum, item) => sum + (parseFloat(item.charge_amount) || 0),
                    0
                )
            },
            expenses: {
                billableAmount: expenses.reduce(
                    (sum, item) =>
                        sum + (parseFloat(item.billable_amount) || 0),
                    0
                )
            },
            additionalItems: {
                billableAmount: additionalItems.reduce(
                    (sum, item) =>
                        sum + (parseFloat(item.billable_amount) || 0),
                    0
                )
            }
        };
    });

    return totals;
};

const populateSelections = (projectsList) => {
    const projects = projectsList || [];
    const selections = {};

    // Initialize per-project selections
    // By default: timesheets and expenses are selected, additional items are not
    projects.forEach((project, index) => {
        // Create deep copies to avoid reference issues
        selections[index] = {
            timesheets: JSON.parse(JSON.stringify(project.timesheets || [])),
            expenses: JSON.parse(JSON.stringify(project.expenses || [])),
            additionalItems: [] // Not selected by default
        };
    });

    // Update the unified state object
    projectsState.value = {
        projects,
        selections,
        totals: calculateProjectTotals(projects)
    };
};

function buildInvoicePayload({
    customerId,
    projectIds = [],
    invoiceDate,
    unbilledLastDate,
    selectedTimesheets = [],
    selectedExpenses = [],
    selectedAdditionalItems = []
}) {
    return {
        invoices: [
            {
                customer_id: customerId,
                project_ids: projectIds.map((id) => Number(id)),
                invoice_date: invoiceDate,
                unbilled_last_date: unbilledLastDate,
                timesheet_ids: selectedTimesheets.map((ts) => ts.id),
                expense_ids: selectedExpenses.map((exp) => exp.id),
                additional_items: selectedAdditionalItems,
                status: 'draft'
            }
        ]
    };
}

const confirmCreateInvoice = () => {
    confirmDialog.value = true;
};

const createConsolidatedInvoices = async () => {
    try {
        busy.value = true;

        const routeProjectIds = Array.isArray(route.query.project_ids)
            ? route.query.project_ids
            : route.query.project_ids
              ? [route.query.project_ids]
              : [];

        // Collect all selections from all projects
        const allTimesheets = [];
        const allExpenses = [];
        const allAdditionalItems = [];

        Object.values(projectsState.value.selections).forEach((selection) => {
            allTimesheets.push(...selection.timesheets);
            allExpenses.push(...selection.expenses);
            allAdditionalItems.push(...selection.additionalItems);
        });

        const payload = buildInvoicePayload({
            customerId: customerId.value,
            projectIds: routeProjectIds,
            invoiceDate: invoiceDate.value,
            unbilledLastDate: unbilledItemsLastDate.value,
            selectedTimesheets: allTimesheets,
            selectedExpenses: allExpenses,
            selectedAdditionalItems: allAdditionalItems
        });
        await invoiceStore.createConsolidatedInvoices(payload);
        pushRoute('Invoices');
    } catch (error) {
        console.error('Error creating invoice:', error);
    } finally {
        busy.value = false;
    }
};

const getUnbilledDetails = async () => {
    try {
        loading.value = true;
        const payload = {
            invoice_date: invoiceDate.value,
            unbilled_last_date: unbilledItemsLastDate.value,
            project_ids: projectIds.value
        };
        const res = await invoiceStore.getCustomerUnbilledDetails(
            customerId.value,
            payload
        );
        if (res.data?.projects.length > 0) {
            populateSelections(res.data?.projects);
        } else {
            pushRoute('Invoices');
        }
    } catch (error) {
        pushRoute('Invoices');
    } finally {
        loading.value = false;
    }
};

const handleTimesheetRefresh = async () => {
    await getUnbilledDetails();
};

const handleExpenseRefresh = async () => {
    await getUnbilledDetails();
};

const handleAdditionalItemUpdate = (updatedItem) => {
    const index = Number(activeTab.value) - 1;
    const project = projectsState.value.projects[index];

    // Find and update the item in the project's additional_items array
    // This ensures edited values persist through timesheet/expense saves
    const itemIndex = project.additional_items.findIndex(
        (item) => item.id === updatedItem.id
    );

    if (itemIndex !== -1) {
        // Update with deep copy to ensure reactivity
        project.additional_items[itemIndex] = { ...updatedItem };
    }

    // Also update in selections if it's selected
    // This triggers summary recalculation with the new billable_amount
    const selectionIndex = projectsState.value.selections[
        index
    ].additionalItems.findIndex((item) => item.id === updatedItem.id);

    if (selectionIndex !== -1) {
        // Update with deep copy to ensure reactivity and trigger summary recalculation
        projectsState.value.selections[index].additionalItems[selectionIndex] =
            { ...updatedItem };
    }
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
            promises.push(invoiceStore.bulkUpdateTimesheets({ timesheets }));
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
            promises.push(invoiceStore.bulkUpdateExpenses({ expenses }));
        }

        // Note: Additional items are handled during invoice creation, not here
        // They are already updated in the state via handleAdditionalItemUpdate

        await Promise.all(promises);

        // Clear changed items after successful save (only timesheets and expenses)
        changedItems.value.timesheets.clear();
        changedItems.value.expenses.clear();
        // DON'T clear additional items changes as they haven't been saved yet

        // Preserve additional items data before refresh
        const previousAdditionalItemsData = {};
        Object.keys(projectsState.value.selections).forEach((key) => {
            const project = projectsState.value.projects[key];
            if (project) {
                // Store both selections and the full additional_items array with edits
                previousAdditionalItemsData[key] = {
                    selections: JSON.parse(
                        JSON.stringify(
                            projectsState.value.selections[key].additionalItems
                        )
                    ),
                    allItems: JSON.parse(
                        JSON.stringify(project.additional_items)
                    )
                };
            }
        });

        await getUnbilledDetails();

        // Restore additional items data (both selections and edited values)
        Object.keys(previousAdditionalItemsData).forEach((key) => {
            if (
                projectsState.value.selections[key] &&
                projectsState.value.projects[key]
            ) {
                const preserved = previousAdditionalItemsData[key];

                // Restore the edited additional_items array in the project
                projectsState.value.projects[key].additional_items =
                    preserved.allItems;

                // Restore the selections
                projectsState.value.selections[key].additionalItems =
                    preserved.selections;
            }
        });
    } catch (error) {
        console.error('Error saving changes:', error);
    } finally {
        savingResources.value = false;
    }
};

const summaryItems = computed(() => [
    {
        label: 'Billable Hours',
        value: formatHours(summaryData.value.billable_hours)
    },
    {
        label: 'Charge Amount',
        value: moneyFormat(summaryData.value.charge_amount)
    },
    {
        label: 'Billable Expenses',
        value: moneyFormat(summaryData.value.billable_expenses)
    },
    {
        label: 'Additional Items',
        value: moneyFormat(summaryData.value.additional_items_total)
    }
]);
</script>

<template>
    <Loader v-if="loading" />
    <div v-else>
        <div
            class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5"
        >
            <div
                class="flex flex-col sm:flex-row sm:items-center gap-5 w-full sm:w-auto"
            >
                <Button
                    class="shrink-0 self-start sm:self-center"
                    type="button"
                    variant="outlined"
                    icon="pi pi-chevron-left"
                    size="large"
                    :disabled="busy"
                    @click="goBack"
                    iconClass="!text-sm"
                />
                <div class="flex flex-col text-center sm:text-left">
                    <h1 class="text-2xl sm:text-3xl font-bold capitalize">
                        {{ invoiceStore.currentCustomer?.name }}
                    </h1>
                    <div
                        class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm text-gray-600"
                    >
                        <span>Invoice Date: {{ formatDate(invoiceDate) }}</span>
                        <span class="hidden sm:inline">•</span>
                        <span
                            >Unbilled Items Last Date:
                            {{ formatDate(unbilledItemsLastDate) }}</span
                        >
                    </div>
                </div>
            </div>

            <div class="w-full sm:w-auto flex justify-end gap-4">
                <Button
                    v-if="canEdit"
                    label="Save"
                    class="w-full sm:w-auto"
                    @click="saveAll"
                    :loading="savingResources"
                    :disabled="!hasChanges || savingResources || busy"
                />
                <Button
                    label="Create Invoice"
                    class="w-full sm:w-auto"
                    @click="confirmCreateInvoice"
                    :loading="busy"
                    :disabled="!hasSelections || busy"
                />
            </div>
        </div>

        <Card>
            <template #content>
                <Tabs v-model:value="activeTab" @update:value="handleTabChange">
                    <TabList>
                        <Tab value="0">Summary</Tab>
                        <Tab value="1">Details</Tab>
                    </TabList>

                    <TabPanels>
                        <TabPanel value="0">
                            <div class="mt-4">
                                <div
                                    class="grid grid-cols-1 lg:grid-cols-3 gap-6"
                                >
                                    <div class="lg:col-span-2"></div>
                                    <Card class="lg:col-span-1">
                                        <template #content>
                                            <h2
                                                class="text-xl font-semibold text-gray-900"
                                            >
                                                Summary
                                            </h2>
                                            <div class="mt-3 space-y-2">
                                                <div
                                                    v-for="(
                                                        item, i
                                                    ) in summaryItems"
                                                    :key="i"
                                                    class="flex justify-between items-center py-2"
                                                >
                                                    <span
                                                        class="text-gray-600"
                                                        >{{ item.label }}</span
                                                    >
                                                    <span
                                                        class="font-semibold text-gray-900"
                                                        >{{ item.value }}</span
                                                    >
                                                </div>

                                                <div
                                                    class="flex justify-between items-center pt-3 mt-3 border-t border-gray-200"
                                                >
                                                    <span
                                                        class="text-lg font-semibold text-gray-900"
                                                        >Total</span
                                                    >
                                                    <span
                                                        class="text-lg font-bold text-gray-900"
                                                    >
                                                        {{
                                                            moneyFormat(
                                                                summaryData.total_billable
                                                            )
                                                        }}
                                                    </span>
                                                </div>
                                            </div>
                                        </template>
                                    </Card>
                                </div>
                            </div>
                        </TabPanel>

                        <TabPanel value="1">
                            <Tabs v-model:value="activeProjectTab">
                                <TabList>
                                    <Tab
                                        v-for="(
                                            project, i
                                        ) in projectsState.projects"
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
                                        ) in projectsState.projects"
                                        :key="i"
                                        :value="i.toString()"
                                    >
                                        <div class="mt-4">
                                            <!-- View Attachment Button -->
                                            <div
                                                v-if="project.customer_proposal"
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
                                            <div class="mb-7">
                                                <h3
                                                    class="text-xl font-semibold text-gray-900 mb-3"
                                                >
                                                    Timesheets
                                                </h3>
                                                <TimesheetTable
                                                    :key="`timesheets-${i}`"
                                                    :timesheets="
                                                        project.timesheets
                                                    "
                                                    v-model:selection="
                                                        projectsState
                                                            .selections[i]
                                                            .timesheets
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
                                            <div class="mb-7">
                                                <h3
                                                    class="text-xl font-semibold text-gray-900 mb-3"
                                                >
                                                    Expenses
                                                </h3>
                                                <ExpenseTable
                                                    :key="`expenses-${i}`"
                                                    :expenses="project.expenses"
                                                    v-model:selection="
                                                        projectsState
                                                            .selections[i]
                                                            .expenses
                                                    "
                                                    @refresh="
                                                        handleExpenseRefresh
                                                    "
                                                    @item-changed="
                                                        handleItemChanged
                                                    "
                                                />
                                            </div>

                                            <div
                                                v-if="
                                                    project.additional_items
                                                        .length
                                                "
                                            >
                                                <h3
                                                    class="text-xl font-semibold text-gray-900 mb-3"
                                                >
                                                    Additional Items
                                                </h3>
                                                <AdditionalItemsTable
                                                    :key="`additional-${i}`"
                                                    :additional-items="
                                                        project.additional_items
                                                    "
                                                    v-model:selection="
                                                        projectsState
                                                            .selections[i]
                                                            .additionalItems
                                                    "
                                                    @update:item="
                                                        handleAdditionalItemUpdate
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
                </Tabs>
            </template>
        </Card>
    </div>

    <Confirmation
        v-model="confirmDialog"
        variant="success"
        header="Create Invoice"
        content="Are you sure you want to create invoice for the selected items?"
        confirmButtonText="Yes, Create"
        @confirm="createConsolidatedInvoices"
    />

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
