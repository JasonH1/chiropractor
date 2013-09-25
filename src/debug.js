/*global define,alert*/
define(function(require, exports, module) {
    var window = require('chiropractor/browser').window,
        console = window.console;

    if (require.specified('console')) {
        require(['console'], function(mod) {
            console = mod;
        });
    }

    function isInspectorOpen() {
        if (console.firebug) {
            return true;
        }
        else if (console.profile) {
            console.profile();
            console.profileEnd();
            if (console.clear) {
                console.clear();
            }

            if (console.profiles && console.profiles.length > 0) {
                return true;
            }
        }

        if ((window.outerHeight - window.innerHeight) > 100) {
            return true;
        }

        return false;
    }

    if (module.config().enabled) {
        window.onerror = function(message, url, linenumber) {
            alert("JavaScript error: " + message + " on line " + linenumber + " for " + url);
        };
    }
});
