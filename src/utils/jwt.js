const jwt = require('jsonwebtoken');
const jwtKoa = require('koa-jwt');
const secret = 'mysecretforsharkstv';
const expiresIn = '7d';

/**
 * 校验token
 * 1. HTTP头中 authorization 字段为jwt-token, 格式为 Authorization: Bearer <token>
 * 2. 如果jwtKoa(opts)的opts中有指定cookie，则HTTP头中cookie部分的cookie字段为jwt-token，如opts={cookie:'user'},则cookie中user字段即为jwt-token
 * 解析后：
 * key = 'user'
 * ctx.state[key] = decodedToken;
 */
// export const tokenVerify = jwtKoa({ key: 'user', secret }); // by headers.Authorization
export const tokenVerify = jwtKoa({ cookie: 'user', secret }); // by headers.cookie.user
export const tokenCreate = (tokenInfo, opts) => {
  return jwt.sign(tokenInfo, secret, opts || { expiresIn });
};

export default tokenVerify;
