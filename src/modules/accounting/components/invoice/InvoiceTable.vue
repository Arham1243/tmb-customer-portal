<script setup>
import { ref, computed, onBeforeMount } from 'vue';
import { useHelpers } from '@/composables';
import { useInvoiceStore } from '@/modules/accounting/stores';
import { useRouter, useRoute } from 'vue-router';

const invoiceStore = useInvoiceStore();
const { moneyFormat, formatHours } = useHelpers();
const loading = ref(false);
const busy = ref(false);
const items = ref([]);
const router = useRouter();
const route = useRoute();
const selectedItems = ref([]);
const hasFetched = ref(false);
const tableRef = ref();
const confirmDialog = ref(false);

const formatLocalDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const today = new Date();
const todayStr = formatLocalDate(today);

const lastMonthEndDate = new Date(today.getFullYear(), today.getMonth(), 0);
const lastMonthEnd = formatLocalDate(lastMonthEndDate);

const formData = ref({
    invoice_date: route.query.invoice_date || todayStr,
    unbilled_last_date: route.query.unbilled_last_date || lastMonthEnd
});

onBeforeMount(() => {
    if (route.query.invoice_date && route.query.unbilled_last_date) {
        handleUpdate();
    }
});

const currentPageItems = computed(() => tableRef.value?.paginatedData || []);

const pageTotalTotalBillable = computed(() => {
    return currentPageItems.value.reduce(
        (sum, item) => sum + (item.total_billable || 0),
        0
    );
});

const pageTotalBillableExpenses = computed(() => {
    return currentPageItems.value.reduce(
        (sum, item) => sum + (item.billable_expenses || 0),
        0
    );
});

const pageTotalChargeAmount = computed(() => {
    return currentPageItems.value.reduce(
        (sum, item) => sum + (item.charge_amount || 0),
        0
    );
});

const pageTotalBillableHours = computed(() => {
    return currentPageItems.value.reduce(
        (sum, item) => sum + (item.billable_hours || 0),
        0
    );
});

const hasSelection = computed(() => selectedItems.value.length > 0);
const sameCustomer = computed(() => {
    if (!hasSelection.value) return true;
    const ids = selectedItems.value.map((i) => i.customer.id);
    return ids.every((id) => id === ids[0]);
});
const canConsolidate = computed(() => {
    if (!sameCustomer.value) return false;
    const firstCustomer = selectedItems.value[0]?.customer;
    return firstCustomer?.consolidate_invoices === true;
});

const selectedCustomerNames = computed(() => {
    if (!hasSelection.value) return [];
    const names = selectedItems.value.map((i) => i.customer.name);
    return [...new Set(names)];
});

const disableFutureDates = (date) => {
    return date > today;
};

const handleUpdate = async () => {
    hasFetched.value = true;
    getItems();
};

const getItems = async () => {
    try {
        loading.value = true;
        const res = await invoiceStore.getUnbilledItems(formData.value);
        items.value = res.data || [];
    } finally {
        loading.value = false;
    }
};

const pushRoute = (name, params = {}, query = {}) => {
    router.push({ name, params, query });
};

const createConsolidatedInvoices = () => {
    const uniqueProjectIds = [
        ...new Set(selectedItems.value.map((i) => i.project?.id))
    ].filter(Boolean);

    if (!uniqueProjectIds.length || !selectedItems.value[0]?.customer?.id)
        return;

    pushRoute(
        'CreateInvoiceCustomer',
        {
            customer_id: selectedItems.value[0].customer.id
        },
        {
            invoice_date: formData.value.invoice_date,
            unbilled_last_date: formData.value.unbilled_last_date,
            project_ids: uniqueProjectIds
        }
    );
};

const confirmCreateIndividualInvoices = () => {
    confirmDialog.value = true;
};

const createIndividualInvoices = async () => {
    try {
        busy.value = true;

        const payload = {
            invoices: selectedItems.value.map((item) => ({
                customer_id: item.customer.id,
                project_id: item.project.id,
                invoice_date: formData.value.invoice_date,
                unbilled_last_date: formData.value.unbilled_last_date,
                status: 'draft'
            }))
        };
        await invoiceStore.createIndividualInvoices(payload);

        selectedItems.value = [];
        await getItems();
    } catch (error) {
        console.error('Error creating individual invoices:', error);
    } finally {
        busy.value = false;
    }
};
</script>

