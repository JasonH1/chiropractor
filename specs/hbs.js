/*global define*/
define(function(require) {
    'use strict';

    var describe = require('mocha').describe;

    return function() {
        describe('view', function() {
            require('specs/hbs/view')();
        });

        describe('ifequal', function() {
            require('specs/hbs/ifequal')();
        });
    };
});
