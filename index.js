/**
 * Wood Plugin Module.
 * query查询对象, nosql使用
 * by jlego on 2018-11-18
 */
const Query = require('./src/query');

module.exports = (app = {}, config = {}) => {
  app.Query = function(req = {}) {
    return Query.getQuery(req);
  }
  if(app.addAppProp) app.addAppProp('Query', app.Query);
  return app;
}
