/*global define,setTimeout,clearTimeout*/
define(function(require) {
    'use strict';

    var Backbone = require('backbone'),
        _ = require('underscore'),
        auth = require('./models/auth'),
        BackboneDeepModel = require('backbone.deep.model'),
        Validation = require('backbone.validation'),
        Base;


    Base = BackboneDeepModel.DeepModel.extend({
        sync: function(method, model, options) {
            // Setup the authentication handlers for the BaseModel
            auth.sync.call(this, method, model, options);

            return BackboneDeepModel.DeepModel.prototype.sync.call(
                this, method, model, options
            );
        },

        parse: function(resp, options) {
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
                    }
                    else {
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

        fieldId: function(field, prefix) {
            prefix = prefix || 'formfield';
            return [prefix, field, this.cid].join('-');
        },

        set: function(attrs, options) {
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
