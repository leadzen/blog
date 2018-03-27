(function (PromiseClass) {
  function Promise(func) {
    if (typeof func !== "function")
      throw TypeError("Promise resolver " + String(func) + " is not a function");
    var node = Node();
    node.thencall(func);
    return promisify(node);
  }

  Promise.resolve = function (value) {
    return (value instanceof PromiseClass)
      ? value
      : promisify(Node().fulfill(value));
  };

  Promise.reject = function (reason) {
    return promisify(Node().reject(reason));
  };

  var prototype = Promise.prototype = PromiseClass.prototype;
  function promisify(node, child) {
    return Object.setPrototypeOf({
      then(resolver, rejector) {
        child = Node(resolver, rejector);
        return promisify(node.attach(child));
      },
      catch(rejector) {
        child = Node(null, rejector);
        return promisify(node.attach(child));
      }
    }, prototype);
  };

  function next(func, ...args) {
    setTimeout(func, 0, ...args);
  }

  function Node(_resolver, _rejector, _this, _state, _result, _pendings) {
    _state = 0;
    _pendings = [];

    return _this = {
      thencall: _thencall,
      attach: _attach,
      then: _then,
      fulfill: _fulfill,
      reject: _reject
    }

    function _thencall(func, me) {
      try {
        func.call(me, _fulfill, _reject);
      }
      catch (reason) {
        _reject(reason);
      }
    }

    function _attach(node) {
      if (_state) {
        next(_fork, node);
      }
      else {
        _pendings.push(node);
      }
      return node;
    }

    function _fulfill(value) {
      next(_resolve, 1, value);
      return _this;
    }

    function _reject(reason) {
      next(_resolve, -1, reason);
      return _this;
    }

    // 根据结果状态着手解决当前节点
    function _resolve(state, result) {
      if (state > 0) {
        if (result instanceof PromiseClass) {
          result.then(_fulfill, _reject);
        }
        else if (typeof result === "object" && result && typeof result.then === "function") {
          _thencall(result.then, result);
        }
        else {
          _resolved(state, result);
        }
      }
      else if (state < 0) {
        _resolved(state, result);
      }
      else {
        throw Error("_resolve() invoked in worng state!");  // for debug
      }
    }

    // 解决完成当前节点并继续执行所有后续分叉节点
    function _resolved(state, result, length) {
      _state = state;
      _result = result;
      if (length = _pendings.length) {
        for (var i = 0; i < length; i++) {
          var node = _pendings[i];
          next(_fork, node);
        }
        // _pendings.length = 0; // clear pendings;
      }
      else if (state < 0) {
        if (result instanceof Error) {
          result.message += " (in promise)";
        }
        throw result;
      }
    }

    function _fork(node) {
      node.then(_state, _result);
    }

    function _then(state, result) {
      try {
        if (state > 0) {
          if (typeof _resolver === "function") {
            result = _resolver(result);
          }
        }
        else if (state < 0) {
          if (typeof _rejector === "function") {
            result = _rejector(result);
          }
        }
        state = 1;
      }
      catch (reason) {
        state = -1;
        result = reason;
      }
      next(_resolve, state, result);
    }
  }

  this.Promise = Promise;
})(Promise);
