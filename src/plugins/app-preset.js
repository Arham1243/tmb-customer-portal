import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const AppPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#e6e9f6',
            100: '#c3cce9',
            200: '#9fb0db',
            300: '#7b94ce',
            400: '#5c79c1',
            500: '#2d55a5',
            600: '#274d95',
            700: '#213e7a',
            800: '#1a3060',
            900: '#142345',
            950: '#0f172f'
        },
        formField: {
            padding: {
                x: '0.75rem',
                y: '0.6rem'
            }
        }
    },
    components: {
        button: {
            root: {
                padding: {
                    x: '1.15rem',
                    y: '.63rem'
                }
            }
        }
    }
});

export default AppPreset;
