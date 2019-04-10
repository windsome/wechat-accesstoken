import _debug from 'debug';
const debug = _debug('app:wxopen:api');
import { requestPost } from '../utils/_request';

/**
 * 授权流程技术说明(小程序或者公众号授权给第三方平台)
 * https://open.weixin.qq.com/cgi-bin/showdocument?action=dir_list&t=resource/res_list&verify=1&id=open1453779503&token=&lang=zh_CN
 */
export default class Auth {
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
  api_component_token = async component_verify_ticket => {
    var url = 'https://api.weixin.qq.com/cgi-bin/component/api_component_token';
    return await requestPost(url, {
      component_appid: this.opts.appId,
      component_appsecret: this.opts.appSecret,
      component_verify_ticket
    });
  };

  /**
        3、获取预授权码pre_auth_code
        该API用于获取预授权码。预授权码用于公众号或小程序授权时的第三方平台方安全验证。
        参数:
        {
            "component_appid":"appid_value" 
        }
        结果:
        {
            "pre_auth_code":"Cx_Dk6qiBE0Dmx4EmlT3oRfArPvwSQ-oa3NL_fwHM7VI08r52wazoZX2Rhpz1dEw",
            "expires_in":600
        }
     * @param {String} component_access_token 从api_component_token获得
     */
  api_create_preauthcode = async component_access_token => {
    var url =
      'https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode?component_access_token=' +
      component_access_token;
    return await requestPost(url, {
      component_appid: this.opts.appId
    });
  };

  /**
        4、使用授权码换取公众号或小程序的接口调用凭据和授权信息
        该API用于使用授权码换取授权公众号或小程序的授权信息，并换取authorizer_access_token和authorizer_refresh_token。 授权码的获取，需要在用户在第三方平台授权页中完成授权流程后，在回调URI中通过URL参数提供给第三方平台方。请注意，由于现在公众号或小程序可以自定义选择部分权限授权给第三方平台，因此第三方平台开发者需要通过该接口来获取公众号或小程序具体授权了哪些权限，而不是简单地认为自己声明的权限就是公众号或小程序授权的权限。
        参数:
        {
            "component_appid":"appid_value" ,
            "authorization_code": "auth_code_value"
        }
        结果:
        {
            "authorization_info": {
            "authorizer_appid": "wxf8b4f85f3a794e77",
            "authorizer_access_token": "QXjUqNqfYVH0yBE1iI_7vuN_9gQbpjfK7hYwJ3P7xOa88a89-Aga5x1NMYJyB8G2yKt1KCl0nPC3W9GJzw0Zzq_dBxc8pxIGUNi_bFes0qM",
            "expires_in": 7200,
            "authorizer_refresh_token": "dTo-YCXPL4llX-u1W1pPpnp8Hgm4wpJtlR6iV0doKdY",
            "func_info": [
            {
            "funcscope_category": {
            "id": 1
            }
            },
            {
            "funcscope_category": {
            "id": 2
            }
            },
            {
            "funcscope_category": {
            "id": 3
            }
            }
            ]
            }
        }
     * @param {String} component_access_token 从api_component_token获得
     * @param {String} authorization_code 
     */
  api_query_auth = async (component_access_token, authorization_code) => {
    var url =
      'https://api.weixin.qq.com/cgi-bin/component/api_query_auth?component_access_token=' +
      component_access_token;
    return await requestPost(url, {
      component_appid: this.opts.appId,
      authorization_code
    });
  };
  /**
        5、获取（刷新）授权公众号或小程序的接口调用凭据（令牌）
        该API用于在授权方令牌（authorizer_access_token）失效时，可用刷新令牌（authorizer_refresh_token）获取新的令牌。请注意，此处token是2小时刷新一次，开发者需要自行进行token的缓存，避免token的获取次数达到每日的限定额度。缓存方法可以参考：http://mp.weixin.qq.com/wiki/2/88b2bf1265a707c031e51f26ca5e6512.html
        当换取authorizer_refresh_token后建议保存。
        参数:
        {
            "component_appid":"appid_value",
            "authorizer_appid":"auth_appid_value",
            "authorizer_refresh_token":"refresh_token_value",
        }
        结果:
        {
            "authorizer_access_token": "aaUl5s6kAByLwgV0BhXNuIFFUqfrR8vTATsoSHukcIGqJgrc4KmMJ-JlKoC_-NKCLBvuU1cWPv4vDcLN8Z0pn5I45mpATruU0b51hzeT1f8", 
            "expires_in": 7200, 
            "authorizer_refresh_token":
            "BstnRqgTJBXb9N2aJq6L5hzfJwP406tpfahQeLNxX0w"
        }
     */
  api_authorizer_token = async (
    component_access_token,
    authorizer_appid,
    authorizer_refresh_token
  ) => {
    var url =
      'https://api.weixin.qq.com/cgi-bin/component/api_authorizer_token?component_access_token=' +
      component_access_token;
    return await requestPost(url, {
      component_appid: this.opts.appId,
      authorizer_appid,
      authorizer_refresh_token
    });
  };

