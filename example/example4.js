/*global define*/
define(function (require) {
    'use strict';

    require('chiropractor-compiled');


    return {
        html: template({
            collection: data.collection,
            fields: fields
        })
    };
});