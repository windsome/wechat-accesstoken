import getRawBody from 'raw-body';
import xml2js from 'xml2js';
import crypto from 'crypto';
import WXBizMsgCrypt from 'wechat-crypto';

export default class Wxopen {
  constructor(config) {
    this.setToken(config);
  }

  setToken(config) {
    if (typeof config === 'string') {
      this.token = config;
    } else if (typeof config === 'object' && config.token) {
      this.token = config.token;
      this.appid = config.appid || '';
      this.encodingAESKey = config.encodingAESKey || '';
    } else {
      throw new Error('please check your config');
    }
  }

  getSignature(timestamp, nonce, token) {
    var shasum = crypto.createHash('sha1');
    var arr = [token, timestamp, nonce].sort();
    shasum.update(arr.join(''));
    return shasum.digest('hex');
  }

  parseXML(xml) {
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
  formatMessage(result) {
    var message = {};
    if (typeof result === 'object') {
      for (var key in result) {
        if (!(result[key] instanceof Array) || result[key].length === 0) {
          continue;
        }
        if (result[key].length === 1) {
          var val = result[key][0];
          if (typeof val === 'object') {
            message[key] = this.formatMessage(val);
          } else {
            message[key] = (val || '').trim();
          }
        } else {
          message[key] = [];
          result[key].forEach(function(item) {
            message[key].push(this.formatMessage(item));
          });
        }
      }
    }
    return message;
  }

  middleware() {
    var that = this;
    if (this.encodingAESKey) {
      that.cryptor = new WXBizMsgCrypt(
        this.token,
        this.encodingAESKey,
        this.appid
      );
    }
    return async function(ctx) {
      var query = ctx.query;
      // 加密模式
      var encrypted = !!(
        query.encrypt_type &&
        query.encrypt_type === 'aes' &&
        query.msg_signature
      );
      var timestamp = query.timestamp;
      var nonce = query.nonce;
      var echostr = query.echostr;
      var method = ctx.method;

      if (method === 'POST') {
        if (!encrypted) {
          // 校验
          if (
            query.signature !== that.getSignature(timestamp, nonce, that.token)
          ) {
            throw new Error('Invalid signature');
            // ctx.status = 401;
            // ctx.body = 'Invalid signature';
            // return;
          }
        }
        // 取原始数据
        var xml = await getRawBody(ctx.req, {
          length: ctx.length,
          limit: '1mb',
          encoding: ctx.charset
        });

        ctx.weixin_xml = xml;
        // 解析xml
        var result = await that.parseXML(xml);
        var formated = that.formatMessage(result.xml);
        if (encrypted) {
          var encryptMessage = formated.Encrypt;
          if (
            query.msg_signature !==
            that.cryptor.getSignature(timestamp, nonce, encryptMessage)
          ) {
            throw new Error('Invalid signature');
            // ctx.status = 401;
            // ctx.body = 'Invalid signature';
            // return;
          }
          var decryptedXML = that.cryptor.decrypt(encryptMessage);
          var messageWrapXml = decryptedXML.message;
          if (messageWrapXml === '') {
            throw new Error('Invalid signature');
            // ctx.status = 401;
            // ctx.body = 'Invalid signature';
            // return;
          }
          //var decodedXML = yield parseXML(messageWrapXml);
          var decodedXML = await that.parseXML(messageWrapXml);
          formated = that.formatMessage(decodedXML.xml);
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
}
