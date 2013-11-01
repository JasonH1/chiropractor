(function () {
    'use strict';

    var root = this,
        require = root.require;

    require.config({
        packages: [{
            name: 'chiropractor',
            location: 'src'
        }],

        hbs: {
            disableI18n: true,
            disableHelpers: true
        },

        paths: {
            'handlebars': 'bower_components/require-handlebars-plugin/Handlebars',
            'hbs': 'bower_components/require-handlebars-plugin/hbs',
            'i18nprecompile': 'bower_components/require-handlebars-plugin/hbs/i18nprecompile',
            'text': 'bower_components/requirejs-plugins/lib/text',
            'json': 'bower_components/requirejs-plugins/src/json',
            'json2': 'bower_components/require-handlebars-plugin/hbs/json2',
            'json3': 'bower_components/json3/lib/json3',
            'underscore': 'bower_components/underscore/underscore',
            'backbone': 'bower_components/backbone-amd/backbone',
            'jquery': 'bower_components/jquery/jquery',
            'jquery.cookie': 'bower_components/jquery.cookie/jquery.cookie',
            'backbone.subroute': 'bower_components/backbone.subroute/backbone.subroute',
            'backbone.validation': 'bower_components/backbone-validation/dist/backbone-validation-amd',
            'backbone.deep.model': 'bower_components/backbone-deep-model/src/deep-model',
            'underscore.mixin.deepextend': '/lib/underscore.mixin.deepExtend',
            'chiropractor': 'src/main'
        },

        skipModuleInsertion: false,
        wrap: true,

        pragmasOnSave: {
            excludeHbsParser: true,
            excludeHbs: true,
            excludeAfterBuild: true
        },

        shim: {
            'backbone': {
                deps: ['jquery', 'underscore'],
                exports: 'Backbone'
            },
            'underscore': {
                exports: '_'
            },
            'underscore.mixin.deepextend': {

            },
            'backbone.deep.model': {
                deps: ['backbone', 'underscore'],
                exports: 'Backbone.DeepModel'
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
            'hbs',
            'underscore',
            'backbone.deep.model',
            'underscore.mixin.deepextend'
        ],

        enforceDefine: true
    });

    var count = 0,
        updateModuleProgress = function (context, map, depMaps) {
            count += 1;
            var fetched = Object.keys(context.urlFetched).length,
                el = root.document.getElementById('requirejs-progress'),
                percentLoaded;

            if (el && fetched > 0) {
                percentLoaded = Math.min(100, (count / fetched) * 100);
                el.style.width = percentLoaded + '%';
            }
        };

    var onError = require.onError;
    require.onError = function (requireType, requireModules) {
        var progressEl = root.document.getElementById('requirejs-progress'),
            statusEl = root.document.getElementById('requirejs-status');

        if (progressEl) {
            progressEl.parentNode.className = progressEl.parentNode.className +
                ' progress-danger';
        }

        if (statusEl) {
            statusEl.innerHTML = 'Error loading application...';
        }

        if (onError) {
            onError.apply(this, arguments);
        }
    };


    require.onResourceLoad = function (context, map, depMaps) {
        if (map.parentMap) {
            updateModuleProgress(context, map, depMaps);
        }
    };

    define(function (require) {
        var example = require('src/example');
    });
}).call(this);

