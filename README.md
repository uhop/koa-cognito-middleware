# `koa-cognito-middleware` [![NPM version][npm-img]][npm-url]

[npm-img]: https://img.shields.io/npm/v/koa-cognito-middleware.svg
[npm-url]: https://npmjs.org/package/koa-cognito-middleware

> **This package moved into [cognito-toolkit](https://github.com/uhop/cognito-toolkit) v3** as the subpath export `cognito-toolkit/koa`. Version 2.0.0 of this package is a **frozen re-export thunk** — it forwards everything from `cognito-toolkit/koa` and will receive no further development. Depend on `cognito-toolkit` directly:

```js
import {CognitoJwtVerifier} from 'cognito-toolkit';
import {makeAuth} from 'cognito-toolkit/koa';

const verifier = CognitoJwtVerifier.create({userPoolId: 'us-east-1_MY_POOL', clientId: 'my-app-client', tokenUse: 'access'});
const auth = makeAuth({verifier});

app.use(auth.getUser); // ctx.state.user = decoded payload or null
router.get('/protected', auth.isAuthenticated, handler);
```

## What changed in 2.0.0

- The implementation is now `cognito-toolkit/koa`, built on AWS's official [aws-jwt-verify](https://github.com/awslabs/aws-jwt-verify) — the 1.x homegrown verification stack is gone.
- `getUser({region, userPoolId})` became `makeAuth({verifier})` — you create the verifier via `CognitoJwtVerifier.create(...)` (note: `clientId` and `tokenUse` are now first-class checks).
- The former module statics (`getUser.isAuthenticated`, `getUser.hasGroup`, `getUser.hasScope`, `getUser.isAllowed`, `getUser.stateUserProperty`) are now members of the per-instance bundle returned by `makeAuth` — same names, same semantics.
- The auth-cookie features are preserved (`authCookie`, `setAuthCookieOptions`, `user.setAuthCookie`).
- ESM-only (CommonJS consumers use `require(esm)` with named exports); Node 20+.

See the full [migration guide](https://github.com/uhop/cognito-toolkit#migrating) and the [cognito-toolkit documentation](https://github.com/uhop/cognito-toolkit#readme).

The last standalone release of this package is **1.4.8** (its documentation lives in this repo's git history and [wiki](https://github.com/uhop/koa-cognito-middleware/wiki)).

## License

[The 3-Clause BSD License](https://opensource.org/licenses/BSD-3-Clause)
