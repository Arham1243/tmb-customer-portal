<script setup>
import PhoneInput from './PhoneInput.vue';
import DateField from './DateField.vue';
import { truncate } from 'lodash-es';

defineProps({
    variant: {
        type: String,
        required: true
    },
    errorMessages: {
        type: [String, Array]
    }
});
</script>
<template>
    <InputText
        v-if="variant == 'text'"
        v-bind="$attrs"
        @input="
            $attrs['onUpdate:modelValue'] &&
            $attrs['onUpdate:modelValue'](
                $event.target.value === '' ? null : $event.target.value
            )
        "
    />
    <Textarea
        v-else-if="variant == 'textarea'"
        v-bind="$attrs"
        spellcheck="true"
        @input="
            $attrs['onUpdate:modelValue'] &&
            $attrs['onUpdate:modelValue'](
                $event.target.value === '' ? null : $event.target.value
            )
        "
    />
    <AutoComplete v-else-if="variant == 'autocomplete'" v-bind="$attrs" />
    <Chips v-else-if="variant == 'chips'" v-bind="$attrs" />
    <Checkbox v-else-if="variant == 'checkbox'" v-bind="$attrs" />
    <RadioButton v-else-if="variant == 'radio'" v-bind="$attrs" />
    <InputNumber
        v-else-if="variant == 'number'"
        v-bind="$attrs"
        :maxFractionDigits="2"
        :max="999999999999999"
        @input="
            $attrs['onUpdate:modelValue'] &&
            $attrs['onUpdate:modelValue']($event.value)
        "
    />
    <Password v-else-if="variant == 'password'" v-bind="$attrs" />
    <MultiSelect v-else-if="variant == 'multiselect'" v-bind="$attrs" />
    <Select v-else-if="variant == 'dropdown'" v-bind="$attrs">
        <template #option="{ option }" v-if="$attrs.tooltip">
            <div
                v-if="
                    option.value
                        ? option.value.length > ($attrs.tooltipLength ?? 20)
                        : option.name.length > ($attrs.tooltipLength ?? 20)
                "
                v-tooltip.top="option.value ?? option.name"
            >
                {{
                    truncate(option.name, {
                        length: $attrs.tooltipLength ?? 20
                    })
                }}
            </div>
        </template>
    </Select>
    <SelectButton v-else-if="variant == 'selectButton'" v-bind="$attrs" />
    <ToggleSwitch v-else-if="variant == 'switch'" v-bind="$attrs" />
    <PhoneInput v-else-if="variant == 'phone'" v-bind="$attrs" />
    <DateField v-else-if="variant == 'date'" v-bind="$attrs" />
</template>
