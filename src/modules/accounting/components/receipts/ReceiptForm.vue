<script setup>
import { ref, onBeforeMount, computed, watch } from 'vue';
import { useReceiptStore, useInvoiceStore } from '@/modules/accounting/stores';
import { useRouter } from 'vue-router';
import {
    usePaymentMethodStore,
    useDeductionTypeStore
} from '@/modules/administration/stores';
import { useCustomerStore } from '@/modules/core/stores';
import { paymentTypes } from '@/config/enums';
import { useGlobalStore } from '@/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';

const { formatDate, moneyFormat } = useHelpers();
const receiptStore = useReceiptStore();
const invoiceStore = useInvoiceStore();
const router = useRouter();
const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const paymentMethodStore = usePaymentMethodStore();
const customerStore = useCustomerStore();
const deductionTypeStore = useDeductionTypeStore();
const globalStore = useGlobalStore();
const busy = ref(false);
const loadingPaymentMethods = ref(false);
const paymentMethods = ref([]);
const loadingCustomers = ref(false);
const loadingInvoices = ref(false);
const customers = ref([]);
const loadingDeductionTypes = ref(false);
const deductionTypes = ref([]);
const invoices = ref([]);
const selectedInvoices = ref([]);
const searchText = ref('');
const totalInvoices = ref([]);
const paymentAppliedMap = ref(new Map()); // Track payment_applied per invoice ID
const formData = ref({
    receipt_date: '',
    amount_received: 0.0,
    payment_method_id: '',
    reference_number: '',
    payment_type: '',
    customer_id: '',
    deduction_type_id: ''
});

onBeforeMount(async () => {
    getPaymentMethods();
    getCustomers();
    getDeductionTypes();
});

// Watch for selection changes and auto-calculate payment for newly selected invoices
watch(
    selectedInvoices,
    (newSelection, oldSelection) => {
        const oldIds = new Set((oldSelection || []).map((inv) => inv.id));
        const newIds = new Set(newSelection.map((inv) => inv.id));

        // Find newly selected invoices
        const newlySelected = newSelection.filter((inv) => !oldIds.has(inv.id));

        // Calculate remaining amount from amount_received minus already applied amounts
        let remainingAmount = formData.value.amount_received || 0;
        paymentAppliedMap.value.forEach((amount) => {
            remainingAmount -= amount;
        });

        // Auto-calculate payment for newly selected invoices
        newlySelected.forEach((invoice) => {
            if (remainingAmount > 0) {
                const outstandingBalance = invoice.outstanding_balance || 0;
                const appliedToThisInvoice = Math.min(
                    remainingAmount,
                    outstandingBalance
                );
                paymentAppliedMap.value.set(invoice.id, appliedToThisInvoice);
                remainingAmount -= appliedToThisInvoice;
            } else {
                paymentAppliedMap.value.set(invoice.id, 0);
            }
        });

        // Remove deselected invoices from the map
        oldIds.forEach((id) => {
            if (!newIds.has(id)) {
                paymentAppliedMap.value.delete(id);
            }
        });
    },
    { deep: true }
);

// Watch for amount_received changes and recalculate payment distribution
watch(
    () => formData.value.amount_received,
    (newAmount) => {
        if (!selectedInvoices.value.length) return;

        // Recalculate payment distribution for all selected invoices
        let remainingAmount = newAmount || 0;

        selectedInvoices.value.forEach((invoice) => {
            if (remainingAmount > 0) {
                const outstandingBalance = invoice.outstanding_balance || 0;
                const appliedToThisInvoice = Math.min(
                    remainingAmount,
                    outstandingBalance
                );
                paymentAppliedMap.value.set(invoice.id, appliedToThisInvoice);
                remainingAmount -= appliedToThisInvoice;
            } else {
                paymentAppliedMap.value.set(invoice.id, 0);
            }
        });
    }
);

// Total outstanding balance of selected invoices
const selectedInvoicesTotal = computed(() => {
    return selectedInvoices.value.reduce(
        (sum, invoice) => sum + (invoice.outstanding_balance || 0),
        0
    );
});

// Calculate payment applied for each invoice, preserving existing values
const invoicesWithPaymentApplied = computed(() => {
    const selectedIds = new Set(selectedInvoices.value.map((inv) => inv.id));

    return invoices.value.map((invoice) => {
        if (!selectedIds.has(invoice.id)) {
            return { ...invoice, payment_applied: 0 };
        }

        // Use stored value from map, or 0 if not set
        const paymentApplied = paymentAppliedMap.value.get(invoice.id) || 0;

        return {
            ...invoice,
            payment_applied: paymentApplied
        };
    });
});

