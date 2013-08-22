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
        FormField = require('chiropractor/views/formfield');

    return function() {
        beforeEach(function() {
            this.model = new Chiropractor.Model();
        });

        afterEach(function() {
            if (this.view) {
                this.view.remove();
            }
            this.view = undefined;
            this.model = undefined;
        });

        describe('core', function() {
            beforeEach(function() {
                FormField.register('foo', {
                    template: '<input type="foo" name="{{ name }}" ' +
                        'value="{{ value }}" id="{{ id }}" />'
                });
            });

            afterEach(function() {
                FormField.unregister('foo');
            });

            it('should take three required arguments and render the ' +
                'specified form field.', function() {
                   var View = Chiropractor.View.extend({
                           template: '{{ formfield "foo" model "field1" }}'
                       }),
                       $el;

                   this.model.set('field1', 'test');
                   this.view = new View({model: this.model}).render();

                   this.dom.html(this.view.el);
                   $el = this.dom.find('input');

                   expect($el.length).to.equal(1);
                   expect($el.val()).to.equal('test');
                   expect($el.attr('type')).to.equal('foo');
                   expect($el.attr('name')).to.equal('field1');
                   expect($el.attr('id')).to.equal(this.model.fieldId('field1'));
               });

            it('should allow a custom template to be provided in the ' +
               'template block', function() {
                   var View = Chiropractor.View.extend({
                           template: '{{#formfield "foo" model "field1" }}' +
                               '<input type="foo" name="{{ name }}" custom="true" value="{{ value }}" id="{{ id }}" />' +
                               '{{/formfield}}'
                       }),
                       $el;

                   this.model.set('field1', 'test');
                   this.view = new View({model: this.model}).render();

                   this.dom.html(this.view.el);
                   $el = this.dom.find('input');

                   expect($el.length).to.equal(1);
                   expect($el.val()).to.equal('test');
                   expect($el.attr('type')).to.equal('foo');
                   expect($el.attr('name')).to.equal('field1');
                   expect($el.attr('id')).to.equal(this.model.fieldId('field1'));
                   expect($el.attr('custom')).to.equal("true");
               });

            it('should throw an error if the provided field type is not ' +
                'registerd with the system.', function() {
                   var View = Chiropractor.View.extend({
                        template: '{{ formfield "missingfieldtype" model "field1" }}'
                   });

                   this.view = new View({model: this.model});

                   expect(_(function() {
                       this.dom.html(this.view.render().el);
                   }).bind(this)).to.throwError();
               });

            it('should trigger a model change event when the value of the ' +
               'input is changed.', function() {
                   var View = Chiropractor.View.extend({
                        template: '{{ formfield "foo" model "field1" }}'
                   }),
                   spy = this.sandbox.spy();

                   this.view = new View({model: this.model});
                   this.view.listenTo(this.model, 'change:field1', spy);

                   this.dom.html(this.view.render().el);

                   expect(spy.callCount).to.equal(0);
                   expect(this.model.get('field1')).to.be.a('undefined');
                   this.view.$('input').val('test').change();
                   expect(spy.callCount).to.equal(1);
                   expect(this.model.get('field1')).to.equal('test');
            });
        });

        describe('select', function() {
            var opts = [
                {value: '1', label: 'One'},
                {value: 'test', label: 'Two'},
                {value: '3', label: 'Three'}
            ];

            it('should render as a select element', function() {
                var View = Chiropractor.View.extend({
                    template: '{{ formfield "select" model "field1" }}'
                }), $el;

                this.view = new View({model: this.model}).render();

                this.dom.html(this.view.el);

                $el = this.dom.find('select');

                expect($el.length).to.equal(1);
                expect($el.find('option').length).to.equal(0);
                expect($el.val()).to.equal(null);
            });

            it('should allow specifying the blank options to insert an empty ' +
               'blank option at the start of the list.', function() {
                   var View = Chiropractor.View.extend({
                           template: '{{ formfield "select" model "field1" blank="-----" }}'
                       }), $el;

                   this.view = new View({
                        model: this.model,
                        context: {opts: opts}
                   }).render();

                   this.dom.html(this.view.el);

                   $el = this.dom.find('select');

                   expect($el.find('option').length).to.equal(1);
                   expect($el.val()).to.equal('');
               });

            it('should render all of the provided options', function() {
                var View = Chiropractor.View.extend({
                    template: '{{ formfield "select" model "field1" options=opts }}'
                }), $el;

                this.view = new View({
                    model: this.model,
                    context: {opts: opts}
                }).render();

                this.dom.html(this.view.el);

                $el = this.dom.find('select');

                expect($el.find('option').length).to.equal(3);
                expect($el.val()).to.equal('1');
            });

            it('should select the currently selected value.', function() {
                var View = Chiropractor.View.extend({
                    template: '{{ formfield "select" model "field1" options=opts }}'
                }), $el;

                this.model.set('field1', 'test');

                this.view = new View({
                    model: this.model,
                    context: {opts: opts}
                }).render();

                this.dom.html(this.view.el);

                $el = this.dom.find('select');

                expect($el.find('option').length).to.equal(3);
                expect($el.val()).to.equal('test');
            });

            it('should trigger a model change event when the value of the ' +
               'select is changed.', function() {
                   var View = Chiropractor.View.extend({
                        template: '{{ formfield "select" model "field1" options=opts blank="-----" }}'
                   }),
                   spy = this.sandbox.spy();

                   this.view = new View({
                       model: this.model,
                       context: {opts: [{value: '1', label: 'One'}]}
                   });
                   this.view.listenTo(this.model, 'change:field1', spy);

                   this.dom.html(this.view.render().el);

                   expect(spy.callCount).to.equal(0);
                   expect(this.model.get('field1')).to.be.a('undefined');
                   this.view.$('select').val('1').change();
                   expect(spy.callCount).to.equal(1);
                   expect(this.model.get('field1')).to.equal('1');
            });
        });
    };
});
