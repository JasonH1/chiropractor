/*global define*/
define(function(require) {
    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        Handlebars = require('handlebars'),
        rowTemplates = {},
        row = require('hbs!./templates/row/row');

        rowTemplates = {
            'row': row
        };

       Handlebars.registerHelper('row', function(type, model, fieldName) {
            // template helper in the form of:
            //
            //      {{ field 'text' model 'fieldname' [attrName="attrValue"]*}}
            var current = rowTemplates[type],
                options = arguments[arguments.length - 1],
                opts = options.hash || {},
                id = '',
                value = '';

            if (!current) {
                throw new Error('Unregistered field template: ' + type);
            }
            //console.log(opt);
            return new Handlebars.SafeString(current({ model: model, options: opts }));
        });

    return {
        Templates: rowTemplates,
        addTemplate: function(name,template) {
            rowTemplates[name] = template;
        }
    };
});
