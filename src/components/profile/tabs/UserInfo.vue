<script setup>
import { computed, ref, toRefs } from 'vue';
import { useRoleStore, useUserStore } from '@/modules/administration/stores';
import { useHelpers } from '@/composables/useHelpers';
import { useSessionStore } from '@/stores';
import countries from '@/static/countries.json';
import PlaceholderImage from '@/assets/images/image_not_available.png';
import { useUserRole } from '@/composables/useUserRole';

const roleStore = useRoleStore();
const userStore = useUserStore();
const { makeTitleCase } = useHelpers();
const sessionStore = useSessionStore();
const currentUser = sessionStore.user;
const { isAdmin, isApprover } = useUserRole();

const props = defineProps({
    formData: { type: Object, required: true },
    busy: { type: Boolean, required: true, default: false },
    errors: { type: Object, required: true },
    statesOptions: { type: Array, required: true },
    getStates: { type: Function, required: true },
    validateZip: { type: Function, required: true }
});

const { formData, busy, errors, statesOptions } = toRefs(props);
const getStates = props.getStates;
const validateZip = props.validateZip;
const roles = ref([]);
const loadingRoles = ref(false);
const supervisors = ref([]);
const primaryApprovers = ref([]);
const secondaryApprovers = ref([]);
const loadingSupervisors = ref(false);
const loadingPrimaryApprovers = ref(false);
const loadingSecondaryApprovers = ref(false);
const emit = defineEmits(['save']);
const save = () => {
    emit('save');
};

const statusOptions = computed(() => {
    const base = [
        { name: 'Active', code: 'active' },
        { name: 'Inactive', code: 'inactive' }
    ];
    return base;
});

const canEditFields = computed(() => isAdmin.value || isApprover.value);

const getRoles = async (searchText = '') => {
    try {
        loadingRoles.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            sort: [{ field: 'name', order: 'asc' }],
            filters: [{ field: 'status', operator: '=', value: 1 }]
        };
        const res = await roleStore.list(payload, params);
        roles.value = res.data?.map((r) => ({
            id: r.id,
            name: makeTitleCase(r.name)
        }));
    } finally {
        loadingRoles.value = false;
    }
};

const getUsers = async (key, searchText = '') => {
    const userConfigs = {
        supervisors: {
            list: supervisors,
            loading: loadingSupervisors,
            role: 'manager'
        },
        primaryApprovers: {
            list: primaryApprovers,
            loading: loadingPrimaryApprovers,
            role: 'approver'
        },
        secondaryApprovers: {
            list: secondaryApprovers,
            loading: loadingSecondaryApprovers,
            role: 'approver'
        }
    };
    const { list, loading, role } = userConfigs[key];
    loading.value = true;
    try {
        const res = await userStore.list(
            {
                search: { value: searchText },
                sort: [{ field: 'name', order: 'asc' }]
            },
            { limit: 300 }
        );
        list.value =
            res.data?.map((u) => ({ id: u.id, name: makeTitleCase(u.name) })) ||
            [];
    } finally {
        loading.value = false;
    }
};

function onFileSelect(event) {
    const file = event.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        formData.value.profile_image = e.target.result;
    };
    reader.readAsDataURL(file);
}
</script>

