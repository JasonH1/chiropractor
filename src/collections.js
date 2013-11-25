/*global define*/
define(function(require) {
    'use strict';

    var Backbone = require('backbone'),
        Base;

    require('underscore.mixin.deepextend');

    Base = Backbone.Collection.extend({
    });

    return {
        Base: Base
    };
});
