import { defineEventHandler, getQuery } from 'h3';

export default defineEventHandler((event) => {
    const query = getQuery(event); // Get query params

    return {
        message: 'Hello, world!',
        receivedQuery: query
    };
});