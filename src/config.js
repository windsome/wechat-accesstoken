import _debug from 'debug';
const debug = _debug('app:config');
import fs from 'fs';

const base_cfg_folder = '/data/wechat-accesstoken/config/';

let config = null;
try {
  config = JSON.parse(fs.readFileSync(base_cfg_folder + 'config.json'));
} catch (error) {
  debug('error!', error);
}
if (!config) {
  debug('fatal error! no config!');
}

export default config;
