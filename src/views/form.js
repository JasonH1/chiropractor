/*global define*/
define(function(require) {
    'use strict';

    var _ = require('underscore'),
        JSON = require('json-ie7'),
        $ = require('jquery'),
        Backbone = require('backbone'),
        Base = require('./base');

    return Base.extend({
        initialize: function() {
            Base.prototype.initialize.apply(this, arguments);
            this.listenForErrors(this.model);
            this.listenForErrors(this.collection);
        },

        listenForErrors: function(obj) {
            if (obj) {
                if (obj instanceof Backbone.Model) {
                    this.listenTo(obj, 'invalid', this.renderFormErrors);
                    this.listenTo(obj, 'change', this.clearFormErrors);
                }
                else if (obj instanceof Backbone.Collection) {
                    obj.each(function(model) {
                        this.listenTo(model, 'invalid', this.renderFormErrors);
                        this.listenTo(model, 'change', this.clearFormErrors);
                    }, this);
                }
                else {
                    throw new Error('Invalid object to associate errors with.');
                }
            }
        },

        clearFormErrors: function(model) {
            _(model.changed).each(function(value, field) {
                this.$('#container-' + model.fieldId(field))
                    .find('.help-inline').html('');
            }, this);
        },

        renderFormErrors: function(model, errors) {
            _(errors).each(function(errorMessages, field) {
                var help;
                errorMessages = typeof(errorMessages) === 'string' ?
                    [errorMessages] : errorMessages;

                if (field === '__all__') {
                    help = $('<div class="errors"></div>');
                    this.$el.prepend(help);
                }
                else {
                    help = this.$('#container-' + model.fieldId(field))
                        .find('.help-inline');
                }

                help.html(errorMessages.join(', '));
            }, this);
        }
    });
});
