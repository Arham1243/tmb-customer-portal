<script setup>
import Logo from '@/assets/images/logo.png';
</script>

<template>
    <div
        class="w-screen h-screen flex items-center justify-center bg-[#F6F9FB] overflow-x-hidden pb-4"
    >
        <div class="w-full max-w-[470px]">
            <div
                class="bg-white custom-shadow rounded-lg text-gray-800 px-[2.25rem] sm:px-[3.25rem] py-[3.5rem]"
            >
                <router-view />
            </div>
        </div>
        <Toast />
    </div>
</template>
<style scoped>
.custom-shadow {
    box-shadow:
        0 20px 25px -5px rgb(0 0 0 / 0.1),
        0 8px 10px -6px rgb(0 0 0 / 0.1);
}
</style>
