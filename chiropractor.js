(function () {
//     Backbone.js 1.0.0

//     (c) 2010-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(root, factory) {
  // Set up Backbone appropriately for the environment.
  if (typeof exports !== 'undefined') {
    // Node/CommonJS, no need for jQuery in that case.
    factory(root, exports, require('underscore'));
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define('backbone',['underscore', 'jquery', 'exports'], function(_, $, exports) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backbone.
      root.Backbone = factory(root, exports, _, $);
    });
  } else {
    // Browser globals
    root.Backbone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
  }
}(this, function(root, Backbone, _, $) {

  // Initial Setup
  // -------------

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create local references to array methods we'll want to use later.
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '1.0.0';

  // For Backbone's purposes, jQuery, Zepto, or Ender owns the `$` variable.
  Backbone.$ = $;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeners = this._listeners;
      if (!listeners) return this;
      var deleteListener = !name && !callback;
      if (typeof name === 'object') callback = this;
      if (obj) (listeners = {})[obj._listenerId] = obj;
      for (var id in listeners) {
        listeners[id].off(name, callback, this);
        if (deleteListener) delete this._listeners[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeners = this._listeners || (this._listeners = {});
      var id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
      listeners[id] = obj;
      if (typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var defaults;
    var attrs = attributes || {};
    options || (options = {});
    this.cid = _.uniqueId('c');
    this.attributes = {};
    _.extend(this, _.pick(options, modelOptions));
    if (options.parse) attrs = this.parse(attrs, options) || {};
    if (defaults = _.result(this, 'defaults')) {
      attrs = _.defaults({}, attrs, defaults);
    }
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  };

  // A list of options to be attached directly to the model, if provided.
  var modelOptions = ['url', 'urlRoot', 'collection'];

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The value returned during the last failed validation.
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      unset           = options.unset;
      silent          = options.silent;
      changes         = [];
      changing        = this._changing;
      this._changing  = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      current = this.attributes, prev = this._previousAttributes;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // For each `set` attribute, update or delete the current value.
      for (attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          this.changed[attr] = val;
        } else {
          delete this.changed[attr];
        }
        unset ? delete current[attr] : current[attr] = val;
      }

      // Trigger all relevant attribute changes.
      if (!silent) {
        if (changes.length) this._pending = true;
        for (var i = 0, l = changes.length; i < l; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overridden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        if (!model.set(model.parse(resp, options), options)) return false;
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, method, xhr, attributes = this.attributes;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      // If we're not waiting and attributes exist, save acts as `set(attr).save(null, opts)`.
      if (attrs && (!options || !options.wait) && !this.set(attrs, options)) return false;

      options = _.extend({validate: true}, options);

      // Do not persist invalid models.
      if (!this._validate(attrs, options)) return false;

      // Set temporary attributes if `{wait: true}`.
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        model.attributes = attributes;
        var serverAttrs = model.parse(resp, options);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch') options.attrs = attrs;
      xhr = this.sync(method, this, options);

      // Restore attributes.
      if (attrs && options.wait) this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }
      wrapError(this, options);

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return this.id == null;
    },

    // Check if the model is currently in a valid state.
    isValid: function(options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options || {}, {validationError: error}));
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  _.each(modelMethods, function(method) {
    Model.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analagous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.url) this.url = options.url;
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, merge: false, remove: false};

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set.
    add: function(models, options) {
      return this.set(models, _.defaults(options || {}, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(models, options) {
      models = _.isArray(models) ? models.slice() : [models];
      options || (options = {});
      var i, l, index, model;
      for (i = 0, l = models.length; i < l; i++) {
        model = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byId[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }
      return this;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      options = _.defaults(options || {}, setOptions);
      if (options.parse) models = this.parse(models, options);
      if (!_.isArray(models)) models = models ? [models] : [];
      var i, l, model, attrs, existing, sort;
      var at = options.at;
      var sortable = this.comparator && (at == null) && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;
      var toAdd = [], toRemove = [], modelMap = {};

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (i = 0, l = models.length; i < l; i++) {
        if (!(model = this._prepareModel(models[i], options))) continue;

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        if (existing = this.get(model)) {
          if (options.remove) modelMap[existing.cid] = true;
          if (options.merge) {
            existing.set(model.attributes, options);
            if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
          }

        // This is a new model, push it to the `toAdd` list.
        } else if (options.add) {
          toAdd.push(model);

          // Listen to added models' events, and index models for lookup by
          // `id` and by `cid`.
          model.on('all', this._onModelEvent, this);
          this._byId[model.cid] = model;
          if (model.id != null) this._byId[model.id] = model;
        }
      }

      // Remove nonexistent models if appropriate.
      if (options.remove) {
        for (i = 0, l = this.length; i < l; ++i) {
          if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
        }
        if (toRemove.length) this.remove(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (toAdd.length) {
        if (sortable) sort = true;
        this.length += toAdd.length;
        if (at != null) {
          splice.apply(this.models, [at, 0].concat(toAdd));
        } else {
          push.apply(this.models, toAdd);
        }
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      if (options.silent) return this;

      // Trigger `add` events.
      for (i = 0, l = toAdd.length; i < l; i++) {
        (model = toAdd[i]).trigger('add', model, this, options);
      }

      // Trigger `sort` if the collection was sorted.
      if (sort) this.trigger('sort', this, options);
      return this;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      options.previousModels = this.models;
      this._reset();
      this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: this.length}, options));
      return model;
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: 0}, options));
      return model;
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function(begin, end) {
      return this.models.slice(begin, end);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj.id != null ? obj.id : obj.cid || obj];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      if (_.isEmpty(attrs)) return first ? void 0 : [];
      return this[first ? 'find' : 'filter'](function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      // Run sort based on type of `comparator`.
      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Figure out the smallest index at which a model should be inserted so as
    // to maintain order.
    sortedIndex: function(model, value, context) {
      value || (value = this.comparator);
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _.sortedIndex(this.models, model, iterator, context);
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      if (!(model = this._prepareModel(model, options))) return false;
      if (!options.wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(resp) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models);
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      if (attrs instanceof Model) {
        if (!attrs.collection) attrs.collection = this;
        return attrs;
      }
      options || (options = {});
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model._validate(attrs, options)) {
        this.trigger('invalid', this, attrs, options);
        return false;
      }
      return model;
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'indexOf', 'shuffle', 'lastIndexOf',
    'isEmpty', 'chain'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be prefered to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save'
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return this;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) continue;

        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.on(eventName, method);
        } else {
          this.$el.on(eventName, selector, method);
        }
      }
      return this;
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // Performs the initial configuration of a View with a set of options.
    // Keys with special meaning *(e.g. model, collection, id, className)* are
    // attached directly to the view.  See `viewOptions` for an exhaustive
    // list.
    _configure: function(options) {
      if (this.options) options = _.extend({}, _.result(this, 'options'), options);
      _.extend(this, _.pick(options, viewOptions));
      this.options = options;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
        this.setElement($el, false);
      } else {
        this.setElement(_.result(this, 'el'), false);
      }
    }

  });

  // Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // If we're sending a `PATCH` request, and we're in an old Internet Explorer
    // that still has ActiveX enabled by default, override jQuery to use that
    // for XHR instead. Remove this line when jQuery supports `PATCH` on IE8.
    if (params.type === 'PATCH' && window.ActiveXObject &&
          !(window.external && window.external.msActiveXFilteringEnabled)) {
      params.xhr = function() {
        return new ActiveXObject("Microsoft.XMLHTTP");
      };
    }

    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        callback && callback.apply(router, args);
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        Backbone.history.trigger('route', router, name, args);
      });
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional){
                     return optional ? match : '([^\/]+)';
                   })
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param) {
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = this.location.pathname;
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.substr(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      if (oldIE && this._wantsHashChange) {
        this.iframe = Backbone.$('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Backbone.$(window).on('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).on('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = this.location;
      var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;

      // If we've started off with a route from a `pushState`-enabled browser,
      // but we're currently in a browser that doesn't support it...
      if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        this.location.replace(this.root + this.location.search + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;

      // Or if we've started out with a hash-based route, but we're currently
      // in a browser where it could be `pushState`-based instead...
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        this.history.replaceState({}, document.title, this.root + this.fragment + loc.search);
      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Backbone.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
      return matched;
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: options};
      fragment = this.getFragment(fragment || '');
      if (this.fragment === fragment) return;
      this.fragment = fragment;
      var url = this.root + fragment;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function (model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

  return Backbone;
}));

// backbone-subroute.js v0.4.1
//
// Copyright (C) 2012 Dave Cadwallader, Model N, Inc.  
// Distributed under the MIT License
//
// Documentation and full license available at:
// https://github.com/ModelN/backbone.subroute

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // Register as an AMD module if available...
        define('backbone.subroute',['underscore', 'backbone'], factory);
    } else {
        // Browser globals for the unenlightened...
        factory(_, Backbone);
    }
}(function(_, Backbone){

    Backbone.SubRoute = Backbone.Router.extend( {
        constructor:function ( prefix, options ) {

            // each subroute instance should have its own routes hash
            this.routes = _.clone(this.routes);

            // Prefix is optional, set to empty string if not passed
            this.prefix = prefix = prefix || "";

            // SubRoute instances may be instantiated using a prefix with or without a trailing slash.
            // If the prefix does *not* have a trailing slash, we need to insert a slash as a separator
            // between the prefix and the sub-route path for each route that we register with Backbone.        
            this.separator = ( prefix.slice( -1 ) === "/" ) ? "" : "/";

            // if you want to match "books" and "books/" without creating separate routes, set this
            // option to "true" and the sub-router will automatically create those routes for you.
            this.createTrailingSlashRoutes = options && options.createTrailingSlashRoutes;

            // Required to have Backbone set up routes
            Backbone.Router.prototype.constructor.call( this, options );

            // grab the full URL
            var hash;
            if (Backbone.history.fragment) {
                hash = Backbone.history.getFragment();
            } else {
                hash = Backbone.history.getHash();
            }

            // Trigger the subroute immediately.  this supports the case where 
            // a user directly navigates to a URL with a subroute on the first page load.
            // Check every element, if one matches, break. Prevent multiple matches
            _.every(this.routes, function(key, route){
                // Use the Backbone parser to turn route into regex for matching
                if(hash.match(Backbone.Router.prototype._routeToRegExp(route))) {
                    Backbone.history.loadUrl(hash);
                    return false;
                }
                return true;
            }, this);

            if (this.postInitialize) {
                this.postInitialize(options);
            }
        },
        navigate:function ( route, options ) {
            if ( route.substr( 0, 1 ) != '/' &&
                    route.indexOf( this.prefix.substr( 0, this.prefix.length - 1 ) ) !== 0 ) {

                route = this.prefix +
                        ( route ? this.separator : "") +
                        route;
            }
            Backbone.Router.prototype.navigate.call( this, route, options );
        },
        route : function (route, name, callback) {
            // strip off any leading slashes in the sub-route path, 
            // since we already handle inserting them when needed.
            if (route.substr(0) === "/") {
                route = route.substr(1, route.length);
            }

            var _route = this.prefix;
            if (route && route.length > 0)
                _route += (this.separator + route);

            if (this.createTrailingSlashRoutes) {
                this.routes[_route + '/'] = name;
                Backbone.Router.prototype.route.call(this, _route + '/', name, callback);
            }

            // remove the un-prefixed route from our routes hash
            delete this.routes[route];

            // add the prefixed-route.  note that this routes hash is just provided 
            // for informational and debugging purposes and is not used by the actual routing code.
            this.routes[_route] = name;

            // delegate the creation of the properly-prefixed route to Backbone
            return Backbone.Router.prototype.route.call(this, _route, name, callback);
        }
    } );
    return Backbone.SubRoute;
}));

