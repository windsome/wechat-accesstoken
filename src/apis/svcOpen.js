import _debug from 'debug';
const debug = _debug('app:svcOpen');
import Errcode, { EC } from '../Errcode';
import {
  wxRequests,
  get_auth_url_scancode,
  get_auth_url_mobile
} from '../lib/authOpen';
import createBackend from '../lib/backend';
import type from '../utils/type';
import config from '../config';
import isArray from 'lodash/isArray';

let backend = createBackend(config.backend);
/**
 * redis: {
 *  componentToken: {
 *    <appid1>: { ... },
 *  },
 *  componentTicket: {
 *    <appid1>: { ... },
 *  }
 *  authCode: {
 *    <code1>: { appid: <authorizer_appid1> }
 *  },
 *  authorizerAppidInfo: {
 *    <authorizer_appid1>: { ... }
 *  }
 * }
 */

/**
 * @api {GET|POST} /apis/v1/wx/open1/authurl 获取认证url
 * @apiDescription 给公众号管理员授权开放平台权限.
 * @apiName getAuthUrl
 * @apiGroup svcOpen
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
export const getAuthUrl = async args => {
  // 1. 获取ComponentVerifyTicket
  // 2. 获取第三方平台component_access_token
  // 3. 获取预授权码pre_auth_code
  // 4. 获取URL(scancode模式或者mobile模式)
  let component_appid = args.component_appid || config.appId;
  let component_appsecret = args.component_appsecret || config.appSecret;
  let { type, redirectUri } = args;
  if (!type) {
    type = 'mobile';
  }
  if (!redirectUri) {
    redirectUri = 'http://open1.qingshansi.cn/open/code';
  }

  let token = await getComponentAccessToken();
  if (!token) {
    throw new Errcode('no token', EC.ERR_WXOPEN_TICKETS_NONE);
  }

  let result = await wxRequests.api_create_preauthcode({
    component_appid,
    component_appsecret
  })({ component_access_token: token.component_access_token });
  if (!result) {
    throw new Errcode('api api_create_preauthcode fail!', EC.ERR_3RD_API_FAIL);
  }
  debug('getAuthUrl', { token, preauthcode: result });
  if (!result.pre_auth_code) {
    throw new Errcode('not get pre_auth_code!', EC.ERR_3RD_API_FAIL);
  }

  let pre_auth_code = result.pre_auth_code;
  let expires_in = result.expires_in;
  let url = null;

  if (type === 'mobile') {
    url = get_auth_url_mobile(pre_auth_code, redirectUri);
  } else {
    url = get_auth_url_scancode(pre_auth_code, redirectUri);
  }
  return {
    url,
    expires_in,
    createdAt: new Date()
  };
};

/**
 * @api {GET} /apis/v1/wx/open1/mpinfo 获取授权公众号的信息
 * @apiDescription 获取公众号的授权信息:authorization_info
 * @apiName getInfoByAuthCode
 * @apiGroup svcOpen
 * @apiVersion 1.0.0
 * @apiParamExample {json} Request-Example:
 * {
 *  auth_code
 *  expires_in
 * }
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
export const getInfoByAuthCode = async args => {
  let component_appid = args.component_appid || config.appId;
  let component_appsecret = args.component_appsecret || config.appSecret;
  let { auth_code, expires_in } = args;
  if (!auth_code) {
    throw new Errcode('error! auth_code is null!', EC.ERR_PARAM_ERROR);
  }

  let authCodeInfo = await backend.mget('authCode', auth_code);
  let authorizer_appid = authCodeInfo && authCodeInfo.appid;
  if (authorizer_appid) {
    let authorization_info = await backend.mget(
      'authorizerAppidInfo',
      authorizer_appid
    );
    if (authorization_info) {
      debug('already exist! read ' + authorizer_appid + ' from redis!');
      return authorization_info;
    }
  }

  let token = await getComponentAccessToken(
    component_appid,
    component_appsecret
  );
  if (!token) {
    throw new Errcode('no token!', EC.ERR_WXOPEN_TICKETS_NONE);
  }
  let result = await wxRequests.api_query_auth({
    component_appid,
    component_appsecret
  })(
    { component_access_token: token.component_access_token },
    { authorization_code: auth_code }
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
  await backend.mset('authCode', auth_code, { appid: authorizer_appid });
  authorization_info = {
    ...authorization_info,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  await backend.mset(
    'authorizerAppidInfo',
    authorizer_appid,
    authorization_info
  );
  debug('getInfoByAuthCode:', authorization_info);
  // need save to mongodb.
  return authorization_info;
};

/**
 * @api {GET} /apis/v1/wx/open1/access_token/:APPID[?force=true] 获取某个APPID的token
 * @apiDescription 获取access_token
 * @apiName getAccessToken
 * @apiGroup svcOpen
 * @apiVersion 1.0.0
 * @apiParamExample {json} Request-Example:
 * {
 *  force: true/false
 *  appid
 * }
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * {
 *  token
 * }
 */
