/**
 * 授权流程技术说明(小程序或者公众号授权给第三方平台)
 * https://open.weixin.qq.com/cgi-bin/showdocument?action=dir_list&t=resource/res_list&verify=1&id=open1453779503&token=&lang=zh_CN
 */

import _debug from 'debug';
const debug = _debug('app:lib:authOpen');
import makeWxappFunctions from './_actionInvoke';

let actions = {
  api_component_token: {
    // 返回值: {
    //   component_access_token:"61W3mEpU66027wgNZ_MhGHNQDHnFATkDa9-2llqrMBjUwxRSNPbVsMmyD-yq8wZETSoE5NQgecigDrSHkPtIYA",
    //   expires_in:7200
    // }
    method: 'POST',
    url: 'https://api.weixin.qq.com/cgi-bin/component/api_component_token',
    body: ['component_appid', 'component_appsecret', 'component_verify_ticket']
  },
  api_create_preauthcode: {
    // 获取预授权码pre_auth_code
    // 返回值: {
    //   pre_auth_code:"61W3mEpU66027wgNZ_MhGHNQDHnFATkDa9-2llqrMBjUwxRSNPbVsMmyD-yq8wZETSoE5NQgecigDrSHkPtIYA",
    //   expires_in:7200
    // }
    method: 'POST',
    url: 'https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode',
    params: ['component_access_token'],
    body: ['component_appid']
  },
  api_query_auth: {
    // 使用授权码换取公众号或小程序的接口调用凭据和授权信息
    // 返回值:
    // authorization_info:{
    //   authorizer_appid: "wxf8b4f85f3a794e77",
    //   authorizer_access_token: "QXjUqNqfYVH0yBE1iI_7vuN_9gQbpjfK7hYwJ3P7xOa88a89-Aga5x1NMYJyB8G2yKt1KCl0nPC3W9GJzw0Zzq_dBxc8pxIGUNi_bFes0qM",
    //   expires_in: 7200,
    //   authorizer_refresh_token: "dTo-YCXPL4llX-u1W1pPpnp8Hgm4wpJtlR6iV0doKdY",
    //   func_info: [...]
    // }
    method: 'POST',
    url: 'https://api.weixin.qq.com/cgi-bin/component/api_query_auth',
    params: ['component_access_token'],
    body: ['component_appid', 'authorization_code']
  },
  api_authorizer_token: {
    // 获取（刷新）授权公众号或小程序的接口调用凭据（令牌）
    // 该API用于在授权方令牌（authorizer_access_token）失效时，可用刷新令牌（authorizer_refresh_token）获取新的令牌。请注意，此处token是2小时刷新一次，开发者需要自行进行token的缓存，避免token的获取次数达到每日的限定额度。缓存方法可以参考：http://mp.weixin.qq.com/wiki/2/88b2bf1265a707c031e51f26ca5e6512.html
    // 当换取authorizer_refresh_token后建议保存。
    // 返回值: {
    //   pre_auth_code:"61W3mEpU66027wgNZ_MhGHNQDHnFATkDa9-2llqrMBjUwxRSNPbVsMmyD-yq8wZETSoE5NQgecigDrSHkPtIYA",
    //   expires_in:7200
    // }
    method: 'POST',
    url: 'https://api.weixin.qq.com/cgi-bin/component/api_authorizer_token',
    params: ['component_access_token'],
    body: ['component_appid', 'authorizer_appid', 'authorizer_refresh_token']
  },
  api_get_authorizer_info: {
    // 获取授权方的帐号基本信息
    // 该API用于获取授权方的基本信息，包括头像、昵称、帐号类型、认证类型、微信号、原始ID和二维码图片URL。
    // 需要特别记录授权方的帐号类型，在消息及事件推送时，对于不具备客服接口的公众号，需要在5秒内立即响应；而若有客服接口，则可以选择暂时不响应，而选择后续通过客服接口来发送消息触达粉丝。
    // 返回值: {
    //   pre_auth_code:"61W3mEpU66027wgNZ_MhGHNQDHnFATkDa9-2llqrMBjUwxRSNPbVsMmyD-yq8wZETSoE5NQgecigDrSHkPtIYA",
    //   expires_in:7200
    // }
    method: 'POST',
    url: 'https://api.weixin.qq.com/cgi-bin/component/api_get_authorizer_info',
    params: ['component_access_token'],
    body: ['component_appid', 'authorizer_appid']
  },
  api_get_authorizer_option: {
    // 获取授权方的选项设置信息
    // 该API用于获取授权方的公众号或小程序的选项设置信息，如：地理位置上报，语音识别开关，多客服开关。注意，获取各项选项设置信息，需要有授权方的授权，详见权限集说明。
    // 返回值: {
    //   pre_auth_code:"61W3mEpU66027wgNZ_MhGHNQDHnFATkDa9-2llqrMBjUwxRSNPbVsMmyD-yq8wZETSoE5NQgecigDrSHkPtIYA",
    //   expires_in:7200
    // }
    method: 'POST',
    url:
      'https://api.weixin.qq.com/cgi-bin/component/api_get_authorizer_option',
    params: ['component_access_token'],
    body: ['component_appid', 'authorizer_appid', 'option_name']
  },
  api_set_authorizer_option: {
    // 设置授权方的选项信息
    // 该API用于设置授权方的公众号或小程序的选项信息，如：地理位置上报，语音识别开关，多客服开关。注意，设置各项选项设置信息，需要有授权方的授权，详见权限集说明。
    // 返回值: {
    //   pre_auth_code:"61W3mEpU66027wgNZ_MhGHNQDHnFATkDa9-2llqrMBjUwxRSNPbVsMmyD-yq8wZETSoE5NQgecigDrSHkPtIYA",
    //   expires_in:7200
    // }
    method: 'POST',
    url:
      'https://api.weixin.qq.com/cgi-bin/component/api_set_authorizer_option',
    params: ['component_access_token'],
    body: ['component_appid', 'authorizer_appid', 'option_name', 'option_value']
  }
};

export const wxRequests = makeWxappFunctions(actions);

/**
  步骤2：引入用户进入授权页
  第三方平台方可以在自己的网站中放置“微信公众号授权”或者“小程序授权”的入口，或生成授权链接放置在移动网页中，引导公众号和小程序管理员进入授权页。
  方式一：授权注册页面扫码授权
  注：auth_type、biz_appid两个字段互斥。
* 
*/
export const get_auth_url_scancode = args => {
  let {
    component_appid,
    pre_auth_code,
    redirectUri,
    auth_type = 3,
    biz_appid = null
  } = args || {};
  // let redirectUri = 'http://open1.qingshansi.cn';
  let qstr =
    'component_appid=' +
    component_appid +
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
export const get_auth_url_mobile = args => {
  let {
    component_appid,
    pre_auth_code,
    redirectUri,
    auth_type = 3,
    biz_appid = null
  } = args || {};
  // let redirectUri = 'http://open1.qingshansi.cn';
  let qstr =
    'action=bindcomponent&no_scan=1&component_appid=' +
    component_appid +
    '&pre_auth_code=' +
    pre_auth_code +
    '&redirect_uri=' +
    encodeURI(redirectUri);
  if (auth_type) qstr += '&auth_type=' + auth_type;
  else if (biz_appid) qstr += '&biz_appid=' + biz_appid;
  qstr += '#wechat_redirect';

  return 'https://mp.weixin.qq.com/safe/bindcomponent?' + qstr;
};
