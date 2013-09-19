/*global define*/
define(function(require) {
    'use strict';

    var describe = require('mocha').describe;

    return function() {
        describe('Base', function() {
            require('specs/views/base')();
        });

        describe('Form', function() {
            require('specs/views/form')();
        });

        describe('FormField', function() {
            require('specs/views/formfield')();
        });

    };
});
