<script setup>
import { onBeforeMount, ref, toRefs, watch } from 'vue';
import { useRoleStore, useUserStore } from '@/modules/administration/stores';
import { useHelpers } from '@/composables/useHelpers';
import { useSessionStore } from '@/stores';

const roleStore = useRoleStore();
const userStore = useUserStore();
const sessionStore = useSessionStore();
const { makeTitleCase } = useHelpers();

const props = defineProps({
    formData: { type: Object, required: true },
    isEditMode: { type: Boolean, default: false },
    busy: { type: Boolean, default: false }
});
const emit = defineEmits(['save']);

const { formData, busy } = toRefs(props);

const loadingRoles = ref(false);
const loadingPermissions = ref(false);
const roles = ref([]);
const rolePermissions = ref({});
const selectedPermissions = ref({});
const tableData = ref([]);
const actions = ['view', 'create', 'edit', 'delete'];
const userPermissions = ref({});
const currentUser = sessionStore.user;
const userId = currentUser.id;

onBeforeMount(async () => {
    if (formData.value.role_id) {
        getRolePermissions(formData.value.role_id);
    }
    if (userId) {
        getUserPermissions(userId);
    }
});

watch(
    selectedPermissions,
    () => {
        formData.value.permissions = buildPermissionsForBackend(
            selectedPermissions.value
        );
    },
    {
        deep: true
    }
);

watch(
    () => formData.value.role_id,
    () => {
        getRolePermissions(formData.value.role_id);
    }
);

const makeTableData = () => {
    tableData.value = Object.keys(rolePermissions.value || {}).map((entity) => {
        const perms = rolePermissions.value[entity];
        const selected = selectedPermissions.value[entity] || {};
        const row = { entity };
        Object.keys(perms).forEach((action) => {
            row[action] = selected.hasOwnProperty(action)
                ? selected[action]
                : false;
        });
        return row;
    });
};

function formatEntity(entity) {
    return entity
        .replace(/\./g, ' - ')
        .split(' ')
        .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
        .join(' ');
}

function togglePermission(entity, action, val) {
    if (!selectedPermissions.value[entity]) {
        selectedPermissions.value[entity] = {};
    }

    if (selectedPermissions.value[entity][action] !== null) {
        selectedPermissions.value[entity][action] = val;
    }
}

function buildPermissionsForBackend(permissions) {
    const result = [];

    Object.entries(permissions).forEach(([entity, actions]) => {
        Object.entries(actions).forEach(([action, value]) => {
            if (value === true) {
                result.push(`${entity}.${action}`);
            }
        });
    });

    return result;
}

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

const getRolePermissions = async (roleId) => {
    if (!roleId) return;
    try {
        loadingPermissions.value = true;
        const res = await roleStore.listRolePermissions(roleId);
        rolePermissions.value = JSON.parse(JSON.stringify(res));

        // Default: all permissions enabled
        selectedPermissions.value = {};
        Object.keys(rolePermissions.value).forEach((entity) => {
            selectedPermissions.value[entity] = {};
            Object.keys(rolePermissions.value[entity]).forEach((action) => {
                selectedPermissions.value[entity][action] = true;
            });
        });

        // If editing, overlay user-specific restrictions
        if (userId) {
            await getUserPermissions(userId);
        } else {
            makeTableData();
        }
    } finally {
        loadingPermissions.value = false;
    }
};

const getUserPermissions = async (userId) => {
    if (!userId) return;
    try {
        loadingPermissions.value = true;
        const res = await userStore.listUserPermissions(userId);
        userPermissions.value = JSON.parse(JSON.stringify(res));

        // Overlay user-specific permissions: uncheck permissions user doesn't have
        Object.keys(selectedPermissions.value).forEach((entity) => {
            Object.keys(selectedPermissions.value[entity]).forEach((action) => {
                const permString = `${entity}.${action}`;
                // If user has it, keep checked (true), else uncheck
                selectedPermissions.value[entity][action] =
                    userPermissions.value.includes(permString);
            });
        });

        makeTableData();
    } finally {
        loadingPermissions.value = false;
    }
};

const roleChanged = (newRoleId) => {
    getRolePermissions(newRoleId.value);
};
</script>

<template>
    <div class="grid grid-cols-12 gap-4 space-y-1">
        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">Your Role</label>
            <ApiDropdown
                showClear
                filter
                @search="getRoles"
                @change="roleChanged"
                placeholder="Select"
                class="w-full"
                v-model="formData.role_id"
                :loading="loadingRoles"
                :options="roles"
                optionLabel="name"
                optionValue="id"
                :disabled="true"
            />
        </div>
        <div class="col-span-12 !mt-5" v-if="formData.role_id && !loadingRoles">
            <DataTable :value="tableData" :loading="loadingPermissions">
                <Column field="entity" header="Permission">
                    <template #body="{ data }">
                        {{ formatEntity(data.entity) }}
                    </template>
                </Column>

                <Column
                    v-for="a in actions"
                    :key="a"
                    :field="a"
                    :header="a.charAt(0).toUpperCase() + a.slice(1)"
                >
                    <template #body="{ data }">
                        <div class="pl-3">
                            <InputField
                                :disabled="true"
                                variant="checkbox"
                                binary
                                :modelValue="data[a]"
                                @update:modelValue="
                                    (val) =>
                                        togglePermission(data.entity, a, val)
                                "
                            />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
