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
        customrow = require('hbs!./../example/templates/custom_row'),
        template = require('hbs!./../example/templates/example2'),
        data = require('example/data');

    var row = Views.Row;
    row.addTemplate('customrow', customrow);

    return {
        html: template({
            collection: data.collection,
            fields: data.fields
        })
    };
});