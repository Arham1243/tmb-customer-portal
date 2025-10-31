<script setup>
import { ref } from 'vue';
import { defineProps } from 'vue';
const props = defineProps({
    formData: {
        type: Object,
        required: true
    }
});
const formData = ref({
    ...props.formData,
    parent: props.formData.parent?.name,
    paymentTerm: props.formData.paymentTerm?.name
});
</script>

<template>
    <h3 class="text-2xl font-bold mb-5">Company Information</h3>
    <div class="grid grid-cols-1 sm:grid-cols-12 gap-4 gap-y-5">
        <div class="col-span-6">
            <label class="block mb-3">Name</label>
            <InputField
                id="name"
                v-model="formData.name"
                variant="text"
                class="w-full"
                :disabled="true"
            />
        </div>
        <div class="col-span-6">
            <label class="block mb-3">Legal Name</label>
            <InputField
                id="legal_name"
                v-model="formData.legal_name"
                variant="text"
                class="w-full"
                :disabled="true"
            />
        </div>
        <div class="col-span-6">
            <label class="block mb-3">Payment Terms</label>
            <InputField
                id="payment_terms"
                v-model="formData.paymentTerm"
                variant="text"
                class="w-full"
                :disabled="true"
            />
        </div>
        <div class="col-span-6">
            <label class="block mb-3">Parent Customer</label>
            <InputField
                id="parent_customer"
                v-model="formData.parent"
                variant="text"
                class="w-full"
                :disabled="true"
            />
        </div>
        <div class="col-span-12">
            <label class="block mb-3">Street Address</label>
            <InputField
                id="address"
                v-model="formData.address"
                variant="text"
                class="w-full"
                :disabled="true"
            />
        </div>
        <div class="col-span-6">
            <label class="block mb-3">City</label>
            <InputField
                id="city"
                v-model="formData.city"
                variant="text"
                class="w-full"
                :disabled="true"
            />
        </div>
        <div class="col-span-6">
            <label class="block mb-3">State</label>
            <InputField
                id="state"
                v-model="formData.state"
                variant="text"
                class="w-full"
                :disabled="true"
            />
        </div>
        <div class="col-span-6">
            <label class="block mb-3">Zip </label>
            <InputField
                id="zip_code"
                v-model="formData.zip"
                variant="text"
                class="w-full"
                :disabled="true"
            />
        </div>
        <div class="col-span-6">
            <label class="block mb-3">Country</label>
            <InputField
                id="country"
                v-model="formData.country"
                variant="text"
                class="w-full"
                :disabled="true"
            />
        </div>
    </div>
</template>