// Page totals using the computed invoices with payment applied
const pageTotalInvoiceAmount = computed(() => {
    return invoicesWithPaymentApplied.value.reduce(
        (sum, item) => sum + (item.total_billable || 0),
        0
    );
});

const pageTotalOutstandingBalance = computed(() => {
    return invoicesWithPaymentApplied.value.reduce(
        (sum, item) => sum + (item.outstanding_balance || 0),
        0
    );
});

const pageTotalAppliedAmount = computed(() => {
    return invoicesWithPaymentApplied.value.reduce(
        (sum, item) => sum + (item.payment_applied || 0),
        0
    );
});

// Calculate the difference between amount received and selected invoices
const paymentDifference = computed(() => {
    if (!selectedInvoices.value.length) {
        return formData.value.amount_received;
    }
    return formData.value.amount_received - selectedInvoicesTotal.value;
});

// Determine if difference reason field should be shown
const showDifferenceReason = computed(() => {
    return selectedInvoices.value.length > 0 && paymentDifference.value !== 0;
});

// Determine the icon to display
const differenceIcon = computed(() => {
    if (!selectedInvoices.value.length || paymentDifference.value >= 0) {
        return 'pi pi-check-circle';
    }
    return 'pi pi-info-circle';
});

// Determine the icon color class
const differenceIconClass = computed(() => {
    if (!selectedInvoices.value.length || paymentDifference.value >= 0) {
        return 'text-green-500';
    }
    return 'text-red-500';
});

const differenceLabel = computed(() => {
    if (!selectedInvoices.value.length) return '';
    return paymentDifference.value === 0
        ? ''
        : paymentDifference.value > 0
          ? '(Unapplied)'
          : '(Over Applied)';
});

// Get the absolute value of difference for display
const displayDifference = computed(() => {
    return Math.abs(paymentDifference.value);
});

// Check if all required fields in Receipt Information are filled
const isReceiptFormValid = computed(() => {
    const basicFieldsValid =
        formData.value.receipt_date &&
        formData.value.amount_received > 0 &&
        formData.value.payment_method_id &&
        formData.value.reference_number &&
        formData.value.payment_type &&
        formData.value.customer_id;

    // If payment type is regular_invoice, at least one invoice must be selected
    if (
        formData.value.payment_type === 'regular_invoice' &&
        selectedInvoices.value.length === 0
    ) {
        return false;
    }

    // If difference reason field is visible, it must be filled
    if (showDifferenceReason.value) {
        return basicFieldsValid && formData.value.deduction_type_id;
    }

    return basicFieldsValid;
});

const pushRoute = (name) => {
    router.push({ name });
};

async function resetForm() {
    Object.assign(formData.value, {
        receipt_date: '',
        amount_received: 0,
        payment_method_id: '',
        reference_number: '',
        payment_type: '',
        customer_id: '',
        deduction_type_id: ''
    });
    selectedInvoices.value = [];
    invoices.value = [];
    paymentAppliedMap.value.clear(); // Clear payment applied map
    globalStore.clearErrors();
}

const search = async () => {
    pagination.resetPageParams();
    sortFilters.updateSearch(searchText.value);
    getCustomerInvoices();
};

const getPaymentMethods = async (searchText = '') => {
    try {
        loadingPaymentMethods.value = true;
        const params = {
            limit: 300
        };
        const payload = {
            search: {
                value: searchText
            },
            filters: [{ field: 'status', operator: '=', value: 1 }]
        };
        const res = await paymentMethodStore.list(payload, params);
        paymentMethods.value = res.data;
    } finally {
        loadingPaymentMethods.value = false;
    }
};

const getCustomers = async (searchText = '') => {
    try {
        loadingCustomers.value = true;
        const params = {
            limit: 300
        };
        const payload = {
            search: {
                value: searchText
            },
            filters: [{ field: 'status', operator: '=', value: 1 }]
        };
        const res = await customerStore.list(payload, params);
        customers.value = res.data;
    } finally {
        loadingCustomers.value = false;
    }
};

const getDeductionTypes = async (searchText = '') => {
    try {
        loadingDeductionTypes.value = true;
        const params = {
            limit: 300
        };
        const payload = {
            search: {
                value: searchText
            },
            filters: [{ field: 'status', operator: '=', value: 1 }]
        };
        const res = await deductionTypeStore.list(payload, params);
        deductionTypes.value = res.data;
    } finally {
        loadingDeductionTypes.value = false;
    }
};

