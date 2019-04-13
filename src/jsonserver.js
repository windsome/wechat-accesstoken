import _debug from 'debug';
const debug = _debug('app:jsonserver');
import 'isomorphic-fetch';
import jayson from 'jayson/promise';
import cors from 'cors';
import connect from 'connect';
import { json as jsonParser } from 'body-parser';
import _ from 'lodash';
import config from './config';

// jsonrpc function wrapper
let rpcFuncWrap = (func, server) => args => {
  return func(args).catch(error => {
    debug('error!', error);
    // let errcode = error.errcode || -1;
    // let message = error.message || 'system error';
    // return server.error(errcode, message)
    return error;
  });
};

// get services
let JrpcMp = require('./apis/jrpcMp').default;
let jrpcMp = new JrpcMp(config);
let jrpcMpSvcs = jrpcMp.getServices();

let JrpcOpen = require('./apis/jrpcOpen').default;
let jrpcOpen = new JrpcOpen(config);
let jrpcOpenSvcs = jrpcOpen.getServices();

// start server
const app = connect();
const server = jayson.server(
  _.mapValues({ ...jrpcMpSvcs, ...jrpcOpenSvcs }, function(fn) {
    return rpcFuncWrap(fn, server);
  })
);
app.use(cors({ methods: ['POST', 'GET', 'PUT'] }));
app.use(jsonParser());
app.use(server.middleware());
// app.listen(8000);

export default app;
