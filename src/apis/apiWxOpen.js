import _debug from 'debug';
const debug = _debug('app:apiWxOpen');
import _ from 'lodash';
import Errcode, { EC } from '../Errcode';
import CommonRouterFix from './commonRouter';
// import RedisCache from '../utils/redisCacheV2';
import createBackend from '../lib/backend';
import parseUserAgent from '../utils/userAgent';
import { middleware } from '../lib/openMessage';
import {
  getAuthUrl,
  getInfoByAuthCode,
  getAccessToken,
  updateComponentTicketCache
} from './svcOpen';
import config from '../config';

export default class Apis {
  constructor(app) {
    this.app = app;

    this.init();
    this.registerServices();
  }

  init = () => {
    debug('init wx open');
    this.backend = createBackend(config.backend);

    // this.wxopen = new WxopenMsg({
    //   token: this.cfg.token,
    //   appid: this.cfg.appId,
    //   encodingAESKey: this.cfg.encodingAESKey
    // });
    this.msgFunc = middleware({
      token: config.token,
      appid: config.appId,
      encodingAESKey: config.encodingAESKey
    });
  };

  registerServices() {
    // init router for apis.
    let prefix = '/apis/v1/wx/open1';
    let router = require('koa-router')({ prefix });
    router.post('/event', this.authEvent);
    router.all('/authurl', this.getAuthUrl);
    router.get('/mpinfo', this.getInfoByAuthCode);
    router.get('/access_token/:APPID', this.getAccessToken);
    router.post('/:APPID/callback', this.mpCallback);

    CommonRouterFix(this.app, router, prefix);
  }

  ///////////////////////////////////////////////////
  // wechat access token for other apps.
  ///////////////////////////////////////////////////
  /**
   * @api {POST} /apis/v1/wx/open1/event 获取当前系统中的accessToken
   * @apiDescription 获取当前系统中的accessToken,
   * @apiName authEvent
   * @apiGroup wxopen
   * @apiVersion 1.0.0
   * @apiParam {String} secret  密码fucku.简单防止其他非授权人访问.
   * @apiSuccess {Number} errcode result of operation, 0 means success.
   */
  authEvent = async (ctx, next) => {
    let result = await this.msgFunc(ctx);
    debug('authEvent:', result);
    if (result) {
      switch (result.InfoType) {
        case 'component_verify_ticket': // 每10分钟收到微信推送component_verify_ticket协议
          await updateComponentTicketCache(this.cfg.appId, result);
          break;
        case 'authorized': // （授权成功通知）
          break;
        case 'unauthorized': // （取消授权通知）
          break;
        case 'updateauthorized': // （授权更新通知）
          break;
      }
    }
    ctx.body = 'success';
  };

  ///////////////////////////////////////////////////
  // wechat jssdk.
  ///////////////////////////////////////////////////
  /**
   * @api {POST} /apis/v1/wx/open1/:APPID/callback open平台代理公众平台callback
   * @apiDescription 获取某个页面的签名package.用于授权页面调用window.wx相关操作
   * @apiName mpCallback
   * @apiGroup wxopen
   * @apiVersion 1.0.0
   * @apiParamExample {json} Request-Example:
   * {
   *  url // 页面url
   * }
   * @apiSuccess {Number} errcode result of operation, 0 means success.
   */
  mpCallback = async (ctx, next) => {
    let url = ctx.request.body && ctx.request.body.url;
    if (!url) {
      throw new Errcode('error! url is null', EC.ERR_PARAM_ERROR);
    }
    ctx.body = {};
  };

  /**
   * @api {GET|POST} /apis/v1/wx/open1/authurl 获取认证url
   * @apiDescription 给公众号管理员授权开放平台权限.
   * @apiName getAuthUrl
   * @apiGroup wxopen
   * @apiVersion 1.0.0
   * @apiParamExample {json} Request-Example:
   * {
   *  type: '<scancode>或<mobile>' //默认为mobile
   *  redirectUri // 授权确认页面
   * }
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * {
   *  url,
   *  createdAt,
   *  expires_in
   * }
   */
  getAuthUrl = async (ctx, next) => {
    // 1. 获取ComponentVerifyTicket
    // 2. 获取第三方平台component_access_token
    // 3. 获取预授权码pre_auth_code
    // 4. 获取URL(scancode模式或者mobile模式)
    let args = { ...ctx.request.query, ...ctx.request.body };
    let type = args.type;
    if (!type) {
      let agent = parseUserAgent(ctx.request.header['user-agent']);
      if (agent.wechat) {
        type = 'mobile';
      }
    }
    ctx.body = await getAuthUrl(args);
  };

  /**
   * @api {GET} /apis/v1/wx/open1/mpinfo 获取授权公众号的信息
   * @apiDescription 获取公众号的授权信息:authorization_info
   * @apiName getInfoByAuthCode
   * @apiGroup wxopen
   * @apiVersion 1.0.0
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * {
   *  authorizer_appid,
   *  authorizer_access_token,
   *  expires_in,
   *  authorizer_refresh_token,
   *  func_info: [
   *    {
   *      "funcscope_category": {
   *        "id": 1
   *      }
   *    },
   *  ]
   * }
   */
  getInfoByAuthCode = async (ctx, next) => {
    ctx.body = await getInfoByAuthCode(ctx.request.query);
  };

  /**
   * @api {GET} /apis/v1/wx/open1/access_token/:APPID[?force=true] 获取某个APPID的token
   * @apiDescription 获取access_token
   * @apiName getAccessToken
   * @apiGroup wxopen
   * @apiVersion 1.0.0
   * @apiParam {String} force 可选,是否强制刷新access_token..
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * {
   *  token
   * }
   */
  getAccessToken = async (ctx, next) => {
    let appid = ctx.params.APPID;
    if (!appid) {
      throw new Errcode('error! APPID is null', EC.ERR_PARAM_ERROR);
    }
    let args = { ...ctx.request.body, ...ctx.request.query };
    let APPID = ctx.params.APPID;
    if (APPID) {
      args['appid'] = APPID;
    }
    let token = await getAccessToken(args);
    ctx.body = { accessToken: token };
  };
}
