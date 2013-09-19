/*global define*/
define(function(require) {
    'use strict';

    var _ = require('underscore'),
        Backbone = require('backbone'),
        Handlebars = require('handlebars'),
        view;

    view = function() {
        // template helper in the form of:
        //
        //      {{ view "path/to/require/module[|ViewName]" [viewOptions] [context] [viewOption1=val viewOption2=val]}}
        var View, view, options, requirePath,
            viewName, attrs, requireBits, placeholder,
            context = {};

        options = arguments[arguments.length - 1];
        attrs = arguments[1] || {};
        _.defaults(attrs, options.hash || {});

        if (arguments.length === 4) {
            context = arguments[2];
        }
        _.defaults(this, context);

        if (typeof(arguments[0]) === 'string') {
            requireBits = arguments[0].split('|');
            requirePath = requireBits[0];
            viewName = requireBits[1];

            View = require(requirePath);
            if (typeof(viewName) === 'string') {
                View = View[viewName];
            }
        }
        else {
            View = arguments[0];
        }

        if (options.fn) {
            View = View.extend({
                template: options.fn
            });
        }

        view = new View(attrs).render();

        placeholder = this.declaringView._addChild(view);

        // Return a placeholder that the Chiropractor.View can replace with
        // the child view appended above.
        // If this is called as a block hbs helper, then we do not need to
        // use safe string, while as a hbs statement it needs to be declared
        // safe.
        if (options.fn) {
            return placeholder;
        }
        else {
            return new Handlebars.SafeString(placeholder);
        }
    };

    Handlebars.registerHelper('view', view);

    return view;
});
