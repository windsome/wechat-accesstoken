import ErrCode from 'errcode';
export default ErrCode;

export const EC = {
  ERR_SYSTEM_ERROR: -1,
  ERR_OK: 0,
  ERR_UNAUTH: 401,
  ERR_3RD_API_FAIL: 40000,
  ERR_UNKNOWN: 40001,
  ERR_BUSY: 40002,
  ERR_PARAM_ERROR: 40003,
  ERR_NO_SUCH_ENTITY: 40004,
  ERR_INSERT_DB_FAIL: 40005,
  ERR_UPDATE_DB_FAIL: 40006,
  ERR_ALREADY_EXIST: 40007,
  ERR_MISS_REQUIRE: 40008,
  ERR_SYSTEM_ERROR: 40009,
  ERR_MODULE_NOT_INIT: 40010,
  ERR_NO_SUCH_API: 40011,
  ERR_ARRAY_OUT_OF_INDEX: 40012,
  ERR_NOT_ALLOW: 40018,
  ERR_NOT_OWNER: 40019,
  ERR_USER_NO_BASEINFO: 40020,
  ERR_USER_DUP_LOGIN: 40021,
  ERR_USER_DUP_EMAIL: 40022,
  ERR_USER_CREATE_FAIL: 40023,
  ERR_USER_UPDATE_FAIL: 40024,
  ERR_USER_UPD_NO_USER: 40025,
  ERR_USER_AUTH_NO_USER: 40026,
  ERR_USER_AUTH_WRONG_PASS: 40027,
  ERR_USER_NO_CAP: 40028,
  ERR_USER_NOT_LOGIN: 40029,
  ERR_TAXONOMY_DUP_TERM: 40030,
  ERR_PRICE_INDEX: 40031,
  ERR_PRODUCT_PRICE_WRONG: 40032,
  ERR_POST_TYPE_CHANGE_NOT_ALLOW: 40040,
  ERR_POST_MISS_REQUIRE: 40041,
  ERR_PRODUCT_EMPTY: 40042,

  ERR_VOTE_COUNT_OVERFLOW: 40050,
  ERR_VOTE_TIMEOUT: 40051,
  ERR_VOTE_ALREADY: 40052,
  ERR_VOTE_STATUS_WRONG: 40053,
  ERR_VOTE_NOT_START: 40054,

  ERR_BONUS_NOT_ENOUGH: 40061,

  ERR_USER_AUTH_SMSCODE_NONE: 40071,
  ERR_USER_AUTH_SMSCODE_DIFF: 40072,
  ERR_AUTH_ALREADY_EXIST: 40073,
  ERR_AUTH_PHONE_MISMATCH: 40074,
  ERR_AUTH_CODE_MISMATCH: 40075,
  ERR_AUTH_NOT_REGISTER: 40076,
  ERR_AUTH_TOKEN_CHANGED: 40077,

  ERR_SEND_SMS_FAIL: 40080,
  ERR_SEND_SMS_NO_CONTACTS: 40081,
  ERR_SEND_SMS_LIMIT_CONTROL: 40082,
  ERR_SEND_SMS_PHONE_WRONG: 40083,

  ERR_XX_NO_SUCH_CITY: 40090,

  ERR_CHECKIN_ALREADY: 40100,
  ERR_CHECKIN_NOTIN: 40101,
  ERR_CHECKIN_NOTINAREA: 40102,
  ERR_CHECKIN_NOGPS: 40103,
  ERR_CHECKIN_WRONG_EXPIRE: 40104,

  ERR_COMMENT_SILENT: 40201,

  ERR_WECHAT_WRONG_PASSWORD: 41001,
  ERR_WECHAT_NO_ACCESSTOKEN: 41002,
  ERR_WECHAT_NOT_IN_SESSION: 41003,

  ERR_WXOPEN_TICKETS_NONE: 42001,
  ERR_WXOPEN_TICKET_WRONG: 42002,
  ERR_WXOPEN_TOKEN_NONE: 42003
};

export const EM = require('./Errcode.cn').default(EC);