<script setup>
import { onBeforeMount, ref, toRefs, watch } from 'vue';
import { useRoleStore } from '@/modules/administration/stores';
import { useHelpers } from '@/composables/useHelpers';

const roleStore = useRoleStore();
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
const allChecked = ref(false);

onBeforeMount(async () => {
    if (formData.value.role_id) {
        getRolePermissions(formData.value.role_id);
    }
});

watch(
    () => formData.value.role_id,
    () => {
        getRolePermissions(formData.value.role_id);
    }
);

watch(
    selectedPermissions,
    () => {
        const perms = Object.values(selectedPermissions.value).flatMap(
            (actions) => Object.values(actions)
        );
        allChecked.value = perms.every((v) => v === true);
    },
    { deep: true }
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
    selectedPermissions.value[entity][action] = val;
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
        const res = await roleStore.search(payload, params);
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
        const res = await roleStore.getRolePermissions(roleId);
        rolePermissions.value = JSON.parse(JSON.stringify(res));
        selectedPermissions.value = {};
        Object.keys(rolePermissions.value).forEach((entity) => {
            selectedPermissions.value[entity] = {};
            Object.entries(rolePermissions.value[entity]).forEach(
                ([action, allowed]) => {
                    selectedPermissions.value[entity][action] = allowed;
                }
            );
        });
        makeTableData();
    } finally {
        loadingPermissions.value = false;
    }
};

const roleChanged = (newRoleId) => {
    getRolePermissions(newRoleId.value);
};

const toggleAllPermissions = () => {
    Object.keys(selectedPermissions.value).forEach((entity) => {
        Object.keys(selectedPermissions.value[entity]).forEach((action) => {
            selectedPermissions.value[entity][action] = allChecked.value;
        });
    });
    makeTableData();
};
</script>

<template>
    <div class="grid grid-cols-12 gap-4 items-end">
        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-1 text-sm">Select Role</label>
            <ApiDropdown
                showClear
                filter
                @search="getRoles"
                @change="roleChanged"
                placeholder="Select"
                class="w-full text-sm"
                v-model="formData.role_id"
                :loading="loadingRoles"
                :options="roles"
                optionLabel="name"
                optionValue="id"
                :disabled="busy || loadingRoles"
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
                                disabled
                                variant="checkbox"
                                binary
                                :modelValue="data[a]"
                                @update:modelValue="
                                    (val) =>
                                        togglePermission(data.entity, a, val)
                                "
                                class="highlight-disabled-checkbox"
                            />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
