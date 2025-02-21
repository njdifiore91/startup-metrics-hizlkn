import NodeCache from 'node-cache';

interface CacheOptions {
    ttl: number;
    max: number;
}

export class Cache {
    private cache: NodeCache;

    constructor(options: CacheOptions) {
        this.cache = new NodeCache({
            stdTTL: options.ttl,
            maxKeys: options.max,
            checkperiod: 60 // Check for expired keys every minute
        });
    }

    public async get<T>(key: string): Promise<T | undefined> {
        return this.cache.get<T>(key);
    }

    public async set(key: string, value: any, ttl: number = 300): Promise<boolean> {
        return this.cache.set(key, value, ttl);
    }

    public async del(key: string): Promise<number> {
        return this.cache.del(key);
    }

    public async flush(): Promise<void> {
        this.cache.flushAll();
    }

    public async keys(): Promise<string[]> {
        return this.cache.keys();
    }
} 