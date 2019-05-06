'use strict';

const makeGetUser = require('cognito-toolkit');

const getTokenFromHeader = (header, cookie) => {
  if (!header) return ctx => ctx.cookies.get(cookie) || null;
  header = header.toLowerCase();
  if (!cookie) return ctx => ctx.headers[header] || null;
  return ctx => ctx.headers[header] || ctx.cookies.get(cookie) || null;
};

const getUser = options => {
  const opt = {authHeader: 'Authorization', authCookie: 'auth', region: '', userPoolId: '', setAuthCookieOptions: null};
  options && Object.assign(opt, options);
  if (typeof opt.source != 'function') {
    opt.source = getTokenFromHeader(opt.authHeader, opt.authCookie);
  }
  const getUser = makeGetUser(opt);
  const setAuthCookie = (ctx, cookieOptions) => {
    if (ctx.state.user && opt.authCookie && ctx.cookies.get(opt.authCookie) !== ctx.state.user._token) {
      ctx.cookie.set(
        opt.authCookie,
        ctx.state.user._token,
        Object.assign({expires: new Date(ctx.state.user.exp * 1000), domain: ctx.host, overwrite: true}, cookieOptions)
      );
    }
  };
  return async (ctx, next) => {
    const token = opt.source(ctx);
    const user = await getUser(token);
    if (user) {
      user._token = token;
      user.setAuthCookie = setAuthCookie;
    }
    ctx.state.user = user;
    await next();
    if (opt.setAuthCookieOptions) ctx.state.user.setAuthCookie(ctx, opt.setAuthCookieOptions);
  };
};

const isAuthenticated = async (ctx, next) => {
  if (ctx.state.user) return next();
  ctx.status = 401;
};

const hasGroup = group => async (ctx, next) => {
  if (ctx.state.user) {
    const groups = ctx.state.user['cognito:groups'];
    if (groups && groups instanceof Array && groups.some(g => g === group)) return next();
    ctx.status = 403;
  }
  ctx.status = 401;
};

const hasScope = scope => async (ctx, next) => {
  if (ctx.state.user) {
    const scopes = ctx.state.user.scope;
    if (scopes && typeof scopes == 'string' && scope.split(' ').some(s => s === scope)) return next();
    ctx.status = 403;
  }
  ctx.status = 401;
};

const isAllowed = validator => async (ctx, next) => {
  const scopes = (ctx.state.user && ctx.state.user.scope && ctx.state.user.scope.split(' ')) || [],
    groups = (ctx.state.user && ctx.state.user['cognito:groups']) || [];
  const pass = await validator(ctx, groups, scopes);
  if (pass) return next();
  ctx.status = ctx.state.user ? 403 : 401;
};

getUser.isAuthenticated = isAuthenticated;
getUser.hasGroup = hasGroup;
getUser.hasScope = hasScope;
getUser.isAllowed = isAllowed;

module.exports = getUser;
