import _debug from 'debug';
const debug = _debug('app:svcMp');
import Errcode, { EC } from '../Errcode';
import { wxRequests } from '../lib/authMp';
import createBackend from '../lib/backend';
import type from '../utils/type';
import config from '../config';

let backend = createBackend(config.backend);
/**
 * redis: {
 *  mp: {
 *    <appid1>: { ... },
 *  }
 *  accessTokenMp: {
 *    <appid1>: { ... },
 *  }
 * }
 */

/**
 * @api {GET} registerAppid 注册公众号相关信息
 * @apiDescription 注册公众号或小程序,可理解为更新配置信息<br/>
 * @apiName registerAppid
 * @apiGroup svcMp
 * @apiVersion 1.0.0
 * @apiParamExample {json} Request-Example:
 * {
 *  appid: 'xxxx',
 *  secret: 'xxxx',
 * }
 * @apiSuccessExample {json} Success-Response:
 * {
 *  token
 * }
 */
export const registerAppid = async args => {
  let appid = args.appid;
  let secret = args.secret;
  if (!appid || !secret) {
    throw new Errcode('error! no appid/secret!', EC.ERR_PARAM_ERROR);
  }

  await backend.mset('mp', appid, args);

  let mpCfg = await backend.mget('mp', appid);
  debug('registerAppid:', appid, mpCfg);
  await getAccessTokenMp(mpCfg);

  return true;
};

/**
 * @api {GET} accessToken[?force=true] 获取公众号access_token
 * @apiDescription 获取access_token,非第三方方式<br/>
 * @apiName getAccessTokenMp
 * @apiGroup svcMp
 * @apiVersion 1.0.0
 * @apiParamExample {json} Request-Example:
 * {
 *  appid: 'xxxx',
 *  secret: 'xxxx',
 *  force: true // 默认为空,表示不强制.
 * }
 * @apiSuccessExample {json} Success-Response:
 * {
 *  token
 * }
 */
export const getAccessTokenMp = async args => {
  let force = args.force;
  let appid = args.appid;
  let secret = args.secret;
  if (!appid) {
    throw new Errcode('error! no appid!', EC.ERR_PARAM_ERROR);
  }
  let mpCfg = await backend.mget('mp', appid);
  if (mpCfg) {
    debug('getAccessTokenMp:', appid, mpCfg);
    secret = mpCfg.secret;
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

  let accessTokenInfo = await backend.mget('accessTokenMp', appid);

  let needRefresh = true;
  if (!force) {
    // 判断appid对应的info是否过期
    if (accessTokenInfo) {
      let { expires_in, updatedAt } = accessTokenInfo;
      let expired = new Date(updatedAt).getTime() + expires_in * 1000 - 600000;
      let current = new Date();
      if (current < expired) {
        // 没有过期.
        needRefresh = false;
      }
    }
  }
  if (!needRefresh) {
    return accessTokenInfo.access_token;
  }

  let result = await wxRequests.token({ appid, secret })();
  if (!result) {
    throw new Errcode('api token fail!', EC.ERR_3RD_API_FAIL);
  }
  if (result.errcode) {
    throw new Errcode(
      'errcode=' + result.errcode + ',errmsg=' + result.errmsg,
      EC.ERR_3RD_API_FAIL
    );
  }
  accessTokenInfo = {
    createdAt: new Date(),
    ...accessTokenInfo,
    ...result,
    updatedAt: new Date()
  };
  await backend.mset('accessTokenMp', appid, accessTokenInfo);
  return accessTokenInfo.access_token;
};
