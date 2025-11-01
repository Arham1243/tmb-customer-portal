<script setup>
import { computed, ref } from 'vue';
import { useCustomerStore } from '@/stores';

const customerStore = useCustomerStore();
const busy = ref(false);
const formData = ref({
    password: '',
    password_confirmation: ''
});

const resetForm = () => {
    formData.value = {
        password: '',
        password_confirmation: ''
    };
};

const rules = ref({
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false
});

const validatePassword = () => {
    const password = formData.value.password;

    rules.value.minLength = password.length >= 8;
    rules.value.uppercase = /[A-Z]/.test(password);
    rules.value.lowercase = /[a-z]/.test(password);
    rules.value.number = /[0-9]/.test(password);
    rules.value.symbol = /[@$!%*#?&]/.test(password);
};

const isPasswordValid = computed(
    () =>
        rules.value.minLength &&
        rules.value.uppercase &&
        rules.value.lowercase &&
        rules.value.number &&
        rules.value.symbol
);

const changePassword = async () => {
    busy.value = true;
    try {
        await customerStore.changeProfilePassword(formData.value);
        resetForm();
    } finally {
        busy.value = false;
    }
};
</script>

<template>
    <div class="flex items-center justify-between mb-7">
        <h3 class="text-2xl font-bold">Change Password</h3>
        <Button
            label="Update Password"
            :loading="busy"
            :disabled="busy || !isPasswordValid"
            @click="changePassword"
        />
    </div>

    <Card class="mb-10">
        <template #content>
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div class="mb-3 col-span-12">
                    <label class="block mb-3 required">New Password</label>
                    <InputField
                        variant="password"
                        @input="validatePassword"
                        toggleMask
                        id="password"
                        v-model="formData.password"
                        class="w-full"
                        inputClass="w-full"
                        :disabled="busy"
                        :feedback="false"
                    />
                </div>

                <div class="mb-3 col-span-12">
                    <label class="block mb-3 required">Confirm Password</label>
                    <InputField
                        id="password_confirmation"
                        variant="password"
                        @input="validatePassword"
                        v-model="formData.password_confirmation"
                        class="w-full"
                        inputClass="w-full"
                        toggleMask
                        :disabled="busy"
                        :feedback="false"
                    />
                </div>

                <div class="mb-6 col-span-12 mt-3">
                    <label class="font-semibold mb-4 block"
                        >Password must contain the following:</label
                    >
                    <div class="space-y-1">
                        <div
                            :class="[
                                'font-medium !mb-2',
                                {
                                    valid: rules.minLength,
                                    invalid: !rules.minLength
                                }
                            ]"
                        >
                            <span class="pl-3">At least 8 characters</span>
                        </div>
                        <div
                            :class="[
                                'font-medium !mb-2',
                                {
                                    valid: rules.uppercase,
                                    invalid: !rules.uppercase
                                }
                            ]"
                        >
                            <span class="pl-3">One upper case letter</span>
                        </div>
                        <div
                            :class="[
                                'font-medium !mb-2',
                                {
                                    valid: rules.lowercase,
                                    invalid: !rules.lowercase
                                }
                            ]"
                        >
                            <span class="pl-3">One lower case letter</span>
                        </div>
                        <div
                            :class="[
                                'font-medium !mb-2',
                                { valid: rules.number, invalid: !rules.number }
                            ]"
                        >
                            <span class="pl-3">At least one number</span>
                        </div>
                        <div
                            :class="[
                                'font-medium !mb-2',
                                { valid: rules.symbol, invalid: !rules.symbol }
                            ]"
                        >
                            <span class="pl-3"
                                >At least one symbol @$!%*#?&</span
                            >
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </Card>
</template>
<style lang="scss" scoped>
.valid,
.valid::before {
    color: #0e4f26;
}
.valid::before {
    content: '\e909';
    font-family: 'PrimeIcons';
}
.invalid,
.invalid::before {
    color: #b32b23;
}
.invalid::before {
    content: '\e90b';
    font-family: 'PrimeIcons';
}
</style>
