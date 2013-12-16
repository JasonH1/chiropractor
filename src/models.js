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
    Revision,
    UserAgent,
    RegExpression;

  // Detecting IE
  if (navigator.appName === 'Microsoft Internet Explorer') {
    UserAgent = navigator.userAgent;
    RegExpression = new RegExp("MSIE ([0-9]{1,}[.0-9]{0,})");
    if (RegExpression.exec(UserAgent) !== null) {
      Revision = parseFloat(RegExpression.$1);
    }
  }

  require('underscore.mixin.deepextend');

  Base = BackboneDeepModel.DeepModel.extend({
    errorHandler: function(response) {
      var errorMessage;
      switch(response.status) {
        case 0:
          errorMessage = "The API was unreachable";
          break;
        case 503:
          errorMessage = "There was an Error Communicating with the API";
          break;
          default:
      }
      $('body').before(TemplateError({ url: this.url ,  errorMessage: errorMessage, response: response }));
    },
    successHandler: function(model, response, options) {
    },
    sync: function (method, model, options) {
      // Setup the authentication handlers for the BaseModel
      //
      if (Revision >= 8 || !Revision) {
        // Only call auth.sync on ie8+ or other browsers because it currently
        // doesnt work in ie7
        auth.sync.call(this, method, model, options);
      }
      switch (method) {
      case 'read':
        //Empty the error message box for other fetches
        $('#chiropractor-error-box').empty();
        if (this.enableErrorHandler) {
          options.error = this.errorHandler;
          // Timeout set to 30 seconds.
          options.timeout = 30000;
        }
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
      return Backbone.Model.prototype.parse.apply(this, arguments);
    },

    fieldId: function (field, prefix) {
      prefix = prefix || 'formfield';
      return [prefix, field, this.cid].join('-');
    },

    set: function (attrs, options) {
      // We need to allow the legacy errors to short circuit the Backbone
      // success handler in the case of a legacy server error.
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