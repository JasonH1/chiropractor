/*global define*/
define(function(require) {
    'use strict';

    var _ = require('underscore'),
        $ = require('jquery'),
        Backbone = require('backbone'),
        Handlebars = require('handlebars'),
        removeHandlerTest = $('<span></span>'),
        removeHandlerExists = false,
        placeholderId;

    removeHandlerTest.on('remove', function() { removeHandlerExists = true; });
    removeHandlerTest.remove();

    if (!removeHandlerExists) {
        $.event.special.remove = {
            remove: function(e) {
                if (e.handler) {
                    var $el = $(this);
                    // Since this event gets fired on calling $el.off('remove')
                    // as well as when the $el.remove() gets called, we need to
                    // allow the Backbone View to unregister this without
                    // firing it.
                    if(!$el.hasClass('removedEventFired')) {
                        $el.addClass('removedEventFired');
                        e.handler.call(this, new $.Event('remove', {target: this}));
                    }
                }
            }
        };
    }

    placeholderId = function(view) {
        return 'chiropractorId' + view.cid;
    };

    return Backbone.View.extend({
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
            return '<' + view.el.tagName +
                ' id="' + placeholderId(view) + '"></div>';
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
                this.$('#' + placeholderId(view)).replaceWith(view.el);
            }, this);
            return this;
        },

        remove: function() {
            this.$el.addClass('removedEventFired');
            this.$el.off('remove', this.remove);
            _(this._childViews).each(function(view) {
                view.remove();
            });
            this._childViews = [];
            Backbone.View.prototype.remove.apply(this, arguments);
        }
    });
});
