import router from '@/routes';
import pinia from '@/stores';
import PrimeVue from 'primevue/config';
import AppPreset from './app-preset';
import { abilitiesPlugin } from '@casl/vue';
import { ability } from '@/plugins/ability';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import Search from '@/components/common/Search.vue';
import BaseDialog from '@/components/common/BaseDialog.vue';
import ApiDropdown from '@/components/common/ApiDropdown.vue';
import ApiMultiselect from '@/components/common/ApiMultiselect.vue';
import TypeConfirmation from '@/components/common/TypeConfirmation.vue';
import BccRecipientsField from '@/components/common/BccRecipientsField.vue';
import 'vue-tel-input/vue-tel-input.css';
import '@/assets/css/styles.scss';

import VueTelInput from 'vue-tel-input';

export function registerPlugins(app) {
    app.use(router);
    app.use(pinia);
    app.use(PrimeVue, {
        ripple: true,
        theme: {
            preset: AppPreset,
            options: {
                darkModeSelector: '.app-dark'
            }
        }
    });
    app.use(VueTelInput);
    app.component('Search', Search);
    app.component('BaseDialog', BaseDialog);
    app.component('ApiDropdown', ApiDropdown);
    app.component('ApiMultiselect', ApiMultiselect);
    app.component('TypeConfirmation', TypeConfirmation);
    app.component('BccRecipientsField', BccRecipientsField);
    app.use(abilitiesPlugin, ability, {
        useGlobalProperties: true
    });

    app.use(ToastService);
    app.use(ConfirmationService);
}