const getCustomerInvoices = async () => {
    try {
        if (!formData.value.customer_id) return;
        loadingInvoices.value = true;
        const params = { limit: 100000 };
        const payload = {
            ...sortFilters.getSortFilters(searchText.value),
            includes: [{ relation: 'customer' }],
            filters: [
                {
                    field: 'status',
                    operator: '=',
                    value: 'approved'
                },
                {
                    field: 'payment_status',
                    operator: 'in',
                    value: ['unpaid', 'partially_paid']
                },
                {
                    field: 'customer_id',
                    operator: '=',
                    value: formData.value.customer_id
                }
            ]
        };
        const res = await invoiceStore.search(payload, params);
        invoices.value = res.data;
        totalInvoices.value = res.meta.total;
    } finally {
        loadingInvoices.value = false;
    }
};

const save = async () => {
    try {
        busy.value = true;
        const payload = {
            ...formData.value,
            deduction_type_id:
                displayDifference.value === 0
                    ? null
                    : formData.value.deduction_type_id,
            invoices: selectedInvoices.value.map((invoice) => ({
                id: Number(invoice.id),
                payment_applied: paymentAppliedMap.value.get(invoice.id) || 0
            }))
        };
        await receiptStore.create(payload);
        resetForm();
        pushRoute('Receipts');
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
};
</script>

<template>
    <TitleHeader>
        <template #title>
            <div class="flex items-center gap-5">
                <Button
                    type="button"
                    variant="outlined"
                    icon="pi pi-chevron-left"
                    size="large"
                    @click="pushRoute('Receipts')"
                    iconClass="!text-sm"
                    :loading="busy"
                />
                <div>
                    <h1 class="text-2xl sm:text-3xl font-bold">
                        Payment Receipts
                    </h1>
                </div>
            </div>
        </template>
    </TitleHeader>

    <Card class="py-4 px-4">
        <template #content>
            <div class="grid grid-cols-12 gap-4 space-y-3">
                <div class="col-span-12">
                    <h2
                        class="text-xl sm:text-2xl font-semibold leading-snug text-gray-800"
                    >
                        Receipt Information
                    </h2>
                    <p class="mt-1 text-sm text-gray-500">
                        Enter payment details below
                    </p>
                </div>
                <div class="col-span-12 sm:col-span-4">
                    <label class="block mb-2 required">Receipt Date</label>
                    <InputField
                        id="receipt_date"
                        :disabled="busy"
                        class="w-full"
                        v-model="formData.receipt_date"
                        variant="date"
                    />
                </div>
                <div class="col-span-12 sm:col-span-4">
                    <label class="block mb-2 required">Amount Received</label>
                    <InputField
                        id="amount_received"
                        :disabled="busy"
                        class="w-full"
                        inputClass="w-full"
                        v-model="formData.amount_received"
                        variant="number"
                        prefix="$"
                        :maxFractionDigits="2"
                        :minFractionDigits="2"
                        :min="0"
                        :step="1"
                    />
                </div>
                <div class="col-span-12 sm:col-span-4">
                    <label class="block mb-2 required">Payment Method</label>
                    <ApiDropdown
                        showClear
                        filter
                        placeholder="Select"
                        :loading="loadingPaymentMethods"
                        @search="getPaymentMethods"
                        :options="paymentMethods"
                        optionLabel="name"
                        optionValue="id"
                        id="payment_method_id"
                        v-model="formData.payment_method_id"
                        class="w-full"
                        :disabled="busy || loadingPaymentMethods"
                    />
                </div>
                <div class="col-span-12 sm:col-span-4">
                    <label class="block mb-2 required">Reference Number</label>
                    <InputField
                        id="reference_number"
                        :disabled="busy"
                        class="w-full"
                        v-model="formData.reference_number"
                        variant="text"
                    />
                </div>
                <div class="col-span-12 sm:col-span-4">
                    <label class="block mb-2 required">Payment Type</label>
                    <InputField
                        id="payment_type"
                        v-model="formData.payment_type"
                        variant="dropdown"
                        :options="paymentTypes"
                        optionLabel="name"
                        optionValue="code"
                        placeholder="Select"
                        class="w-full"
                        :disabled="busy"
                    />
                </div>
                <div class="col-span-12 sm:col-span-4">
                    <label class="block mb-2 required">Customer</label>
                    <ApiDropdown
                        showClear
                        filter
                        placeholder="Select"
                        :loading="loadingCustomers"
                        @search="getCustomers"
                        @change="getCustomerInvoices"
                        :options="customers"
                        optionLabel="name"
                        optionValue="id"
                        id="customer_id"
                        v-model="formData.customer_id"
                        class="w-full"
                        :disabled="busy || loadingCustomers"
                    />
                </div>
            </div>
        </template>
    </Card>

    <Card
        class="py-4 px-4 mt-5"
        v-if="
            formData.customer_id && formData.payment_type === 'regular_invoice'
        "
    >
        <template #content>
            <BaseTableClient
                v-model:selection="selectedInvoices"
                :value="invoicesWithPaymentApplied"
                :paginator="false"
                :loading="loadingInvoices"
                class="hide-select-all-checkbox"
            >
                <template #header>
                    <div
                        class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-5"
                    >
                        <div class="w-full sm:w-auto">
                            <h2
                                class="text-xl sm:text-2xl font-semibold leading-snug text-gray-800"
                            >
                                Outstanding Invoices
                            </h2>
                            <p class="mt-1 text-sm text-gray-500">
                                Select invoices to apply payment
                            </p>
                        </div>
                        <div
                            class="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-4 mt-3 sm:mt-0 w-full sm:w-auto"
                        >
                            <div class="w-full sm:w-64 md:w-80">
                                <Search
                                    v-model="searchText"
                                    @search="search"
                                    class="w-full"
                                />
                            </div>
                        </div>
                    </div>
                </template>

                <Column selectionMode="multiple" headerStyle="width: 3rem" />
                <Column
                    :sortable="true"
                    field="invoice_number"
                    header="Invoice Number"
                />
                <Column
                    :sortable="true"
                    field="invoice_date"
                    header="Invoice Date"
                >
                    <template #body="{ data }">
                        {{ formatDate(data.invoice_date) }}
                    </template>
                </Column>
                <Column
                    field="total_billable"
                    header="Invoice Amount"
                    class="amount-column"
                    sortable
                >
                    <template #body="{ data }">{{
                        moneyFormat(data.total_billable)
                    }}</template>
                    <template #footer>
                        <span class="font-semibold text-lg">{{
                            moneyFormat(pageTotalInvoiceAmount)
                        }}</span>
                    </template>
                </Column>
                <Column
                    field="outstanding_balance"
                    header="Outstanding Balance"
                    class="amount-column"
                    sortable
                >
                    <template #body="{ data }">{{
                        moneyFormat(data.outstanding_balance)
                    }}</template>
                    <template #footer>
                        <span class="font-semibold text-lg">{{
                            moneyFormat(pageTotalOutstandingBalance)
                        }}</span>
                    </template>
                </Column>
                <Column
                    field="payment_applied"
                    header="Payment Applied"
                    class="amount-column"
                    sortable
                >
                    <template #body="{ data }">{{
                        moneyFormat(data.payment_applied)
                    }}</template>
                    <template #footer>
                        <span class="font-semibold text-lg">{{
                            moneyFormat(pageTotalAppliedAmount)
                        }}</span>
                    </template>
                </Column>
                <template #empty> No invoices found. </template>
            </BaseTableClient>

            <div class="grid grid-cols-12 gap-4 space-y-3 items-end mt-10">
                <div
                    class="col-span-12 sm:col-span-6"
                    v-if="showDifferenceReason"
                >
                    <label class="block mb-2 required">Difference Reason</label>
                    <ApiDropdown
                        showClear
                        filter
                        placeholder="Select"
                        :loading="loadingDeductionTypes"
                        @search="getDeductionTypes"
                        :options="deductionTypes"
                        optionLabel="name"
                        optionValue="id"
                        id="deduction_type_id"
                        v-model="formData.deduction_type_id"
                        class="w-full"
                        :disabled="busy || loadingDeductionTypes"
                    />
                </div>
                <div
                    class="col-span-12 flex justify-end"
                    :class="
                        showDifferenceReason
                            ? 'sm:col-span-6'
                            : 'sm:col-span-12'
                    "
                >
                    <span
                        class="text-xl font-semibold gap-2 flex items-center"
                        :class="differenceIconClass"
                    >
                        <i :class="[differenceIcon, '!text-xl']"></i>
                        {{ moneyFormat(displayDifference) }}
                        <span v-if="differenceLabel">{{
                            differenceLabel
                        }}</span>
                    </span>
                </div>
            </div>
        </template>
    </Card>
    <Button
        class="!flex !ml-auto mt-7"
        :disabled="busy || !isReceiptFormValid"
        label="Save Receipt"
        icon="pi pi-check"
        @click="save"
        :loading="busy"
    />
</template>
