<script setup>
import { useLayout } from '@/layout/composables/layout';
import AppBreadcrumb from './AppBreadcrumb.vue';
import { useSessionStore } from '@/stores';
const sessionStore = useSessionStore();
const currentUser = sessionStore.user;

const {
    toggleMenu,
    layoutConfig,
    isDarkTheme,
    layoutState,
    toggleConfigSidebar
} = useLayout();

function showProfileSidebar() {
    layoutState.profileSidebarVisible = !layoutState.profileSidebarVisible;
}
function toggleDarkMode(event) {
    if (!document.startViewTransition) {
        executeDarkModeToggle();
        return;
    }

    document.startViewTransition(() => executeDarkModeToggle());
}

function executeDarkModeToggle() {
    layoutConfig.darkTheme = !layoutConfig.darkTheme;
    document.documentElement.classList.toggle('app-dark');
}
</script>

<template>
    <div class="layout-topbar">
        <div class="topbar-start">
            <Button
                type="button"
                class="topbar-menubutton p-trigger"
                @click="toggleMenu"
            >
                <i class="pi pi-bars"></i>
            </Button>

            <AppBreadcrumb class="topbar-breadcrumb"></AppBreadcrumb>
        </div>

        <div class="topbar-end">
            <ul class="topbar-menu">
                <li class="topbar-search">
                    <IconField>
                        <InputIcon class="pi pi-search" />
                        <InputText
                            type="text"
                            placeholder="Search"
                            class="w-48 sm:w-full"
                        />
                    </IconField>
                </li>
                <li>
                    <Button
                        :icon="
                            layoutConfig.darkTheme ? 'pi pi-sun' : 'pi pi-moon'
                        "
                        rounded
                        @click="toggleDarkMode"
                        :class="
                            layoutConfig.darkTheme
                                ? 'bg-gray-700 text-white'
                                : ''
                        "
                    />
                </li>
                <li class="topbar-profile">
                    <Button
                        type="button"
                        class="topbar-sidebarbutton"
                        @click="showProfileSidebar"
                    >
                        <img
                            :src="
                                currentUser.profile_image ||
                                '/demo/images/avatar/avatar.png'
                            "
                            alt="Profile"
                        />
                    </Button>
                </li>
            </ul>
        </div>
    </div>
</template>

<style lang="scss" scoped></style>
