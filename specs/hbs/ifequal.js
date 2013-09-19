/*global define*/
define(function(require) {
    'use strict';

    var expect = require('expect'),
        describe = require('mocha').describe,
        it = require('mocha').it,
        Handlebars = require('handlebars');

    return function() {
        it('should render the ifequal content if the arguments are exactly ' +
           'equal.', function() {
               var template = Handlebars.compile(
               '{{#ifequal "test" text}}equal{{/ifequal}}'
               );

               this.dom.html(template({text: 'test'}));

               expect(this.dom.html()).to.equal('equal');
           });

        it('should not render the ifequal content if the arguments are not ' +
           'exactly equal.', function() {
               var template = Handlebars.compile(
               '{{#ifequal "test" text}}equal{{/ifequal}}'
               );

               this.dom.html(template({text: 'nottest'}));

               expect(this.dom.html()).to.equal('');
           });

        it('should render the ifequal content if the arguments are not ' +
           'exactly equal and else is provided', function() {
               var template = Handlebars.compile(
               '{{#ifequal "test" text}}equal{{else}}notequal{{/ifequal}}'
               );

               this.dom.html(template({text: 'test'}));

               expect(this.dom.html()).to.equal('equal');
           });

        it('should render the else content if the arguments are not ' +
           'exactly equal and else is provided', function() {
               var template = Handlebars.compile(
               '{{#ifequal "test" text}}equal{{else}}notequal{{/ifequal}}'
               );

               this.dom.html(template({text: 'nottest'}));

               expect(this.dom.html()).to.equal('notequal');
           });
    };
});