/*! JSON v3.2.6 | http://bestiejs.github.io/json3 | Copyright 2012-2013, Kit Cambridge | http://kit.mit-license.org */
;(function (window) {
  // Convenience aliases.
  var getClass = {}.toString, isProperty, forEach, undef;

  // Detect the `define` function exposed by asynchronous module loaders. The
  // strict `define` check is necessary for compatibility with `r.js`.
  var isLoader = typeof define === "function" && define.amd;

  // Detect native implementations.
  var nativeJSON = typeof JSON == "object" && JSON;

  // Set up the JSON 3 namespace, preferring the CommonJS `exports` object if
  // available.
  var JSON3 = typeof exports == "object" && exports && !exports.nodeType && exports;

  if (JSON3 && nativeJSON) {
    // Explicitly delegate to the native `stringify` and `parse`
    // implementations in CommonJS environments.
    JSON3.stringify = nativeJSON.stringify;
    JSON3.parse = nativeJSON.parse;
  } else {
    // Export for web browsers, JavaScript engines, and asynchronous module
    // loaders, using the global `JSON` object if available.
    JSON3 = window.JSON = nativeJSON || {};
  }

  // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
  var isExtended = new Date(-3509827334573292);
  try {
    // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
    // results for certain dates in Opera >= 10.53.
    isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() === 1 &&
      // Safari < 2.0.2 stores the internal millisecond time value correctly,
      // but clips the values returned by the date methods to the range of
      // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
      isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
  } catch (exception) {}

  // Internal: Determines whether the native `JSON.stringify` and `parse`
  // implementations are spec-compliant. Based on work by Ken Snyder.
  function has(name) {
    if (has[name] !== undef) {
      // Return cached feature test result.
      return has[name];
    }

    var isSupported;
    if (name == "bug-string-char-index") {
      // IE <= 7 doesn't support accessing string characters using square
      // bracket notation. IE 8 only supports this for primitives.
      isSupported = "a"[0] != "a";
    } else if (name == "json") {
      // Indicates whether both `JSON.stringify` and `JSON.parse` are
      // supported.
      isSupported = has("json-stringify") && has("json-parse");
    } else {
      var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
      // Test `JSON.stringify`.
      if (name == "json-stringify") {
        var stringify = JSON3.stringify, stringifySupported = typeof stringify == "function" && isExtended;
        if (stringifySupported) {
          // A test function object with a custom `toJSON` method.
          (value = function () {
            return 1;
          }).toJSON = value;
          try {
            stringifySupported =
              // Firefox 3.1b1 and b2 serialize string, number, and boolean
              // primitives as object literals.
              stringify(0) === "0" &&
              // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
              // literals.
              stringify(new Number()) === "0" &&
              stringify(new String()) == '""' &&
              // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
              // does not define a canonical JSON representation (this applies to
              // objects with `toJSON` properties as well, *unless* they are nested
              // within an object or array).
              stringify(getClass) === undef &&
              // IE 8 serializes `undefined` as `"undefined"`. Safari <= 5.1.7 and
              // FF 3.1b3 pass this test.
              stringify(undef) === undef &&
              // Safari <= 5.1.7 and FF 3.1b3 throw `Error`s and `TypeError`s,
              // respectively, if the value is omitted entirely.
              stringify() === undef &&
              // FF 3.1b1, 2 throw an error if the given value is not a number,
              // string, array, object, Boolean, or `null` literal. This applies to
              // objects with custom `toJSON` methods as well, unless they are nested
              // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
              // methods entirely.
              stringify(value) === "1" &&
              stringify([value]) == "[1]" &&
              // Prototype <= 1.6.1 serializes `[undefined]` as `"[]"` instead of
              // `"[null]"`.
              stringify([undef]) == "[null]" &&
              // YUI 3.0.0b1 fails to serialize `null` literals.
              stringify(null) == "null" &&
              // FF 3.1b1, 2 halts serialization if an array contains a function:
              // `[1, true, getClass, 1]` serializes as "[1,true,],". FF 3.1b3
              // elides non-JSON values from objects and arrays, unless they
              // define custom `toJSON` methods.
              stringify([undef, getClass, null]) == "[null,null,null]" &&
              // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
              // where character escape codes are expected (e.g., `\b` => `\u0008`).
              stringify({ "a": [value, true, false, null, "\x00\b\n\f\r\t"] }) == serialized &&
              // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
              stringify(null, value) === "1" &&
              stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
              // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
              // serialize extended years.
              stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
              // The milliseconds are optional in ES 5, but required in 5.1.
              stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
              // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
              // four-digit years instead of six-digit years. Credits: @Yaffle.
              stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
              // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
              // values less than 1000. Credits: @Yaffle.
              stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
          } catch (exception) {
            stringifySupported = false;
          }
        }
        isSupported = stringifySupported;
      }
      // Test `JSON.parse`.
      if (name == "json-parse") {
        var parse = JSON3.parse;
        if (typeof parse == "function") {
          try {
            // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
            // Conforming implementations should also coerce the initial argument to
            // a string prior to parsing.
            if (parse("0") === 0 && !parse(false)) {
              // Simple parsing test.
              value = parse(serialized);
              var parseSupported = value["a"].length == 5 && value["a"][0] === 1;
              if (parseSupported) {
                try {
                  // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
                  parseSupported = !parse('"\t"');
                } catch (exception) {}
                if (parseSupported) {
                  try {
                    // FF 4.0 and 4.0.1 allow leading `+` signs and leading
                    // decimal points. FF 4.0, 4.0.1, and IE 9-10 also allow
                    // certain octal literals.
                    parseSupported = parse("01") !== 1;
                  } catch (exception) {}
                }
                if (parseSupported) {
                  try {
                    // FF 4.0, 4.0.1, and Rhino 1.7R3-R4 allow trailing decimal
                    // points. These environments, along with FF 3.1b1 and 2,
                    // also allow trailing commas in JSON objects and arrays.
                    parseSupported = parse("1.") !== 1;
                  } catch (exception) {}
                }
              }
            }
          } catch (exception) {
            parseSupported = false;
          }
        }
        isSupported = parseSupported;
      }
    }
    return has[name] = !!isSupported;
  }

  if (!has("json")) {
    // Common `[[Class]]` name aliases.
    var functionClass = "[object Function]";
    var dateClass = "[object Date]";
    var numberClass = "[object Number]";
    var stringClass = "[object String]";
    var arrayClass = "[object Array]";
    var booleanClass = "[object Boolean]";

    // Detect incomplete support for accessing string characters by index.
    var charIndexBuggy = has("bug-string-char-index");

    // Define additional utility methods if the `Date` methods are buggy.
    if (!isExtended) {
      var floor = Math.floor;
      // A mapping between the months of the year and the number of days between
      // January 1st and the first of the respective month.
      var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
      // Internal: Calculates the number of days between the Unix epoch and the
      // first day of the given month.
      var getDay = function (year, month) {
        return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
      };
    }

    // Internal: Determines if a property is a direct property of the given
    // object. Delegates to the native `Object#hasOwnProperty` method.
    if (!(isProperty = {}.hasOwnProperty)) {
      isProperty = function (property) {
        var members = {}, constructor;
        if ((members.__proto__ = null, members.__proto__ = {
          // The *proto* property cannot be set multiple times in recent
          // versions of Firefox and SeaMonkey.
          "toString": 1
        }, members).toString != getClass) {
          // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
          // supports the mutable *proto* property.
          isProperty = function (property) {
            // Capture and break the object's prototype chain (see section 8.6.2
            // of the ES 5.1 spec). The parenthesized expression prevents an
            // unsafe transformation by the Closure Compiler.
            var original = this.__proto__, result = property in (this.__proto__ = null, this);
            // Restore the original prototype chain.
            this.__proto__ = original;
            return result;
          };
        } else {
          // Capture a reference to the top-level `Object` constructor.
          constructor = members.constructor;
          // Use the `constructor` property to simulate `Object#hasOwnProperty` in
          // other environments.
          isProperty = function (property) {
            var parent = (this.constructor || constructor).prototype;
            return property in this && !(property in parent && this[property] === parent[property]);
          };
        }
        members = null;
        return isProperty.call(this, property);
      };
    }

    // Internal: A set of primitive types used by `isHostType`.
    var PrimitiveTypes = {
      'boolean': 1,
      'number': 1,
      'string': 1,
      'undefined': 1
    };

    // Internal: Determines if the given object `property` value is a
    // non-primitive.
    var isHostType = function (object, property) {
      var type = typeof object[property];
      return type == 'object' ? !!object[property] : !PrimitiveTypes[type];
    };

    // Internal: Normalizes the `for...in` iteration algorithm across
    // environments. Each enumerated key is yielded to a `callback` function.
    forEach = function (object, callback) {
      var size = 0, Properties, members, property;

      // Tests for bugs in the current environment's `for...in` algorithm. The
      // `valueOf` property inherits the non-enumerable flag from
      // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
      (Properties = function () {
        this.valueOf = 0;
      }).prototype.valueOf = 0;

      // Iterate over a new instance of the `Properties` class.
      members = new Properties();
      for (property in members) {
        // Ignore all properties inherited from `Object.prototype`.
        if (isProperty.call(members, property)) {
          size++;
        }
      }
      Properties = members = null;

      // Normalize the iteration algorithm.
      if (!size) {
        // A list of non-enumerable properties inherited from `Object.prototype`.
        members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
        // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
        // properties.
        forEach = function (object, callback) {
          var isFunction = getClass.call(object) == functionClass, property, length;
          var hasProperty = !isFunction && typeof object.constructor != 'function' && isHostType(object, 'hasOwnProperty') ? object.hasOwnProperty : isProperty;
          for (property in object) {
            // Gecko <= 1.0 enumerates the `prototype` property of functions under
            // certain conditions; IE does not.
            if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
              callback(property);
            }
          }
          // Manually invoke the callback for each non-enumerable property.
          for (length = members.length; property = members[--length]; hasProperty.call(object, property) && callback(property));
        };
      } else if (size == 2) {
        // Safari <= 2.0.4 enumerates shadowed properties twice.
        forEach = function (object, callback) {
          // Create a set of iterated properties.
          var members = {}, isFunction = getClass.call(object) == functionClass, property;
          for (property in object) {
            // Store each property name to prevent double enumeration. The
            // `prototype` property of functions is not enumerated due to cross-
            // environment inconsistencies.
            if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
              callback(property);
            }
          }
        };
      } else {
        // No bugs detected; use the standard `for...in` algorithm.
        forEach = function (object, callback) {
          var isFunction = getClass.call(object) == functionClass, property, isConstructor;
          for (property in object) {
            if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
              callback(property);
            }
          }
          // Manually invoke the callback for the `constructor` property due to
          // cross-environment inconsistencies.
          if (isConstructor || isProperty.call(object, (property = "constructor"))) {
            callback(property);
          }
        };
      }
      return forEach(object, callback);
    };

    // Public: Serializes a JavaScript `value` as a JSON string. The optional
    // `filter` argument may specify either a function that alters how object and
    // array members are serialized, or an array of strings and numbers that
    // indicates which properties should be serialized. The optional `width`
    // argument may be either a string or number that specifies the indentation
    // level of the output.
    if (!has("json-stringify")) {
      // Internal: A map of control characters and their escaped equivalents.
      var Escapes = {
        92: "\\\\",
        34: '\\"',
        8: "\\b",
        12: "\\f",
        10: "\\n",
        13: "\\r",
        9: "\\t"
      };

      // Internal: Converts `value` into a zero-padded string such that its
      // length is at least equal to `width`. The `width` must be <= 6.
      var leadingZeroes = "000000";
      var toPaddedString = function (width, value) {
        // The `|| 0` expression is necessary to work around a bug in
        // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
        return (leadingZeroes + (value || 0)).slice(-width);
      };

      // Internal: Double-quotes a string `value`, replacing all ASCII control
      // characters (characters with code unit values between 0 and 31) with
      // their escaped equivalents. This is an implementation of the
      // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
      var unicodePrefix = "\\u00";
      var quote = function (value) {
        var result = '"', index = 0, length = value.length, isLarge = length > 10 && charIndexBuggy, symbols;
        if (isLarge) {
          symbols = value.split("");
        }
        for (; index < length; index++) {
          var charCode = value.charCodeAt(index);
          // If the character is a control character, append its Unicode or
          // shorthand escape sequence; otherwise, append the character as-is.
          switch (charCode) {
            case 8: case 9: case 10: case 12: case 13: case 34: case 92:
              result += Escapes[charCode];
              break;
            default:
              if (charCode < 32) {
                result += unicodePrefix + toPaddedString(2, charCode.toString(16));
                break;
              }
              result += isLarge ? symbols[index] : charIndexBuggy ? value.charAt(index) : value[index];
          }
        }
        return result + '"';
      };

      // Internal: Recursively serializes an object. Implements the
      // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
      var serialize = function (property, object, callback, properties, whitespace, indentation, stack) {
        var value, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, result;
        try {
          // Necessary for host object support.
          value = object[property];
        } catch (exception) {}
        if (typeof value == "object" && value) {
          className = getClass.call(value);
          if (className == dateClass && !isProperty.call(value, "toJSON")) {
            if (value > -1 / 0 && value < 1 / 0) {
              // Dates are serialized according to the `Date#toJSON` method
              // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
              // for the ISO 8601 date time string format.
              if (getDay) {
                // Manually compute the year, month, date, hours, minutes,
                // seconds, and milliseconds if the `getUTC*` methods are
                // buggy. Adapted from @Yaffle's `date-shim` project.
                date = floor(value / 864e5);
                for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                date = 1 + date - getDay(year, month);
                // The `time` value specifies the time within the day (see ES
                // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
                // to compute `A modulo B`, as the `%` operator does not
                // correspond to the `modulo` operation for negative numbers.
                time = (value % 864e5 + 864e5) % 864e5;
                // The hours, minutes, seconds, and milliseconds are obtained by
                // decomposing the time within the day. See section 15.9.1.10.
                hours = floor(time / 36e5) % 24;
                minutes = floor(time / 6e4) % 60;
                seconds = floor(time / 1e3) % 60;
                milliseconds = time % 1e3;
              } else {
                year = value.getUTCFullYear();
                month = value.getUTCMonth();
                date = value.getUTCDate();
                hours = value.getUTCHours();
                minutes = value.getUTCMinutes();
                seconds = value.getUTCSeconds();
                milliseconds = value.getUTCMilliseconds();
              }
              // Serialize extended years correctly.
              value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
                "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
                // Months, dates, hours, minutes, and seconds should have two
                // digits; milliseconds should have three.
                "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
                // Milliseconds are optional in ES 5.0, but required in 5.1.
                "." + toPaddedString(3, milliseconds) + "Z";
            } else {
              value = null;
            }
          } else if (typeof value.toJSON == "function" && ((className != numberClass && className != stringClass && className != arrayClass) || isProperty.call(value, "toJSON"))) {
            // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
            // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
            // ignores all `toJSON` methods on these objects unless they are
            // defined directly on an instance.
            value = value.toJSON(property);
          }
        }
        if (callback) {
          // If a replacement function was provided, call it to obtain the value
          // for serialization.
          value = callback.call(object, property, value);
        }
        if (value === null) {
          return "null";
        }
        className = getClass.call(value);
        if (className == booleanClass) {
          // Booleans are represented literally.
          return "" + value;
        } else if (className == numberClass) {
          // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
          // `"null"`.
          return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
        } else if (className == stringClass) {
          // Strings are double-quoted and escaped.
          return quote("" + value);
        }
        // Recursively serialize objects and arrays.
        if (typeof value == "object") {
          // Check for cyclic structures. This is a linear search; performance
          // is inversely proportional to the number of unique nested objects.
          for (length = stack.length; length--;) {
            if (stack[length] === value) {
              // Cyclic structures cannot be serialized by `JSON.stringify`.
              throw TypeError();
            }
          }
          // Add the object to the stack of traversed objects.
          stack.push(value);
          results = [];
          // Save the current indentation level and indent one additional level.
          prefix = indentation;
          indentation += whitespace;
          if (className == arrayClass) {
            // Recursively serialize array elements.
            for (index = 0, length = value.length; index < length; index++) {
              element = serialize(index, value, callback, properties, whitespace, indentation, stack);
              results.push(element === undef ? "null" : element);
            }
            result = results.length ? (whitespace ? "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" : ("[" + results.join(",") + "]")) : "[]";
          } else {
            // Recursively serialize object members. Members are selected from
            // either a user-specified list of property names, or the object
            // itself.
            forEach(properties || value, function (property) {
              var element = serialize(property, value, callback, properties, whitespace, indentation, stack);
              if (element !== undef) {
                // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
                // is not the empty string, let `member` {quote(property) + ":"}
                // be the concatenation of `member` and the `space` character."
                // The "`space` character" refers to the literal space
                // character, not the `space` {width} argument provided to
                // `JSON.stringify`.
                results.push(quote(property) + ":" + (whitespace ? " " : "") + element);
              }
            });
            result = results.length ? (whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : ("{" + results.join(",") + "}")) : "{}";
          }
          // Remove the object from the traversed object stack.
          stack.pop();
          return result;
        }
      };

      // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.
      JSON3.stringify = function (source, filter, width) {
        var whitespace, callback, properties, className;
        if (typeof filter == "function" || typeof filter == "object" && filter) {
          if ((className = getClass.call(filter)) == functionClass) {
            callback = filter;
          } else if (className == arrayClass) {
            // Convert the property names array into a makeshift set.
            properties = {};
            for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((className = getClass.call(value)), className == stringClass || className == numberClass) && (properties[value] = 1));
          }
        }
        if (width) {
          if ((className = getClass.call(width)) == numberClass) {
            // Convert the `width` to an integer and create a string containing
            // `width` number of space characters.
            if ((width -= width % 1) > 0) {
              for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
            }
          } else if (className == stringClass) {
            whitespace = width.length <= 10 ? width : width.slice(0, 10);
          }
        }
        // Opera <= 7.54u2 discards the values associated with empty string keys
        // (`""`) only if they are used directly within an object member list
        // (e.g., `!("" in { "": 1})`).
        return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", []);
      };
    }

    // Public: Parses a JSON source string.
    if (!has("json-parse")) {
      var fromCharCode = String.fromCharCode;

      // Internal: A map of escaped control characters and their unescaped
      // equivalents.
      var Unescapes = {
        92: "\\",
        34: '"',
        47: "/",
        98: "\b",
        116: "\t",
        110: "\n",
        102: "\f",
        114: "\r"
      };

      // Internal: Stores the parser state.
      var Index, Source;

      // Internal: Resets the parser state and throws a `SyntaxError`.
      var abort = function() {
        Index = Source = null;
        throw SyntaxError();
      };

      // Internal: Returns the next token, or `"$"` if the parser has reached
      // the end of the source string. A token may be a string, number, `null`
      // literal, or Boolean literal.
      var lex = function () {
        var source = Source, length = source.length, value, begin, position, isSigned, charCode;
        while (Index < length) {
          charCode = source.charCodeAt(Index);
          switch (charCode) {
            case 9: case 10: case 13: case 32:
              // Skip whitespace tokens, including tabs, carriage returns, line
              // feeds, and space characters.
              Index++;
              break;
            case 123: case 125: case 91: case 93: case 58: case 44:
              // Parse a punctuator token (`{`, `}`, `[`, `]`, `:`, or `,`) at
              // the current position.
              value = charIndexBuggy ? source.charAt(Index) : source[Index];
              Index++;
              return value;
            case 34:
              // `"` delimits a JSON string; advance to the next character and
              // begin parsing the string. String tokens are prefixed with the
              // sentinel `@` character to distinguish them from punctuators and
              // end-of-string tokens.
              for (value = "@", Index++; Index < length;) {
                charCode = source.charCodeAt(Index);
                if (charCode < 32) {
                  // Unescaped ASCII control characters (those with a code unit
                  // less than the space character) are not permitted.
                  abort();
                } else if (charCode == 92) {
                  // A reverse solidus (`\`) marks the beginning of an escaped
                  // control character (including `"`, `\`, and `/`) or Unicode
                  // escape sequence.
                  charCode = source.charCodeAt(++Index);
                  switch (charCode) {
                    case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
                      // Revive escaped control characters.
                      value += Unescapes[charCode];
                      Index++;
                      break;
                    case 117:
                      // `\u` marks the beginning of a Unicode escape sequence.
                      // Advance to the first character and validate the
                      // four-digit code point.
                      begin = ++Index;
                      for (position = Index + 4; Index < position; Index++) {
                        charCode = source.charCodeAt(Index);
                        // A valid sequence comprises four hexdigits (case-
                        // insensitive) that form a single hexadecimal value.
                        if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
                          // Invalid Unicode escape sequence.
                          abort();
                        }
                      }
                      // Revive the escaped character.
                      value += fromCharCode("0x" + source.slice(begin, Index));
                      break;
                    default:
                      // Invalid escape sequence.
                      abort();
                  }
                } else {
                  if (charCode == 34) {
                    // An unescaped double-quote character marks the end of the
                    // string.
                    break;
                  }
                  charCode = source.charCodeAt(Index);
                  begin = Index;
                  // Optimize for the common case where a string is valid.
                  while (charCode >= 32 && charCode != 92 && charCode != 34) {
                    charCode = source.charCodeAt(++Index);
                  }
                  // Append the string as-is.
                  value += source.slice(begin, Index);
                }
              }
              if (source.charCodeAt(Index) == 34) {
                // Advance to the next character and return the revived string.
                Index++;
                return value;
              }
              // Unterminated string.
              abort();
            default:
              // Parse numbers and literals.
              begin = Index;
              // Advance past the negative sign, if one is specified.
              if (charCode == 45) {
                isSigned = true;
                charCode = source.charCodeAt(++Index);
              }
              // Parse an integer or floating-point value.
              if (charCode >= 48 && charCode <= 57) {
                // Leading zeroes are interpreted as octal literals.
                if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
                  // Illegal octal literal.
                  abort();
                }
                isSigned = false;
                // Parse the integer component.
                for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
                // Floats cannot contain a leading decimal point; however, this
                // case is already accounted for by the parser.
                if (source.charCodeAt(Index) == 46) {
                  position = ++Index;
                  // Parse the decimal component.
                  for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                  if (position == Index) {
                    // Illegal trailing decimal.
                    abort();
                  }
                  Index = position;
                }
                // Parse exponents. The `e` denoting the exponent is
                // case-insensitive.
                charCode = source.charCodeAt(Index);
                if (charCode == 101 || charCode == 69) {
                  charCode = source.charCodeAt(++Index);
                  // Skip past the sign following the exponent, if one is
                  // specified.
                  if (charCode == 43 || charCode == 45) {
                    Index++;
                  }
                  // Parse the exponential component.
                  for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                  if (position == Index) {
                    // Illegal empty exponent.
                    abort();
                  }
                  Index = position;
                }
                // Coerce the parsed value to a JavaScript number.
                return +source.slice(begin, Index);
              }
              // A negative sign may only precede numbers.
              if (isSigned) {
                abort();
              }
              // `true`, `false`, and `null` literals.
              if (source.slice(Index, Index + 4) == "true") {
                Index += 4;
                return true;
              } else if (source.slice(Index, Index + 5) == "false") {
                Index += 5;
                return false;
              } else if (source.slice(Index, Index + 4) == "null") {
                Index += 4;
                return null;
              }
              // Unrecognized token.
              abort();
          }
        }
        // Return the sentinel `$` character if the parser has reached the end
        // of the source string.
        return "$";
      };

      // Internal: Parses a JSON `value` token.
      var get = function (value) {
        var results, hasMembers;
        if (value == "$") {
          // Unexpected end of input.
          abort();
        }
        if (typeof value == "string") {
          if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
            // Remove the sentinel `@` character.
            return value.slice(1);
          }
          // Parse object and array literals.
          if (value == "[") {
            // Parses a JSON array, returning a new JavaScript array.
            results = [];
            for (;; hasMembers || (hasMembers = true)) {
              value = lex();
              // A closing square bracket marks the end of the array literal.
              if (value == "]") {
                break;
              }
              // If the array literal contains elements, the current token
              // should be a comma separating the previous element from the
              // next.
              if (hasMembers) {
                if (value == ",") {
                  value = lex();
                  if (value == "]") {
                    // Unexpected trailing `,` in array literal.
                    abort();
                  }
                } else {
                  // A `,` must separate each array element.
                  abort();
                }
              }
              // Elisions and leading commas are not permitted.
              if (value == ",") {
                abort();
              }
              results.push(get(value));
            }
            return results;
          } else if (value == "{") {
            // Parses a JSON object, returning a new JavaScript object.
            results = {};
            for (;; hasMembers || (hasMembers = true)) {
              value = lex();
              // A closing curly brace marks the end of the object literal.
              if (value == "}") {
                break;
              }
              // If the object literal contains members, the current token
              // should be a comma separator.
              if (hasMembers) {
                if (value == ",") {
                  value = lex();
                  if (value == "}") {
                    // Unexpected trailing `,` in object literal.
                    abort();
                  }
                } else {
                  // A `,` must separate each object member.
                  abort();
                }
              }
              // Leading commas are not permitted, object property names must be
              // double-quoted strings, and a `:` must separate each property
              // name and value.
              if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex() != ":") {
                abort();
              }
              results[value.slice(1)] = get(lex());
            }
            return results;
          }
          // Unexpected token encountered.
          abort();
        }
        return value;
      };

      // Internal: Updates a traversed object member.
      var update = function(source, property, callback) {
        var element = walk(source, property, callback);
        if (element === undef) {
          delete source[property];
        } else {
          source[property] = element;
        }
      };

      // Internal: Recursively traverses a parsed JSON object, invoking the
      // `callback` function for each value. This is an implementation of the
      // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
      var walk = function (source, property, callback) {
        var value = source[property], length;
        if (typeof value == "object" && value) {
          // `forEach` can't be used to traverse an array in Opera <= 8.54
          // because its `Object#hasOwnProperty` implementation returns `false`
          // for array indices (e.g., `![1, 2, 3].hasOwnProperty("0")`).
          if (getClass.call(value) == arrayClass) {
            for (length = value.length; length--;) {
              update(value, length, callback);
            }
          } else {
            forEach(value, function (property) {
              update(value, property, callback);
            });
          }
        }
        return callback.call(source, property, value);
      };

      // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
      JSON3.parse = function (source, callback) {
        var result, value;
        Index = 0;
        Source = "" + source;
        result = get(lex());
        // If a JSON string contains multiple tokens, it is invalid.
        if (lex() != "$") {
          abort();
        }
        // Reset the parser state.
        Index = Source = null;
        return callback && getClass.call(callback) == functionClass ? walk((value = {}, value[""] = result, value), "", callback) : result;
      };
    }
  }

  // Export for asynchronous module loaders.
  if (isLoader) {
    define('json-ie7',[],function () {
      return JSON3;
    });
  }
}(this));
/*global define*/
define('chiropractor/views/base',['require','underscore','json-ie7','jquery','backbone','handlebars'],function(require) {
    

    var _ = require('underscore'),
        JSON = require('json-ie7'),
        $ = require('jquery'),
        Backbone = require('backbone'),
        Handlebars = require('handlebars'),
        removeHandlerTest = $('<span></span>'),
        removeHandlerExists = false,
        placeholderId;

    removeHandlerTest.on('remove', function() { removeHandlerExists = true; });
    removeHandlerTest.remove();

    if (!removeHandlerExists) {
        $.event.special.remove = {
            remove: function(e) {
                if (e.handler) {
                    var $el = $(this);
                    // Since this event gets fired on calling $el.off('remove')
                    // as well as when the $el.remove() gets called, we need to
                    // allow the Backbone View to unregister this without
                    // firing it.
                    if(!$el.hasClass('removedEventFired')) {
                        $el.addClass('removedEventFired');
                        e.handler.call(this, new $.Event('remove', {target: this}));
                    }
                }
            }
        };
    }

    placeholderId = function(view) {
        return 'chiropractorId' + view.cid;
    };

    return Backbone.View.extend({
        initialize: function(options) {
            options = options || {};
            Backbone.View.prototype.initialize.call(this, options);

            _.bindAll(this, 'remove');

            this._childViews = [];
            this._context = options.context || {};

            this.$el.on('remove', this.remove);
        },

        _addChild: function(view) {
            this._childViews.push(view);
            return '<' + view.el.tagName +
                ' id="' + placeholderId(view) + '"></div>';
        },

        context: function() {
            return {
                model: this.model,
                collection: this.collection
            };
        },

        render: function() {
            var template = typeof(this.template) === 'string' ?
                    Handlebars.compile(this.template) : this.template,
                context = typeof(this.context) === 'function' ?
                    this.context() : this.context;

            context.declaringView = this;
            _.defaults(context, this._context);

            if (template) {
                this.$el.html(template(context));
            }

            _(this._childViews).each(function(view) {
                this.$('#' + placeholderId(view)).replaceWith(view.el);
            }, this);
            return this;
        },

        remove: function() {
            this.$el.addClass('removedEventFired');
            this.$el.off('remove', this.remove);
            _(this._childViews).each(function(view) {
                view.remove();
            });
            this._childViews = [];
            Backbone.View.prototype.remove.apply(this, arguments);
        }
    });
});

