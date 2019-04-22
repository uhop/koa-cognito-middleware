'use strict';

const url = require('url');
const https = require('https');
const querystring = require('querystring');

const gap = 5 * 60 * 1000;

const postData = querystring.stringify({grant_type: 'client_credentials'}),
  postLength = Buffer.byteLength(postData);

let token, timeoutId;

const retrieveToken = async (uri, username, password) => {
  token = await new Promise((resolve, reject) => {
    const urlObject = url.parse(uri);
    const options = {
      protocol: urlObject.protocol,
      hostname: urlObject.hostname,
      port: urlObject.port || 443,
      path: urlObject.path,
      method: 'POST',
      auth: username + ':' + password,
      headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': postLength}
    };
    let data = '';
    const clientRequest = https.request(options, response => {
      if (response.statusCode >= 400) {
        return reject(new Error('Bad status code: ' + response.statusCode));
      }
      response.setEncoding('utf8');
      response.on('data', chunk => (data += chunk));
      response.on('end', () => {
        resolve(data ? JSON.parse(data) : null);
      });
    });
    clientRequest.on('error', error => {
      debug('Cannot retrieve a token from: ' + url);
      reject(error);
    });
    clientRequest.write(postData);
    clientRequest.end();
  });
  timeoutId && clearTimeout(timeoutId);
  timeoutId = null;
  if (token) {
    const expires = token.expires_in * 1000; // in ms
    timeoutId = setTimeout(() => {
      timeoutId = null;
      retrieveToken(uri, username, password);
    }, expires > gap ? expires - gap : expires / 2);
  }
  return token;
};

const getToken = () => token;

module.exports.retrieveToken = retrieveToken;
module.exports.getToken = getToken;
