let jayson = require('jayson/promise');

const client = jayson.client.http({
  port: 8000
});

const reqs = [
  client.request('accessToken', [{ force: true }]),
  client.request('rejection', []),
  client.request('getAuthUrl', [{ type: 'mobile' }])
];

Promise.all(reqs).then(function(responses) {
  console.log(responses);
  // console.log(responses[1]);
  // console.log(responses[1]);
});
