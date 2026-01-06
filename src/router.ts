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
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
