require.config({
    packages: [
        {name: "chiropractor", location: 'src'}
    ],

    hbs: {
        disableI18n: true,
        disableHelpers: true
    },

    paths: {
        'handlebars':           'bower_components/require-handlebars-plugin/Handlebars',
        'hbs':                  'bower_components/require-handlebars-plugin/hbs',
        'i18nprecompile':       'bower_components/require-handlebars-plugin/hbs/i18nprecompile',
        'text':                 'bower_components/requirejs-plugins/lib/text',
        'json':                 'bower_components/requirejs-plugins/src/json',
        'json2':                'bower_components/require-handlebars-plugin/hbs/json2',
        'json3':                'bower_components/json3/lib/json3',
        'underscore':           'bower_components/underscore/underscore',
        'backbone':             'bower_components/backbone-amd/backbone',
        'jquery':               'bower_components/jquery/jquery',
        'jquery.cookie':        'bower_components/jquery.cookie/jquery.cookie',
        'select2':              'bower_components/select2/select2',
        'backbone.subroute':    'bower_components/backbone.subroute/backbone.subroute',
        'backbone.validation':  'bower_components/backbone-validation/dist/backbone-validation-amd'
    },

    skipModuleInsertion: false,
    wrap: true,

    pragmasOnSave: {
        excludeHbsParser : true,
        excludeHbs: true,
        excludeAfterBuild: true
    },

    shim: {
        'select2': {
            deps: ['jquery'],
            exports: 'jQuery.fn.select2'
        },
        'backbone': {
            deps: ['jquery', 'underscore'],
            exports: 'Backbone'
        },
        'underscore': {
            exports: '_'
        },
        json3: {
            exports: 'JSON'
        },
        'jquery.cookie': {
            deps: ['jquery'],
            exports: 'jQuery.cookie'
        }
    },

    deps: [
        'jquery',
        'hbs'
    ],

    enforceDefine: true
});
