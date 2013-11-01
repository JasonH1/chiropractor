/*global define*/
define(function(require) {
    'use strict';

    var _ = require('underscore'),
        $ = require('jquery'),
        Backbone = require('backbone'),
        Base = require('./base');
    // Where form handles form and validation
    // This view allows flexibility with controls
    return Base.extend({
        initialize: function() {
            Base.prototype.initialize.apply(this, arguments);

        }

    });
});
