import _debug from 'debug';
const debug = _debug('app:jrpcMp');
import { getAccessTokenMp, registerAppid } from './svcMp';

/**
 * redis: {
 *  mp_appid_{appid}: 某个授权应用的信息.
 * }
 */
export default class Apis {
  constructor(cfg) {
    this.cfg = cfg;

    this.init();
    this.registerServices();
  }

  init = () => {
    debug('init wxmp');
  };

  registerServices() {
    // this.jsonrpc.expose('accessToken', this.getAccessTokenMp);
  }

  getServices() {
    return {
      accessToken: this.getAccessTokenMp,
      getMpAccessTokenByAppid: getAccessTokenMp,
      registerAppid: registerAppid
    };
  }

  ///////////////////////////////////////////////////
  // wechat access token for other apps.
  ///////////////////////////////////////////////////
  /**
   * @api {JSONRPC} accessToken[?force=true] 获取公众号access_token
   * @apiDescription 获取access_token,非第三方方式<br/>
   * @apiName getAccessTokenMp
   * @apiGroup wxopen
   * @apiVersion 1.0.0
   * @apiParamExample {json} Request-Example:
   * {
   *  force: true // 默认为空,表示不强制.
   * }
   * @apiSuccessExample {json} Success-Response:
   * {
   *  token
   * }
   */
  getAccessTokenMp = async args => {
    let cfg = {
      appid: this.cfg.appId,
      secret: this.cfg.appSecret
    };
    return await getAccessTokenMp({ ...cfg, ...args });
  };
}
