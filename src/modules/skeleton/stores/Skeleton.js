import { defineStore } from 'pinia';
import * as SkeletonService from '../services/Skeleton.service';

export const useSkeletonStore = defineStore('SkeletonStore', () => {
    const logFunction = () => {
        SkeletonService.test();
    };

    return {
        logFunction
    };
});
