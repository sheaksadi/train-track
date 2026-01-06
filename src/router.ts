import { createRouter, createWebHistory } from 'vue-router';
import IndexPage from '@/pages/index.vue';

const routes = [
    {
        path: '/',
        name: 'home',
        component: IndexPage,
    },
    {
        path: '/edit',
        name: 'edit',
        component: () => import('@/pages/edit.vue'),
    },
    {
        path: '/map',
        name: 'map',
        component: () => import('@/pages/map.vue'),
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;

