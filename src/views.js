/*global define*/
define(function(require) {
    'use strict';

    var _ = require('underscore'),
        $ = require('jquery'),
        Backbone = require('backbone'),
        Handlebars = require('handlebars'),
        removeHandlerTest = $('<span></span>'),
        removeHandlerExists = false,
        Base;

    removeHandlerTest.on('remove', function() { removeHandlerExists = true; });
    removeHandlerTest.remove();

    if (!removeHandlerExists) {
        $.event.special.remove = {
            remove: function(e) {
                if (e.handler) {
                    e.handler.call(this, new $.Event('remove', {target: this}));
                }
            }
        };
    }

    Base = Backbone.View.extend({
        initialize: function(options) {
            options = options || {};
            Backbone.View.prototype.initialize.call(this, options);

            _.bindAll(this, 'remove');

            this._childViews = [];
            this._context = options.context || {};

            this.$el.on('remove', this.remove);
        },

        _addChild: function(view) {
            this._childViews.push(view);
        },

        context: function() {
            return {
                model: this.model,
                collection: this.collection
            };
        },

        render: function() {
            var template = typeof(this.template) === 'string' ?
                    Handlebars.compile(this.template) : this.template,
                context = typeof(this.context) === 'function' ?
                    this.context() : this.context;

            context.declaringView = this;
            _.defaults(context, this._context);

            if (template) {
                this.$el.html(template(context));
            }

            _(this._childViews).each(function(view) {
                this.$('#chiropractorId' + view.cid).replaceWith(view.el);
            }, this);
            return this;
        },

        remove: function() {
            this.$el.off('remove', this.remove);
            _(this._childViews).each(function(view) {
                view.remove();
            });
            this._childViews = [];
            Backbone.View.prototype.remove.apply(this, arguments);
        }
    });

    return {
        Base: Base
    };
});
