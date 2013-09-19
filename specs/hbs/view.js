/*global define*/
define(function(require) {
    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        expect = require('expect'),
        afterEach = require('mocha').afterEach,
        beforeEach = require('mocha').beforeEach,
        describe = require('mocha').describe,
        it = require('mocha').it,
        Chiropractor = require('chiropractor'),
        Handlebars = require('handlebars');

    require('specs/hbs/view-templates');

    return function() {
        afterEach(function() {
            this.view.remove();
        });

        describe('loading views', function() {
            it('should load a requirejs view that is the only thing returned ' +
               'from a module', function() {
                   var View = Chiropractor.View.extend({
                       template: 'Test ' +
                           '{{ view "specs/hbs/view-templates" }}'
                   });
                   this.view = new View();
                   expect(this.view.render().$el.html())
                        .to.equal('Test <div>one</div>');
               });

            it('should load a requirejs view that is an item returned from ' +
               'a module that returns an associative array', function() {
                   var View = Chiropractor.View.extend({
                       template: 'Test ' +
                           '{{ view "specs/hbs/view-templates|View" }}'
                   });
                   this.view = new View();
                   expect(this.view.render().$el.html())
                        .to.equal('Test <div>two</div>');
               });

            it('should allow referencing views as variables.', function() {
                var VarView = Chiropractor.View.extend({
                        template: 'hello'
                    }),
                    View = Chiropractor.View.extend({
                        template: 'Test ' +
                               '{{ view VarView }}',
                        context: {
                            VarView: VarView
                        }
                    });

                this.view = new View();
                expect(this.view.render().$el.html())
                        .to.equal('Test <div>hello</div>');
            });

            it('should be placed in the proper location in the parent ' +
               'tempalte', function() {
                var VarView = Chiropractor.View.extend({
                        context: {hello: 'hello!'}
                    }),
                    View = Chiropractor.View.extend({
                        template: '<div>Parent' +
                               '{{#view VarView}}{{ hello }}{{/view}}' +
                               'Parent</div>',
                        context: {
                            VarView: VarView
                        }
                    });

                this.view = new View();
                expect(this.view.render().$el.html())
                        .to.equal('<div>Parent<div>hello!</div>Parent</div>');
            });

            it('should allow providing a template as a block', function() {
                var VarView = Chiropractor.View.extend({
                        context: {hello: 'hello!'}
                    }),
                    View = Chiropractor.View.extend({
                        template: 'Test ' +
                               '{{#view VarView}}{{ hello }}{{ there }}{{/view}}',
                        context: {
                            there: 'there!',
                            VarView: VarView
                        }
                    });

                this.view = new View();
                expect(this.view.render().$el.html())
                        .to.equal('Test <div>hello!</div>');
            });

            it('should allow a template block rendering when that is ' +
                    'the only content being rendered.', function() {
                   var View = Chiropractor.View.extend({
                       template: '{{#view "specs/hbs/view-templates"}}Test{{/view}}'
                   });
                   this.view = new View();
                   expect(this.view.render().$el.html())
                        .to.equal('<div>Test</div>');
               });
        });

        describe('nesting', function() {
            it('should pass the provided context to the view', function() {
                var NestedView = Chiropractor.View.extend({
                    template: '{{ text }}'
                });
                var View = Chiropractor.View.extend({
                    context: {
                        View: NestedView,
                        data: [{text: 'a'}, {text: 'b'}, {text: 'c'}]
                    },
                    template: '{{#each data}}{{ view ../View null .. context=this }}{{/each}}'
                });
                this.view = new View();
                expect(this.view.render().$el.html())
                    .to.equal('<div>a</div><div>b</div><div>c</div>');
            });
        });

        describe('provided context', function() {
            it('should pass the provided context to the view', function() {
                var View = Chiropractor.View.extend({
                    context: {one: 1, two: 2, sub: {three: 3}},
                    template: 'Test {{ one }} - {{ two }} ' +
                        '{{ view "specs/hbs/view-templates|Context" sub }}'
                });
                this.view = new View();
                expect(this.view.render().$el.html())
                    .to.equal('Test 1 - 2 <div>3</div>');
            });

            it('should not leak the parent context to the child', function() {
                var View = Chiropractor.View.extend({
                    context: {one: 1, two: 2, sub: {three: 3}},
                    template: 'Test {{ one }} - {{ two }} ' +
                        '{{ view "specs/hbs/view-templates|Leak" sub }}'
                });
                this.view = new View();
                expect(this.view.render().$el.html())
                    .to.equal('Test 1 - 2 <div> -  - 3</div>');
            });
        });
    };
});
