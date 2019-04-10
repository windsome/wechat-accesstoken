import _debug from 'debug';
const debug = _debug('app:wxmp:api');
import { requestGet } from '../utils/_request';

/**
 * 授权流程技术说明(小程序或者公众号授权给第三方平台)
 * https://open.weixin.qq.com/cgi-bin/showdocument?action=dir_list&t=resource/res_list&verify=1&id=open1453779503&token=&lang=zh_CN
 */
export default class Api {
  constructor(opts = {}) {
    this.opts = opts;
  }

  /**
        2、获取第三方平台component_access_token
        第三方平台component_access_token是第三方平台的下文中接口的调用凭据，也叫做令牌（component_access_token）。每个令牌是存在有效期（2小时）的，且令牌的调用不是无限制的，请第三方平台做好令牌的管理，在令牌快过期时（比如1小时50分）再进行刷新。
        参数:
        {
            "component_appid":"appid_value" ,
            "component_appsecret": "appsecret_value",
            "component_verify_ticket": "ticket_value"
        }
        结果:
        {
            "component_access_token":"61W3mEpU66027wgNZ_MhGHNQDHnFATkDa9-2llqrMBjUwxRSNPbVsMmyD-yq8wZETSoE5NQgecigDrSHkPtIYA", 
            "expires_in":7200
        }
     * @param {String} component_verify_ticket 通过event回调获得的ticket
     */
  token = async (appid, secret) => {
    var url =
      'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' +
      appid +
      '&secret=' +
      secret;
    // var url = 'https://api.weixin.qq.com/cgi-bin/component/api_component_token';
    return await requestGet(url);
  };
}
