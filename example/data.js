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
        customrow = require('hbs!./../example/templates/custom_row');


    var collection = new Collections.Base();
    collection.add(new Models.Base({
        'name': 'Pinched Nerve',
        'description': 'A pinched nerve can be caused of a variety of conditions, for example, carpal tunnel syndrome, herniated disc, sciatica'
    }));
    collection.add(new Models.Base({
        'name': 'Sacroiliac Joint Dysfunction (SI Joint Pain)',
        'description': 'Sacroiliac joint (SI) dysfunction is a general term to reflect pain in the SI joints. Causes of SI joint pain include...'
    }));
    collection.add(new Models.Base({
        'name': 'Pancreatic Cancer',
        'description': 'Pancreatic cancer is a malignant tumor of the pancreas. Pancreatic cancer has been called a "silent" disease because early...'
    }));
    collection.add(new Models.Base({
        'name': 'Endometriosis',
        'description': 'Endometriosis is the growth of cells similar to those that form the inside of the uterus, but in a location outside of the...'
    }));
    collection.add(new Models.Base({
        'name': 'Sciatica',
        'description': 'Sciatica pain, caused by irritation of the sciatic nerve, typically radiates from the low back to behind the thigh to below the..'
    }));
    var fields = [{
        id: '',
        name: 'disable?'
    }, {
        id: 'name',
        name: 'Name'
    }, {
        id: 'description',
        name: 'Description'
    }];
    return {
        collection: collection,
        fields: fields
    };
});