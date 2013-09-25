/*global define*/
define(function(require) {
    'use strict';

    var _ = require('underscore'),
        $ = require('jquery'),
        expect = require('expect'),
        afterEach = require('mocha').afterEach,
        beforeEach = require('mocha').beforeEach,
        describe = require('mocha').describe,
        it = require('mocha').it,
        Handlebars = require('handlebars'),
        Chiropractor = require('chiropractor'),
        Views = require('chiropractor/views');

    return function() {
        afterEach(function() {
            if (this.view) {
                this.view.remove();
            }
        });

        describe('Form', function() {
            it('should render form errors when the model triggers an invalid ' +
               'event', function() {
                   var model = new Chiropractor.Model();

                   this.view = new (Views.Form.extend({
                       template: '{{ formfield "text" model "field1" }}'
                   }))({model: model}).render();

                   model.parse({
                       data: {},
                       meta: {
                           status: 400,
                           errors: {
                               form: {
                                   '__all__': ['Error 1'],
                                   'field1': ['Error 2'],
                                   'fakeField': ['Error 3']
                               }
                           }
                       }
                   });

                   expect(this.view.$el.html()).to.contain('Error 1');
                   expect(this.view.$el.html()).to.contain('Error 2');
                   expect(this.view.$el.html()).to.not.contain('Error 3');
               });

            it('should clear form errors when the fields change', function() {
                   var model = new (Chiropractor.Model.extend({
                       validation: {
                            field1: {
                                pattern: /^value$/,
                                msg: 'Error 1'
                            },
                            field2: {
                                pattern: /^value$/,
                                msg: 'Error 2'
                            }
                        }
                   }))({field1: 'value', field2: 'value'});

                   this.view = new (Views.Form.extend({
                       template: '{{ formfield "text" model "field1" }}' +
                           '{{ formfield "text" model "field2" }}'
                   }))({model: model}).render();

                   model.validate();

                   expect(this.view.$el.html()).to.not.contain('Error 1');
                   expect(this.view.$el.html()).to.not.contain('Error 2');

                   this.view.$('input[name="field2"]').val('badvalue').change();
                   expect(this.view.$el.html()).to.not.contain('Error 1');
                   expect(this.view.$el.html()).to.contain('Error 2');

                   this.view.$('input[name="field2"]').val('value').change();
                   expect(this.view.$el.html()).to.not.contain('Error 1');
                   expect(this.view.$el.html()).to.not.contain('Error 2');
               });
        });
    };
});
