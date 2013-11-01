/*global define*/
define(function (require) {
    'use strict';

    var Backbone = require('backbone'),
        SubRoute = require('backbone.subroute'),
        Views = require('src/views'),
        Models = require('src/models'),
        Collections = require('src/collections'),
        Routers = require('src/routers'),
        Handlebars = require('handlebars'),
        customfield = require('hbs!./../example/templates/custom_field'),
        template = require('hbs!./../example/templates/example3'),
        data = require('example/data');

    var field = Views.Field;
    field.addTemplate('customfield', customfield);
    var fields = [{
        id: '',
        name: 'disable?',
        fieldtype: 'checkbox'
    }, {
        id: 'name',
        name: 'Name',
        fieldtype: 'customfield'
    }, {
        id: 'description',
        name: 'Description'
    }];
    return {
        html: template({
            collection: data.collection,
            fields: fields
        })
    };
});