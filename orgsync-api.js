(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery', 'underscore'], factory);
  } else if (typeof exports !== 'undefined') {
    module.exports =
      factory(null, require('underscore'), require('superagent'));
  } else {
    root.OrgSyncApi = factory(root.jQuery, root._, root.superagent);
  }
})(this, function ($, _, superagent) {
  'use strict';

  var node = typeof window === 'undefined';

  var METHODS = ['get', 'post', 'patch', 'put', 'delete'];

  var PATH_RE = /:(\w+)/g;

  var OrgSyncApi = function (options) { _.extend(this, options); };

  _.extend(OrgSyncApi.prototype, {

    // https://hacks.mozilla.org/2009/07/cross-site-xmlhttprequest-with-cors/
    cors: !node && 'withCredentials' in new XMLHttpRequest(),

    urlRoot: 'https://api.orgsync.com/api/v3',

    resolvePath: function (path, data) {
      return path.replace(PATH_RE, function (__, $1) { return data[$1]; });
    },

    req: function (method, path, data, cb) {
      if (!cb) {
        cb = data;
        data = {};
      }
      if (this.key) data.key = this.key;
      var url = this.urlRoot + this.resolvePath(path, data);
      if (superagent && this.cors) {
        return this.superagentReq(method, url, data, cb);
      }
      return this.jQueryReq(method, url, data, cb);
    },

    superagentReq: function (method, url, data, cb) {
      return superagent[method.toLowerCase()](url)
        .send(data)
        .end(function (er, res) {
          if (er) return cb(er, res);
          if (!res.ok) return cb(new Error(res.body.error), res);
          cb(null, res);
        });
    },

    jQueryReq: function (method, url, data, cb) {
      return $.ajax({
        type: this.cors ? method.toUpperCase() : 'GET',
        url: url,
        dataType: this.cors ? 'json' : 'jsonp',
        contentType: this.cors ? 'application/json' : void 0,
        data: this.cors ? JSON.stringify(data) : data,
        success: function (res) {
          if (res.error) return cb(new Error(res.error));
          cb(null, res);
        },
        error: function (xhr) { cb(new Error(xhr.responseText)); }
      });
    },

    login: function (data, cb) {
      var self = this;
      this.post('/authentication/login', _.extend({
        device_info: 'OrgSync API JavaScript Client'
      }, data), function (er, res) {
        if (er) return cb(er);
        self.key = res.body.key;
        cb(null, res);
      });
    }
  }, _.reduce(METHODS, function (obj, method) {
    obj[method] = function (path, data, cb) {
      return this.req(method, path, data, cb);
    };
    return obj;
  }, {}));

  return OrgSyncApi;
});