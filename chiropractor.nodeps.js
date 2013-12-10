(function () {
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