/*global define*/
define(function(require) {
    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        Handlebars = require('handlebars'),
        fieldTemplates = {},
        checkbox = require('hbs!./templates/fields/checkbox'),
        label = require('hbs!./templates/fields/label');

        fieldTemplates = {
            'default': label,
            'checkbox': checkbox
        };

       Handlebars.registerHelper('field', function(type, model, fieldName) {
            // template helper in the form of:
            //
            //      {{ field 'text' model 'fieldname' [attrName="attrValue"]*}}
            var template = fieldTemplates[type],
                options = arguments[arguments.length - 1],
                opts = options.hash || {},
                field = opts.field,
                id = '',
                value = '';

            if (!template) {
               template = fieldTemplates.default;
            }

            if (model) {
                id = model.fieldId(fieldName);
                //console.log(model);
                value = model.get(field.id);
            }

            _.defaults(opts, {
                id: id,
                label: fieldName,
                name: fieldName,
                options: [],
                blank: false,
                value: value,
                help: '',
                model: model
            });
            return new Handlebars.SafeString(template(opts));
        });

    return {
        Templates: fieldTemplates,
        addTemplate: function(name,template) {
            fieldTemplates[name] = template;
        }
    };
});
