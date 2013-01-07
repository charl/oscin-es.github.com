(function() {
  var __slice = Array.prototype.slice;

  root = this;

  if ('ab'.split(/a*/).length < 2) {
    if (typeof console !== "undefined" && console !== null) {
      console.log("Warning: IE6 split is not ECMAScript-compliant.  This breaks '->1'");
    }
  }

  function ellipsis (fn) {
    if (fn.length < 1) return fn;

    return function () {
      var ordinaryArgs = (1 <= arguments.length ?
            __slice.call(arguments, 0, fn.length - 1) : []),
          restOfTheArgsList = __slice.call(arguments, fn.length - 1),
          args = (fn.length <= arguments.length ?
            ordinaryArgs.concat([restOfTheArgsList]) : []);

      return fn.apply(this, args);
    }
  };

  var variadic = ellipsis;

  function applyFirst (fn, first) {
    return variadic( function (args) {
      return fn.apply(this, [first].concat(args))
    })
  }

  function applyLast (fn, last) {
    return variadic( function (args) {
      return fn.apply(this, args.concat([last]))
    })
  }

  var applyLeft = variadic( function (fn, args) {
    return variadic( function (remainingArgs) {
      return fn.apply(this, args.concat(remainingArgs))
    })
  });

  var applyRight = variadic( function (fn, args) {
    return variadic( function (precedingArgs) {
      return fn.apply(this, precedingArgs.concat(args))
    })
  });

  function curry (fn) {
    var arity = fn.length;

    return given([]);

    function given (argsSoFar) {
      return function helper () {
        var updatedArgsSoFar = argsSoFar.concat(__slice.call(arguments, 0));

        if (updatedArgsSoFar.length >= arity) {
          return fn.apply(this, updatedArgsSoFar)
        }
        else return given(updatedArgsSoFar)
      }
    }

  }

  var compose = variadic( function myself (fns) {
    if (fns.length === 2) {
      var a = fns[0],
          b = fns[1];
          
      return function (c) {
        return a(b(c))
      }
    }
    else if (fns.length > 2) {
      var first = fns[0],
          butFirst = __slice.call(fns, 1);
          
      return myself.call(this, first, myself.apply(this, butFirst));
    }
  }

  var bound = variadic( function (messageName, args) {

    if (args === []) {
      return function (instance) {
        return instance[messageName].bind(instance)
      }
    }
    else {
      return function (instance) {
        return Function.prototype.bind.apply(
          instance[messageName], [instance].concat(args)
        )
      }
    }
  });

  var send = variadic( function (nameAndArgs) {
    var methodName = nameAndArgs[0],
        leftArguments = nameAndArgs.slice(1);
  
    return variadic( function (receiverAndArgs) {
      var receiver = receiverAndArgs[0],
          rightArguments = receiverAndArgs.slice(1);
      return receiver[methodName].apply(receiver, leftArguments.concat(rightArguments))
    })
  });
  
  var splat = applyFirst(applyLast, map);
  
  function maybe (fn) {
    return function () {
      var i;
      
      if (arguments.length === 0) {
        return
      }
      else {
        for (i = 0; i < arguments.length; ++i) {
          if (arguments[i] == null) return
        }
        return fn.apply(this, arguments)
      }
    }
  }

  function tap (value, fn) {

    if (fn === void 0) {
      return curried
    }
    else return curried(fn);

    function curried (fn) {
      if (typeof(fn) === 'function') {
        fn(value)
      }
      return value
    }
  }

  function fluent (methodBody) {
    return function () {
      methodBody.apply(this,arguments);
      return this
    }
  }

  function invoke (fn) {
    var args = __slice.call(arguments, 1);
    
    return function (instance) {
      return fn.apply(instance, args)
    }
  }

  function once (fn) {
    var done = false,
        testAndSet;
        
    if (!!fn.name) {
      testAndSet = function () {
        this["__once__"] || (this["__once__"] = {})
        if (this["__once__"][fn.name]) return true;
        this["__once__"][fn.name] = true;
        return false
      }
    }
    else  {
      testAndSet = function (fn) {
        if (done) return true;
        done = true;
        return false
      }
    }
    
    return function () {
      return testAndSet.call(this) ? void 0 : fn.apply(this, arguments)
    }
  }

  var unbind = function unbind (fn) {
    return fn.unbound ? unbind(fn.unbound()) : fn
  };
 
  function bind (fn, context, force) {
    var unbound, bound;
    
    if (force) {
      fn = unbind(fn)
    }
    bound = function () {
      return fn.apply(context, arguments)
    };
    bound.unbound = function () {
      return fn;
    };
    
    return bound;
  }

  function get (attr) {
    return function (object) { return object[attr]; }
  }

  function memoized (fn, keymaker) {
    var lookupTable = {},
        key,
        value;

    keymaker || (keymaker = function (args) {
      return JSON.stringify(args)
    });

    return function () {
      var key = keymaker.call(this, arguments);

      return lookupTable[key] || (
        lookupTable[key] = fn.apply(this, arguments)
      )
    }
  }

  var pluck = compose(splat, get);

  var extend = variadic( function (consumer, providers) {
    var key,
        i,
        provider;

    for (i = 0; i < providers.length; ++i) {
      provider = providers[i];
      for (key in provider) {
        if (provider.hasOwnProperty(key)) {
          consumer[key] = provider[key]
        }
      }
    }
    return consumer
  });

  function to_function (str) {
    var expr, leftSection, params, rightSection, sections, v, vars, _i, _len;
    params = [];
    expr = str;
    sections = expr.split(/\s*->\s*/m);
    if (sections.length > 1) {
      while (sections.length) {
        expr = sections.pop();
        params = sections.pop().split(/\s*,\s*|\s+/m);
        sections.length && sections.push('(function(' + params + '){return (' + expr + ')})');
      }
    } else if (expr.match(/\b_\b/)) {
      params = '_';
    } else {
      leftSection = expr.match(/^\s*(?:[+*\/%&|\^\.=<>]|!=)/m);
      rightSection = expr.match(/[+\-*\/%&|\^\.=<>!]\s*$/m);
      if (leftSection || rightSection) {
        if (leftSection) {
          params.push('$1');
          expr = '$1' + expr;
        }
        if (rightSection) {
          params.push('$2');
          expr = expr + '$2';
        }
      } else {
        vars = str.replace(/(?:\b[A-Z]|\.[a-zA-Z_$])[a-zA-Z_$\d]*|[a-zA-Z_$][a-zA-Z_$\d]*\s*:|this|arguments|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, '').match(/([a-z_$][a-z_$\d]*)/gi) || [];
        for (_i = 0, _len = vars.length; _i < _len; _i++) {
          v = vars[_i];
          params.indexOf(v) >= 0 || params.push(v);
        }
      }
    }
    return new Function(params, 'return (' + expr + ')');
  };

  function functionalize (fn) {
    if (typeof fn === 'function') {
      return fn;
    } else if (typeof fn === 'string' && /^[_a-zA-Z]\w*$/.test(fn)) {
      return function() {
        var args, receiver, _ref;
        receiver = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return (_ref = receiver[fn]).call.apply(_ref, [receiver].concat(__slice.call(args)));
      };
    } else if (typeof fn === 'string') {
      return to_function(fn);
    } else if (typeof fn.lambda === 'function') {
      return fn.lambda();
    } else if (typeof fn.toFunction === 'function') {
      return fn.toFunction();
    }
  };

}).call(this);
