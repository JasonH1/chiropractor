module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            withoutdeps: {
                options: {
                    banner: '/*! <%= pkg.name %> <%= pkg.version %> (<%= grunt.template.today("yyyy-mm-dd") %>) */\n',
                    report: 'gzip',
                    sourceMapRoot: './',
                    sourceMap: '<%= pkg.name %>.nodeps.min.map',
                    sourceMapUrl: '<%= pkg.name %>.nodeps.min.map'
                },
                files: {
                    '<%= pkg.name %>.nodeps.min.js': ['<%= pkg.name %>.nodeps.js']
                }
            },
            withdeps: {
                options: {
                    banner: '/*! <%= pkg.name %> <%= pkg.version %> (<%= grunt.template.today("yyyy-mm-dd") %>) */\n',
                    report: 'gzip',
                    sourceMapRoot: './',
                    sourceMap: '<%= pkg.name %>.min.map',
                    sourceMapUrl: '<%= pkg.name %>.min.map'
                },
                files: {
                    '<%= pkg.name %>.min.js': ['<%= pkg.name %>.js'],
                }
            }
        },
        requirejs: {
            withdeps: {
                options: {
                    baseUrl: './',
                    out: 'chiropractor.js',
                    name: 'chiropractor',
                    mainConfigFile: 'build.js',
                    optimize: "none",
                    exclude: ['jquery', 'underscore', 'json3', 'handlebars', 'jquery.cookie', 'hbs'],
                    done: function(done, output) {
                        var duplicates = require('rjs-build-analysis').duplicates(output);

                        if (duplicates.length > 0) {
                            grunt.log.subhead('Duplicates found in requirejs build:')
                            grunt.log.warn(duplicates);
                            done(new Error('r.js built duplicate modules, please check the excludes option.'));
                        }

                        done();
                    }
                }
            },
            withoutdeps: {
                options: {
                    baseUrl: './',
                    out: 'chiropractor.nodeps.js',
                    name: 'chiropractor',
                    mainConfigFile: 'build.js',
                    optimize: "none",
                    exclude: ['jquery', 'underscore', 'json3', 'handlebars', 'jquery.cookie', 'hbs', 'backbone', 'backbone.subroute', 'backbone.validation'],
                    done: function(done, output) {
                        var duplicates = require('rjs-build-analysis').duplicates(output);

                        if (duplicates.length > 0) {
                            grunt.log.subhead('Duplicates found in requirejs build:')
                            grunt.log.warn(duplicates);
                            done(new Error('r.js built duplicate modules, please check the excludes option.'));
                        }

                        done();
                    }
                }
            }
        },
        bump: {
            options: {
                files: ['package.json', 'bower.json'],
                updateConfigs: [],
                commit: true,
                commitMessage: 'Release v%VERSION%',
                commitFiles: ['package.json', 'bower.json'], // '-a' for all files
                createTag: true,
                tagName: 'v%VERSION%',
                tagMessage: 'Version %VERSION%',
                push: true,
                pushTo: 'origin',
                gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d' // options to use with '$ git describe'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-bump');

    // Default task(s).
    grunt.registerTask('default', ['requirejs', 'uglify']);
};