export const getAccessToken = async args => {
  let component_appid = args.component_appid || config.appId;
  let component_appsecret = args.component_appsecret || config.appSecret;
  let force = args.force;
  let appid = args.appid;
  if (!appid) {
    throw new Errcode('error! APPID is null', EC.ERR_PARAM_ERROR);
  }

  let typeforce = type(force);
  if (typeforce === 'boolean') {
  } else if (typeforce === 'string') {
    force = force.toLowerCase();
    if (force === 'true') force = true;
    else force = false;
  } else {
    if (force) force = true;
    else force = false;
  }

  let authorization_info = await backend.mget('authorizerAppidInfo', appid);
  if (!authorization_info) {
    throw new Errcode(
      'error! no authorization_info for ' + appid,
      EC.ERR_PARAM_ERROR
    );
  }

  let needRefresh = true;
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
    return authorization_info.authorizer_access_token;
  }

  // 已经过期则利用authorizer_refresh_token更新token
  let token = await getComponentAccessToken(
    component_appid,
    component_appsecret
  );
  if (!token) {
    throw new Errcode('no token!', EC.ERR_WXOPEN_TICKETS_NONE);
  }
  let result = await wxRequests.api_authorizer_token({
    component_appid,
    component_appsecret
  })(
    {
      component_access_token: token.component_access_token
    },
    {
      authorizer_appid: appid,
      authorizer_refresh_token: authorization_info.authorizer_refresh_token
    }
  );
  if (!result) {
    throw new Errcode('api api_authorizer_token fail!', EC.ERR_3RD_API_FAIL);
  }
  authorization_info = {
    ...authorization_info,
    ...result,
    updatedAt: new Date()
  };
  await backend.mset('authorizerAppidInfo', appid, authorization_info);
  debug('getAccessToken:', authorization_info);
  return authorization_info.authorizer_access_token;
};

///////////////////////////////////////////////////
// flow.
///////////////////////////////////////////////////
const getComponentTicketCache = async appid => {
  let tickets = (await backend.mget('componentTicket', appid)) || [];
  if (!isArray(tickets)) tickets = [tickets];
  return tickets;
};

export const updateComponentTicketCache = async (appid, ticketObj) => {
  let tickets = await getComponentTicketCache(appid);
  tickets = [ticketObj, ...tickets];
  tickets = tickets.slice(0, 2);
  await backend.mset('componentTicket', appid, tickets);
  return tickets;
};

export const getComponentAccessToken = async (appid, secret) => {
  appid = appid || config.appId;
  secret = secret || config.appSecret;
  // 1. 获取旧的token
  let token = await backend.mget('componentToken', appid);

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
    let tickets = await getComponentTicketCache(appid);
    if (!tickets) {
      throw new Errcode('no tickets found!', EC.ERR_WXOPEN_TICKETS_NONE);
    }
    let ticket1 = tickets[0] && tickets[0].ComponentVerifyTicket;
    let ticket2 = tickets[1] && tickets[1].ComponentVerifyTicket;
    if (!ticket1 && !ticket2) {
      throw new Errcode('wrong tickets!', EC.ERR_WXOPEN_TICKETS_NONE);
    }
    // 3.2. 根据ticket1获取token
    let token1 = await wxRequests.api_component_token({
      component_appid: appid,
      component_appsecret: secret
    })(null, { component_verify_ticket: ticket1 });
    if (!token1) {
      token1 = await wxRequests.api_component_token({
        component_appid: appid,
        component_appsecret: secret
      })(null, { component_verify_ticket: ticket2 });
    }
    if (token1) {
      token1 = { ...token1, createdAt: new Date() };
      token = token1;
      await backend.mset('componentToken', appid, token);
    }
  }
  if (!token) {
    throw new Errcode('not get token!', EC.ERR_WXOPEN_TICKETS_NONE);
  }
  // 返回token
  return token;
};