<template>
    <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3 required">Username</label>
            <InputField
                id="username"
                :disabled="!canEditFields"
                class="w-full"
                v-model="formData.username"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3 required">Full Name</label>
            <InputField
                id="name"
                :disabled="!canEditFields"
                class="w-full"
                v-model="formData.name"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Status</label>
            <InputField
                v-if="formData.status !== 'pending'"
                id="status"
                :disabled="!canEditFields"
                class="w-full"
                v-model="formData.status"
                placeholder="Select"
                variant="dropdown"
                optionLabel="name"
                optionValue="code"
                :options="statusOptions"
            />
            <InputField
                v-else
                id="status"
                :disabled="!canEditFields"
                class="w-full"
                v-model="formData.status"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3 required">Primary Email</label>
            <InputField
                id="email"
                :disabled="!canEditFields"
                class="w-full"
                v-model="formData.email"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3 required">Mobile Phone</label>
            <InputField
                id="phone"
                :disabled="busy"
                class="w-full"
                v-model="formData.phone"
                variant="phone"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Role</label>
            <ApiDropdown
                id="role_id"
                showClear
                filter
                @search="getRoles"
                placeholder="Select"
                class="w-full"
                v-model="formData.role_id"
                :loading="loadingRoles"
                :options="roles"
                optionLabel="name"
                optionValue="id"
                :disabled="!canEditFields"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Supervisor/Manager</label>
            <ApiDropdown
                id="supervisor_id"
                placeholder="Select"
                class="w-full"
                showClear
                filter
                :loading="loadingSupervisors"
                @search="getUsers('supervisors')"
                v-model="formData.supervisor_id"
                :options="supervisors"
                optionLabel="name"
                optionValue="id"
                :disabled="!canEditFields || loadingSupervisors || busy"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Primary Approver</label>
            <ApiDropdown
                showClear
                filter
                id="primary_approver_id"
                placeholder="Select"
                class="w-full"
                :loading="loadingPrimaryApprovers"
                @search="getUsers('primaryApprovers')"
                v-model="formData.primary_approver_id"
                :options="primaryApprovers"
                optionLabel="name"
                optionValue="id"
                :disabled="!canEditFields || loadingSupervisors || busy"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Secondary Approver</label>
            <ApiDropdown
                showClear
                filter
                id="secondary_approver_id"
                placeholder="Select"
                class="w-full"
                :loading="loadingSecondaryApprovers"
                @search="getUsers('secondaryApprovers')"
                v-model="formData.secondary_approver_id"
                :options="secondaryApprovers"
                optionLabel="name"
                optionValue="id"
                :disabled="!canEditFields || loadingSupervisors || busy"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3 required">Country</label>
            <InputField
                id="country"
                showClear
                filter
                :disabled="!canEditFields"
                class="w-full"
                v-model="formData.country"
                variant="dropdown"
                placeholder="Select"
                optionLabel="name"
                optionValue="name"
                :options="countries"
                @change="() => getStates('change')"
                readonly="true"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">State/Province</label>
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

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">City</label>
            <InputField
                id="city"
                :disabled="busy"
                class="w-full"
                v-model="formData.city"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">ZIP</label>
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

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Street Address 1</label>
            <InputField
                id="street_address_1"
                :disabled="busy"
                class="w-full"
                v-model="formData.street_address_1"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Street Address 2</label>
            <InputField
                id="street_address_2"
                :disabled="busy"
                class="w-full"
                v-model="formData.street_address_2"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3 required">Start Date</label>
            <InputField
                id="start_date"
                :disabled="!canEditFields"
                class="w-full"
                v-model="formData.start_date"
                variant="date"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Last Day at Service</label>
            <InputField
                id="last_day_at_service"
                :disabled="!canEditFields"
                class="w-full"
                v-model="formData.last_day_at_service"
                variant="date"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Date of Birth</label>
            <InputField
                id="date_of_birth"
                :disabled="!canEditFields"
                class="w-full"
                v-model="formData.date_of_birth"
                variant="date"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Secondary Email</label>
            <InputField
                id="secondary_email"
                :disabled="busy"
                class="w-full"
                v-model="formData.secondary_email"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Secondary Phone</label>
            <InputField
                id="secondary_phone"
                :disabled="busy"
                class="w-full"
                v-model="formData.secondary_phone"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Anniversary Date</label>
            <InputField
                id="anniversary_date"
                :disabled="busy"
                class="w-full"
                v-model="formData.anniversary_date"
                variant="date"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Emergency Contact Name</label>
            <InputField
                id="emergency_contact_name"
                :disabled="busy"
                class="w-full"
                v-model="formData.emergency_contact_name"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Emergency Contact Phone</label>
            <InputField
                id="emergency_contact_phone"
                :disabled="busy"
                class="w-full"
                v-model="formData.emergency_contact_phone"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Emergency Contact Email</label>
            <InputField
                id="emergency_contact_email"
                :disabled="busy"
                class="w-full"
                v-model="formData.emergency_contact_email"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 flex justify-center mt-4">
            <div class="flex flex-col items-center gap-4">
                <label class="block font-semibold flex items-center gap-2">
                    Profile Picture
                    <i
                        class="pi pi-info-circle text-gray-400 cursor-pointer"
                        v-tooltip.top="
                            'The profile picture size is 500KB and best viewed as a square.'
                        "
                    ></i>
                </label>

                <div
                    class="border border-gray-300 rounded-full shadow-sm flex items-center justify-center bg-gray-50 dark:bg-gray-800 h-40 w-40 overflow-hidden"
                >
                    <img
                        v-if="formData.profile_image"
                        :src="formData.profile_image"
                        alt="Profile Picture"
                        class="object-cover h-full w-full"
                    />
                    <img
                        v-else
                        :src="PlaceholderImage"
                        alt="Default Profile"
                        class="object-contain h-full w-full"
                    />
                </div>
                <div class="flex justify-center">
                    <FileUpload
                        name="profileImage"
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
        </div>
    </div>
</template>
