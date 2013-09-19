/*global define*/
define(function(require) {
    'use strict';

    var Base = require('./views/base'),
        Form = require('./views/form'),
        FormField = require('./views/formfield');

    return {
        Base: Base,
        Form: Form,
        FormField: FormField
    };
});
