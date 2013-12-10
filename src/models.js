/*global define,setTimeout,clearTimeout*/
define(function (require) {
  'use strict';

  var Backbone = require('backbone'),
    _ = require('underscore'),
    JSON = require('json-ie7'),
    $ = require('jquery'),
    auth = require('./models/auth'),
    BackboneDeepModel = require('backbone.deep.model'),
    Validation = require('backbone.validation'),
    TemplateError = require('hbs!./views/templates/error/modelfetch'),
    Base,
    revision,
    userAgent,
    regExp;

  // Detecting IE
  if (navigator.appName === 'Microsoft Internet Explorer') {
    userAgent = navigator.userAgent;
    regExp = new RegExp("MSIE ([0-9]{1,}[.0-9]{0,})");
    if (regExp.exec(userAgent) !== null) {
      revision = parseFloat(RegExp.$1);
    }
  }

  require('underscore.mixin.deepextend');
  require('backbone.crossdomain');

  Base = BackboneDeepModel.DeepModel.extend({
    errorHandler: function(response) {
      var errorMessage;

      switch(response.status) {
        case 0:
          errorMessage = "The API was unreachable";
        case 503:
          errorMessage = "There was an Error Communicating with the API";
          break;
          default:
      }
      $('body').before(TemplateError({ errorMessage: errorMessage, response: response }));
    },
    sync: function (method, model, options) {
      // Setup the authentication handlers for the BaseModel
      //
      if (revision >= 8) {
        // Only call auth.sync on ie8+ because it currently
        // doesnt work in ie7
        auth.sync.call(this, method, model, options);
      }
      console.log(method);
      console.log(options);
      switch (method) {
      case 'read':
        $('chiropractor-error-box')
        options.error = this.errorHandler;
        break;
      default:
      }
      return Backbone.Model.prototype.sync.call(
        this, method, model, options
      );
    },
    parse: function (resp, options) {
      options = options || {};
      // We need to unwrap the old WiserTogether API envelop format.
      if (resp.data && resp.meta) {
        if (parseInt(resp.meta.status, 10) >= 400) {
          options.legacyError = true;
          if (resp.meta.errors && resp.meta.errors.form) {
            this.validationError = resp.meta.errors.form;
            this.trigger(
              'invalid',
              this,
              this.validationError,
              _.extend(options || {}, {
                validationError: this.validationError
              })
            );
          } else {
            this.trigger('error', this, resp.data, options);

            if (options.error) {
              options.error(this, resp.data, options);
            }
          }
          // We do not want an error response to update the model
          // attributes (returning an empty object leaves the model
          // state as it was
          return {};
        }
        return resp.data;
      }
      var data = Backbone.Model.prototype.parse.apply(this, arguments);
      return data;
      //return Backbone.Model.prototype.parse.apply(this, arguments);
    },

    fieldId: function (field, prefix) {
      prefix = prefix || 'formfield';
      return [prefix, field, this.cid].join('-');
    },

    set: function (attrs, options) {
      // We need to allow the legacy errors to short circuit the Backbone
      // success handler in the case of a legacy server error.
      //console.log(JSON.stringify(options));
      if (options && options.legacyError) {
        delete options.legacyError;
        return false;
      }

      return BackboneDeepModel.DeepModel.prototype.set.apply(this, arguments);
    }
  });

  _.extend(Base.prototype, Validation.mixin);

  return {
    Base: Base,
    cleanup: auth.cleanup
  };
});