<script setup>
import { ref, watch } from 'vue';
import { useSessionStore } from '@/stores';
import countries from '@/static/countries.json';

const sessionStore = useSessionStore();

const props = defineProps({
    modelValue: {
        type: [String, null],
        required: true
    }
});

const emit = defineEmits(['update:modelValue']);
const phoneCountry = ref({});
const phone = ref(props.modelValue || phoneCountry.value?.dialCode);
const myCompanyCountry = sessionStore.myCompany?.country || '';
const myCompanyCountryCode = myCompanyCountry
    ? countries.find((c) => c.name === myCompanyCountry)?.iso2
    : null;
const defaultCountry = myCompanyCountryCode
    ? myCompanyCountryCode.toLowerCase()
    : 'us';

const countryChanged = (country) => {
    phoneCountry.value = country;
};
watch(phone, (newValue) => {
    emit('update:modelValue', newValue);
});
</script>

<template>
    <vue-tel-input
        v-model="phone"
        :validCharactersOnly="false"
        mode="international"
        :defaultCountry="defaultCountry"
        autoFormat
        :dropdownOptions="{
            above: false,
            showFlags: true,
            autocomplete: true,
            showSearchBox: true,
            showDialCodeInList: true,
            showDialCodeInSelection: false
        }"
        :inputOptions="{
            placeholder: 'Enter Phone'
        }"
        @country-changed="countryChanged"
    >
        <template #arrow-icon> <i class="pi pi-chevron-down"></i> </template
    ></vue-tel-input>
</template>

<style lang="scss">
.vue-tel-input.vue-tel-input {
    &:focus-within {
        box-shadow: none;
        border-color: none;
    }
    height: 36px;
    border: none;
}

.vti__dropdown-list.above {
    width: 435px;
}

.vti__dropdown-list.below {
    width: 435px;
}

.vti__dropdown {
    width: 6rem !important;
    &:open {
        width: 100%;
    }
    &:focus {
        border-color: var(--primary-color);
    }
    &:hover {
        border-color: var(--primary-color);
        background-color: white;
    }
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    width: 25%;
}

.vti__input.vti__input {
    &:focus {
        border-color: var(--primary-color);
    }
    &:hover {
        border-color: var(--primary-color);
    }
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    margin-left: 5px;
    font-family: 'Inter', sans-serif;
    font-size: 1rem;
}

.vti__selection {
    justify-content: space-between;
}

.vti__country-code {
    font-size: 1rem !important;
    color: var(--p-inputtext-color) !important;
}

.vue-tel-input.disabled .vti__dropdown {
    background-color: #e9ecef;
    pointer-events: none;
    opacity: 0.5;
}

.vue-tel-input.disabled .vti__input {
    background-color: #e9ecef;
    pointer-events: none;
    opacity: 0.5;
}

/* Dark mode */
.layout-dark .vue-tel-input.vue-tel-input {
    background-color: var(--p-inputtext-background);
    color: var(--p-inputtext-color);
    border: 1px solid #374151;
}

.layout-dark .vti__input.vti__input {
    background-color: var(--p-inputtext-background);
    color: var(--p-inputtext-color);
    border: none;

    &:focus,
    &:hover {
        border-color: var(--primary-color);
    }

    &::placeholder {
        color: #fff;
    }
}

.layout-dark .vti__dropdown,
.layout-dark .vti__dropdown.open,
.layout-dark .vti__dropdown-list {
    background-color: var(--p-inputtext-background) !important;
    color: var(--p-inputtext-color) !important;
    border: 1px solid #374151 !important;
}

.layout-dark .vti__dropdown-item.highlighted,
.layout-dark .vti__dropdown-item:hover {
    background-color: var(--p-select-option-focus-background) !important;
    color: var(--p-select-option-focus-color) !important;
}
</style>
