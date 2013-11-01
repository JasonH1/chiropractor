/*global define*/
define(function(require) {
    'use strict';

    var Backbone = require('backbone'),
        SubRoute = require('backbone.subroute'),
        Views = require('./views'),
        Models = require('./models'),
        Collections = require('./collections'),
        Routers = require('./routers');

    require('./debug');
    require('./hbs');

    return {
        Collection: Collections.Base,
        Collections: Collections,
        Events: Backbone.Events,
        history: Backbone.history,
        Model: Models.Base,
        Models: Models,
        Router: Routers.Base,
        SubRoute: SubRoute,
        View: Views.Base,
        Views: Views
    };
});
