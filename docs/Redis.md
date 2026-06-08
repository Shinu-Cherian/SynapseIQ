# Redis (Remote Dictionary Server) Cache Deep Dive

This document explains what Redis is, why we use it, how it fits into the SynapseIQ architecture, and common interview questions related to caching.

---

## 1. What is Redis?

Redis is an open-source, in-memory key-value data structure store. It is extremely fast (sub-millisecond latency) because it keeps all data in RAM rather than reading/writing to traditional disk databases (like PostgreSQL).

### Core Properties
* **In-Memory**: Fast access, but volatile if not configured with persistence.
* **Single-Threaded**: Redis uses a single-threaded event loop to handle commands. This prevents race conditions and makes operations atomic by default.
* **Data Persistence Options**:
  - **RDB (Redis Database)**: Point-in-time snapshots of your dataset at specified intervals.
  - **AOF (Append Only File)**: Logs every write command received by the server. Fast recovery but larger file size.

---

## 2. Caching Strategies

How you read and write cache determines system consistency and latency.

### 1. Cache-Aside (Lazy Loading) - *Used in SynapseIQ*
1. Application receives a read request.
2. Checks Cache:
   - **Cache Hit**: Returns data from cache.
   - **Cache Miss**: Queries PostgreSQL database, saves the result to Redis, and returns the data.
3. *Pros*: Simple, memory efficient (only caches what is requested).
4. *Cons*: First read is slow (cache miss), potential stale data if postgres update does not invalidate/delete cache.

### 2. Write-Through
1. Application writes data to the cache.
2. The cache immediately writes it to the database before returning success.
3. *Pros*: High consistency; cache is never stale.
4. *Cons*: Write latency is higher.

### 3. Write-Back (Write-Behind)
1. Application writes to cache first.
2. Cache queues the write and asynchronously writes it to the database in batches.
3. *Pros*: Insanely fast writes.
4. *Cons*: Risk of data loss if the cache server crashes before data is synced to the database.

---

## 3. How SynapseIQ Uses Redis

We integrate Redis into SynapseIQ for four primary workloads:

```
                  ┌────────────────────────┐
                  │     Next.js Client     │
                  └───────────┬────────────┘
                              │ API Call
                              ▼
                  ┌────────────────────────┐
                  │    FastAPI Backend     │
                  └─────┬────────────┬─────┘
                        │            │
             Cache Miss │            │ Cache Hit / Token Check
                        ▼            ▼
         ┌──────────────────┐    ┌──────────────────┐
         │ PostgreSQL DB    │    │      Redis       │
         │ (Disk-backed)    │    │   (In-Memory)    │
         └──────────────────┘    └──────────────────┘
```

1. **Session/Token Blacklist**: Checking JWT tokens that were revoked on user logout instantly.
2. **API Cache**: Caching heavy dashboard analytics data (like monthly sprint progress) to prevent database overloading.
3. **Rate Limiting**: Preventing DDoS attacks or brute-force API requests by tracking user IP hitting endpoints.
4. **Chat & Notification Buffering**: Serving as a temporary broker to hold active websocket sessions.

---

## 4. Software Engineering Interview Questions

### Q1: Why is Redis single-threaded, and how does it achieve high performance?
> **Answer**: Redis is single-threaded to avoid the overhead of context switching, thread locking, and race conditions. It achieves extreme performance because:
> 1. It is **in-memory** (RAM access is orders of magnitude faster than SSDs).
> 2. It uses **non-blocking I/O multiplexing** (epoll) to handle thousands of concurrent client connections.

### Q2: What is a Cache Stampede (or Cache Thundering Herd)?
> **Answer**: When a highly popular cache key expires, multiple concurrent requests encounter a cache miss at the same time. They all attempt to query the database and update the cache concurrently, causing a sudden spike in database CPU load.
> *Prevention*: Use locking/mutexes (so only one thread queries the database while others wait) or set randomized cache expiration times (jitter).

### Q3: Explain Cache Penetration vs. Cache Avalanche.
> **Answer**:
> * **Cache Penetration**: Requests target data that does not exist in the database or cache (e.g. searching for id `-999`). The request bypasses the cache and queries the database every time. 
>   * *Solution*: Cache null values or use a **Bloom Filter**.
> * **Cache Avalanche**: A large number of cache keys expire at the exact same time, causing all traffic to hit the database simultaneously.
>   * *Solution*: Add random time offsets (jitter) to the TTL (Time to Live) of cache keys.
