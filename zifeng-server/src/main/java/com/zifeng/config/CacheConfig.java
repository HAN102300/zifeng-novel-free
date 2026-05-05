package com.zifeng.config;

import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCache;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

import static java.util.Map.entry;

@Configuration
@EnableCaching
public class CacheConfig {

    private static final Map<String, Long> TTL_MAP = Map.ofEntries(
            entry("dashboard", TimeUnit.MINUTES.toMillis(2)),
            entry("sourceList", TimeUnit.MINUTES.toMillis(3)),
            entry("sourceStats", TimeUnit.MINUTES.toMillis(5)),
            entry("publicSources", TimeUnit.MINUTES.toMillis(5)),
            entry("sources", TimeUnit.MINUTES.toMillis(5)),
            entry("users", TimeUnit.MINUTES.toMillis(5)),
            entry("admins", TimeUnit.MINUTES.toMillis(5)),
            entry("bookshelf", TimeUnit.MINUTES.toMillis(3)),
            entry("readingHistory", TimeUnit.MINUTES.toMillis(3)),
            entry("userInfo", TimeUnit.MINUTES.toMillis(10)),
            entry("adminInfo", TimeUnit.MINUTES.toMillis(10))
    );

    @Bean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager(
                "dashboard", "sources", "sourceList", "sourceStats", "publicSources",
                "users", "admins", "bookshelf", "readingHistory",
                "userInfo", "adminInfo"
        ) {
            @Override
            protected Cache createConcurrentMapCache(String name) {
                long ttl = TTL_MAP.getOrDefault(name, TimeUnit.MINUTES.toMillis(5));
                return new TtlConcurrentMapCache(name, ttl);
            }
        };
    }

    private static class TtlConcurrentMapCache extends ConcurrentMapCache {
        private final long ttlMs;
        private final Map<Object, Long> expireMap = new ConcurrentHashMap<>();

        public TtlConcurrentMapCache(String name, long ttlMs) {
            super(name, new ConcurrentHashMap<>(), true);
            this.ttlMs = ttlMs;
        }

        @Override
        public void put(Object key, Object value) {
            expireMap.put(key, System.currentTimeMillis() + ttlMs);
            super.put(key, value);
        }

        @Override
        public ValueWrapper get(Object key) {
            Long expireAt = expireMap.get(key);
            if (expireAt != null && System.currentTimeMillis() > expireAt) {
                evict(key);
                return null;
            }
            return super.get(key);
        }

        @Override
        public void evict(Object key) {
            expireMap.remove(key);
            super.evict(key);
        }

        @Override
        public void clear() {
            expireMap.clear();
            super.clear();
        }
    }
}
