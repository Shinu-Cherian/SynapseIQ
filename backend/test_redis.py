import redis.asyncio as redis
import asyncio

async def main():
    try:
        r = redis.from_url('rediss://example.com:6379', ssl_cert_reqs='none')
        print(r)
    except Exception as e:
        print(f'Error: {e}')

asyncio.run(main())
