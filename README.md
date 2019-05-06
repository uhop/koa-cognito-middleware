# `koa-cognito-middleware`

[![Dependencies][deps-image]][deps-url]
[![devDependencies][dev-deps-image]][dev-deps-url]
[![NPM version][npm-image]][npm-url]

The [Koa](https://koajs.com/) middleware to authenticate and authorized users using [AWS Cognito](https://aws.amazon.com/cognito/)
[user pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html).
It validates a JWT token (either an id or access token) and populates `ctx.state.user` with its deciphered content.
Simple helpers are provided to make decisions on accessibility of API endpoints for a given user.

# Examples

```js
const Koa = require('koa');
const Router = require('koa-router');
const getUser = require('koa-cognito-middleware');

const {isAuthenticated, hasScope, hasGroup, isAllowed} = getUser;

const app = new Koa();

// run getUser() on every request
app.use(getUser({
  region: 'us-east-1',
  userPoolId: 'us-east-1_MY_USER_POOL'
}));

// populate router1 with custom authorization rules

const router1 = new Router();

router1.get('/a',
  async ctx => (ctx.body = 'all allowed'));

router1.get('/b', isAuthenticated,
  async ctx => (ctx.body = 'all authenticated'));

router1.post('/c', hasGroup('user-type/writers'),
  async ctx => (ctx.body = 'only a writers group'));

router1.post('/d', hasScope('writers'),
  async ctx => (ctx.body = 'only with a writers scope'));

app
  .use(router1.routes())
  .use(router1.allowedMethods());

// protect all routes with a single validator

const router2 = new Router();
// populate router2

const readMethods = {GET: 1, HEAD: 1, OPTIONS: 1};

const validator = async (ctx, groups, scopes) => {
  if (readMethods(ctx.method.toUpperCase()) === 1) return true;
  // only writers can use other methods (POST, PUT, PATCH, DELETE...)
  if (groups.some(g => g === 'user-type/writers')) return true;
  if (scopes.some(s => s === 'writers')) return true;
  return false;
};

app
  .use(isAllowed(validator))
  .get('/lift', async ctx => {
    const user = ctx.state.user;
    if (user) {
      user.setAuthCookie(ctx, {domain: 'api.my-domain.com'});
    }
    ctx.status = 204;
  })
  .use(router2.routes())
  .use(router2.allowedMethods());

// now all routes of router2 are protected by our validator
```

# How to install

```txt
npm install --save koa-cognito-middleware
# yarn add koa-cognito-middleware
```

# Documentation

All provided functions are explained below. See the examples above for usage patterns.

## `getUser(options)`

This is the main function directly returned from the module. It populates `ctx.state.user` with a decoded JWT or assigns it to `null` (cannot positively authenticate).
Other helpers or a user's code uses it to authorize or reject the user for a given route.

Additionally if an authenticated user it adds the following properties:

* `_token` &mdash; the original JWT.
* `setAuthCookie(ctx, options)` &mdash; a function, which when called with `ctx` argument sets a cookie specified by `authCookie` (see below) to `_token`.
  The optional `options` argument is an object compatible with [options for cookie.set()](https://github.com/pillarjs/cookies#cookiesset-name--value---options--).
  By default the cookie is set with following options:
    * `expires` &mdash; an expiration time of a JWT.
    * `domain` &mdash; a value of `ctx.host`.
    * `overwrite` &mdash; `true`.
  `options` will overwrite/augment those values.

`getUser(options)` takes one argument `options`, which is an object with the following properties:

* `region` &mdash; **required** string, which specifies an AWS region, such as `'us-east-1'`. Default: **none**.
* `userPoolId` &mdash; **required** string, which specifies a user pool ID, such as `'us-east-1_MY_USER_POOL'`. Default: **none**.
* `authHeader` &mdash; optional string. Default: `'Authorization'`. It specifies an HTTP request header name. Its value should be a JWT supplied by AWS Cognito (`id_token` or `access_token`).
* `authCookie` &mdash; optional string. Default: `'auth'`. It specifies an HTTP request cookie name. Its value should be a JWT supplied by AWS Cognito (`id_token` or `access_token`).
* `source` &mdash; optional function. Default: reads `authHeader` header and returns it, if it is not falsy, otherwise reads `authCookie` cookie and returns it, if it is not false, otherwise returns `null`.
  If it is a function, it is called with `ctx` argument, and can inspect a request to produce a JWT token as a string.
    * Examples:
      ```js
      const getToken1 = ctx => ctx.headers['x-auth-header'];
      const getToken2 = ctx => ctx.cookies.get('auth-token');
      ```
* `setAuthCookieOptions` &mdash; optional object compatible with [options for cookie.set()](https://github.com/pillarjs/cookies#cookiesset-name--value---options--).
  If it is `null` (the default), a cookie is not set automatically. Otherwise, it is set every time it is not set or has a different value. When a cookie is set,
  `setAuthCookieOptions` is used to overwrite/augment the default options described above in `setAuthCookie()`.

This function should be used before any other helpers.

## `getUser.isAuthenticated`

This is a helper function, which checks if `ctx.state.user` is set. If not it rejects a request with 401 (unauthorized).

## `getUser.hasGroup(group)`

This is a helper function, which checks if `ctx.state.user` has `'cognito:groups'` array that includes a given group (as a string).
If not it rejects a request with 403 (forbidden) for valid users and 401 (unauthorized) for non-authenticated users.

## `getUser.hasScope(scope)`

This is a helper function, which checks if `ctx.state.user` has `'scope'` string that includes a given scope (as a string).
If not it rejects a request with 403 (forbidden) for valid users and 401 (unauthorized) for non-authenticated users.

## `getUser.isAllowed(validator)`

This is a helper function, which checks runs a validator. If not it rejects a request with 403 (forbidden) for valid users and 401 (unauthorized) for non-authenticated users.

`validator` is an asynchronous function, which is called with three parameters: the original `ctx`, `groups` and `scopes`.
The latter two parameters are arrays of strings listing `cognito:groups` and `scope` items respectively.
`validator` should return a truthy value, if a user is allowed to perform an action, and a falsy value otherwise.

# Versions

- 1.4.2 &mdash; *More bugfixes*
- 1.4.1 &mdash; *Bugfixes*
- 1.4.0 &mdash; *Added support for an auth cookie*
- 1.3.0 &mdash; *Split off the common functionality to [cognito-toolkit](https://www.npmjs.com/package/cognito-toolkit)*
- 1.2.0 &mdash; *Added a utility to lazily retrieve an access token by client ID and a secret*
- 1.1.0 &mdash; *Added a utility to auto-retrieve an access token by client ID and a secret*
- 1.0.0 &mdash; *The initial public release*

# License

[The 3-Clause BSD License](https://opensource.org/licenses/BSD-3-Clause)

[npm-image]:       https://img.shields.io/npm/v/koa-cognito-middleware.svg
[npm-url]:         https://npmjs.org/package/koa-cognito-middleware
[deps-image]:      https://img.shields.io/david/uhop/koa-cognito-middleware.svg
[deps-url]:        https://david-dm.org/uhop/koa-cognito-middleware
[dev-deps-image]:  https://img.shields.io/david/dev/uhop/koa-cognito-middleware.svg
[dev-deps-url]:    https://david-dm.org/uhop/koa-cognito-middleware?type=dev
