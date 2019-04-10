import fs from 'fs-extra'
import path from 'path'
import webpackCompiler from './webpack-compiler'
import webpackServerConfig from './webpack.config'
import _ from 'lodash'
import _debug from 'debug'
const debug = _debug('app:bin:compile')

const dest = process.env.DEST || 'ysjbackup';
const path_base = path.resolve(__dirname, '..');
const resolve = path.resolve;
const base = (...args) => Reflect.apply(resolve, null, [path_base, ...args]);
const paths = {
  base,
  server: base.bind(null, 'src'),
  sdist: base.bind(null, 'sdist')
}

const compiler_fail_on_warning = false;

const copyCoinLancertech = () => {
  fs.copySync(paths.server('cfg/1_mp.lancertech.net_cert.crt'), paths.sdist('1_mp.lancertech.net_cert.crt'))
  fs.copySync(paths.server('cfg/2_mp.lancertech.net.key'), paths.sdist('2_mp.lancertech.net.key'))
  //fs.copySync(paths.server('cfg/ca.mqtt.lock.cer'), paths.sdist('ca.mqtt.lock.cer'))
  fs.copySync(paths.server('cfg/apiclient_cert_1411146202.p12'), paths.sdist('apiclient_cert_1411146202.p12'))
}
const copyYsjFormal = () => {
  fs.copySync(paths.server('cfg/apiclient_cert_1330920401.p12'), paths.sdist('apiclient_cert_1330920401.p12'))
}
const copyYsjBackup = () => {
  fs.copySync(paths.server('cfg/apiclient_cert_1411146202.p12'), paths.sdist('apiclient_cert_1411146202.p12'))
}
const copyFiles = (dest) => {
  // switch (dest) {
  //   case 'lancertech': copyCoinLancertech(); break;
  //   case 'ysjformal': copyYsjFormal(); break;
  //   case 'ysjbackup':
  //   default: copyYsjBackup(); break;
  // }
}

;(async function () {
  try {
    let startTime = new Date().getTime() / 1000;
    debug('Start server '+dest+' compile at ', startTime)
    try {
      fs.emptyDirSync(paths.sdist());
      fs.outputFileSync(paths.sdist('deploydest'), dest);
    } catch (error) {
      debug('fail:'+error.message);
    }
    const stats2 = await webpackCompiler(webpackServerConfig)
    if (stats2.warnings.length && compiler_fail_on_warning) {
      debug('Config set to fail on warning, exiting with status code "1".')
      process.exit(1)
    }
    debug('Copy static assets to sdist folder.')
    copyFiles(dest);
    let endTime = new Date().getTime() / 1000;
    debug ('Finish compile at ', endTime, ', time elapse ', _.round(endTime - startTime, 3));
  } catch (e) {
    debug('Compiler encountered an error.', e)
    process.exit(1)
  }
})()