/*global define*/
define('chiropractor/views/form',['require','underscore','json-ie7','jquery','backbone','./base'],function(require) {
    

    var _ = require('underscore'),
        JSON = require('json-ie7'),
        $ = require('jquery'),
        Backbone = require('backbone'),
        Base = require('./base');

    return Base.extend({
        initialize: function() {
            Base.prototype.initialize.apply(this, arguments);
            this.listenForErrors(this.model);
            this.listenForErrors(this.collection);
        },

        listenForErrors: function(obj) {
            if (obj) {
                if (obj instanceof Backbone.Model) {
                    this.listenTo(obj, 'invalid', this.renderFormErrors);
                    this.listenTo(obj, 'change', this.clearFormErrors);
                }
                else if (obj instanceof Backbone.Collection) {
                    obj.each(function(model) {
                        this.listenTo(model, 'invalid', this.renderFormErrors);
                        this.listenTo(model, 'change', this.clearFormErrors);
                    }, this);
                }
                else {
                    throw new Error('Invalid object to associate errors with.');
                }
            }
        },

        clearFormErrors: function(model) {
            _(model.changed).each(function(value, field) {
                this.$('#container-' + model.fieldId(field))
                    .find('.help-inline').html('');
            }, this);
        },

        renderFormErrors: function(model, errors) {
            _(errors).each(function(errorMessages, field) {
                var help;
                errorMessages = typeof(errorMessages) === 'string' ?
                    [errorMessages] : errorMessages;

                if (field === '__all__') {
                    help = $('<div class="errors"></div>');
                    this.$el.prepend(help);
                }
                else {
                    help = this.$('#container-' + model.fieldId(field))
                        .find('.help-inline');
                }

                help.html(errorMessages.join(', '));
            }, this);
        }
    });
});

