///////////////////////////////////////////////////
// koa web server for all APPs.
///////////////////////////////////////////////////
require('babel-register');
let _debug = require('debug');
const debug = _debug('app:server');

let http = require('http');
const port = 3310;
let server = require('./mainserver').default;
http.createServer(server.callback()).listen(port);
debug(`HttpServer accessible via http://localhost:${port} `);

// jsonrpc server
let jsonPort = 8000;
let jsonServer = require('./jsonserver').default;
jsonServer.listen(jsonPort);
debug(`JsonRpcServer accessible via http://localhost:${jsonPort} `);
