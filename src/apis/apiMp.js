import _debug from 'debug';
const debug = _debug('app:apiMp');
import Errcode, { EC } from '../Errcode';
import CommonRouterFix from './commonRouter';
import { getAccessTokenMp, registerAppid } from './svcMp';

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
    debug('init wxmp');
  };

  registerServices() {
    // init router for apis.
    let prefix = '/apis/v1/wx/mp';
    let router = require('koa-router')({ prefix });
    router.post('/register_appid', this.registerAppid);
    router.get('/access_token', this.getAccessTokenMp);
    router.get('/access_token/:APPID', this.getAccessTokenByAppid);

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
   * @apiParamExample {json} Request-Example:
   * {
   *  appid,
   *  secret,
   *  force: true // 默认为空,表示不强制.
   * }
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * {
   *  token
   * }
   */
  getAccessTokenMp = async (ctx, next) => {
    let cfg = {
      appid: this.cfg.appId,
      secret: this.cfg.appSecret
    };

    let args = { ...ctx.request.body, ...ctx.request.query };
    let APPID = ctx.params.APPID;
    if (APPID) {
      args['appid'] = APPID;
    }

    let token = await getAccessTokenMp({ ...cfg, ...args });
    ctx.body = { accessToken: token };
  };

  registerAppid = async (ctx, next) => {
    let args = { ...ctx.request.body, ...ctx.request.query };

    let result = await registerAppid(args);
    ctx.body = { result };
  };

  getAccessTokenByAppid = async (ctx, next) => {
    let args = { ...ctx.request.body, ...ctx.request.query };
    let APPID = ctx.params.APPID;
    if (APPID) {
      args['appid'] = APPID;
    }

    let token = await getAccessTokenMp(args);
    ctx.body = { accessToken: token };
  };
}