  /**
        6、获取授权方的帐号基本信息
        该API用于获取授权方的基本信息，包括头像、昵称、帐号类型、认证类型、微信号、原始ID和二维码图片URL。
        需要特别记录授权方的帐号类型，在消息及事件推送时，对于不具备客服接口的公众号，需要在5秒内立即响应；而若有客服接口，则可以选择暂时不响应，而选择后续通过客服接口来发送消息触达粉丝。
     * 
     */
  api_get_authorizer_info = async (
    component_access_token,
    authorizer_appid
  ) => {
    var url =
      'https://api.weixin.qq.com/cgi-bin/component/api_get_authorizer_info?component_access_token=' +
      component_access_token;
    return await requestPost(url, {
      component_appid: this.opts.appId,
      authorizer_appid
    });
  };
  /**
        7、获取授权方的选项设置信息
        该API用于获取授权方的公众号或小程序的选项设置信息，如：地理位置上报，语音识别开关，多客服开关。注意，获取各项选项设置信息，需要有授权方的授权，详见权限集说明。
     * 
     */
  api_get_authorizer_option = async (
    component_access_token,
    authorizer_appid,
    option_name
  ) => {
    var url =
      'https://api.weixin.qq.com/cgi-bin/component/api_get_authorizer_option?component_access_token=' +
      component_access_token;
    return await requestPost(url, {
      component_appid: this.opts.appId,
      authorizer_appid,
      option_name
    });
  };
  /**
        8、设置授权方的选项信息
        该API用于设置授权方的公众号或小程序的选项信息，如：地理位置上报，语音识别开关，多客服开关。注意，设置各项选项设置信息，需要有授权方的授权，详见权限集说明。
     * 
     */
  api_set_authorizer_option = async (
    component_access_token,
    authorizer_appid,
    option_name,
    option_value
  ) => {
    var url =
      'https://api.weixin.qq.com/cgi-bin/component/api_set_authorizer_option?component_access_token=' +
      component_access_token;
    return await requestPost(url, {
      component_appid: this.opts.appId,
      authorizer_appid,
      option_name,
      option_value
    });
  };

  /**
        步骤2：引入用户进入授权页
        第三方平台方可以在自己的网站中放置“微信公众号授权”或者“小程序授权”的入口，或生成授权链接放置在移动网页中，引导公众号和小程序管理员进入授权页。
        方式一：授权注册页面扫码授权
        注：auth_type、biz_appid两个字段互斥。
     * 
     */
  get_auth_url_scancode = (
    pre_auth_code,
    redirectUri,
    auth_type = 3,
    biz_appid = null
  ) => {
    // let redirectUri = 'http://open1.qingshansi.cn';
    let qstr =
      'component_appid=' +
      this.opts.appId +
      '&pre_auth_code=' +
      pre_auth_code +
      '&redirect_uri=' +
      encodeURI(redirectUri);
    if (auth_type) qstr += '&auth_type=' + auth_type;
    else if (biz_appid) qstr += '&biz_appid=' + biz_appid;

    return 'https://mp.weixin.qq.com/cgi-bin/componentloginpage?' + qstr;
  };

  /**
        步骤2：引入用户进入授权页
        第三方平台方可以在自己的网站中放置“微信公众号授权”或者“小程序授权”的入口，或生成授权链接放置在移动网页中，引导公众号和小程序管理员进入授权页。
        方式二：点击移动端链接快速授权
            第三方平台方可以生成授权链接，将链接通过移动端直接发给授权管理员，管理员确认后即授权成功。
        注：auth_type、biz_appid两个字段互斥。
     * 
     */
  get_auth_url_mobile = (
    pre_auth_code,
    redirectUri,
    auth_type = 3,
    biz_appid = null
  ) => {
    // let redirectUri = 'http://open1.qingshansi.cn';
    let qstr =
      'action=bindcomponent&no_scan=1&component_appid=' +
      this.opts.appId +
      '&pre_auth_code=' +
      pre_auth_code +
      '&redirect_uri=' +
      encodeURI(redirectUri);
    if (auth_type) qstr += '&auth_type=' + auth_type;
    else if (biz_appid) qstr += '&biz_appid=' + biz_appid;
    qstr += '#wechat_redirect';

    return 'https://mp.weixin.qq.com/safe/bindcomponent?' + qstr;
  };
}
