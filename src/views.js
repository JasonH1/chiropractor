/*global define*/
define(function(require) {
    'use strict';

    var Base = require('./views/base'),
        Form = require('./views/form'),
        Field = require('./views/field'),
        Row = require('./views/row'),
        FormField = require('./views/formfield');

    return {
        Base: Base,
        Form: Form,
        Row: Row,
        Field: Field,
        FormField: FormField
    };
});
