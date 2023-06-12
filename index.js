'use strict';

const makeGetUser = require('cognito-toolkit');

const getTokenFromHeader = (header, cookie) => {
  if (!header) return ctx => ctx.cookies.get(cookie) || null;
  header = header.toLowerCase();
  if (!cookie) return ctx => ctx.headers[header] || null;
  return ctx => ctx.headers[header] || ctx.cookies.get(cookie) || null;
};

const getUser = (options, pools) => {
  const opt = {authHeader: 'Authorization', authCookie: 'auth', region: '', userPoolId: '', setAuthCookieOptions: null, ...options};
  if (typeof opt.source != 'function') {
    opt.source = getTokenFromHeader(opt.authHeader, opt.authCookie);
  }
  const getRawUser = makeGetUser(pools || opt);
  const setAuthCookie = (ctx, cookieOptions) => {
    if (ctx.state[getUser.stateUserProperty] && opt.authCookie && ctx.cookies.get(opt.authCookie) !== ctx.state[getUser.stateUserProperty]._token) {
      ctx.cookies.set(opt.authCookie, ctx.state[getUser.stateUserProperty]._token, {
        expires: new Date(ctx.state[getUser.stateUserProperty].exp * 1000),
        domain: ctx.host,
        overwrite: true,
        ...cookieOptions
      });
    }
  };
  return async (ctx, next) => {
    const token = opt.source(ctx);
    const user = await getRawUser(token);
    if (user) {
      user._token = token;
      user.setAuthCookie = setAuthCookie;
    }
    ctx.state[getUser.stateUserProperty] = user;
    await next();
    if (opt.setAuthCookieOptions && user) user.setAuthCookie(ctx, opt.setAuthCookieOptions);
  };
};

const isAuthenticated = async (ctx, next) => {
  if (ctx.state[getUser.stateUserProperty]) return next();
  ctx.status = 401;
};

const hasGroup = group => async (ctx, next) => {
  if (ctx.state[getUser.stateUserProperty]) {
    const groups = ctx.state[getUser.stateUserProperty]['cognito:groups'];
    if (groups && groups instanceof Array && groups.some(g => g === group)) return next();
    ctx.status = 403;
    return;
  }
  ctx.status = 401;
};

const hasScope = scope => async (ctx, next) => {
  if (ctx.state[getUser.stateUserProperty]) {
    const scopes = ctx.state[getUser.stateUserProperty].scope;
    if (scopes && typeof scopes == 'string' && scopes.split(' ').some(s => s === scope)) return next();
    ctx.status = 403;
    return;
  }
  ctx.status = 401;
};

const isAllowed = validator => async (ctx, next) => {
  const scopes =
      (ctx.state[getUser.stateUserProperty] && ctx.state[getUser.stateUserProperty].scope && ctx.state[getUser.stateUserProperty].scope.split(' ')) || [],
    groups = (ctx.state[getUser.stateUserProperty] && ctx.state[getUser.stateUserProperty]['cognito:groups']) || [];
  const pass = await validator(ctx, groups, scopes);
  if (pass) return next();
  ctx.status = ctx.state[getUser.stateUserProperty] ? 403 : 401;
};

getUser.stateUserProperty = 'user';
getUser.isAuthenticated = isAuthenticated;
getUser.hasGroup = hasGroup;
getUser.hasScope = hasScope;
getUser.isAllowed = isAllowed;

module.exports = getUser;
