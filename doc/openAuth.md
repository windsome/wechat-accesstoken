### 微信开发平台开发
[第三方平台概述](https://open.weixin.qq.com/cgi-bin/showdocument?action=dir_list&t=resource/res_list&verify=1&id=open1419318292&token=&lang=)
[授权流程技术说明](https://open.weixin.qq.com/cgi-bin/showdocument?action=dir_list&t=resource/res_list&verify=1&id=open1453779503&token=&lang=)

### 小程序或者公众号授权给第三方平台的技术实现流程
见[授权流程技术说明](https://open.weixin.qq.com/cgi-bin/showdocument?action=dir_list&t=resource/res_list&verify=1&id=open1453779503&token=&lang=)
1. 第三方平台方获取预授权码（pre_auth_code）
    预授权码是第三方平台方实现授权托管的必备信息
2. 引入用户进入授权页
    第三方平台方可以在自己的网站中放置“微信公众号授权”或者“小程序授权”的入口，或生成授权链接放置在移动网页中，引导公众号和小程序管理员进入授权页。
  + 方式一：授权注册页面扫码授权
    授权页网址为：<https://mp.weixin.qq.com/cgi-bin/componentloginpage?component_appid=xxxx&pre_auth_code=xxxxx&redirect_uri=xxxx&auth_type=xxx>
  + 方式二：点击移动端链接快速授权
    第三方平台方可以生成授权链接，将链接通过移动端直接发给授权管理员，管理员确认后即授权成功。
    授权链接为：<https://mp.weixin.qq.com/safe/bindcomponent?action=bindcomponent&auth_type=3&no_scan=1&component_appid=xxxx&pre_auth_code=xxxxx&redirect_uri=xxxx&auth_type=xxx&biz_appid=xxxx#wechat_redirect>
3. 用户确认并同意登录授权给第三方平台方
    用户进入第三方平台授权页后，需要确认并同意将自己的公众号或小程序授权给第三方平台方，完成授权流程。
4. 授权后回调URI，得到授权码（authorization_code）和过期时间
    授权流程完成后，授权页会自动跳转进入回调URI，并在URL参数中返回授权码和过期时间(redirect_url?auth_code=xxx&expires_in=600)
5. 利用授权码调用公众号或小程序的相关API
    在得到授权码后，第三方平台方可以使用授权码换取授权公众号或小程序的接口调用凭据（authorizer_access_token，也简称为令牌），再通过该接口调用凭据，按照公众号开发者文档或小程序开发文档的说明，去调用公众号或小程序相关API。
    （能调用哪些API，取决于用户将哪些权限集授权给了第三方平台方，也取决于公众号或小程序自身拥有哪些接口权限），使用JS SDK等能力。具体请见【公众号第三方平台的接口说明】

### API接口
1. `POST /apis/v1/wx/open1/event`授权事件回调URI,在开放平台设置,由腾讯调用.腾讯定时10分钟或者有授权事件发生时调用.
需要暴露给微信调用.

2. `GET|POST /apis/v1/wx/open1/authurl` 获取授权URL
内部/外部调用均可,不涉及危险信息
```
传入参数:
{
  type: '<scancode>或<mobile>' //默认为mobile
  redirectUri // 授权确认页面
}
返回值:
{
  url,
  createdAt,
  expires_in
}
```
3. `GET /apis/v1/wx/open1/mpinfo` 通过`auth_code`获得公众号的信息.
内部/外部调用均可,不涉及危险信息
这一步的所需的auth_code是从`GET|POST /apis/v1/wx/open1/authurl`跳转的`redirectUri`中获得.
```
传入GET参数:
{
  auth_code:  // 用户同意授权后获得
  expires_in // 超时时间
}
返回值:
{
  authorizer_appid,
  authorizer_access_token,
  expires_in,
  authorizer_refresh_token,
  func_info: [
    {
      "funcscope_category": {
        "id": 1
      }
    },
  ]
}
```
4. `GET /apis/v1/wx/open1/access_token/:APPID[?force=true]` 获取某个APPID的accessToken
内部服务调用,涉及私密信息
```
传入GET参数:
{
  APPID:  // APPID
  force // 是否强制,无此参数表示不强制,否则强制.
}
返回值:
{
  token, // token
}
```
5. `POST /apis/v1/wx/open1/:APPID/callback` 公众号消息回调.
微信调用,不涉及私密信息.

## 公众平台部署.
1. 微信开放平台设置授权事件回调地址`POST /apis/v1/wx/open1/event`
2. 