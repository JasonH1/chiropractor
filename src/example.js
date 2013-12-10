/*global define*/
define(function(require) {
    'use strict';

    var JSON = require('json-ie7'),
        Backbone = require('backbone'),
        SubRoute = require('backbone.subroute'),
        Views = require('src/views'),
        Models = require('src/models'),
        Collections = require('src/collections'),
        Routers = require('src/routers'),
        Handlebars = require('handlebars'),
        template = require('hbs!./../example/templates/example'),
        data = require('example/data'),
        example2 = require('example/example2'),
        example3 = require('example/example3'),
        example4 = require('example/example4');


    require('src/hbs');

    var page = document.getElementById('page-layout');
    page.innerHTML = template({ collection: data.collection, fields:data.fields });
    page.innerHTML = page.innerHTML + example2.html;
    page.innerHTML = page.innerHTML + example3.html;

});
