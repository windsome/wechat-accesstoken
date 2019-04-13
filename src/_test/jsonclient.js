let jayson = require('jayson/promise');

const client = jayson.client.http({
  port: 8000
});
const client2 = jayson.client.http('http://localhost:8000');

const reqs = [
  client.request('accessToken', [{ force: true }]),
  client.request('rejection', []),
  client.request('getAuthUrl', [{ type: 'mobile' }])
];

const reqs = [
  client.request('getMpAccessTokenByAppid', [{ appid: 'wxfb8d1a55dbb25611' }])
  // client.request('accessToken', [{ force: true }]),
  // client.request('registerAppid', [{ appid: 'wxfb8d1a55dbb25611', secret: '11111111111111111' }]),
];

Promise.all(reqs).then(function(responses) {
  console.log(responses);
  // console.log(responses[1]);
  // console.log(responses[1]);
});
