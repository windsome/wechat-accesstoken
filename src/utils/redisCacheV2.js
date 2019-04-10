import _debug from 'debug';
const debug = _debug('app:redisCacheV2');
import redis from 'redis';
import { promisify } from 'util';

export default class RedisCache {
  constructor(url) {
    let client = redis.createClient(url);
    this.client = client;

    this.delAsync = promisify(client.del).bind(client);
    this.keysAsync = promisify(client.keys).bind(client);
    this.getAsync = promisify(client.get).bind(client);
    this.setAsync = promisify(client.set).bind(client);
    this.hmsetAsync = promisify(client.hmset).bind(client);
    this.hgetallAsync = promisify(client.hgetall).bind(client);

    this.getJsonAsync = this.getJsonAsync.bind(this);
    this.setJsonAsync = this.setJsonAsync.bind(this);
  }

  async getJsonAsync(key) {
    let ret = await this.getAsync(key);
    if (!ret) return null;
    try {
      return JSON.parse(ret);
    } catch (e) {
      return ret;
    }
  }

  async setJsonAsync(key, obj) {
    if (!key) return null;
    if (!obj) {
      return await this.delAsync(key);
    }
    try {
      let str = JSON.stringify(obj);
      return await this.setAsync(key, str);
    } catch (e) {
      return null;
    }
  }
}
