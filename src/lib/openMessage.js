import getRawBody from 'raw-body';
import xml2js from 'xml2js';
import crypto from 'crypto';
import WXBizMsgCrypt from 'wechat-crypto';

// function setToken(config) {
//   if (typeof config === 'string') {
//     this.token = config;
//   } else if (typeof config === 'object' && config.token) {
//     this.token = config.token;
//     this.appid = config.appid || '';
//     this.encodingAESKey = config.encodingAESKey || '';
//   } else {
//     throw new Error('please check your config');
//   }
// }

function getSignature(timestamp, nonce, token) {
  let shasum = crypto.createHash('sha1');
  let arr = [token, timestamp, nonce].sort();
  shasum.update(arr.join(''));
  return shasum.digest('hex');
}

function parseXML(xml) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, { trim: true }, (err, res) => {
      if (err) return reject(err);
      if (arguments.length > 2) res = slice.call(arguments, 1);
      resolve(res);
    });
  });
}

/*!
 * 将xml2js解析出来的对象转换成直接可访问的对象
 */
function formatMessage(result) {
  let message = {};
  if (typeof result === 'object') {
    for (let key in result) {
      if (!(result[key] instanceof Array) || result[key].length === 0) {
        continue;
      }
      if (result[key].length === 1) {
        let val = result[key][0];
        if (typeof val === 'object') {
          message[key] = formatMessage(val);
        } else {
          message[key] = (val || '').trim();
        }
      } else {
        message[key] = [];
        result[key].forEach(function(item) {
          message[key].push(formatMessage(item));
        });
      }
    }
  }
  return message;
}

export function middleware(opts) {
  let { token, appid, encodingAESKey } = opts;
  let cryptor = null;
  if (encodingAESKey) {
    cryptor = new WXBizMsgCrypt(token, encodingAESKey, appid);
  }
  return async function(ctx) {
    if (!cryptor) {
      throw new Error('not init cryptor!');
    }
    let query = ctx.query;
    // 加密模式
    let encrypted = !!(
      query.encrypt_type &&
      query.encrypt_type === 'aes' &&
      query.msg_signature
    );
    let timestamp = query.timestamp;
    let nonce = query.nonce;
    let echostr = query.echostr;
    let method = ctx.method;

    if (method === 'POST') {
      if (!encrypted) {
        // 校验
        if (query.signature !== getSignature(timestamp, nonce, token)) {
          throw new Error('Invalid signature');
          // ctx.status = 401;
          // ctx.body = 'Invalid signature';
          // return;
        }
      }
      // 取原始数据
      let xml = await getRawBody(ctx.req, {
        length: ctx.length,
        limit: '1mb',
        encoding: ctx.charset
      });

      ctx.weixin_xml = xml;
      // 解析xml
      let result = await parseXML(xml);
      let formated = formatMessage(result.xml);
      if (encrypted) {
        let encryptMessage = formated.Encrypt;
        if (
          query.msg_signature !==
          cryptor.getSignature(timestamp, nonce, encryptMessage)
        ) {
          throw new Error('Invalid signature');
          // ctx.status = 401;
          // ctx.body = 'Invalid signature';
          // return;
        }
        let decryptedXML = cryptor.decrypt(encryptMessage);
        let messageWrapXml = decryptedXML.message;
        if (messageWrapXml === '') {
          throw new Error('Invalid signature');
          // ctx.status = 401;
          // ctx.body = 'Invalid signature';
          // return;
        }
        let decodedXML = await parseXML(messageWrapXml);
        formated = formatMessage(decodedXML.xml);
      }

      // 挂载处理后的微信消息
      ctx.weixin = formated;
      return formated;
    } else {
      throw new Error('Not Implemented');
      // ctx.status = 501;
      // ctx.body = 'Not Implemented';
    }
  };
}
