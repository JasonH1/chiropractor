/*global define*/
define(function(require) {
    'use strict';

    var Handlebars = require('handlebars');

    function log(context, options) {
        console.log(context);
    }
    Handlebars.registerHelper('log', log);

    return log;
});