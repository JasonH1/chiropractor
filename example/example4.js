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
    template = require('hbs!./../example/templates/example4'),
    data = require('example/data'),
    field = Views.Field,
    ModelConstructor,
    Model,
    CollectionConstructor,
    Collection,
    fields,
    page;

  fields = [{
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

  ModelConstructor = Models.Base.extend({
    //enableErrorHandler: true,
    url: "http://rodin-admin.cloud.wiser-ci.com/api/v1/topics/topic/company/webeffects"
  });
  //ModelConstructor = Models.Base.extend({
  //  enableErrorHandler: true,
  //  url: "http://rodin-admin.cloud.wiser-ci.com/api/v1/topics?q=again(&*%20AND%20type.id:health-plan"
  //});



  CollectionConstructor = Collections.Base.extend({
    model: Model,
    url: "http://rodin-admin.cloud.wiser-ci.com/api/v1/topics?q=type.id:health-plan" // Remove later when attaching to rodin
  });


  Model = new ModelConstructor({});

  Model.fetch().done(function () {
    page = document.getElementById('page-layout');
    if (window.XDomainRequest) {
      window.setTimeout(function () {
        page.innerHTML = page.innerHTML + template({
          model: Model,
          fields: fields
        });
      }, 10);
    } else {
      page.innerHTML = page.innerHTML + template({
        model: Model,
        fields: fields
      });
    }

  });

});