/* START_TEMPLATE */
define('hbs!chiropractor/views/templates/fields/label',['hbs','handlebars'], function( hbs, Handlebars ){ 
var t = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression;


  foundHelper = helpers.value;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.value; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  return escapeExpression(stack1);});
Handlebars.registerPartial('chiropractor_views_templates_fields_label', t);
return t;
});
/* END_TEMPLATE */
;
/*global define*/
define('chiropractor/views/field',['require','json-ie7','jquery','underscore','handlebars','hbs!./templates/fields/label'],function(require) {
    

    var JSON = require('json-ie7'),
        $ = require('jquery'),
        _ = require('underscore'),
        Handlebars = require('handlebars'),
        fieldTemplates = {},
        label = require('hbs!./templates/fields/label');

        fieldTemplates = {
            'default': label
        };

       Handlebars.registerHelper('field', function(type, model, fieldName) {
            // template helper in the form of:
            //
            //      {{ field 'text' model 'fieldname' [attrName="attrValue"]*}}
            var template = fieldTemplates[type],
                options = arguments[arguments.length - 1],
                opts = options.hash || {},
                field = opts.field,
                id = '',
                value = '';

            if (!template) {
               template = fieldTemplates.default;
            }

            if (model) {
                id = model.fieldId(fieldName);
                //console.log(model);
                value = model.get(field.id);
            }

            _.defaults(opts, {
                id: id,
                label: fieldName,
                name: fieldName,
                options: [],
                blank: false,
                value: value,
                help: '',
                model: model
            });
            return new Handlebars.SafeString(template(opts));
        });

    return {
        Templates: fieldTemplates,
        addTemplate: function(name,template) {
            fieldTemplates[name] = template;
        }
    };
});

/* START_TEMPLATE */
define('hbs!chiropractor/views/templates/row/row',['hbs','handlebars'], function( hbs, Handlebars ){ 
var t = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, functionType="function", self=this;

function program1(depth0,data,depth1) {
  
  var buffer = "", stack1, stack2, stack3, foundHelper;
  buffer += "\n    <td>";
  stack1 = depth1.model;
  stack2 = depth0.fieldtype;
  stack3 = {};
  stack3['field'] = depth0;
  foundHelper = helpers.field;
  stack1 = foundHelper ? foundHelper.call(depth0, stack2, stack1, {hash:stack3}) : helperMissing.call(depth0, "field", stack2, stack1, {hash:stack3});
  buffer += escapeExpression(stack1) + "</td>\n  ";
  return buffer;}

  buffer += "<tr class=\"";
  foundHelper = helpers.rowclass;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.rowclass; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\">\n  ";
  stack1 = depth0.options;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.fields;
  stack1 = helpers.each.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.programWithDepth(program1, data, depth0)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</tr>";
  return buffer;});
Handlebars.registerPartial('chiropractor_views_templates_row_row', t);
return t;
});
/* END_TEMPLATE */
;
/*global define*/
define('chiropractor/views/row',['require','json-ie7','jquery','underscore','handlebars','hbs!./templates/row/row'],function(require) {
    

    var JSON = require('json-ie7'),
        $ = require('jquery'),
        _ = require('underscore'),
        Handlebars = require('handlebars'),
        rowTemplates = {},
        row = require('hbs!./templates/row/row');

        rowTemplates = {
            'row': row
        };

       Handlebars.registerHelper('row', function(type, model, fieldName) {
            // template helper in the form of:
            //
            //      {{ field 'text' model 'fieldname' [attrName="attrValue"]*}}
            var current = rowTemplates[type],
                options = arguments[arguments.length - 1],
                opts = options.hash || {},
                id = '',
                value = '';

            if (!current) {
                throw new Error('Unregistered field template: ' + type);
            }
            //console.log(opt);
            return new Handlebars.SafeString(current({ model: model, options: opts }));
        });

    return {
        Templates: rowTemplates,
        addTemplate: function(name,template) {
            rowTemplates[name] = template;
        }
    };
});

/*global define*/
define('chiropractor/hbs/view',['require','underscore','backbone','handlebars'],function(require) {
    

    var _ = require('underscore'),
        Backbone = require('backbone'),
        Handlebars = require('handlebars'),
        view;

    view = function() {
        // template helper in the form of:
        //
        //      {{ view "path/to/require/module[|ViewName]" [viewOptions] [context] [viewOption1=val viewOption2=val]}}
        var View, view, options, requirePath,
            viewName, attrs, requireBits, placeholder,
            context = {};

        options = arguments[arguments.length - 1];
        attrs = arguments[1] || {};
        _.defaults(attrs, options.hash || {});

        if (arguments.length === 4) {
            context = arguments[2];
        }
        _.defaults(this, context);

        if (typeof(arguments[0]) === 'string') {
            requireBits = arguments[0].split('|');
            requirePath = requireBits[0];
            viewName = requireBits[1];

            View = require(requirePath);
            if (typeof(viewName) === 'string') {
                View = View[viewName];
            }
        }
        else {
            View = arguments[0];
        }

        if (options.fn) {
            View = View.extend({
                template: options.fn
            });
        }

        view = new View(attrs).render();

        placeholder = this.declaringView._addChild(view);

        // Return a placeholder that the Chiropractor.View can replace with
        // the child view appended above.
        // If this is called as a block hbs helper, then we do not need to
        // use safe string, while as a hbs statement it needs to be declared
        // safe.
        if (options.fn) {
            return placeholder;
        }
        else {
            return new Handlebars.SafeString(placeholder);
        }
    };

    Handlebars.registerHelper('view', view);

    return view;
});

/* START_TEMPLATE */
define('hbs!chiropractor/views/templates/formfield/text',['hbs','handlebars'], function( hbs, Handlebars ){ 
var t = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<div class=\"control-group\" id=\"container-";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\">\n    <label class=\"control-label ";
  foundHelper = helpers.labelclass;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.labelclass; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" for=\"";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\">";
  foundHelper = helpers.label;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.label; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</label>\n    <div class=\"controls\">\n        <input type=\"text\" placeholder=\"";
  foundHelper = helpers.placeholder;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.placeholder; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" id=\"";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" name=\"";
  foundHelper = helpers.name;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.name; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" value=\"";
  foundHelper = helpers.value;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.value; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" class=\"";
  foundHelper = helpers['class'];
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0['class']; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" />\n        <span class=\"description\">";
  foundHelper = helpers.description;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.description; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</span>\n        <span class=\"help-inline\">";
  foundHelper = helpers.help;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.help; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</span>\n    </div>\n</div>\n";
  return buffer;});
Handlebars.registerPartial('chiropractor_views_templates_formfield_text', t);
return t;
});
/* END_TEMPLATE */
;
/* START_TEMPLATE */
define('hbs!chiropractor/views/templates/formfield/textarea',['hbs','handlebars'], function( hbs, Handlebars ){ 
var t = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<div class=\"control-group\" id=\"container-";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\">\n    <label class=\"control-label\" for=\"";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\">";
  foundHelper = helpers.label;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.label; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</label>\n    <div class=\"controls\">\n        <textarea id=\"";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" name=\"";
  foundHelper = helpers.name;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.name; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\">";
  foundHelper = helpers.value;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.value; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</textarea>\n        <span class=\"help-inline\">";
  foundHelper = helpers.help;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.help; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</span>\n    </div>\n</div>\n";
  return buffer;});
Handlebars.registerPartial('chiropractor_views_templates_formfield_textarea', t);
return t;
});
/* END_TEMPLATE */
;
/* START_TEMPLATE */
define('hbs!chiropractor/views/templates/formfield/select',['hbs','handlebars'], function( hbs, Handlebars ){ 
var t = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression, self=this, helperMissing=helpers.helperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n                <option value=\"\">";
  foundHelper = helpers.blank;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.blank; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</option>\n            ";
  return buffer;}

function program3(depth0,data,depth1) {
  
  var buffer = "", stack1, stack2, foundHelper;
  buffer += "\n                <option value=\"";
  foundHelper = helpers.value;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.value; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\"";
  stack1 = depth1.value;
  stack2 = depth0.value;
  foundHelper = helpers.ifequal;
  stack1 = foundHelper ? foundHelper.call(depth0, stack2, stack1, {hash:{},inverse:self.noop,fn:self.program(4, program4, data)}) : helperMissing.call(depth0, "ifequal", stack2, stack1, {hash:{},inverse:self.noop,fn:self.program(4, program4, data)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += ">";
  foundHelper = helpers.label;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.label; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</option>\n            ";
  return buffer;}
function program4(depth0,data) {
  
  
  return " selected=\"selected\"";}

  buffer += "<div class=\"control-group\" id=\"container-";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\">\n    <label class=\"control-label ";
  foundHelper = helpers.labelclass;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.labelclass; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" for=\"";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\">";
  foundHelper = helpers.label;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.label; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</label>\n    <div class=\"controls\">\n        <select id=\"";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" name=\"";
  foundHelper = helpers.name;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.name; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\">\n            ";
  stack1 = depth0.blank;
  stack1 = helpers['if'].call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            ";
  stack1 = depth0.options;
  stack1 = helpers.each.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.programWithDepth(program3, data, depth0)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </select>\n        <span class=\"description\">";
  foundHelper = helpers.description;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.description; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</span>\n        <span class=\"help-inline\">";
  foundHelper = helpers.help;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.help; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</span>\n    </div>\n</div>\n";
  return buffer;});
Handlebars.registerPartial('chiropractor_views_templates_formfield_select', t);
return t;
});
/* END_TEMPLATE */
;
/* START_TEMPLATE */
define('hbs!chiropractor/views/templates/formfield/checkbox',['hbs','handlebars'], function( hbs, Handlebars ){ 
var t = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, foundHelper;
  buffer += " \n            <input type=\"checkbox\" id=\"";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" name=\"";
  foundHelper = helpers.name;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.name; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" value=\"";
  foundHelper = helpers.value;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.value; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" /> ";
  foundHelper = helpers.label;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.label; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\n        ";
  return buffer;}

  buffer += "<div class=\"control-group\" id=\"container-";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\">\n    <label class=\"control-label\" for=\"";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\">";
  foundHelper = helpers.label;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.label; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</label>\n    <div class=\"controls\">\n        ";
  stack1 = depth0.options;
  stack1 = helpers.each.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        <span class=\"help-inline\">";
  foundHelper = helpers.help;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.help; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</span>\n    </div>\n</div>\n";
  return buffer;});
