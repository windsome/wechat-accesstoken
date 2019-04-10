import _debug from 'debug';
const debug = _debug('app:apiMp');
import _ from 'lodash';
import Errcode, { EC } from '../Errcode';
import CommonRouterFix from './commonRouter';
import RedisCache from '../utils/redisCacheV2';
import WxmpApi from '../lib/wxmp_api';

/**
 * redis: {
 *  mp_appid_{appid}: 某个授权应用的信息.
 * }
 */
export default class Apis {
  constructor(app, cfg) {
    this.app = app;
    this.cfg = cfg;

    this.init();
    this.registerServices();
  }

  init = () => {

    let url = this.cfg && this.cfg.backend && this.cfg.backend.url;
    this.redisCache = new RedisCache(url);

    this.wxmpApi = new WxmpApi(this.cfg);
    debug('init wxmp');
  };

  registerServices() {
    // init router for apis.
    let prefix = '/apis/v1/wx/mp';
    let router = require('koa-router')({ prefix });
    router.get('/access_token', this.getAccessTokenMp);
    router.get('/access_token/:APPID', this.getAccessTokenMp);

    CommonRouterFix(this.app, router, prefix);
  }

  ///////////////////////////////////////////////////
  // wechat access token for other apps.
  ///////////////////////////////////////////////////
  /**
   * @api {GET} /apis/v1/wx/mp/access_token[?force=true] 获取公众号access_token
   * @apiDescription 获取access_token,非第三方方式<br/>
   * {GET} /apis/v1/wx/mp/access_token/:APPID[?force=true]
   * @apiName getAccessTokenMp
   * @apiGroup wxopen
   * @apiVersion 1.0.0
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * {
   *  token
   * }
   */
  getAccessTokenMp = async (ctx, next) => {
    let appid = this.cfg.appId;
    if (!appid) {
      throw new Errcode('error! this.cfg.appId is null!', EC.ERR_PARAM_ERROR);
    }
    let APPID = ctx.params.APPID;
    if (APPID) {
      if (appid != APPID) {
        throw new Errcode(
          'error! APPID!=this.cfg.appId is null!',
          EC.ERR_PARAM_ERROR
        );
      }
    }

    let { force = false } = ctx.query || {};
    if (force === 'true') force = true;
    else force = false;
    let needRefresh = true;
    // debug('getAccessTokenMp', { force, needRefresh, appid, n: force == true });

    let authorization_info = await this.redisCache.getJsonAsync(
      'mp_appid_' + appid
    );
    if (!force) {
      // 判断appid对应的info是否过期
      if (authorization_info) {
        let { expires_in, updatedAt } = authorization_info;
        let expired =
          new Date(updatedAt).getTime() + expires_in * 1000 - 600000;
        let current = new Date();
        if (current < expired) {
          // 没有过期.
          needRefresh = false;
        }
      }
    }
    if (!needRefresh) {
      ctx.body = { token: authorization_info.access_token };
      return;
    }

    let result = await this.wxmpApi.token(appid, this.cfg.appSecret);
    if (!result) {
      throw new Errcode('api token fail!', EC.ERR_3RD_API_FAIL);
    }
    if (result.errcode) {
      throw new Errcode(
        'errcode=' + result.errcode + ',errmsg=' + result.errmsg,
        EC.ERR_3RD_API_FAIL
      );
    }
    authorization_info = {
      createdAt: new Date(),
      ...authorization_info,
      ...result,
      updatedAt: new Date()
    };
    await this.redisCache.setJsonAsync('mp_appid_' + appid, authorization_info);
    debug('getAccessTokenMp:', authorization_info);
    ctx.body = { token: authorization_info.access_token };
  };
}
