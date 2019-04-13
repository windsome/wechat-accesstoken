import _debug from 'debug';
const debug = _debug('app:lib:_actionInvoke');
import request from '../utils/_request';
import mapValues from 'lodash/mapValues';

/**
 * 根据参数去调用微信的接口.
 *
 * @param {object} dataAction 为HTTP请求的配置,如下例
 *   code2Session: {
 *     method: 'GET',
 *     url: 'https://api.weixin.qq.com/sns/jscode2session',
 *     params: ['appid', 'secret', 'js_code', 'grant_type'],
 *     def: {
 *       grant_type: 'authorization_code'
 *     }
 *   }
 * @param {object} cfg 为小程序或公众号配置,一般是常用参数
 *  {
 *    appid:"xxxx",
 *    secret:"xxxxx"
 *  }
 * @param {object} params HTTP请求中get的参数
 *  {
 *    js_code:"xxxx"
 *  }
 * @param {object} body HTTP-POST请求中body的参数
 *  {
 *    js_code:"xxxx"
 *  }
 *
 */
export const wxappInvoke = dataAction => cfg => (params, body) => {
  if (!dataAction) return;
  let def = dataAction.def || {};
  cfg = cfg || {};
  params = params || {};
  body = body || {};
  let data1 = { ...def, ...cfg, ...params };
  let data2 = { ...def, ...cfg, ...body };

  let ndata1 = [];
  dataAction.params &&
    dataAction.params.map(key => {
      let subkeys = key.split('|');
      for (let i = subkeys.length - 1; i >= 0; i--) {
        let subkey = subkeys[i];
        if (data1.hasOwnProperty(subkey)) {
          ndata1.push(subkey + '=' + data1[subkey]);
        }
      }
    });

  let ndata2 = {};
  dataAction.body &&
    dataAction.body.map(key => {
      let subkeys = key.split('|');
      for (let i = subkeys.length - 1; i >= 0; i--) {
        let subkey = subkeys[i];
        if (data2.hasOwnProperty(subkey)) {
          ndata2[subkey] = data2[subkey];
        }
      }
    });

  let url = dataAction.url;
  let qs = ndata1.join('&');
  if (qs) url += '?' + qs;
  return request(dataAction.method, url, ndata2);
};

/**
 * 通过配置生成HTTP请求函数集合.
 * @param {object} actions 集合
 *  let actions = {
 *    code2Session: {
 *      method: 'GET',
 *      url: 'https://api.weixin.qq.com/sns/jscode2session',
 *      params: ['appid', 'secret', 'js_code', 'grant_type'],
 *      def: {
 *        grant_type: 'authorization_code'
 *      }
 *    }
 *  };
 */
export const makeWxappFunctions = actions => {
  let fns = {};
  mapValues(actions, (value, key) => {
    fns[key] = wxappInvoke(value);
  });
  return fns;
};

export default makeWxappFunctions;