Handlebars.registerPartial('chiropractor_views_templates_formfield_checkbox', t);
return t;
});
/* END_TEMPLATE */
;
/* START_TEMPLATE */
define('hbs!chiropractor/views/templates/formfield/radio',['hbs','handlebars'], function( hbs, Handlebars ){ 
var t = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, foundHelper;
  buffer += " \n            <input type=\"radio\" id=\"";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" name=\"";
  foundHelper = helpers.name;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.name; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" value=\"";
  foundHelper = helpers.value;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.value; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" /> ";
  foundHelper = helpers.label;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.label; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\n        ";
  return buffer;}

  buffer += "<div class=\"control-group\" id=\"container-";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\">\n    <label class=\"control-label\" for=\"";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\">";
  foundHelper = helpers.label;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.label; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</label>\n    <div class=\"controls\">\n        ";
  stack1 = depth0.options;
  stack1 = helpers.each.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        <span class=\"help-inline\">";
  foundHelper = helpers.help;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.help; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</span>\n    </div>\n</div>\n";
  return buffer;});
Handlebars.registerPartial('chiropractor_views_templates_formfield_radio', t);
return t;
});
/* END_TEMPLATE */
;
/*global define*/
define('chiropractor/views/formfield',['require','json-ie7','jquery','underscore','handlebars','../hbs/view','./base','hbs!./templates/formfield/text','hbs!./templates/formfield/textarea','hbs!./templates/formfield/select','hbs!./templates/formfield/checkbox','hbs!./templates/formfield/radio'],function(require) {
    

    var JSON = require('json-ie7'),
        $ = require('jquery'),
        _ = require('underscore'),
        Handlebars = require('handlebars'),
        viewHelper = require('../hbs/view'),
        Base = require('./base'),
        fieldTemplates = {},
        View, register;

    View = Base.extend({
        events: {
            'change input': 'inputChanged',
            'blur input': 'inputChanged',
            'change select': 'inputChanged',
            'blur select': 'inputChanged',
            'change textarea': 'inputChanged',
            'blur textarea': 'inputChanged'
        },

        initialize: function(options) {
            Base.prototype.initialize.apply(this, arguments);
            this.config = options.context;
            this.field = options.field;
        },
        inputChanged: function() {
            var val = this.$('[name=' + this.field + ']').val();
            this.model.set(this.field, val, {validate: true});
            // We want to ensure that the model value is really updated even
            // if validation fails in the previous step. However, it should be
            // silent and not trigger any change events since the previous step
            // will take care of that in the case of success.
            this.model.set(this.field, val, {silent: true});
        }
    });

    View.register = register = function(type, def) {
        var SubClass = fieldTemplates[type] = this.extend(def);
        SubClass.register = register;
        return SubClass;
    };

    View.unregister = function(type) {
        if (fieldTemplates[type]) {
            delete fieldTemplates[type];
        }
    };

    View.register('text', {
        template: require('hbs!./templates/formfield/text')
    });

    View.register('textarea', {
        template: require('hbs!./templates/formfield/textarea')
    });

    View.register('select', {
        template: require('hbs!./templates/formfield/select')
    });

    View.register('checkbox', {
        template: require('hbs!./templates/formfield/checkbox')
    });

    View.register('radio', {
        template: require('hbs!./templates/formfield/radio')
    });

    Handlebars.registerHelper('formfield', function(type, model, fieldName) {
        // template helper in the form of:
        //
        //      {{ formfield 'text' model 'fieldname' [attrName="attrValue"]*}}
        var FormField = fieldTemplates[type],
            options = arguments[arguments.length - 1],
            opts = options.hash || {};

        if (!FormField) {
            throw new Error('Unregistered formfield template: ' + type);
        }

        _.defaults(opts, {
            id: model.fieldId(fieldName),
            label: fieldName,
            name: fieldName,
            options: [],
            blank: false,
            value: model.get(fieldName) || '',
            help: ''
        });
        return viewHelper.call(this, FormField, {
            field: fieldName,
            model: model,
            context: opts
        }, options);
    });

    return View;
});

