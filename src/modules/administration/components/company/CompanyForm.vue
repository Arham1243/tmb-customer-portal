<script setup>
import { computed, onBeforeMount, ref, watch } from 'vue';
import { ability } from '@/plugins/ability';
import countries from '@/static/countries.json';
import {
    timezones,
    dateFormats,
    weeklyTimesheetDateDisplayOptions,
    timesheetStartOptions,
    weekDays
} from '@/config/enums';
import { useGlobalStore } from '@/stores';
import { useCompanyStore } from '@/modules/administration/stores';
import PlaceholderImage from '@/assets/images/image_not_available.png';
import { onBeforeRouteLeave } from 'vue-router';
import { useFormDirty } from '@/composables/useFormDirty';
import { useHelpers } from '@/composables/useHelpers';
import { useCountryStateZip } from '@/composables/useCountryStateZip';

const globalStore = useGlobalStore();
const { filterFileFields } = useHelpers();
const myCompanyStore = useCompanyStore();
const busy = ref(false);
const loading = ref(false);
const showUnsavedDialog = ref(false);
const companyId = ref('');
const legalNameOverridden = ref(false);
const formData = ref({
    name: '',
    legal_name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    business_number: '',
    customer_default_travel_charge: 0,
    timezone: 'EST',
    date_format: 'mm/dd/yy',
    weekly_timesheet_date_format: 'mm/dd',
    timesheet_start: 'weekly',
    week_begins: 'SU',
    logo: null,
    logo_size: 'small'
});
const { isDirty, resetDirty } = useFormDirty(formData);
const { statesOptions, errors, getStates, validateZip, isZipValid } =
    useCountryStateZip(formData);
let nextRoute = null;

onBeforeMount(() => {
    getDetails();
});

watch(
    () => formData.value.name,
    (newVal) => {
        if (!legalNameOverridden.value) {
            formData.value.legal_name = newVal;
        }
    }
);

watch(
    () => formData.value.legal_name,
    (newVal, oldVal) => {
        if (oldVal !== null && newVal !== formData.value.name) {
            legalNameOverridden.value = true;
        }
    }
);

onBeforeRouteLeave((to, from, next) => {
    if (isDirty.value) {
        showUnsavedDialog.value = true;
        nextRoute = next;
    } else {
        next();
    }
});

const logoSizeClass = computed(() => {
    return formData.value.logo_size === 'large'
        ? 'h-48 sm:h-64 w-full'
        : 'h-24 sm:h-32 w-full';
});

const weekRange = computed(() => {
    const startDay = formData.value.week_begins || 'SU';
    const startIndex = weekDays.findIndex((d) => d.code === startDay);
    const endIndex = (startIndex + 6) % 7;
    return `${weekDays[startIndex].name} - ${weekDays[endIndex].name}`;
});

function onFileSelect(event) {
    const file = event.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        formData.value.logo = e.target.result;
    };
    reader.readAsDataURL(file);
}

function resetForm() {
    globalStore.clearErrors();
}

function cancel() {
    if (isDirty.value) {
        showUnsavedDialog.value = true;
    } else {
        getDetails();
    }
}

function confirmDiscard() {
    showUnsavedDialog.value = false;
    if (nextRoute) {
        const go = nextRoute;
        nextRoute = null;
        go();
    } else {
        getDetails();
    }
}

const getDetails = async () => {
    try {
        loading.value = true;
        const res = await myCompanyStore.getMyCompany();
        if (res) {
            companyId.value = res?.id;
            if (res.country) {
                formData.value.country = res.country;
                await getStates('load');
            }
            if (res.legal_name && res.legal_name !== res.name) {
                legalNameOverridden.value = true;
            }
            formData.value = { ...formData.value, ...res };
            resetDirty(res);
        } else {
            companyId.value = null;
        }
    } finally {
        loading.value = false;
        resetForm();
    }
};

const save = async () => {
    try {
        busy.value = true;
        const payload = filterFileFields(formData.value, ['logo']);
        await myCompanyStore.saveCompany(companyId.value, payload);
        window.location.reload();
    } catch (error) {
        if (error.response?.data?.errors?.zip?.length > 0) {
            errors.value.zip = error.response.data.errors.zip;
        }
        if (error.response?.data?.errors?.state?.length > 0) {
            errors.value.state = error.response.data.errors.state;
        }
    } finally {
        busy.value = false;
    }
};
</script>