<template>
    <TitleHeader>
        <template #title>
            <div>
                <h1 class="text-2xl sm:text-3xl font-bold">Invoices</h1>
            </div>
        </template>
    </TitleHeader>

    <Card class="py-3 px-2">
        <template #content>
            <div class="flex flex-col sm:flex-row items-end gap-4 mb-10">
                <div class="flex flex-col flex-1 gap-2">
                    <label class="mb-1 text-sm font-medium text-gray-700"
                        >Invoice Date</label
                    >
                    <InputField
                        id="invoiceDate"
                        variant="date"
                        :default-value="today"
                        :editable="true"
                        :clearable="false"
                        v-model="formData.invoice_date"
                        :disabled="loading"
                        class="w-full"
                    />
                </div>

                <div class="flex flex-col flex-1 gap-2">
                    <label class="mb-1 text-sm font-medium text-gray-700"
                        >Unbilled items last date</label
                    >
                    <InputField
                        id="unbilledDate"
                        variant="date"
                        :default-value="lastMonthEnd"
                        :editable="true"
                        v-model="formData.unbilled_last_date"
                        :disabled-date="disableFutureDates"
                        :disabled="loading"
                        :clearable="false"
                        class="w-full"
                        :max="today"
                    />
                </div>

                <Button
                    label="Update"
                    @click="handleUpdate"
                    :disabled="loading"
                    :loading="loading"
                    class="mt-2 sm:mt-0"
                />
            </div>
            <div
                class="flex flex-col items-center justify-center py-10"
                v-if="!hasFetched && !loading"
            >
                <i class="pi pi-search text-gray-400 !text-4xl mb-4"></i>
                <p class="text-gray-500">
                    Set your dates and click Update to fetch items.
                </p>
            </div>

            <div v-else-if="loading" class="flex justify-center py-10">
                <i class="pi pi-spin pi-spinner !text-4xl text-gray-400"></i>
            </div>

            <div
                v-else-if="!items.length && hasFetched"
                class="flex flex-col items-center justify-center py-10"
            >
                <i class="pi pi-info-circle text-gray-400 !text-4xl mb-4"></i>
                <p class="text-gray-500">
                    No items found for the selected date.
                </p>
            </div>

            <div v-else>
                <BaseTableClient
                    ref="tableRef"
                    :value="items"
                    paginator
                    v-model:selection="selectedItems"
                    :loading="loading"
                >
                    <template #header>
                        <div
                            v-if="$ability.can('invoicing.create.create')"
                            class="flex flex-col gap-2"
                        >
                            <div class="flex flex-wrap items-start gap-3">
                                <div class="flex flex-col">
                                    <Button
                                        @click="confirmCreateIndividualInvoices"
                                        label="Create Individual Invoice(s)"
                                        :loading="busy"
                                        :disabled="!hasSelection || busy"
                                        v-tooltip.top="
                                            !hasSelection
                                                ? 'Select at least one item to create invoices.'
                                                : undefined
                                        "
                                    />
                                    <div class="h-6"></div>
                                </div>

                                <div class="flex flex-col">
                                    <Button
                                        @click="createConsolidatedInvoices"
                                        label="Create Consolidated Invoices"
                                        :disabled="
                                            selectedItems.length < 2 ||
                                            !sameCustomer ||
                                            !canConsolidate
                                        "
                                        v-tooltip.top="
                                            selectedItems.length < 2
                                                ? 'Select at least two items to create a consolidated invoice.'
                                                : !sameCustomer
                                                  ? 'All selected items must belong to the same customer.'
                                                  : !canConsolidate
                                                    ? `Consolidation isn't available for ${selectedCustomerNames[0] || 'this customer'}.`
                                                    : undefined
                                        "
                                    />

                                    <div class="h-6 mb-5">
                                        <Tag
                                            v-if="
                                                selectedItems.length >= 2 &&
                                                (!sameCustomer ||
                                                    !canConsolidate)
                                            "
                                            :severity="
                                                !sameCustomer
                                                    ? 'danger'
                                                    : 'warn'
                                            "
                                            class="text-xs !font-medium mt-2"
                                        >
                                            <span v-if="!sameCustomer">
                                                You've selected items from
                                                different customers.
                                            </span>
                                            <span v-else-if="!canConsolidate">
                                                Consolidation isn't available
                                                for
                                                <span class="font-semibold">
                                                    {{
                                                        selectedCustomerNames[0] ||
                                                        'this customer'
                                                    }}
                                                </span>
                                                .
                                            </span>
                                        </Tag>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>

                    <Column
                        v-if="$ability.can('invoicing.create.create')"
                        selectionMode="multiple"
                        headerStyle="width: 3rem"
                    />
                    <Column field="customer.name" header="Customer" sortable />
                    <Column field="project.name" header="Project" sortable>
                        <template #body="{ data }">
                            <div
                                class="flex items-center justify-between gap-3"
                            >
                                <span>
                                    {{ data.project.name }}
                                </span>
                                <Button
                                    v-if="data.project.customer_proposal"
                                    as="a"
                                    :href="data.project.customer_proposal"
                                    target="_blank"
                                    rounded
                                    size="small"
                                    variant="outlined"
                                    icon="pi pi-eye"
                                />
                            </div>
                        </template>
                    </Column>

                    <Column field="billable_hours" sortable>
                        <template #header>
                            <span class="font-semibold"
                                >Billable <br />
                                Hours</span
                            >
                        </template>
                        <template #body="{ data }">{{
                            formatHours(data.billable_hours)
                        }}</template>
                        <template #footer>
                            <span class="font-semibold text-lg">{{
                                formatHours(pageTotalBillableHours)
                            }}</span>
                        </template>
                    </Column>

                    <Column
                        field="charge_amount"
                        class="amount-column"
                        sortable
                    >
                        <template #header>
                            <span class="font-semibold"
                                >Charge <br />
                                Amount</span
                            >
                        </template>
                        <template #body="{ data }">{{
                            moneyFormat(data.charge_amount)
                        }}</template>
                        <template #footer>
                            <span class="font-semibold text-lg">{{
                                moneyFormat(pageTotalChargeAmount)
                            }}</span>
                        </template>
                    </Column>

                    <Column
                        field="billable_expenses"
                        class="amount-column"
                        sortable
                    >
                        <template #header>
                            <span class="font-semibold"
                                >Billable <br />
                                Expenses</span
                            >
                        </template>
                        <template #body="{ data }">{{
                            moneyFormat(data.billable_expenses)
                        }}</template>
                        <template #footer>
                            <span class="font-semibold text-lg">{{
                                moneyFormat(pageTotalBillableExpenses)
                            }}</span>
                        </template>
                    </Column>

                    <Column
                        field="total_billable"
                        class="amount-column"
                        sortable
                    >
                        <template #header>
                            <span class="font-semibold"
                                >Total <br />
                                Billable</span
                            >
                        </template>
                        <template #body="{ data }">
                            <router-link
                                v-if="$ability.can('invoicing.create.create')"
                                :to="{
                                    name: 'CreateInvoiceCustomer',
                                    params: { customer_id: data.customer.id },
                                    query: {
                                        invoice_date: formData.invoice_date,
                                        unbilled_last_date:
                                            formData.unbilled_last_date,
                                        project_ids: [data.project.id]
                                    }
                                }"
                                class="text-blue-600 hover:text-blue-800 cursor-pointer"
                            >
                                {{ moneyFormat(data.total_billable) }}
                            </router-link>
                            <span v-else>
                                {{ moneyFormat(data.total_billable) }}
                            </span>
                        </template>
                        <template #footer>
                            <span class="font-semibold text-lg">{{
                                moneyFormat(pageTotalTotalBillable)
                            }}</span>
                        </template>
                    </Column>

                    <template #empty> No items found </template>
                </BaseTableClient>
            </div>
        </template>
    </Card>

    <Confirmation
        v-model="confirmDialog"
        variant="warning"
        header="Create Individual Invoices"
        content="Are you sure you want to create individual invoices for the selected items?"
        confirmButtonText="Yes, Create"
        @confirm="createIndividualInvoices"
    />
</template>
