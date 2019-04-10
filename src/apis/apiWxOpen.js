import _debug from 'debug';
const debug = _debug('app:apiWxOpen');
import _ from 'lodash';
import Errcode, { EC } from '../Errcode';
import CommonRouterFix from './commonRouter';
import RedisCache from '../utils/redisCacheV2';
import parseUserAgent from '../utils/userAgent';
import WxopenMsg from '../lib/wxopen_message';
import WxopenApi from '../lib/wxopen_api';

/**
 * redis 布局:
 * {
 *  wxopen_ticket_{openid}: 微信开放平台第三方平台的wxopen_ticket.微信每10分钟发一次.
 *  wxopen_token_{openid}: component_access_token,第三方平台的token.
 *  auth_code_{auth_code}: 存放authorizer_appid
 *  authorizer_appid_{openid}: 某个授权公众号的信息,包含access_token, refresh_token, 授权信息列表
 * }
 */
export default class Apis {
  constructor(app, cfg = {}) {
    this.app = app;
    this.cfg = cfg;
    this._access_token = null;
    this._pre_auth_code = null;

    let url = cfg && cfg.backend && cfg.backend.url;
    this.redisCache = new RedisCache(url);

    this.init();
    this.registerServices();
  }

  init = () => {
    debug('init wx open');
    this.wxopen = new WxopenMsg({
      token: this.cfg.token,
      appid: this.cfg.appId,
      encodingAESKey: this.cfg.encodingAESKey
    });
    this.wxopenApi = new WxopenApi(this.cfg);
    this.msgFunc = this.wxopen.middleware();
  };

