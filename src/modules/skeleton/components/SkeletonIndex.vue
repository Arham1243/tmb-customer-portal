<script setup>
import '../assets/styles/style.css';
import { useSkeletonStore } from '../stores/Skeleton';
import { onMounted } from 'vue';

const store = useSkeletonStore();
onMounted(() => {
    store.logFunction();
});
</script>

<template>
    <div>
        <h1 class="test-b">title</h1>
    </div>
</template>
<style lang="scss" scoped></style>