/*global define*/
define('chiropractor/views',['require','./views/base','./views/form','./views/field','./views/row','./views/formfield'],function(require) {
    

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

/*global define,setTimeout,clearTimeout*/
define('chiropractor/models/auth',['require','backbone','jquery','json-ie7','underscore','jquery.cookie'],function(require) {
    

    var Backbone = require('backbone'),
        $ = require('jquery'),
        JSON = require('json-ie7'),
        _ = require('underscore'),
        tokenCookie = 'wttoken',
        expirationWarningMinutes = 2,
        expirationWarningActive = false,
        expirationTimeoutId, expirationWarning,
        activeToken, getToken, setToken, clearToken;

    require('jquery.cookie');

    expirationWarning = function() {
        Backbone.Events.trigger('authentication:expiration');
        expirationWarningActive = true;

        expirationTimeoutId = setTimeout(
            function() {
                Backbone.Events.trigger('authentication:failure');
            },
            expirationWarningMinutes * 60 * 1000
        );
    };

    getToken = function() {
        if (typeof(activeToken) === 'undefined') {
            activeToken = $.cookie(tokenCookie);
        }
        return activeToken;
    };

    setToken = function(token) {
        var tokenComponents = token.split('::'),
            serverTime = tokenComponents[1],
            expireTime = tokenComponents[2],
            // We want an expiration alert to happen two minutes before the
            // token is going to expire.
            expirationTimeout = Math.max(
                0,
                expireTime - serverTime - (expirationWarningMinutes * 60)
            ) * 1000;

        activeToken = token;
        $.cookie(tokenCookie, token);

        if (expirationTimeoutId) {
            clearTimeout(expirationTimeoutId);
        }

        if (expirationWarningActive) {
            Backbone.Events.trigger('authentication:renewal');
            expirationWarningActive = false;
        }

        expirationTimeoutId = setTimeout(expirationWarning, expirationTimeout);
    };

    clearToken = function() {
        activeToken = undefined;
        $.removeCookie(tokenCookie);

        if (expirationTimeoutId) {
            clearTimeout(expirationTimeoutId);
        }
    };

    Backbone.Events.on(
        'authentication:logout authentication:failure',
        clearToken
    );

    return {
        sync: function(method, model, options) {
            var beforeSend = options.beforeSend,
                onError = options.error,
                onSuccess = options.success,
                self = this,
                opts = _(options).clone();

            options.success = function(model, data, xhr) {
                var token = xhr.getResponseHeader('Authorization');
                if (token) {
                    setToken(token);
                }
                return onSuccess.apply(self, arguments);
            };

            // This is a jQuery error handler.
            options.error = function(xhr, statusText, error) {
                if (xhr.status === 400) {
                    // TODO: add logic to only trigger unauthenticated if the
                    // bad request is due to malformed token
                    Backbone.Events.trigger('authentication:failure', self, xhr);
                }
                if (xhr.status === 401) {
                    Backbone.Events.trigger('authentication:failure', self, xhr);

                    self.listenToOnce(
                        Backbone.Events,
                        'authentication:success',
                        function() {
                            self.sync(method, model, opts);
                        }
                    );
                }

                // Call the original onError handler.
                if (onError) {
                    return onError.apply(self, arguments);
                }
            };

            options.beforeSend = function(xhr) {
                var token = getToken();
                if (!self.disableAuthToken && token) {
                    xhr.setRequestHeader(
                        'Authorization',
                        token
                    );
                }

                if (beforeSend) {
                    return beforeSend.apply(this, arguments);
                }
            };
        },
        cleanup: clearToken
    };
});

/**
 * Underscore mixins for deep objects
 *
 * Based on https://gist.github.com/echong/3861963
 */
//(function() {
  /*global define*/
define('underscore.mixin.deepextend',['require','underscore'],function(require) {
    

  var _ = require('underscore'),
  arrays, basicObjects, deepClone, deepExtend, deepExtendCouple, isBasicObject,
    __slice = [].slice;

  deepClone = function(obj) {
    var func, isArr;
    if (!_.isObject(obj) || _.isFunction(obj)) {
      return obj;
    }
    if (obj instanceof Backbone.Collection || obj instanceof Backbone.Model) {
      return obj;
    }
    if (_.isDate(obj)) {
      return new Date(obj.getTime());
    }
    if (_.isRegExp(obj)) {
      return new RegExp(obj.source, obj.toString().replace(/.*\//, ""));
    }
    isArr = _.isArray(obj || _.isArguments(obj));
    func = function(memo, value, key) {
      if (isArr) {
        memo.push(deepClone(value));
      } else {
        memo[key] = deepClone(value);
      }
      return memo;
    };
    return _.reduce(obj, func, isArr ? [] : {});
  };

  isBasicObject = function(object) {
    if (object === null) {
      return false;
    }
    return (object.prototype === {}.prototype || object.prototype === Object.prototype) && _.isObject(object) && !_.isArray(object) && !_.isFunction(object) && !_.isDate(object) && !_.isRegExp(object) && !_.isArguments(object);
  };

  basicObjects = function(object) {
    return _.filter(_.keys(object), function(key) {
      return isBasicObject(object[key]);
    });
  };

  arrays = function(object) {
    return _.filter(_.keys(object), function(key) {
      return _.isArray(object[key]);
    });
  };

  deepExtendCouple = function(destination, source, maxDepth) {
    var combine, recurse, sharedArrayKey, sharedArrayKeys, sharedObjectKey, sharedObjectKeys, _i, _j, _len, _len1;
    if (maxDepth === null) {
      maxDepth = 20;
    }
    if (maxDepth <= 0) {
      console.warn('_.deepExtend(): Maximum depth of recursion hit.');
      return _.extend(destination, source);
    }
    sharedObjectKeys = _.intersection(basicObjects(destination), basicObjects(source));
    recurse = function(key) {
      source[key] = deepExtendCouple(destination[key], source[key], maxDepth - 1);
      return source[key];
    };
    for (_i = 0, _len = sharedObjectKeys.length; _i < _len; _i+=1) {
      sharedObjectKey = sharedObjectKeys[_i];
      recurse(sharedObjectKey);
    }
    sharedArrayKeys = _.intersection(arrays(destination), arrays(source));
    combine = function(key) {
      source[key] = _.union(destination[key], source[key]);
      return source[key];
    };
    for (_j = 0, _len1 = sharedArrayKeys.length; _j < _len1; _j+=1) {
      sharedArrayKey = sharedArrayKeys[_j];
      combine(sharedArrayKey);
    }
    return _.extend(destination, source);
  };

  deepExtend = function() {
    var finalObj, maxDepth, objects, _i;
    objects = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), maxDepth = arguments[_i++];
    if (!_.isNumber(maxDepth)) {
      objects.push(maxDepth);
      maxDepth = 20;
    }
    if (objects.length <= 1) {
      return objects[0];
    }
    if (maxDepth <= 0) {
      return _.extend.apply(this, objects);
    }
    finalObj = objects.shift();
    while (objects.length > 0) {
      finalObj = deepExtendCouple(finalObj, deepClone(objects.shift()), maxDepth);
    }
    return finalObj;
  };

  _.mixin({
    deepClone: deepClone,
    isBasicObject: isBasicObject,
    basicObjects: basicObjects,
    arrays: arrays,
    deepExtend: deepExtend
  });

});

/**
 * Main source
 */

;(function(factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define('backbone.deep.model',['underscore', 'backbone'], factory);
    } else {
        // globals
        factory(_, Backbone);
    }
}(function(_, Backbone) {

    /**
     * Takes a nested object and returns a shallow object keyed with the path names
     * e.g. { "level1.level2": "value" }
     *
     * @param  {Object}      Nested object e.g. { level1: { level2: 'value' } }
     * @return {Object}      Shallow object with path names e.g. { 'level1.level2': 'value' }
     */
    function objToPaths(obj) {
        var ret = {},
            separator = DeepModel.keyPathSeparator;

        for (var key in obj) {
            var val = obj[key];

            if (val && val.constructor === Object && !_.isEmpty(val)) {
                //Recursion for embedded objects
                var obj2 = objToPaths(val);

                for (var key2 in obj2) {
                    var val2 = obj2[key2];

                    ret[key + separator + key2] = val2;
                }
            } else {
                ret[key] = val;
            }
        }

        return ret;
    }

    /**
     * @param {Object}  Object to fetch attribute from
     * @param {String}  Object path e.g. 'user.name'
     * @return {Mixed}
     */
    function getNested(obj, path, return_exists) {
        var separator = DeepModel.keyPathSeparator;

        var fields = path.split(separator);
        var result = obj;
        return_exists || (return_exists === false);
        for (var i = 0, n = fields.length; i < n; i++) {
            if (return_exists && !_.has(result, fields[i])) {
                return false;
            }
            result = result[fields[i]];

            if (result == null && i < n - 1) {
                result = {};
            }

            if (typeof result === 'undefined') {
                if (return_exists)
                {
                    return true;
                }
                return result;
            }
        }
        if (return_exists)
        {
            return true;
        }
        return result;
    }

    /**
     * @param {Object} obj                Object to fetch attribute from
     * @param {String} path               Object path e.g. 'user.name'
     * @param {Object} [options]          Options
     * @param {Boolean} [options.unset]   Whether to delete the value
     * @param {Mixed}                     Value to set
     */
    function setNested(obj, path, val, options) {
        options = options || {};

        var separator = DeepModel.keyPathSeparator;

        var fields = path.split(separator);
        var result = obj;
        for (var i = 0, n = fields.length; i < n && result !== undefined ; i++) {
            var field = fields[i];

            //If the last in the path, set the value
            if (i === n - 1) {
                options.unset ? delete result[field] : result[field] = val;
            } else {
                //Create the child object if it doesn't exist, or isn't an object
                if (typeof result[field] === 'undefined' || ! _.isObject(result[field])) {
                    result[field] = {};
                }

                //Move onto the next part of the path
                result = result[field];
            }
        }
    }

    function deleteNested(obj, path) {
      setNested(obj, path, null, { unset: true });
    }

    var DeepModel = Backbone.Model.extend({

        // Override constructor
        // Support having nested defaults by using _.deepExtend instead of _.extend
        constructor: function(attributes, options) {
            var defaults;
            var attrs = attributes || {};
            this.cid = _.uniqueId('c');
            this.attributes = {};
            if (options && options.collection) this.collection = options.collection;
            if (options && options.parse) attrs = this.parse(attrs, options) || {};
            if (defaults = _.result(this, 'defaults')) {
                //<custom code>
                // Replaced the call to _.defaults with _.deepExtend.
                attrs = _.deepExtend({}, defaults, attrs);
                //</custom code>
            }
            this.set(attrs, options);
            this.changed = {};
            this.initialize.apply(this, arguments);
        },

        // Return a copy of the model's `attributes` object.
        toJSON: function(options) {
          return _.clone(this.attributes, true);
        },

        // Override get
        // Supports nested attributes via the syntax 'obj.attr' e.g. 'author.user.name'
        get: function(attr) {
            return getNested(this.attributes, attr);
        },

        // Override set
        // Supports nested attributes via the syntax 'obj.attr' e.g. 'author.user.name'
        set: function(key, val, options) {
            var attr, attrs, unset, changes, silent, changing, prev, current;
            if (key == null) return this;

            // Handle both `"key", value` and `{key: value}` -style arguments.
            if (typeof key === 'object') {
              attrs = key;
              options = val || {};
            } else {
              (attrs = {})[key] = val;
            }

            options || (options = {});

            // Run validation.
            if (!this._validate(attrs, options)) return false;

            // Extract attributes and options.
            unset           = options.unset;
            silent          = options.silent;
            changes         = [];
            changing        = this._changing;
            this._changing  = true;

            if (!changing) {
              this._previousAttributes = _.clone(this.attributes, true);
              this.changed = {};
            }
            current = this.attributes, prev = this._previousAttributes;

            // Check for changes of `id`.
            if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

            //<custom code>
            attrs = objToPaths(attrs);
            //</custom code>

            // For each `set` attribute, update or delete the current value.
            for (attr in attrs) {
              val = attrs[attr];

              //<custom code>: Using getNested, setNested and deleteNested
              if (!_.isEqual(getNested(current, attr), val)) changes.push(attr);
              if (!_.isEqual(getNested(prev, attr), val)) {
                setNested(this.changed, attr, val);
              } else {
                deleteNested(this.changed, attr);
              }
              unset ? deleteNested(current, attr) : setNested(current, attr, val);
              //</custom code>
            }

            // Trigger all relevant attribute changes.
            if (!silent) {
              if (changes.length) this._pending = true;

              //<custom code>
              var separator = DeepModel.keyPathSeparator;
              var alreadyTriggered = {}; // * @restorer

              for (var i = 0, l = changes.length; i < l; i++) {
                var key = changes[i];

                if (!alreadyTriggered.hasOwnProperty(key) || !alreadyTriggered[key]) { // * @restorer
                  alreadyTriggered[key] = true; // * @restorer
                  this.trigger('change:' + key, this, getNested(current, key), options);
                } // * @restorer

                var fields = key.split(separator);

                //Trigger change events for parent keys with wildcard (*) notation
                for(var n = fields.length - 1; n > 0; n--) {
                  var parentKey = _.first(fields, n).join(separator),
                      wildcardKey = parentKey + separator + '*';

                  if (!alreadyTriggered.hasOwnProperty(wildcardKey) || !alreadyTriggered[wildcardKey]) { // * @restorer
                    alreadyTriggered[wildcardKey] = true; // * @restorer
                    this.trigger('change:' + wildcardKey, this, getNested(current, parentKey), options);
                  } // * @restorer

                  // + @restorer
                  if (!alreadyTriggered.hasOwnProperty(parentKey) || !alreadyTriggered[parentKey]) {
                    alreadyTriggered[parentKey] = true;
                    this.trigger('change:' + parentKey, this, getNested(current, parentKey), options);
                  }
                  // - @restorer
                }
                //</custom code>
              }
            }

            if (changing) return this;
            if (!silent) {
              while (this._pending) {
                this._pending = false;
                this.trigger('change', this, options);
              }
            }
            this._pending = false;
            this._changing = false;
            return this;
        },

        // Clear all attributes on the model, firing `"change"` unless you choose
        // to silence it.
        clear: function(options) {
          var attrs = {};
          var shallowAttributes = objToPaths(this.attributes);
          for (var key in shallowAttributes) attrs[key] = void 0;
          return this.set(attrs, _.extend({}, options, {unset: true}));
        },

        // Determine if the model has changed since the last `"change"` event.
        // If you specify an attribute name, determine if that attribute has changed.
        hasChanged: function(attr) {
          if (attr == null) return !_.isEmpty(this.changed);
          return getNested(this.changed, attr) !== undefined;
        },

        // Return an object containing all the attributes that have changed, or
        // false if there are no changed attributes. Useful for determining what
        // parts of a view need to be updated and/or what attributes need to be
        // persisted to the server. Unset attributes will be set to undefined.
        // You can also pass an attributes object to diff against the model,
        // determining if there *would be* a change.
        changedAttributes: function(diff) {
          //<custom code>: objToPaths
          if (!diff) return this.hasChanged() ? objToPaths(this.changed) : false;
          //</custom code>

          var old = this._changing ? this._previousAttributes : this.attributes;

          //<custom code>
          diff = objToPaths(diff);
          old = objToPaths(old);
          //</custom code>

          var val, changed = false;
          for (var attr in diff) {
            if (_.isEqual(old[attr], (val = diff[attr]))) continue;
            (changed || (changed = {}))[attr] = val;
          }
          return changed;
        },

        // Get the previous value of an attribute, recorded at the time the last
        // `"change"` event was fired.
        previous: function(attr) {
          if (attr == null || !this._previousAttributes) return null;

          //<custom code>
          return getNested(this._previousAttributes, attr);
          //</custom code>
        },

        // Get all of the attributes of the model at the time of the previous
        // `"change"` event.
        previousAttributes: function() {
          //<custom code>
          return _.clone(this._previousAttributes, true);
          //</custom code>
        }
    });


    //Config; override in your app to customise
    DeepModel.keyPathSeparator = '.';


    //Exports
    Backbone.DeepModel = DeepModel;

    //For use in NodeJS
    if (typeof module != 'undefined') module.exports = DeepModel;

    return Backbone;

}));

// Backbone.Validation v0.8.2
//
// Copyright (c) 2011-2013 Thomas Pedersen
// Distributed under MIT License
//
// Documentation and full license available at:
// http://thedersen.com/projects/backbone-validation
(function (factory) {
  if (typeof exports === 'object') {
    module.exports = factory(require('backbone'), require('underscore'));
  } else if (typeof define === 'function' && define.amd) {
    define('backbone.validation',['backbone', 'underscore'], factory);
  }
}(function (Backbone, _) {
  Backbone.Validation = (function(_){
    
  
    // Default options
    // ---------------
  
    var defaultOptions = {
      forceUpdate: false,
      selector: 'name',
      labelFormatter: 'sentenceCase',
      valid: Function.prototype,
      invalid: Function.prototype
    };
  
  
    // Helper functions
    // ----------------
  
    // Formatting functions used for formatting error messages
    var formatFunctions = {
      // Uses the configured label formatter to format the attribute name
      // to make it more readable for the user
      formatLabel: function(attrName, model) {
        return defaultLabelFormatters[defaultOptions.labelFormatter](attrName, model);
      },
  
      // Replaces nummeric placeholders like {0} in a string with arguments
      // passed to the function
      format: function() {
        var args = Array.prototype.slice.call(arguments),
            text = args.shift();
        return text.replace(/\{(\d+)\}/g, function(match, number) {
          return typeof args[number] !== 'undefined' ? args[number] : match;
        });
      }
    };
  
    // Flattens an object
    // eg:
    //
    //     var o = {
    //       address: {
    //         street: 'Street',
    //         zip: 1234
    //       }
    //     };
    //
    // becomes:
    //
    //     var o = {
    //       'address.street': 'Street',
    //       'address.zip': 1234
    //     };
    var flatten = function (obj, into, prefix) {
      into = into || {};
      prefix = prefix || '';
  
      _.each(obj, function(val, key) {
        if(obj.hasOwnProperty(key)) {
          if (val && typeof val === 'object' && !(
            val instanceof Array ||
            val instanceof Date ||
            val instanceof RegExp ||
            val instanceof Backbone.Model ||
            val instanceof Backbone.Collection)
          ) {
            flatten(val, into, prefix + key + '.');
          }
          else {
            into[prefix + key] = val;
          }
        }
      });
  
      return into;
    };
  
    // Validation
    // ----------
  
    var Validation = (function(){
  
      // Returns an object with undefined properties for all
      // attributes on the model that has defined one or more
      // validation rules.
      var getValidatedAttrs = function(model) {
        return _.reduce(_.keys(_.result(model, 'validation') || {}), function(memo, key) {
          memo[key] = void 0;
          return memo;
        }, {});
      };
  
      // Looks on the model for validations for a specified
      // attribute. Returns an array of any validators defined,
      // or an empty array if none is defined.
      var getValidators = function(model, attr) {
        var attrValidationSet = model.validation ? _.result(model, 'validation')[attr] || {} : {};
  
        // If the validator is a function or a string, wrap it in a function validator
        if (_.isFunction(attrValidationSet) || _.isString(attrValidationSet)) {
          attrValidationSet = {
            fn: attrValidationSet
          };
        }
  
        // Stick the validator object into an array
        if(!_.isArray(attrValidationSet)) {
          attrValidationSet = [attrValidationSet];
        }
  
        // Reduces the array of validators into a new array with objects
        // with a validation method to call, the value to validate against
        // and the specified error message, if any
        return _.reduce(attrValidationSet, function(memo, attrValidation) {
          _.each(_.without(_.keys(attrValidation), 'msg'), function(validator) {
            memo.push({
              fn: defaultValidators[validator],
              val: attrValidation[validator],
              msg: attrValidation.msg
            });
          });
          return memo;
        }, []);
      };
  
      // Validates an attribute against all validators defined
      // for that attribute. If one or more errors are found,
      // the first error message is returned.
      // If the attribute is valid, an empty string is returned.
      var validateAttr = function(model, attr, value, computed) {
        // Reduces the array of validators to an error message by
        // applying all the validators and returning the first error
        // message, if any.
        return _.reduce(getValidators(model, attr), function(memo, validator){
          // Pass the format functions plus the default
          // validators as the context to the validator
          var ctx = _.extend({}, formatFunctions, defaultValidators),
              result = validator.fn.call(ctx, value, attr, validator.val, model, computed);
  
          if(result === false || memo === false) {
            return false;
          }
          if (result && !memo) {
            return _.result(validator, 'msg') || result;
          }
          return memo;
        }, '');
      };
  
      // Loops through the model's attributes and validates them all.
      // Returns and object containing names of invalid attributes
      // as well as error messages.
      var validateModel = function(model, attrs) {
        var error,
            invalidAttrs = {},
            isValid = true,
            computed = _.clone(attrs),
            flattened = flatten(attrs);
  
        _.each(flattened, function(val, attr) {
          error = validateAttr(model, attr, val, computed);
          if (error) {
            invalidAttrs[attr] = error;
            isValid = false;
          }
        });
  
        return {
          invalidAttrs: invalidAttrs,
          isValid: isValid
        };
      };
  
      // Contains the methods that are mixed in on the model when binding
      var mixin = function(view, options) {
        return {
  
          // Check whether or not a value, or a hash of values
          // passes validation without updating the model
          preValidate: function(attr, value) {
            var self = this,
                result = {},
                error;
  
            if(_.isObject(attr)){
              _.each(attr, function(value, key) {
                error = self.preValidate(key, value);
                if(error){
                  result[key] = error;
                }
              });
  
              return _.isEmpty(result) ? undefined : result;
            }
            else {
              return validateAttr(this, attr, value, _.extend({}, this.attributes));
            }
          },
  
          // Check to see if an attribute, an array of attributes or the
          // entire model is valid. Passing true will force a validation
          // of the model.
          isValid: function(option) {
            var flattened = flatten(this.attributes);
  
            if(_.isString(option)){
              return !validateAttr(this, option, flattened[option], _.extend({}, this.attributes));
            }
            if(_.isArray(option)){
              return _.reduce(option, function(memo, attr) {
                return memo && !validateAttr(this, attr, flattened[attr], _.extend({}, this.attributes));
              }, true, this);
            }
            if(option === true) {
              this.validate();
            }
            return this.validation ? this._isValid : true;
          },
  
          // This is called by Backbone when it needs to perform validation.
          // You can call it manually without any parameters to validate the
          // entire model.
          validate: function(attrs, setOptions){
            var model = this,
                validateAll = !attrs,
                opt = _.extend({}, options, setOptions),
                validatedAttrs = getValidatedAttrs(model),
                allAttrs = _.extend({}, validatedAttrs, model.attributes, attrs),
                changedAttrs = flatten(attrs || allAttrs),
  
                result = validateModel(model, allAttrs);
  
            model._isValid = result.isValid;
  
            // After validation is performed, loop through all changed attributes
            // and call the valid callbacks so the view is updated.
            _.each(validatedAttrs, function(val, attr){
              var invalid = result.invalidAttrs.hasOwnProperty(attr);
              if(!invalid){
                opt.valid(view, attr, opt.selector);
              }
            });
  
            // After validation is performed, loop through all changed attributes
            // and call the invalid callback so the view is updated.
            _.each(validatedAttrs, function(val, attr){
              var invalid = result.invalidAttrs.hasOwnProperty(attr),
                  changed = changedAttrs.hasOwnProperty(attr);
  
              if(invalid && (changed || validateAll)){
                opt.invalid(view, attr, result.invalidAttrs[attr], opt.selector);
              }
            });
  
            // Trigger validated events.
            // Need to defer this so the model is actually updated before
            // the event is triggered.
            _.defer(function() {
              model.trigger('validated', model._isValid, model, result.invalidAttrs);
              model.trigger('validated:' + (model._isValid ? 'valid' : 'invalid'), model, result.invalidAttrs);
            });
  
            // Return any error messages to Backbone, unless the forceUpdate flag is set.
            // Then we do not return anything and fools Backbone to believe the validation was
            // a success. That way Backbone will update the model regardless.
            if (!opt.forceUpdate && _.intersection(_.keys(result.invalidAttrs), _.keys(changedAttrs)).length > 0) {
              return result.invalidAttrs;
            }
          }
        };
      };
  
      // Helper to mix in validation on a model
      var bindModel = function(view, model, options) {
        _.extend(model, mixin(view, options));
      };
  
      // Removes the methods added to a model
      var unbindModel = function(model) {
        delete model.validate;
        delete model.preValidate;
        delete model.isValid;
      };
  
      // Mix in validation on a model whenever a model is
      // added to a collection
      var collectionAdd = function(model) {
        bindModel(this.view, model, this.options);
      };
  
      // Remove validation from a model whenever a model is
      // removed from a collection
      var collectionRemove = function(model) {
        unbindModel(model);
      };
  
      // Returns the public methods on Backbone.Validation
      return {
  
        // Current version of the library
        version: '0.8.2',
  
        // Called to configure the default options
        configure: function(options) {
          _.extend(defaultOptions, options);
        },
  
        // Hooks up validation on a view with a model
        // or collection
        bind: function(view, options) {
          options = _.extend({}, defaultOptions, defaultCallbacks, options);
  
          var model = options.model || view.model,
              collection = options.collection || view.collection;
  
          if(typeof model === 'undefined' && typeof collection === 'undefined'){
            throw 'Before you execute the binding your view must have a model or a collection.\n' +
                  'See http://thedersen.com/projects/backbone-validation/#using-form-model-validation for more information.';
          }
  
          if(model) {
            bindModel(view, model, options);
          }
          else if(collection) {
            collection.each(function(model){
              bindModel(view, model, options);
            });
            collection.bind('add', collectionAdd, {view: view, options: options});
            collection.bind('remove', collectionRemove);
          }
        },
  
        // Removes validation from a view with a model
        // or collection
        unbind: function(view, options) {
          options = _.extend({}, options);
          var model = options.model || view.model,
              collection = options.collection || view.collection;
  
          if(model) {
            unbindModel(model);
          }
          if(collection) {
            collection.each(function(model){
              unbindModel(model);
            });
            collection.unbind('add', collectionAdd);
            collection.unbind('remove', collectionRemove);
          }
        },
  
        // Used to extend the Backbone.Model.prototype
        // with validation
        mixin: mixin(null, defaultOptions)
      };
    }());
  
  
    // Callbacks
    // ---------
  
    var defaultCallbacks = Validation.callbacks = {
  
      // Gets called when a previously invalid field in the
      // view becomes valid. Removes any error message.
      // Should be overridden with custom functionality.
      valid: function(view, attr, selector) {
        view.$('[' + selector + '~="' + attr + '"]')
            .removeClass('invalid')
            .removeAttr('data-error');
      },
  
      // Gets called when a field in the view becomes invalid.
      // Adds a error message.
      // Should be overridden with custom functionality.
      invalid: function(view, attr, error, selector) {
        view.$('[' + selector + '~="' + attr + '"]')
            .addClass('invalid')
            .attr('data-error', error);
      }
    };
  
  
    // Patterns
    // --------
  
    var defaultPatterns = Validation.patterns = {
      // Matches any digit(s) (i.e. 0-9)
      digits: /^\d+$/,
  
      // Matched any number (e.g. 100.000)
      number: /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/,
  
      // Matches a valid email address (e.g. mail@example.com)
      email: /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i,
  
      // Mathes any valid url (e.g. http://www.xample.com)
      url: /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i
    };
  
  
    // Error messages
    // --------------
  
    // Error message for the build in validators.
    // {x} gets swapped out with arguments form the validator.
    var defaultMessages = Validation.messages = {
      required: '{0} is required',
      acceptance: '{0} must be accepted',
      min: '{0} must be greater than or equal to {1}',
      max: '{0} must be less than or equal to {1}',
      range: '{0} must be between {1} and {2}',
      length: '{0} must be {1} characters',
      minLength: '{0} must be at least {1} characters',
      maxLength: '{0} must be at most {1} characters',
      rangeLength: '{0} must be between {1} and {2} characters',
      oneOf: '{0} must be one of: {1}',
      equalTo: '{0} must be the same as {1}',
      pattern: '{0} must be a valid {1}'
    };
  
    // Label formatters
    // ----------------
  
    // Label formatters are used to convert the attribute name
    // to a more human friendly label when using the built in
    // error messages.
    // Configure which one to use with a call to
    //
    //     Backbone.Validation.configure({
    //       labelFormatter: 'label'
    //     });
    var defaultLabelFormatters = Validation.labelFormatters = {
  
      // Returns the attribute name with applying any formatting
      none: function(attrName) {
        return attrName;
      },
  
      // Converts attributeName or attribute_name to Attribute name
      sentenceCase: function(attrName) {
        return attrName.replace(/(?:^\w|[A-Z]|\b\w)/g, function(match, index) {
          return index === 0 ? match.toUpperCase() : ' ' + match.toLowerCase();
        }).replace(/_/g, ' ');
      },
  
      // Looks for a label configured on the model and returns it
      //
      //      var Model = Backbone.Model.extend({
      //        validation: {
      //          someAttribute: {
      //            required: true
      //          }
      //        },
      //
      //        labels: {
      //          someAttribute: 'Custom label'
      //        }
      //      });
      label: function(attrName, model) {
        return (model.labels && model.labels[attrName]) || defaultLabelFormatters.sentenceCase(attrName, model);
      }
    };
  
  
    // Built in validators
    // -------------------
  
    var defaultValidators = Validation.validators = (function(){
      // Use native trim when defined
      var trim = String.prototype.trim ?
        function(text) {
          return text === null ? '' : String.prototype.trim.call(text);
        } :
        function(text) {
          var trimLeft = /^\s+/,
              trimRight = /\s+$/;
  
          return text === null ? '' : text.toString().replace(trimLeft, '').replace(trimRight, '');
        };
  
      // Determines whether or not a value is a number
      var isNumber = function(value){
        return _.isNumber(value) || (_.isString(value) && value.match(defaultPatterns.number));
      };
  
      // Determines whether or not a value is empty
      var hasValue = function(value) {
        return !(_.isNull(value) || _.isUndefined(value) || (_.isString(value) && trim(value) === '') || (_.isArray(value) && _.isEmpty(value)));
      };
  
      return {
        // Function validator
        // Lets you implement a custom function used for validation
        fn: function(value, attr, fn, model, computed) {
          if(_.isString(fn)){
            fn = model[fn];
          }
          return fn.call(model, value, attr, computed);
        },
  
        // Required validator
        // Validates if the attribute is required or not
        required: function(value, attr, required, model, computed) {
          var isRequired = _.isFunction(required) ? required.call(model, value, attr, computed) : required;
          if(!isRequired && !hasValue(value)) {
            return false; // overrides all other validators
          }
          if (isRequired && !hasValue(value)) {
            return this.format(defaultMessages.required, this.formatLabel(attr, model));
          }
        },
  
        // Acceptance validator
        // Validates that something has to be accepted, e.g. terms of use
        // `true` or 'true' are valid
        acceptance: function(value, attr, accept, model) {
          if(value !== 'true' && (!_.isBoolean(value) || value === false)) {
            return this.format(defaultMessages.acceptance, this.formatLabel(attr, model));
          }
        },
  
        // Min validator
        // Validates that the value has to be a number and equal to or greater than
        // the min value specified
        min: function(value, attr, minValue, model) {
          if (!isNumber(value) || value < minValue) {
            return this.format(defaultMessages.min, this.formatLabel(attr, model), minValue);
          }
        },
  
        // Max validator
        // Validates that the value has to be a number and equal to or less than
        // the max value specified
        max: function(value, attr, maxValue, model) {
          if (!isNumber(value) || value > maxValue) {
            return this.format(defaultMessages.max, this.formatLabel(attr, model), maxValue);
          }
        },
  
        // Range validator
        // Validates that the value has to be a number and equal to or between
        // the two numbers specified
        range: function(value, attr, range, model) {
          if(!isNumber(value) || value < range[0] || value > range[1]) {
            return this.format(defaultMessages.range, this.formatLabel(attr, model), range[0], range[1]);
          }
        },
  
        // Length validator
        // Validates that the value has to be a string with length equal to
        // the length value specified
        length: function(value, attr, length, model) {
          if (!hasValue(value) || trim(value).length !== length) {
            return this.format(defaultMessages.length, this.formatLabel(attr, model), length);
          }
        },
  
        // Min length validator
        // Validates that the value has to be a string with length equal to or greater than
        // the min length value specified
        minLength: function(value, attr, minLength, model) {
          if (!hasValue(value) || trim(value).length < minLength) {
            return this.format(defaultMessages.minLength, this.formatLabel(attr, model), minLength);
          }
        },
  
        // Max length validator
        // Validates that the value has to be a string with length equal to or less than
        // the max length value specified
        maxLength: function(value, attr, maxLength, model) {
          if (!hasValue(value) || trim(value).length > maxLength) {
            return this.format(defaultMessages.maxLength, this.formatLabel(attr, model), maxLength);
          }
        },
  
        // Range length validator
        // Validates that the value has to be a string and equal to or between
        // the two numbers specified
        rangeLength: function(value, attr, range, model) {
          if(!hasValue(value) || trim(value).length < range[0] || trim(value).length > range[1]) {
            return this.format(defaultMessages.rangeLength, this.formatLabel(attr, model), range[0], range[1]);
          }
        },
  
        // One of validator
        // Validates that the value has to be equal to one of the elements in
        // the specified array. Case sensitive matching
        oneOf: function(value, attr, values, model) {
          if(!_.include(values, value)){
            return this.format(defaultMessages.oneOf, this.formatLabel(attr, model), values.join(', '));
          }
        },
  
        // Equal to validator
        // Validates that the value has to be equal to the value of the attribute
        // with the name specified
        equalTo: function(value, attr, equalTo, model, computed) {
          if(value !== computed[equalTo]) {
            return this.format(defaultMessages.equalTo, this.formatLabel(attr, model), this.formatLabel(equalTo, model));
          }
        },
  
        // Pattern validator
        // Validates that the value has to match the pattern specified.
        // Can be a regular expression or the name of one of the built in patterns
        pattern: function(value, attr, pattern, model) {
          if (!hasValue(value) || !value.toString().match(defaultPatterns[pattern] || pattern)) {
            return this.format(defaultMessages.pattern, this.formatLabel(attr, model), pattern);
          }
        }
      };
    }());
  
    return Validation;
  }(_));
  return Backbone.Validation;
}));
// Backbone.CrossDomainModel 0.1.0
//
// (c) 2013 Victor Quinn
// Licensed under the MIT license.

(function (root, factory) {
   if (typeof define === "function" && define.amd) {
      // AMD. Register as an anonymous module.
      define('backbone.crossdomain',["underscore","backbone"], function(_, Backbone) {
        // Use global variables if the locals are undefined.
        return factory(_ || root._, Backbone || root.Backbone);
      });
   } else {
      // RequireJS isn't being used. Assume underscore and backbone are loaded in <script> tags
      factory(_, Backbone);
   }
}(this, function(_, Backbone) {

    // Helper function to determine the request url given model and options objects
    function requestUrl(model, options) {
        var requestUrl = null;
        // First try the options object
        try {
            requestUrl = options.url;
        } catch(x) {}

        // Then try the model's url
        if (!requestUrl) {
            try {
                requestUrl = _.result(model, 'url');
            } catch(x) {}
        }

        return requestUrl;
    }

    // Helper function to determine whether protocols differ.
    function protocolsDiffer(thisProtocol, requestProtocol) {
        if (thisProtocol === ':' || requestProtocol === ":") {
            return false;
        }

        else if (thisProtocol === requestProtocol) {
            return false;
        }

        return true;
    }

    // Map from CRUD to HTTP for our default `Backbone.sync` implementation.

    var methodMap = {
        'create': 'POST',
        'update': 'PUT',
        'patch':  'PATCH',
        'delete': 'DELETE',
        'read':   'GET'
    };

    Backbone.vanillaSync = Backbone.sync;

    // Override 'Backbone.sync' to default to CrossDomainModel sync.
    // the original 'Backbone.sync' is still available in 'Backbone.vanillaSync'
    Backbone.sync = function(method, model, options) {

        // See if we need to use the XDomainRequest object for IE. If the request is on the
        // same domain, we can fall back on the normal Backbone.ajax handling.
        var useXDomainRequest = false;

        // See https://gist.github.com/jlong/2428561
        var thisDomainParser = document.createElement('a');
        thisDomainParser.href = document.URL;

        var requestDomainParser = document.createElement('a');
        requestDomainParser.href = requestUrl(model, options);

        if (requestDomainParser.host !== "" && (thisDomainParser.host !== requestDomainParser.host)) {
            useXDomainRequest = true;
        }

        // Only use this if browser doesn't support CORS natively. This should
        // catch IE7/8/9 but keep IE10 using the built in XMLHttpRequest which
        // IE10 finally supports for CORS.
        if (useXDomainRequest && !Backbone.$.support.cors) {

            // See this article for more details on all the silly nuances: http://vq.io/14DJ1Tv

            // Basically Backbone.sync rewritten to use XDomainRequest object
            var type = methodMap[method];

            // Default options, unless specified.
            _.defaults(options || (options = {}), {
                emulateHTTP: Backbone.emulateHTTP,
                emulateJSON: Backbone.emulateJSON
            });

            // XDomainRequest only works with POST. So DELETE/PUT/PATCH can't work here.

            // Note: Conscious decision to throw error rather than try to munge the request and
            // do something like force "options.emulateHTTP = true" because we want developers
            // to notice they're trying to do something illegal with this request and it may
            // require server-side changes for compatibility.
            if (!options.emulateHTTP && (method === 'update' || method === 'patch' || method === 'delete')) {
                throw new Error('Backbone.CrossDomain cannot use PUT, PATCH, DELETE with XDomainRequest (IE) and emulateHTTP=false');
            }

            // Default JSON-request options.
            var params = {type: type, dataType: 'json', url: requestUrl(model, options)};

            // Ensure that we have a URL.
            if (!params.url) throw new Error('No URL!');

            // Check if protocols differ, if so try the request with the current domain protocol
            if (protocolsDiffer(thisDomainParser.protocol, requestDomainParser.protocol)) {
                params.url = params.url.replace(new RegExp(requestDomainParser.protocol), thisDomainParser.protocol);
            }

            // TODO: XDomainRequest only accepts text/plain Content-Type header

            // TODO: XDomainRequest doesn't like other headers

            // Ensure that we have the appropriate request data.
            if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
                params.data = JSON.stringify(options.attrs || model.toJSON(options));
            }

            // For older servers, emulate JSON by encoding the request into an HTML-form.
            if (options.emulateJSON) {
                params.data = params.data ? {model: params.data} : {};
            }

            // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
            // And an `X-HTTP-Method-Override` header.

            if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
                params.type = 'POST';
                if (options.emulateJSON) params.data._method = type;
                var beforeSend = options.beforeSend;
                options.beforeSend = function(xhr) {
                    xhr.setRequestHeader('X-HTTP-Method-Override', type);
                    if (beforeSend) return beforeSend.apply(this, arguments);
                };
            }

            // Don't process data on a non-GET request.
            if (params.type !== 'GET' && !options.emulateJSON) {
                params.processData = false;
            }

            // Need to send this along as key/value pairs, can't send JSON blob
            if (params.type === 'POST') {
                params.data = Backbone.$.param(Backbone.$.parseJSON(params.data));
            }

            var xdr = options.xhr = new XDomainRequest(),
                success = options.success,
                error = options.error;

            // Attach deferreds, but only if $ is jQuery (if we don't do this check,
            // we'll break support for Zepto or other libraries without promise support
            if (Backbone.$.fn.jquery) {
                var deferred = Backbone.$.Deferred(),
                    completeDeferred = Backbone.$.Callbacks("once memory");
                deferred.promise(xdr).complete = completeDeferred.add;
            }

            xdr.onload = function () {
                var obj = {};
                if (xdr.responseText) {
                    obj = Backbone.$.parseJSON(xdr.responseText);
                }
                if (obj) {
                    if(deferred) deferred.resolveWith(this, [success, 'success', xdr]);
                    success(obj);
                }
            };
            xdr.onerror = function () {
                if (error) {
                    error(model, xdr, options);
                   if(deferred) deferred.rejectWith(this, [xdr, 'error', error]);
                }
                model.trigger('error', model, xdr, options);
            };

            // Make the request using XDomainRequest
            xdr.open(params.type, params.url);

            // Must declare these even if empty or IE will abort randomly: http://vq.io/12bnhye
            xdr.onprogress = function () {};
            xdr.ontimeout = function () {};

            setTimeout(function () {
                xdr.send(params.data);
            }, 0);

            model.trigger('request', model, xdr, options);
            return xdr;
        }
        else {
            return Backbone.vanillaSync.apply(this, arguments);
        }
    };

    return Backbone;
}));
/*global define,setTimeout,clearTimeout*/
define('chiropractor/models',['require','backbone','underscore','./models/auth','backbone.deep.model','backbone.validation','underscore.mixin.deepextend','backbone.crossdomain'],function (require) {
  

  var Backbone = require('backbone'),
    _ = require('underscore'),
    auth = require('./models/auth'),
    BackboneDeepModel = require('backbone.deep.model'),
    Validation = require('backbone.validation'),
    Base,
    revision,
    userAgent,
    regExp;

  // Detecting IE
  if (navigator.appName === 'Microsoft Internet Explorer') {
    userAgent = navigator.userAgent;
    regExp = new RegExp("MSIE ([0-9]{1,}[.0-9]{0,})");
    if (regExp.exec(userAgent) !== null) {
      revision = parseFloat(RegExp.$1);
    }
  }

  require('underscore.mixin.deepextend');
  require('backbone.crossdomain');

  Base = BackboneDeepModel.DeepModel.extend({
    sync: function (method, model, options) {
      // Setup the authentication handlers for the BaseModel
      //
      if (revision >= 8) {
        // Only call auth.sync on ie8+ because it currently
        // doesnt work in ie7
        auth.sync.call(this, method, model, options);
      }
      return Backbone.Model.prototype.sync.call(
        this, method, model, options
      );
    },

    parse: function (resp, options) {
      options = options || {};
      // We need to unwrap the old WiserTogether API envelop format.
      if (resp.data && resp.meta) {
        if (parseInt(resp.meta.status, 10) >= 400) {
          options.legacyError = true;
          if (resp.meta.errors && resp.meta.errors.form) {
            this.validationError = resp.meta.errors.form;
            this.trigger(
              'invalid',
              this,
              this.validationError,
              _.extend(options || {}, {
                validationError: this.validationError
              })
            );
          } else {
            this.trigger('error', this, resp.data, options);

            if (options.error) {
              options.error(this, resp.data, options);
            }
          }
          // We do not want an error response to update the model
          // attributes (returning an empty object leaves the model
          // state as it was
          return {};
        }
        return resp.data;
      }
      return Backbone.Model.prototype.parse.apply(this, arguments);
    },

    fieldId: function (field, prefix) {
      prefix = prefix || 'formfield';
      return [prefix, field, this.cid].join('-');
    },

    set: function (attrs, options) {
      // We need to allow the legacy errors to short circuit the Backbone
      // success handler in the case of a legacy server error.
      if (options && options.legacyError) {
        delete options.legacyError;
        return false;
      }

      return BackboneDeepModel.DeepModel.prototype.set.apply(this, arguments);
    }
  });

  _.extend(Base.prototype, Validation.mixin);

  return {
    Base: Base,
    cleanup: auth.cleanup
  };
});
/*global define*/
define('chiropractor/collections',['require','backbone','underscore','underscore.mixin.deepextend','backbone.crossdomain'],function(require) {
    

    var Backbone = require('backbone'),
        _ = require('underscore'),
        Base;

    require('underscore.mixin.deepextend');
    require('backbone.crossdomain');

    Base = Backbone.Collection.extend({
    });

    return {
        Base: Base
    };
});

