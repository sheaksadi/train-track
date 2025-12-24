import {defineStore} from 'pinia'

export const useTestStore = defineStore('test', {
    state: () => ({
        count: 0
    }),
    actions: {
        increment() {
            this.count++
        },
        async getHello() {
            const { data, pending, error } = useFetch('/api/hello', {
                query: { name: 'Sadi', age: 25 } // Sending query params
            });
            // console.log( await data.value)
            return  data.value;
        }
    }
})