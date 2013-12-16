/*global define*/
define(function(require) {
    'use strict';

    var JSON = require('json-ie7'),
        $ = require('jquery'),
        _ = require('underscore'),
        Handlebars = require('handlebars'),
        RowTemplates = {},
        Row = require('hbs!./templates/row/row'),
        ErrorTemplate = require('hbs!./templates/row/error_messagebox');

        RowTemplates = {
            'row': Row,
            'error': ErrorTemplate
        };

       Handlebars.registerHelper('row', function(type, model, fieldName) {
            // template helper in the form of:
            //
            //      {{ field 'text' model 'fieldname' [attrName="attrValue"]*}}
            var current = RowTemplates[type],
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
        Templates: RowTemplates,
        addTemplate: function(name,template) {
            RowTemplates[name] = template;
        }
    };
});