/*global define*/
define('chiropractor/routers',['require','backbone'],function(require) {
    

    var Backbone = require('backbone'),
        Base;

    Base = Backbone.Router.extend({
    });

    return {
        Base: Base
    };
});

/*global define*/
(function(window) {
    

    define('chiropractor/browser',['require'],function(require) {
        var ieVersion = (function() {
            var rv = -1; // Return value assumes failure.
            if (window.navigator.appName === 'Microsoft Internet Explorer') {
                var ua = window.navigator.userAgent;
                var re = new RegExp("MSIE ([0-9]{1,}[.0-9]{0,})");
                if (re.exec(ua) !== null) {
                    rv = parseFloat(RegExp.$1);
                }
            }
            return rv;
        }());
        return {
            isOldIE: ieVersion !== -1 && ieVersion < 9,
            window: window,
            navigator: window.navigator,
            document: window.document
        };
    });
}(this));

/*global define,alert*/
define('chiropractor/debug',['require','exports','module','chiropractor/browser'],function(require, exports, module) {
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

/*global define*/
define('chiropractor/hbs/ifequal',['require','handlebars'],function(require) {
    

    var Handlebars = require('handlebars');

    Handlebars.registerHelper('ifequal', function(val1, val2, options) {
        if (val1 === val2) {
            return options.fn(this);
        } else {
            return options.inverse(this);
        }
    });
});

/*global define*/
define('chiropractor/hbs/log',['require','handlebars'],function(require) {
    

    var Handlebars = require('handlebars');

    function log(context, options) {
        console.log(context);
    }
    Handlebars.registerHelper('log', log);

    return log;
});
/*global define*/
define('chiropractor/hbs',['require','./hbs/view','./hbs/ifequal','./hbs/log'],function(require) {
    

    require('./hbs/view');
    require('./hbs/ifequal');
    require('./hbs/log');
});

/*global define*/
define('chiropractor/main',['require','backbone','underscore','backbone.subroute','./views','./models','./collections','./routers','./debug','./hbs'],function(require) {
    

    var Backbone = require('backbone'),
        _ = require('underscore'),
        SubRoute = require('backbone.subroute'),
        Views = require('./views'),
        Models = require('./models'),
        Collections = require('./collections'),
        Routers = require('./routers');

    require('./debug');
    require('./hbs');

    return {
        Collection: Collections.Base,
        Collections: Collections,
        Events: Backbone.Events,
        history: Backbone.history,
        Model: Models.Base,
        Models: Models,
        Router: Routers.Base,
        SubRoute: SubRoute,
        View: Views.Base,
        Views: Views
    };
});

define('chiropractor', ['chiropractor/main'], function (main) { return main; });
}());