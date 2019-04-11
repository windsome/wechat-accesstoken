### 微信公众号MP平台accessToken集中获取.
[获取access_token](https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421140183)

### API接口
1. `GET /apis/v1/wx/mp/access_token` 获取默认配置中的accessToken
URL参数: {
    force:true //是否强制获取access_token
}

2. `GET /apis/v1/wx/mp/access_token/:APPID` 获取某个APPID的accessToken,暂时无法用

### 部署
1. 此服务作为内部服务,不直接对外暴露接口.由接口服务器内部调用,返回token.