<template>
    <Loader v-if="loading" />
    <template v-else>
        <TitleHeader>
            <template #title>
                <div>
                    <h1 class="text-2xl sm:text-3xl font-bold">My Company</h1>
                    <p class="mt-2 text-sm sm:text-base mx-auto sm:mx-0 mb-0">
                        Enter your company information in the fields provided to
                        begin setting up your business profile.
                    </p>
                </div>
            </template>
            <template
                #actions
                v-if="
                    ability.can('administration.create') ||
                    ability.can('administration.edit')
                "
            >
                <Button
                    label="Cancel"
                    variant="outlined"
                    class="w-full sm:w-auto"
                    @click="cancel"
                    :disabled="!isDirty || busy"
                />
                <Button
                    :disabled="!isDirty || busy || !isZipValid"
                    label="Save"
                    icon="pi pi-check"
                    iconPos="left"
                    @click="save"
                    :loading="busy"
                    class="w-full sm:w-auto"
                />
            </template>
        </TitleHeader>

        <Card class="p-3">
            <template #content>
                <div class="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div class="sm:col-span-7 space-y-6">
                        <div>
                            <label class="block mb-3 required">Name</label>
                            <InputField
                                id="name"
                                v-model="formData.name"
                                variant="text"
                                class="w-full"
                                :disabled="busy"
                                @keyup.enter="save"
                            />
                        </div>
                        <div>
                            <label class="block mb-3 required"
                                >Legal Name</label
                            >
                            <InputField
                                id="legal_name"
                                v-model="formData.legal_name"
                                variant="text"
                                class="w-full"
                                :disabled="busy"
                                @keyup.enter="save"
                            />
                        </div>
                        <div>
                            <label class="block mb-3 required"
                                >Main Phone</label
                            >
                            <InputField
                                id="phone"
                                v-model="formData.phone"
                                variant="phone"
                                class="w-full"
                                :disabled="busy"
                                @keyup.enter="save"
                            />
                        </div>

                        <div class="grid grid-cols-12 gap-5">
                            <div class="col-span-12">
                                <label class="block required mb-3"
                                    >Street Address</label
                                >
                                <InputField
                                    id="address"
                                    v-model="formData.address"
                                    variant="text"
                                    class="w-full"
                                    :disabled="busy"
                                    @keyup.enter="save"
                                />
                            </div>
                            <div class="col-span-6">
                                <label class="block required mb-3"
                                    >Country</label
                                >
                                <InputField
                                    id="country"
                                    showClear
                                    filter
                                    :disabled="busy"
                                    class="w-full"
                                    v-model="formData.country"
                                    variant="dropdown"
                                    placeholder="Select"
                                    optionLabel="name"
                                    optionValue="name"
                                    :options="countries"
                                    @change="() => getStates('change')"
                                />
                            </div>

                            <div class="col-span-6">
                                <label class="block required mb-3"
                                    >State/Province</label
                                >
                                <InputField
                                    id="state"
                                    showClear
                                    filter
                                    :disabled="busy"
                                    class="w-full"
                                    v-model="formData.state"
                                    variant="dropdown"
                                    placeholder="Select"
                                    optionLabel="name"
                                    optionValue="name"
                                    :options="statesOptions"
                                    :errorMessages="errors.state"
                                />
                            </div>

                            <div class="col-span-6">
                                <label class="block required mb-3">City</label>
                                <InputField
                                    id="city"
                                    v-model="formData.city"
                                    variant="text"
                                    class="w-full"
                                    :disabled="busy"
                                    @keyup.enter="save"
                                />
                            </div>

                            <div class="col-span-6">
                                <label class="block required mb-3"
                                    >ZIP/Postal Code</label
                                >
                                <InputField
                                    id="zip"
                                    v-model="formData.zip"
                                    variant="text"
                                    class="w-full"
                                    :disabled="busy"
                                    :errorMessages="errors.zip"
                                    @input="validateZip"
                                />
                            </div>
                        </div>

                        <div>
                            <label class="block mb-3">Business ID (FEIN)</label>
                            <InputField
                                id="business_number"
                                v-model="formData.business_number"
                                variant="text"
                                class="w-full"
                                :disabled="busy"
                                @keyup.enter="save"
                            />
                        </div>

                        <div>
                            <label class="block mb-3 required"
                                >Travel Charges (default for new
                                customers)</label
                            >
                            <InputField
                                id="customer_default_travel_charge"
                                :disabled="busy"
                                class="w-full"
                                v-model="
                                    formData.customer_default_travel_charge
                                "
                                variant="number"
                                @keyup.enter="save"
                                :step="1"
                                :min="0"
                                :max="99.99"
                                suffix="%"
                                :useGrouping="false"
                                :maxFractionDigits="2"
                                :minFractionDigits="2"
                            />
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block mb-3">Home Timezone</label>
                                <InputField
                                    id="timezone"
                                    v-model="formData.timezone"
                                    variant="dropdown"
                                    :options="timezones"
                                    optionLabel="name"
                                    optionValue="code"
                                    placeholder="Select"
                                    class="w-full"
                                    :disabled="busy"
                                />
                            </div>
                            <div>
                                <label class="block mb-3">Date Format</label>
                                <InputField
                                    id="date_format"
                                    v-model="formData.date_format"
                                    variant="dropdown"
                                    :options="dateFormats"
                                    optionLabel="name"
                                    optionValue="code"
                                    placeholder="Select"
                                    class="w-full"
                                    :disabled="busy"
                                />
                            </div>
                        </div>

                        <div class="grid grid-cols-12 gap-4">
                            <div class="col-span-6">
                                <label class="block mb-3"
                                    >Default Timesheet Start</label
                                >
                                <InputField
                                    id="timesheet_start"
                                    v-model="formData.timesheet_start"
                                    variant="dropdown"
                                    :options="timesheetStartOptions"
                                    optionLabel="name"
                                    optionValue="code"
                                    placeholder="Select"
                                    class="w-full"
                                    :disabled="busy"
                                />
                            </div>
                            <div class="col-span-6">
                                <label class="block mb-3"
                                    >Weekly Timesheet Date Format</label
                                >
                                <InputField
                                    id="weekly_timesheet_date_format"
                                    v-model="
                                        formData.weekly_timesheet_date_format
                                    "
                                    variant="dropdown"
                                    :options="weeklyTimesheetDateDisplayOptions"
                                    optionLabel="name"
                                    optionValue="code"
                                    placeholder="Select"
                                    class="w-full"
                                    :disabled="busy"
                                />
                            </div>
                            <div class="col-span-6">
                                <label class="block mb-3">Week Begins On</label>
                                <InputField
                                    id="week_begins"
                                    v-model="formData.week_begins"
                                    variant="dropdown"
                                    :options="weekDays"
                                    optionLabel="name"
                                    optionValue="code"
                                    placeholder="Select"
                                    class="w-full"
                                    :disabled="busy"
                                />
                            </div>
                            <div class="col-span-6">
                                <label class="block mb-3">Week Range</label>
                                <InputField
                                    id="week_range"
                                    v-model="weekRange"
                                    variant="text"
                                    disabled
                                    class="w-full"
                                    :disabled="busy"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="sm:col-span-1"></div>

                    <div class="sm:col-span-4 space-y-4">
                        <div class="grid grid-cols-12 gap-4 items-start">
                            <div class="col-span-12 sm:col-span-8 space-y-4">
                                <label
                                    class="block mb-3 font-semibold flex items-center gap-2"
                                >
                                    Company Logo
                                    <i
                                        class="pi pi-info-circle text-gray-400 cursor-pointer"
                                        v-tooltip.top="
                                            'The logo size is 500KB and best viewed as a square. It is used in a different part of the application.'
                                        "
                                    ></i>
                                </label>

                                <div
                                    class="border border-gray-300 rounded shadow-sm flex items-center justify-center bg-gray-50 dark:bg-gray-800"
                                    :class="logoSizeClass"
                                >
                                    <img
                                        v-if="formData.logo"
                                        :src="formData.logo"
                                        alt="Company Logo"
                                        class="object-contain h-full w-full"
                                    />
                                    <img
                                        v-else
                                        :src="PlaceholderImage"
                                        alt="Default Logo"
                                        class="object-contain h-full w-full"
                                    />
                                </div>
                                <div class="flex justify-center">
                                    <FileUpload
                                        name="companyLogo"
                                        mode="basic"
                                        customUpload
                                        auto
                                        chooseLabel="Upload"
                                        chooseIcon="pi pi-upload"
                                        :maxFileSize="500 * 1024"
                                        accept="image/png, image/jpeg, image/jpg, image/gif, image/webp"
                                        @select="onFileSelect"
                                        :disabled="busy"
                                    />
                                </div>
                            </div>

                            <div
                                class="col-span-12 sm:col-span-4 flex flex-col gap-4 mt-4 sm:mt-0 pt-2 sm:pt-10"
                            >
                                <div class="flex items-center gap-2">
                                    <InputField
                                        type="radio"
                                        v-model="formData.logo_size"
                                        value="small"
                                        variant="radio"
                                        inputId="small"
                                        :disabled="busy"
                                    />
                                    <label for="small" class="cursor-pointer"
                                        >Small</label
                                    >
                                </div>
                                <div class="flex items-center gap-2">
                                    <InputField
                                        type="radio"
                                        v-model="formData.logo_size"
                                        value="large"
                                        variant="radio"
                                        inputId="large"
                                        :disabled="busy"
                                    />
                                    <label for="large" class="cursor-pointer"
                                        >Large</label
                                    >
                                </div>
                            </div>
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
