/*global define*/
define(function(require) {
    'use strict';

    var Handlebars = require('handlebars'),
    JSON = require('json-ie7');

    function log(context, options) {
        console.log(JSON.stringify(context));
    }
    Handlebars.registerHelper('log', log);

    return log;
});