'use strict';

const makeGetUser = require('cognito-toolkit');

const getTokenFromHeader = header => {
  header = header.toLowerCase();
  return ctx => ctx.headers[header] || null;
};

const getUser = options => {
  const opt = {source: 'Authorization', region: '', userPoolId: ''};
  options && Object.assign(opt, options);
  if (typeof opt.source == 'string') {
    opt.source = getTokenFromHeader(opt.source);
  }
  const getUser = makeGetUser(opt);
  return async (ctx, next) => {
    const token = opt.source(ctx);
    ctx.state.user = await getUser(token);
    return next();
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
  const scopes = ctx.state.user && ctx.state.user.scope && ctx.state.user.scope.split(' ') || [],
    groups = ctx.state.user && ctx.state.user['cognito:groups'] || [];
  const pass = await validator(ctx, groups, scopes);
  if (pass) return next();
  ctx.status = ctx.state.user ? 403 : 401;
};

getUser.isAuthenticated = isAuthenticated;
getUser.hasGroup = hasGroup;
getUser.hasScope = hasScope;
getUser.isAllowed = isAllowed;

module.exports = getUser;
