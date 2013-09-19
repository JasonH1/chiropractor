/*global define*/
define(function(require) {
    'use strict';

    var _ = require('underscore'),
        Chiropractor = require('chiropractor'),
        view;

    view = Chiropractor.View.extend({
        template: 'one'
    });

    view.View = Chiropractor.View.extend({
        template: 'two'
    });

    view.Context = Chiropractor.View.extend({
        initialize: function(options) {
            this.context = options;
        },
        template: '{{ three }}'
    });

    view.Leak = Chiropractor.View.extend({
        template: '{{ one }} - {{ two }} - {{ three }}',
        initialize: function(options) {
            this.context = options;
        }
    });

    return view;
});
