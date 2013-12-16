/*global define*/
define(function (require) {
  'use strict';

  var Backbone = require('backbone'),
    JSON = require('json-ie7'),
    SubRoute = require('backbone.subroute'),
    Views = require('src/views'),
    Models = require('src/models'),
    Collections = require('src/collections'),
    Routers = require('src/routers'),
    Handlebars = require('handlebars'),
    template = require('hbs!./../example/templates/example5'),
    Data = require('example/data'),
    Field = Views.Field,
    ModelConstructor,
    Model,
    CollectionConstructor,
    Collection,
    Fields,
    Page;

  ModelConstructor = Models.Base.extend({
    enableErrorHandler: true,
    url: "http://rodin-admin.cloud.wiser-ci.com/api/v1/topics?q=again(&*%20AND%20type.id:health-plan"
  });

  Model = new ModelConstructor({});
  Model.fetch().done(function () {
    Page = document.getElementById('page-layout');
    Page.innerHTML = Page.innerHTML + template({
      model: Model
    });
  });

});