  registerServices() {
    // init router for apis.
    let prefix = '/apis/v1/wx/open1';
    let router = require('koa-router')({ prefix });
    router.post('/event', this.authEvent);
    router.get('/authurl', this.getAuthUrl);
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
          await this.updateComponentTicket(result);
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
   * @api {GET} /apis/v1/wx/open1/authurl 获取认证url
   * @apiDescription 给公众号管理员授权开放平台权限.
   * @apiName getAuthUrl
   * @apiGroup wxopen
   * @apiVersion 1.0.0
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
    // 4. 获取URL
    let agent = parseUserAgent(ctx.request.header['user-agent']);

    let token = await this.getComponentAccessToken();
    if (!token) {
      throw new Errcode('no token', EC.ERR_WXOPEN_TICKETS_NONE);
    }

    let result = await this.wxopenApi.api_create_preauthcode(
      token.component_access_token
    );
    if (!result) {
      throw new Errcode(
        'api api_create_preauthcode fail!',
        EC.ERR_3RD_API_FAIL
      );
    }
    debug('getAuthUrl', { token, preauthcode: result });
    if (!result.pre_auth_code) {
      throw new Errcode('not get pre_auth_code!', EC.ERR_3RD_API_FAIL);
    }

    let pre_auth_code = result.pre_auth_code;
    let expires_in = result.expires_in;
    let url = null;

    if (agent.wechat) {
      url = this.wxopenApi.get_auth_url_mobile(
        pre_auth_code,
        'http://open1.qingshansi.cn/open/code'
      );
    } else {
      url = this.wxopenApi.get_auth_url_scancode(
        pre_auth_code,
        'http://open1.qingshansi.cn/open/code'
      );
    }
    ctx.body = {
      url,
      createdAt: new Date(),
      expires_in
    };
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
    let { auth_code, expires_in } = ctx.request.query;
    if (!auth_code) {
      throw new Errcode('error! auth_code is null', EC.ERR_PARAM_ERROR);
    }
    let authorizer_appid = await this.redisCache.getAsync(
      'auth_code_' + auth_code
    );
    if (authorizer_appid) {
      let authorization_info = await this.redisCache.getJsonAsync(
        'authorizer_appid_' + authorizer_appid
      );
      if (authorization_info) {
        debug('already exist! read ' + authorizer_appid + ' from redis!');
        ctx.body = authorization_info;
        return;
      }
    }

    let token = await this.getComponentAccessToken();
    if (!token) {
      throw new Errcode('no token!', EC.ERR_WXOPEN_TICKETS_NONE);
    }
    let result = await this.wxopenApi.api_query_auth(
      token.component_access_token,
      auth_code
    );
    if (!result) {
      throw new Errcode('api api_query_auth fail!', EC.ERR_3RD_API_FAIL);
    }
    if (!result.authorization_info) {
      throw new Errcode(
        'api api_query_auth fail! no authorization_info!',
        EC.ERR_3RD_API_FAIL
      );
    }

    let authorization_info = result.authorization_info;
    authorizer_appid = authorization_info.authorizer_appid;
    await this.redisCache.setAsync('auth_code_' + auth_code, authorizer_appid);
    authorization_info = {
      ...authorization_info,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await this.redisCache.setJsonAsync(
      'authorizer_appid_' + authorizer_appid,
      authorization_info
    );
    debug('getInfoByAuthCode:', authorization_info);
    // need save to mongodb.
    ctx.body = authorization_info;
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

    let { force = false } = ctx.query || {};
    if (force === 'true') force = true;
    else force = false;
    let needRefresh = true;

    let authorization_info = await this.redisCache.getJsonAsync(
      'authorizer_appid_' + appid
    );
    if (!authorization_info) {
      throw new Errcode(
        'error! no authorization_info for ' + appid,
        EC.ERR_PARAM_ERROR
      );
    }

    if (!force) {
      let { expires_in, updatedAt } = authorization_info;
      // 判断authorizer_access_token/updatedAt/expires_in是否过期
      let expired = new Date(updatedAt).getTime() + expires_in * 1000 - 600000;
      let current = new Date();
      if (current < expired) {
        // 没有过期.
        needRefresh = false;
      }
    }
    if (!needRefresh) {
      ctx.body = { token: authorization_info.authorizer_access_token };
      return;
    }

    // 已经过期则利用authorizer_refresh_token更新token
    let token = await this.getComponentAccessToken();
    if (!token) {
      throw new Errcode('no token!', EC.ERR_WXOPEN_TICKETS_NONE);
    }
    let result = await this.wxopenApi.api_authorizer_token(
      token.component_access_token,
      appid,
      authorization_info.authorizer_refresh_token
    );
    if (!result) {
      throw new Errcode('api api_authorizer_token fail!', EC.ERR_3RD_API_FAIL);
    }
    authorization_info = {
      ...authorization_info,
      ...result,
      updatedAt: new Date()
    };
    await this.redisCache.setJsonAsync(
      'authorizer_appid_' + appid,
      authorization_info
    );
    debug('getAccessToken:', authorization_info);
    ctx.body = { token: authorization_info.authorizer_access_token };
  };

  ///////////////////////////////////////////////////
  // flow.
  ///////////////////////////////////////////////////
  getComponentTicket = async () => {
    let key = 'wxopen_ticket_' + this.cfg.appId;
    let tickets = await this.redisCache.getAsync(key);
    if (tickets) tickets = JSON.parse(tickets);
    else tickets = [];
    if (!_.isArray(tickets)) tickets = [tickets];
    return tickets;
  };

  updateComponentTicket = async ticketObj => {
    let key = 'wxopen_ticket_' + this.cfg.appId;
    let tickets = await this.getComponentTicket();
    tickets = [ticketObj, ...tickets];
    tickets = tickets.slice(0, 2);
    await this.redisCache.setAsync(key, JSON.stringify(tickets));
    return tickets;
  };

  getComponentAccessToken = async () => {
    // 1. 获取旧的token
    let key = 'wxopen_token_' + this.cfg.appId;
    let token = await this.redisCache.getAsync(key);
    if (token) token = JSON.parse(token);

    // 2. 判断token是否过期
    let needNewToken = true;
    if (token && token.createdAt) {
      let time1 = new Date(token.createdAt).getTime() || 0;
      let curr = new Date().getTime();
      if (curr - time1 < 110 * 60 * 1000) {
        needNewToken = false;
      }
    }

    // 3. 获取新token
    if (needNewToken) {
      // 3.1. 获取tickets
      let tickets = await this.getComponentTicket();
      if (!tickets) {
        throw new Errcode(
          'no tickets in redis cache.',
          EC.ERR_WXOPEN_TICKETS_NONE
        );
      }
      let ticket1 = tickets[0] && tickets[0].ComponentVerifyTicket;
      let ticket2 = tickets[1] && tickets[1].ComponentVerifyTicket;
      if (!ticket1 && !ticket2) {
        throw new Errcode(
          'wrong tickets in redis cache.',
          EC.ERR_WXOPEN_TICKETS_NONE
        );
      }
      // 3.2. 根据ticket1获取token
      let token1 = await this.wxopenApi.api_component_token(ticket1);
      if (!token1) {
        token1 = await this.wxopenApi.api_component_token(ticket2);
      }
      if (token1) {
        token1 = { ...token1, createdAt: new Date() };
        debug('getComponentAccessToken, update token', token1);
        await this.redisCache.setAsync(key, JSON.stringify(token1));
        token = token1;
      }
    }
    if (!token) {
      throw new Errcode('not get token.', EC.ERR_WXOPEN_TICKETS_NONE);
    }
    // 返回token
    return token;
  };
}
