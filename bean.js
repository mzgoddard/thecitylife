// connect to canvas
var Module = {
  preRun: [],
  postRun: [],
  print: (function() {
    var element = document.getElementById('output');
    element.value = ''; // clear browser cache
    return function(text) {
      text = Array.prototype.slice.call(arguments).join(' ');
      // These replacements are necessary if you render to raw HTML
      //text = text.replace(/&/g, "&amp;");
      //text = text.replace(/</g, "&lt;");
      //text = text.replace(/>/g, "&gt;");
      //text = text.replace('\n', '<br>', 'g');
      element.value += text + "\n";
      element.scrollTop = 99999; // focus on bottom
      console.log( text );
    };
  })(),
  printErr: function(text) {
    // text = Array.prototype.slice.call(arguments).join(' ');
    // console.error(text);
  },
  canvas: document.getElementById('canvas'),
  setStatus: function(text) {
    if (Module.setStatus.interval) clearInterval(Module.setStatus.interval);
    var m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
    var statusElement = document.getElementById('status');
    var progressElement = document.getElementById('progress');
    if (!progressElement) {
      return;
    }
    if (m) {
      text = m[1];
      progressElement.value = parseInt(m[2])*100;
      progressElement.max = parseInt(m[4])*100;
      progressElement.hidden = false;
    } else {
      progressElement.value = null;
      progressElement.max = null;
      progressElement.hidden = true;
    }
    statusElement.innerHTML = text;
  },
  totalDependencies: 0,
  monitorRunDependencies: function(left) {
    this.totalDependencies = Math.max(this.totalDependencies, left);
    Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies-left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
  }
};
Module.setStatus('Downloading...');

window.define = function(factory) {
  try{ delete window.define; } catch(e){ window.define = void 0; } // IE
  window.when = factory();
};
window.define.amd = {};

/** @license MIT License (c) copyright 2011-2013 original author or authors */

/**
 * A lightweight CommonJS Promises/A and when() implementation
 * when is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author Brian Cavalier
 * @author John Hann
 * @version 2.2.1
 */
(function(define, global) { 'use strict';
define(function () {

	// Public API

	when.promise   = promise;    // Create a pending promise
	when.resolve   = resolve;    // Create a resolved promise
	when.reject    = reject;     // Create a rejected promise
	when.defer     = defer;      // Create a {promise, resolver} pair

	when.join      = join;       // Join 2 or more promises

	when.all       = all;        // Resolve a list of promises
	when.map       = map;        // Array.map() for promises
	when.reduce    = reduce;     // Array.reduce() for promises
	when.settle    = settle;     // Settle a list of promises

	when.any       = any;        // One-winner race
	when.some      = some;       // Multi-winner race

	when.isPromise = isPromise;  // Determine if a thing is a promise


	/**
	 * Register an observer for a promise or immediate value.
	 *
	 * @param {*} promiseOrValue
	 * @param {function?} [onFulfilled] callback to be called when promiseOrValue is
	 *   successfully fulfilled.  If promiseOrValue is an immediate value, callback
	 *   will be invoked immediately.
	 * @param {function?} [onRejected] callback to be called when promiseOrValue is
	 *   rejected.
	 * @param {function?} [onProgress] callback to be called when progress updates
	 *   are issued for promiseOrValue.
	 * @returns {Promise} a new {@link Promise} that will complete with the return
	 *   value of callback or errback or the completion value of promiseOrValue if
	 *   callback and/or errback is not supplied.
	 */
	function when(promiseOrValue, onFulfilled, onRejected, onProgress) {
		// Get a trusted promise for the input promiseOrValue, and then
		// register promise handlers
		return resolve(promiseOrValue).then(onFulfilled, onRejected, onProgress);
	}

	/**
	 * Trusted Promise constructor.  A Promise created from this constructor is
	 * a trusted when.js promise.  Any other duck-typed promise is considered
	 * untrusted.
	 * @constructor
	 * @name Promise
	 */
	function Promise(then, inspect) {
		this.then = then;
		this.inspect = inspect;
	}

	Promise.prototype = {
		/**
		 * Register a rejection handler.  Shortcut for .then(undefined, onRejected)
		 * @param {function?} onRejected
		 * @return {Promise}
		 */
		otherwise: function(onRejected) {
			return this.then(undef, onRejected);
		},

		/**
		 * Ensures that onFulfilledOrRejected will be called regardless of whether
		 * this promise is fulfilled or rejected.  onFulfilledOrRejected WILL NOT
		 * receive the promises' value or reason.  Any returned value will be disregarded.
		 * onFulfilledOrRejected may throw or return a rejected promise to signal
		 * an additional error.
		 * @param {function} onFulfilledOrRejected handler to be called regardless of
		 *  fulfillment or rejection
		 * @returns {Promise}
		 */
		ensure: function(onFulfilledOrRejected) {
			return this.then(injectHandler, injectHandler)['yield'](this);

			function injectHandler() {
				return resolve(onFulfilledOrRejected());
			}
		},

		/**
		 * Shortcut for .then(function() { return value; })
		 * @param  {*} value
		 * @return {Promise} a promise that:
		 *  - is fulfilled if value is not a promise, or
		 *  - if value is a promise, will fulfill with its value, or reject
		 *    with its reason.
		 */
		'yield': function(value) {
			return this.then(function() {
				return value;
			});
		},

		/**
		 * Assumes that this promise will fulfill with an array, and arranges
		 * for the onFulfilled to be called with the array as its argument list
		 * i.e. onFulfilled.apply(undefined, array).
		 * @param {function} onFulfilled function to receive spread arguments
		 * @return {Promise}
		 */
		spread: function(onFulfilled) {
			return this.then(function(array) {
				// array may contain promises, so resolve its contents.
				return all(array, function(array) {
					return onFulfilled.apply(undef, array);
				});
			});
		},

		/**
		 * Shortcut for .then(onFulfilledOrRejected, onFulfilledOrRejected)
		 * @deprecated
		 */
		always: function(onFulfilledOrRejected, onProgress) {
			return this.then(onFulfilledOrRejected, onFulfilledOrRejected, onProgress);
		}
	};

	/**
	 * Returns a resolved promise. The returned promise will be
	 *  - fulfilled with promiseOrValue if it is a value, or
	 *  - if promiseOrValue is a promise
	 *    - fulfilled with promiseOrValue's value after it is fulfilled
	 *    - rejected with promiseOrValue's reason after it is rejected
	 * @param  {*} value
	 * @return {Promise}
	 */
	function resolve(value) {
		return promise(function(resolve) {
			resolve(value);
		});
	}

	/**
	 * Returns a rejected promise for the supplied promiseOrValue.  The returned
	 * promise will be rejected with:
	 * - promiseOrValue, if it is a value, or
	 * - if promiseOrValue is a promise
	 *   - promiseOrValue's value after it is fulfilled
	 *   - promiseOrValue's reason after it is rejected
	 * @param {*} promiseOrValue the rejected value of the returned {@link Promise}
	 * @return {Promise} rejected {@link Promise}
	 */
	function reject(promiseOrValue) {
		return when(promiseOrValue, rejected);
	}

	/**
	 * Creates a {promise, resolver} pair, either or both of which
	 * may be given out safely to consumers.
	 * The resolver has resolve, reject, and progress.  The promise
	 * has then plus extended promise API.
	 *
	 * @return {{
	 * promise: Promise,
	 * resolve: function:Promise,
	 * reject: function:Promise,
	 * notify: function:Promise
	 * resolver: {
	 *	resolve: function:Promise,
	 *	reject: function:Promise,
	 *	notify: function:Promise
	 * }}}
	 */
	function defer() {
		var deferred, pending, resolved;

		// Optimize object shape
		deferred = {
			promise: undef, resolve: undef, reject: undef, notify: undef,
			resolver: { resolve: undef, reject: undef, notify: undef }
		};

		deferred.promise = pending = promise(makeDeferred);

		return deferred;

		function makeDeferred(resolvePending, rejectPending, notifyPending) {
			deferred.resolve = deferred.resolver.resolve = function(value) {
				if(resolved) {
					return resolve(value);
				}
				resolved = true;
				resolvePending(value);
				return pending;
			};

			deferred.reject  = deferred.resolver.reject  = function(reason) {
				if(resolved) {
					return resolve(rejected(reason));
				}
				resolved = true;
				rejectPending(reason);
				return pending;
			};

			deferred.notify  = deferred.resolver.notify  = function(update) {
				notifyPending(update);
				return update;
			};
		}
	}

	/**
	 * Creates a new promise whose fate is determined by resolver.
	 * @param {function} resolver function(resolve, reject, notify)
	 * @returns {Promise} promise whose fate is determine by resolver
	 */
	function promise(resolver) {
		return _promise(resolver, monitorApi.PromiseStatus && monitorApi.PromiseStatus());
	}

	/**
	 * Creates a new promise, linked to parent, whose fate is determined
	 * by resolver.
	 * @param {function} resolver function(resolve, reject, notify)
	 * @param {Promise?} status promise from which the new promise is begotten
	 * @returns {Promise} promise whose fate is determine by resolver
	 * @private
	 */
	function _promise(resolver, status) {
		var self, value, handlers = [];

		self = new Promise(then, inspect);

		// Call the provider resolver to seal the promise's fate
		try {
			resolver(promiseResolve, promiseReject, promiseNotify);
		} catch(e) {
			promiseReject(e);
		}

		// Return the promise
		return self;

		/**
		 * Register handlers for this promise.
		 * @param [onFulfilled] {Function} fulfillment handler
		 * @param [onRejected] {Function} rejection handler
		 * @param [onProgress] {Function} progress handler
		 * @return {Promise} new Promise
		 */
		function then(onFulfilled, onRejected, onProgress) {
			var next = _promise(function(resolve, reject, notify) {
				// if not resolved, push onto handlers, otherwise execute asap
				// but not in the current stack
				handlers ? handlers.push(run) : enqueue(function() { run(value); });

				function run(p) {
					p.then(onFulfilled, onRejected, onProgress)
						.then(resolve, reject, notify);
				}

			}, status && status.observed());

			return next;
		}

		function inspect() {
			return value ? value.inspect() : toPendingState();
		}

		/**
		 * Transition from pre-resolution state to post-resolution state, notifying
		 * all listeners of the ultimate fulfillment or rejection
		 * @param {*|Promise} val resolution value
		 */
		function promiseResolve(val) {
			if(!handlers) {
				return;
			}

			value = coerce(val);
			scheduleHandlers(handlers, value);
			handlers = undef;

			if (status) {
				value.then(
					function () { status.fulfilled(); },
					function(r) { status.rejected(r); }
				);
			}
		}

		/**
		 * Reject this promise with the supplied reason, which will be used verbatim.
		 * @param {*} reason reason for the rejection
		 */
		function promiseReject(reason) {
			promiseResolve(rejected(reason));
		}

		/**
		 * Issue a progress event, notifying all progress listeners
		 * @param {*} update progress event payload to pass to all listeners
		 */
		function promiseNotify(update) {
			if(handlers) {
				scheduleHandlers(handlers, progressing(update));
			}
		}
	}

	/**
	 * Coerces x to a trusted Promise
	 *
	 * @private
	 * @param {*} x thing to coerce
	 * @returns {Promise} Guaranteed to return a trusted Promise.  If x
	 *   is trusted, returns x, otherwise, returns a new, trusted, already-resolved
	 *   Promise whose resolution value is:
	 *   * the resolution value of x if it's a foreign promise, or
	 *   * x if it's a value
	 */
	function coerce(x) {
		if(x instanceof Promise) {
			return x;
		}

		if (!(x === Object(x) && 'then' in x)) {
			return fulfilled(x);
		}

		return promise(function(resolve, reject, notify) {
			enqueue(function() {
				try {
					// We must check and assimilate in the same tick, but not the
					// current tick, careful only to access promiseOrValue.then once.
					var untrustedThen = x.then;

					if(typeof untrustedThen === 'function') {
						fcall(untrustedThen, x, resolve, reject, notify);
					} else {
						// It's a value, create a fulfilled wrapper
						resolve(fulfilled(x));
					}

				} catch(e) {
					// Something went wrong, reject
					reject(e);
				}
			});
		});
	}

	/**
	 * Create an already-fulfilled promise for the supplied value
	 * @private
	 * @param {*} value
	 * @return {Promise} fulfilled promise
	 */
	function fulfilled(value) {
		var self = new Promise(function (onFulfilled) {
			try {
				return typeof onFulfilled == 'function'
					? coerce(onFulfilled(value)) : self;
			} catch (e) {
				return rejected(e);
			}
		}, function() {
			return toFulfilledState(value);
		});

		return self;
	}

	/**
	 * Create an already-rejected promise with the supplied rejection reason.
	 * @private
	 * @param {*} reason
	 * @return {Promise} rejected promise
	 */
	function rejected(reason) {
		var self = new Promise(function (_, onRejected) {
			try {
				return typeof onRejected == 'function'
					? coerce(onRejected(reason)) : self;
			} catch (e) {
				return rejected(e);
			}
		}, function() {
			return toRejectedState(reason);
		});

		return self;
	}

	/**
	 * Create a progress promise with the supplied update.
	 * @private
	 * @param {*} update
	 * @return {Promise} progress promise
	 */
	function progressing(update) {
		var self = new Promise(function (_, __, onProgress) {
			try {
				return typeof onProgress == 'function'
					? progressing(onProgress(update)) : self;
			} catch (e) {
				return progressing(e);
			}
		});

		return self;
	}

	/**
	 * Schedule a task that will process a list of handlers
	 * in the next queue drain run.
	 * @private
	 * @param {Array} handlers queue of handlers to execute
	 * @param {*} value passed as the only arg to each handler
	 */
	function scheduleHandlers(handlers, value) {
		enqueue(function() {
			var handler, i = 0;
			while (handler = handlers[i++]) {
				handler(value);
			}
		});
	}

	/**
	 * Determines if promiseOrValue is a promise or not
	 *
	 * @param {*} promiseOrValue anything
	 * @returns {boolean} true if promiseOrValue is a {@link Promise}
	 */
	function isPromise(promiseOrValue) {
		return promiseOrValue && typeof promiseOrValue.then === 'function';
	}

	/**
	 * Initiates a competitive race, returning a promise that will resolve when
	 * howMany of the supplied promisesOrValues have resolved, or will reject when
	 * it becomes impossible for howMany to resolve, for example, when
	 * (promisesOrValues.length - howMany) + 1 input promises reject.
	 *
	 * @param {Array} promisesOrValues array of anything, may contain a mix
	 *      of promises and values
	 * @param howMany {number} number of promisesOrValues to resolve
	 * @param {function?} [onFulfilled] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onRejected] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onProgress] DEPRECATED, use returnedPromise.then()
	 * @returns {Promise} promise that will resolve to an array of howMany values that
	 *  resolved first, or will reject with an array of
	 *  (promisesOrValues.length - howMany) + 1 rejection reasons.
	 */
	function some(promisesOrValues, howMany, onFulfilled, onRejected, onProgress) {

		return when(promisesOrValues, function(promisesOrValues) {

			return promise(resolveSome).then(onFulfilled, onRejected, onProgress);

			function resolveSome(resolve, reject, notify) {
				var toResolve, toReject, values, reasons, fulfillOne, rejectOne, len, i;

				len = promisesOrValues.length >>> 0;

				toResolve = Math.max(0, Math.min(howMany, len));
				values = [];

				toReject = (len - toResolve) + 1;
				reasons = [];

				// No items in the input, resolve immediately
				if (!toResolve) {
					resolve(values);

				} else {
					rejectOne = function(reason) {
						reasons.push(reason);
						if(!--toReject) {
							fulfillOne = rejectOne = identity;
							reject(reasons);
						}
					};

					fulfillOne = function(val) {
						// This orders the values based on promise resolution order
						values.push(val);
						if (!--toResolve) {
							fulfillOne = rejectOne = identity;
							resolve(values);
						}
					};

					for(i = 0; i < len; ++i) {
						if(i in promisesOrValues) {
							when(promisesOrValues[i], fulfiller, rejecter, notify);
						}
					}
				}

				function rejecter(reason) {
					rejectOne(reason);
				}

				function fulfiller(val) {
					fulfillOne(val);
				}
			}
		});
	}

	/**
	 * Initiates a competitive race, returning a promise that will resolve when
	 * any one of the supplied promisesOrValues has resolved or will reject when
	 * *all* promisesOrValues have rejected.
	 *
	 * @param {Array|Promise} promisesOrValues array of anything, may contain a mix
	 *      of {@link Promise}s and values
	 * @param {function?} [onFulfilled] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onRejected] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onProgress] DEPRECATED, use returnedPromise.then()
	 * @returns {Promise} promise that will resolve to the value that resolved first, or
	 * will reject with an array of all rejected inputs.
	 */
	function any(promisesOrValues, onFulfilled, onRejected, onProgress) {

		function unwrapSingleResult(val) {
			return onFulfilled ? onFulfilled(val[0]) : val[0];
		}

		return some(promisesOrValues, 1, unwrapSingleResult, onRejected, onProgress);
	}

	/**
	 * Return a promise that will resolve only once all the supplied promisesOrValues
	 * have resolved. The resolution value of the returned promise will be an array
	 * containing the resolution values of each of the promisesOrValues.
	 * @memberOf when
	 *
	 * @param {Array|Promise} promisesOrValues array of anything, may contain a mix
	 *      of {@link Promise}s and values
	 * @param {function?} [onFulfilled] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onRejected] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onProgress] DEPRECATED, use returnedPromise.then()
	 * @returns {Promise}
	 */
	function all(promisesOrValues, onFulfilled, onRejected, onProgress) {
		return _map(promisesOrValues, identity).then(onFulfilled, onRejected, onProgress);
	}

	/**
	 * Joins multiple promises into a single returned promise.
	 * @return {Promise} a promise that will fulfill when *all* the input promises
	 * have fulfilled, or will reject when *any one* of the input promises rejects.
	 */
	function join(/* ...promises */) {
		return _map(arguments, identity);
	}

	/**
	 * Settles all input promises such that they are guaranteed not to
	 * be pending once the returned promise fulfills. The returned promise
	 * will always fulfill, except in the case where `array` is a promise
	 * that rejects.
	 * @param {Array|Promise} array or promise for array of promises to settle
	 * @returns {Promise} promise that always fulfills with an array of
	 *  outcome snapshots for each input promise.
	 */
	function settle(array) {
		return _map(array, toFulfilledState, toRejectedState);
	}

	/**
	 * Promise-aware array map function, similar to `Array.prototype.map()`,
	 * but input array may contain promises or values.
	 * @param {Array|Promise} array array of anything, may contain promises and values
	 * @param {function} mapFunc map function which may return a promise or value
	 * @returns {Promise} promise that will fulfill with an array of mapped values
	 *  or reject if any input promise rejects.
	 */
	function map(array, mapFunc) {
		return _map(array, mapFunc);
	}

	/**
	 * Internal map that allows a fallback to handle rejections
	 * @param {Array|Promise} array array of anything, may contain promises and values
	 * @param {function} mapFunc map function which may return a promise or value
	 * @param {function?} fallback function to handle rejected promises
	 * @returns {Promise} promise that will fulfill with an array of mapped values
	 *  or reject if any input promise rejects.
	 */
	function _map(array, mapFunc, fallback) {
		return when(array, function(array) {

			return promise(resolveMap);

			function resolveMap(resolve, reject, notify) {
				var results, len, toResolve, i;

				// Since we know the resulting length, we can preallocate the results
				// array to avoid array expansions.
				toResolve = len = array.length >>> 0;
				results = [];

				if(!toResolve) {
					resolve(results);
					return;
				}

				// Since mapFunc may be async, get all invocations of it into flight
				for(i = 0; i < len; i++) {
					if(i in array) {
						resolveOne(array[i], i);
					} else {
						--toResolve;
					}
				}

				function resolveOne(item, i) {
					when(item, mapFunc, fallback).then(function(mapped) {
						results[i] = mapped;

						if(!--toResolve) {
							resolve(results);
						}
					}, reject, notify);
				}
			}
		});
	}

	/**
	 * Traditional reduce function, similar to `Array.prototype.reduce()`, but
	 * input may contain promises and/or values, and reduceFunc
	 * may return either a value or a promise, *and* initialValue may
	 * be a promise for the starting value.
	 *
	 * @param {Array|Promise} promise array or promise for an array of anything,
	 *      may contain a mix of promises and values.
	 * @param {function} reduceFunc reduce function reduce(currentValue, nextValue, index, total),
	 *      where total is the total number of items being reduced, and will be the same
	 *      in each call to reduceFunc.
	 * @returns {Promise} that will resolve to the final reduced value
	 */
	function reduce(promise, reduceFunc /*, initialValue */) {
		var args = fcall(slice, arguments, 1);

		return when(promise, function(array) {
			var total;

			total = array.length;

			// Wrap the supplied reduceFunc with one that handles promises and then
			// delegates to the supplied.
			args[0] = function (current, val, i) {
				return when(current, function (c) {
					return when(val, function (value) {
						return reduceFunc(c, value, i, total);
					});
				});
			};

			return reduceArray.apply(array, args);
		});
	}

	// Snapshot states

	/**
	 * Creates a fulfilled state snapshot
	 * @private
	 * @param {*} x any value
	 * @returns {{state:'fulfilled',value:*}}
	 */
	function toFulfilledState(x) {
		return { state: 'fulfilled', value: x };
	}

	/**
	 * Creates a rejected state snapshot
	 * @private
	 * @param {*} x any reason
	 * @returns {{state:'rejected',reason:*}}
	 */
	function toRejectedState(x) {
		return { state: 'rejected', reason: x };
	}

	/**
	 * Creates a pending state snapshot
	 * @private
	 * @returns {{state:'pending'}}
	 */
	function toPendingState() {
		return { state: 'pending' };
	}

	//
	// Utilities, etc.
	//

	var reduceArray, slice, fcall, nextTick, handlerQueue,
		setTimeout, funcProto, call, arrayProto, monitorApi, undef;

	//
	// Shared handler queue processing
	//
	// Credit to Twisol (https://github.com/Twisol) for suggesting
	// this type of extensible queue + trampoline approach for
	// next-tick conflation.

	handlerQueue = [];

	/**
	 * Enqueue a task. If the queue is not currently scheduled to be
	 * drained, schedule it.
	 * @param {function} task
	 */
	function enqueue(task) {
		if(handlerQueue.push(task) === 1) {
			nextTick(drainQueue);
		}
	}

	/**
	 * Drain the handler queue entirely, being careful to allow the
	 * queue to be extended while it is being processed, and to continue
	 * processing until it is truly empty.
	 */
	function drainQueue() {
		var task, i = 0;

		while(task = handlerQueue[i++]) {
			task();
		}

		handlerQueue = [];
	}

	//
	// Capture function and array utils
	//
	/*global setImmediate,process,vertx*/

	// Allow attaching the monitor to when() if env has no console
	monitorApi = typeof console != 'undefined' ? console : when;

	// capture setTimeout to avoid being caught by fake timers used in time based tests
	setTimeout = global.setTimeout;
	// Prefer setImmediate, cascade to node, vertx and finally setTimeout
	nextTick = typeof setImmediate === 'function' ? setImmediate.bind(global)
		: typeof process === 'object' && process.nextTick ? process.nextTick
		: typeof vertx === 'object' ? vertx.runOnLoop // vert.x
			: function(task) { setTimeout(task, 0); }; // fallback

	// Safe function calls
	funcProto = Function.prototype;
	call = funcProto.call;
	fcall = funcProto.bind
		? call.bind(call)
		: function(f, context) {
			return f.apply(context, slice.call(arguments, 2));
		};

	// Safe array ops
	arrayProto = [];
	slice = arrayProto.slice;

	// ES5 reduce implementation if native not available
	// See: http://es5.github.com/#x15.4.4.21 as there are many
	// specifics and edge cases.  ES5 dictates that reduce.length === 1
	// This implementation deviates from ES5 spec in the following ways:
	// 1. It does not check if reduceFunc is a Callable
	reduceArray = arrayProto.reduce ||
		function(reduceFunc /*, initialValue */) {
			/*jshint maxcomplexity: 7*/
			var arr, args, reduced, len, i;

			i = 0;
			arr = Object(this);
			len = arr.length >>> 0;
			args = arguments;

			// If no initialValue, use first item of array (we know length !== 0 here)
			// and adjust i to start at second item
			if(args.length <= 1) {
				// Skip to the first real element in the array
				for(;;) {
					if(i in arr) {
						reduced = arr[i++];
						break;
					}

					// If we reached the end of the array without finding any real
					// elements, it's a TypeError
					if(++i >= len) {
						throw new TypeError();
					}
				}
			} else {
				// If initialValue provided, use it
				reduced = args[1];
			}

			// Do the actual reduce
			for(;i < len; ++i) {
				if(i in arr) {
					reduced = reduceFunc(reduced, arr[i], i, arr);
				}
			}

			return reduced;
		};

	function identity(x) {
		return x;
	}

	return when;
});
})(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(); },
	this
);

(function( fn ) {
  window.Diskette = fn(
    typeof diskette !== 'undefined' ? diskette : { when: window.when }
  );
}(function( diskette ) {
  var slice = [].slice;

  var when;
  (function() {
    if ( typeof window === 'undefined' ) {
      when = require( 'when' );
    } else {
      when = diskette.when;
    }
  }());

  var load = (function() {
    if ( typeof window === 'undefined' ) {
      var fs = require( 'fs' );
      var nodefn = require( 'when/node/function' );

      return nodefn.lift(function( path, cb ) {
        fs.readFile( path, 'utf8', cb );
      });
    } else {
      return function( path, responseType ) {
        var defer = when.defer();

        var xhr = new XMLHttpRequest();
        xhr.open( 'GET', path );
        xhr.responseType = responseType === 'string' ? '' : 'blob';
        xhr.onload = function( e ) {
          if ( xhr.status >= 400 ) {
            defer.reject( new Error( 'Server returned an error.' ) );
          } else {
            defer.resolve( xhr.response );
          }
        };
        xhr.onerror = function( e ) {
          defer.reject( e );
        };
        xhr.send();

        return defer.promise;
      };
    }
  }());

  function Diskette() {
    this._configPath = '';
    this._config = {};
    this._files = {};

    this._whenConfigDefer = when.defer();
    this._whenConfig = this._whenConfigDefer.promise;

    this._dbDefer = when.defer();
    this._dbPromise = this._dbDefer.promise;

    this._defer = when.defer();
    this.promise = this._defer.promise;
  }

  var _initDb = function() {
    var self = this;
    var req = indexedDB.deleteDatabase( '_diskette' );

    req.onsuccess = req.onerror = function() {
      var req = indexedDB.open( '_diskette', 1 );

      req.onupgradeneeded = function( e ) {
        var db = this.result;

        // reset for now
        if ( db.objectStoreNames.contains( self._configPath )) {
          db.deleteObjectStore( self._configPath );
        }

        db.createObjectStore( self._configPath, {
          autoIncrement: false
        });
      };

      req.onsuccess = function() {
        var db = this.result;
        db.close();
        self._dbDefer.resolve();
      };
      req.onerror = self._dbDefer.reject;
    };

    return self._dbPromise;
  };

  var _getDb = function() {
    var defer = when.defer();
    var req = indexedDB.open( '_diskette', 1 );

    req.onsuccess = function() {
      var db = this.result;
      defer.resolve( db );
    };
    req.onerror = defer.reject;
    return defer.promise;
  };

  var _writeBlock = function( file, data ) {
    var defer = when.defer();

    var self = this;
    // var request = indexedDB.open( '_diskette' );
    var db = null;
    _getDb.call( this ).then(function( _db ) {
      db = _db;

      var objectStore = db
        .transaction( self._configPath, 'readonly' )
        .objectStore( self._configPath );

      var request = objectStore.get( file.config.name || file.config );

      request.onsuccess = function() {
        var contents = this.result;

        var fileReader = new FileReader();
        fileReader.onloadend = function() {
          var objectStore = db
            .transaction( self._configPath, 'readwrite' )
            .objectStore( self._configPath );

          var request = objectStore.put(
            this.result,
            file.config.name || file.config
          );

          request.onsuccess = function() {
            defer.resolve();
          };
          request.onerror = defer.reject;
        };
        fileReader.onerror = defer.reject;

        fileReader.readAsArrayBuffer(
          new Blob( contents ? [ contents, data ] : [ data ])
        );
      };
      request.onerror = defer.reject;

      return defer.promise;
    }).otherwise( defer.reject )
      .ensure(function() {
        db.close();
      });

    return defer.promise;
  };

  var _readFile = function( file, type ) {
    var defer = when.defer();

    var self = this;
    var db = null;
    _getDb.call( this ).then(function( _db ) {
      db = _db;

      var objectStore = db
        .transaction( self._configPath, 'readonly' )
        .objectStore( self._configPath );
      var request = objectStore.get( file.name );

      request.onsuccess = function() {
        var contents = new Blob([ this.result ]);
        var fileReader = new FileReader();
        fileReader.onloadend = function() {
          defer.resolve( fileReader.result );
        };
        fileReader.onerror = defer.reject;

        if ( type === 'string' ) {
          fileReader.readAsText( contents );
        } else if ( type === 'url' ) {
          fileReader.readAsDataURL( contents );
        } else {
          fileReader.readAsArrayBuffer( contents );
        }
      };
      request.onerror = defer.reject;

      return defer.promise;
    }).otherwise( defer.reject )
      .ensure(function() {
        db.close();
      });

    return defer.promise;
  };

  var _getUrl = function( file ) {
    return _readFile.call( this, file, 'url' );
  };

  var _getFile = function( path ) {
    var file = this._files[ path ];
    if ( !file ) {
      file = this._files[ path ] = {
        config: { name: path },
        blocks: [],
        _complete: when.defer(),
        complete: null,
        _read: null,
        _url: null
      };
      file.complete = file._complete.promise;
    }

    return file;
  };

  var _isFileListed = function( path ) {
    if ( !this._config || !this._config.files ) {
      return false;
    }

    for ( var i = 0; i < this._config.files.length; ++i ) {
      var file = this._config.files[ i ];
      if ( ( file.name || file ) === path ) {
        return true;
      }
    }
    return false;
  };

  var _getBaseUrl = function( path ) {
    return this._configPath
      .substring( 0, this._configPath.lastIndexOf( '/' ) + 1 );
  };

  var _loadFile = function( name ) {
    var self = this;
    var baseUrl = _getBaseUrl.call( self );

    var file = _getFile.call( self, name );

    if ( !file._complete ) {
      return file.complete;
    }

    var complete = file._complete;
    file._complete = null;
    file.complete = load( baseUrl + name, 'binary' ).then(function( data ) {
      return _writeBlock.call( self, file, data )
        .yield( file.config )
        .then( complete.resolve, complete.reject, complete.notify );
    });

    return file.complete;
  };

  var _loadBlocks = function() {
    var allComplete = [];
    var baseUrl =
      this._configPath.substring( 0, this._configPath.lastIndexOf( '/' ) + 1 );

    var self = this;
    self._config.files.forEach(function( file ) {
      var filePromiseSet = _getFile.call( self, file.name || file );
      filePromiseSet.config =
        typeof file === 'string' ? { name: file } : file;

      if ( file.blocks ) {
        filePromiseSet.blocks =
          file.blocks.map(function() { return when.defer(); });

        filePromiseSet.complete = when.map(
          filePromiseSet.blocks,
          function( v ) {
            return v.promise;
          }
        ).yield( filePromiseSet.config );

        var complete = filePromiseSet._complete;
        filePromiseSet.complete
          .then( complete.resolve, complete.reject, complete.notify );
      } else {
        _loadFile.call( this, file.name || file );
      }

      allComplete.push( filePromiseSet.complete );
    }, self );

    if ( self._config.blocks ) {
      self._config.blocks.forEach(function( block ) {
        load( baseUrl + block.path, 'binary' ).then(function( data ) {
          block.ranges.forEach(function( range ) {
            var file = self._files[ range.filename ];
            var fileBlocks = file.blocks;
            var blockDefer = fileBlocks[ range.index ];

            when.all(
              fileBlocks.slice( 0, range.index )
                .map(function( v ) { return v.promise; })
            ).then(function( values ) {
              return _writeBlock.call(
                self, file, data.slice( range.start, range.end )
              );
            }).then( blockDefer.resolve, blockDefer.reject, blockDefer.notify );
          });
        });
      }, self );
    }

    return when.all( allComplete );
  };

  var _loadUnlistedFiles = function() {
    var self = this;
    var baseUrl = _getBaseUrl.call( self );
    var promises = [];

    for ( var name in self._files ) {
      if ( !_isFileListed.call( self, name ) ) {
        promises.push( _loadFile.call( self, name ) );
      }
    }

    return when.all( promises );
  };

  Diskette.prototype.config = function( path ) {
    if ( this._configPath ) {
      throw new Error( 'Diskette configuration path already set.' );
    }

    var self = this;
    var defer = this._defer;
    self._configPath = path;

    when.all([
      _initDb.call( self ),
      load( path, 'string' )
    ]).then(function( values ) {
      var data = values[ 1 ];
      self._config = JSON.parse( data );
      self._whenConfigDefer.resolve( self._config );
      _loadUnlistedFiles.call( self );

      return self._dbPromise.then(function() {
        return _loadBlocks.call( self );
      });
    }).then( defer.resolve, defer.reject, defer.notify );
  };

  Diskette.prototype.fallback = function( path ) {
    if ( this._configPath ) {
      throw new Error( 'Diskette configuration path already set.' );
    }

    var self = this;
    var defer = this._defer;

    if ( path[ path.length - 1 ] !== '/' ) {
      path += '/';
    }
    self._configPath = path;

    _initDb.call( self )
      .then( defer.resolve, defer.reject, defer.notify )
      .then(function() {
        self._config = {};
        self._whenConfigDefer.resolve( self._config );
        _loadUnlistedFiles.call( self );
      });
  };

  Diskette.prototype.read = function( path, type ) {
    // We don't hold all contents, so read per request.
    var self = this;
    return self._whenConfig.then(function() {
      if ( !_isFileListed.call( self, path ) ) {
        return _loadFile.call( self, path ).then(function() {
          return _getFile.call( self, path ).complete.then(function( file ) {
            return _readFile.call( self, file, type );
          });
        });
      } else {
        return _getFile.call( self, path ).complete.then(function( file ) {
          return _readFile.call( self, file, type );
        });
      }
    });
  };

  Diskette.prototype.url = function( path ) {
    return _getFile.call( self, path ).complete.then( _getUrl.bind( this ) );
  };

  Diskette.prototype.on = function( evt, fn, ctx ) {
    if ( !this._events ) { this._events = []; }
    var _events = this._events;
    _events[ evt ] = _events[evt] || [];
    _events[ evt ].push( fn, ctx );
  };

  Diskette.prototype.off = function( evt, fn, ctx ) {
    if ( !this._events ) { return; }

    var i;
    var _events = this._events;
    var eventList;
    if ( evt ) {
      eventList = _events[ evt ];
      if ( fn ) {
        for (
          i = eventList.indexOf( fn );
          !!~i;
          i = eventList.indexOf( fn, i + 1 )
        ) {
          if ( eventList[ i + 1 ] === ctx || !ctx ) {
            eventList.splice( i, 2 );
          }
        }
      } else if ( ctx ) {
        for (
          i = eventList.indexOf( ctx );
          !!~i;
          i = eventList.indexOf( ctx, i + 1 )
        ) {
          eventList.splice( i - 1, 2 );
        }
      }
    } else if ( ctx ) {
      for ( evt in _events ) {
        eventList = _events[ evt ];
        for (
          i = eventList.indexOf( ctx );
          !!~i;
          i = eventList.indexOf( ctx, i + 1 )
        ) {
          eventList.splice( i - 1, 2 );
        }
      }
    }
  };

  Diskette.prototype.trigger = function( evt, args ) {
    if ( !this._events ) { return; }
    var eventList = this._events[ evt ];
    args = slice.call( arguments, 1 );
    for ( var i = 0; i < eventList; i += 2 ) {
      eventList[ i ].apply( eventList[ i + 1 ] || this, args );
    }
  };

  Diskette.when = when;

  return Diskette;
}));

var AQAudioContext;

(function() {
  var diskette = null;

  AQAudioContext = function _AQAudioContext() {
    this.id = AQAudioContext.prototype._nextId++;
    AQAudioContext.contexts[ this.id ] = this;

    this.nextBufferId = 0;
    this.buffers = {};
    this.nextSourceId = 0;
    this.sources = {};

    this.chainPromise = when();

    var contextConstructor = (
      window.webkitAudioContext || window.mozAudioContext || window.AudioContext
    );

    if ( !contextConstructor ) {
      console.error( 'WebAudio is not supported. Sound will not be played.' );
      return;
    }

    this.webAudioContext = new contextConstructor();

    this.webAudioDestination = this.webAudioContext.destination;

    this.webAudioDynamics = this.webAudioContext.createDynamicsCompressor();
    this.webAudioDynamics.connect( this.webAudioDestination );

    this.webAudioMasterGain = this.webAudioContext.createGain();
    this.webAudioMasterGain.connect( this.webAudioDynamics );

    this.targetNode = this.webAudioMasterGain;
  };

  AQAudioContext.prototype._nextId = 0;

  AQAudioContext.contexts = {};

  AQAudioContext.context = function( id ) {
    return this.contexts[ id ];
  };

  AQAudioContext.prototype._initDiskette = function() {
    if ( !this.webAudioContext ) {
      return {
        read: function() {
          return when.defer().promise;
        }
      };
    }

    if ( diskette === null ) {
      diskette = new Diskette();
      diskette.config( 'diskette.json' );
    }
    return diskette;
  };

  AQAudioContext.prototype._chain = function( promise ) {
    this.chainPromise = when.all([ this.chainPromise, promise ]);
    return this.chainPromise;
  };

  AQAudioContext.prototype.done = function() {};

  AQAudioContext.prototype.setListenerPosition = function( x, y ) {
    if ( this.webAudioContext ) {
      this.webAudioContext.listener.setPosition( x, y, 0 );
    }
  };

  AQAudioContext.prototype.createBuffer = function( path ) {
    var self = this;
    var bufferId = self.nextBufferId++;

    var bufferData = {
      id: bufferId,
      buffer: null
    };
    self.buffers[ bufferId ] = bufferData;

    this._chain(
      self._initDiskette().read( path, 'arraybuffer' ).then(function( data ) {
        var defer = when.defer();
        if ( self.webAudioContext ) {
          self.webAudioContext.decodeAudioData( data, function( buffer ) {
            bufferData.buffer = buffer;
            defer.resolve( bufferData );
          }, defer.reject );
        }
        return defer.promise;
      })
    );

    return bufferData;
  };

  AQAudioContext.prototype.deleteBuffer = function( buffer ) {
    var self = this;
    self.chainPromise.then(function() {
      delete self.buffers[ buffer.id ];
      delete self.bufferData[ buffer.id ];
    });
  };

  AQAudioContext.prototype.createSource = function() {
    var source = new AQAudioSource( this );
    this.sources[ source.id ] = source;
    return source;
  };

  AQAudioContext.prototype.deleteSource = function( source ) {
    delete this.sources[ source.id ];
  };

  AQAudioContext.prototype.buffer = function( id ) {
    return this.buffers[ id ];
  };

  AQAudioContext.prototype.source = function( id ) {
    return this.sources[ id ];
  };

  function AQAudioSource( ctx ) {
    this.id = ctx.nextSourceId++;
    this.context = ctx;

    this.playing = false;

    if ( !ctx.webAudioContext ) {
      return;
    }

    this.sourceNode = ctx.webAudioContext.createBufferSource();
    this.sourceNode.onended = function() {
      this.playing = false;
    }.bind( this );

    this.pannerNode = null;
    this.gainNode = null;

    this.playNode = this.sourceNode;
  }

  AQAudioSource.prototype.isPlaying = function() {
    return this.playing;
  };

  AQAudioSource.prototype.setBuffer = function( buffer ) {
    if ( buffer.buffer !== null ) {
      this.sourceNode.buffer = buffer.buffer;
    }
  };

  AQAudioSource.prototype.setPosition = function( x, y ) {
    if ( this.pannerNode !== null ) { return; }

    if ( !this.context.webAudioContext ) {
      return;
    }

    this.pannerNode = this.context.webAudioContext.createPanner();
    this.pannerNode.setPosition( x, y, 0 );
    this.playNode.connect( this.pannerNode );
    this.playNode = this.pannerNode;
  };

  AQAudioSource.prototype.play = function() {
    if ( !this.context.webAudioContext ) {
      return;
    }

    this.playNode.connect( this.context.targetNode );
    this.sourceNode.start( 0 );

    this.playing = true;
  };

  AQAudioSource.prototype.stop = function() {
    this.sourceNode.stop( 0 );

    this.playing = false;
  };
}());

// Note: For maximum-speed code, see "Optimizing Code" on the Emscripten wiki, https://github.com/kripken/emscripten/wiki/Optimizing-Code
// Note: Some Emscripten settings may limit the speed of the generated code.
// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = eval('(function() { try { return Module || {} } catch(e) { return {} } })()');
// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}
// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  Module['print'] = function(x) {
    process['stdout'].write(x + '\n');
  };
  Module['printErr'] = function(x) {
    process['stderr'].write(x + '\n');
  };
  var nodeFS = require('fs');
  var nodePath = require('path');
  Module['read'] = function(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };
  Module['readBinary'] = function(filename) { return Module['read'](filename, true) };
  Module['load'] = function(f) {
    globalEval(read(f));
  };
  Module['arguments'] = process['argv'].slice(2);
  module['exports'] = Module;
}
else if (ENVIRONMENT_IS_SHELL) {
  Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm
  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function() { throw 'no read() available (jsc?)' };
  }
  Module['readBinary'] = function(f) {
    return read(f, 'binary');
  };
  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }
  this['Module'] = Module;
}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };
  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }
  if (typeof console !== 'undefined') {
    Module['print'] = function(x) {
      console.log(x);
    };
    Module['printErr'] = function(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }
  if (ENVIRONMENT_IS_WEB) {
    this['Module'] = Module;
  } else {
    Module['load'] = importScripts;
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}
function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] == 'undefined' && Module['read']) {
  Module['load'] = function(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
// *** Environment setup code ***
// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];
// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];
// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
// === Auto-generated preamble library stuff ===
//========================================
// Runtime code shared with compiler
//========================================
var Runtime = {
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  forceAlign: function (target, quantum) {
    quantum = quantum || 4;
    if (quantum == 1) return target;
    if (isNumber(target) && isNumber(quantum)) {
      return Math.ceil(target/quantum)*quantum;
    } else if (isNumber(quantum) && isPowerOfTwo(quantum)) {
      return '(((' +target + ')+' + (quantum-1) + ')&' + -quantum + ')';
    }
    return 'Math.ceil((' + target + ')/' + quantum + ')*' + quantum;
  },
  isNumberType: function (type) {
    return type in Runtime.INT_TYPES || type in Runtime.FLOAT_TYPES;
  },
  isPointerType: function isPointerType(type) {
  return type[type.length-1] == '*';
},
  isStructType: function isStructType(type) {
  if (isPointerType(type)) return false;
  if (isArrayType(type)) return true;
  if (/<?{ ?[^}]* ?}>?/.test(type)) return true; // { i32, i8 } etc. - anonymous struct types
  // See comment in isStructPointerType()
  return type[0] == '%';
},
  INT_TYPES: {"i1":0,"i8":0,"i16":0,"i32":0,"i64":0},
  FLOAT_TYPES: {"float":0,"double":0},
  or64: function (x, y) {
    var l = (x | 0) | (y | 0);
    var h = (Math.round(x / 4294967296) | Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  and64: function (x, y) {
    var l = (x | 0) & (y | 0);
    var h = (Math.round(x / 4294967296) & Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  xor64: function (x, y) {
    var l = (x | 0) ^ (y | 0);
    var h = (Math.round(x / 4294967296) ^ Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  dedup: function dedup(items, ident) {
  var seen = {};
  if (ident) {
    return items.filter(function(item) {
      if (seen[item[ident]]) return false;
      seen[item[ident]] = true;
      return true;
    });
  } else {
    return items.filter(function(item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }
},
  set: function set() {
  var args = typeof arguments[0] === 'object' ? arguments[0] : arguments;
  var ret = {};
  for (var i = 0; i < args.length; i++) {
    ret[args[i]] = 0;
  }
  return ret;
},
  STACK_ALIGN: 8,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (type == 'i64' || type == 'double' || vararg) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  calculateStructAlignment: function calculateStructAlignment(type) {
    type.flatSize = 0;
    type.alignSize = 0;
    var diffs = [];
    var prev = -1;
    var index = 0;
    type.flatIndexes = type.fields.map(function(field) {
      index++;
      var size, alignSize;
      if (Runtime.isNumberType(field) || Runtime.isPointerType(field)) {
        size = Runtime.getNativeTypeSize(field); // pack char; char; in structs, also char[X]s.
        alignSize = Runtime.getAlignSize(field, size);
      } else if (Runtime.isStructType(field)) {
        if (field[1] === '0') {
          // this is [0 x something]. When inside another structure like here, it must be at the end,
          // and it adds no size
          // XXX this happens in java-nbody for example... assert(index === type.fields.length, 'zero-length in the middle!');
          size = 0;
          if (Types.types[field]) {
            alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
          } else {
            alignSize = type.alignSize || QUANTUM_SIZE;
          }
        } else {
          size = Types.types[field].flatSize;
          alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
        }
      } else if (field[0] == 'b') {
        // bN, large number field, like a [N x i8]
        size = field.substr(1)|0;
        alignSize = 1;
      } else if (field[0] === '<') {
        // vector type
        size = alignSize = Types.types[field].flatSize; // fully aligned
      } else if (field[0] === 'i') {
        // illegal integer field, that could not be legalized because it is an internal structure field
        // it is ok to have such fields, if we just use them as markers of field size and nothing more complex
        size = alignSize = parseInt(field.substr(1))/8;
        assert(size % 1 === 0, 'cannot handle non-byte-size field ' + field);
      } else {
        assert(false, 'invalid type for calculateStructAlignment');
      }
      if (type.packed) alignSize = 1;
      type.alignSize = Math.max(type.alignSize, alignSize);
      var curr = Runtime.alignMemory(type.flatSize, alignSize); // if necessary, place this on aligned memory
      type.flatSize = curr + size;
      if (prev >= 0) {
        diffs.push(curr-prev);
      }
      prev = curr;
      return curr;
    });
    if (type.name_[0] === '[') {
      // arrays have 2 elements, so we get the proper difference. then we scale here. that way we avoid
      // allocating a potentially huge array for [999999 x i8] etc.
      type.flatSize = parseInt(type.name_.substr(1))*type.flatSize/2;
    }
    type.flatSize = Runtime.alignMemory(type.flatSize, type.alignSize);
    if (diffs.length == 0) {
      type.flatFactor = type.flatSize;
    } else if (Runtime.dedup(diffs).length == 1) {
      type.flatFactor = diffs[0];
    }
    type.needsFlattening = (type.flatFactor != 1);
    return type.flatIndexes;
  },
  generateStructInfo: function (struct, typeName, offset) {
    var type, alignment;
    if (typeName) {
      offset = offset || 0;
      type = (typeof Types === 'undefined' ? Runtime.typeInfo : Types.types)[typeName];
      if (!type) return null;
      if (type.fields.length != struct.length) {
        printErr('Number of named fields must match the type for ' + typeName + ': possibly duplicate struct names. Cannot return structInfo');
        return null;
      }
      alignment = type.flatIndexes;
    } else {
      var type = { fields: struct.map(function(item) { return item[0] }) };
      alignment = Runtime.calculateStructAlignment(type);
    }
    var ret = {
      __size__: type.flatSize
    };
    if (typeName) {
      struct.forEach(function(item, i) {
        if (typeof item === 'string') {
          ret[item] = alignment[i] + offset;
        } else {
          // embedded struct
          var key;
          for (var k in item) key = k;
          ret[key] = Runtime.generateStructInfo(item[key], type.fields[i], alignment[i]);
        }
      });
    } else {
      struct.forEach(function(item, i) {
        ret[item[1]] = alignment[i];
      });
    }
    return ret;
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 1*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-1)/1] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[func]) {
      Runtime.funcWrappers[func] = function() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return Runtime.funcWrappers[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xFF;
      if (buffer.length == 0) {
        if ((code & 0x80) == 0x00) {        // 0xxxxxxx
          return String.fromCharCode(code);
        }
        buffer.push(code);
        if ((code & 0xE0) == 0xC0) {        // 110xxxxx
          needed = 1;
        } else if ((code & 0xF0) == 0xE0) { // 1110xxxx
          needed = 2;
        } else {                            // 11110xxx
          needed = 3;
        }
        return '';
      }
      if (needed) {
        buffer.push(code);
        needed--;
        if (needed > 0) return '';
      }
      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var c4 = buffer[3];
      var ret;
      if (buffer.length == 2) {
        ret = String.fromCharCode(((c1 & 0x1F) << 6)  | (c2 & 0x3F));
      } else if (buffer.length == 3) {
        ret = String.fromCharCode(((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6)  | (c3 & 0x3F));
      } else {
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var codePoint = ((c1 & 0x07) << 18) | ((c2 & 0x3F) << 12) |
                        ((c3 & 0x3F) << 6)  | (c4 & 0x3F);
        ret = String.fromCharCode(
          Math.floor((codePoint - 0x10000) / 0x400) + 0xD800,
          (codePoint - 0x10000) % 0x400 + 0xDC00);
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function(string) {
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+7)&-8); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+7)&-8); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + size)|0;DYNAMICTOP = (((DYNAMICTOP)+7)&-8); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 8))*(quantum ? quantum : 8); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*(+4294967296))) : ((+((low>>>0)))+((+((high|0)))*(+4294967296)))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}
function jsCall() {
  var args = Array.prototype.slice.call(arguments);
  return Runtime.functionPointers[args[0]].apply(null, args.slice(1));
}
//========================================
// Runtime essentials
//========================================
var __THREW__ = 0; // Used in checking for thrown exceptions.
var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;
var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}
var globalScope = this;
// C calling interface. A convenient way to call C functions (in C files, or
// defined with extern "C").
//
// Note: LLVM optimizations can inline and remove functions, after which you will not be
//       able to call them. Closure can also do so. To avoid that, add your function to
//       the exports using something like
//
//         -s EXPORTED_FUNCTIONS='["_main", "_myfunc"]'
//
// @param ident      The name of the C function (note that C++ functions will be name-mangled - use extern "C")
// @param returnType The return type of the function, one of the JS types 'number', 'string' or 'array' (use 'number' for any C pointer, and
//                   'array' for JavaScript arrays and typed arrays; note that arrays are 8-bit).
// @param argTypes   An array of the types of arguments for the function (if there are no arguments, this can be ommitted). Types are as in returnType,
//                   except that 'array' is not possible (there is no way for us to know the length of the array)
// @param args       An array of the arguments to the function, as native JS values (as in returnType)
//                   Note that string arguments will be stored on the stack (the JS string will become a C string on the stack).
// @return           The return value, as a native JS value (as in returnType)
function ccall(ident, returnType, argTypes, args) {
  return ccallFunc(getCFunc(ident), returnType, argTypes, args);
}
Module["ccall"] = ccall;
// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  try {
    var func = Module['_' + ident]; // closure exported function
    if (!func) func = eval('_' + ident); // explicit lookup
  } catch(e) {
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}
// Internal function that does a C call using a function, not an identifier
function ccallFunc(func, returnType, argTypes, args) {
  var stack = 0;
  function toC(value, type) {
    if (type == 'string') {
      if (value === null || value === undefined || value === 0) return 0; // null string
      value = intArrayFromString(value);
      type = 'array';
    }
    if (type == 'array') {
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length);
      writeArrayToMemory(value, ret);
      return ret;
    }
    return value;
  }
  function fromC(value, type) {
    if (type == 'string') {
      return Pointer_stringify(value);
    }
    assert(type != 'array');
    return value;
  }
  var i = 0;
  var cArgs = args ? args.map(function(arg) {
    return toC(arg, argTypes[i++]);
  }) : [];
  var ret = fromC(func.apply(null, cArgs), returnType);
  if (stack) Runtime.stackRestore(stack);
  return ret;
}
// Returns a native JS wrapper for a C function. This is similar to ccall, but
// returns a function you can call repeatedly in a normal way. For example:
//
//   var my_function = cwrap('my_c_function', 'number', ['number', 'number']);
//   alert(my_function(5, 22));
//   alert(my_function(99, 12));
//
function cwrap(ident, returnType, argTypes) {
  var func = getCFunc(ident);
  return function() {
    return ccallFunc(func, returnType, argTypes, Array.prototype.slice.call(arguments));
  }
}
Module["cwrap"] = cwrap;
// Sets a value in memory in a dynamic way at run-time. Uses the
// type data. This is the same as makeSetValue, except that
// makeSetValue is done at compile-time and generates the needed
// code then, whereas this function picks the right code at
// run-time.
// Note that setValue and getValue only do *aligned* writes and reads!
// Note that ccall uses JS types as for defining types, while setValue and
// getValue need LLVM types ('i8', 'i32') - this is a lower-level operation
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[(ptr)]=value; break;
      case 'i8': HEAP8[(ptr)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= (+1) ? (tempDouble > (+0) ? ((Math_min((+(Math_floor((tempDouble)/(+4294967296)))), (+4294967295)))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/(+4294967296))))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;
// Parallel to setValue.
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[(ptr)];
      case 'i8': return HEAP8[(ptr)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;
var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;
// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }
  var singleType = typeof types === 'string' ? types : null;
  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }
  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)|0)]=0;
    }
    return ret;
  }
  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }
  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];
    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }
    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later
    setValue(ret+i, curr, type);
    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }
  return ret;
}
Module['allocate'] = allocate;
function Pointer_stringify(ptr, /* optional */ length) {
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = false;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))|0)];
    if (t >= 128) hasUtf = true;
    else if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;
  var ret = '';
  if (!hasUtf) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  var utf8 = new Runtime.UTF8Processor();
  for (i = 0; i < length; i++) {
    t = HEAPU8[(((ptr)+(i))|0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;
// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF16ToString(ptr) {
  var i = 0;
  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;
// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr', 
// null-terminated and encoded in UTF16LE form. The copy will require at most (str.length*2+1)*2 bytes of space in the HEAP.
function stringToUTF16(str, outPtr) {
  for(var i = 0; i < str.length; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[(((outPtr)+(i*2))>>1)]=codeUnit
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[(((outPtr)+(str.length*2))>>1)]=0
}
Module['stringToUTF16'] = stringToUTF16;
// Given a pointer 'ptr' to a null-terminated UTF32LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF32ToString(ptr) {
  var i = 0;
  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;
// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr', 
// null-terminated and encoded in UTF32LE form. The copy will require at most (str.length+1)*4 bytes of space in the HEAP,
// but can use less, since str.length does not return the number of characters in the string, but the number of UTF-16 code units in the string.
function stringToUTF32(str, outPtr) {
  var iChar = 0;
  for(var iCodeUnit = 0; iCodeUnit < str.length; ++iCodeUnit) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    var codeUnit = str.charCodeAt(iCodeUnit); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++iCodeUnit);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[(((outPtr)+(iChar*4))>>2)]=codeUnit
    ++iChar;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[(((outPtr)+(iChar*4))>>2)]=0
}
Module['stringToUTF32'] = stringToUTF32;
function demangle(func) {
  try {
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    var i = 3;
    // params, etc.
    var basicTypes = {
      'v': 'void',
      'b': 'bool',
      'c': 'char',
      's': 'short',
      'i': 'int',
      'l': 'long',
      'f': 'float',
      'd': 'double',
      'w': 'wchar_t',
      'a': 'signed char',
      'h': 'unsigned char',
      't': 'unsigned short',
      'j': 'unsigned int',
      'm': 'unsigned long',
      'x': 'long long',
      'y': 'unsigned long long',
      'z': '...'
    };
    function dump(x) {
      //return;
      if (x) Module.print(x);
      Module.print(func);
      var pre = '';
      for (var a = 0; a < i; a++) pre += ' ';
      Module.print (pre + '^');
    }
    var subs = [];
    function parseNested() {
      i++;
      if (func[i] === 'K') i++;
      var parts = [];
      while (func[i] !== 'E') {
        if (func[i] === 'S') { // substitution
          i++;
          var next = func.indexOf('_', i);
          var num = func.substring(i, next) || 0;
          parts.push(subs[num] || '?');
          i = next+1;
          continue;
        }
        var size = parseInt(func.substr(i));
        var pre = size.toString().length;
        if (!size || !pre) { i--; break; } // counter i++ below us
        var curr = func.substr(i + pre, size);
        parts.push(curr);
        subs.push(curr);
        i += pre + size;
      }
      i++; // skip E
      return parts;
    }
    function parse(rawList, limit, allowVoid) { // main parser
      limit = limit || Infinity;
      var ret = '', list = [];
      function flushList() {
        return '(' + list.join(', ') + ')';
      }
      var name;
      if (func[i] !== 'N') {
        // not namespaced
        if (func[i] === 'K') i++;
        var size = parseInt(func.substr(i));
        if (size) {
          var pre = size.toString().length;
          name = func.substr(i + pre, size);
          i += pre + size;
        }
      } else {
        // namespaced N-E
        name = parseNested().join('::');
        limit--;
        if (limit === 0) return rawList ? [name] : name;
      }
      if (func[i] === 'I') {
        i++;
        var iList = parse(true);
        var iRet = parse(true, 1, true);
        ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
      } else {
        ret = name;
      }
      paramLoop: while (i < func.length && limit-- > 0) {
        //dump('paramLoop');
        var c = func[i++];
        if (c in basicTypes) {
          list.push(basicTypes[c]);
        } else {
          switch (c) {
            case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
            case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
            case 'L': { // literal
              i++; // skip basic type
              var end = func.indexOf('E', i);
              var size = end - i;
              list.push(func.substr(i, size));
              i += size + 2; // size + 'EE'
              break;
            }
            case 'A': { // array
              var size = parseInt(func.substr(i));
              i += size.toString().length;
              if (func[i] !== '_') throw '?';
              i++; // skip _
              list.push(parse(true, 1, true)[0] + ' [' + size + ']');
              break;
            }
            case 'E': break paramLoop;
            default: ret += '?' + c; break paramLoop;
          }
        }
      }
      if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
      return rawList ? list : ret + flushList();
    }
    return parse();
  } catch(e) {
    return func;
  }
}
function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}
function stackTrace() {
  var stack = new Error().stack;
  return stack ? demangleAll(stack) : '(no stack trace available)'; // Stack trace is not available at least on IE10 and Safari 6.
}
// Memory management
var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return (x+4095)&-4096;
}
var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk
function enlargeMemory() {
  abort('Cannot enlarge memory arrays in asm.js. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ' + TOTAL_MEMORY + ', or (2) set Module.TOTAL_MEMORY before the program runs.');
}
var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 67108864;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;
// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'Cannot fallback to non-typed array case: Code is too specialized');
var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);
// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');
Module['HEAP'] = HEAP;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;
function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}
var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited
var runtimeInitialized = false;
function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}
function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}
function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}
function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
}
function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}
function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;
function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;
function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;
function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;
function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;
// Tools
// This processes a JS string into a C-line array of numbers, 0-terminated.
// For LLVM-originating strings, see parser.js:parseLLVMString function
function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;
function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;
// Write a Javascript array to somewhere in the heap
function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))|0)]=chr
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;
function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;
function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=str.charCodeAt(i)
  }
  if (!dontAddNull) HEAP8[(((buffer)+(str.length))|0)]=0
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;
function unSign(value, bits, ignore, sig) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore, sig) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}
if (!Math['imul']) Math['imul'] = function(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];
var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_toFloat32 = Math.toFloat32;
var Math_min = Math.min;
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;
Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data
var memoryInitializer = null;
// === Body ===
STATIC_BASE = 8;
STATICTOP = STATIC_BASE + 3808;
/* global initializers */ __ATINIT__.push({ func: function() { runPostSets() } });
/* memory initializer */ allocate([112,114,111,103,114,97,109,32,102,97,105,108,101,100,32,99,111,109,112,105,108,97,116,105,111,110,0,0,0,0,0,0,115,104,97,100,101,114,58,32,102,97,105,108,101,100,32,99,111,109,112,105,108,97,116,105,111,110,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,66,66,66,108,111,99,107,0,115,104,97,100,101,114,40,105,110,102,111,41,58,32,37,115,10,0,0,0,0,0,0,0,97,95,112,111,115,105,116,105,111,110,0,0,0,0,0,0,109,105,110,32,37,100,44,32,109,97,120,32,37,100,44,32,97,118,103,32,37,100,44,32,115,116,100,100,101,118,32,37,102,10,0,0,0,0,0,0,66,66,82,111,111,109,0,0,97,119,97,107,101,32,37,100,32,0,0,0,0,0,0,0,116,111,117,99,104,58,32,37,102,32,37,102,32,37,102,32,37,102,10,0,0,0,0,0,122,111,111,109,0,0,0,0,118,97,114,121,105,110,103,32,108,111,119,112,32,118,101,99,52,32,118,95,99,111,108,111,114,59,10,118,111,105,100,32,109,97,105,110,40,41,32,123,103,108,95,70,114,97,103,67,111,108,111,114,32,61,32,118,95,99,111,108,111,114,59,125,0,0,0,0,0,0,0,0,65,81,82,101,110,100,101,114,101,114,0,0,0,0,0,0,66,66,80,97,116,104,78,111,100,101,0,0,0,0,0,0,109,111,118,101,100,58,32,37,102,32,37,102,32,37,102,32,37,102,10,0,0,0,0,0,115,116,101,97,108,0,0,0,117,110,105,102,111,114,109,32,109,97,116,52,32,109,111,100,101,108,118,105,101,119,95,112,114,111,106,101,99,116,105,111,110,59,10,97,116,116,114,105,98,117,116,101,32,118,101,99,50,32,97,95,112,111,115,105,116,105,111,110,59,10,97,116,116,114,105,98,117,116,101,32,118,101,99,52,32,97,95,99,111,108,111,114,59,10,118,97,114,121,105,110,103,32,118,101,99,52,32,118,95,99,111,108,111,114,59,10,118,111,105,100,32,109,97,105,110,40,41,32,123,10,32,32,118,95,99,111,108,111,114,32,61,32,97,95,99,111,108,111,114,59,10,32,32,103,108,95,80,111,115,105,116,105,111,110,32,61,32,109,111,100,101,108,118,105,101,119,95,112,114,111,106,101,99,116,105,111,110,32,42,32,118,101,99,52,40,97,95,112,111,115,105,116,105,111,110,44,32,48,44,32,49,41,59,10,125,10,0,0,0,0,0,0,0,0,66,66,77,117,108,116,105,87,97,108,108,86,105,101,119,0,114,117,110,0,0,0,0,0,114,101,115,105,122,101,32,37,100,32,37,100,10,0,0,0,108,101,102,116,0,0,0,0,37,100,32,37,100,32,37,100,10,0,0,0,0,0,0,0,65,81,76,111,111,112,0,0,65,81,65,112,112,0,0,0,65,81,73,110,112,117,116,65,99,116,105,111,110,0,0,0,65,81,87,101,98,65,117,100,105,111,68,114,105,118,101,114,0,0,0,0,0,0,0,0,116,111,117,99,104,101,115,58,32,37,100,10,0,0,0,0,100,111,119,110,0,0,0,0,65,81,83,116,114,105,110,103,0,0,0,0,0,0,0,0,109,111,100,101,108,118,105,101,119,95,112,114,111,106,101,99,116,105,111,110,0,0,0,0,65,81,73,110,116,0,0,0,65,81,76,105,115,116,0,0,97,114,103,118,91,37,100,93,58,32,37,115,10,0,0,0,65,81,68,105,99,116,80,97,105,114,0,0,0,0,0,0,65,81,84,111,117,99,104,0,115,111,117,110,100,47,0,0,65,81,87,111,114,108,100,0,86,73,69,87,80,79,82,84,32,100,105,109,101,110,115,105,111,110,115,32,37,100,32,37,100,32,37,100,32,37,100,46,10,0,0,0,0,0,0,0,65,81,65,114,114,97,121,0,46,0,0,0,0,0,0,0,37,100,32,37,100,10,0,0,117,112,0,0,0,0,0,0,97,95,99,111,108,111,114,0,95,65,81,87,101,98,65,117,100,105,111,66,117,102,102,101,114,0,0,0,0,0,0,0,65,81,83,111,117,110,100,0,114,105,103,104,116,0,0,0,33,105,115,110,97,110,40,112,97,114,116,105,99,108,101,45,62,112,111,115,105,116,105,111,110,46,120,41,32,38,38,32,33,105,115,110,97,110,40,112,97,114,116,105,99,108,101,45,62,112,111,115,105,116,105,111,110,46,121,41,0,0,0,0,65,81,80,97,114,116,105,99,108,101,0,0,0,0,0,0,65,81,68,100,118,116,0,0,85,110,97,98,108,101,32,116,111,32,105,110,105,116,105,97,108,105,122,101,32,83,68,76,58,32,37,115,10,0,0,0,66,66,67,97,109,101,114,97,67,111,110,116,114,111,108,108,101,114,0,0,0,0,0,0,65,81,82,101,108,101,97,115,101,80,111,111,108,0,0,0,65,81,68,111,117,98,108,101,0,0,0,0,0,0,0,0,65,81,68,105,99,116,77,97,112,0,0,0,0,0,0,0,66,66,87,97,108,108,0,0,66,66,67,105,116,121,0,0,98,105,110,97,114,121,80,97,116,104,58,32,37,115,10,0,95,65,81,87,101,98,65,117,100,105,111,83,111,117,114,99,101,0,0,0,0,0,0,0,65,81,83,111,117,110,100,73,110,115,116,97,110,99,101,0,46,46,47,46,46,47,115,114,99,47,112,112,104,121,115,47,119,111,114,108,100,46,99,0,85,110,97,98,108,101,32,116,111,32,115,101,116,32,118,105,100,101,111,32,109,111,100,101,58,32,37,115,10,0,0,0,46,46,47,46,46,47,115,114,99,47,103,97,109,101,47,117,112,100,97,116,101,114,46,99,0,0,0,0,0,0,0,0,105,110,116,101,114,102,97,99,101,32,38,38,32,105,110,116,101,114,102,97,99,101,45,62,117,112,100,97,116,101,0,0,65,81,67,97,109,101,114,97,0,0,0,0,0,0,0,0,65,81,65,99,116,111,114,86,105,101,119,0,0,0,0,0,65,81,65,99,116,111,114,0,95,83,76,85,112,100,97,116,101,95,105,116,101,114,97,116,111,114,0,0,0,0,0,0,95,65,81,87,111,114,108,100,95,105,110,116,101,103,114,97,116,101,73,116,101,114,97,116,111,114,0,0,0,0,0,0,65,81,87,111,114,108,100,95,97,100,100,80,97,114,116,105,99,108,101,0,0,0,0,0,200,7,0,0,18,0,0,0,0,0,0,0,0,0,0,0,128,6,0,0,17,0,0,0,160,4,0,0,20,0,0,0,0,0,0,0,41,0,0,0,60,0,0,0,19,0,0,0,184,9,0,0,19,0,0,0,17,0,0,0,24,0,0,0,26,0,0,0,29,0,0,0,17,0,0,0,34,0,0,0,152,3,0,0,20,0,0,0,0,0,0,0,57,0,0,0,66,0,0,0,19,0,0,0,144,9,0,0,32,0,0,0,184,8,0,0,67,0,0,0,17,0,0,0,0,0,0,0,144,9,0,0,33,0,0,0,184,8,0,0,37,0,0,0,18,0,0,0,0,0,0,0,144,9,0,0,30,0,0,0,200,8,0,0,20,0,0,0,17,0,0,0,35,0,0,0,184,7,0,0,42,0,0,0,128,6,0,0,18,0,0,0,200,7,0,0,17,0,0,0,83,76,85,112,100,97,116,101,114,0,0,0,0,0,0,0,128,4,0,0,44,0,0,0,0,0,0,0,82,0,0,0,61,0,0,0,19,0,0,0,176,0,0,0,64,0,0,0,0,0,0,0,24,0,0,0,52,0,0,0,19,0,0,0,64,1,0,0,24,0,0,0,0,0,0,0,40,0,0,0,21,0,0,0,19,0,0,0,72,2,0,0,20,0,12,0,0,0,0,0,80,0,0,0,43,0,0,0,23,0,0,0,3,0,0,0,1,0,0,0,1,0,0,0,3,0,0,0,3,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,3,0,0,0,3,0,0,0,3,0,0,0,3,0,0,0,0,0,0,0,2,0,0,0,3,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,1,0,0,0,2,0,0,0,136,4,0,0,56,0,0,0,0,0,0,0,68,0,0,0,49,0,0,0,19,0,0,0,56,4,0,0,52,0,0,0,0,0,0,0,65,0,0,0,27,0,0,0,22,0,0,0,88,0,0,0,64,0,0,0,0,0,0,0,46,0,0,0,55,0,0,0,19,0,0,0,64,3,0,0,56,0,0,0,0,0,0,0,73,0,0,0,78,0,0,0,19,0,0,0,168,2,0,0,24,0,0,0,0,0,0,0,63,0,0,0,69,0,0,0,28,0,0,0,65,81,86,105,101,119,97,98,108,101,0,0,0,0,0,0,65,81,86,105,101,119,0,0,48,3,0,0,44,0,0,0,0,0,0,0,34,0,0,0,45,0,0,0,19,0,0,0,216,2,0,0,20,0,0,0,0,0,0,0,59,0,0,0,33,0,0,0,34,0,0,0,176,3,0,0,20,0,0,0,0,0,0,0,70,0,0,0,22,0,0,0,19,0,0,0,184,4,0,0,40,0,0,0,0,0,0,0,19,0,0,0,71,0,0,0,19,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,63,48,1,0,0,24,0,0,0,0,0,0,0,79,0,0,0,72,0,0,0,19,0,0,0,80,4,0,0,28,0,0,0,0,0,0,0,54,0,0,0,32,0,0,0,19,0,0,0,0,4,0,0,132,0,0,0,0,0,0,0,28,0,0,0,56,0,0,0,19,0,0,0,65,81,78,117,109,98,101,114,0,0,0,0,0,0,0,0,65,81,77,97,112,0,0,0,136,2,0,0,28,0,0,0,0,0,0,0,38,0,0,0,74,0,0,0,19,0,0,0,8,3,0,0,24,0,0,0,0,0,0,0,35,0,0,0,17,0,0,0,19,0,0,0,0,3,0,0,16,0,0,0,0,0,0,0,47,0,0,0,25,0,0,0,27,0,0,0,152,2,0,0,36,0,0,0,0,0,0,0,30,0,0,0,48,0,0,0,19,0,0,0,96,4,0,0,24,0,0,0,0,0,0,0,23,0,0,0,53,0,0,0,25,0,0,0,32,3,0,0,20,0,0,0,0,0,0,0,20,0,0,0,76,0,0,0,19,0,0,0,112,4,0,0,16,0,0,0,0,0,0,0,58,0,0,0,50,0,0,0,31,0,0,0,16,4,0,0,244,0,0,0,0,0,0,0,36,0,0,0,51,0,0,0,19,0,0,0,65,81,67,111,109,112,97,114,101,0,0,0,0,0,0,0,64,5,0,0,48,0,0,0,0,0,0,0,62,0,0,0,45,0,0,0,19,0,0,0,65,81,65,117,100,105,111,68,114,105,118,101,114,0,0,0,112,3,0,0,24,0,0,0,0,0,0,0,39,0,0,0,64,0,0,0,19,0,0,0,144,2,0,0,32,0,0,0,0,0,0,0,81,0,0,0,77,0,0,0,19,0,0,0,80,5,0,0,20,24,0,0,0,0,0,0,75,0,0,0,29,0,0,0,18,0,0,0,96,5,0,0,116,0,0,0,0,0,0,0,31,0,0,0,26,0,0,0,35,0,0,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE)
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);
assert(tempDoublePtr % 8 == 0);
function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
}
function copyTempDouble(ptr) {
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];
  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];
  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];
  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];
}
  var _llvm_dbg_declare=undefined;
  var _cos=Math_cos;
  var _sin=Math_sin;
  function _llvm_dbg_value() {
  Module['printErr']('missing function: llvm_dbg_value'); abort(-1);
  }
  var GL={counter:1,buffers:[],programs:[],framebuffers:[],renderbuffers:[],textures:[],uniforms:[],shaders:[],currArrayBuffer:0,currElementArrayBuffer:0,byteSizeByTypeRoot:5120,byteSizeByType:[1,1,2,2,4,4,4,2,3,4,8],uniformTable:{},stringCache:{},packAlignment:4,unpackAlignment:4,init:function () {
        Browser.moduleContextCreatedCallbacks.push(GL.initExtensions);
      },getNewId:function (table) {
        var ret = GL.counter++;
        for (var i = table.length; i < ret; i++) {
          table[i] = null;
        }
        return ret;
      },MINI_TEMP_BUFFER_SIZE:16,miniTempBuffer:null,miniTempBufferViews:[0],MAX_TEMP_BUFFER_SIZE:2097152,tempBufferIndexLookup:null,tempVertexBuffers:null,tempIndexBuffers:null,tempQuadIndexBuffer:null,generateTempBuffers:function (quads) {
        GL.tempBufferIndexLookup = new Uint8Array(GL.MAX_TEMP_BUFFER_SIZE+1);
        GL.tempVertexBuffers = [];
        GL.tempIndexBuffers = [];
        var last = -1, curr = -1;
        var size = 1;
        for (var i = 0; i <= GL.MAX_TEMP_BUFFER_SIZE; i++) {
          if (i > size) {
            size <<= 1;
          }
          if (size != last) {
            curr++;
            GL.tempVertexBuffers[curr] = Module.ctx.createBuffer();
            Module.ctx.bindBuffer(Module.ctx.ARRAY_BUFFER, GL.tempVertexBuffers[curr]);
            Module.ctx.bufferData(Module.ctx.ARRAY_BUFFER, size, Module.ctx.DYNAMIC_DRAW);
            Module.ctx.bindBuffer(Module.ctx.ARRAY_BUFFER, null);
            GL.tempIndexBuffers[curr] = Module.ctx.createBuffer();
            Module.ctx.bindBuffer(Module.ctx.ELEMENT_ARRAY_BUFFER, GL.tempIndexBuffers[curr]);
            Module.ctx.bufferData(Module.ctx.ELEMENT_ARRAY_BUFFER, size, Module.ctx.DYNAMIC_DRAW);
            Module.ctx.bindBuffer(Module.ctx.ELEMENT_ARRAY_BUFFER, null);
            last = size;
          }
          GL.tempBufferIndexLookup[i] = curr;
        }
        if (quads) {
          // GL_QUAD indexes can be precalculated
          GL.tempQuadIndexBuffer = Module.ctx.createBuffer();
          Module.ctx.bindBuffer(Module.ctx.ELEMENT_ARRAY_BUFFER, GL.tempQuadIndexBuffer);
          var numIndexes = GL.MAX_TEMP_BUFFER_SIZE >> 1;
          var quadIndexes = new Uint16Array(numIndexes);
          var i = 0, v = 0;
          while (1) {
            quadIndexes[i++] = v;
            if (i >= numIndexes) break;
            quadIndexes[i++] = v+1;
            if (i >= numIndexes) break;
            quadIndexes[i++] = v+2;
            if (i >= numIndexes) break;
            quadIndexes[i++] = v;
            if (i >= numIndexes) break;
            quadIndexes[i++] = v+2;
            if (i >= numIndexes) break;
            quadIndexes[i++] = v+3;
            if (i >= numIndexes) break;
            v += 4;
          }
          Module.ctx.bufferData(Module.ctx.ELEMENT_ARRAY_BUFFER, quadIndexes, Module.ctx.STATIC_DRAW);
          Module.ctx.bindBuffer(Module.ctx.ELEMENT_ARRAY_BUFFER, null);
        }
      },findToken:function (source, token) {
        function isIdentChar(ch) {
          if (ch >= 48 && ch <= 57) // 0-9
            return true;
          if (ch >= 65 && ch <= 90) // A-Z
            return true;
          if (ch >= 97 && ch <= 122) // a-z
            return true;
          return false;
        }
        var i = -1;
        do {
          i = source.indexOf(token, i + 1);
          if (i < 0) {
            break;
          }
          if (i > 0 && isIdentChar(source[i - 1])) {
            continue;
          }
          i += token.length;
          if (i < source.length - 1 && isIdentChar(source[i + 1])) {
            continue;
          }
          return true;
        } while (true);
        return false;
      },getSource:function (shader, count, string, length) {
        var source = '';
        for (var i = 0; i < count; ++i) {
          var frag;
          if (length) {
            var len = HEAP32[(((length)+(i*4))>>2)];
            if (len < 0) {
              frag = Pointer_stringify(HEAP32[(((string)+(i*4))>>2)]);
            } else {
              frag = Pointer_stringify(HEAP32[(((string)+(i*4))>>2)], len);
            }
          } else {
            frag = Pointer_stringify(HEAP32[(((string)+(i*4))>>2)]);
          }
          source += frag;
        }
        // Let's see if we need to enable the standard derivatives extension
        type = Module.ctx.getShaderParameter(GL.shaders[shader], 0x8B4F /* GL_SHADER_TYPE */);
        if (type == 0x8B30 /* GL_FRAGMENT_SHADER */) {
          if (GL.findToken(source, "dFdx") ||
              GL.findToken(source, "dFdy") ||
              GL.findToken(source, "fwidth")) {
            source = "#extension GL_OES_standard_derivatives : enable\n" + source;
            var extension = Module.ctx.getExtension("OES_standard_derivatives");
          }
        }
        return source;
      },computeImageSize:function (width, height, sizePerPixel, alignment) {
        function roundedToNextMultipleOf(x, y) {
          return Math.floor((x + y - 1) / y) * y
        }
        var plainRowSize = width * sizePerPixel;
        var alignedRowSize = roundedToNextMultipleOf(plainRowSize, alignment);
        return (height <= 0) ? 0 :
                 ((height - 1) * alignedRowSize + plainRowSize);
      },getTexPixelData:function (type, format, width, height, pixels, internalFormat) {
        var sizePerPixel;
        switch (type) {
          case 0x1401 /* GL_UNSIGNED_BYTE */:
            switch (format) {
              case 0x1906 /* GL_ALPHA */:
              case 0x1909 /* GL_LUMINANCE */:
                sizePerPixel = 1;
                break;
              case 0x1907 /* GL_RGB */:
                sizePerPixel = 3;
                break;
              case 0x1908 /* GL_RGBA */:
                sizePerPixel = 4;
                break;
              case 0x190A /* GL_LUMINANCE_ALPHA */:
                sizePerPixel = 2;
                break;
              default:
                throw 'Invalid format (' + format + ')';
            }
            break;
          case 0x1403 /* GL_UNSIGNED_SHORT */:
            if (format == 0x1902 /* GL_DEPTH_COMPONENT */) {
              sizePerPixel = 2;
            } else {
              throw 'Invalid format (' + format + ')';
            }
            break;
          case 0x1405 /* GL_UNSIGNED_INT */:
            if (format == 0x1902 /* GL_DEPTH_COMPONENT */) {
              sizePerPixel = 4;
            } else {
              throw 'Invalid format (' + format + ')';
            }
            break;
          case 0x84FA /* UNSIGNED_INT_24_8_WEBGL */:
            sizePerPixel = 4;
            break;
          case 0x8363 /* GL_UNSIGNED_SHORT_5_6_5 */:
          case 0x8033 /* GL_UNSIGNED_SHORT_4_4_4_4 */:
          case 0x8034 /* GL_UNSIGNED_SHORT_5_5_5_1 */:
            sizePerPixel = 2;
            break;
          case 0x1406 /* GL_FLOAT */:
            switch (format) {
              case 0x1907 /* GL_RGB */:
                sizePerPixel = 3*4;
                break;
              case 0x1908 /* GL_RGBA */:
                sizePerPixel = 4*4;
                break;
              default:
                throw 'Invalid format (' + format + ')';
            }
            internalFormat = Module.ctx.RGBA;
            break;
          default:
            throw 'Invalid type (' + type + ')';
        }
        var bytes = GL.computeImageSize(width, height, sizePerPixel, GL.unpackAlignment);
        if (type == 0x1401 /* GL_UNSIGNED_BYTE */) {
          pixels = HEAPU8.subarray((pixels),(pixels+bytes));
        } else if (type == 0x1406 /* GL_FLOAT */) {
          pixels = HEAPF32.subarray((pixels)>>2,(pixels+bytes)>>2);
        } else if (type == 0x1405 /* GL_UNSIGNED_INT */ || type == 0x84FA /* UNSIGNED_INT_24_8_WEBGL */) {
          pixels = HEAPU32.subarray((pixels)>>2,(pixels+bytes)>>2);
        } else {
          pixels = HEAPU16.subarray((pixels)>>1,(pixels+bytes)>>1);
        }
        return {
          pixels: pixels,
          internalFormat: internalFormat
        }
      },initExtensions:function () {
        if (GL.initExtensions.done) return;
        GL.initExtensions.done = true;
        if (!Module.useWebGL) return; // an app might link both gl and 2d backends
        GL.miniTempBuffer = new Float32Array(GL.MINI_TEMP_BUFFER_SIZE);
        for (var i = 0; i < GL.MINI_TEMP_BUFFER_SIZE; i++) {
          GL.miniTempBufferViews[i] = GL.miniTempBuffer.subarray(0, i+1);
        }
        GL.maxVertexAttribs = Module.ctx.getParameter(Module.ctx.MAX_VERTEX_ATTRIBS);
        // Detect the presence of a few extensions manually, this GL interop layer itself will need to know if they exist. 
        GL.compressionExt = Module.ctx.getExtension('WEBGL_compressed_texture_s3tc') ||
                            Module.ctx.getExtension('MOZ_WEBGL_compressed_texture_s3tc') ||
                            Module.ctx.getExtension('WEBKIT_WEBGL_compressed_texture_s3tc');
        GL.anisotropicExt = Module.ctx.getExtension('EXT_texture_filter_anisotropic') ||
                            Module.ctx.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
                            Module.ctx.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
        GL.floatExt = Module.ctx.getExtension('OES_texture_float');
        // These are the 'safe' feature-enabling extensions that don't add any performance impact related to e.g. debugging, and
        // should be enabled by default so that client GLES2/GL code will not need to go through extra hoops to get its stuff working.
        // As new extensions are ratified at http://www.khronos.org/registry/webgl/extensions/ , feel free to add your new extensions
        // here, as long as they don't produce a performance impact for users that might not be using those extensions.
        // E.g. debugging-related extensions should probably be off by default.
        var automaticallyEnabledExtensions = [ "OES_texture_float", "OES_texture_half_float", "OES_standard_derivatives",
                                               "OES_vertex_array_object", "WEBGL_compressed_texture_s3tc", "WEBGL_depth_texture",
                                               "OES_element_index_uint", "EXT_texture_filter_anisotropic", "ANGLE_instanced_arrays",
                                               "OES_texture_float_linear", "OES_texture_half_float_linear", "WEBGL_compressed_texture_atc",
                                               "WEBGL_compressed_texture_pvrtc", "EXT_color_buffer_half_float", "WEBGL_color_buffer_float",
                                               "EXT_frag_depth", "EXT_sRGB", "WEBGL_draw_buffers", "WEBGL_shared_resources" ];
        function shouldEnableAutomatically(extension) {
          for(var i in automaticallyEnabledExtensions) {
            var include = automaticallyEnabledExtensions[i];
            if (ext.indexOf(include) != -1) {
              return true;
            }
          }
          return false;
        }
        var extensions = Module.ctx.getSupportedExtensions();
        for(var e in extensions) {
          var ext = extensions[e].replace('MOZ_', '').replace('WEBKIT_', '');
          if (automaticallyEnabledExtensions.indexOf(ext) != -1) {
            Module.ctx.getExtension(ext); // Calling .getExtension enables that extension permanently, no need to store the return value to be enabled.
          }
        }
      },populateUniformTable:function (program) {
        var p = GL.programs[program];
        GL.uniformTable[program] = {};
        var ptable = GL.uniformTable[program];
        // A program's uniformTable maps the string name of an uniform to an integer location of that uniform.
        // The global GL.uniforms map maps integer locations to WebGLUniformLocations.
        var numUniforms = Module.ctx.getProgramParameter(p, Module.ctx.ACTIVE_UNIFORMS);
        for (var i = 0; i < numUniforms; ++i) {
          var u = Module.ctx.getActiveUniform(p, i);
          var name = u.name;
          // Strip off any trailing array specifier we might have got, e.g. "[0]".
          if (name.indexOf(']', name.length-1) !== -1) {
            var ls = name.lastIndexOf('[');
            name = name.slice(0, ls);
          }
          // Optimize memory usage slightly: If we have an array of uniforms, e.g. 'vec3 colors[3];', then 
          // only store the string 'colors' in ptable, and 'colors[0]', 'colors[1]' and 'colors[2]' will be parsed as 'colors'+i.
          // Note that for the GL.uniforms table, we still need to fetch the all WebGLUniformLocations for all the indices.
          var loc = Module.ctx.getUniformLocation(p, name);
          var id = GL.getNewId(GL.uniforms);
          ptable[name] = [u.size, id];
          GL.uniforms[id] = loc;
          for (var j = 1; j < u.size; ++j) {
            var n = name + '['+j+']';
            loc = Module.ctx.getUniformLocation(p, n);
            id = GL.getNewId(GL.uniforms);
            GL.uniforms[id] = loc;
          }
        }
      }};function _glGenBuffers(n, buffers) {
      for (var i = 0; i < n; i++) {
        var id = GL.getNewId(GL.buffers);
        var buffer = Module.ctx.createBuffer();
        buffer.name = id;
        GL.buffers[id] = buffer;
        HEAP32[(((buffers)+(i*4))>>2)]=id;
      }
    }
  function _glDeleteBuffers(n, buffers) {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((buffers)+(i*4))>>2)];
        var buffer = GL.buffers[id];
        // From spec: "glDeleteBuffers silently ignores 0's and names that do not
        // correspond to existing buffer objects."
        if (!buffer) continue;
        Module.ctx.deleteBuffer(buffer);
        buffer.name = 0;
        GL.buffers[id] = null;
        if (id == GL.currArrayBuffer) GL.currArrayBuffer = 0;
        if (id == GL.currElementArrayBuffer) GL.currElementArrayBuffer = 0;
      }
    }
  var _atan2=Math_atan2;
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value
      return value;
    }
  var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            continue;
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          if (stream.tty.output.length) {
            stream.tty.ops.put_char(stream.tty, 10);
          }
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              result = process['stdin']['read']();
              if (!result) {
                if (process['stdin']['_readableState'] && process['stdin']['_readableState']['ended']) {
                  return null;  // EOF
                }
                return undefined;  // no data available
              }
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }}};
  var MEMFS={ops_table:null,CONTENT_OWNING:1,CONTENT_FLEXIBLE:2,CONTENT_FIXED:3,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 0777, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            },
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.contents = [];
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },ensureFlexible:function (node) {
        if (node.contentMode !== MEMFS.CONTENT_FLEXIBLE) {
          var contents = node.contents;
          node.contents = Array.prototype.slice.call(contents);
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        }
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.contents.length;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.ensureFlexible(node);
            var contents = node.contents;
            if (attr.size < contents.length) contents.length = attr.size;
            else while (attr.size > contents.length) contents.push(0);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 0777 | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else
          {
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          var node = stream.node;
          node.timestamp = Date.now();
          var contents = node.contents;
          if (length && contents.length === 0 && position === 0 && buffer.subarray) {
            // just replace it with the new data
            if (canOwn && buffer.buffer === HEAP8.buffer && offset === 0) {
              node.contents = buffer; // this is a subarray of the heap, and we can own it
              node.contentMode = MEMFS.CONTENT_OWNING;
            } else {
              node.contents = new Uint8Array(buffer.subarray(offset, offset+length));
              node.contentMode = MEMFS.CONTENT_FIXED;
            }
            return length;
          }
          MEMFS.ensureFlexible(node);
          var contents = node.contents;
          while (contents.length < position) contents.push(0);
          for (var i = 0; i < length; i++) {
            contents[position + i] = buffer[offset + i];
          }
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.contents.length;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          stream.ungotten = [];
          stream.position = position;
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.ensureFlexible(stream.node);
          var contents = stream.node.contents;
          var limit = offset + length;
          while (limit > contents.length) contents.push(0);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < contents.length) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        }}};
  var IDBFS={dbs:{},indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },reconcile:function (src, dst, callback) {
        var total = 0;
        var create = {};
        for (var key in src.files) {
          if (!src.files.hasOwnProperty(key)) continue;
          var e = src.files[key];
          var e2 = dst.files[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create[key] = e;
            total++;
          }
        }
        var remove = {};
        for (var key in dst.files) {
          if (!dst.files.hasOwnProperty(key)) continue;
          var e = dst.files[key];
          var e2 = src.files[key];
          if (!e2) {
            remove[key] = e;
            total++;
          }
        }
        if (!total) {
          // early out
          return callback(null);
        }
        var completed = 0;
        var done = function(err) {
          if (err) return callback(err);
          if (++completed >= total) {
            return callback(null);
          }
        };
        // create a single transaction to handle and IDB reads / writes we'll need to do
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        transaction.onerror = function() { callback(this.error); };
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
        for (var path in create) {
          if (!create.hasOwnProperty(path)) continue;
          var entry = create[path];
          if (dst.type === 'local') {
            // save file to local
            try {
              if (FS.isDir(entry.mode)) {
                FS.mkdir(path, entry.mode);
              } else if (FS.isFile(entry.mode)) {
                var stream = FS.open(path, 'w+', 0666);
                FS.write(stream, entry.contents, 0, entry.contents.length, 0, true /* canOwn */);
                FS.close(stream);
              }
              done(null);
            } catch (e) {
              return done(e);
            }
          } else {
            // save file to IDB
            var req = store.put(entry, path);
            req.onsuccess = function() { done(null); };
            req.onerror = function() { done(this.error); };
          }
        }
        for (var path in remove) {
          if (!remove.hasOwnProperty(path)) continue;
          var entry = remove[path];
          if (dst.type === 'local') {
            // delete file from local
            try {
              if (FS.isDir(entry.mode)) {
                // TODO recursive delete?
                FS.rmdir(path);
              } else if (FS.isFile(entry.mode)) {
                FS.unlink(path);
              }
              done(null);
            } catch (e) {
              return done(e);
            }
          } else {
            // delete file from IDB
            var req = store.delete(path);
            req.onsuccess = function() { done(null); };
            req.onerror = function() { done(this.error); };
          }
        }
      },getLocalSet:function (mount, callback) {
        var files = {};
        var isRealDir = function(p) {
          return p !== '.' && p !== '..';
        };
        var toAbsolute = function(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
        var check = FS.readdir(mount.mountpoint)
          .filter(isRealDir)
          .map(toAbsolute(mount.mountpoint));
        while (check.length) {
          var path = check.pop();
          var stat, node;
          try {
            var lookup = FS.lookupPath(path);
            node = lookup.node;
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path)
              .filter(isRealDir)
              .map(toAbsolute(path)));
            files[path] = { mode: stat.mode, timestamp: stat.mtime };
          } else if (FS.isFile(stat.mode)) {
            files[path] = { contents: node.contents, mode: stat.mode, timestamp: stat.mtime };
          } else {
            return callback(new Error('node type not supported'));
          }
        }
        return callback(null, { type: 'local', files: files });
      },getDB:function (name, callback) {
        // look it up in the cache
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        req.onupgradeneeded = function() {
          db = req.result;
          db.createObjectStore(IDBFS.DB_STORE_NAME);
        };
        req.onsuccess = function() {
          db = req.result;
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function() {
          callback(this.error);
        };
      },getRemoteSet:function (mount, callback) {
        var files = {};
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function() { callback(this.error); };
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          store.openCursor().onsuccess = function(event) {
            var cursor = event.target.result;
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, files: files });
            }
            files[cursor.key] = cursor.value;
            cursor.continue();
          };
        });
      }};
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so 
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          return flags;
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          stream.position = position;
          return position;
        }}};
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
      // we don't currently perform any user-space buffering of data
    }var FS={root:null,mounts:[],devices:[null],streams:[null],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,ErrnoError:null,genericErrors:{},handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || { recurse_count: 0 };
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
        // start at the root
        var current = FS.root;
        var current_path = '/';
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            current = current.mount.root;
          }
          // follow symlinks
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
            this.parent = null;
            this.mount = null;
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            FS.hashAddNode(this);
          };
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
          FS.FSNode.prototype = {};
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); },
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); },
            },
          });
        }
        return new FS.FSNode(parent, name, mode, rdev);
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var accmode = flag & 2097155;
        var perms = ['r', 'w', 'rw'][accmode];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        return FS.nodePermissions(dir, 'x');
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 1;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = {};
          // compatibility
          Object.defineProperties(FS.FSStream, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        stream.prototype = FS.FSStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
        var completed = 0;
        var total = FS.mounts.length;
        var done = function(err) {
          if (err) {
            return callback(err);
          }
          if (++completed >= total) {
            callback(null);
          }
        };
        // sync all mounts
        for (var i = 0; i < FS.mounts.length; i++) {
          var mount = FS.mounts[i];
          if (!mount.type.syncfs) {
            done(null);
            continue;
          }
          mount.type.syncfs(mount, populate, done);
        }
      },mount:function (type, opts, mountpoint) {
        var lookup;
        if (mountpoint) {
          lookup = FS.lookupPath(mountpoint, { follow: false });
          mountpoint = lookup.path;  // use the absolute path
        }
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          root: null
        };
        // create a root node for the fs
        var root = type.mount(mount);
        root.mount = mount;
        mount.root = root;
        // assign the mount info to the mountpoint's node
        if (lookup) {
          lookup.node.mount = mount;
          lookup.node.mounted = true;
          // compatibility update FS.root if we mount to /
          if (mountpoint === '/') {
            FS.root = mount.root;
          }
        }
        // add to our cached list of mounts
        FS.mounts.push(mount);
        return root;
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 0666;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 0777;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 0666;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },readlink:function (path) {
        var lookup = FS.lookupPath(path, { follow: false });
        var link = lookup.node;
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return link.node_ops.readlink(link);
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 0666 : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // check permissions
        var err = FS.mayOpen(node, flags);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        return stream;
      },close:function (stream) {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        return stream.stream_ops.llseek(stream, offset, whence);
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.errnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = '';
          var utf8 = new Runtime.UTF8Processor();
          for (var i = 0; i < length; i++) {
            ret += utf8.processCChar(buf[i]);
          }
        } else if (opts.encoding === 'binary') {
          ret = buf;
        } else {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var utf8 = new Runtime.UTF8Processor();
          var buf = new Uint8Array(utf8.processJSString(data));
          FS.write(stream, buf, 0, buf.length, 0);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0);
        } else {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function() { return 0; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        HEAP32[((_stdin)>>2)]=stdin.fd;
        assert(stdin.fd === 1, 'invalid handle for stdin (' + stdin.fd + ')');
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=stdout.fd;
        assert(stdout.fd === 2, 'invalid handle for stdout (' + stdout.fd + ')');
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=stderr.fd;
        assert(stderr.fd === 3, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno) {
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
          this.message = ERRNO_MESSAGES[errno];
          this.stack = stackTrace();
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
        FS.nameTable = new Array(4096);
        FS.root = FS.createNode(null, '/', 16384 | 0777, 0);
        FS.mount(MEMFS, {}, '/');
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
        FS.ensureErrnoError();
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
          var LazyUint8Array = function() {
            this.lengthKnown = false;
            this.chunks = []; // Loaded chunks. Index is the chunk number
          }
          LazyUint8Array.prototype.get = function(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = Math.floor(idx / this.chunkSize);
            return this.getter(chunkNum)[chunkOffset];
          }
          LazyUint8Array.prototype.setDataGetter = function(getter) {
            this.getter = getter;
          }
          LazyUint8Array.prototype.cacheLength = function() {
              // Find length
              var xhr = new XMLHttpRequest();
              xhr.open('HEAD', url, false);
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
              var datalength = Number(xhr.getResponseHeader("Content-length"));
              var header;
              var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
              var chunkSize = 1024*1024; // Chunk size in bytes
              if (!hasByteServing) chunkSize = datalength;
              // Function to get a range from the remote URL.
              var doXHR = (function(from, to) {
                if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
                // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, false);
                if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
                // Some hints to the browser that we want binary data.
                if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
                if (xhr.overrideMimeType) {
                  xhr.overrideMimeType('text/plain; charset=x-user-defined');
                }
                xhr.send(null);
                if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                if (xhr.response !== undefined) {
                  return new Uint8Array(xhr.response || []);
                } else {
                  return intArrayFromString(xhr.responseText || '', true);
                }
              });
              var lazyArray = this;
              lazyArray.setDataGetter(function(chunkNum) {
                var start = chunkNum * chunkSize;
                var end = (chunkNum+1) * chunkSize - 1; // including this byte
                end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
                if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
                  lazyArray.chunks[chunkNum] = doXHR(start, end);
                }
                if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
                return lazyArray.chunks[chunkNum];
              });
              this._length = datalength;
              this._chunkSize = chunkSize;
              this.lengthKnown = true;
          }
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};
  var SOCKFS={mount:function (mount) {
        return FS.createNode(null, '/', 16384 | 0777, 0);
      },createSocket:function (family, type, protocol) {
        var streaming = type == 1;
        if (protocol) {
          assert(streaming == (protocol == 6)); // if SOCK_STREAM, must be tcp
        }
        // create our internal socket structure
        var sock = {
          family: family,
          type: type,
          protocol: protocol,
          server: null,
          peers: {},
          pending: [],
          recv_queue: [],
          sock_ops: SOCKFS.websocket_sock_ops
        };
        // create the filesystem node to store the socket structure
        var name = SOCKFS.nextname();
        var node = FS.createNode(SOCKFS.root, name, 49152, 0);
        node.sock = sock;
        // and the wrapping stream that enables library functions such
        // as read and write to indirectly interact with the socket
        var stream = FS.createStream({
          path: name,
          node: node,
          flags: FS.modeStringToFlags('r+'),
          seekable: false,
          stream_ops: SOCKFS.stream_ops
        });
        // map the new stream to the socket structure (sockets have a 1:1
        // relationship with a stream)
        sock.stream = stream;
        return sock;
      },getSocket:function (fd) {
        var stream = FS.getStream(fd);
        if (!stream || !FS.isSocket(stream.node.mode)) {
          return null;
        }
        return stream.node.sock;
      },stream_ops:{poll:function (stream) {
          var sock = stream.node.sock;
          return sock.sock_ops.poll(sock);
        },ioctl:function (stream, request, varargs) {
          var sock = stream.node.sock;
          return sock.sock_ops.ioctl(sock, request, varargs);
        },read:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          var msg = sock.sock_ops.recvmsg(sock, length);
          if (!msg) {
            // socket is closed
            return 0;
          }
          buffer.set(msg.buffer, offset);
          return msg.buffer.length;
        },write:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          return sock.sock_ops.sendmsg(sock, buffer, offset, length);
        },close:function (stream) {
          var sock = stream.node.sock;
          sock.sock_ops.close(sock);
        }},nextname:function () {
        if (!SOCKFS.nextname.current) {
          SOCKFS.nextname.current = 0;
        }
        return 'socket[' + (SOCKFS.nextname.current++) + ']';
      },websocket_sock_ops:{createPeer:function (sock, addr, port) {
          var ws;
          if (typeof addr === 'object') {
            ws = addr;
            addr = null;
            port = null;
          }
          if (ws) {
            // for sockets that've already connected (e.g. we're the server)
            // we can inspect the _socket property for the address
            if (ws._socket) {
              addr = ws._socket.remoteAddress;
              port = ws._socket.remotePort;
            }
            // if we're just now initializing a connection to the remote,
            // inspect the url property
            else {
              var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
              if (!result) {
                throw new Error('WebSocket URL must be in the format ws(s)://address:port');
              }
              addr = result[1];
              port = parseInt(result[2], 10);
            }
          } else {
            // create the actual websocket object and connect
            try {
              var url = 'ws://' + addr + ':' + port;
              // the node ws library API is slightly different than the browser's
              var opts = ENVIRONMENT_IS_NODE ? {} : ['binary'];
              ws = new WebSocket(url, opts);
              ws.binaryType = 'arraybuffer';
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH);
            }
          }
          var peer = {
            addr: addr,
            port: port,
            socket: ws,
            dgram_send_queue: []
          };
          SOCKFS.websocket_sock_ops.addPeer(sock, peer);
          SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
          // if this is a bound dgram socket, send the port number first to allow
          // us to override the ephemeral port reported to us by remotePort on the
          // remote end.
          if (sock.type === 2 && typeof sock.sport !== 'undefined') {
            peer.dgram_send_queue.push(new Uint8Array([
                255, 255, 255, 255,
                'p'.charCodeAt(0), 'o'.charCodeAt(0), 'r'.charCodeAt(0), 't'.charCodeAt(0),
                ((sock.sport & 0xff00) >> 8) , (sock.sport & 0xff)
            ]));
          }
          return peer;
        },getPeer:function (sock, addr, port) {
          return sock.peers[addr + ':' + port];
        },addPeer:function (sock, peer) {
          sock.peers[peer.addr + ':' + peer.port] = peer;
        },removePeer:function (sock, peer) {
          delete sock.peers[peer.addr + ':' + peer.port];
        },handlePeerEvents:function (sock, peer) {
          var first = true;
          var handleOpen = function () {
            try {
              var queued = peer.dgram_send_queue.shift();
              while (queued) {
                peer.socket.send(queued);
                queued = peer.dgram_send_queue.shift();
              }
            } catch (e) {
              // not much we can do here in the way of proper error handling as we've already
              // lied and said this data was sent. shut it down.
              peer.socket.close();
            }
          };
          var handleMessage = function(data) {
            assert(typeof data !== 'string' && data.byteLength !== undefined);  // must receive an ArrayBuffer
            data = new Uint8Array(data);  // make a typed array view on the array buffer
            // if this is the port message, override the peer's port with it
            var wasfirst = first;
            first = false;
            if (wasfirst &&
                data.length === 10 &&
                data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 &&
                data[4] === 'p'.charCodeAt(0) && data[5] === 'o'.charCodeAt(0) && data[6] === 'r'.charCodeAt(0) && data[7] === 't'.charCodeAt(0)) {
              // update the peer's port and it's key in the peer map
              var newport = ((data[8] << 8) | data[9]);
              SOCKFS.websocket_sock_ops.removePeer(sock, peer);
              peer.port = newport;
              SOCKFS.websocket_sock_ops.addPeer(sock, peer);
              return;
            }
            sock.recv_queue.push({ addr: peer.addr, port: peer.port, data: data });
          };
          if (ENVIRONMENT_IS_NODE) {
            peer.socket.on('open', handleOpen);
            peer.socket.on('message', function(data, flags) {
              if (!flags.binary) {
                return;
              }
              handleMessage((new Uint8Array(data)).buffer);  // copy from node Buffer -> ArrayBuffer
            });
            peer.socket.on('error', function() {
              // don't throw
            });
          } else {
            peer.socket.onopen = handleOpen;
            peer.socket.onmessage = function(event) {
              handleMessage(event.data);
            };
          }
        },poll:function (sock) {
          if (sock.type === 1 && sock.server) {
            // listen sockets should only say they're available for reading
            // if there are pending clients.
            return sock.pending.length ? (64 | 1) : 0;
          }
          var mask = 0;
          var dest = sock.type === 1 ?  // we only care about the socket state for connection-based sockets
            SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) :
            null;
          if (sock.recv_queue.length ||
              !dest ||  // connection-less sockets are always ready to read
              (dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {  // let recv return 0 once closed
            mask |= (64 | 1);
          }
          if (!dest ||  // connection-less sockets are always ready to write
              (dest && dest.socket.readyState === dest.socket.OPEN)) {
            mask |= 4;
          }
          if ((dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {
            mask |= 16;
          }
          return mask;
        },ioctl:function (sock, request, arg) {
          switch (request) {
            case 21531:
              var bytes = 0;
              if (sock.recv_queue.length) {
                bytes = sock.recv_queue[0].data.length;
              }
              HEAP32[((arg)>>2)]=bytes;
              return 0;
            default:
              return ERRNO_CODES.EINVAL;
          }
        },close:function (sock) {
          // if we've spawned a listen server, close it
          if (sock.server) {
            try {
              sock.server.close();
            } catch (e) {
            }
            sock.server = null;
          }
          // close any peer connections
          var peers = Object.keys(sock.peers);
          for (var i = 0; i < peers.length; i++) {
            var peer = sock.peers[peers[i]];
            try {
              peer.socket.close();
            } catch (e) {
            }
            SOCKFS.websocket_sock_ops.removePeer(sock, peer);
          }
          return 0;
        },bind:function (sock, addr, port) {
          if (typeof sock.saddr !== 'undefined' || typeof sock.sport !== 'undefined') {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already bound
          }
          sock.saddr = addr;
          sock.sport = port || _mkport();
          // in order to emulate dgram sockets, we need to launch a listen server when
          // binding on a connection-less socket
          // note: this is only required on the server side
          if (sock.type === 2) {
            // close the existing server if it exists
            if (sock.server) {
              sock.server.close();
              sock.server = null;
            }
            // swallow error operation not supported error that occurs when binding in the
            // browser where this isn't supported
            try {
              sock.sock_ops.listen(sock, 0);
            } catch (e) {
              if (!(e instanceof FS.ErrnoError)) throw e;
              if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e;
            }
          }
        },connect:function (sock, addr, port) {
          if (sock.server) {
            throw new FS.ErrnoError(ERRNO_CODS.EOPNOTSUPP);
          }
          // TODO autobind
          // if (!sock.addr && sock.type == 2) {
          // }
          // early out if we're already connected / in the middle of connecting
          if (typeof sock.daddr !== 'undefined' && typeof sock.dport !== 'undefined') {
            var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
            if (dest) {
              if (dest.socket.readyState === dest.socket.CONNECTING) {
                throw new FS.ErrnoError(ERRNO_CODES.EALREADY);
              } else {
                throw new FS.ErrnoError(ERRNO_CODES.EISCONN);
              }
            }
          }
          // add the socket to our peer list and set our
          // destination address / port to match
          var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
          sock.daddr = peer.addr;
          sock.dport = peer.port;
          // always "fail" in non-blocking mode
          throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS);
        },listen:function (sock, backlog) {
          if (!ENVIRONMENT_IS_NODE) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
          }
          if (sock.server) {
             throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already listening
          }
          var WebSocketServer = require('ws').Server;
          var host = sock.saddr;
          sock.server = new WebSocketServer({
            host: host,
            port: sock.sport
            // TODO support backlog
          });
          sock.server.on('connection', function(ws) {
            if (sock.type === 1) {
              var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
              // create a peer on the new socket
              var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
              newsock.daddr = peer.addr;
              newsock.dport = peer.port;
              // push to queue for accept to pick up
              sock.pending.push(newsock);
            } else {
              // create a peer on the listen socket so calling sendto
              // with the listen socket and an address will resolve
              // to the correct client
              SOCKFS.websocket_sock_ops.createPeer(sock, ws);
            }
          });
          sock.server.on('closed', function() {
            sock.server = null;
          });
          sock.server.on('error', function() {
            // don't throw
          });
        },accept:function (listensock) {
          if (!listensock.server) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          var newsock = listensock.pending.shift();
          newsock.stream.flags = listensock.stream.flags;
          return newsock;
        },getname:function (sock, peer) {
          var addr, port;
          if (peer) {
            if (sock.daddr === undefined || sock.dport === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            }
            addr = sock.daddr;
            port = sock.dport;
          } else {
            // TODO saddr and sport will be set for bind()'d UDP sockets, but what
            // should we be returning for TCP sockets that've been connect()'d?
            addr = sock.saddr || 0;
            port = sock.sport || 0;
          }
          return { addr: addr, port: port };
        },sendmsg:function (sock, buffer, offset, length, addr, port) {
          if (sock.type === 2) {
            // connection-less sockets will honor the message address,
            // and otherwise fall back to the bound destination address
            if (addr === undefined || port === undefined) {
              addr = sock.daddr;
              port = sock.dport;
            }
            // if there was no address to fall back to, error out
            if (addr === undefined || port === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ);
            }
          } else {
            // connection-based sockets will only use the bound
            addr = sock.daddr;
            port = sock.dport;
          }
          // find the peer for the destination address
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
          // early out if not connected with a connection-based socket
          if (sock.type === 1) {
            if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            } else if (dest.socket.readyState === dest.socket.CONNECTING) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
          // create a copy of the incoming data to send, as the WebSocket API
          // doesn't work entirely with an ArrayBufferView, it'll just send
          // the entire underlying buffer
          var data;
          if (buffer instanceof Array || buffer instanceof ArrayBuffer) {
            data = buffer.slice(offset, offset + length);
          } else {  // ArrayBufferView
            data = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + length);
          }
          // if we're emulating a connection-less dgram socket and don't have
          // a cached connection, queue the buffer to send upon connect and
          // lie, saying the data was sent now.
          if (sock.type === 2) {
            if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
              // if we're not connected, open a new connection
              if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
              }
              dest.dgram_send_queue.push(data);
              return length;
            }
          }
          try {
            // send the actual data
            dest.socket.send(data);
            return length;
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
        },recvmsg:function (sock, length) {
          // http://pubs.opengroup.org/onlinepubs/7908799/xns/recvmsg.html
          if (sock.type === 1 && sock.server) {
            // tcp servers should not be recv()'ing on the listen socket
            throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
          }
          var queued = sock.recv_queue.shift();
          if (!queued) {
            if (sock.type === 1) {
              var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
              if (!dest) {
                // if we have a destination address but are not connected, error out
                throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
              }
              else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                // return null if the socket has closed
                return null;
              }
              else {
                // else, our socket is in a valid state but truly has nothing available
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
            } else {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
          // queued.data will be an ArrayBuffer if it's unadulterated, but if it's
          // requeued TCP data it'll be an ArrayBufferView
          var queuedLength = queued.data.byteLength || queued.data.length;
          var queuedOffset = queued.data.byteOffset || 0;
          var queuedBuffer = queued.data.buffer || queued.data;
          var bytesRead = Math.min(length, queuedLength);
          var res = {
            buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
            addr: queued.addr,
            port: queued.port
          };
          // push back any unread data for TCP connections
          if (sock.type === 1 && bytesRead < queuedLength) {
            var bytesRemaining = queuedLength - bytesRead;
            queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
            sock.recv_queue.unshift(queued);
          }
          return res;
        }}};function _send(fd, buf, len, flags) {
      var sock = SOCKFS.getSocket(fd);
      if (!sock) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      // TODO honor flags
      return _write(fd, buf, len);
    }
  function _pwrite(fildes, buf, nbyte, offset) {
      // ssize_t pwrite(int fildes, const void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte, offset);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _write(fildes, buf, nbyte) {
      // ssize_t write(int fildes, const void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _fwrite(ptr, size, nitems, stream) {
      // size_t fwrite(const void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fwrite.html
      var bytesToWrite = nitems * size;
      if (bytesToWrite == 0) return 0;
      var bytesWritten = _write(stream, ptr, bytesToWrite);
      if (bytesWritten == -1) {
        var streamObj = FS.getStream(stream);
        if (streamObj) streamObj.error = true;
        return 0;
      } else {
        return Math.floor(bytesWritten / size);
      }
    }
  Module["_strlen"] = _strlen;
  function __reallyNegative(x) {
      return x < 0 || (x === 0 && (1/x) === -Infinity);
    }function __formatString(format, varargs) {
      var textIndex = format;
      var argIndex = 0;
      function getNextArg(type) {
        // NOTE: Explicitly ignoring type safety. Otherwise this fails:
        //       int x = 4; printf("%c\n", (char)x);
        var ret;
        if (type === 'double') {
          ret = HEAPF64[(((varargs)+(argIndex))>>3)];
        } else if (type == 'i64') {
          ret = [HEAP32[(((varargs)+(argIndex))>>2)],
                 HEAP32[(((varargs)+(argIndex+8))>>2)]];
          argIndex += 8; // each 32-bit chunk is in a 64-bit block
        } else {
          type = 'i32'; // varargs are always i32, i64, or double
          ret = HEAP32[(((varargs)+(argIndex))>>2)];
        }
        argIndex += Math.max(Runtime.getNativeFieldSize(type), Runtime.getAlignSize(type, null, true));
        return ret;
      }
      var ret = [];
      var curr, next, currArg;
      while(1) {
        var startTextIndex = textIndex;
        curr = HEAP8[(textIndex)];
        if (curr === 0) break;
        next = HEAP8[((textIndex+1)|0)];
        if (curr == 37) {
          // Handle flags.
          var flagAlwaysSigned = false;
          var flagLeftAlign = false;
          var flagAlternative = false;
          var flagZeroPad = false;
          var flagPadSign = false;
          flagsLoop: while (1) {
            switch (next) {
              case 43:
                flagAlwaysSigned = true;
                break;
              case 45:
                flagLeftAlign = true;
                break;
              case 35:
                flagAlternative = true;
                break;
              case 48:
                if (flagZeroPad) {
                  break flagsLoop;
                } else {
                  flagZeroPad = true;
                  break;
                }
              case 32:
                flagPadSign = true;
                break;
              default:
                break flagsLoop;
            }
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          }
          // Handle width.
          var width = 0;
          if (next == 42) {
            width = getNextArg('i32');
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          } else {
            while (next >= 48 && next <= 57) {
              width = width * 10 + (next - 48);
              textIndex++;
              next = HEAP8[((textIndex+1)|0)];
            }
          }
          // Handle precision.
          var precisionSet = false;
          if (next == 46) {
            var precision = 0;
            precisionSet = true;
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
            if (next == 42) {
              precision = getNextArg('i32');
              textIndex++;
            } else {
              while(1) {
                var precisionChr = HEAP8[((textIndex+1)|0)];
                if (precisionChr < 48 ||
                    precisionChr > 57) break;
                precision = precision * 10 + (precisionChr - 48);
                textIndex++;
              }
            }
            next = HEAP8[((textIndex+1)|0)];
          } else {
            var precision = 6; // Standard default.
          }
          // Handle integer sizes. WARNING: These assume a 32-bit architecture!
          var argSize;
          switch (String.fromCharCode(next)) {
            case 'h':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 104) {
                textIndex++;
                argSize = 1; // char (actually i32 in varargs)
              } else {
                argSize = 2; // short (actually i32 in varargs)
              }
              break;
            case 'l':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 108) {
                textIndex++;
                argSize = 8; // long long
              } else {
                argSize = 4; // long
              }
              break;
            case 'L': // long long
            case 'q': // int64_t
            case 'j': // intmax_t
              argSize = 8;
              break;
            case 'z': // size_t
            case 't': // ptrdiff_t
            case 'I': // signed ptrdiff_t or unsigned size_t
              argSize = 4;
              break;
            default:
              argSize = null;
          }
          if (argSize) textIndex++;
          next = HEAP8[((textIndex+1)|0)];
          // Handle type specifier.
          switch (String.fromCharCode(next)) {
            case 'd': case 'i': case 'u': case 'o': case 'x': case 'X': case 'p': {
              // Integer.
              var signed = next == 100 || next == 105;
              argSize = argSize || 4;
              var currArg = getNextArg('i' + (argSize * 8));
              var origArg = currArg;
              var argText;
              // Flatten i64-1 [low, high] into a (slightly rounded) double
              if (argSize == 8) {
                currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117);
              }
              // Truncate to requested size.
              if (argSize <= 4) {
                var limit = Math.pow(256, argSize) - 1;
                currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
              }
              // Format the number.
              var currAbsArg = Math.abs(currArg);
              var prefix = '';
              if (next == 100 || next == 105) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null); else
                argText = reSign(currArg, 8 * argSize, 1).toString(10);
              } else if (next == 117) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true); else
                argText = unSign(currArg, 8 * argSize, 1).toString(10);
                currArg = Math.abs(currArg);
              } else if (next == 111) {
                argText = (flagAlternative ? '0' : '') + currAbsArg.toString(8);
              } else if (next == 120 || next == 88) {
                prefix = (flagAlternative && currArg != 0) ? '0x' : '';
                if (argSize == 8 && i64Math) {
                  if (origArg[1]) {
                    argText = (origArg[1]>>>0).toString(16);
                    var lower = (origArg[0]>>>0).toString(16);
                    while (lower.length < 8) lower = '0' + lower;
                    argText += lower;
                  } else {
                    argText = (origArg[0]>>>0).toString(16);
                  }
                } else
                if (currArg < 0) {
                  // Represent negative numbers in hex as 2's complement.
                  currArg = -currArg;
                  argText = (currAbsArg - 1).toString(16);
                  var buffer = [];
                  for (var i = 0; i < argText.length; i++) {
                    buffer.push((0xF - parseInt(argText[i], 16)).toString(16));
                  }
                  argText = buffer.join('');
                  while (argText.length < argSize * 2) argText = 'f' + argText;
                } else {
                  argText = currAbsArg.toString(16);
                }
                if (next == 88) {
                  prefix = prefix.toUpperCase();
                  argText = argText.toUpperCase();
                }
              } else if (next == 112) {
                if (currAbsArg === 0) {
                  argText = '(nil)';
                } else {
                  prefix = '0x';
                  argText = currAbsArg.toString(16);
                }
              }
              if (precisionSet) {
                while (argText.length < precision) {
                  argText = '0' + argText;
                }
              }
              // Add sign if needed
              if (currArg >= 0) {
                if (flagAlwaysSigned) {
                  prefix = '+' + prefix;
                } else if (flagPadSign) {
                  prefix = ' ' + prefix;
                }
              }
              // Move sign to prefix so we zero-pad after the sign
              if (argText.charAt(0) == '-') {
                prefix = '-' + prefix;
                argText = argText.substr(1);
              }
              // Add padding.
              while (prefix.length + argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad) {
                    argText = '0' + argText;
                  } else {
                    prefix = ' ' + prefix;
                  }
                }
              }
              // Insert the result into the buffer.
              argText = prefix + argText;
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 'f': case 'F': case 'e': case 'E': case 'g': case 'G': {
              // Float.
              var currArg = getNextArg('double');
              var argText;
              if (isNaN(currArg)) {
                argText = 'nan';
                flagZeroPad = false;
              } else if (!isFinite(currArg)) {
                argText = (currArg < 0 ? '-' : '') + 'inf';
                flagZeroPad = false;
              } else {
                var isGeneral = false;
                var effectivePrecision = Math.min(precision, 20);
                // Convert g/G to f/F or e/E, as per:
                // http://pubs.opengroup.org/onlinepubs/9699919799/functions/printf.html
                if (next == 103 || next == 71) {
                  isGeneral = true;
                  precision = precision || 1;
                  var exponent = parseInt(currArg.toExponential(effectivePrecision).split('e')[1], 10);
                  if (precision > exponent && exponent >= -4) {
                    next = ((next == 103) ? 'f' : 'F').charCodeAt(0);
                    precision -= exponent + 1;
                  } else {
                    next = ((next == 103) ? 'e' : 'E').charCodeAt(0);
                    precision--;
                  }
                  effectivePrecision = Math.min(precision, 20);
                }
                if (next == 101 || next == 69) {
                  argText = currArg.toExponential(effectivePrecision);
                  // Make sure the exponent has at least 2 digits.
                  if (/[eE][-+]\d$/.test(argText)) {
                    argText = argText.slice(0, -1) + '0' + argText.slice(-1);
                  }
                } else if (next == 102 || next == 70) {
                  argText = currArg.toFixed(effectivePrecision);
                  if (currArg === 0 && __reallyNegative(currArg)) {
                    argText = '-' + argText;
                  }
                }
                var parts = argText.split('e');
                if (isGeneral && !flagAlternative) {
                  // Discard trailing zeros and periods.
                  while (parts[0].length > 1 && parts[0].indexOf('.') != -1 &&
                         (parts[0].slice(-1) == '0' || parts[0].slice(-1) == '.')) {
                    parts[0] = parts[0].slice(0, -1);
                  }
                } else {
                  // Make sure we have a period in alternative mode.
                  if (flagAlternative && argText.indexOf('.') == -1) parts[0] += '.';
                  // Zero pad until required precision.
                  while (precision > effectivePrecision++) parts[0] += '0';
                }
                argText = parts[0] + (parts.length > 1 ? 'e' + parts[1] : '');
                // Capitalize 'E' if needed.
                if (next == 69) argText = argText.toUpperCase();
                // Add sign.
                if (currArg >= 0) {
                  if (flagAlwaysSigned) {
                    argText = '+' + argText;
                  } else if (flagPadSign) {
                    argText = ' ' + argText;
                  }
                }
              }
              // Add padding.
              while (argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad && (argText[0] == '-' || argText[0] == '+')) {
                    argText = argText[0] + '0' + argText.slice(1);
                  } else {
                    argText = (flagZeroPad ? '0' : ' ') + argText;
                  }
                }
              }
              // Adjust case.
              if (next < 97) argText = argText.toUpperCase();
              // Insert the result into the buffer.
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 's': {
              // String.
              var arg = getNextArg('i8*');
              var argLength = arg ? _strlen(arg) : '(null)'.length;
              if (precisionSet) argLength = Math.min(argLength, precision);
              if (!flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              if (arg) {
                for (var i = 0; i < argLength; i++) {
                  ret.push(HEAPU8[((arg++)|0)]);
                }
              } else {
                ret = ret.concat(intArrayFromString('(null)'.substr(0, argLength), true));
              }
              if (flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              break;
            }
            case 'c': {
              // Character.
              if (flagLeftAlign) ret.push(getNextArg('i8'));
              while (--width > 0) {
                ret.push(32);
              }
              if (!flagLeftAlign) ret.push(getNextArg('i8'));
              break;
            }
            case 'n': {
              // Write the length written so far to the next parameter.
              var ptr = getNextArg('i32*');
              HEAP32[((ptr)>>2)]=ret.length
              break;
            }
            case '%': {
              // Literal percent sign.
              ret.push(curr);
              break;
            }
            default: {
              // Unknown specifiers remain untouched.
              for (var i = startTextIndex; i < textIndex + 2; i++) {
                ret.push(HEAP8[(i)]);
              }
            }
          }
          textIndex += 2;
          // TODO: Support a/A (hex float) and m (last error) specifiers.
          // TODO: Support %1${specifier} for arg selection.
        } else {
          ret.push(curr);
          textIndex += 1;
        }
      }
      return ret;
    }function _fprintf(stream, format, varargs) {
      // int fprintf(FILE *restrict stream, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var result = __formatString(format, varargs);
      var stack = Runtime.stackSave();
      var ret = _fwrite(allocate(result, 'i8', ALLOC_STACK), 1, result.length, stream);
      Runtime.stackRestore(stack);
      return ret;
    }function _printf(format, varargs) {
      // int printf(const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var stdout = HEAP32[((_stdout)>>2)];
      return _fprintf(stdout, format, varargs);
    }
  var _sqrtf=Math_sqrt;
  Module["_memcpy"] = _memcpy;var _llvm_memcpy_p0i8_p0i8_i32=_memcpy;
  function _llvm_lifetime_start() {}
  function _llvm_lifetime_end() {}
  Module["_memset"] = _memset;var _llvm_memset_p0i8_i32=_memset;
  var _floorf=Math_floor;
  function _glClearColor(x0, x1, x2, x3) { Module.ctx.clearColor(x0, x1, x2, x3) }
  function _glEnable(x0) { Module.ctx.enable(x0) }
  function _glBlendFunc(x0, x1) { Module.ctx.blendFunc(x0, x1) }
  function _glClear(x0) { Module.ctx.clear(x0) }
  function _glUseProgram(program) {
      Module.ctx.useProgram(program ? GL.programs[program] : null);
    }
  function _glGetAttribLocation(program, name) {
      program = GL.programs[program];
      name = Pointer_stringify(name);
      return Module.ctx.getAttribLocation(program, name);
    }
  function _glEnableVertexAttribArray(index) {
      Module.ctx.enableVertexAttribArray(index);
    }
  function _glGetUniformLocation(program, name) {
      name = Pointer_stringify(name);
      var arrayOffset = 0;
      // If user passed an array accessor "[index]", parse the array index off the accessor.
      if (name.indexOf(']', name.length-1) !== -1) {
        var ls = name.lastIndexOf('[');
        var arrayIndex = name.slice(ls+1, -1);
        if (arrayIndex.length > 0) {
          arrayOffset = parseInt(arrayIndex);
          if (arrayOffset < 0) {
            return -1;
          }
        }
        name = name.slice(0, ls);
      }
      var ptable = GL.uniformTable[program];
      if (!ptable) {
        return -1;
      }
      var uniformInfo = ptable[name]; // returns pair [ dimension_of_uniform_array, uniform_location ]
      if (uniformInfo && arrayOffset < uniformInfo[0]) { // Check if user asked for an out-of-bounds element, i.e. for 'vec4 colors[3];' user could ask for 'colors[10]' which should return -1.
        return uniformInfo[1]+arrayOffset;
      } else {
        return -1;
      }
    }
  function _glUniformMatrix4fv(location, count, transpose, value) {
      location = GL.uniforms[location];
      var view;
      if (count == 1) {
        // avoid allocation for the common case of uploading one uniform matrix
        view = GL.miniTempBufferViews[15];
        for (var i = 0; i < 16; i++) {
          view[i] = HEAPF32[(((value)+(i*4))>>2)];
        }
      } else {
        view = HEAPF32.subarray((value)>>2,(value+count*64)>>2);
      }
      Module.ctx.uniformMatrix4fv(location, transpose, view);
    }
  function _glBindBuffer(target, buffer) {
      var bufferObj = buffer ? GL.buffers[buffer] : null;
      if (target == Module.ctx.ARRAY_BUFFER) {
        GL.currArrayBuffer = buffer;
      } else if (target == Module.ctx.ELEMENT_ARRAY_BUFFER) {
        GL.currElementArrayBuffer = buffer;
      }
      Module.ctx.bindBuffer(target, bufferObj);
    }
  function _glBufferData(target, size, data, usage) {
      switch (usage) { // fix usages, WebGL only has *_DRAW
        case 0x88E1: // GL_STREAM_READ
        case 0x88E2: // GL_STREAM_COPY
          usage = 0x88E0; // GL_STREAM_DRAW
          break;
        case 0x88E5: // GL_STATIC_READ
        case 0x88E6: // GL_STATIC_COPY
          usage = 0x88E4; // GL_STATIC_DRAW
          break;
        case 0x88E9: // GL_DYNAMIC_READ
        case 0x88EA: // GL_DYNAMIC_COPY
          usage = 0x88E8; // GL_DYNAMIC_DRAW
          break;
      }
      Module.ctx.bufferData(target, HEAPU8.subarray(data, data+size), usage);
    }
  function _glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
      Module.ctx.vertexAttribPointer(index, size, type, normalized, stride, ptr);
    }
  function _glDrawArrays(mode, first, count) {
      Module.ctx.drawArrays(mode, first, count);
    }
  function _glCreateProgram() {
      var id = GL.getNewId(GL.programs);
      var program = Module.ctx.createProgram();
      program.name = id;
      GL.programs[id] = program;
      return id;
    }
  function _glCreateShader(shaderType) {
      var id = GL.getNewId(GL.shaders);
      GL.shaders[id] = Module.ctx.createShader(shaderType);
      return id;
    }
  function _glAttachShader(program, shader) {
      Module.ctx.attachShader(GL.programs[program],
                              GL.shaders[shader]);
    }
  function _glLinkProgram(program) {
      Module.ctx.linkProgram(GL.programs[program]);
      GL.uniformTable[program] = {}; // uniforms no longer keep the same names after linking
      GL.populateUniformTable(program);
    }
  function _glGetProgramiv(program, pname, p) {
      if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
        HEAP32[((p)>>2)]=Module.ctx.getProgramInfoLog(GL.programs[program]).length + 1;
      } else {
        HEAP32[((p)>>2)]=Module.ctx.getProgramParameter(GL.programs[program], pname);
      }
    }
  function _glShaderSource(shader, count, string, length) {
      var source = GL.getSource(shader, count, string, length);
      Module.ctx.shaderSource(GL.shaders[shader], source);
    }
  function _glCompileShader(shader) {
      Module.ctx.compileShader(GL.shaders[shader]);
    }
  function _glGetShaderiv(shader, pname, p) {
      if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
        HEAP32[((p)>>2)]=Module.ctx.getShaderInfoLog(GL.shaders[shader]).length + 1;
      } else {
        HEAP32[((p)>>2)]=Module.ctx.getShaderParameter(GL.shaders[shader], pname);
      }
    }
  function _llvm_stacksave() {
      var self = _llvm_stacksave;
      if (!self.LLVM_SAVEDSTACKS) {
        self.LLVM_SAVEDSTACKS = [];
      }
      self.LLVM_SAVEDSTACKS.push(Runtime.stackSave());
      return self.LLVM_SAVEDSTACKS.length-1;
    }
  function _glGetShaderInfoLog(shader, maxLength, length, infoLog) {
      var log = Module.ctx.getShaderInfoLog(GL.shaders[shader]);
      // Work around a bug in Chromium which causes getShaderInfoLog to return null
      if (!log) {
        log = "";
      }
      log = log.substr(0, maxLength - 1);
      writeStringToMemory(log, infoLog);
      if (length) {
        HEAP32[((length)>>2)]=log.length
      }
    }
  function _llvm_stackrestore(p) {
      var self = _llvm_stacksave;
      var ret = self.LLVM_SAVEDSTACKS[p];
      self.LLVM_SAVEDSTACKS.splice(p, 1);
      Runtime.stackRestore(ret);
    }
  function _fputs(s, stream) {
      // int fputs(const char *restrict s, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fputs.html
      return _write(stream, s, _strlen(s));
    }
  function _fputc(c, stream) {
      // int fputc(int c, FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fputc.html
      var chr = unSign(c & 0xFF);
      HEAP8[((_fputc.ret)|0)]=chr
      var ret = _write(stream, _fputc.ret, 1);
      if (ret == -1) {
        var streamObj = FS.getStream(stream);
        if (streamObj) streamObj.error = true;
        return -1;
      } else {
        return chr;
      }
    }function _puts(s) {
      // int puts(const char *s);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/puts.html
      // NOTE: puts() always writes an extra newline.
      var stdout = HEAP32[((_stdout)>>2)];
      var ret = _fputs(s, stdout);
      if (ret < 0) {
        return ret;
      } else {
        var newlineRet = _fputc(10, stdout);
        return (newlineRet < 0) ? -1 : ret + 1;
      }
    }
  function ___assert_fail(condition, filename, line, func) {
      ABORT = true;
      throw 'Assertion failed: ' + Pointer_stringify(condition) + ', at: ' + [filename ? Pointer_stringify(filename) : 'unknown filename', line, func ? Pointer_stringify(func) : 'unknown function'] + ' at ' + stackTrace();
    }
  var Browser={mainLoop:{scheduler:null,shouldPause:false,paused:false,queue:[],pause:function () {
          Browser.mainLoop.shouldPause = true;
        },resume:function () {
          if (Browser.mainLoop.paused) {
            Browser.mainLoop.paused = false;
            Browser.mainLoop.scheduler();
          }
          Browser.mainLoop.shouldPause = false;
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
        if (Browser.initted || ENVIRONMENT_IS_WORKER) return;
        Browser.initted = true;
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
        var imagePlugin = {};
        imagePlugin['canHandle'] = function(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
        var audioPlugin = {};
        audioPlugin['canHandle'] = function(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
        // Canvas event setup
        var canvas = Module['canvas'];
        canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                    canvas['mozRequestPointerLock'] ||
                                    canvas['webkitRequestPointerLock'];
        canvas.exitPointerLock = document['exitPointerLock'] ||
                                 document['mozExitPointerLock'] ||
                                 document['webkitExitPointerLock'] ||
                                 function(){}; // no-op if function does not exist
        canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas;
        }
        document.addEventListener('pointerlockchange', pointerLockChange, false);
        document.addEventListener('mozpointerlockchange', pointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
        if (Module['elementPointerLock']) {
          canvas.addEventListener("click", function(ev) {
            if (!Browser.pointerLock && canvas.requestPointerLock) {
              canvas.requestPointerLock();
              ev.preventDefault();
            }
          }, false);
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        var ctx;
        try {
          if (useWebGL) {
            var contextAttributes = {
              antialias: false,
              alpha: false
            };
            if (webGLContextAttributes) {
              for (var attribute in webGLContextAttributes) {
                contextAttributes[attribute] = webGLContextAttributes[attribute];
              }
            }
            ctx = canvas.getContext('experimental-webgl', contextAttributes);
          } else {
            ctx = canvas.getContext('2d');
          }
          if (!ctx) throw ':(';
        } catch (e) {
          Module.print('Could not create canvas - ' + e);
          return null;
        }
        if (useWebGL) {
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
          // Warn on context loss
          canvas.addEventListener('webglcontextlost', function(event) {
            alert('WebGL context lost. You will need to reload the page.');
          }, false);
        }
        if (setInModule) {
          Module.ctx = ctx;
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement']) === canvas) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'];
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else if (Browser.resizeCanvas){
            Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
        }
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
        }
        canvas.requestFullScreen = canvas['requestFullScreen'] ||
                                   canvas['mozRequestFullScreen'] ||
                                   (canvas['webkitRequestFullScreen'] ? function() { canvas['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvas.requestFullScreen();
      },requestAnimationFrame:function (func) {
        if (!window.requestAnimationFrame) {
          window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                         window['mozRequestAnimationFrame'] ||
                                         window['webkitRequestAnimationFrame'] ||
                                         window['msRequestAnimationFrame'] ||
                                         window['oRequestAnimationFrame'] ||
                                         window['setTimeout'];
        }
        window.requestAnimationFrame(func);
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (!ABORT) func();
        });
      },safeSetTimeout:function (func, timeout) {
        return setTimeout(function() {
          if (!ABORT) func();
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        return setInterval(function() {
          if (!ABORT) func();
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var x, y;
          if (event.type == 'touchstart' ||
              event.type == 'touchend' ||
              event.type == 'touchmove') {
            var t = event.touches.item(0);
            if (t) {
              x = t.pageX - (window.scrollX + rect.left);
              y = t.pageY - (window.scrollY + rect.top);
            } else {
              return;
            }
          } else {
            x = event.pageX - (window.scrollX + rect.left);
            y = event.pageY - (window.scrollY + rect.top);
          }
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        canvas.width = width;
        canvas.height = height;
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        var canvas = Module['canvas'];
        this.windowedWidth = canvas.width;
        this.windowedHeight = canvas.height;
        canvas.width = screen.width;
        canvas.height = screen.height;
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        var canvas = Module['canvas'];
        canvas.width = this.windowedWidth;
        canvas.height = this.windowedHeight;
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      }};var SDL={defaults:{width:320,height:200,copyOnLock:true},version:null,surfaces:{},canvasPool:[],events:[],fonts:[null],audios:[null],rwops:[null],music:{audio:null,volume:1},mixerFrequency:22050,mixerFormat:32784,mixerNumChannels:2,mixerChunkSize:1024,channelMinimumNumber:0,GL:false,glAttributes:{0:3,1:3,2:2,3:0,4:0,5:1,6:16,7:0,8:0,9:0,10:0,11:0,12:0,13:0,14:0,15:1,16:0,17:0,18:0},keyboardState:null,keyboardMap:{},canRequestFullscreen:false,isRequestingFullscreen:false,textInput:false,startTime:null,buttonState:0,modState:0,DOMButtons:[0,0,0],DOMEventToSDLEvent:{},keyCodes:{16:1249,17:1248,18:1250,33:1099,34:1102,37:1104,38:1106,39:1103,40:1105,46:127,96:1112,97:1113,98:1114,99:1115,100:1116,101:1117,102:1118,103:1119,104:1120,105:1121,112:1082,113:1083,114:1084,115:1085,116:1086,117:1087,118:1088,119:1089,120:1090,121:1091,122:1092,123:1093,173:45,188:44,190:46,191:47,192:96},scanCodes:{8:42,9:43,13:40,27:41,32:44,44:54,46:55,47:56,48:39,49:30,50:31,51:32,52:33,53:34,54:35,55:36,56:37,57:38,59:51,61:46,91:47,92:49,93:48,96:52,97:4,98:5,99:6,100:7,101:8,102:9,103:10,104:11,105:12,106:13,107:14,108:15,109:16,110:17,111:18,112:19,113:20,114:21,115:22,116:23,117:24,118:25,119:26,120:27,121:28,122:29,305:224,308:226},loadRect:function (rect) {
        return {
          x: HEAP32[((rect + 0)>>2)],
          y: HEAP32[((rect + 4)>>2)],
          w: HEAP32[((rect + 8)>>2)],
          h: HEAP32[((rect + 12)>>2)]
        };
      },loadColorToCSSRGB:function (color) {
        var rgba = HEAP32[((color)>>2)];
        return 'rgb(' + (rgba&255) + ',' + ((rgba >> 8)&255) + ',' + ((rgba >> 16)&255) + ')';
      },loadColorToCSSRGBA:function (color) {
        var rgba = HEAP32[((color)>>2)];
        return 'rgba(' + (rgba&255) + ',' + ((rgba >> 8)&255) + ',' + ((rgba >> 16)&255) + ',' + (((rgba >> 24)&255)/255) + ')';
      },translateColorToCSSRGBA:function (rgba) {
        return 'rgba(' + (rgba&0xff) + ',' + (rgba>>8 & 0xff) + ',' + (rgba>>16 & 0xff) + ',' + (rgba>>>24)/0xff + ')';
      },translateRGBAToCSSRGBA:function (r, g, b, a) {
        return 'rgba(' + (r&0xff) + ',' + (g&0xff) + ',' + (b&0xff) + ',' + (a&0xff)/255 + ')';
      },translateRGBAToColor:function (r, g, b, a) {
        return r | g << 8 | b << 16 | a << 24;
      },makeSurface:function (width, height, flags, usePageCanvas, source, rmask, gmask, bmask, amask) {
        flags = flags || 0;
        var surf = _malloc(60);  // SDL_Surface has 15 fields of quantum size
        var buffer = _malloc(width*height*4); // TODO: only allocate when locked the first time
        var pixelFormat = _malloc(44);
        flags |= 1; // SDL_HWSURFACE - this tells SDL_MUSTLOCK that this needs to be locked
        //surface with SDL_HWPALETTE flag is 8bpp surface (1 byte)
        var is_SDL_HWPALETTE = flags & 0x00200000;  
        var bpp = is_SDL_HWPALETTE ? 1 : 4;
        HEAP32[((surf)>>2)]=flags         // SDL_Surface.flags
        HEAP32[(((surf)+(4))>>2)]=pixelFormat // SDL_Surface.format TODO
        HEAP32[(((surf)+(8))>>2)]=width         // SDL_Surface.w
        HEAP32[(((surf)+(12))>>2)]=height        // SDL_Surface.h
        HEAP32[(((surf)+(16))>>2)]=width * bpp       // SDL_Surface.pitch, assuming RGBA or indexed for now,
                                                                                 // since that is what ImageData gives us in browsers
        HEAP32[(((surf)+(20))>>2)]=buffer      // SDL_Surface.pixels
        HEAP32[(((surf)+(36))>>2)]=0      // SDL_Surface.offset
        HEAP32[(((surf)+(56))>>2)]=1
        HEAP32[((pixelFormat)>>2)]=0 /* XXX missing C define SDL_PIXELFORMAT_RGBA8888 */ // SDL_PIXELFORMAT_RGBA8888
        HEAP32[(((pixelFormat)+(4))>>2)]=0 // TODO
        HEAP8[(((pixelFormat)+(8))|0)]=bpp * 8
        HEAP8[(((pixelFormat)+(9))|0)]=bpp
        HEAP32[(((pixelFormat)+(12))>>2)]=rmask || 0x000000ff
        HEAP32[(((pixelFormat)+(16))>>2)]=gmask || 0x0000ff00
        HEAP32[(((pixelFormat)+(20))>>2)]=bmask || 0x00ff0000
        HEAP32[(((pixelFormat)+(24))>>2)]=amask || 0xff000000
        // Decide if we want to use WebGL or not
        var useWebGL = (flags & 0x04000000) != 0; // SDL_OPENGL
        SDL.GL = SDL.GL || useWebGL;
        var canvas;
        if (!usePageCanvas) {
          if (SDL.canvasPool.length > 0) {
            canvas = SDL.canvasPool.pop();
          } else {
            canvas = document.createElement('canvas');
          }
          canvas.width = width;
          canvas.height = height;
        } else {
          canvas = Module['canvas'];
        }
        var webGLContextAttributes = {
          antialias: ((SDL.glAttributes[13 /*SDL_GL_MULTISAMPLEBUFFERS*/] != 0) && (SDL.glAttributes[14 /*SDL_GL_MULTISAMPLESAMPLES*/] > 1)),
          depth: (SDL.glAttributes[6 /*SDL_GL_DEPTH_SIZE*/] > 0),
          stencil: (SDL.glAttributes[7 /*SDL_GL_STENCIL_SIZE*/] > 0)
        };
        var ctx = Browser.createContext(canvas, useWebGL, usePageCanvas, webGLContextAttributes);
        SDL.surfaces[surf] = {
          width: width,
          height: height,
          canvas: canvas,
          ctx: ctx,
          surf: surf,
          buffer: buffer,
          pixelFormat: pixelFormat,
          alpha: 255,
          flags: flags,
          locked: 0,
          usePageCanvas: usePageCanvas,
          source: source,
          isFlagSet: function(flag) {
            return flags & flag;
          }
        };
        return surf;
      },copyIndexedColorData:function (surfData, rX, rY, rW, rH) {
        // HWPALETTE works with palette
        // setted by SDL_SetColors
        if (!surfData.colors) {
          return;
        }
        var fullWidth  = Module['canvas'].width;
        var fullHeight = Module['canvas'].height;
        var startX  = rX || 0;
        var startY  = rY || 0;
        var endX    = (rW || (fullWidth - startX)) + startX;
        var endY    = (rH || (fullHeight - startY)) + startY;
        var buffer  = surfData.buffer;
        var data    = surfData.image.data;
        var colors  = surfData.colors;
        for (var y = startY; y < endY; ++y) {
          var indexBase = y * fullWidth;
          var colorBase = indexBase * 4;
          for (var x = startX; x < endX; ++x) {
            // HWPALETTE have only 256 colors (not rgba)
            var index = HEAPU8[((buffer + indexBase + x)|0)] * 3;
            var colorOffset = colorBase + x * 4;
            data[colorOffset   ] = colors[index   ];
            data[colorOffset +1] = colors[index +1];
            data[colorOffset +2] = colors[index +2];
            //unused: data[colorOffset +3] = color[index +3];
          }
        }
      },freeSurface:function (surf) {
        var refcountPointer = surf + 56;
        var refcount = HEAP32[((refcountPointer)>>2)];
        if (refcount > 1) {
          HEAP32[((refcountPointer)>>2)]=refcount - 1;
          return;
        }
        var info = SDL.surfaces[surf];
        if (!info.usePageCanvas && info.canvas) SDL.canvasPool.push(info.canvas);
        _free(info.buffer);
        _free(info.pixelFormat);
        _free(surf);
        SDL.surfaces[surf] = null;
      },touchX:0,touchY:0,savedKeydown:null,receiveEvent:function (event) {
        switch(event.type) {
          case 'touchstart':
            event.preventDefault();
            var touch = event.touches[0];
            touchX = touch.pageX;
            touchY = touch.pageY;
            var event = {
              type: 'mousedown',
              button: 0,
              pageX: touchX,
              pageY: touchY
            };
            SDL.DOMButtons[0] = 1;
            SDL.events.push(event);
            break;
          case 'touchmove':
            event.preventDefault();
            var touch = event.touches[0];
            touchX = touch.pageX;
            touchY = touch.pageY;
            event = {
              type: 'mousemove',
              button: 0,
              pageX: touchX,
              pageY: touchY
            };
            SDL.events.push(event);
            break;
          case 'touchend':
            event.preventDefault();
            event = {
              type: 'mouseup',
              button: 0,
              pageX: touchX,
              pageY: touchY
            };
            SDL.DOMButtons[0] = 0;
            SDL.events.push(event);
            break;
          case 'mousemove':
            if (Browser.pointerLock) {
              // workaround for firefox bug 750111
              if ('mozMovementX' in event) {
                event['movementX'] = event['mozMovementX'];
                event['movementY'] = event['mozMovementY'];
              }
              // workaround for Firefox bug 782777
              if (event['movementX'] == 0 && event['movementY'] == 0) {
                // ignore a mousemove event if it doesn't contain any movement info
                // (without pointer lock, we infer movement from pageX/pageY, so this check is unnecessary)
                event.preventDefault();
                return;
              }
            }
            // fall through
          case 'keydown': case 'keyup': case 'keypress': case 'mousedown': case 'mouseup': case 'DOMMouseScroll': case 'mousewheel':
            // If we preventDefault on keydown events, the subsequent keypress events
            // won't fire. However, it's fine (and in some cases necessary) to
            // preventDefault for keys that don't generate a character. Otherwise,
            // preventDefault is the right thing to do in general.
            if (event.type !== 'keydown' || (event.keyCode === 8 /* backspace */ || event.keyCode === 9 /* tab */)) {
              event.preventDefault();
            }
            if (event.type == 'DOMMouseScroll' || event.type == 'mousewheel') {
              var button = (event.type == 'DOMMouseScroll' ? event.detail : -event.wheelDelta) > 0 ? 4 : 3;
              var event2 = {
                type: 'mousedown',
                button: button,
                pageX: event.pageX,
                pageY: event.pageY
              };
              SDL.events.push(event2);
              event = {
                type: 'mouseup',
                button: button,
                pageX: event.pageX,
                pageY: event.pageY
              };
            } else if (event.type == 'mousedown') {
              SDL.DOMButtons[event.button] = 1;
            } else if (event.type == 'mouseup') {
              // ignore extra ups, can happen if we leave the canvas while pressing down, then return,
              // since we add a mouseup in that case
              if (!SDL.DOMButtons[event.button]) {
                return;
              }
              SDL.DOMButtons[event.button] = 0;
            }
            // We can only request fullscreen as the result of user input.
            // Due to this limitation, we toggle a boolean on keydown which
            // SDL_WM_ToggleFullScreen will check and subsequently set another
            // flag indicating for us to request fullscreen on the following
            // keyup. This isn't perfect, but it enables SDL_WM_ToggleFullScreen
            // to work as the result of a keypress (which is an extremely
            // common use case).
            if (event.type === 'keydown') {
              SDL.canRequestFullscreen = true;
            } else if (event.type === 'keyup') {
              if (SDL.isRequestingFullscreen) {
                Module['requestFullScreen'](true, true);
                SDL.isRequestingFullscreen = false;
              }
              SDL.canRequestFullscreen = false;
            }
            // SDL expects a unicode character to be passed to its keydown events.
            // Unfortunately, the browser APIs only provide a charCode property on
            // keypress events, so we must backfill in keydown events with their
            // subsequent keypress event's charCode.
            if (event.type === 'keypress' && SDL.savedKeydown) {
              // charCode is read-only
              SDL.savedKeydown.keypressCharCode = event.charCode;
              SDL.savedKeydown = null;
            } else if (event.type === 'keydown') {
              SDL.savedKeydown = event;
            }
            // Don't push keypress events unless SDL_StartTextInput has been called.
            if (event.type !== 'keypress' || SDL.textInput) {
              SDL.events.push(event);
            }
            break;
          case 'mouseout':
            // Un-press all pressed mouse buttons, because we might miss the release outside of the canvas
            for (var i = 0; i < 3; i++) {
              if (SDL.DOMButtons[i]) {
                SDL.events.push({
                  type: 'mouseup',
                  button: i,
                  pageX: event.pageX,
                  pageY: event.pageY
                });
                SDL.DOMButtons[i] = 0;
              }
            }
            event.preventDefault();
            break;
          case 'blur':
          case 'visibilitychange': {
            // Un-press all pressed keys: TODO
            for (var code in SDL.keyboardMap) {
              SDL.events.push({
                type: 'keyup',
                keyCode: SDL.keyboardMap[code]
              });
            }
            event.preventDefault();
            break;
          }
          case 'unload':
            if (Browser.mainLoop.runner) {
              SDL.events.push(event);
              // Force-run a main event loop, since otherwise this event will never be caught!
              Browser.mainLoop.runner();
            }
            return;
          case 'resize':
            SDL.events.push(event);
            // manually triggered resize event doesn't have a preventDefault member
            if (event.preventDefault) {
              event.preventDefault();
            }
            break;
        }
        if (SDL.events.length >= 10000) {
          Module.printErr('SDL event queue full, dropping events');
          SDL.events = SDL.events.slice(0, 10000);
        }
        return;
      },handleEvent:function (event) {
        if (event.handled) return;
        event.handled = true;
        switch (event.type) {
          case 'keydown': case 'keyup': {
            var down = event.type === 'keydown';
            var code = event.keyCode;
            if (code >= 65 && code <= 90) {
              code += 32; // make lowercase for SDL
            } else {
              code = SDL.keyCodes[event.keyCode] || event.keyCode;
            }
            HEAP8[(((SDL.keyboardState)+(code))|0)]=down;
            // TODO: lmeta, rmeta, numlock, capslock, KMOD_MODE, KMOD_RESERVED
            SDL.modState = (HEAP8[(((SDL.keyboardState)+(1248))|0)] ? 0x0040 | 0x0080 : 0) | // KMOD_LCTRL & KMOD_RCTRL
              (HEAP8[(((SDL.keyboardState)+(1249))|0)] ? 0x0001 | 0x0002 : 0) | // KMOD_LSHIFT & KMOD_RSHIFT
              (HEAP8[(((SDL.keyboardState)+(1250))|0)] ? 0x0100 | 0x0200 : 0); // KMOD_LALT & KMOD_RALT
            if (down) {
              SDL.keyboardMap[code] = event.keyCode; // save the DOM input, which we can use to unpress it during blur
            } else {
              delete SDL.keyboardMap[code];
            }
            break;
          }
          case 'mousedown': case 'mouseup':
            if (event.type == 'mousedown') {
              // SDL_BUTTON(x) is defined as (1 << ((x)-1)).  SDL buttons are 1-3,
              // and DOM buttons are 0-2, so this means that the below formula is
              // correct.
              SDL.buttonState |= 1 << event.button;
            } else if (event.type == 'mouseup') {
              SDL.buttonState &= ~(1 << event.button);
            }
            // fall through
          case 'mousemove': {
            Browser.calculateMouseEvent(event);
            break;
          }
        }
      },makeCEvent:function (event, ptr) {
        if (typeof event === 'number') {
          // This is a pointer to a native C event that was SDL_PushEvent'ed
          _memcpy(ptr, event, 28); // XXX
          return;
        }
        SDL.handleEvent(event);
        switch (event.type) {
          case 'keydown': case 'keyup': {
            var down = event.type === 'keydown';
            //Module.print('Received key event: ' + event.keyCode);
            var key = event.keyCode;
            if (key >= 65 && key <= 90) {
              key += 32; // make lowercase for SDL
            } else {
              key = SDL.keyCodes[event.keyCode] || event.keyCode;
            }
            var scan;
            if (key >= 1024) {
              scan = key - 1024;
            } else {
              scan = SDL.scanCodes[key] || key;
            }
            HEAP32[((ptr)>>2)]=SDL.DOMEventToSDLEvent[event.type]
            HEAP8[(((ptr)+(8))|0)]=down ? 1 : 0
            HEAP8[(((ptr)+(9))|0)]=0 // TODO
            HEAP32[(((ptr)+(12))>>2)]=scan
            HEAP32[(((ptr)+(16))>>2)]=key
            HEAP16[(((ptr)+(20))>>1)]=SDL.modState
            // some non-character keys (e.g. backspace and tab) won't have keypressCharCode set, fill in with the keyCode.
            HEAP32[(((ptr)+(24))>>2)]=event.keypressCharCode || key
            break;
          }
          case 'keypress': {
            HEAP32[((ptr)>>2)]=SDL.DOMEventToSDLEvent[event.type]
            // Not filling in windowID for now
            var cStr = intArrayFromString(String.fromCharCode(event.charCode));
            for (var i = 0; i < cStr.length; ++i) {
              HEAP8[(((ptr)+(8 + i))|0)]=cStr[i];
            }
            break;
          }
          case 'mousedown': case 'mouseup': case 'mousemove': {
            if (event.type != 'mousemove') {
              var down = event.type === 'mousedown';
              HEAP32[((ptr)>>2)]=SDL.DOMEventToSDLEvent[event.type];
              HEAP8[(((ptr)+(8))|0)]=event.button+1; // DOM buttons are 0-2, SDL 1-3
              HEAP8[(((ptr)+(9))|0)]=down ? 1 : 0;
              HEAP32[(((ptr)+(12))>>2)]=Browser.mouseX;
              HEAP32[(((ptr)+(16))>>2)]=Browser.mouseY;
            } else {
              HEAP32[((ptr)>>2)]=SDL.DOMEventToSDLEvent[event.type];
              HEAP8[(((ptr)+(8))|0)]=SDL.buttonState;
              HEAP32[(((ptr)+(12))>>2)]=Browser.mouseX;
              HEAP32[(((ptr)+(16))>>2)]=Browser.mouseY;
              HEAP32[(((ptr)+(20))>>2)]=Browser.mouseMovementX;
              HEAP32[(((ptr)+(24))>>2)]=Browser.mouseMovementY;
            }
            break;
          }
          case 'unload': {
            HEAP32[((ptr)>>2)]=SDL.DOMEventToSDLEvent[event.type];
            break;
          }
          case 'resize': {
            HEAP32[((ptr)>>2)]=SDL.DOMEventToSDLEvent[event.type];
            HEAP32[(((ptr)+(4))>>2)]=event.w;
            HEAP32[(((ptr)+(8))>>2)]=event.h;
            break;
          }
          default: throw 'Unhandled SDL event: ' + event.type;
        }
      },estimateTextWidth:function (fontData, text) {
        var h = fontData.size;
        var fontString = h + 'px ' + fontData.name;
        var tempCtx = SDL.ttfContext;
        tempCtx.save();
        tempCtx.font = fontString;
        var ret = tempCtx.measureText(text).width | 0;
        tempCtx.restore();
        return ret;
      },allocateChannels:function (num) { // called from Mix_AllocateChannels and init
        if (SDL.numChannels && SDL.numChannels >= num && num != 0) return;
        SDL.numChannels = num;
        SDL.channels = [];
        for (var i = 0; i < num; i++) {
          SDL.channels[i] = {
            audio: null,
            volume: 1.0
          };
        }
      },setGetVolume:function (info, volume) {
        if (!info) return 0;
        var ret = info.volume * 128; // MIX_MAX_VOLUME
        if (volume != -1) {
          info.volume = volume / 128;
          if (info.audio) info.audio.volume = info.volume;
        }
        return ret;
      },debugSurface:function (surfData) {
        console.log('dumping surface ' + [surfData.surf, surfData.source, surfData.width, surfData.height]);
        var image = surfData.ctx.getImageData(0, 0, surfData.width, surfData.height);
        var data = image.data;
        var num = Math.min(surfData.width, surfData.height);
        for (var i = 0; i < num; i++) {
          console.log('   diagonal ' + i + ':' + [data[i*surfData.width*4 + i*4 + 0], data[i*surfData.width*4 + i*4 + 1], data[i*surfData.width*4 + i*4 + 2], data[i*surfData.width*4 + i*4 + 3]]);
        }
      }};function _SDL_Init(what) {
      SDL.startTime = Date.now();
      // capture all key events. we just keep down and up, but also capture press to prevent default actions
      if (!Module['doNotCaptureKeyboard']) {
        document.addEventListener("keydown", SDL.receiveEvent);
        document.addEventListener("keyup", SDL.receiveEvent);
        document.addEventListener("keypress", SDL.receiveEvent);
        window.addEventListener("blur", SDL.receiveEvent);
        document.addEventListener("visibilitychange", SDL.receiveEvent);
      }
      window.addEventListener("unload", SDL.receiveEvent);
      SDL.keyboardState = _malloc(0x10000); // Our SDL needs 512, but 64K is safe for older SDLs
      _memset(SDL.keyboardState, 0, 0x10000);
      // Initialize this structure carefully for closure
      SDL.DOMEventToSDLEvent['keydown'] = 0x300 /* SDL_KEYDOWN */;
      SDL.DOMEventToSDLEvent['keyup'] = 0x301 /* SDL_KEYUP */;
      SDL.DOMEventToSDLEvent['keypress'] = 0x303 /* SDL_TEXTINPUT */;
      SDL.DOMEventToSDLEvent['mousedown'] = 0x401 /* SDL_MOUSEBUTTONDOWN */;
      SDL.DOMEventToSDLEvent['mouseup'] = 0x402 /* SDL_MOUSEBUTTONUP */;
      SDL.DOMEventToSDLEvent['mousemove'] = 0x400 /* SDL_MOUSEMOTION */;
      SDL.DOMEventToSDLEvent['unload'] = 0x100 /* SDL_QUIT */;
      SDL.DOMEventToSDLEvent['resize'] = 0x7001 /* SDL_VIDEORESIZE/SDL_EVENT_COMPAT2 */;
      return 0; // success
    }
  function _SDL_GetError() {
      if (!SDL.errorMessage) {
        SDL.errorMessage = allocate(intArrayFromString("unknown SDL-emscripten error"), 'i8', ALLOC_NORMAL);
      }
      return SDL.errorMessage;
    }
  function _SDL_GL_SetAttribute(attr, value) {
      if (!(attr in SDL.glAttributes)) {
        abort('Unknown SDL GL attribute (' + attr + '). Please check if your SDL version is supported.');
      }
      SDL.glAttributes[attr] = value;
    }
  function _SDL_SetVideoMode(width, height, depth, flags) {
      ['mousedown', 'mouseup', 'mousemove', 'DOMMouseScroll', 'mousewheel', 'mouseout'].forEach(function(event) {
        Module['canvas'].addEventListener(event, SDL.receiveEvent, true);
      });
      // (0,0) means 'use fullscreen' in native; in Emscripten, use the current canvas size.
      if (width == 0 && height == 0) {
        var canvas = Module['canvas'];
        width = canvas.width;
        height = canvas.height;
      }
      Browser.setCanvasSize(width, height, true);
      // Free the old surface first.
      if (SDL.screen) {
        SDL.freeSurface(SDL.screen);
        SDL.screen = null;
      }
      SDL.screen = SDL.makeSurface(width, height, flags, true, 'screen');
      if (!SDL.addedResizeListener) {
        SDL.addedResizeListener = true;
        Browser.resizeListeners.push(function(w, h) {
          SDL.receiveEvent({
            type: 'resize',
            w: w,
            h: h
          });
        });
      }
      return SDL.screen;
    }
  function _enable_resizable() {
        var scale = window.devicePixelRatio;
        window.addEventListener( 'resize', function() {
          Module.setCanvasSize(
            document.body.clientWidth * scale,
            window.innerHeight * scale
          );
        }, true );
        Module.setCanvasSize(
          document.body.clientWidth * scale,
          window.innerHeight * scale
        );
      }
  function _glViewport(x0, x1, x2, x3) { Module.ctx.viewport(x0, x1, x2, x3) }
  function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop) {
      Module['noExitRuntime'] = true;
      Browser.mainLoop.runner = function() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
        if (Browser.mainLoop.shouldPause) {
          // catch pauses from non-main loop sources
          Browser.mainLoop.paused = true;
          Browser.mainLoop.shouldPause = false;
          return;
        }
        if (Module['preMainLoop']) {
          Module['preMainLoop']();
        }
        try {
          Runtime.dynCall('v', func);
        } catch (e) {
          if (e instanceof ExitStatus) {
            return;
          } else {
            if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
            throw e;
          }
        }
        if (Module['postMainLoop']) {
          Module['postMainLoop']();
        }
        if (Browser.mainLoop.shouldPause) {
          // catch pauses from the main loop itself
          Browser.mainLoop.paused = true;
          Browser.mainLoop.shouldPause = false;
          return;
        }
        Browser.mainLoop.scheduler();
      }
      if (fps && fps > 0) {
        Browser.mainLoop.scheduler = function() {
          setTimeout(Browser.mainLoop.runner, 1000/fps); // doing this each time means that on exception, we stop
        }
      } else {
        Browser.mainLoop.scheduler = function() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        }
      }
      Browser.mainLoop.scheduler();
      if (simulateInfiniteLoop) {
        throw 'SimulateInfiniteLoop';
      }
    }
  function _SDL_GetTicks() {
      return Math.floor(Date.now() - SDL.startTime);
    }
  function _SDL_PollEvent(ptr) {
      if (SDL.events.length === 0) return 0;
      if (ptr) {
        SDL.makeCEvent(SDL.events.shift(), ptr);
      }
      return 1;
    }
  function _SDL_Quit() {
      for (var i = 0; i < SDL.numChannels; ++i) {
        if (SDL.channels[i].audio) {
          SDL.channels[i].audio.pause();
        }
      }
      if (SDL.music.audio) {
        SDL.music.audio.pause();
      }
      Module.print('SDL_Quit called (and ignored)');
    }
  function __exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      Module.print('exit(' + status + ') called');
      Module['exit'](status);
    }function _exit(status) {
      __exit(status);
    }
  var _fabsf=Math_abs;
  var _llvm_memset_p0i8_i64=_memset;
  function __webAudioBufferDelete( ctxId, bufferId ) {
        var ctx = AQAudioContext.context( ctxId );
        ctx.deleteBuffer( ctx.buffer( bufferId ));
      }
  function __webAudioSourceDelete( ctxId, sourceId ) {
        var ctx = AQAudioContext.context( ctxId );
        ctx.deleteSource( ctx.source( sourceId ));
      }
  function __webAudioSourceCreate( ctxId ) {
        var ctx = AQAudioContext.context( ctxId );
        return ctx.createSource().id;
      }
  function __webAudioContextInit() {
        var ctx = new AQAudioContext();
        return ctx.id;
      }
  function __webAudioContextDone( ctxId ) {
        var ctx = AQAudioContext.context( ctxId );
        delete AQAudioContext.contexts[ ctxId ];
        ctx.done();
      }
  function __webAudioContextSetListenerPosition( ctxId, x, y ) {
        var ctx = AQAudioContext.context( ctxId );
        ctx.setListenerPosition( x, y );
      }
  function __webAudioBufferCreate( ctxId, path ) {
        path = Module.Pointer_stringify( path );
        var ctx = AQAudioContext.context( ctxId );
        return ctx.createBuffer( path ).id;
      }
  function __webAudioSourceIsPlaying( ctxId, sourceId ) {
        var ctx = AQAudioContext.context( ctxId );
        var source = ctx.source( sourceId );
        return source ? ( source.isPlaying() ? 1 : 0 ) : 0;
      }
  function __webAudioSourceSetBuffer( ctxId, sourceId, bufferId ) {
        var ctx = AQAudioContext.context( ctxId );
        var source = ctx.source( sourceId );
        if ( source ) {
          source.setBuffer( ctx.buffer( bufferId ));
        }
      }
  function __webAudioSourcePlay( ctxId, sourceId ) {
        var ctx = AQAudioContext.context( ctxId );
        var source = ctx.source( sourceId );
        if ( source ) {
          source.play();
        }
      }
  function __webAudioSourceSetLooping( ctxId, sourceId, loop ) {
        var ctx = AQAudioContext.context( ctxId );
        var source = ctx.source( sourceId );
        if ( source ) {
          source.setLooping( !!loop );
        }
      }
  function __webAudioSourceSetPosition( ctxId, sourceId, x, y, z ) {
        var ctx = AQAudioContext.context( ctxId );
        var source = ctx.source( sourceId );
        if ( source ) {
          source.setPosition( x, y, z );
        }
      }
  function __webAudioSourceStop( ctxId, sourceId ) {
        var ctx = AQAudioContext.context( ctxId );
        var source = ctx.source( sourceId );
        if ( source ) {
          source.stop();
        }
      }
  var _llvm_va_start=undefined;
  function _llvm_va_end() {}
  function _strrchr(ptr, chr) {
      var ptr2 = ptr + _strlen(ptr);
      do {
        if (HEAP8[(ptr2)] == chr) return ptr2;
        ptr2--;
      } while (ptr2 >= ptr);
      return 0;
    }
  Module["_strncpy"] = _strncpy;
  function _strncmp(px, py, n) {
      var i = 0;
      while (i < n) {
        var x = HEAPU8[(((px)+(i))|0)];
        var y = HEAPU8[(((py)+(i))|0)];
        if (x == y && x == 0) return 0;
        if (x == 0) return -1;
        if (y == 0) return 1;
        if (x == y) {
          i ++;
          continue;
        } else {
          return x > y ? 1 : -1;
        }
      }
      return 0;
    }
  function _abort() {
      Module['abort']();
    }
  function ___errno_location() {
      return ___errno_state;
    }
  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) self.alloc(bytes);
      return ret;  // Previous break location.
    }
  function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: return 1;
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }
  function _time(ptr) {
      var ret = Math.floor(Date.now()/1000);
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret
      }
      return ret;
    }
GL.init()
FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });TTY.utf8 = new Runtime.UTF8Processor();
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); NODEFS.staticInit(); }
__ATINIT__.push({ func: function() { SOCKFS.root = FS.mount(SOCKFS, {}, null); } });
_fputc.ret = allocate([0], "i8", ALLOC_STATIC);
Module["requestFullScreen"] = function(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function() { Browser.getUserMedia() }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
staticSealed = true; // seal the static portion of memory
STACK_MAX = STACK_BASE + 5242880;
DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);
assert(DYNAMIC_BASE < TOTAL_MEMORY); // Stack must fit in TOTAL_MEMORY; allocations from here on may enlarge TOTAL_MEMORY
var Math_min = Math.min;
function invoke_vif(index,a1,a2) {
  try {
    Module["dynCall_vif"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_i(index) {
  try {
    return Module["dynCall_i"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_vii(index,a1,a2) {
  try {
    Module["dynCall_vii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_viff(index,a1,a2,a3) {
  try {
    Module["dynCall_viff"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_iiiff(index,a1,a2,a3,a4) {
  try {
    return Module["dynCall_iiiff"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_viii(index,a1,a2,a3) {
  try {
    Module["dynCall_viii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_v(index) {
  try {
    Module["dynCall_v"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_fi(index,a1) {
  try {
    return Module["dynCall_fi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function asmPrintInt(x, y) {
  Module.print('int ' + x + ',' + y);// + ' ' + new Error().stack);
}
function asmPrintFloat(x, y) {
  Module.print('float ' + x + ',' + y);// + ' ' + new Error().stack);
}
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'use asm';
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);
  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var NaN=+env.NaN;
  var Infinity=+env.Infinity;
  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;
  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var abort=env.abort;
  var assert=env.assert;
  var asmPrintInt=env.asmPrintInt;
  var asmPrintFloat=env.asmPrintFloat;
  var Math_min=env.min;
  var jsCall=env.jsCall;
  var invoke_vif=env.invoke_vif;
  var invoke_i=env.invoke_i;
  var invoke_vi=env.invoke_vi;
  var invoke_vii=env.invoke_vii;
  var invoke_viff=env.invoke_viff;
  var invoke_ii=env.invoke_ii;
  var invoke_iiiff=env.invoke_iiiff;
  var invoke_viii=env.invoke_viii;
  var invoke_v=env.invoke_v;
  var invoke_fi=env.invoke_fi;
  var invoke_iii=env.invoke_iii;
  var _llvm_lifetime_end=env._llvm_lifetime_end;
  var _glClearColor=env._glClearColor;
  var _llvm_dbg_value=env._llvm_dbg_value;
  var _enable_resizable=env._enable_resizable;
  var _glLinkProgram=env._glLinkProgram;
  var _fflush=env._fflush;
  var _fputc=env._fputc;
  var __webAudioBufferCreate=env.__webAudioBufferCreate;
  var _llvm_stackrestore=env._llvm_stackrestore;
  var _fwrite=env._fwrite;
  var _send=env._send;
  var _fputs=env._fputs;
  var _glCompileShader=env._glCompileShader;
  var __webAudioSourceCreate=env.__webAudioSourceCreate;
  var __webAudioSourceStop=env.__webAudioSourceStop;
  var _glCreateShader=env._glCreateShader;
  var _llvm_va_end=env._llvm_va_end;
  var __webAudioContextSetListenerPosition=env.__webAudioContextSetListenerPosition;
  var _glGetProgramiv=env._glGetProgramiv;
  var _glVertexAttribPointer=env._glVertexAttribPointer;
  var _glGetUniformLocation=env._glGetUniformLocation;
  var ___setErrNo=env.___setErrNo;
  var __webAudioSourceIsPlaying=env.__webAudioSourceIsPlaying;
  var __webAudioSourceSetPosition=env.__webAudioSourceSetPosition;
  var _glDrawArrays=env._glDrawArrays;
  var _exit=env._exit;
  var __webAudioContextInit=env.__webAudioContextInit;
  var _strrchr=env._strrchr;
  var _glAttachShader=env._glAttachShader;
  var __webAudioSourceSetLooping=env.__webAudioSourceSetLooping;
  var _glShaderSource=env._glShaderSource;
  var _SDL_GetTicks=env._SDL_GetTicks;
  var _cos=env._cos;
  var _SDL_PollEvent=env._SDL_PollEvent;
  var _llvm_stacksave=env._llvm_stacksave;
  var _SDL_Init=env._SDL_Init;
  var _glGetShaderiv=env._glGetShaderiv;
  var __exit=env.__exit;
  var _strncmp=env._strncmp;
  var _fabsf=env._fabsf;
  var _floorf=env._floorf;
  var __webAudioSourceDelete=env.__webAudioSourceDelete;
  var _printf=env._printf;
  var _SDL_SetVideoMode=env._SDL_SetVideoMode;
  var _sqrtf=env._sqrtf;
  var _SDL_GL_SetAttribute=env._SDL_GL_SetAttribute;
  var _sysconf=env._sysconf;
  var _puts=env._puts;
  var _glClear=env._glClear;
  var _glEnableVertexAttribArray=env._glEnableVertexAttribArray;
  var _glBindBuffer=env._glBindBuffer;
  var _SDL_GetError=env._SDL_GetError;
  var _glBufferData=env._glBufferData;
  var __formatString=env.__formatString;
  var __webAudioBufferDelete=env.__webAudioBufferDelete;
  var _sbrk=env._sbrk;
  var ___errno_location=env.___errno_location;
  var _llvm_lifetime_start=env._llvm_lifetime_start;
  var _SDL_Quit=env._SDL_Quit;
  var __webAudioSourcePlay=env.__webAudioSourcePlay;
  var _glUseProgram=env._glUseProgram;
  var ___assert_fail=env.___assert_fail;
  var _glGetShaderInfoLog=env._glGetShaderInfoLog;
  var _abort=env._abort;
  var _fprintf=env._fprintf;
  var __webAudioSourceSetBuffer=env.__webAudioSourceSetBuffer;
  var __reallyNegative=env.__reallyNegative;
  var _glEnable=env._glEnable;
  var _write=env._write;
  var _glGenBuffers=env._glGenBuffers;
  var _glGetAttribLocation=env._glGetAttribLocation;
  var _sin=env._sin;
  var _glBlendFunc=env._glBlendFunc;
  var _glCreateProgram=env._glCreateProgram;
  var _glViewport=env._glViewport;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var __webAudioContextDone=env.__webAudioContextDone;
  var _glUniformMatrix4fv=env._glUniformMatrix4fv;
  var _pwrite=env._pwrite;
  var _glDeleteBuffers=env._glDeleteBuffers;
  var _atan2=env._atan2;
  var _time=env._time;
// EMSCRIPTEN_START_FUNCS
function _malloc($bytes) {
 $bytes = $bytes | 0;
 var $cond = 0, $shr = 0, $0 = 0, $shr3 = 0, $add8 = 0, $shl = 0, $1 = 0, $2 = 0, $3 = 0, $fd9 = 0, $4 = 0, $bk = 0, $shl22 = 0, $9 = 0, $shl37 = 0, $and41 = 0, $sub44 = 0, $and46 = 0, $shr47 = 0, $and49 = 0, $shr51 = 0, $and53 = 0, $shr55 = 0, $and57 = 0, $shr59 = 0, $and61 = 0, $add64 = 0, $shl65 = 0, $13 = 0, $14 = 0, $15 = 0, $fd69 = 0, $16 = 0, $bk78 = 0, $shl90 = 0, $sub91 = 0, $20 = 0, $21 = 0, $23 = 0, $24 = 0, $shr101 = 0, $shl102 = 0, $25 = 0, $26 = 0, $shl105 = 0, $27 = 0, $28 = 0, $_pre_phi = 0, $F104_0 = 0, $32 = 0, $sub2_i = 0, $and3_i = 0, $shr4_i = 0, $and6_i = 0, $shr7_i = 0, $and9_i = 0, $shr11_i = 0, $and13_i = 0, $shr15_i = 0, $and17_i = 0, $33 = 0, $rsize_0_i = 0, $v_0_i = 0, $t_0_i = 0, $35 = 0, $36 = 0, $cond7_i = 0, $sub31_i = 0, $cmp32_i = 0, $38 = 0, $39 = 0, $add_ptr_i = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $bk47_i = 0, $fd50_i = 0, $arrayidx61_i = 0, $47 = 0, $arrayidx65_i = 0, $48 = 0, $RP_0_i = 0, $R_0_i = 0, $arrayidx71_i = 0, $49 = 0, $arrayidx75_i = 0, $50 = 0, $R_1_i = 0, $index_i = 0, $arrayidx94_i = 0, $arrayidx113_i = 0, $61 = 0, $64 = 0, $add177_i = 0, $67 = 0, $70 = 0, $71 = 0, $shr194_i = 0, $shl195_i = 0, $72 = 0, $73 = 0, $shl198_i = 0, $74 = 0, $75 = 0, $_pre_phi_i = 0, $F197_0_i = 0, $add_ptr225_i = 0, $add143 = 0, $and144 = 0, $79 = 0, $sub_i107 = 0, $shr_i108 = 0, $and_i112 = 0, $shl_i113 = 0, $and8_i = 0, $shl9_i = 0, $and12_i = 0, $add17_i = 0, $idx_0_i = 0, $80 = 0, $cond_i = 0, $rst_0_i = 0, $sizebits_0_i = 0, $t_0_i121 = 0, $rsize_0_i122 = 0, $v_0_i123 = 0, $and32_i = 0, $sub33_i = 0, $rsize_1_i = 0, $v_1_i = 0, $82 = 0, $83 = 0, $rst_1_i = 0, $t_1_i = 0, $rsize_2_i = 0, $v_2_i = 0, $shl59_i = 0, $and63_i = 0, $sub69_i = 0, $and72_i = 0, $shr74_i = 0, $and76_i = 0, $shr78_i = 0, $and80_i = 0, $shr82_i = 0, $and84_i = 0, $shr86_i = 0, $and88_i = 0, $t_2_ph_i = 0, $v_326_i = 0, $rsize_325_i = 0, $t_224_i = 0, $sub100_i = 0, $cmp101_i = 0, $sub100_rsize_3_i = 0, $t_2_v_3_i = 0, $86 = 0, $87 = 0, $v_3_lcssa_i = 0, $rsize_3_lcssa_i = 0, $89 = 0, $90 = 0, $add_ptr_i128 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $bk135_i = 0, $fd138_i = 0, $arrayidx150_i = 0, $98 = 0, $arrayidx154_i133 = 0, $99 = 0, $RP_0_i136 = 0, $R_0_i137 = 0, $arrayidx160_i = 0, $100 = 0, $arrayidx164_i = 0, $101 = 0, $R_1_i139 = 0, $index_i140 = 0, $arrayidx183_i = 0, $arrayidx203_i = 0, $112 = 0, $115 = 0, $add267_i = 0, $118 = 0, $shr282_i = 0, $shl287_i = 0, $121 = 0, $122 = 0, $shl290_i = 0, $123 = 0, $124 = 0, $_pre_phi_i147 = 0, $F289_0_i = 0, $129 = 0, $shr317_i = 0, $and330_i = 0, $shl332_i = 0, $and335_i = 0, $shl337_i = 0, $and340_i = 0, $add345_i = 0, $I315_0_i = 0, $arrayidx354_i = 0, $132 = 0, $shl361_i = 0, $cond382_i = 0, $T_0_i = 0, $K372_0_i = 0, $arrayidx393_i = 0, $139 = 0, $fd412_i = 0, $145 = 0, $147 = 0, $add_ptr436_i = 0, $nb_0 = 0, $153 = 0, $sub159 = 0, $154 = 0, $155 = 0, $159 = 0, $162 = 0, $sub187 = 0, $163 = 0, $164 = 0, $call_i_i = 0, $add_i149 = 0, $169 = 0, $sub_i150 = 0, $add9_i = 0, $neg_i151 = 0, $and11_i = 0, $170 = 0, $171 = 0, $add17_i152 = 0, $173 = 0, $174 = 0, $sp_0_i_i = 0, $base_i_i = 0, $175 = 0, $size_i_i = 0, $177 = 0, $call34_i = 0, $178 = 0, $179 = 0, $sub38_i = 0, $ssize_0_i = 0, $180 = 0, $add51_i = 0, $181 = 0, $call65_i = 0, $cmp66_i160 = 0, $and77_i = 0, $call80_i = 0, $cmp82_i = 0, $ssize_1_i = 0, $br_0_i = 0, $tsize_0_i = 0, $tbase_0_i = 0, $sub109_i = 0, $185 = 0, $and101_i = 0, $ssize_2_i = 0, $tsize_0758385_i = 0, $tsize_1_i = 0, $call128_i = 0, $call129_i = 0, $sub_ptr_sub_i = 0, $cmp138_i166 = 0, $call128_tbase_1_i = 0, $tbase_292_i = 0, $tsize_291_i = 0, $add147_i = 0, $189 = 0, $190 = 0, $i_02_i_i = 0, $shl_i_i = 0, $192 = 0, $195 = 0, $cond_i_i = 0, $sub5_i_i = 0, $sp_0105_i = 0, $201 = 0, $size185_i = 0, $202 = 0, $203 = 0, $205 = 0, $206 = 0, $add212_i = 0, $208 = 0, $209 = 0, $cond_i28_i = 0, $sub5_i30_i = 0, $add_ptr224_i = 0, $sp_1101_i = 0, $base223_i = 0, $217 = 0, $size242_i = 0, $220 = 0, $cond_i43_i = 0, $222 = 0, $cond15_i_i = 0, $add_ptr16_i_i = 0, $224 = 0, $add_ptr4_sum_i50_i = 0, $add_ptr17_i_i = 0, $225 = 0, $sub18_i_i = 0, $add_i_i = 0, $add26_i_i = 0, $add_ptr16_sum_i_i = 0, $234 = 0, $and37_i_i = 0, $shr_i55_i = 0, $236 = 0, $238 = 0, $239 = 0, $fd59_i_i = 0, $fd68_pre_phi_i_i = 0, $247 = 0, $249 = 0, $251 = 0, $253 = 0, $bk82_i_i = 0, $fd85_i_i = 0, $add_ptr16_sum56_i_i = 0, $258 = 0, $259 = 0, $arrayidx99_i_i = 0, $260 = 0, $RP_0_i_i = 0, $R_0_i_i = 0, $arrayidx103_i_i = 0, $261 = 0, $arrayidx107_i_i = 0, $262 = 0, $R_1_i_i = 0, $265 = 0, $arrayidx123_i_i = 0, $arrayidx143_i_i = 0, $add_ptr16_sum2728_i_i = 0, $275 = 0, $279 = 0, $qsize_0_i_i = 0, $oldfirst_0_i_i = 0, $head208_i_i = 0, $shr214_i_i = 0, $shl221_i_i = 0, $285 = 0, $286 = 0, $shl226_i_i = 0, $287 = 0, $288 = 0, $_pre_phi_i68_i = 0, $F224_0_i_i = 0, $293 = 0, $shr253_i_i = 0, $and264_i_i = 0, $shl265_i_i = 0, $and268_i_i = 0, $shl270_i_i = 0, $and273_i_i = 0, $add278_i_i = 0, $I252_0_i_i = 0, $arrayidx287_i_i = 0, $296 = 0, $shl294_i_i = 0, $cond315_i_i = 0, $T_0_i69_i = 0, $K305_0_i_i = 0, $arrayidx325_i_i = 0, $303 = 0, $fd344_i_i = 0, $309 = 0, $311 = 0, $316 = 0, $sp_0_i_i_i = 0, $317 = 0, $318 = 0, $add_ptr_i_i_i = 0, $320 = 0, $cond_i18_i = 0, $add_ptr7_i_i = 0, $cond13_i_i = 0, $add_ptr14_i_i = 0, $323 = 0, $cond_i_i_i = 0, $sub5_i_i_i = 0, $330 = 0, $add_ptr2416_i_i = 0, $332 = 0, $sub_ptr_sub_i_i = 0, $335 = 0, $shr_i_i = 0, $shl_i21_i = 0, $337 = 0, $338 = 0, $shl39_i_i = 0, $339 = 0, $340 = 0, $_pre_phi_i_i = 0, $F_0_i_i = 0, $343 = 0, $shr58_i_i = 0, $and69_i_i = 0, $shl70_i_i = 0, $and73_i_i = 0, $shl75_i_i = 0, $and78_i_i = 0, $add83_i_i = 0, $I57_0_i_i = 0, $arrayidx91_i_i = 0, $345 = 0, $shl95_i_i = 0, $cond115_i_i = 0, $T_0_i_i = 0, $K105_0_i_i = 0, $arrayidx126_i_i = 0, $348 = 0, $fd145_i_i = 0, $351 = 0, $353 = 0, $355 = 0, $sub253_i = 0, $356 = 0, $357 = 0, $mem_0 = 0, label = 0;
 do {
  if ($bytes >>> 0 < 245) {
   if ($bytes >>> 0 < 11) {
    $cond = 16; //@line 12817
   } else {
    $cond = $bytes + 11 & -8; //@line 12821
   }
   $shr = $cond >>> 3; //@line 12824
   $0 = HEAP32[832] | 0; //@line 12825
   $shr3 = $0 >>> ($shr >>> 0); //@line 12826
   if (($shr3 & 3 | 0) != 0) {
    $add8 = ($shr3 & 1 ^ 1) + $shr | 0; //@line 12832
    $shl = $add8 << 1; //@line 12833
    $1 = 3368 + ($shl << 2) | 0; //@line 12835
    $2 = 3368 + ($shl + 2 << 2) | 0; //@line 12837
    $3 = HEAP32[$2 >> 2] | 0; //@line 12838
    $fd9 = $3 + 8 | 0; //@line 12839
    $4 = HEAP32[$fd9 >> 2] | 0; //@line 12840
    do {
     if (($1 | 0) == ($4 | 0)) {
      HEAP32[832] = $0 & ~(1 << $add8); //@line 12847
     } else {
      if ($4 >>> 0 < (HEAP32[836] | 0) >>> 0) {
       _abort(); //@line 12853
       return 0; //@line 12853
      }
      $bk = $4 + 12 | 0; //@line 12856
      if ((HEAP32[$bk >> 2] | 0) == ($3 | 0)) {
       HEAP32[$bk >> 2] = $1; //@line 12860
       HEAP32[$2 >> 2] = $4; //@line 12861
       break;
      } else {
       _abort(); //@line 12864
       return 0; //@line 12864
      }
     }
    } while (0);
    $shl22 = $add8 << 3; //@line 12869
    HEAP32[$3 + 4 >> 2] = $shl22 | 3; //@line 12872
    $9 = $3 + ($shl22 | 4) | 0; //@line 12876
    HEAP32[$9 >> 2] = HEAP32[$9 >> 2] | 1; //@line 12879
    $mem_0 = $fd9; //@line 12881
    return $mem_0 | 0; //@line 12883
   }
   if ($cond >>> 0 <= (HEAP32[834] | 0) >>> 0) {
    $nb_0 = $cond; //@line 12888
    break;
   }
   if (($shr3 | 0) != 0) {
    $shl37 = 2 << $shr; //@line 12894
    $and41 = $shr3 << $shr & ($shl37 | -$shl37); //@line 12897
    $sub44 = ($and41 & -$and41) - 1 | 0; //@line 12900
    $and46 = $sub44 >>> 12 & 16; //@line 12902
    $shr47 = $sub44 >>> ($and46 >>> 0); //@line 12903
    $and49 = $shr47 >>> 5 & 8; //@line 12905
    $shr51 = $shr47 >>> ($and49 >>> 0); //@line 12907
    $and53 = $shr51 >>> 2 & 4; //@line 12909
    $shr55 = $shr51 >>> ($and53 >>> 0); //@line 12911
    $and57 = $shr55 >>> 1 & 2; //@line 12913
    $shr59 = $shr55 >>> ($and57 >>> 0); //@line 12915
    $and61 = $shr59 >>> 1 & 1; //@line 12917
    $add64 = ($and49 | $and46 | $and53 | $and57 | $and61) + ($shr59 >>> ($and61 >>> 0)) | 0; //@line 12920
    $shl65 = $add64 << 1; //@line 12921
    $13 = 3368 + ($shl65 << 2) | 0; //@line 12923
    $14 = 3368 + ($shl65 + 2 << 2) | 0; //@line 12925
    $15 = HEAP32[$14 >> 2] | 0; //@line 12926
    $fd69 = $15 + 8 | 0; //@line 12927
    $16 = HEAP32[$fd69 >> 2] | 0; //@line 12928
    do {
     if (($13 | 0) == ($16 | 0)) {
      HEAP32[832] = $0 & ~(1 << $add64); //@line 12935
     } else {
      if ($16 >>> 0 < (HEAP32[836] | 0) >>> 0) {
       _abort(); //@line 12941
       return 0; //@line 12941
      }
      $bk78 = $16 + 12 | 0; //@line 12944
      if ((HEAP32[$bk78 >> 2] | 0) == ($15 | 0)) {
       HEAP32[$bk78 >> 2] = $13; //@line 12948
       HEAP32[$14 >> 2] = $16; //@line 12949
       break;
      } else {
       _abort(); //@line 12952
       return 0; //@line 12952
      }
     }
    } while (0);
    $shl90 = $add64 << 3; //@line 12957
    $sub91 = $shl90 - $cond | 0; //@line 12958
    HEAP32[$15 + 4 >> 2] = $cond | 3; //@line 12961
    $20 = $15; //@line 12962
    $21 = $20 + $cond | 0; //@line 12964
    HEAP32[$20 + ($cond | 4) >> 2] = $sub91 | 1; //@line 12969
    HEAP32[$20 + $shl90 >> 2] = $sub91; //@line 12972
    $23 = HEAP32[834] | 0; //@line 12973
    if (($23 | 0) != 0) {
     $24 = HEAP32[837] | 0; //@line 12976
     $shr101 = $23 >>> 3; //@line 12977
     $shl102 = $shr101 << 1; //@line 12978
     $25 = 3368 + ($shl102 << 2) | 0; //@line 12980
     $26 = HEAP32[832] | 0; //@line 12981
     $shl105 = 1 << $shr101; //@line 12982
     do {
      if (($26 & $shl105 | 0) == 0) {
       HEAP32[832] = $26 | $shl105; //@line 12988
       $F104_0 = $25; //@line 12991
       $_pre_phi = 3368 + ($shl102 + 2 << 2) | 0; //@line 12991
      } else {
       $27 = 3368 + ($shl102 + 2 << 2) | 0; //@line 12994
       $28 = HEAP32[$27 >> 2] | 0; //@line 12995
       if ($28 >>> 0 >= (HEAP32[836] | 0) >>> 0) {
        $F104_0 = $28; //@line 13000
        $_pre_phi = $27; //@line 13000
        break;
       }
       _abort(); //@line 13003
       return 0; //@line 13003
      }
     } while (0);
     HEAP32[$_pre_phi >> 2] = $24; //@line 13009
     HEAP32[$F104_0 + 12 >> 2] = $24; //@line 13011
     HEAP32[$24 + 8 >> 2] = $F104_0; //@line 13013
     HEAP32[$24 + 12 >> 2] = $25; //@line 13015
    }
    HEAP32[834] = $sub91; //@line 13017
    HEAP32[837] = $21; //@line 13018
    $mem_0 = $fd69; //@line 13020
    return $mem_0 | 0; //@line 13022
   }
   $32 = HEAP32[833] | 0; //@line 13024
   if (($32 | 0) == 0) {
    $nb_0 = $cond; //@line 13027
    break;
   }
   $sub2_i = ($32 & -$32) - 1 | 0; //@line 13032
   $and3_i = $sub2_i >>> 12 & 16; //@line 13034
   $shr4_i = $sub2_i >>> ($and3_i >>> 0); //@line 13035
   $and6_i = $shr4_i >>> 5 & 8; //@line 13037
   $shr7_i = $shr4_i >>> ($and6_i >>> 0); //@line 13039
   $and9_i = $shr7_i >>> 2 & 4; //@line 13041
   $shr11_i = $shr7_i >>> ($and9_i >>> 0); //@line 13043
   $and13_i = $shr11_i >>> 1 & 2; //@line 13045
   $shr15_i = $shr11_i >>> ($and13_i >>> 0); //@line 13047
   $and17_i = $shr15_i >>> 1 & 1; //@line 13049
   $33 = HEAP32[3632 + (($and6_i | $and3_i | $and9_i | $and13_i | $and17_i) + ($shr15_i >>> ($and17_i >>> 0)) << 2) >> 2] | 0; //@line 13054
   $t_0_i = $33; //@line 13059
   $v_0_i = $33; //@line 13059
   $rsize_0_i = (HEAP32[$33 + 4 >> 2] & -8) - $cond | 0; //@line 13059
   while (1) {
    $35 = HEAP32[$t_0_i + 16 >> 2] | 0; //@line 13065
    if (($35 | 0) == 0) {
     $36 = HEAP32[$t_0_i + 20 >> 2] | 0; //@line 13069
     if (($36 | 0) == 0) {
      break;
     } else {
      $cond7_i = $36; //@line 13074
     }
    } else {
     $cond7_i = $35; //@line 13077
    }
    $sub31_i = (HEAP32[$cond7_i + 4 >> 2] & -8) - $cond | 0; //@line 13083
    $cmp32_i = $sub31_i >>> 0 < $rsize_0_i >>> 0; //@line 13084
    $t_0_i = $cond7_i; //@line 13087
    $v_0_i = $cmp32_i ? $cond7_i : $v_0_i; //@line 13087
    $rsize_0_i = $cmp32_i ? $sub31_i : $rsize_0_i; //@line 13087
   }
   $38 = $v_0_i; //@line 13089
   $39 = HEAP32[836] | 0; //@line 13090
   if ($38 >>> 0 < $39 >>> 0) {
    _abort(); //@line 13093
    return 0; //@line 13093
   }
   $add_ptr_i = $38 + $cond | 0; //@line 13096
   $40 = $add_ptr_i; //@line 13097
   if ($38 >>> 0 >= $add_ptr_i >>> 0) {
    _abort(); //@line 13100
    return 0; //@line 13100
   }
   $41 = HEAP32[$v_0_i + 24 >> 2] | 0; //@line 13104
   $42 = HEAP32[$v_0_i + 12 >> 2] | 0; //@line 13106
   do {
    if (($42 | 0) == ($v_0_i | 0)) {
     $arrayidx61_i = $v_0_i + 20 | 0; //@line 13110
     $47 = HEAP32[$arrayidx61_i >> 2] | 0; //@line 13111
     if (($47 | 0) == 0) {
      $arrayidx65_i = $v_0_i + 16 | 0; //@line 13114
      $48 = HEAP32[$arrayidx65_i >> 2] | 0; //@line 13115
      if (($48 | 0) == 0) {
       $R_1_i = 0; //@line 13118
       break;
      } else {
       $R_0_i = $48; //@line 13121
       $RP_0_i = $arrayidx65_i; //@line 13121
      }
     } else {
      $R_0_i = $47; //@line 13124
      $RP_0_i = $arrayidx61_i; //@line 13124
     }
     while (1) {
      $arrayidx71_i = $R_0_i + 20 | 0; //@line 13129
      $49 = HEAP32[$arrayidx71_i >> 2] | 0; //@line 13130
      if (($49 | 0) != 0) {
       $R_0_i = $49; //@line 13133
       $RP_0_i = $arrayidx71_i; //@line 13133
       continue;
      }
      $arrayidx75_i = $R_0_i + 16 | 0; //@line 13136
      $50 = HEAP32[$arrayidx75_i >> 2] | 0; //@line 13137
      if (($50 | 0) == 0) {
       break;
      } else {
       $R_0_i = $50; //@line 13142
       $RP_0_i = $arrayidx75_i; //@line 13142
      }
     }
     if ($RP_0_i >>> 0 < $39 >>> 0) {
      _abort(); //@line 13148
      return 0; //@line 13148
     } else {
      HEAP32[$RP_0_i >> 2] = 0; //@line 13151
      $R_1_i = $R_0_i; //@line 13152
      break;
     }
    } else {
     $43 = HEAP32[$v_0_i + 8 >> 2] | 0; //@line 13157
     if ($43 >>> 0 < $39 >>> 0) {
      _abort(); //@line 13161
      return 0; //@line 13161
     }
     $bk47_i = $43 + 12 | 0; //@line 13164
     if ((HEAP32[$bk47_i >> 2] | 0) != ($v_0_i | 0)) {
      _abort(); //@line 13168
      return 0; //@line 13168
     }
     $fd50_i = $42 + 8 | 0; //@line 13171
     if ((HEAP32[$fd50_i >> 2] | 0) == ($v_0_i | 0)) {
      HEAP32[$bk47_i >> 2] = $42; //@line 13175
      HEAP32[$fd50_i >> 2] = $43; //@line 13176
      $R_1_i = $42; //@line 13177
      break;
     } else {
      _abort(); //@line 13180
      return 0; //@line 13180
     }
    }
   } while (0);
   L1687 : do {
    if (($41 | 0) != 0) {
     $index_i = $v_0_i + 28 | 0; //@line 13189
     $arrayidx94_i = 3632 + (HEAP32[$index_i >> 2] << 2) | 0; //@line 13191
     do {
      if (($v_0_i | 0) == (HEAP32[$arrayidx94_i >> 2] | 0)) {
       HEAP32[$arrayidx94_i >> 2] = $R_1_i; //@line 13196
       if (($R_1_i | 0) != 0) {
        break;
       }
       HEAP32[833] = HEAP32[833] & ~(1 << HEAP32[$index_i >> 2]); //@line 13206
       break L1687;
      } else {
       if ($41 >>> 0 < (HEAP32[836] | 0) >>> 0) {
        _abort(); //@line 13213
        return 0; //@line 13213
       }
       $arrayidx113_i = $41 + 16 | 0; //@line 13216
       if ((HEAP32[$arrayidx113_i >> 2] | 0) == ($v_0_i | 0)) {
        HEAP32[$arrayidx113_i >> 2] = $R_1_i; //@line 13220
       } else {
        HEAP32[$41 + 20 >> 2] = $R_1_i; //@line 13223
       }
       if (($R_1_i | 0) == 0) {
        break L1687;
       }
      }
     } while (0);
     if ($R_1_i >>> 0 < (HEAP32[836] | 0) >>> 0) {
      _abort(); //@line 13235
      return 0; //@line 13235
     }
     HEAP32[$R_1_i + 24 >> 2] = $41; //@line 13239
     $61 = HEAP32[$v_0_i + 16 >> 2] | 0; //@line 13241
     do {
      if (($61 | 0) != 0) {
       if ($61 >>> 0 < (HEAP32[836] | 0) >>> 0) {
        _abort(); //@line 13249
        return 0; //@line 13249
       } else {
        HEAP32[$R_1_i + 16 >> 2] = $61; //@line 13253
        HEAP32[$61 + 24 >> 2] = $R_1_i; //@line 13255
        break;
       }
      }
     } while (0);
     $64 = HEAP32[$v_0_i + 20 >> 2] | 0; //@line 13261
     if (($64 | 0) == 0) {
      break;
     }
     if ($64 >>> 0 < (HEAP32[836] | 0) >>> 0) {
      _abort(); //@line 13270
      return 0; //@line 13270
     } else {
      HEAP32[$R_1_i + 20 >> 2] = $64; //@line 13274
      HEAP32[$64 + 24 >> 2] = $R_1_i; //@line 13276
      break;
     }
    }
   } while (0);
   if ($rsize_0_i >>> 0 < 16) {
    $add177_i = $rsize_0_i + $cond | 0; //@line 13283
    HEAP32[$v_0_i + 4 >> 2] = $add177_i | 3; //@line 13286
    $67 = $38 + ($add177_i + 4) | 0; //@line 13289
    HEAP32[$67 >> 2] = HEAP32[$67 >> 2] | 1; //@line 13292
   } else {
    HEAP32[$v_0_i + 4 >> 2] = $cond | 3; //@line 13296
    HEAP32[$38 + ($cond | 4) >> 2] = $rsize_0_i | 1; //@line 13301
    HEAP32[$38 + ($rsize_0_i + $cond) >> 2] = $rsize_0_i; //@line 13305
    $70 = HEAP32[834] | 0; //@line 13306
    if (($70 | 0) != 0) {
     $71 = HEAP32[837] | 0; //@line 13309
     $shr194_i = $70 >>> 3; //@line 13310
     $shl195_i = $shr194_i << 1; //@line 13311
     $72 = 3368 + ($shl195_i << 2) | 0; //@line 13313
     $73 = HEAP32[832] | 0; //@line 13314
     $shl198_i = 1 << $shr194_i; //@line 13315
     do {
      if (($73 & $shl198_i | 0) == 0) {
       HEAP32[832] = $73 | $shl198_i; //@line 13321
       $F197_0_i = $72; //@line 13324
       $_pre_phi_i = 3368 + ($shl195_i + 2 << 2) | 0; //@line 13324
      } else {
       $74 = 3368 + ($shl195_i + 2 << 2) | 0; //@line 13327
       $75 = HEAP32[$74 >> 2] | 0; //@line 13328
       if ($75 >>> 0 >= (HEAP32[836] | 0) >>> 0) {
        $F197_0_i = $75; //@line 13333
        $_pre_phi_i = $74; //@line 13333
        break;
       }
       _abort(); //@line 13336
       return 0; //@line 13336
      }
     } while (0);
     HEAP32[$_pre_phi_i >> 2] = $71; //@line 13342
     HEAP32[$F197_0_i + 12 >> 2] = $71; //@line 13344
     HEAP32[$71 + 8 >> 2] = $F197_0_i; //@line 13346
     HEAP32[$71 + 12 >> 2] = $72; //@line 13348
    }
    HEAP32[834] = $rsize_0_i; //@line 13350
    HEAP32[837] = $40; //@line 13351
   }
   $add_ptr225_i = $v_0_i + 8 | 0; //@line 13353
   if (($add_ptr225_i | 0) == 0) {
    $nb_0 = $cond; //@line 13357
    break;
   } else {
    $mem_0 = $add_ptr225_i; //@line 13360
   }
   return $mem_0 | 0; //@line 13363
  } else {
   if ($bytes >>> 0 > 4294967231) {
    $nb_0 = -1; //@line 13367
    break;
   }
   $add143 = $bytes + 11 | 0; //@line 13370
   $and144 = $add143 & -8; //@line 13371
   $79 = HEAP32[833] | 0; //@line 13372
   if (($79 | 0) == 0) {
    $nb_0 = $and144; //@line 13375
    break;
   }
   $sub_i107 = -$and144 | 0; //@line 13378
   $shr_i108 = $add143 >>> 8; //@line 13379
   do {
    if (($shr_i108 | 0) == 0) {
     $idx_0_i = 0; //@line 13383
    } else {
     if ($and144 >>> 0 > 16777215) {
      $idx_0_i = 31; //@line 13387
      break;
     }
     $and_i112 = ($shr_i108 + 1048320 | 0) >>> 16 & 8; //@line 13392
     $shl_i113 = $shr_i108 << $and_i112; //@line 13393
     $and8_i = ($shl_i113 + 520192 | 0) >>> 16 & 4; //@line 13396
     $shl9_i = $shl_i113 << $and8_i; //@line 13398
     $and12_i = ($shl9_i + 245760 | 0) >>> 16 & 2; //@line 13401
     $add17_i = 14 - ($and8_i | $and_i112 | $and12_i) + ($shl9_i << $and12_i >>> 15) | 0; //@line 13406
     $idx_0_i = $and144 >>> (($add17_i + 7 | 0) >>> 0) & 1 | $add17_i << 1; //@line 13412
    }
   } while (0);
   $80 = HEAP32[3632 + ($idx_0_i << 2) >> 2] | 0; //@line 13417
   L1495 : do {
    if (($80 | 0) == 0) {
     $v_2_i = 0; //@line 13421
     $rsize_2_i = $sub_i107; //@line 13421
     $t_1_i = 0; //@line 13421
    } else {
     if (($idx_0_i | 0) == 31) {
      $cond_i = 0; //@line 13425
     } else {
      $cond_i = 25 - ($idx_0_i >>> 1) | 0; //@line 13429
     }
     $v_0_i123 = 0; //@line 13433
     $rsize_0_i122 = $sub_i107; //@line 13433
     $t_0_i121 = $80; //@line 13433
     $sizebits_0_i = $and144 << $cond_i; //@line 13433
     $rst_0_i = 0; //@line 13433
     while (1) {
      $and32_i = HEAP32[$t_0_i121 + 4 >> 2] & -8; //@line 13442
      $sub33_i = $and32_i - $and144 | 0; //@line 13443
      if ($sub33_i >>> 0 < $rsize_0_i122 >>> 0) {
       if (($and32_i | 0) == ($and144 | 0)) {
        $v_2_i = $t_0_i121; //@line 13448
        $rsize_2_i = $sub33_i; //@line 13448
        $t_1_i = $t_0_i121; //@line 13448
        break L1495;
       } else {
        $v_1_i = $t_0_i121; //@line 13451
        $rsize_1_i = $sub33_i; //@line 13451
       }
      } else {
       $v_1_i = $v_0_i123; //@line 13454
       $rsize_1_i = $rsize_0_i122; //@line 13454
      }
      $82 = HEAP32[$t_0_i121 + 20 >> 2] | 0; //@line 13459
      $83 = HEAP32[$t_0_i121 + 16 + ($sizebits_0_i >>> 31 << 2) >> 2] | 0; //@line 13462
      $rst_1_i = ($82 | 0) == 0 | ($82 | 0) == ($83 | 0) ? $rst_0_i : $82; //@line 13466
      if (($83 | 0) == 0) {
       $v_2_i = $v_1_i; //@line 13470
       $rsize_2_i = $rsize_1_i; //@line 13470
       $t_1_i = $rst_1_i; //@line 13470
       break;
      } else {
       $v_0_i123 = $v_1_i; //@line 13473
       $rsize_0_i122 = $rsize_1_i; //@line 13473
       $t_0_i121 = $83; //@line 13473
       $sizebits_0_i = $sizebits_0_i << 1; //@line 13473
       $rst_0_i = $rst_1_i; //@line 13473
      }
     }
    }
   } while (0);
   if (($t_1_i | 0) == 0 & ($v_2_i | 0) == 0) {
    $shl59_i = 2 << $idx_0_i; //@line 13485
    $and63_i = $79 & ($shl59_i | -$shl59_i); //@line 13488
    if (($and63_i | 0) == 0) {
     $nb_0 = $and144; //@line 13491
     break;
    }
    $sub69_i = ($and63_i & -$and63_i) - 1 | 0; //@line 13496
    $and72_i = $sub69_i >>> 12 & 16; //@line 13498
    $shr74_i = $sub69_i >>> ($and72_i >>> 0); //@line 13499
    $and76_i = $shr74_i >>> 5 & 8; //@line 13501
    $shr78_i = $shr74_i >>> ($and76_i >>> 0); //@line 13503
    $and80_i = $shr78_i >>> 2 & 4; //@line 13505
    $shr82_i = $shr78_i >>> ($and80_i >>> 0); //@line 13507
    $and84_i = $shr82_i >>> 1 & 2; //@line 13509
    $shr86_i = $shr82_i >>> ($and84_i >>> 0); //@line 13511
    $and88_i = $shr86_i >>> 1 & 1; //@line 13513
    $t_2_ph_i = HEAP32[3632 + (($and76_i | $and72_i | $and80_i | $and84_i | $and88_i) + ($shr86_i >>> ($and88_i >>> 0)) << 2) >> 2] | 0; //@line 13519
   } else {
    $t_2_ph_i = $t_1_i; //@line 13521
   }
   if (($t_2_ph_i | 0) == 0) {
    $rsize_3_lcssa_i = $rsize_2_i; //@line 13526
    $v_3_lcssa_i = $v_2_i; //@line 13526
   } else {
    $t_224_i = $t_2_ph_i; //@line 13528
    $rsize_325_i = $rsize_2_i; //@line 13528
    $v_326_i = $v_2_i; //@line 13528
    while (1) {
     $sub100_i = (HEAP32[$t_224_i + 4 >> 2] & -8) - $and144 | 0; //@line 13536
     $cmp101_i = $sub100_i >>> 0 < $rsize_325_i >>> 0; //@line 13537
     $sub100_rsize_3_i = $cmp101_i ? $sub100_i : $rsize_325_i; //@line 13538
     $t_2_v_3_i = $cmp101_i ? $t_224_i : $v_326_i; //@line 13539
     $86 = HEAP32[$t_224_i + 16 >> 2] | 0; //@line 13541
     if (($86 | 0) != 0) {
      $t_224_i = $86; //@line 13544
      $rsize_325_i = $sub100_rsize_3_i; //@line 13544
      $v_326_i = $t_2_v_3_i; //@line 13544
      continue;
     }
     $87 = HEAP32[$t_224_i + 20 >> 2] | 0; //@line 13548
     if (($87 | 0) == 0) {
      $rsize_3_lcssa_i = $sub100_rsize_3_i; //@line 13551
      $v_3_lcssa_i = $t_2_v_3_i; //@line 13551
      break;
     } else {
      $t_224_i = $87; //@line 13554
      $rsize_325_i = $sub100_rsize_3_i; //@line 13554
      $v_326_i = $t_2_v_3_i; //@line 13554
     }
    }
   }
   if (($v_3_lcssa_i | 0) == 0) {
    $nb_0 = $and144; //@line 13562
    break;
   }
   if ($rsize_3_lcssa_i >>> 0 >= ((HEAP32[834] | 0) - $and144 | 0) >>> 0) {
    $nb_0 = $and144; //@line 13569
    break;
   }
   $89 = $v_3_lcssa_i; //@line 13572
   $90 = HEAP32[836] | 0; //@line 13573
   if ($89 >>> 0 < $90 >>> 0) {
    _abort(); //@line 13576
    return 0; //@line 13576
   }
   $add_ptr_i128 = $89 + $and144 | 0; //@line 13579
   $91 = $add_ptr_i128; //@line 13580
   if ($89 >>> 0 >= $add_ptr_i128 >>> 0) {
    _abort(); //@line 13583
    return 0; //@line 13583
   }
   $92 = HEAP32[$v_3_lcssa_i + 24 >> 2] | 0; //@line 13587
   $93 = HEAP32[$v_3_lcssa_i + 12 >> 2] | 0; //@line 13589
   do {
    if (($93 | 0) == ($v_3_lcssa_i | 0)) {
     $arrayidx150_i = $v_3_lcssa_i + 20 | 0; //@line 13593
     $98 = HEAP32[$arrayidx150_i >> 2] | 0; //@line 13594
     if (($98 | 0) == 0) {
      $arrayidx154_i133 = $v_3_lcssa_i + 16 | 0; //@line 13597
      $99 = HEAP32[$arrayidx154_i133 >> 2] | 0; //@line 13598
      if (($99 | 0) == 0) {
       $R_1_i139 = 0; //@line 13601
       break;
      } else {
       $R_0_i137 = $99; //@line 13604
       $RP_0_i136 = $arrayidx154_i133; //@line 13604
      }
     } else {
      $R_0_i137 = $98; //@line 13607
      $RP_0_i136 = $arrayidx150_i; //@line 13607
     }
     while (1) {
      $arrayidx160_i = $R_0_i137 + 20 | 0; //@line 13612
      $100 = HEAP32[$arrayidx160_i >> 2] | 0; //@line 13613
      if (($100 | 0) != 0) {
       $R_0_i137 = $100; //@line 13616
       $RP_0_i136 = $arrayidx160_i; //@line 13616
       continue;
      }
      $arrayidx164_i = $R_0_i137 + 16 | 0; //@line 13619
      $101 = HEAP32[$arrayidx164_i >> 2] | 0; //@line 13620
      if (($101 | 0) == 0) {
       break;
      } else {
       $R_0_i137 = $101; //@line 13625
       $RP_0_i136 = $arrayidx164_i; //@line 13625
      }
     }
     if ($RP_0_i136 >>> 0 < $90 >>> 0) {
      _abort(); //@line 13631
      return 0; //@line 13631
     } else {
      HEAP32[$RP_0_i136 >> 2] = 0; //@line 13634
      $R_1_i139 = $R_0_i137; //@line 13635
      break;
     }
    } else {
     $94 = HEAP32[$v_3_lcssa_i + 8 >> 2] | 0; //@line 13640
     if ($94 >>> 0 < $90 >>> 0) {
      _abort(); //@line 13644
      return 0; //@line 13644
     }
     $bk135_i = $94 + 12 | 0; //@line 13647
     if ((HEAP32[$bk135_i >> 2] | 0) != ($v_3_lcssa_i | 0)) {
      _abort(); //@line 13651
      return 0; //@line 13651
     }
     $fd138_i = $93 + 8 | 0; //@line 13654
     if ((HEAP32[$fd138_i >> 2] | 0) == ($v_3_lcssa_i | 0)) {
      HEAP32[$bk135_i >> 2] = $93; //@line 13658
      HEAP32[$fd138_i >> 2] = $94; //@line 13659
      $R_1_i139 = $93; //@line 13660
      break;
     } else {
      _abort(); //@line 13663
      return 0; //@line 13663
     }
    }
   } while (0);
   L1545 : do {
    if (($92 | 0) != 0) {
     $index_i140 = $v_3_lcssa_i + 28 | 0; //@line 13672
     $arrayidx183_i = 3632 + (HEAP32[$index_i140 >> 2] << 2) | 0; //@line 13674
     do {
      if (($v_3_lcssa_i | 0) == (HEAP32[$arrayidx183_i >> 2] | 0)) {
       HEAP32[$arrayidx183_i >> 2] = $R_1_i139; //@line 13679
       if (($R_1_i139 | 0) != 0) {
        break;
       }
       HEAP32[833] = HEAP32[833] & ~(1 << HEAP32[$index_i140 >> 2]); //@line 13689
       break L1545;
      } else {
       if ($92 >>> 0 < (HEAP32[836] | 0) >>> 0) {
        _abort(); //@line 13696
        return 0; //@line 13696
       }
       $arrayidx203_i = $92 + 16 | 0; //@line 13699
       if ((HEAP32[$arrayidx203_i >> 2] | 0) == ($v_3_lcssa_i | 0)) {
        HEAP32[$arrayidx203_i >> 2] = $R_1_i139; //@line 13703
       } else {
        HEAP32[$92 + 20 >> 2] = $R_1_i139; //@line 13706
       }
       if (($R_1_i139 | 0) == 0) {
        break L1545;
       }
      }
     } while (0);
     if ($R_1_i139 >>> 0 < (HEAP32[836] | 0) >>> 0) {
      _abort(); //@line 13718
      return 0; //@line 13718
     }
     HEAP32[$R_1_i139 + 24 >> 2] = $92; //@line 13722
     $112 = HEAP32[$v_3_lcssa_i + 16 >> 2] | 0; //@line 13724
     do {
      if (($112 | 0) != 0) {
       if ($112 >>> 0 < (HEAP32[836] | 0) >>> 0) {
        _abort(); //@line 13732
        return 0; //@line 13732
       } else {
        HEAP32[$R_1_i139 + 16 >> 2] = $112; //@line 13736
        HEAP32[$112 + 24 >> 2] = $R_1_i139; //@line 13738
        break;
       }
      }
     } while (0);
     $115 = HEAP32[$v_3_lcssa_i + 20 >> 2] | 0; //@line 13744
     if (($115 | 0) == 0) {
      break;
     }
     if ($115 >>> 0 < (HEAP32[836] | 0) >>> 0) {
      _abort(); //@line 13753
      return 0; //@line 13753
     } else {
      HEAP32[$R_1_i139 + 20 >> 2] = $115; //@line 13757
      HEAP32[$115 + 24 >> 2] = $R_1_i139; //@line 13759
      break;
     }
    }
   } while (0);
   do {
    if ($rsize_3_lcssa_i >>> 0 < 16) {
     $add267_i = $rsize_3_lcssa_i + $and144 | 0; //@line 13767
     HEAP32[$v_3_lcssa_i + 4 >> 2] = $add267_i | 3; //@line 13770
     $118 = $89 + ($add267_i + 4) | 0; //@line 13773
     HEAP32[$118 >> 2] = HEAP32[$118 >> 2] | 1; //@line 13776
    } else {
     HEAP32[$v_3_lcssa_i + 4 >> 2] = $and144 | 3; //@line 13780
     HEAP32[$89 + ($and144 | 4) >> 2] = $rsize_3_lcssa_i | 1; //@line 13785
     HEAP32[$89 + ($rsize_3_lcssa_i + $and144) >> 2] = $rsize_3_lcssa_i; //@line 13789
     $shr282_i = $rsize_3_lcssa_i >>> 3; //@line 13790
     if ($rsize_3_lcssa_i >>> 0 < 256) {
      $shl287_i = $shr282_i << 1; //@line 13793
      $121 = 3368 + ($shl287_i << 2) | 0; //@line 13795
      $122 = HEAP32[832] | 0; //@line 13796
      $shl290_i = 1 << $shr282_i; //@line 13797
      do {
       if (($122 & $shl290_i | 0) == 0) {
        HEAP32[832] = $122 | $shl290_i; //@line 13803
        $F289_0_i = $121; //@line 13806
        $_pre_phi_i147 = 3368 + ($shl287_i + 2 << 2) | 0; //@line 13806
       } else {
        $123 = 3368 + ($shl287_i + 2 << 2) | 0; //@line 13809
        $124 = HEAP32[$123 >> 2] | 0; //@line 13810
        if ($124 >>> 0 >= (HEAP32[836] | 0) >>> 0) {
         $F289_0_i = $124; //@line 13815
         $_pre_phi_i147 = $123; //@line 13815
         break;
        }
        _abort(); //@line 13818
        return 0; //@line 13818
       }
      } while (0);
      HEAP32[$_pre_phi_i147 >> 2] = $91; //@line 13824
      HEAP32[$F289_0_i + 12 >> 2] = $91; //@line 13826
      HEAP32[$89 + ($and144 + 8) >> 2] = $F289_0_i; //@line 13830
      HEAP32[$89 + ($and144 + 12) >> 2] = $121; //@line 13834
      break;
     }
     $129 = $add_ptr_i128; //@line 13837
     $shr317_i = $rsize_3_lcssa_i >>> 8; //@line 13838
     do {
      if (($shr317_i | 0) == 0) {
       $I315_0_i = 0; //@line 13842
      } else {
       if ($rsize_3_lcssa_i >>> 0 > 16777215) {
        $I315_0_i = 31; //@line 13846
        break;
       }
       $and330_i = ($shr317_i + 1048320 | 0) >>> 16 & 8; //@line 13851
       $shl332_i = $shr317_i << $and330_i; //@line 13852
       $and335_i = ($shl332_i + 520192 | 0) >>> 16 & 4; //@line 13855
       $shl337_i = $shl332_i << $and335_i; //@line 13857
       $and340_i = ($shl337_i + 245760 | 0) >>> 16 & 2; //@line 13860
       $add345_i = 14 - ($and335_i | $and330_i | $and340_i) + ($shl337_i << $and340_i >>> 15) | 0; //@line 13865
       $I315_0_i = $rsize_3_lcssa_i >>> (($add345_i + 7 | 0) >>> 0) & 1 | $add345_i << 1; //@line 13871
      }
     } while (0);
     $arrayidx354_i = 3632 + ($I315_0_i << 2) | 0; //@line 13875
     HEAP32[$89 + ($and144 + 28) >> 2] = $I315_0_i; //@line 13879
     HEAP32[$89 + ($and144 + 20) >> 2] = 0; //@line 13885
     HEAP32[$89 + ($and144 + 16) >> 2] = 0; //@line 13887
     $132 = HEAP32[833] | 0; //@line 13888
     $shl361_i = 1 << $I315_0_i; //@line 13889
     if (($132 & $shl361_i | 0) == 0) {
      HEAP32[833] = $132 | $shl361_i; //@line 13894
      HEAP32[$arrayidx354_i >> 2] = $129; //@line 13895
      HEAP32[$89 + ($and144 + 24) >> 2] = $arrayidx354_i; //@line 13900
      HEAP32[$89 + ($and144 + 12) >> 2] = $129; //@line 13904
      HEAP32[$89 + ($and144 + 8) >> 2] = $129; //@line 13908
      break;
     }
     if (($I315_0_i | 0) == 31) {
      $cond382_i = 0; //@line 13914
     } else {
      $cond382_i = 25 - ($I315_0_i >>> 1) | 0; //@line 13918
     }
     $K372_0_i = $rsize_3_lcssa_i << $cond382_i; //@line 13922
     $T_0_i = HEAP32[$arrayidx354_i >> 2] | 0; //@line 13922
     while (1) {
      if ((HEAP32[$T_0_i + 4 >> 2] & -8 | 0) == ($rsize_3_lcssa_i | 0)) {
       break;
      }
      $arrayidx393_i = $T_0_i + 16 + ($K372_0_i >>> 31 << 2) | 0; //@line 13934
      $139 = HEAP32[$arrayidx393_i >> 2] | 0; //@line 13935
      if (($139 | 0) == 0) {
       label = 1373; //@line 13939
       break;
      } else {
       $K372_0_i = $K372_0_i << 1; //@line 13942
       $T_0_i = $139; //@line 13942
      }
     }
     if ((label | 0) == 1373) {
      if ($arrayidx393_i >>> 0 < (HEAP32[836] | 0) >>> 0) {
       _abort(); //@line 13950
       return 0; //@line 13950
      } else {
       HEAP32[$arrayidx393_i >> 2] = $129; //@line 13953
       HEAP32[$89 + ($and144 + 24) >> 2] = $T_0_i; //@line 13957
       HEAP32[$89 + ($and144 + 12) >> 2] = $129; //@line 13961
       HEAP32[$89 + ($and144 + 8) >> 2] = $129; //@line 13965
       break;
      }
     }
     $fd412_i = $T_0_i + 8 | 0; //@line 13969
     $145 = HEAP32[$fd412_i >> 2] | 0; //@line 13970
     $147 = HEAP32[836] | 0; //@line 13972
     if ($T_0_i >>> 0 < $147 >>> 0) {
      _abort(); //@line 13975
      return 0; //@line 13975
     }
     if ($145 >>> 0 < $147 >>> 0) {
      _abort(); //@line 13981
      return 0; //@line 13981
     } else {
      HEAP32[$145 + 12 >> 2] = $129; //@line 13985
      HEAP32[$fd412_i >> 2] = $129; //@line 13986
      HEAP32[$89 + ($and144 + 8) >> 2] = $145; //@line 13990
      HEAP32[$89 + ($and144 + 12) >> 2] = $T_0_i; //@line 13994
      HEAP32[$89 + ($and144 + 24) >> 2] = 0; //@line 13998
      break;
     }
    }
   } while (0);
   $add_ptr436_i = $v_3_lcssa_i + 8 | 0; //@line 14003
   if (($add_ptr436_i | 0) == 0) {
    $nb_0 = $and144; //@line 14007
    break;
   } else {
    $mem_0 = $add_ptr436_i; //@line 14010
   }
   return $mem_0 | 0; //@line 14013
  }
 } while (0);
 $153 = HEAP32[834] | 0; //@line 14017
 if ($nb_0 >>> 0 <= $153 >>> 0) {
  $sub159 = $153 - $nb_0 | 0; //@line 14020
  $154 = HEAP32[837] | 0; //@line 14021
  if ($sub159 >>> 0 > 15) {
   $155 = $154; //@line 14024
   HEAP32[837] = $155 + $nb_0; //@line 14027
   HEAP32[834] = $sub159; //@line 14028
   HEAP32[$155 + ($nb_0 + 4) >> 2] = $sub159 | 1; //@line 14033
   HEAP32[$155 + $153 >> 2] = $sub159; //@line 14036
   HEAP32[$154 + 4 >> 2] = $nb_0 | 3; //@line 14039
  } else {
   HEAP32[834] = 0; //@line 14041
   HEAP32[837] = 0; //@line 14042
   HEAP32[$154 + 4 >> 2] = $153 | 3; //@line 14045
   $159 = $154 + ($153 + 4) | 0; //@line 14049
   HEAP32[$159 >> 2] = HEAP32[$159 >> 2] | 1; //@line 14052
  }
  $mem_0 = $154 + 8 | 0; //@line 14056
  return $mem_0 | 0; //@line 14058
 }
 $162 = HEAP32[835] | 0; //@line 14060
 if ($nb_0 >>> 0 < $162 >>> 0) {
  $sub187 = $162 - $nb_0 | 0; //@line 14063
  HEAP32[835] = $sub187; //@line 14064
  $163 = HEAP32[838] | 0; //@line 14065
  $164 = $163; //@line 14066
  HEAP32[838] = $164 + $nb_0; //@line 14069
  HEAP32[$164 + ($nb_0 + 4) >> 2] = $sub187 | 1; //@line 14074
  HEAP32[$163 + 4 >> 2] = $nb_0 | 3; //@line 14077
  $mem_0 = $163 + 8 | 0; //@line 14080
  return $mem_0 | 0; //@line 14082
 }
 do {
  if ((HEAP32[664] | 0) == 0) {
   $call_i_i = _sysconf(30) | 0; //@line 14088
   if (($call_i_i - 1 & $call_i_i | 0) == 0) {
    HEAP32[666] = $call_i_i; //@line 14093
    HEAP32[665] = $call_i_i; //@line 14094
    HEAP32[667] = -1; //@line 14095
    HEAP32[668] = -1; //@line 14096
    HEAP32[669] = 0; //@line 14097
    HEAP32[943] = 0; //@line 14098
    HEAP32[664] = (_time(0) | 0) & -16 ^ 1431655768; //@line 14102
    break;
   } else {
    _abort(); //@line 14105
    return 0; //@line 14105
   }
  }
 } while (0);
 $add_i149 = $nb_0 + 48 | 0; //@line 14110
 $169 = HEAP32[666] | 0; //@line 14111
 $sub_i150 = $nb_0 + 47 | 0; //@line 14112
 $add9_i = $169 + $sub_i150 | 0; //@line 14113
 $neg_i151 = -$169 | 0; //@line 14114
 $and11_i = $add9_i & $neg_i151; //@line 14115
 if ($and11_i >>> 0 <= $nb_0 >>> 0) {
  $mem_0 = 0; //@line 14118
  return $mem_0 | 0; //@line 14120
 }
 $170 = HEAP32[942] | 0; //@line 14122
 do {
  if (($170 | 0) != 0) {
   $171 = HEAP32[940] | 0; //@line 14126
   $add17_i152 = $171 + $and11_i | 0; //@line 14127
   if ($add17_i152 >>> 0 <= $171 >>> 0 | $add17_i152 >>> 0 > $170 >>> 0) {
    $mem_0 = 0; //@line 14132
   } else {
    break;
   }
   return $mem_0 | 0; //@line 14137
  }
 } while (0);
 L1754 : do {
  if ((HEAP32[943] & 4 | 0) == 0) {
   $173 = HEAP32[838] | 0; //@line 14145
   L1756 : do {
    if (($173 | 0) == 0) {
     label = 1403; //@line 14149
    } else {
     $174 = $173; //@line 14151
     $sp_0_i_i = 3776; //@line 14152
     while (1) {
      $base_i_i = $sp_0_i_i | 0; //@line 14155
      $175 = HEAP32[$base_i_i >> 2] | 0; //@line 14156
      if ($175 >>> 0 <= $174 >>> 0) {
       $size_i_i = $sp_0_i_i + 4 | 0; //@line 14159
       if (($175 + (HEAP32[$size_i_i >> 2] | 0) | 0) >>> 0 > $174 >>> 0) {
        break;
       }
      }
      $177 = HEAP32[$sp_0_i_i + 8 >> 2] | 0; //@line 14168
      if (($177 | 0) == 0) {
       label = 1403; //@line 14171
       break L1756;
      } else {
       $sp_0_i_i = $177; //@line 14174
      }
     }
     if (($sp_0_i_i | 0) == 0) {
      label = 1403; //@line 14179
      break;
     }
     $and77_i = $add9_i - (HEAP32[835] | 0) & $neg_i151; //@line 14184
     if ($and77_i >>> 0 >= 2147483647) {
      $tsize_0758385_i = 0; //@line 14187
      break;
     }
     $call80_i = _sbrk($and77_i | 0) | 0; //@line 14190
     $cmp82_i = ($call80_i | 0) == ((HEAP32[$base_i_i >> 2] | 0) + (HEAP32[$size_i_i >> 2] | 0) | 0); //@line 14194
     $tbase_0_i = $cmp82_i ? $call80_i : -1; //@line 14197
     $tsize_0_i = $cmp82_i ? $and77_i : 0; //@line 14197
     $br_0_i = $call80_i; //@line 14197
     $ssize_1_i = $and77_i; //@line 14197
     label = 1412; //@line 14198
    }
   } while (0);
   do {
    if ((label | 0) == 1403) {
     $call34_i = _sbrk(0) | 0; //@line 14203
     if (($call34_i | 0) == -1) {
      $tsize_0758385_i = 0; //@line 14206
      break;
     }
     $178 = $call34_i; //@line 14209
     $179 = HEAP32[665] | 0; //@line 14210
     $sub38_i = $179 - 1 | 0; //@line 14211
     if (($sub38_i & $178 | 0) == 0) {
      $ssize_0_i = $and11_i; //@line 14215
     } else {
      $ssize_0_i = $and11_i - $178 + ($sub38_i + $178 & -$179) | 0; //@line 14222
     }
     $180 = HEAP32[940] | 0; //@line 14225
     $add51_i = $180 + $ssize_0_i | 0; //@line 14226
     if (!($ssize_0_i >>> 0 > $nb_0 >>> 0 & $ssize_0_i >>> 0 < 2147483647)) {
      $tsize_0758385_i = 0; //@line 14231
      break;
     }
     $181 = HEAP32[942] | 0; //@line 14234
     if (($181 | 0) != 0) {
      if ($add51_i >>> 0 <= $180 >>> 0 | $add51_i >>> 0 > $181 >>> 0) {
       $tsize_0758385_i = 0; //@line 14241
       break;
      }
     }
     $call65_i = _sbrk($ssize_0_i | 0) | 0; //@line 14245
     $cmp66_i160 = ($call65_i | 0) == ($call34_i | 0); //@line 14246
     $tbase_0_i = $cmp66_i160 ? $call34_i : -1; //@line 14249
     $tsize_0_i = $cmp66_i160 ? $ssize_0_i : 0; //@line 14249
     $br_0_i = $call65_i; //@line 14249
     $ssize_1_i = $ssize_0_i; //@line 14249
     label = 1412; //@line 14250
    }
   } while (0);
   L1776 : do {
    if ((label | 0) == 1412) {
     $sub109_i = -$ssize_1_i | 0; //@line 14259
     if (($tbase_0_i | 0) != -1) {
      $tsize_291_i = $tsize_0_i; //@line 14262
      $tbase_292_i = $tbase_0_i; //@line 14262
      label = 1423; //@line 14263
      break L1754;
     }
     do {
      if (($br_0_i | 0) != -1 & $ssize_1_i >>> 0 < 2147483647 & $ssize_1_i >>> 0 < $add_i149 >>> 0) {
       $185 = HEAP32[666] | 0; //@line 14273
       $and101_i = $sub_i150 - $ssize_1_i + $185 & -$185; //@line 14277
       if ($and101_i >>> 0 >= 2147483647) {
        $ssize_2_i = $ssize_1_i; //@line 14280
        break;
       }
       if ((_sbrk($and101_i | 0) | 0) == -1) {
        _sbrk($sub109_i | 0) | 0; //@line 14286
        $tsize_0758385_i = $tsize_0_i; //@line 14287
        break L1776;
       } else {
        $ssize_2_i = $and101_i + $ssize_1_i | 0; //@line 14291
        break;
       }
      } else {
       $ssize_2_i = $ssize_1_i; //@line 14295
      }
     } while (0);
     if (($br_0_i | 0) == -1) {
      $tsize_0758385_i = $tsize_0_i; //@line 14301
     } else {
      $tsize_291_i = $ssize_2_i; //@line 14303
      $tbase_292_i = $br_0_i; //@line 14303
      label = 1423; //@line 14304
      break L1754;
     }
    }
   } while (0);
   HEAP32[943] = HEAP32[943] | 4; //@line 14312
   $tsize_1_i = $tsize_0758385_i; //@line 14313
   label = 1420; //@line 14314
  } else {
   $tsize_1_i = 0; //@line 14316
   label = 1420; //@line 14317
  }
 } while (0);
 do {
  if ((label | 0) == 1420) {
   if ($and11_i >>> 0 >= 2147483647) {
    break;
   }
   $call128_i = _sbrk($and11_i | 0) | 0; //@line 14327
   $call129_i = _sbrk(0) | 0; //@line 14328
   if (!(($call129_i | 0) != -1 & ($call128_i | 0) != -1 & $call128_i >>> 0 < $call129_i >>> 0)) {
    break;
   }
   $sub_ptr_sub_i = $call129_i - $call128_i | 0; //@line 14339
   $cmp138_i166 = $sub_ptr_sub_i >>> 0 > ($nb_0 + 40 | 0) >>> 0; //@line 14341
   $call128_tbase_1_i = $cmp138_i166 ? $call128_i : -1; //@line 14343
   if (($call128_tbase_1_i | 0) != -1) {
    $tsize_291_i = $cmp138_i166 ? $sub_ptr_sub_i : $tsize_1_i; //@line 14346
    $tbase_292_i = $call128_tbase_1_i; //@line 14346
    label = 1423; //@line 14347
   }
  }
 } while (0);
 do {
  if ((label | 0) == 1423) {
   $add147_i = (HEAP32[940] | 0) + $tsize_291_i | 0; //@line 14356
   HEAP32[940] = $add147_i; //@line 14357
   if ($add147_i >>> 0 > (HEAP32[941] | 0) >>> 0) {
    HEAP32[941] = $add147_i; //@line 14361
   }
   $189 = HEAP32[838] | 0; //@line 14363
   L1796 : do {
    if (($189 | 0) == 0) {
     $190 = HEAP32[836] | 0; //@line 14367
     if (($190 | 0) == 0 | $tbase_292_i >>> 0 < $190 >>> 0) {
      HEAP32[836] = $tbase_292_i; //@line 14372
     }
     HEAP32[944] = $tbase_292_i; //@line 14374
     HEAP32[945] = $tsize_291_i; //@line 14375
     HEAP32[947] = 0; //@line 14376
     HEAP32[841] = HEAP32[664]; //@line 14378
     HEAP32[840] = -1; //@line 14379
     $i_02_i_i = 0; //@line 14380
     do {
      $shl_i_i = $i_02_i_i << 1; //@line 14383
      $192 = 3368 + ($shl_i_i << 2) | 0; //@line 14385
      HEAP32[3368 + ($shl_i_i + 3 << 2) >> 2] = $192; //@line 14388
      HEAP32[3368 + ($shl_i_i + 2 << 2) >> 2] = $192; //@line 14391
      $i_02_i_i = $i_02_i_i + 1 | 0; //@line 14392
     } while ($i_02_i_i >>> 0 < 32);
     $195 = $tbase_292_i + 8 | 0; //@line 14402
     if (($195 & 7 | 0) == 0) {
      $cond_i_i = 0; //@line 14406
     } else {
      $cond_i_i = -$195 & 7; //@line 14410
     }
     $sub5_i_i = $tsize_291_i - 40 - $cond_i_i | 0; //@line 14415
     HEAP32[838] = $tbase_292_i + $cond_i_i; //@line 14416
     HEAP32[835] = $sub5_i_i; //@line 14417
     HEAP32[$tbase_292_i + ($cond_i_i + 4) >> 2] = $sub5_i_i | 1; //@line 14422
     HEAP32[$tbase_292_i + ($tsize_291_i - 36) >> 2] = 40; //@line 14426
     HEAP32[839] = HEAP32[668]; //@line 14428
    } else {
     $sp_0105_i = 3776; //@line 14430
     while (1) {
      $201 = HEAP32[$sp_0105_i >> 2] | 0; //@line 14434
      $size185_i = $sp_0105_i + 4 | 0; //@line 14435
      $202 = HEAP32[$size185_i >> 2] | 0; //@line 14436
      if (($tbase_292_i | 0) == ($201 + $202 | 0)) {
       label = 1435; //@line 14440
       break;
      }
      $203 = HEAP32[$sp_0105_i + 8 >> 2] | 0; //@line 14444
      if (($203 | 0) == 0) {
       break;
      } else {
       $sp_0105_i = $203; //@line 14449
      }
     }
     do {
      if ((label | 0) == 1435) {
       if ((HEAP32[$sp_0105_i + 12 >> 2] & 8 | 0) != 0) {
        break;
       }
       $205 = $189; //@line 14461
       if (!($205 >>> 0 >= $201 >>> 0 & $205 >>> 0 < $tbase_292_i >>> 0)) {
        break;
       }
       HEAP32[$size185_i >> 2] = $202 + $tsize_291_i; //@line 14469
       $206 = HEAP32[838] | 0; //@line 14470
       $add212_i = (HEAP32[835] | 0) + $tsize_291_i | 0; //@line 14472
       $208 = $206; //@line 14473
       $209 = $206 + 8 | 0; //@line 14475
       if (($209 & 7 | 0) == 0) {
        $cond_i28_i = 0; //@line 14479
       } else {
        $cond_i28_i = -$209 & 7; //@line 14483
       }
       $sub5_i30_i = $add212_i - $cond_i28_i | 0; //@line 14488
       HEAP32[838] = $208 + $cond_i28_i; //@line 14489
       HEAP32[835] = $sub5_i30_i; //@line 14490
       HEAP32[$208 + ($cond_i28_i + 4) >> 2] = $sub5_i30_i | 1; //@line 14495
       HEAP32[$208 + ($add212_i + 4) >> 2] = 40; //@line 14499
       HEAP32[839] = HEAP32[668]; //@line 14501
       break L1796;
      }
     } while (0);
     if ($tbase_292_i >>> 0 < (HEAP32[836] | 0) >>> 0) {
      HEAP32[836] = $tbase_292_i; //@line 14508
     }
     $add_ptr224_i = $tbase_292_i + $tsize_291_i | 0; //@line 14510
     $sp_1101_i = 3776; //@line 14511
     while (1) {
      $base223_i = $sp_1101_i | 0; //@line 14514
      if ((HEAP32[$base223_i >> 2] | 0) == ($add_ptr224_i | 0)) {
       label = 1445; //@line 14518
       break;
      }
      $217 = HEAP32[$sp_1101_i + 8 >> 2] | 0; //@line 14522
      if (($217 | 0) == 0) {
       break;
      } else {
       $sp_1101_i = $217; //@line 14527
      }
     }
     do {
      if ((label | 0) == 1445) {
       if ((HEAP32[$sp_1101_i + 12 >> 2] & 8 | 0) != 0) {
        break;
       }
       HEAP32[$base223_i >> 2] = $tbase_292_i; //@line 14539
       $size242_i = $sp_1101_i + 4 | 0; //@line 14540
       HEAP32[$size242_i >> 2] = (HEAP32[$size242_i >> 2] | 0) + $tsize_291_i; //@line 14543
       $220 = $tbase_292_i + 8 | 0; //@line 14545
       if (($220 & 7 | 0) == 0) {
        $cond_i43_i = 0; //@line 14549
       } else {
        $cond_i43_i = -$220 & 7; //@line 14553
       }
       $222 = $tbase_292_i + ($tsize_291_i + 8) | 0; //@line 14559
       if (($222 & 7 | 0) == 0) {
        $cond15_i_i = 0; //@line 14563
       } else {
        $cond15_i_i = -$222 & 7; //@line 14567
       }
       $add_ptr16_i_i = $tbase_292_i + ($cond15_i_i + $tsize_291_i) | 0; //@line 14571
       $224 = $add_ptr16_i_i; //@line 14572
       $add_ptr4_sum_i50_i = $cond_i43_i + $nb_0 | 0; //@line 14576
       $add_ptr17_i_i = $tbase_292_i + $add_ptr4_sum_i50_i | 0; //@line 14577
       $225 = $add_ptr17_i_i; //@line 14578
       $sub18_i_i = $add_ptr16_i_i - ($tbase_292_i + $cond_i43_i) - $nb_0 | 0; //@line 14579
       HEAP32[$tbase_292_i + ($cond_i43_i + 4) >> 2] = $nb_0 | 3; //@line 14584
       do {
        if (($224 | 0) == (HEAP32[838] | 0)) {
         $add_i_i = (HEAP32[835] | 0) + $sub18_i_i | 0; //@line 14590
         HEAP32[835] = $add_i_i; //@line 14591
         HEAP32[838] = $225; //@line 14592
         HEAP32[$tbase_292_i + ($add_ptr4_sum_i50_i + 4) >> 2] = $add_i_i | 1; //@line 14597
        } else {
         if (($224 | 0) == (HEAP32[837] | 0)) {
          $add26_i_i = (HEAP32[834] | 0) + $sub18_i_i | 0; //@line 14603
          HEAP32[834] = $add26_i_i; //@line 14604
          HEAP32[837] = $225; //@line 14605
          HEAP32[$tbase_292_i + ($add_ptr4_sum_i50_i + 4) >> 2] = $add26_i_i | 1; //@line 14610
          HEAP32[$tbase_292_i + ($add26_i_i + $add_ptr4_sum_i50_i) >> 2] = $add26_i_i; //@line 14614
          break;
         }
         $add_ptr16_sum_i_i = $tsize_291_i + 4 | 0; //@line 14617
         $234 = HEAP32[$tbase_292_i + ($add_ptr16_sum_i_i + $cond15_i_i) >> 2] | 0; //@line 14621
         if (($234 & 3 | 0) == 1) {
          $and37_i_i = $234 & -8; //@line 14625
          $shr_i55_i = $234 >>> 3; //@line 14626
          L1841 : do {
           if ($234 >>> 0 < 256) {
            $236 = HEAP32[$tbase_292_i + (($cond15_i_i | 8) + $tsize_291_i) >> 2] | 0; //@line 14634
            $238 = HEAP32[$tbase_292_i + ($tsize_291_i + 12 + $cond15_i_i) >> 2] | 0; //@line 14639
            $239 = 3368 + ($shr_i55_i << 1 << 2) | 0; //@line 14642
            do {
             if (($236 | 0) != ($239 | 0)) {
              if ($236 >>> 0 < (HEAP32[836] | 0) >>> 0) {
               _abort(); //@line 14650
               return 0; //@line 14650
              }
              if ((HEAP32[$236 + 12 >> 2] | 0) == ($224 | 0)) {
               break;
              }
              _abort(); //@line 14659
              return 0; //@line 14659
             }
            } while (0);
            if (($238 | 0) == ($236 | 0)) {
             HEAP32[832] = HEAP32[832] & ~(1 << $shr_i55_i); //@line 14669
             break;
            }
            do {
             if (($238 | 0) == ($239 | 0)) {
              $fd68_pre_phi_i_i = $238 + 8 | 0; //@line 14676
             } else {
              if ($238 >>> 0 < (HEAP32[836] | 0) >>> 0) {
               _abort(); //@line 14682
               return 0; //@line 14682
              }
              $fd59_i_i = $238 + 8 | 0; //@line 14685
              if ((HEAP32[$fd59_i_i >> 2] | 0) == ($224 | 0)) {
               $fd68_pre_phi_i_i = $fd59_i_i; //@line 14689
               break;
              }
              _abort(); //@line 14692
              return 0; //@line 14692
             }
            } while (0);
            HEAP32[$236 + 12 >> 2] = $238; //@line 14698
            HEAP32[$fd68_pre_phi_i_i >> 2] = $236; //@line 14699
           } else {
            $247 = $add_ptr16_i_i; //@line 14701
            $249 = HEAP32[$tbase_292_i + (($cond15_i_i | 24) + $tsize_291_i) >> 2] | 0; //@line 14706
            $251 = HEAP32[$tbase_292_i + ($tsize_291_i + 12 + $cond15_i_i) >> 2] | 0; //@line 14711
            do {
             if (($251 | 0) == ($247 | 0)) {
              $add_ptr16_sum56_i_i = $cond15_i_i | 16; //@line 14715
              $258 = $tbase_292_i + ($add_ptr16_sum_i_i + $add_ptr16_sum56_i_i) | 0; //@line 14718
              $259 = HEAP32[$258 >> 2] | 0; //@line 14719
              if (($259 | 0) == 0) {
               $arrayidx99_i_i = $tbase_292_i + ($add_ptr16_sum56_i_i + $tsize_291_i) | 0; //@line 14724
               $260 = HEAP32[$arrayidx99_i_i >> 2] | 0; //@line 14725
               if (($260 | 0) == 0) {
                $R_1_i_i = 0; //@line 14728
                break;
               } else {
                $R_0_i_i = $260; //@line 14731
                $RP_0_i_i = $arrayidx99_i_i; //@line 14731
               }
              } else {
               $R_0_i_i = $259; //@line 14734
               $RP_0_i_i = $258; //@line 14734
              }
              while (1) {
               $arrayidx103_i_i = $R_0_i_i + 20 | 0; //@line 14739
               $261 = HEAP32[$arrayidx103_i_i >> 2] | 0; //@line 14740
               if (($261 | 0) != 0) {
                $R_0_i_i = $261; //@line 14743
                $RP_0_i_i = $arrayidx103_i_i; //@line 14743
                continue;
               }
               $arrayidx107_i_i = $R_0_i_i + 16 | 0; //@line 14746
               $262 = HEAP32[$arrayidx107_i_i >> 2] | 0; //@line 14747
               if (($262 | 0) == 0) {
                break;
               } else {
                $R_0_i_i = $262; //@line 14752
                $RP_0_i_i = $arrayidx107_i_i; //@line 14752
               }
              }
              if ($RP_0_i_i >>> 0 < (HEAP32[836] | 0) >>> 0) {
               _abort(); //@line 14759
               return 0; //@line 14759
              } else {
               HEAP32[$RP_0_i_i >> 2] = 0; //@line 14762
               $R_1_i_i = $R_0_i_i; //@line 14763
               break;
              }
             } else {
              $253 = HEAP32[$tbase_292_i + (($cond15_i_i | 8) + $tsize_291_i) >> 2] | 0; //@line 14771
              if ($253 >>> 0 < (HEAP32[836] | 0) >>> 0) {
               _abort(); //@line 14776
               return 0; //@line 14776
              }
              $bk82_i_i = $253 + 12 | 0; //@line 14779
              if ((HEAP32[$bk82_i_i >> 2] | 0) != ($247 | 0)) {
               _abort(); //@line 14783
               return 0; //@line 14783
              }
              $fd85_i_i = $251 + 8 | 0; //@line 14786
              if ((HEAP32[$fd85_i_i >> 2] | 0) == ($247 | 0)) {
               HEAP32[$bk82_i_i >> 2] = $251; //@line 14790
               HEAP32[$fd85_i_i >> 2] = $253; //@line 14791
               $R_1_i_i = $251; //@line 14792
               break;
              } else {
               _abort(); //@line 14795
               return 0; //@line 14795
              }
             }
            } while (0);
            if (($249 | 0) == 0) {
             break;
            }
            $265 = $tbase_292_i + ($tsize_291_i + 28 + $cond15_i_i) | 0; //@line 14808
            $arrayidx123_i_i = 3632 + (HEAP32[$265 >> 2] << 2) | 0; //@line 14810
            do {
             if (($247 | 0) == (HEAP32[$arrayidx123_i_i >> 2] | 0)) {
              HEAP32[$arrayidx123_i_i >> 2] = $R_1_i_i; //@line 14815
              if (($R_1_i_i | 0) != 0) {
               break;
              }
              HEAP32[833] = HEAP32[833] & ~(1 << HEAP32[$265 >> 2]); //@line 14825
              break L1841;
             } else {
              if ($249 >>> 0 < (HEAP32[836] | 0) >>> 0) {
               _abort(); //@line 14832
               return 0; //@line 14832
              }
              $arrayidx143_i_i = $249 + 16 | 0; //@line 14835
              if ((HEAP32[$arrayidx143_i_i >> 2] | 0) == ($247 | 0)) {
               HEAP32[$arrayidx143_i_i >> 2] = $R_1_i_i; //@line 14839
              } else {
               HEAP32[$249 + 20 >> 2] = $R_1_i_i; //@line 14842
              }
              if (($R_1_i_i | 0) == 0) {
               break L1841;
              }
             }
            } while (0);
            if ($R_1_i_i >>> 0 < (HEAP32[836] | 0) >>> 0) {
             _abort(); //@line 14854
             return 0; //@line 14854
            }
            HEAP32[$R_1_i_i + 24 >> 2] = $249; //@line 14858
            $add_ptr16_sum2728_i_i = $cond15_i_i | 16; //@line 14859
            $275 = HEAP32[$tbase_292_i + ($add_ptr16_sum2728_i_i + $tsize_291_i) >> 2] | 0; //@line 14863
            do {
             if (($275 | 0) != 0) {
              if ($275 >>> 0 < (HEAP32[836] | 0) >>> 0) {
               _abort(); //@line 14871
               return 0; //@line 14871
              } else {
               HEAP32[$R_1_i_i + 16 >> 2] = $275; //@line 14875
               HEAP32[$275 + 24 >> 2] = $R_1_i_i; //@line 14877
               break;
              }
             }
            } while (0);
            $279 = HEAP32[$tbase_292_i + ($add_ptr16_sum_i_i + $add_ptr16_sum2728_i_i) >> 2] | 0; //@line 14885
            if (($279 | 0) == 0) {
             break;
            }
            if ($279 >>> 0 < (HEAP32[836] | 0) >>> 0) {
             _abort(); //@line 14894
             return 0; //@line 14894
            } else {
             HEAP32[$R_1_i_i + 20 >> 2] = $279; //@line 14898
             HEAP32[$279 + 24 >> 2] = $R_1_i_i; //@line 14900
             break;
            }
           }
          } while (0);
          $oldfirst_0_i_i = $tbase_292_i + (($and37_i_i | $cond15_i_i) + $tsize_291_i) | 0; //@line 14910
          $qsize_0_i_i = $and37_i_i + $sub18_i_i | 0; //@line 14910
         } else {
          $oldfirst_0_i_i = $224; //@line 14912
          $qsize_0_i_i = $sub18_i_i; //@line 14912
         }
         $head208_i_i = $oldfirst_0_i_i + 4 | 0; //@line 14916
         HEAP32[$head208_i_i >> 2] = HEAP32[$head208_i_i >> 2] & -2; //@line 14919
         HEAP32[$tbase_292_i + ($add_ptr4_sum_i50_i + 4) >> 2] = $qsize_0_i_i | 1; //@line 14924
         HEAP32[$tbase_292_i + ($qsize_0_i_i + $add_ptr4_sum_i50_i) >> 2] = $qsize_0_i_i; //@line 14928
         $shr214_i_i = $qsize_0_i_i >>> 3; //@line 14929
         if ($qsize_0_i_i >>> 0 < 256) {
          $shl221_i_i = $shr214_i_i << 1; //@line 14932
          $285 = 3368 + ($shl221_i_i << 2) | 0; //@line 14934
          $286 = HEAP32[832] | 0; //@line 14935
          $shl226_i_i = 1 << $shr214_i_i; //@line 14936
          do {
           if (($286 & $shl226_i_i | 0) == 0) {
            HEAP32[832] = $286 | $shl226_i_i; //@line 14942
            $F224_0_i_i = $285; //@line 14945
            $_pre_phi_i68_i = 3368 + ($shl221_i_i + 2 << 2) | 0; //@line 14945
           } else {
            $287 = 3368 + ($shl221_i_i + 2 << 2) | 0; //@line 14948
            $288 = HEAP32[$287 >> 2] | 0; //@line 14949
            if ($288 >>> 0 >= (HEAP32[836] | 0) >>> 0) {
             $F224_0_i_i = $288; //@line 14954
             $_pre_phi_i68_i = $287; //@line 14954
             break;
            }
            _abort(); //@line 14957
            return 0; //@line 14957
           }
          } while (0);
          HEAP32[$_pre_phi_i68_i >> 2] = $225; //@line 14963
          HEAP32[$F224_0_i_i + 12 >> 2] = $225; //@line 14965
          HEAP32[$tbase_292_i + ($add_ptr4_sum_i50_i + 8) >> 2] = $F224_0_i_i; //@line 14969
          HEAP32[$tbase_292_i + ($add_ptr4_sum_i50_i + 12) >> 2] = $285; //@line 14973
          break;
         }
         $293 = $add_ptr17_i_i; //@line 14976
         $shr253_i_i = $qsize_0_i_i >>> 8; //@line 14977
         do {
          if (($shr253_i_i | 0) == 0) {
           $I252_0_i_i = 0; //@line 14981
          } else {
           if ($qsize_0_i_i >>> 0 > 16777215) {
            $I252_0_i_i = 31; //@line 14985
            break;
           }
           $and264_i_i = ($shr253_i_i + 1048320 | 0) >>> 16 & 8; //@line 14990
           $shl265_i_i = $shr253_i_i << $and264_i_i; //@line 14991
           $and268_i_i = ($shl265_i_i + 520192 | 0) >>> 16 & 4; //@line 14994
           $shl270_i_i = $shl265_i_i << $and268_i_i; //@line 14996
           $and273_i_i = ($shl270_i_i + 245760 | 0) >>> 16 & 2; //@line 14999
           $add278_i_i = 14 - ($and268_i_i | $and264_i_i | $and273_i_i) + ($shl270_i_i << $and273_i_i >>> 15) | 0; //@line 15004
           $I252_0_i_i = $qsize_0_i_i >>> (($add278_i_i + 7 | 0) >>> 0) & 1 | $add278_i_i << 1; //@line 15010
          }
         } while (0);
         $arrayidx287_i_i = 3632 + ($I252_0_i_i << 2) | 0; //@line 15014
         HEAP32[$tbase_292_i + ($add_ptr4_sum_i50_i + 28) >> 2] = $I252_0_i_i; //@line 15018
         HEAP32[$tbase_292_i + ($add_ptr4_sum_i50_i + 20) >> 2] = 0; //@line 15024
         HEAP32[$tbase_292_i + ($add_ptr4_sum_i50_i + 16) >> 2] = 0; //@line 15026
         $296 = HEAP32[833] | 0; //@line 15027
         $shl294_i_i = 1 << $I252_0_i_i; //@line 15028
         if (($296 & $shl294_i_i | 0) == 0) {
          HEAP32[833] = $296 | $shl294_i_i; //@line 15033
          HEAP32[$arrayidx287_i_i >> 2] = $293; //@line 15034
          HEAP32[$tbase_292_i + ($add_ptr4_sum_i50_i + 24) >> 2] = $arrayidx287_i_i; //@line 15039
          HEAP32[$tbase_292_i + ($add_ptr4_sum_i50_i + 12) >> 2] = $293; //@line 15043
          HEAP32[$tbase_292_i + ($add_ptr4_sum_i50_i + 8) >> 2] = $293; //@line 15047
          break;
         }
         if (($I252_0_i_i | 0) == 31) {
          $cond315_i_i = 0; //@line 15053
         } else {
          $cond315_i_i = 25 - ($I252_0_i_i >>> 1) | 0; //@line 15057
         }
         $K305_0_i_i = $qsize_0_i_i << $cond315_i_i; //@line 15061
         $T_0_i69_i = HEAP32[$arrayidx287_i_i >> 2] | 0; //@line 15061
         while (1) {
          if ((HEAP32[$T_0_i69_i + 4 >> 2] & -8 | 0) == ($qsize_0_i_i | 0)) {
           break;
          }
          $arrayidx325_i_i = $T_0_i69_i + 16 + ($K305_0_i_i >>> 31 << 2) | 0; //@line 15073
          $303 = HEAP32[$arrayidx325_i_i >> 2] | 0; //@line 15074
          if (($303 | 0) == 0) {
           label = 1518; //@line 15078
           break;
          } else {
           $K305_0_i_i = $K305_0_i_i << 1; //@line 15081
           $T_0_i69_i = $303; //@line 15081
          }
         }
         if ((label | 0) == 1518) {
          if ($arrayidx325_i_i >>> 0 < (HEAP32[836] | 0) >>> 0) {
           _abort(); //@line 15089
           return 0; //@line 15089
          } else {
           HEAP32[$arrayidx325_i_i >> 2] = $293; //@line 15092
           HEAP32[$tbase_292_i + ($add_ptr4_sum_i50_i + 24) >> 2] = $T_0_i69_i; //@line 15096
           HEAP32[$tbase_292_i + ($add_ptr4_sum_i50_i + 12) >> 2] = $293; //@line 15100
           HEAP32[$tbase_292_i + ($add_ptr4_sum_i50_i + 8) >> 2] = $293; //@line 15104
           break;
          }
         }
         $fd344_i_i = $T_0_i69_i + 8 | 0; //@line 15108
         $309 = HEAP32[$fd344_i_i >> 2] | 0; //@line 15109
         $311 = HEAP32[836] | 0; //@line 15111
         if ($T_0_i69_i >>> 0 < $311 >>> 0) {
          _abort(); //@line 15114
          return 0; //@line 15114
         }
         if ($309 >>> 0 < $311 >>> 0) {
          _abort(); //@line 15120
          return 0; //@line 15120
         } else {
          HEAP32[$309 + 12 >> 2] = $293; //@line 15124
          HEAP32[$fd344_i_i >> 2] = $293; //@line 15125
          HEAP32[$tbase_292_i + ($add_ptr4_sum_i50_i + 8) >> 2] = $309; //@line 15129
          HEAP32[$tbase_292_i + ($add_ptr4_sum_i50_i + 12) >> 2] = $T_0_i69_i; //@line 15133
          HEAP32[$tbase_292_i + ($add_ptr4_sum_i50_i + 24) >> 2] = 0; //@line 15137
          break;
         }
        }
       } while (0);
       $mem_0 = $tbase_292_i + ($cond_i43_i | 8) | 0; //@line 15144
       return $mem_0 | 0; //@line 15146
      }
     } while (0);
     $316 = $189; //@line 15149
     $sp_0_i_i_i = 3776; //@line 15150
     while (1) {
      $317 = HEAP32[$sp_0_i_i_i >> 2] | 0; //@line 15154
      if ($317 >>> 0 <= $316 >>> 0) {
       $318 = HEAP32[$sp_0_i_i_i + 4 >> 2] | 0; //@line 15158
       $add_ptr_i_i_i = $317 + $318 | 0; //@line 15159
       if ($add_ptr_i_i_i >>> 0 > $316 >>> 0) {
        break;
       }
      }
      $sp_0_i_i_i = HEAP32[$sp_0_i_i_i + 8 >> 2] | 0; //@line 15167
     }
     $320 = $317 + ($318 - 39) | 0; //@line 15172
     if (($320 & 7 | 0) == 0) {
      $cond_i18_i = 0; //@line 15176
     } else {
      $cond_i18_i = -$320 & 7; //@line 15180
     }
     $add_ptr7_i_i = $317 + ($318 - 47 + $cond_i18_i) | 0; //@line 15184
     $cond13_i_i = $add_ptr7_i_i >>> 0 < ($189 + 16 | 0) >>> 0 ? $316 : $add_ptr7_i_i; //@line 15188
     $add_ptr14_i_i = $cond13_i_i + 8 | 0; //@line 15189
     $323 = $tbase_292_i + 8 | 0; //@line 15193
     if (($323 & 7 | 0) == 0) {
      $cond_i_i_i = 0; //@line 15197
     } else {
      $cond_i_i_i = -$323 & 7; //@line 15201
     }
     $sub5_i_i_i = $tsize_291_i - 40 - $cond_i_i_i | 0; //@line 15206
     HEAP32[838] = $tbase_292_i + $cond_i_i_i; //@line 15207
     HEAP32[835] = $sub5_i_i_i; //@line 15208
     HEAP32[$tbase_292_i + ($cond_i_i_i + 4) >> 2] = $sub5_i_i_i | 1; //@line 15213
     HEAP32[$tbase_292_i + ($tsize_291_i - 36) >> 2] = 40; //@line 15217
     HEAP32[839] = HEAP32[668]; //@line 15219
     HEAP32[$cond13_i_i + 4 >> 2] = 27; //@line 15222
     HEAP32[$add_ptr14_i_i >> 2] = HEAP32[944]; //@line 15223
     HEAP32[$add_ptr14_i_i + 4 >> 2] = HEAP32[945]; //@line 15223
     HEAP32[$add_ptr14_i_i + 8 >> 2] = HEAP32[946]; //@line 15223
     HEAP32[$add_ptr14_i_i + 12 >> 2] = HEAP32[947]; //@line 15223
     HEAP32[944] = $tbase_292_i; //@line 15224
     HEAP32[945] = $tsize_291_i; //@line 15225
     HEAP32[947] = 0; //@line 15226
     HEAP32[946] = $add_ptr14_i_i; //@line 15227
     $330 = $cond13_i_i + 28 | 0; //@line 15229
     HEAP32[$330 >> 2] = 7; //@line 15230
     if (($cond13_i_i + 32 | 0) >>> 0 < $add_ptr_i_i_i >>> 0) {
      $add_ptr2416_i_i = $330; //@line 15234
      while (1) {
       $332 = $add_ptr2416_i_i + 4 | 0; //@line 15237
       HEAP32[$332 >> 2] = 7; //@line 15238
       if (($add_ptr2416_i_i + 8 | 0) >>> 0 < $add_ptr_i_i_i >>> 0) {
        $add_ptr2416_i_i = $332; //@line 15243
       } else {
        break;
       }
      }
     }
     if (($cond13_i_i | 0) == ($316 | 0)) {
      break;
     }
     $sub_ptr_sub_i_i = $cond13_i_i - $189 | 0; //@line 15255
     $335 = $316 + ($sub_ptr_sub_i_i + 4) | 0; //@line 15259
     HEAP32[$335 >> 2] = HEAP32[$335 >> 2] & -2; //@line 15262
     HEAP32[$189 + 4 >> 2] = $sub_ptr_sub_i_i | 1; //@line 15265
     HEAP32[$316 + $sub_ptr_sub_i_i >> 2] = $sub_ptr_sub_i_i; //@line 15267
     $shr_i_i = $sub_ptr_sub_i_i >>> 3; //@line 15268
     if ($sub_ptr_sub_i_i >>> 0 < 256) {
      $shl_i21_i = $shr_i_i << 1; //@line 15271
      $337 = 3368 + ($shl_i21_i << 2) | 0; //@line 15273
      $338 = HEAP32[832] | 0; //@line 15274
      $shl39_i_i = 1 << $shr_i_i; //@line 15275
      do {
       if (($338 & $shl39_i_i | 0) == 0) {
        HEAP32[832] = $338 | $shl39_i_i; //@line 15281
        $F_0_i_i = $337; //@line 15284
        $_pre_phi_i_i = 3368 + ($shl_i21_i + 2 << 2) | 0; //@line 15284
       } else {
        $339 = 3368 + ($shl_i21_i + 2 << 2) | 0; //@line 15287
        $340 = HEAP32[$339 >> 2] | 0; //@line 15288
        if ($340 >>> 0 >= (HEAP32[836] | 0) >>> 0) {
         $F_0_i_i = $340; //@line 15293
         $_pre_phi_i_i = $339; //@line 15293
         break;
        }
        _abort(); //@line 15296
        return 0; //@line 15296
       }
      } while (0);
      HEAP32[$_pre_phi_i_i >> 2] = $189; //@line 15302
      HEAP32[$F_0_i_i + 12 >> 2] = $189; //@line 15304
      HEAP32[$189 + 8 >> 2] = $F_0_i_i; //@line 15306
      HEAP32[$189 + 12 >> 2] = $337; //@line 15308
      break;
     }
     $343 = $189; //@line 15311
     $shr58_i_i = $sub_ptr_sub_i_i >>> 8; //@line 15312
     do {
      if (($shr58_i_i | 0) == 0) {
       $I57_0_i_i = 0; //@line 15316
      } else {
       if ($sub_ptr_sub_i_i >>> 0 > 16777215) {
        $I57_0_i_i = 31; //@line 15320
        break;
       }
       $and69_i_i = ($shr58_i_i + 1048320 | 0) >>> 16 & 8; //@line 15325
       $shl70_i_i = $shr58_i_i << $and69_i_i; //@line 15326
       $and73_i_i = ($shl70_i_i + 520192 | 0) >>> 16 & 4; //@line 15329
       $shl75_i_i = $shl70_i_i << $and73_i_i; //@line 15331
       $and78_i_i = ($shl75_i_i + 245760 | 0) >>> 16 & 2; //@line 15334
       $add83_i_i = 14 - ($and73_i_i | $and69_i_i | $and78_i_i) + ($shl75_i_i << $and78_i_i >>> 15) | 0; //@line 15339
       $I57_0_i_i = $sub_ptr_sub_i_i >>> (($add83_i_i + 7 | 0) >>> 0) & 1 | $add83_i_i << 1; //@line 15345
      }
     } while (0);
     $arrayidx91_i_i = 3632 + ($I57_0_i_i << 2) | 0; //@line 15349
     HEAP32[$189 + 28 >> 2] = $I57_0_i_i; //@line 15352
     HEAP32[$189 + 20 >> 2] = 0; //@line 15354
     HEAP32[$189 + 16 >> 2] = 0; //@line 15356
     $345 = HEAP32[833] | 0; //@line 15357
     $shl95_i_i = 1 << $I57_0_i_i; //@line 15358
     if (($345 & $shl95_i_i | 0) == 0) {
      HEAP32[833] = $345 | $shl95_i_i; //@line 15363
      HEAP32[$arrayidx91_i_i >> 2] = $343; //@line 15364
      HEAP32[$189 + 24 >> 2] = $arrayidx91_i_i; //@line 15367
      HEAP32[$189 + 12 >> 2] = $189; //@line 15369
      HEAP32[$189 + 8 >> 2] = $189; //@line 15371
      break;
     }
     if (($I57_0_i_i | 0) == 31) {
      $cond115_i_i = 0; //@line 15377
     } else {
      $cond115_i_i = 25 - ($I57_0_i_i >>> 1) | 0; //@line 15381
     }
     $K105_0_i_i = $sub_ptr_sub_i_i << $cond115_i_i; //@line 15385
     $T_0_i_i = HEAP32[$arrayidx91_i_i >> 2] | 0; //@line 15385
     while (1) {
      if ((HEAP32[$T_0_i_i + 4 >> 2] & -8 | 0) == ($sub_ptr_sub_i_i | 0)) {
       break;
      }
      $arrayidx126_i_i = $T_0_i_i + 16 + ($K105_0_i_i >>> 31 << 2) | 0; //@line 15397
      $348 = HEAP32[$arrayidx126_i_i >> 2] | 0; //@line 15398
      if (($348 | 0) == 0) {
       label = 1553; //@line 15402
       break;
      } else {
       $K105_0_i_i = $K105_0_i_i << 1; //@line 15405
       $T_0_i_i = $348; //@line 15405
      }
     }
     if ((label | 0) == 1553) {
      if ($arrayidx126_i_i >>> 0 < (HEAP32[836] | 0) >>> 0) {
       _abort(); //@line 15413
       return 0; //@line 15413
      } else {
       HEAP32[$arrayidx126_i_i >> 2] = $343; //@line 15416
       HEAP32[$189 + 24 >> 2] = $T_0_i_i; //@line 15419
       HEAP32[$189 + 12 >> 2] = $189; //@line 15421
       HEAP32[$189 + 8 >> 2] = $189; //@line 15423
       break;
      }
     }
     $fd145_i_i = $T_0_i_i + 8 | 0; //@line 15427
     $351 = HEAP32[$fd145_i_i >> 2] | 0; //@line 15428
     $353 = HEAP32[836] | 0; //@line 15430
     if ($T_0_i_i >>> 0 < $353 >>> 0) {
      _abort(); //@line 15433
      return 0; //@line 15433
     }
     if ($351 >>> 0 < $353 >>> 0) {
      _abort(); //@line 15439
      return 0; //@line 15439
     } else {
      HEAP32[$351 + 12 >> 2] = $343; //@line 15443
      HEAP32[$fd145_i_i >> 2] = $343; //@line 15444
      HEAP32[$189 + 8 >> 2] = $351; //@line 15447
      HEAP32[$189 + 12 >> 2] = $T_0_i_i; //@line 15450
      HEAP32[$189 + 24 >> 2] = 0; //@line 15452
      break;
     }
    }
   } while (0);
   $355 = HEAP32[835] | 0; //@line 15457
   if ($355 >>> 0 <= $nb_0 >>> 0) {
    break;
   }
   $sub253_i = $355 - $nb_0 | 0; //@line 15462
   HEAP32[835] = $sub253_i; //@line 15463
   $356 = HEAP32[838] | 0; //@line 15464
   $357 = $356; //@line 15465
   HEAP32[838] = $357 + $nb_0; //@line 15468
   HEAP32[$357 + ($nb_0 + 4) >> 2] = $sub253_i | 1; //@line 15473
   HEAP32[$356 + 4 >> 2] = $nb_0 | 3; //@line 15476
   $mem_0 = $356 + 8 | 0; //@line 15479
   return $mem_0 | 0; //@line 15481
  }
 } while (0);
 HEAP32[(___errno_location() | 0) >> 2] = 12; //@line 15485
 $mem_0 = 0; //@line 15486
 return $mem_0 | 0; //@line 15488
}
function _BBCity_initBlocks($self, $size) {
 $self = $self | 0;
 $size = $size | 0;
 var $agg_tmp = 0, $agg_tmp13 = 0, $agg_tmp14 = 0, $agg_tmp15 = 0, $agg_tmp16 = 0, $agg_tmp17 = 0, $agg_tmp18 = 0, $agg_tmp19 = 0, $agg_tmp20 = 0, $agg_tmp27 = 0, $agg_tmp28 = 0, $agg_tmp29 = 0, $agg_tmp30 = 0, $agg_tmp31 = 0, $agg_tmp38 = 0, $agg_tmp39 = 0, $agg_tmp40 = 0, $agg_tmp41 = 0, $agg_tmp48 = 0, $agg_tmp49 = 0, $agg_tmp50 = 0, $agg_tmp51 = 0, $agg_tmp57 = 0, $agg_tmp58 = 0, $agg_tmp59 = 0, $agg_tmp60 = 0, $agg_tmp79 = 0, $agg_tmp84 = 0, $agg_tmp95 = 0, $agg_tmp101 = 0, $agg_tmp107 = 0, $agg_tmp113 = 0, $agg_tmp125 = 0, $agg_tmp131 = 0, $agg_tmp137 = 0, $agg_tmp143 = 0, $agg_tmp149 = 0, $agg_tmp155 = 0, $agg_tmp167 = 0, $agg_tmp173 = 0, $agg_tmp179 = 0, $agg_tmp185 = 0, $agg_tmp191 = 0, $agg_tmp203 = 0, $agg_tmp209 = 0, $agg_tmp215 = 0, $agg_tmp221 = 0, $agg_tmp227 = 0, $agg_tmp233 = 0, $agg_tmp238 = 0, $agg_tmp242 = 0, $agg_tmp246 = 0, $agg_tmp250 = 0, $agg_tmp254 = 0, $agg_tmp258 = 0, $agg_tmp262 = 0, $agg_tmp266 = 0, $agg_tmp270 = 0, $agg_tmp275 = 0, $agg_tmp278 = 0, $agg_tmp282 = 0, $agg_tmp285 = 0, $agg_tmp289 = 0, $blocks = 0, $blockMap = 0, $2 = 0, $mul5 = 0, $call6 = 0, $citySize = 0, $call11 = 0, $6 = 0, $call22 = 0, $9 = 0, $call33 = 0, $12 = 0, $call43 = 0, $15 = 0, $call53 = 0, $18 = 0, $call62 = 0, $20 = 0, $sides = 0, $21 = 0, $22 = 0, $24 = 0, $call72 = 0, $26 = 0, $sides76 = 0, $27 = 0, $28 = 0, $call78 = 0, $30 = 0, $call83 = 0, $call88 = 0, $32 = 0, $sides92 = 0, $33 = 0, $34 = 0, $call94 = 0, $36 = 0, $call100 = 0, $38 = 0, $call106 = 0, $40 = 0, $call112 = 0, $call118 = 0, $sides122 = 0, $43 = 0, $44 = 0, $call124 = 0, $46 = 0, $call130 = 0, $48 = 0, $call136 = 0, $50 = 0, $call142 = 0, $52 = 0, $call148 = 0, $54 = 0, $call154 = 0, $call160 = 0, $56 = 0, $sides164 = 0, $57 = 0, $58 = 0, $call166 = 0, $60 = 0, $call172 = 0, $62 = 0, $call178 = 0, $64 = 0, $call184 = 0, $66 = 0, $call190 = 0, $call196 = 0, $sides200 = 0, $69 = 0, $70 = 0, $call202 = 0, $72 = 0, $call208 = 0, $74 = 0, $call214 = 0, $76 = 0, $call220 = 0, $78 = 0, $call226 = 0, $80 = 0, $call232 = 0, $call237 = 0, $call240 = 0, $aabb12_sroa_0_0_copyload_i708 = 0.0, $aabb12_sroa_2_12_copyload_i710 = 0.0, $mul_i713 = 0, $conv9_i721 = 0, $conv14_i724 = 0, $85 = 0, $add_i728 = 0, $mul20_i729 = 0, $add24_i732 = 0, $call241 = 0, $call244 = 0, $aabb12_sroa_0_0_copyload_i668 = 0.0, $aabb12_sroa_2_12_copyload_i670 = 0.0, $mul_i673 = 0, $conv9_i681 = 0, $conv14_i684 = 0, $91 = 0, $add_i688 = 0, $mul20_i689 = 0, $add24_i692 = 0, $call245 = 0, $call248 = 0, $aabb12_sroa_0_0_copyload_i630 = 0.0, $aabb12_sroa_2_12_copyload_i632 = 0.0, $mul_i635 = 0, $conv9_i643 = 0, $conv14_i646 = 0, $97 = 0, $add_i650 = 0, $mul20_i651 = 0, $add24_i654 = 0, $call249 = 0, $call252 = 0, $aabb12_sroa_0_0_copyload_i590 = 0.0, $aabb12_sroa_2_12_copyload_i592 = 0.0, $mul_i595 = 0, $conv9_i603 = 0, $conv14_i606 = 0, $103 = 0, $add_i610 = 0, $mul20_i611 = 0, $add24_i614 = 0, $call253 = 0, $call256 = 0, $aabb12_sroa_0_0_copyload_i552 = 0.0, $aabb12_sroa_2_12_copyload_i554 = 0.0, $mul_i557 = 0, $conv9_i565 = 0, $conv14_i568 = 0, $109 = 0, $add_i572 = 0, $mul20_i573 = 0, $add24_i576 = 0, $call257 = 0, $call260 = 0, $aabb12_sroa_0_0_copyload_i512 = 0.0, $aabb12_sroa_2_12_copyload_i514 = 0.0, $mul_i517 = 0, $conv9_i525 = 0, $conv14_i528 = 0, $115 = 0, $add_i532 = 0, $mul20_i533 = 0, $add24_i536 = 0, $call261 = 0, $call264 = 0, $aabb12_sroa_0_0_copyload_i472 = 0.0, $aabb12_sroa_2_12_copyload_i474 = 0.0, $mul_i477 = 0, $conv9_i485 = 0, $conv14_i488 = 0, $121 = 0, $add_i492 = 0, $mul20_i493 = 0, $add24_i496 = 0, $call265 = 0, $call268 = 0, $aabb12_sroa_0_0_copyload_i426 = 0.0, $aabb12_sroa_2_12_copyload_i428 = 0.0, $mul_i431 = 0, $conv9_i439 = 0, $conv14_i442 = 0, $127 = 0, $add_i446 = 0, $mul20_i447 = 0, $add24_i450 = 0, $call269 = 0, $call271 = 0, $aabb12_sroa_0_0_copyload_i380 = 0.0, $aabb12_sroa_2_12_copyload_i382 = 0.0, $mul_i385 = 0, $conv9_i393 = 0, $conv14_i396 = 0, $133 = 0, $add_i400 = 0, $mul20_i401 = 0, $add24_i404 = 0, $call273 = 0, $aabb12_sroa_0_0_copyload_i336 = 0.0, $aabb12_sroa_2_12_copyload_i338 = 0.0, $mul_i341 = 0, $conv9_i349 = 0, $conv14_i352 = 0, $139 = 0, $add_i356 = 0, $mul20_i357 = 0, $add24_i360 = 0, $call274 = 0, $call276 = 0, $aabb12_sroa_0_0_copyload_i290 = 0.0, $aabb12_sroa_2_12_copyload_i292 = 0.0, $mul_i295 = 0, $conv9_i303 = 0, $conv14_i306 = 0, $145 = 0, $add_i310 = 0, $mul20_i311 = 0, $add24_i314 = 0, $call277 = 0, $call280 = 0, $aabb12_sroa_0_0_copyload_i244 = 0.0, $aabb12_sroa_2_12_copyload_i246 = 0.0, $mul_i249 = 0, $conv9_i257 = 0, $conv14_i260 = 0, $151 = 0, $add_i264 = 0, $mul20_i265 = 0, $add24_i268 = 0, $call281 = 0, $call283 = 0, $aabb12_sroa_0_0_copyload_i198 = 0.0, $aabb12_sroa_2_12_copyload_i200 = 0.0, $mul_i203 = 0, $conv9_i211 = 0, $conv14_i214 = 0, $157 = 0, $add_i218 = 0, $mul20_i219 = 0, $add24_i222 = 0, $call284 = 0, $call287 = 0, $aabb12_sroa_0_0_copyload_i152 = 0.0, $aabb12_sroa_2_12_copyload_i154 = 0.0, $mul_i157 = 0, $conv9_i165 = 0, $conv14_i168 = 0, $163 = 0, $add_i172 = 0, $mul20_i173 = 0, $add24_i176 = 0, $call288 = 0, $call290 = 0, $aabb12_sroa_0_0_copyload_i = 0.0, $aabb12_sroa_2_12_copyload_i = 0.0, $mul_i = 0, $conv9_i = 0, $conv14_i = 0, $169 = 0, $add_i = 0, $mul20_i = 0, $add24_i = 0, tempVarArgs = 0, sp = 0;
 sp = STACKTOP; //@line 1727
 STACKTOP = STACKTOP + 712 | 0; //@line 1727
 $agg_tmp = sp | 0; //@line 1728
 $agg_tmp13 = sp + 16 | 0; //@line 1729
 $agg_tmp14 = sp + 32 | 0; //@line 1730
 $agg_tmp15 = sp + 48 | 0; //@line 1731
 $agg_tmp16 = sp + 64 | 0; //@line 1732
 $agg_tmp17 = sp + 80 | 0; //@line 1733
 $agg_tmp18 = sp + 96 | 0; //@line 1734
 $agg_tmp19 = sp + 112 | 0; //@line 1735
 $agg_tmp20 = sp + 128 | 0; //@line 1736
 $agg_tmp27 = sp + 144 | 0; //@line 1737
 $agg_tmp28 = sp + 160 | 0; //@line 1738
 $agg_tmp29 = sp + 176 | 0; //@line 1739
 $agg_tmp30 = sp + 192 | 0; //@line 1740
 $agg_tmp31 = sp + 208 | 0; //@line 1741
 $agg_tmp38 = sp + 224 | 0; //@line 1742
 $agg_tmp39 = sp + 240 | 0; //@line 1743
 $agg_tmp40 = sp + 256 | 0; //@line 1744
 $agg_tmp41 = sp + 272 | 0; //@line 1745
 $agg_tmp48 = sp + 288 | 0; //@line 1746
 $agg_tmp49 = sp + 304 | 0; //@line 1747
 $agg_tmp50 = sp + 320 | 0; //@line 1748
 $agg_tmp51 = sp + 336 | 0; //@line 1749
 $agg_tmp57 = sp + 352 | 0; //@line 1750
 $agg_tmp58 = sp + 368 | 0; //@line 1751
 $agg_tmp59 = sp + 384 | 0; //@line 1752
 $agg_tmp60 = sp + 400 | 0; //@line 1753
 $agg_tmp79 = sp + 416 | 0; //@line 1754
 $agg_tmp84 = sp + 424 | 0; //@line 1755
 $agg_tmp95 = sp + 432 | 0; //@line 1756
 $agg_tmp101 = sp + 440 | 0; //@line 1757
 $agg_tmp107 = sp + 448 | 0; //@line 1758
 $agg_tmp113 = sp + 456 | 0; //@line 1759
 $agg_tmp125 = sp + 464 | 0; //@line 1760
 $agg_tmp131 = sp + 472 | 0; //@line 1761
 $agg_tmp137 = sp + 480 | 0; //@line 1762
 $agg_tmp143 = sp + 488 | 0; //@line 1763
 $agg_tmp149 = sp + 496 | 0; //@line 1764
 $agg_tmp155 = sp + 504 | 0; //@line 1765
 $agg_tmp167 = sp + 512 | 0; //@line 1766
 $agg_tmp173 = sp + 520 | 0; //@line 1767
 $agg_tmp179 = sp + 528 | 0; //@line 1768
 $agg_tmp185 = sp + 536 | 0; //@line 1769
 $agg_tmp191 = sp + 544 | 0; //@line 1770
 $agg_tmp203 = sp + 552 | 0; //@line 1771
 $agg_tmp209 = sp + 560 | 0; //@line 1772
 $agg_tmp215 = sp + 568 | 0; //@line 1773
 $agg_tmp221 = sp + 576 | 0; //@line 1774
 $agg_tmp227 = sp + 584 | 0; //@line 1775
 $agg_tmp233 = sp + 592 | 0; //@line 1776
 $agg_tmp238 = sp + 600 | 0; //@line 1777
 $agg_tmp242 = sp + 608 | 0; //@line 1778
 $agg_tmp246 = sp + 616 | 0; //@line 1779
 $agg_tmp250 = sp + 624 | 0; //@line 1780
 $agg_tmp254 = sp + 632 | 0; //@line 1781
 $agg_tmp258 = sp + 640 | 0; //@line 1782
 $agg_tmp262 = sp + 648 | 0; //@line 1783
 $agg_tmp266 = sp + 656 | 0; //@line 1784
 $agg_tmp270 = sp + 664 | 0; //@line 1785
 $agg_tmp275 = sp + 672 | 0; //@line 1786
 $agg_tmp278 = sp + 680 | 0; //@line 1787
 $agg_tmp282 = sp + 688 | 0; //@line 1788
 $agg_tmp285 = sp + 696 | 0; //@line 1789
 $agg_tmp289 = sp + 704 | 0; //@line 1790
 $blocks = $self + 32 | 0; //@line 1791
 _aqrelease(HEAP32[$blocks >> 2] | 0) | 0; //@line 1794
 $blockMap = $self + 40 | 0; //@line 1795
 $2 = HEAP32[$blockMap >> 2] | 0; //@line 1796
 if (($2 | 0) != 0) {
  _free($2); //@line 1801
 }
 HEAP32[$blocks >> 2] = _aqinit(_aqalloc(2280) | 0) | 0; //@line 1807
 $mul5 = Math_imul($size << 2, $size) | 0; //@line 1809
 $call6 = _malloc($mul5) | 0; //@line 1810
 HEAP32[$blockMap >> 2] = $call6; //@line 1812
 _memset($call6 | 0, 0, $mul5 | 0); //@line 1813
 $citySize = $self + 36 | 0; //@line 1814
 HEAP32[$citySize >> 2] = $size; //@line 1815
 $call11 = _aqcreate(1704) | 0; //@line 1816
 $6 = $call11; //@line 1817
 HEAP32[$call11 + 16 >> 2] = 4; //@line 1820
 HEAP32[$call11 + 20 >> 2] = 0; //@line 1823
 HEAPF32[$call11 + 24 >> 2] = -30.0; //@line 1826
 HEAPF32[$call11 + 28 >> 2] = 40.0; //@line 1829
 HEAPF32[$call11 + 32 >> 2] = -60.0; //@line 1832
 HEAPF32[$call11 + 36 >> 2] = 0.0; //@line 1835
 HEAPF32[$agg_tmp >> 2] = -30.0; //@line 1837
 HEAPF32[$agg_tmp + 4 >> 2] = 15.0; //@line 1839
 HEAPF32[$agg_tmp + 8 >> 2] = -32.0; //@line 1841
 HEAPF32[$agg_tmp + 12 >> 2] = 0.0; //@line 1843
 _BBRoom_addWall($6, $agg_tmp, 0); //@line 1844
 HEAPF32[$agg_tmp13 >> 2] = -30.0; //@line 1846
 HEAPF32[$agg_tmp13 + 4 >> 2] = 40.0; //@line 1848
 HEAPF32[$agg_tmp13 + 8 >> 2] = -32.0; //@line 1850
 HEAPF32[$agg_tmp13 + 12 >> 2] = 25.0; //@line 1852
 _BBRoom_addWall($6, $agg_tmp13, 0); //@line 1853
 HEAPF32[$agg_tmp14 >> 2] = -30.0; //@line 1855
 HEAPF32[$agg_tmp14 + 4 >> 2] = 40.0; //@line 1857
 HEAPF32[$agg_tmp14 + 8 >> 2] = -60.0; //@line 1859
 HEAPF32[$agg_tmp14 + 12 >> 2] = 38.0; //@line 1861
 _BBRoom_addWall($6, $agg_tmp14, 0); //@line 1862
 HEAPF32[$agg_tmp15 >> 2] = -58.0; //@line 1864
 HEAPF32[$agg_tmp15 + 4 >> 2] = 40.0; //@line 1866
 HEAPF32[$agg_tmp15 + 8 >> 2] = -60.0; //@line 1868
 HEAPF32[$agg_tmp15 + 12 >> 2] = 0.0; //@line 1870
 _BBRoom_addWall($6, $agg_tmp15, 0); //@line 1871
 HEAPF32[$agg_tmp16 >> 2] = -30.0; //@line 1873
 HEAPF32[$agg_tmp16 + 4 >> 2] = 2.0; //@line 1875
 HEAPF32[$agg_tmp16 + 8 >> 2] = -60.0; //@line 1877
 HEAPF32[$agg_tmp16 + 12 >> 2] = 0.0; //@line 1879
 _BBRoom_addWall($6, $agg_tmp16, 0); //@line 1880
 HEAPF32[$agg_tmp17 >> 2] = -39.0; //@line 1882
 HEAPF32[$agg_tmp17 + 4 >> 2] = 12.0; //@line 1884
 HEAPF32[$agg_tmp17 + 8 >> 2] = -51.0; //@line 1886
 HEAPF32[$agg_tmp17 + 12 >> 2] = 10.0; //@line 1888
 _BBRoom_addWall($6, $agg_tmp17, 1); //@line 1889
 HEAPF32[$agg_tmp18 >> 2] = -39.0; //@line 1891
 HEAPF32[$agg_tmp18 + 4 >> 2] = 14.0; //@line 1893
 HEAPF32[$agg_tmp18 + 8 >> 2] = -51.0; //@line 1895
 HEAPF32[$agg_tmp18 + 12 >> 2] = 12.0; //@line 1897
 _BBRoom_addWall($6, $agg_tmp18, 1); //@line 1898
 HEAPF32[$agg_tmp19 >> 2] = -39.0; //@line 1900
 HEAPF32[$agg_tmp19 + 4 >> 2] = 28.0; //@line 1902
 HEAPF32[$agg_tmp19 + 8 >> 2] = -51.0; //@line 1904
 HEAPF32[$agg_tmp19 + 12 >> 2] = 26.0; //@line 1906
 _BBRoom_addWall($6, $agg_tmp19, 1); //@line 1907
 HEAPF32[$agg_tmp20 >> 2] = -39.0; //@line 1909
 HEAPF32[$agg_tmp20 + 4 >> 2] = 30.0; //@line 1911
 HEAPF32[$agg_tmp20 + 8 >> 2] = -51.0; //@line 1913
 HEAPF32[$agg_tmp20 + 12 >> 2] = 28.0; //@line 1915
 _BBRoom_addWall($6, $agg_tmp20, 1); //@line 1916
 $call22 = _aqcreate(1704) | 0; //@line 1917
 $9 = $call22; //@line 1918
 HEAP32[$call22 + 16 >> 2] = 1; //@line 1921
 HEAP32[$call22 + 20 >> 2] = 0; //@line 1924
 HEAPF32[$call22 + 24 >> 2] = -30.0; //@line 1927
 HEAPF32[$call22 + 28 >> 2] = 60.0; //@line 1930
 HEAPF32[$call22 + 32 >> 2] = -50.0; //@line 1933
 HEAPF32[$call22 + 36 >> 2] = 40.0; //@line 1936
 HEAPF32[$agg_tmp27 >> 2] = -30.0; //@line 1938
 HEAPF32[$agg_tmp27 + 4 >> 2] = 60.0; //@line 1940
 HEAPF32[$agg_tmp27 + 8 >> 2] = -50.0; //@line 1942
 HEAPF32[$agg_tmp27 + 12 >> 2] = 58.0; //@line 1944
 _BBRoom_addWall($9, $agg_tmp27, 0); //@line 1945
 HEAPF32[$agg_tmp28 >> 2] = -48.0; //@line 1947
 HEAPF32[$agg_tmp28 + 4 >> 2] = 60.0; //@line 1949
 HEAPF32[$agg_tmp28 + 8 >> 2] = -50.0; //@line 1951
 HEAPF32[$agg_tmp28 + 12 >> 2] = 40.0; //@line 1953
 _BBRoom_addWall($9, $agg_tmp28, 0); //@line 1954
 HEAPF32[$agg_tmp29 >> 2] = -30.0; //@line 1956
 HEAPF32[$agg_tmp29 + 4 >> 2] = 42.0; //@line 1958
 HEAPF32[$agg_tmp29 + 8 >> 2] = -50.0; //@line 1960
 HEAPF32[$agg_tmp29 + 12 >> 2] = 40.0; //@line 1962
 _BBRoom_addWall($9, $agg_tmp29, 0); //@line 1963
 HEAPF32[$agg_tmp30 >> 2] = -36.0; //@line 1965
 HEAPF32[$agg_tmp30 + 4 >> 2] = 54.0; //@line 1967
 HEAPF32[$agg_tmp30 + 8 >> 2] = -38.0; //@line 1969
 HEAPF32[$agg_tmp30 + 12 >> 2] = 46.0; //@line 1971
 _BBRoom_addWall($9, $agg_tmp30, 1); //@line 1972
 HEAPF32[$agg_tmp31 >> 2] = -38.0; //@line 1974
 HEAPF32[$agg_tmp31 + 4 >> 2] = 54.0; //@line 1976
 HEAPF32[$agg_tmp31 + 8 >> 2] = -40.0; //@line 1978
 HEAPF32[$agg_tmp31 + 12 >> 2] = 46.0; //@line 1980
 _BBRoom_addWall($9, $agg_tmp31, 1); //@line 1981
 $call33 = _aqcreate(1704) | 0; //@line 1982
 $12 = $call33; //@line 1983
 HEAP32[$call33 + 16 >> 2] = 1; //@line 1986
 HEAP32[$call33 + 20 >> 2] = 0; //@line 1989
 HEAPF32[$call33 + 24 >> 2] = 0.0; //@line 1992
 HEAPF32[$call33 + 28 >> 2] = 20.0; //@line 1995
 HEAPF32[$call33 + 32 >> 2] = -20.0; //@line 1998
 HEAPF32[$call33 + 36 >> 2] = 0.0; //@line 2001
 HEAPF32[$agg_tmp38 >> 2] = 0.0; //@line 2003
 HEAPF32[$agg_tmp38 + 4 >> 2] = 20.0; //@line 2005
 HEAPF32[$agg_tmp38 + 8 >> 2] = -2.0; //@line 2007
 HEAPF32[$agg_tmp38 + 12 >> 2] = 0.0; //@line 2009
 _BBRoom_addWall($12, $agg_tmp38, 0); //@line 2010
 HEAPF32[$agg_tmp39 >> 2] = 0.0; //@line 2012
 HEAPF32[$agg_tmp39 + 4 >> 2] = 20.0; //@line 2014
 HEAPF32[$agg_tmp39 + 8 >> 2] = -20.0; //@line 2016
 HEAPF32[$agg_tmp39 + 12 >> 2] = 18.0; //@line 2018
 _BBRoom_addWall($12, $agg_tmp39, 0); //@line 2019
 HEAPF32[$agg_tmp40 >> 2] = -18.0; //@line 2021
 HEAPF32[$agg_tmp40 + 4 >> 2] = 20.0; //@line 2023
 HEAPF32[$agg_tmp40 + 8 >> 2] = -20.0; //@line 2025
 HEAPF32[$agg_tmp40 + 12 >> 2] = 0.0; //@line 2027
 _BBRoom_addWall($12, $agg_tmp40, 0); //@line 2028
 HEAPF32[$agg_tmp41 >> 2] = 0.0; //@line 2030
 HEAPF32[$agg_tmp41 + 4 >> 2] = 2.0; //@line 2032
 HEAPF32[$agg_tmp41 + 8 >> 2] = -20.0; //@line 2034
 HEAPF32[$agg_tmp41 + 12 >> 2] = 0.0; //@line 2036
 _BBRoom_addWall($12, $agg_tmp41, 0); //@line 2037
 $call43 = _aqcreate(1704) | 0; //@line 2038
 $15 = $call43; //@line 2039
 HEAP32[$call43 + 16 >> 2] = 1; //@line 2042
 HEAP32[$call43 + 20 >> 2] = 0; //@line 2045
 HEAPF32[$call43 + 24 >> 2] = 0.0; //@line 2048
 HEAPF32[$call43 + 28 >> 2] = 20.0; //@line 2051
 HEAPF32[$call43 + 32 >> 2] = -10.0; //@line 2054
 HEAPF32[$call43 + 36 >> 2] = 0.0; //@line 2057
 HEAPF32[$agg_tmp48 >> 2] = 0.0; //@line 2059
 HEAPF32[$agg_tmp48 + 4 >> 2] = 20.0; //@line 2061
 HEAPF32[$agg_tmp48 + 8 >> 2] = -2.0; //@line 2063
 HEAPF32[$agg_tmp48 + 12 >> 2] = 0.0; //@line 2065
 _BBRoom_addWall($15, $agg_tmp48, 0); //@line 2066
 HEAPF32[$agg_tmp49 >> 2] = 0.0; //@line 2068
 HEAPF32[$agg_tmp49 + 4 >> 2] = 20.0; //@line 2070
 HEAPF32[$agg_tmp49 + 8 >> 2] = -10.0; //@line 2072
 HEAPF32[$agg_tmp49 + 12 >> 2] = 18.0; //@line 2074
 _BBRoom_addWall($15, $agg_tmp49, 0); //@line 2075
 HEAPF32[$agg_tmp50 >> 2] = -8.0; //@line 2077
 HEAPF32[$agg_tmp50 + 4 >> 2] = 20.0; //@line 2079
 HEAPF32[$agg_tmp50 + 8 >> 2] = -10.0; //@line 2081
 HEAPF32[$agg_tmp50 + 12 >> 2] = 0.0; //@line 2083
 _BBRoom_addWall($15, $agg_tmp50, 0); //@line 2084
 HEAPF32[$agg_tmp51 >> 2] = 0.0; //@line 2086
 HEAPF32[$agg_tmp51 + 4 >> 2] = 2.0; //@line 2088
 HEAPF32[$agg_tmp51 + 8 >> 2] = -10.0; //@line 2090
 HEAPF32[$agg_tmp51 + 12 >> 2] = 0.0; //@line 2092
 _BBRoom_addWall($15, $agg_tmp51, 0); //@line 2093
 $call53 = _aqcreate(1704) | 0; //@line 2094
 $18 = $call53; //@line 2095
 HEAP32[$call53 + 20 >> 2] = 0; //@line 2098
 HEAPF32[$call53 + 24 >> 2] = 0.0; //@line 2101
 HEAPF32[$call53 + 28 >> 2] = 20.0; //@line 2104
 HEAPF32[$call53 + 32 >> 2] = -30.0; //@line 2107
 HEAPF32[$call53 + 36 >> 2] = 0.0; //@line 2110
 HEAPF32[$agg_tmp57 >> 2] = 0.0; //@line 2112
 HEAPF32[$agg_tmp57 + 4 >> 2] = 20.0; //@line 2114
 HEAPF32[$agg_tmp57 + 8 >> 2] = -2.0; //@line 2116
 HEAPF32[$agg_tmp57 + 12 >> 2] = 0.0; //@line 2118
 _BBRoom_addWall($18, $agg_tmp57, 0); //@line 2119
 HEAPF32[$agg_tmp58 >> 2] = 0.0; //@line 2121
 HEAPF32[$agg_tmp58 + 4 >> 2] = 20.0; //@line 2123
 HEAPF32[$agg_tmp58 + 8 >> 2] = -30.0; //@line 2125
 HEAPF32[$agg_tmp58 + 12 >> 2] = 18.0; //@line 2127
 _BBRoom_addWall($18, $agg_tmp58, 0); //@line 2128
 HEAPF32[$agg_tmp59 >> 2] = -28.0; //@line 2130
 HEAPF32[$agg_tmp59 + 4 >> 2] = 20.0; //@line 2132
 HEAPF32[$agg_tmp59 + 8 >> 2] = -30.0; //@line 2134
 HEAPF32[$agg_tmp59 + 12 >> 2] = 0.0; //@line 2136
 _BBRoom_addWall($18, $agg_tmp59, 0); //@line 2137
 HEAPF32[$agg_tmp60 >> 2] = 0.0; //@line 2139
 HEAPF32[$agg_tmp60 + 4 >> 2] = 2.0; //@line 2141
 HEAPF32[$agg_tmp60 + 8 >> 2] = -30.0; //@line 2143
 HEAPF32[$agg_tmp60 + 12 >> 2] = 0.0; //@line 2145
 _BBRoom_addWall($18, $agg_tmp60, 0); //@line 2146
 $call62 = _aqcreate(1904) | 0; //@line 2147
 $20 = $call62; //@line 2148
 HEAPF32[$call62 + 12 >> 2] = 0.0; //@line 2151
 HEAPF32[$call62 + 16 >> 2] = 60.0; //@line 2154
 HEAPF32[$call62 + 20 >> 2] = -60.0; //@line 2157
 HEAPF32[$call62 + 24 >> 2] = 0.0; //@line 2160
 $sides = $call62 + 36 | 0; //@line 2161
 HEAP32[$sides >> 2] = HEAP32[460]; //@line 2162
 HEAP32[$sides + 4 >> 2] = HEAP32[461]; //@line 2162
 HEAP32[$sides + 8 >> 2] = HEAP32[462]; //@line 2162
 HEAP32[$sides + 12 >> 2] = HEAP32[463]; //@line 2162
 $21 = $call62 + 52 | 0; //@line 2164
 $22 = HEAP32[$21 >> 2] | 0; //@line 2165
 _AQList_push($22, _BBRoom_clone($6) | 0) | 0; //@line 2168
 $24 = HEAP32[$21 >> 2] | 0; //@line 2169
 _AQList_push($24, _BBRoom_clone($9) | 0) | 0; //@line 2172
 $call72 = _aqcreate(1904) | 0; //@line 2173
 $26 = $call72; //@line 2174
 HEAPF32[$call72 + 12 >> 2] = 0.0; //@line 2177
 HEAPF32[$call72 + 16 >> 2] = 60.0; //@line 2180
 HEAPF32[$call72 + 20 >> 2] = -60.0; //@line 2183
 HEAPF32[$call72 + 24 >> 2] = 0.0; //@line 2186
 $sides76 = $call72 + 36 | 0; //@line 2187
 HEAP32[$sides76 >> 2] = HEAP32[456]; //@line 2188
 HEAP32[$sides76 + 4 >> 2] = HEAP32[457]; //@line 2188
 HEAP32[$sides76 + 8 >> 2] = HEAP32[458]; //@line 2188
 HEAP32[$sides76 + 12 >> 2] = HEAP32[459]; //@line 2188
 $27 = $call72 + 52 | 0; //@line 2190
 $28 = HEAP32[$27 >> 2] | 0; //@line 2191
 $call78 = _BBRoom_clone($18) | 0; //@line 2192
 HEAPF32[$agg_tmp79 >> 2] = 0.0; //@line 2194
 HEAPF32[$agg_tmp79 + 4 >> 2] = -30.0; //@line 2196
 _AQList_push($28, _BBRoom_moveTo($call78, $agg_tmp79) | 0) | 0; //@line 2199
 $30 = HEAP32[$27 >> 2] | 0; //@line 2200
 $call83 = _BBRoom_clone($18) | 0; //@line 2201
 HEAPF32[$agg_tmp84 >> 2] = 40.0; //@line 2203
 HEAPF32[$agg_tmp84 + 4 >> 2] = -30.0; //@line 2205
 _AQList_push($30, _BBRoom_moveTo($call83, $agg_tmp84) | 0) | 0; //@line 2208
 $call88 = _aqcreate(1904) | 0; //@line 2209
 $32 = $call88; //@line 2210
 HEAPF32[$call88 + 12 >> 2] = 0.0; //@line 2213
 HEAPF32[$call88 + 16 >> 2] = 60.0; //@line 2216
 HEAPF32[$call88 + 20 >> 2] = -60.0; //@line 2219
 HEAPF32[$call88 + 24 >> 2] = 0.0; //@line 2222
 $sides92 = $call88 + 36 | 0; //@line 2223
 HEAP32[$sides92 >> 2] = HEAP32[452]; //@line 2224
 HEAP32[$sides92 + 4 >> 2] = HEAP32[453]; //@line 2224
 HEAP32[$sides92 + 8 >> 2] = HEAP32[454]; //@line 2224
 HEAP32[$sides92 + 12 >> 2] = HEAP32[455]; //@line 2224
 $33 = $call88 + 52 | 0; //@line 2226
 $34 = HEAP32[$33 >> 2] | 0; //@line 2227
 $call94 = _BBRoom_clone($9) | 0; //@line 2228
 HEAPF32[$agg_tmp95 >> 2] = 0.0; //@line 2230
 HEAPF32[$agg_tmp95 + 4 >> 2] = 0.0; //@line 2232
 _AQList_push($34, _BBRoom_rotateTo(_BBRoom_moveTo($call94, $agg_tmp95) | 0, 1) | 0) | 0; //@line 2236
 $36 = HEAP32[$33 >> 2] | 0; //@line 2237
 $call100 = _BBRoom_clone($9) | 0; //@line 2238
 HEAPF32[$agg_tmp101 >> 2] = 40.0; //@line 2240
 HEAPF32[$agg_tmp101 + 4 >> 2] = 0.0; //@line 2242
 _AQList_push($36, _BBRoom_rotateTo(_BBRoom_moveTo($call100, $agg_tmp101) | 0, 3) | 0) | 0; //@line 2246
 $38 = HEAP32[$33 >> 2] | 0; //@line 2247
 $call106 = _BBRoom_clone($9) | 0; //@line 2248
 HEAPF32[$agg_tmp107 >> 2] = 0.0; //@line 2250
 HEAPF32[$agg_tmp107 + 4 >> 2] = -40.0; //@line 2252
 _AQList_push($38, _BBRoom_rotateTo(_BBRoom_moveTo($call106, $agg_tmp107) | 0, 1) | 0) | 0; //@line 2256
 $40 = HEAP32[$33 >> 2] | 0; //@line 2257
 $call112 = _BBRoom_clone($9) | 0; //@line 2258
 HEAPF32[$agg_tmp113 >> 2] = 40.0; //@line 2260
 HEAPF32[$agg_tmp113 + 4 >> 2] = -40.0; //@line 2262
 _AQList_push($40, _BBRoom_rotateTo(_BBRoom_moveTo($call112, $agg_tmp113) | 0, 3) | 0) | 0; //@line 2266
 $call118 = _aqcreate(1904) | 0; //@line 2267
 HEAPF32[$call118 + 12 >> 2] = 0.0; //@line 2271
 HEAPF32[$call118 + 16 >> 2] = 60.0; //@line 2274
 HEAPF32[$call118 + 20 >> 2] = -60.0; //@line 2277
 HEAPF32[$call118 + 24 >> 2] = 0.0; //@line 2280
 $sides122 = $call118 + 36 | 0; //@line 2281
 HEAP32[$sides122 >> 2] = HEAP32[452]; //@line 2282
 HEAP32[$sides122 + 4 >> 2] = HEAP32[453]; //@line 2282
 HEAP32[$sides122 + 8 >> 2] = HEAP32[454]; //@line 2282
 HEAP32[$sides122 + 12 >> 2] = HEAP32[455]; //@line 2282
 $43 = $call118 + 52 | 0; //@line 2284
 $44 = HEAP32[$43 >> 2] | 0; //@line 2285
 $call124 = _BBRoom_clone($9) | 0; //@line 2286
 HEAPF32[$agg_tmp125 >> 2] = 0.0; //@line 2288
 HEAPF32[$agg_tmp125 + 4 >> 2] = 0.0; //@line 2290
 _AQList_push($44, _BBRoom_rotateTo(_BBRoom_moveTo($call124, $agg_tmp125) | 0, 1) | 0) | 0; //@line 2294
 $46 = HEAP32[$43 >> 2] | 0; //@line 2295
 $call130 = _BBRoom_clone($9) | 0; //@line 2296
 HEAPF32[$agg_tmp131 >> 2] = 40.0; //@line 2298
 HEAPF32[$agg_tmp131 + 4 >> 2] = 0.0; //@line 2300
 _AQList_push($46, _BBRoom_rotateTo(_BBRoom_moveTo($call130, $agg_tmp131) | 0, 3) | 0) | 0; //@line 2304
 $48 = HEAP32[$43 >> 2] | 0; //@line 2305
 $call136 = _BBRoom_clone($12) | 0; //@line 2306
 HEAPF32[$agg_tmp137 >> 2] = 0.0; //@line 2308
 HEAPF32[$agg_tmp137 + 4 >> 2] = -20.0; //@line 2310
 _AQList_push($48, _BBRoom_rotateTo(_BBRoom_moveTo($call136, $agg_tmp137) | 0, 1) | 0) | 0; //@line 2314
 $50 = HEAP32[$43 >> 2] | 0; //@line 2315
 $call142 = _BBRoom_clone($9) | 0; //@line 2316
 HEAPF32[$agg_tmp143 >> 2] = 40.0; //@line 2318
 HEAPF32[$agg_tmp143 + 4 >> 2] = -20.0; //@line 2320
 _AQList_push($50, _BBRoom_rotateTo(_BBRoom_moveTo($call142, $agg_tmp143) | 0, 3) | 0) | 0; //@line 2324
 $52 = HEAP32[$43 >> 2] | 0; //@line 2325
 $call148 = _BBRoom_clone($9) | 0; //@line 2326
 HEAPF32[$agg_tmp149 >> 2] = 0.0; //@line 2328
 HEAPF32[$agg_tmp149 + 4 >> 2] = -40.0; //@line 2330
 _AQList_push($52, _BBRoom_rotateTo(_BBRoom_moveTo($call148, $agg_tmp149) | 0, 1) | 0) | 0; //@line 2334
 $54 = HEAP32[$43 >> 2] | 0; //@line 2335
 $call154 = _BBRoom_clone($12) | 0; //@line 2336
 HEAPF32[$agg_tmp155 >> 2] = 40.0; //@line 2338
 HEAPF32[$agg_tmp155 + 4 >> 2] = -40.0; //@line 2340
 _AQList_push($54, _BBRoom_rotateTo(_BBRoom_moveTo($call154, $agg_tmp155) | 0, 3) | 0) | 0; //@line 2344
 $call160 = _aqcreate(1904) | 0; //@line 2345
 $56 = $call160; //@line 2346
 HEAPF32[$call160 + 12 >> 2] = 0.0; //@line 2349
 HEAPF32[$call160 + 16 >> 2] = 60.0; //@line 2352
 HEAPF32[$call160 + 20 >> 2] = -60.0; //@line 2355
 HEAPF32[$call160 + 24 >> 2] = 0.0; //@line 2358
 $sides164 = $call160 + 36 | 0; //@line 2359
 HEAP32[$sides164 >> 2] = HEAP32[448]; //@line 2360
 HEAP32[$sides164 + 4 >> 2] = HEAP32[449]; //@line 2360
 HEAP32[$sides164 + 8 >> 2] = HEAP32[450]; //@line 2360
 HEAP32[$sides164 + 12 >> 2] = HEAP32[451]; //@line 2360
 $57 = $call160 + 52 | 0; //@line 2362
 $58 = HEAP32[$57 >> 2] | 0; //@line 2363
 $call166 = _BBRoom_clone($9) | 0; //@line 2364
 HEAPF32[$agg_tmp167 >> 2] = 0.0; //@line 2366
 HEAPF32[$agg_tmp167 + 4 >> 2] = 0.0; //@line 2368
 _AQList_push($58, _BBRoom_rotateTo(_BBRoom_moveTo($call166, $agg_tmp167) | 0, 1) | 0) | 0; //@line 2372
 $60 = HEAP32[$57 >> 2] | 0; //@line 2373
 $call172 = _BBRoom_clone($9) | 0; //@line 2374
 HEAPF32[$agg_tmp173 >> 2] = 40.0; //@line 2376
 HEAPF32[$agg_tmp173 + 4 >> 2] = 0.0; //@line 2378
 _AQList_push($60, _BBRoom_rotateTo(_BBRoom_moveTo($call172, $agg_tmp173) | 0, 3) | 0) | 0; //@line 2382
 $62 = HEAP32[$57 >> 2] | 0; //@line 2383
 $call178 = _BBRoom_clone($6) | 0; //@line 2384
 HEAPF32[$agg_tmp179 >> 2] = 10.0; //@line 2386
 HEAPF32[$agg_tmp179 + 4 >> 2] = -30.0; //@line 2388
 _AQList_push($62, _BBRoom_rotateTo(_BBRoom_moveTo($call178, $agg_tmp179) | 0, 0) | 0) | 0; //@line 2392
 $64 = HEAP32[$57 >> 2] | 0; //@line 2393
 $call184 = _BBRoom_clone($15) | 0; //@line 2394
 HEAPF32[$agg_tmp185 >> 2] = 0.0; //@line 2396
 HEAPF32[$agg_tmp185 + 4 >> 2] = -20.0; //@line 2398
 _AQList_push($64, _BBRoom_rotateTo(_BBRoom_moveTo($call184, $agg_tmp185) | 0, 0) | 0) | 0; //@line 2402
 $66 = HEAP32[$57 >> 2] | 0; //@line 2403
 $call190 = _BBRoom_clone($15) | 0; //@line 2404
 HEAPF32[$agg_tmp191 >> 2] = 40.0; //@line 2406
 HEAPF32[$agg_tmp191 + 4 >> 2] = -20.0; //@line 2408
 _AQList_push($66, _BBRoom_rotateTo(_BBRoom_moveTo($call190, $agg_tmp191) | 0, 0) | 0) | 0; //@line 2412
 $call196 = _aqcreate(1904) | 0; //@line 2413
 HEAPF32[$call196 + 12 >> 2] = 0.0; //@line 2417
 HEAPF32[$call196 + 16 >> 2] = 60.0; //@line 2420
 HEAPF32[$call196 + 20 >> 2] = -60.0; //@line 2423
 HEAPF32[$call196 + 24 >> 2] = 0.0; //@line 2426
 $sides200 = $call196 + 36 | 0; //@line 2427
 HEAP32[$sides200 >> 2] = HEAP32[444]; //@line 2428
 HEAP32[$sides200 + 4 >> 2] = HEAP32[445]; //@line 2428
 HEAP32[$sides200 + 8 >> 2] = HEAP32[446]; //@line 2428
 HEAP32[$sides200 + 12 >> 2] = HEAP32[447]; //@line 2428
 $69 = $call196 + 52 | 0; //@line 2430
 $70 = HEAP32[$69 >> 2] | 0; //@line 2431
 $call202 = _BBRoom_clone($9) | 0; //@line 2432
 HEAPF32[$agg_tmp203 >> 2] = 0.0; //@line 2434
 HEAPF32[$agg_tmp203 + 4 >> 2] = 0.0; //@line 2436
 _AQList_push($70, _BBRoom_rotateTo(_BBRoom_moveTo($call202, $agg_tmp203) | 0, 1) | 0) | 0; //@line 2440
 $72 = HEAP32[$69 >> 2] | 0; //@line 2441
 $call208 = _BBRoom_clone($9) | 0; //@line 2442
 HEAPF32[$agg_tmp209 >> 2] = 40.0; //@line 2444
 HEAPF32[$agg_tmp209 + 4 >> 2] = 0.0; //@line 2446
 _AQList_push($72, _BBRoom_rotateTo(_BBRoom_moveTo($call208, $agg_tmp209) | 0, 3) | 0) | 0; //@line 2450
 $74 = HEAP32[$69 >> 2] | 0; //@line 2451
 $call214 = _BBRoom_clone($12) | 0; //@line 2452
 HEAPF32[$agg_tmp215 >> 2] = 40.0; //@line 2454
 HEAPF32[$agg_tmp215 + 4 >> 2] = -20.0; //@line 2456
 _AQList_push($74, _BBRoom_rotateTo(_BBRoom_moveTo($call214, $agg_tmp215) | 0, 3) | 0) | 0; //@line 2460
 $76 = HEAP32[$69 >> 2] | 0; //@line 2461
 $call220 = _BBRoom_clone($9) | 0; //@line 2462
 HEAPF32[$agg_tmp221 >> 2] = 0.0; //@line 2464
 HEAPF32[$agg_tmp221 + 4 >> 2] = -40.0; //@line 2466
 _AQList_push($76, _BBRoom_rotateTo(_BBRoom_moveTo($call220, $agg_tmp221) | 0, 0) | 0) | 0; //@line 2470
 $78 = HEAP32[$69 >> 2] | 0; //@line 2471
 $call226 = _BBRoom_clone($12) | 0; //@line 2472
 HEAPF32[$agg_tmp227 >> 2] = 20.0; //@line 2474
 HEAPF32[$agg_tmp227 + 4 >> 2] = -40.0; //@line 2476
 _AQList_push($78, _BBRoom_rotateTo(_BBRoom_moveTo($call226, $agg_tmp227) | 0, 3) | 0) | 0; //@line 2480
 $80 = HEAP32[$69 >> 2] | 0; //@line 2481
 $call232 = _BBRoom_clone($12) | 0; //@line 2482
 HEAPF32[$agg_tmp233 >> 2] = 40.0; //@line 2484
 HEAPF32[$agg_tmp233 + 4 >> 2] = -40.0; //@line 2486
 _AQList_push($80, _BBRoom_rotateTo(_BBRoom_moveTo($call232, $agg_tmp233) | 0, 3) | 0) | 0; //@line 2490
 $call237 = _BBBlock_clone($56) | 0; //@line 2491
 HEAPF32[$agg_tmp238 >> 2] = -120.0; //@line 2493
 HEAPF32[$agg_tmp238 + 4 >> 2] = 120.0; //@line 2495
 $call240 = _BBBlock_rotateTo(_BBBlock_moveTo($call237, $agg_tmp238) | 0, 1) | 0; //@line 2497
 $aabb12_sroa_0_0_copyload_i708 = (copyTempFloat($call240 + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2499
 $aabb12_sroa_2_12_copyload_i710 = (copyTempFloat($call240 + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2501
 $mul_i713 = ((HEAP32[$citySize >> 2] | 0) / 2 | 0) * 60 | 0; //@line 2504
 $conv9_i721 = ~~+Math_floor(+(($aabb12_sroa_2_12_copyload_i710 + +($mul_i713 | 0)) / 60.0)); //@line 2512
 $conv14_i724 = ~~+Math_floor(+(($aabb12_sroa_0_0_copyload_i708 + +($mul_i713 - 60 | 0)) / 60.0)); //@line 2515
 _AQList_push(HEAP32[$blocks >> 2] | 0, $call240 | 0) | 0; //@line 2518
 $85 = HEAP32[$citySize >> 2] | 0; //@line 2519
 $add_i728 = (Math_imul($85, $conv14_i724) | 0) + $conv9_i721 | 0; //@line 2521
 $mul20_i729 = Math_imul($85, $85) | 0; //@line 2522
 _printf(896, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 16 | 0, HEAP32[tempVarArgs >> 2] = $add_i728, HEAP32[tempVarArgs + 8 >> 2] = $mul20_i729, tempVarArgs) | 0) | 0; //@line 2523
 STACKTOP = tempVarArgs; //@line 2523
 $add24_i732 = (Math_imul(HEAP32[$citySize >> 2] | 0, $conv14_i724) | 0) + $conv9_i721 | 0; //@line 2526
 HEAP32[(HEAP32[$blockMap >> 2] | 0) + ($add24_i732 << 2) >> 2] = $call240; //@line 2529
 $call241 = _BBBlock_clone($32) | 0; //@line 2530
 HEAPF32[$agg_tmp242 >> 2] = -60.0; //@line 2532
 HEAPF32[$agg_tmp242 + 4 >> 2] = 120.0; //@line 2534
 $call244 = _BBBlock_rotateTo(_BBBlock_moveTo($call241, $agg_tmp242) | 0, 3) | 0; //@line 2536
 $aabb12_sroa_0_0_copyload_i668 = (copyTempFloat($call244 + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2538
 $aabb12_sroa_2_12_copyload_i670 = (copyTempFloat($call244 + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2540
 $mul_i673 = ((HEAP32[$citySize >> 2] | 0) / 2 | 0) * 60 | 0; //@line 2543
 $conv9_i681 = ~~+Math_floor(+(($aabb12_sroa_2_12_copyload_i670 + +($mul_i673 | 0)) / 60.0)); //@line 2551
 $conv14_i684 = ~~+Math_floor(+(($aabb12_sroa_0_0_copyload_i668 + +($mul_i673 - 60 | 0)) / 60.0)); //@line 2554
 _AQList_push(HEAP32[$blocks >> 2] | 0, $call244 | 0) | 0; //@line 2557
 $91 = HEAP32[$citySize >> 2] | 0; //@line 2558
 $add_i688 = (Math_imul($91, $conv14_i684) | 0) + $conv9_i681 | 0; //@line 2560
 $mul20_i689 = Math_imul($91, $91) | 0; //@line 2561
 _printf(896, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 16 | 0, HEAP32[tempVarArgs >> 2] = $add_i688, HEAP32[tempVarArgs + 8 >> 2] = $mul20_i689, tempVarArgs) | 0) | 0; //@line 2562
 STACKTOP = tempVarArgs; //@line 2562
 $add24_i692 = (Math_imul(HEAP32[$citySize >> 2] | 0, $conv14_i684) | 0) + $conv9_i681 | 0; //@line 2565
 HEAP32[(HEAP32[$blockMap >> 2] | 0) + ($add24_i692 << 2) >> 2] = $call244; //@line 2568
 $call245 = _BBBlock_clone($call196) | 0; //@line 2569
 HEAPF32[$agg_tmp246 >> 2] = 0.0; //@line 2571
 HEAPF32[$agg_tmp246 + 4 >> 2] = 120.0; //@line 2573
 $call248 = _BBBlock_rotateTo(_BBBlock_moveTo($call245, $agg_tmp246) | 0, 3) | 0; //@line 2575
 $aabb12_sroa_0_0_copyload_i630 = (copyTempFloat($call248 + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2577
 $aabb12_sroa_2_12_copyload_i632 = (copyTempFloat($call248 + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2579
 $mul_i635 = ((HEAP32[$citySize >> 2] | 0) / 2 | 0) * 60 | 0; //@line 2582
 $conv9_i643 = ~~+Math_floor(+(($aabb12_sroa_2_12_copyload_i632 + +($mul_i635 | 0)) / 60.0)); //@line 2590
 $conv14_i646 = ~~+Math_floor(+(($aabb12_sroa_0_0_copyload_i630 + +($mul_i635 - 60 | 0)) / 60.0)); //@line 2593
 _AQList_push(HEAP32[$blocks >> 2] | 0, $call248 | 0) | 0; //@line 2596
 $97 = HEAP32[$citySize >> 2] | 0; //@line 2597
 $add_i650 = (Math_imul($97, $conv14_i646) | 0) + $conv9_i643 | 0; //@line 2599
 $mul20_i651 = Math_imul($97, $97) | 0; //@line 2600
 _printf(896, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 16 | 0, HEAP32[tempVarArgs >> 2] = $add_i650, HEAP32[tempVarArgs + 8 >> 2] = $mul20_i651, tempVarArgs) | 0) | 0; //@line 2601
 STACKTOP = tempVarArgs; //@line 2601
 $add24_i654 = (Math_imul(HEAP32[$citySize >> 2] | 0, $conv14_i646) | 0) + $conv9_i643 | 0; //@line 2604
 HEAP32[(HEAP32[$blockMap >> 2] | 0) + ($add24_i654 << 2) >> 2] = $call248; //@line 2607
 $call249 = _BBBlock_clone($20) | 0; //@line 2608
 HEAPF32[$agg_tmp250 >> 2] = -120.0; //@line 2610
 HEAPF32[$agg_tmp250 + 4 >> 2] = 60.0; //@line 2612
 $call252 = _BBBlock_rotateTo(_BBBlock_moveTo($call249, $agg_tmp250) | 0, 2) | 0; //@line 2614
 $aabb12_sroa_0_0_copyload_i590 = (copyTempFloat($call252 + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2616
 $aabb12_sroa_2_12_copyload_i592 = (copyTempFloat($call252 + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2618
 $mul_i595 = ((HEAP32[$citySize >> 2] | 0) / 2 | 0) * 60 | 0; //@line 2621
 $conv9_i603 = ~~+Math_floor(+(($aabb12_sroa_2_12_copyload_i592 + +($mul_i595 | 0)) / 60.0)); //@line 2629
 $conv14_i606 = ~~+Math_floor(+(($aabb12_sroa_0_0_copyload_i590 + +($mul_i595 - 60 | 0)) / 60.0)); //@line 2632
 _AQList_push(HEAP32[$blocks >> 2] | 0, $call252 | 0) | 0; //@line 2635
 $103 = HEAP32[$citySize >> 2] | 0; //@line 2636
 $add_i610 = (Math_imul($103, $conv14_i606) | 0) + $conv9_i603 | 0; //@line 2638
 $mul20_i611 = Math_imul($103, $103) | 0; //@line 2639
 _printf(896, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 16 | 0, HEAP32[tempVarArgs >> 2] = $add_i610, HEAP32[tempVarArgs + 8 >> 2] = $mul20_i611, tempVarArgs) | 0) | 0; //@line 2640
 STACKTOP = tempVarArgs; //@line 2640
 $add24_i614 = (Math_imul(HEAP32[$citySize >> 2] | 0, $conv14_i606) | 0) + $conv9_i603 | 0; //@line 2643
 HEAP32[(HEAP32[$blockMap >> 2] | 0) + ($add24_i614 << 2) >> 2] = $call252; //@line 2646
 $call253 = _BBBlock_clone($26) | 0; //@line 2647
 HEAPF32[$agg_tmp254 >> 2] = -60.0; //@line 2649
 HEAPF32[$agg_tmp254 + 4 >> 2] = 60.0; //@line 2651
 $call256 = _BBBlock_rotateTo(_BBBlock_moveTo($call253, $agg_tmp254) | 0, 2) | 0; //@line 2653
 $aabb12_sroa_0_0_copyload_i552 = (copyTempFloat($call256 + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2655
 $aabb12_sroa_2_12_copyload_i554 = (copyTempFloat($call256 + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2657
 $mul_i557 = ((HEAP32[$citySize >> 2] | 0) / 2 | 0) * 60 | 0; //@line 2660
 $conv9_i565 = ~~+Math_floor(+(($aabb12_sroa_2_12_copyload_i554 + +($mul_i557 | 0)) / 60.0)); //@line 2668
 $conv14_i568 = ~~+Math_floor(+(($aabb12_sroa_0_0_copyload_i552 + +($mul_i557 - 60 | 0)) / 60.0)); //@line 2671
 _AQList_push(HEAP32[$blocks >> 2] | 0, $call256 | 0) | 0; //@line 2674
 $109 = HEAP32[$citySize >> 2] | 0; //@line 2675
 $add_i572 = (Math_imul($109, $conv14_i568) | 0) + $conv9_i565 | 0; //@line 2677
 $mul20_i573 = Math_imul($109, $109) | 0; //@line 2678
 _printf(896, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 16 | 0, HEAP32[tempVarArgs >> 2] = $add_i572, HEAP32[tempVarArgs + 8 >> 2] = $mul20_i573, tempVarArgs) | 0) | 0; //@line 2679
 STACKTOP = tempVarArgs; //@line 2679
 $add24_i576 = (Math_imul(HEAP32[$citySize >> 2] | 0, $conv14_i568) | 0) + $conv9_i565 | 0; //@line 2682
 HEAP32[(HEAP32[$blockMap >> 2] | 0) + ($add24_i576 << 2) >> 2] = $call256; //@line 2685
 $call257 = _BBBlock_clone($26) | 0; //@line 2686
 HEAPF32[$agg_tmp258 >> 2] = 0.0; //@line 2688
 HEAPF32[$agg_tmp258 + 4 >> 2] = 60.0; //@line 2690
 $call260 = _BBBlock_rotateTo(_BBBlock_moveTo($call257, $agg_tmp258) | 0, 2) | 0; //@line 2692
 $aabb12_sroa_0_0_copyload_i512 = (copyTempFloat($call260 + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2694
 $aabb12_sroa_2_12_copyload_i514 = (copyTempFloat($call260 + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2696
 $mul_i517 = ((HEAP32[$citySize >> 2] | 0) / 2 | 0) * 60 | 0; //@line 2699
 $conv9_i525 = ~~+Math_floor(+(($aabb12_sroa_2_12_copyload_i514 + +($mul_i517 | 0)) / 60.0)); //@line 2707
 $conv14_i528 = ~~+Math_floor(+(($aabb12_sroa_0_0_copyload_i512 + +($mul_i517 - 60 | 0)) / 60.0)); //@line 2710
 _AQList_push(HEAP32[$blocks >> 2] | 0, $call260 | 0) | 0; //@line 2713
 $115 = HEAP32[$citySize >> 2] | 0; //@line 2714
 $add_i532 = (Math_imul($115, $conv14_i528) | 0) + $conv9_i525 | 0; //@line 2716
 $mul20_i533 = Math_imul($115, $115) | 0; //@line 2717
 _printf(896, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 16 | 0, HEAP32[tempVarArgs >> 2] = $add_i532, HEAP32[tempVarArgs + 8 >> 2] = $mul20_i533, tempVarArgs) | 0) | 0; //@line 2718
 STACKTOP = tempVarArgs; //@line 2718
 $add24_i536 = (Math_imul(HEAP32[$citySize >> 2] | 0, $conv14_i528) | 0) + $conv9_i525 | 0; //@line 2721
 HEAP32[(HEAP32[$blockMap >> 2] | 0) + ($add24_i536 << 2) >> 2] = $call260; //@line 2724
 $call261 = _BBBlock_clone($20) | 0; //@line 2725
 HEAPF32[$agg_tmp262 >> 2] = 60.0; //@line 2727
 HEAPF32[$agg_tmp262 + 4 >> 2] = 60.0; //@line 2729
 $call264 = _BBBlock_rotateTo(_BBBlock_moveTo($call261, $agg_tmp262) | 0, 2) | 0; //@line 2731
 $aabb12_sroa_0_0_copyload_i472 = (copyTempFloat($call264 + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2733
 $aabb12_sroa_2_12_copyload_i474 = (copyTempFloat($call264 + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2735
 $mul_i477 = ((HEAP32[$citySize >> 2] | 0) / 2 | 0) * 60 | 0; //@line 2738
 $conv9_i485 = ~~+Math_floor(+(($aabb12_sroa_2_12_copyload_i474 + +($mul_i477 | 0)) / 60.0)); //@line 2746
 $conv14_i488 = ~~+Math_floor(+(($aabb12_sroa_0_0_copyload_i472 + +($mul_i477 - 60 | 0)) / 60.0)); //@line 2749
 _AQList_push(HEAP32[$blocks >> 2] | 0, $call264 | 0) | 0; //@line 2752
 $121 = HEAP32[$citySize >> 2] | 0; //@line 2753
 $add_i492 = (Math_imul($121, $conv14_i488) | 0) + $conv9_i485 | 0; //@line 2755
 $mul20_i493 = Math_imul($121, $121) | 0; //@line 2756
 _printf(896, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 16 | 0, HEAP32[tempVarArgs >> 2] = $add_i492, HEAP32[tempVarArgs + 8 >> 2] = $mul20_i493, tempVarArgs) | 0) | 0; //@line 2757
 STACKTOP = tempVarArgs; //@line 2757
 $add24_i496 = (Math_imul(HEAP32[$citySize >> 2] | 0, $conv14_i488) | 0) + $conv9_i485 | 0; //@line 2760
 HEAP32[(HEAP32[$blockMap >> 2] | 0) + ($add24_i496 << 2) >> 2] = $call264; //@line 2763
 $call265 = _BBBlock_clone($20) | 0; //@line 2764
 HEAPF32[$agg_tmp266 >> 2] = -120.0; //@line 2766
 HEAPF32[$agg_tmp266 + 4 >> 2] = 0.0; //@line 2768
 $call268 = _BBBlock_rotateTo(_BBBlock_moveTo($call265, $agg_tmp266) | 0, 0) | 0; //@line 2770
 $aabb12_sroa_0_0_copyload_i426 = (copyTempFloat($call268 + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2772
 $aabb12_sroa_2_12_copyload_i428 = (copyTempFloat($call268 + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2774
 $mul_i431 = ((HEAP32[$citySize >> 2] | 0) / 2 | 0) * 60 | 0; //@line 2777
 $conv9_i439 = ~~+Math_floor(+(($aabb12_sroa_2_12_copyload_i428 + +($mul_i431 | 0)) / 60.0)); //@line 2785
 $conv14_i442 = ~~+Math_floor(+(($aabb12_sroa_0_0_copyload_i426 + +($mul_i431 - 60 | 0)) / 60.0)); //@line 2788
 _AQList_push(HEAP32[$blocks >> 2] | 0, $call268 | 0) | 0; //@line 2791
 $127 = HEAP32[$citySize >> 2] | 0; //@line 2792
 $add_i446 = (Math_imul($127, $conv14_i442) | 0) + $conv9_i439 | 0; //@line 2794
 $mul20_i447 = Math_imul($127, $127) | 0; //@line 2795
 _printf(896, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 16 | 0, HEAP32[tempVarArgs >> 2] = $add_i446, HEAP32[tempVarArgs + 8 >> 2] = $mul20_i447, tempVarArgs) | 0) | 0; //@line 2796
 STACKTOP = tempVarArgs; //@line 2796
 $add24_i450 = (Math_imul(HEAP32[$citySize >> 2] | 0, $conv14_i442) | 0) + $conv9_i439 | 0; //@line 2799
 HEAP32[(HEAP32[$blockMap >> 2] | 0) + ($add24_i450 << 2) >> 2] = $call268; //@line 2802
 $call269 = _BBBlock_clone($26) | 0; //@line 2803
 HEAPF32[$agg_tmp270 >> 2] = -60.0; //@line 2805
 HEAPF32[$agg_tmp270 + 4 >> 2] = 0.0; //@line 2807
 $call271 = _BBBlock_moveTo($call269, $agg_tmp270) | 0; //@line 2808
 $aabb12_sroa_0_0_copyload_i380 = (copyTempFloat($call271 + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2810
 $aabb12_sroa_2_12_copyload_i382 = (copyTempFloat($call271 + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2812
 $mul_i385 = ((HEAP32[$citySize >> 2] | 0) / 2 | 0) * 60 | 0; //@line 2815
 $conv9_i393 = ~~+Math_floor(+(($aabb12_sroa_2_12_copyload_i382 + +($mul_i385 | 0)) / 60.0)); //@line 2823
 $conv14_i396 = ~~+Math_floor(+(($aabb12_sroa_0_0_copyload_i380 + +($mul_i385 - 60 | 0)) / 60.0)); //@line 2826
 _AQList_push(HEAP32[$blocks >> 2] | 0, $call271 | 0) | 0; //@line 2829
 $133 = HEAP32[$citySize >> 2] | 0; //@line 2830
 $add_i400 = (Math_imul($133, $conv14_i396) | 0) + $conv9_i393 | 0; //@line 2832
 $mul20_i401 = Math_imul($133, $133) | 0; //@line 2833
 _printf(896, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 16 | 0, HEAP32[tempVarArgs >> 2] = $add_i400, HEAP32[tempVarArgs + 8 >> 2] = $mul20_i401, tempVarArgs) | 0) | 0; //@line 2834
 STACKTOP = tempVarArgs; //@line 2834
 $add24_i404 = (Math_imul(HEAP32[$citySize >> 2] | 0, $conv14_i396) | 0) + $conv9_i393 | 0; //@line 2837
 HEAP32[(HEAP32[$blockMap >> 2] | 0) + ($add24_i404 << 2) >> 2] = $call271; //@line 2840
 $call273 = _BBBlock_rotateTo(_BBBlock_clone($20) | 0, 0) | 0; //@line 2842
 $aabb12_sroa_0_0_copyload_i336 = (copyTempFloat($call273 + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2844
 $aabb12_sroa_2_12_copyload_i338 = (copyTempFloat($call273 + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2846
 $mul_i341 = ((HEAP32[$citySize >> 2] | 0) / 2 | 0) * 60 | 0; //@line 2849
 $conv9_i349 = ~~+Math_floor(+(($aabb12_sroa_2_12_copyload_i338 + +($mul_i341 | 0)) / 60.0)); //@line 2857
 $conv14_i352 = ~~+Math_floor(+(($aabb12_sroa_0_0_copyload_i336 + +($mul_i341 - 60 | 0)) / 60.0)); //@line 2860
 _AQList_push(HEAP32[$blocks >> 2] | 0, $call273 | 0) | 0; //@line 2863
 $139 = HEAP32[$citySize >> 2] | 0; //@line 2864
 $add_i356 = (Math_imul($139, $conv14_i352) | 0) + $conv9_i349 | 0; //@line 2866
 $mul20_i357 = Math_imul($139, $139) | 0; //@line 2867
 _printf(896, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 16 | 0, HEAP32[tempVarArgs >> 2] = $add_i356, HEAP32[tempVarArgs + 8 >> 2] = $mul20_i357, tempVarArgs) | 0) | 0; //@line 2868
 STACKTOP = tempVarArgs; //@line 2868
 $add24_i360 = (Math_imul(HEAP32[$citySize >> 2] | 0, $conv14_i352) | 0) + $conv9_i349 | 0; //@line 2871
 HEAP32[(HEAP32[$blockMap >> 2] | 0) + ($add24_i360 << 2) >> 2] = $call273; //@line 2874
 $call274 = _BBBlock_clone($26) | 0; //@line 2875
 HEAPF32[$agg_tmp275 >> 2] = 60.0; //@line 2877
 HEAPF32[$agg_tmp275 + 4 >> 2] = 0.0; //@line 2879
 $call276 = _BBBlock_moveTo($call274, $agg_tmp275) | 0; //@line 2880
 $aabb12_sroa_0_0_copyload_i290 = (copyTempFloat($call276 + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2882
 $aabb12_sroa_2_12_copyload_i292 = (copyTempFloat($call276 + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2884
 $mul_i295 = ((HEAP32[$citySize >> 2] | 0) / 2 | 0) * 60 | 0; //@line 2887
 $conv9_i303 = ~~+Math_floor(+(($aabb12_sroa_2_12_copyload_i292 + +($mul_i295 | 0)) / 60.0)); //@line 2895
 $conv14_i306 = ~~+Math_floor(+(($aabb12_sroa_0_0_copyload_i290 + +($mul_i295 - 60 | 0)) / 60.0)); //@line 2898
 _AQList_push(HEAP32[$blocks >> 2] | 0, $call276 | 0) | 0; //@line 2901
 $145 = HEAP32[$citySize >> 2] | 0; //@line 2902
 $add_i310 = (Math_imul($145, $conv14_i306) | 0) + $conv9_i303 | 0; //@line 2904
 $mul20_i311 = Math_imul($145, $145) | 0; //@line 2905
 _printf(896, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 16 | 0, HEAP32[tempVarArgs >> 2] = $add_i310, HEAP32[tempVarArgs + 8 >> 2] = $mul20_i311, tempVarArgs) | 0) | 0; //@line 2906
 STACKTOP = tempVarArgs; //@line 2906
 $add24_i314 = (Math_imul(HEAP32[$citySize >> 2] | 0, $conv14_i306) | 0) + $conv9_i303 | 0; //@line 2909
 HEAP32[(HEAP32[$blockMap >> 2] | 0) + ($add24_i314 << 2) >> 2] = $call276; //@line 2912
 $call277 = _BBBlock_clone($56) | 0; //@line 2913
 HEAPF32[$agg_tmp278 >> 2] = -120.0; //@line 2915
 HEAPF32[$agg_tmp278 + 4 >> 2] = -60.0; //@line 2917
 $call280 = _BBBlock_rotateTo(_BBBlock_moveTo($call277, $agg_tmp278) | 0, 1) | 0; //@line 2919
 $aabb12_sroa_0_0_copyload_i244 = (copyTempFloat($call280 + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2921
 $aabb12_sroa_2_12_copyload_i246 = (copyTempFloat($call280 + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2923
 $mul_i249 = ((HEAP32[$citySize >> 2] | 0) / 2 | 0) * 60 | 0; //@line 2926
 $conv9_i257 = ~~+Math_floor(+(($aabb12_sroa_2_12_copyload_i246 + +($mul_i249 | 0)) / 60.0)); //@line 2934
 $conv14_i260 = ~~+Math_floor(+(($aabb12_sroa_0_0_copyload_i244 + +($mul_i249 - 60 | 0)) / 60.0)); //@line 2937
 _AQList_push(HEAP32[$blocks >> 2] | 0, $call280 | 0) | 0; //@line 2940
 $151 = HEAP32[$citySize >> 2] | 0; //@line 2941
 $add_i264 = (Math_imul($151, $conv14_i260) | 0) + $conv9_i257 | 0; //@line 2943
 $mul20_i265 = Math_imul($151, $151) | 0; //@line 2944
 _printf(896, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 16 | 0, HEAP32[tempVarArgs >> 2] = $add_i264, HEAP32[tempVarArgs + 8 >> 2] = $mul20_i265, tempVarArgs) | 0) | 0; //@line 2945
 STACKTOP = tempVarArgs; //@line 2945
 $add24_i268 = (Math_imul(HEAP32[$citySize >> 2] | 0, $conv14_i260) | 0) + $conv9_i257 | 0; //@line 2948
 HEAP32[(HEAP32[$blockMap >> 2] | 0) + ($add24_i268 << 2) >> 2] = $call280; //@line 2951
 $call281 = _BBBlock_clone($32) | 0; //@line 2952
 HEAPF32[$agg_tmp282 >> 2] = -60.0; //@line 2954
 HEAPF32[$agg_tmp282 + 4 >> 2] = -60.0; //@line 2956
 $call283 = _BBBlock_moveTo($call281, $agg_tmp282) | 0; //@line 2957
 $aabb12_sroa_0_0_copyload_i198 = (copyTempFloat($call283 + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2959
 $aabb12_sroa_2_12_copyload_i200 = (copyTempFloat($call283 + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2961
 $mul_i203 = ((HEAP32[$citySize >> 2] | 0) / 2 | 0) * 60 | 0; //@line 2964
 $conv9_i211 = ~~+Math_floor(+(($aabb12_sroa_2_12_copyload_i200 + +($mul_i203 | 0)) / 60.0)); //@line 2972
 $conv14_i214 = ~~+Math_floor(+(($aabb12_sroa_0_0_copyload_i198 + +($mul_i203 - 60 | 0)) / 60.0)); //@line 2975
 _AQList_push(HEAP32[$blocks >> 2] | 0, $call283 | 0) | 0; //@line 2978
 $157 = HEAP32[$citySize >> 2] | 0; //@line 2979
 $add_i218 = (Math_imul($157, $conv14_i214) | 0) + $conv9_i211 | 0; //@line 2981
 $mul20_i219 = Math_imul($157, $157) | 0; //@line 2982
 _printf(896, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 16 | 0, HEAP32[tempVarArgs >> 2] = $add_i218, HEAP32[tempVarArgs + 8 >> 2] = $mul20_i219, tempVarArgs) | 0) | 0; //@line 2983
 STACKTOP = tempVarArgs; //@line 2983
 $add24_i222 = (Math_imul(HEAP32[$citySize >> 2] | 0, $conv14_i214) | 0) + $conv9_i211 | 0; //@line 2986
 HEAP32[(HEAP32[$blockMap >> 2] | 0) + ($add24_i222 << 2) >> 2] = $call283; //@line 2989
 $call284 = _BBBlock_clone($call118) | 0; //@line 2990
 HEAPF32[$agg_tmp285 >> 2] = 0.0; //@line 2992
 HEAPF32[$agg_tmp285 + 4 >> 2] = -60.0; //@line 2994
 $call287 = _BBBlock_rotateTo(_BBBlock_moveTo($call284, $agg_tmp285) | 0, 3) | 0; //@line 2996
 $aabb12_sroa_0_0_copyload_i152 = (copyTempFloat($call287 + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 2998
 $aabb12_sroa_2_12_copyload_i154 = (copyTempFloat($call287 + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 3000
 $mul_i157 = ((HEAP32[$citySize >> 2] | 0) / 2 | 0) * 60 | 0; //@line 3003
 $conv9_i165 = ~~+Math_floor(+(($aabb12_sroa_2_12_copyload_i154 + +($mul_i157 | 0)) / 60.0)); //@line 3011
 $conv14_i168 = ~~+Math_floor(+(($aabb12_sroa_0_0_copyload_i152 + +($mul_i157 - 60 | 0)) / 60.0)); //@line 3014
 _AQList_push(HEAP32[$blocks >> 2] | 0, $call287 | 0) | 0; //@line 3017
 $163 = HEAP32[$citySize >> 2] | 0; //@line 3018
 $add_i172 = (Math_imul($163, $conv14_i168) | 0) + $conv9_i165 | 0; //@line 3020
 $mul20_i173 = Math_imul($163, $163) | 0; //@line 3021
 _printf(896, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 16 | 0, HEAP32[tempVarArgs >> 2] = $add_i172, HEAP32[tempVarArgs + 8 >> 2] = $mul20_i173, tempVarArgs) | 0) | 0; //@line 3022
 STACKTOP = tempVarArgs; //@line 3022
 $add24_i176 = (Math_imul(HEAP32[$citySize >> 2] | 0, $conv14_i168) | 0) + $conv9_i165 | 0; //@line 3025
 HEAP32[(HEAP32[$blockMap >> 2] | 0) + ($add24_i176 << 2) >> 2] = $call287; //@line 3028
 $call288 = _BBBlock_clone($32) | 0; //@line 3029
 HEAPF32[$agg_tmp289 >> 2] = 60.0; //@line 3031
 HEAPF32[$agg_tmp289 + 4 >> 2] = -60.0; //@line 3033
 $call290 = _BBBlock_moveTo($call288, $agg_tmp289) | 0; //@line 3034
 $aabb12_sroa_0_0_copyload_i = (copyTempFloat($call290 + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 3036
 $aabb12_sroa_2_12_copyload_i = (copyTempFloat($call290 + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 3038
 $mul_i = ((HEAP32[$citySize >> 2] | 0) / 2 | 0) * 60 | 0; //@line 3041
 $conv9_i = ~~+Math_floor(+(($aabb12_sroa_2_12_copyload_i + +($mul_i | 0)) / 60.0)); //@line 3049
 $conv14_i = ~~+Math_floor(+(($aabb12_sroa_0_0_copyload_i + +($mul_i - 60 | 0)) / 60.0)); //@line 3052
 _AQList_push(HEAP32[$blocks >> 2] | 0, $call290 | 0) | 0; //@line 3055
 $169 = HEAP32[$citySize >> 2] | 0; //@line 3056
 $add_i = (Math_imul($169, $conv14_i) | 0) + $conv9_i | 0; //@line 3058
 $mul20_i = Math_imul($169, $169) | 0; //@line 3059
 _printf(896, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 16 | 0, HEAP32[tempVarArgs >> 2] = $add_i, HEAP32[tempVarArgs + 8 >> 2] = $mul20_i, tempVarArgs) | 0) | 0; //@line 3060
 STACKTOP = tempVarArgs; //@line 3060
 $add24_i = (Math_imul(HEAP32[$citySize >> 2] | 0, $conv14_i) | 0) + $conv9_i | 0; //@line 3063
 HEAP32[(HEAP32[$blockMap >> 2] | 0) + ($add24_i << 2) >> 2] = $call290; //@line 3066
 STACKTOP = sp; //@line 3067
 return $self | 0; //@line 3067
}
function _free($mem) {
 $mem = $mem | 0;
 var $add_ptr = 0, $0 = 0, $1 = 0, $3 = 0, $and = 0, $and5 = 0, $add_ptr6 = 0, $4 = 0, $5 = 0, $add_ptr_sum231 = 0, $add_ptr16 = 0, $6 = 0, $add17 = 0, $shr = 0, $9 = 0, $11 = 0, $12 = 0, $fd56 = 0, $fd67_pre_phi = 0, $18 = 0, $20 = 0, $22 = 0, $24 = 0, $bk82 = 0, $fd86 = 0, $28 = 0, $29 = 0, $arrayidx103 = 0, $30 = 0, $RP_0 = 0, $R_0 = 0, $arrayidx108 = 0, $31 = 0, $arrayidx113 = 0, $32 = 0, $R_1 = 0, $34 = 0, $arrayidx130 = 0, $arrayidx149 = 0, $44 = 0, $48 = 0, $51 = 0, $psize_0 = 0, $p_0 = 0, $55 = 0, $56 = 0, $57 = 0, $add243 = 0, $add254 = 0, $add262 = 0, $shr263 = 0, $64 = 0, $66 = 0, $67 = 0, $fd306 = 0, $fd317_pre_phi = 0, $75 = 0, $77 = 0, $79 = 0, $81 = 0, $bk338 = 0, $fd342 = 0, $86 = 0, $87 = 0, $arrayidx362 = 0, $88 = 0, $RP355_0 = 0, $R327_0 = 0, $arrayidx369 = 0, $89 = 0, $arrayidx374 = 0, $90 = 0, $R327_1 = 0, $93 = 0, $arrayidx395 = 0, $arrayidx414 = 0, $103 = 0, $107 = 0, $psize_1 = 0, $shr493 = 0, $shl500 = 0, $111 = 0, $112 = 0, $shl503 = 0, $113 = 0, $114 = 0, $_pre_phi = 0, $F502_0 = 0, $117 = 0, $shr527 = 0, $and537 = 0, $shl538 = 0, $and541 = 0, $shl543 = 0, $and546 = 0, $add551 = 0, $I526_0 = 0, $arrayidx559 = 0, $119 = 0, $shl565 = 0, $cond = 0, $T_0 = 0, $K575_0 = 0, $arrayidx591 = 0, $122 = 0, $fd609 = 0, $125 = 0, $127 = 0, $dec = 0, $sp_0_in_i = 0, $sp_0_i = 0, label = 0;
 if (($mem | 0) == 0) {
  return;
 }
 $add_ptr = $mem - 8 | 0; //@line 15521
 $0 = $add_ptr; //@line 15522
 $1 = HEAP32[836] | 0; //@line 15523
 if ($add_ptr >>> 0 < $1 >>> 0) {
  _abort(); //@line 15526
 }
 $3 = HEAP32[$mem - 4 >> 2] | 0; //@line 15531
 $and = $3 & 3; //@line 15532
 if (($and | 0) == 1) {
  _abort(); //@line 15535
 }
 $and5 = $3 & -8; //@line 15538
 $add_ptr6 = $mem + ($and5 - 8) | 0; //@line 15540
 $4 = $add_ptr6; //@line 15541
 L2013 : do {
  if (($3 & 1 | 0) == 0) {
   $5 = HEAP32[$add_ptr >> 2] | 0; //@line 15547
   if (($and | 0) == 0) {
    return;
   }
   $add_ptr_sum231 = -8 - $5 | 0; //@line 15552
   $add_ptr16 = $mem + $add_ptr_sum231 | 0; //@line 15553
   $6 = $add_ptr16; //@line 15554
   $add17 = $5 + $and5 | 0; //@line 15555
   if ($add_ptr16 >>> 0 < $1 >>> 0) {
    _abort(); //@line 15558
   }
   if (($6 | 0) == (HEAP32[837] | 0)) {
    $51 = $mem + ($and5 - 4) | 0; //@line 15566
    if ((HEAP32[$51 >> 2] & 3 | 0) != 3) {
     $p_0 = $6; //@line 15571
     $psize_0 = $add17; //@line 15571
     break;
    }
    HEAP32[834] = $add17; //@line 15574
    HEAP32[$51 >> 2] = HEAP32[$51 >> 2] & -2; //@line 15577
    HEAP32[$mem + ($add_ptr_sum231 + 4) >> 2] = $add17 | 1; //@line 15582
    HEAP32[$add_ptr6 >> 2] = $add17; //@line 15584
    return;
   }
   $shr = $5 >>> 3; //@line 15587
   if ($5 >>> 0 < 256) {
    $9 = HEAP32[$mem + ($add_ptr_sum231 + 8) >> 2] | 0; //@line 15593
    $11 = HEAP32[$mem + ($add_ptr_sum231 + 12) >> 2] | 0; //@line 15597
    $12 = 3368 + ($shr << 1 << 2) | 0; //@line 15600
    do {
     if (($9 | 0) != ($12 | 0)) {
      if ($9 >>> 0 < $1 >>> 0) {
       _abort(); //@line 15607
      }
      if ((HEAP32[$9 + 12 >> 2] | 0) == ($6 | 0)) {
       break;
      }
      _abort(); //@line 15616
     }
    } while (0);
    if (($11 | 0) == ($9 | 0)) {
     HEAP32[832] = HEAP32[832] & ~(1 << $shr); //@line 15626
     $p_0 = $6; //@line 15627
     $psize_0 = $add17; //@line 15627
     break;
    }
    do {
     if (($11 | 0) == ($12 | 0)) {
      $fd67_pre_phi = $11 + 8 | 0; //@line 15634
     } else {
      if ($11 >>> 0 < $1 >>> 0) {
       _abort(); //@line 15639
      }
      $fd56 = $11 + 8 | 0; //@line 15642
      if ((HEAP32[$fd56 >> 2] | 0) == ($6 | 0)) {
       $fd67_pre_phi = $fd56; //@line 15646
       break;
      }
      _abort(); //@line 15649
     }
    } while (0);
    HEAP32[$9 + 12 >> 2] = $11; //@line 15655
    HEAP32[$fd67_pre_phi >> 2] = $9; //@line 15656
    $p_0 = $6; //@line 15657
    $psize_0 = $add17; //@line 15657
    break;
   }
   $18 = $add_ptr16; //@line 15660
   $20 = HEAP32[$mem + ($add_ptr_sum231 + 24) >> 2] | 0; //@line 15664
   $22 = HEAP32[$mem + ($add_ptr_sum231 + 12) >> 2] | 0; //@line 15668
   do {
    if (($22 | 0) == ($18 | 0)) {
     $28 = $mem + ($add_ptr_sum231 + 20) | 0; //@line 15674
     $29 = HEAP32[$28 >> 2] | 0; //@line 15675
     if (($29 | 0) == 0) {
      $arrayidx103 = $mem + ($add_ptr_sum231 + 16) | 0; //@line 15680
      $30 = HEAP32[$arrayidx103 >> 2] | 0; //@line 15681
      if (($30 | 0) == 0) {
       $R_1 = 0; //@line 15684
       break;
      } else {
       $R_0 = $30; //@line 15687
       $RP_0 = $arrayidx103; //@line 15687
      }
     } else {
      $R_0 = $29; //@line 15690
      $RP_0 = $28; //@line 15690
     }
     while (1) {
      $arrayidx108 = $R_0 + 20 | 0; //@line 15695
      $31 = HEAP32[$arrayidx108 >> 2] | 0; //@line 15696
      if (($31 | 0) != 0) {
       $R_0 = $31; //@line 15699
       $RP_0 = $arrayidx108; //@line 15699
       continue;
      }
      $arrayidx113 = $R_0 + 16 | 0; //@line 15702
      $32 = HEAP32[$arrayidx113 >> 2] | 0; //@line 15703
      if (($32 | 0) == 0) {
       break;
      } else {
       $R_0 = $32; //@line 15708
       $RP_0 = $arrayidx113; //@line 15708
      }
     }
     if ($RP_0 >>> 0 < $1 >>> 0) {
      _abort(); //@line 15714
     } else {
      HEAP32[$RP_0 >> 2] = 0; //@line 15717
      $R_1 = $R_0; //@line 15718
      break;
     }
    } else {
     $24 = HEAP32[$mem + ($add_ptr_sum231 + 8) >> 2] | 0; //@line 15725
     if ($24 >>> 0 < $1 >>> 0) {
      _abort(); //@line 15729
     }
     $bk82 = $24 + 12 | 0; //@line 15732
     if ((HEAP32[$bk82 >> 2] | 0) != ($18 | 0)) {
      _abort(); //@line 15736
     }
     $fd86 = $22 + 8 | 0; //@line 15739
     if ((HEAP32[$fd86 >> 2] | 0) == ($18 | 0)) {
      HEAP32[$bk82 >> 2] = $22; //@line 15743
      HEAP32[$fd86 >> 2] = $24; //@line 15744
      $R_1 = $22; //@line 15745
      break;
     } else {
      _abort(); //@line 15748
     }
    }
   } while (0);
   if (($20 | 0) == 0) {
    $p_0 = $6; //@line 15756
    $psize_0 = $add17; //@line 15756
    break;
   }
   $34 = $mem + ($add_ptr_sum231 + 28) | 0; //@line 15761
   $arrayidx130 = 3632 + (HEAP32[$34 >> 2] << 2) | 0; //@line 15763
   do {
    if (($18 | 0) == (HEAP32[$arrayidx130 >> 2] | 0)) {
     HEAP32[$arrayidx130 >> 2] = $R_1; //@line 15768
     if (($R_1 | 0) != 0) {
      break;
     }
     HEAP32[833] = HEAP32[833] & ~(1 << HEAP32[$34 >> 2]); //@line 15778
     $p_0 = $6; //@line 15779
     $psize_0 = $add17; //@line 15779
     break L2013;
    } else {
     if ($20 >>> 0 < (HEAP32[836] | 0) >>> 0) {
      _abort(); //@line 15786
     }
     $arrayidx149 = $20 + 16 | 0; //@line 15789
     if ((HEAP32[$arrayidx149 >> 2] | 0) == ($18 | 0)) {
      HEAP32[$arrayidx149 >> 2] = $R_1; //@line 15793
     } else {
      HEAP32[$20 + 20 >> 2] = $R_1; //@line 15796
     }
     if (($R_1 | 0) == 0) {
      $p_0 = $6; //@line 15800
      $psize_0 = $add17; //@line 15800
      break L2013;
     }
    }
   } while (0);
   if ($R_1 >>> 0 < (HEAP32[836] | 0) >>> 0) {
    _abort(); //@line 15809
   }
   HEAP32[$R_1 + 24 >> 2] = $20; //@line 15813
   $44 = HEAP32[$mem + ($add_ptr_sum231 + 16) >> 2] | 0; //@line 15817
   do {
    if (($44 | 0) != 0) {
     if ($44 >>> 0 < (HEAP32[836] | 0) >>> 0) {
      _abort(); //@line 15825
     } else {
      HEAP32[$R_1 + 16 >> 2] = $44; //@line 15829
      HEAP32[$44 + 24 >> 2] = $R_1; //@line 15831
      break;
     }
    }
   } while (0);
   $48 = HEAP32[$mem + ($add_ptr_sum231 + 20) >> 2] | 0; //@line 15839
   if (($48 | 0) == 0) {
    $p_0 = $6; //@line 15842
    $psize_0 = $add17; //@line 15842
    break;
   }
   if ($48 >>> 0 < (HEAP32[836] | 0) >>> 0) {
    _abort(); //@line 15849
   } else {
    HEAP32[$R_1 + 20 >> 2] = $48; //@line 15853
    HEAP32[$48 + 24 >> 2] = $R_1; //@line 15855
    $p_0 = $6; //@line 15856
    $psize_0 = $add17; //@line 15856
    break;
   }
  } else {
   $p_0 = $0; //@line 15860
   $psize_0 = $and5; //@line 15860
  }
 } while (0);
 $55 = $p_0; //@line 15865
 if ($55 >>> 0 >= $add_ptr6 >>> 0) {
  _abort(); //@line 15868
 }
 $56 = $mem + ($and5 - 4) | 0; //@line 15873
 $57 = HEAP32[$56 >> 2] | 0; //@line 15874
 if (($57 & 1 | 0) == 0) {
  _abort(); //@line 15878
 }
 do {
  if (($57 & 2 | 0) == 0) {
   if (($4 | 0) == (HEAP32[838] | 0)) {
    $add243 = (HEAP32[835] | 0) + $psize_0 | 0; //@line 15889
    HEAP32[835] = $add243; //@line 15890
    HEAP32[838] = $p_0; //@line 15891
    HEAP32[$p_0 + 4 >> 2] = $add243 | 1; //@line 15894
    if (($p_0 | 0) != (HEAP32[837] | 0)) {
     return;
    }
    HEAP32[837] = 0; //@line 15900
    HEAP32[834] = 0; //@line 15901
    return;
   }
   if (($4 | 0) == (HEAP32[837] | 0)) {
    $add254 = (HEAP32[834] | 0) + $psize_0 | 0; //@line 15908
    HEAP32[834] = $add254; //@line 15909
    HEAP32[837] = $p_0; //@line 15910
    HEAP32[$p_0 + 4 >> 2] = $add254 | 1; //@line 15913
    HEAP32[$55 + $add254 >> 2] = $add254; //@line 15916
    return;
   }
   $add262 = ($57 & -8) + $psize_0 | 0; //@line 15920
   $shr263 = $57 >>> 3; //@line 15921
   L2116 : do {
    if ($57 >>> 0 < 256) {
     $64 = HEAP32[$mem + $and5 >> 2] | 0; //@line 15927
     $66 = HEAP32[$mem + ($and5 | 4) >> 2] | 0; //@line 15931
     $67 = 3368 + ($shr263 << 1 << 2) | 0; //@line 15934
     do {
      if (($64 | 0) != ($67 | 0)) {
       if ($64 >>> 0 < (HEAP32[836] | 0) >>> 0) {
        _abort(); //@line 15942
       }
       if ((HEAP32[$64 + 12 >> 2] | 0) == ($4 | 0)) {
        break;
       }
       _abort(); //@line 15951
      }
     } while (0);
     if (($66 | 0) == ($64 | 0)) {
      HEAP32[832] = HEAP32[832] & ~(1 << $shr263); //@line 15961
      break;
     }
     do {
      if (($66 | 0) == ($67 | 0)) {
       $fd317_pre_phi = $66 + 8 | 0; //@line 15968
      } else {
       if ($66 >>> 0 < (HEAP32[836] | 0) >>> 0) {
        _abort(); //@line 15974
       }
       $fd306 = $66 + 8 | 0; //@line 15977
       if ((HEAP32[$fd306 >> 2] | 0) == ($4 | 0)) {
        $fd317_pre_phi = $fd306; //@line 15981
        break;
       }
       _abort(); //@line 15984
      }
     } while (0);
     HEAP32[$64 + 12 >> 2] = $66; //@line 15990
     HEAP32[$fd317_pre_phi >> 2] = $64; //@line 15991
    } else {
     $75 = $add_ptr6; //@line 15993
     $77 = HEAP32[$mem + ($and5 + 16) >> 2] | 0; //@line 15997
     $79 = HEAP32[$mem + ($and5 | 4) >> 2] | 0; //@line 16001
     do {
      if (($79 | 0) == ($75 | 0)) {
       $86 = $mem + ($and5 + 12) | 0; //@line 16007
       $87 = HEAP32[$86 >> 2] | 0; //@line 16008
       if (($87 | 0) == 0) {
        $arrayidx362 = $mem + ($and5 + 8) | 0; //@line 16013
        $88 = HEAP32[$arrayidx362 >> 2] | 0; //@line 16014
        if (($88 | 0) == 0) {
         $R327_1 = 0; //@line 16017
         break;
        } else {
         $R327_0 = $88; //@line 16020
         $RP355_0 = $arrayidx362; //@line 16020
        }
       } else {
        $R327_0 = $87; //@line 16023
        $RP355_0 = $86; //@line 16023
       }
       while (1) {
        $arrayidx369 = $R327_0 + 20 | 0; //@line 16028
        $89 = HEAP32[$arrayidx369 >> 2] | 0; //@line 16029
        if (($89 | 0) != 0) {
         $R327_0 = $89; //@line 16032
         $RP355_0 = $arrayidx369; //@line 16032
         continue;
        }
        $arrayidx374 = $R327_0 + 16 | 0; //@line 16035
        $90 = HEAP32[$arrayidx374 >> 2] | 0; //@line 16036
        if (($90 | 0) == 0) {
         break;
        } else {
         $R327_0 = $90; //@line 16041
         $RP355_0 = $arrayidx374; //@line 16041
        }
       }
       if ($RP355_0 >>> 0 < (HEAP32[836] | 0) >>> 0) {
        _abort(); //@line 16048
       } else {
        HEAP32[$RP355_0 >> 2] = 0; //@line 16051
        $R327_1 = $R327_0; //@line 16052
        break;
       }
      } else {
       $81 = HEAP32[$mem + $and5 >> 2] | 0; //@line 16058
       if ($81 >>> 0 < (HEAP32[836] | 0) >>> 0) {
        _abort(); //@line 16063
       }
       $bk338 = $81 + 12 | 0; //@line 16066
       if ((HEAP32[$bk338 >> 2] | 0) != ($75 | 0)) {
        _abort(); //@line 16070
       }
       $fd342 = $79 + 8 | 0; //@line 16073
       if ((HEAP32[$fd342 >> 2] | 0) == ($75 | 0)) {
        HEAP32[$bk338 >> 2] = $79; //@line 16077
        HEAP32[$fd342 >> 2] = $81; //@line 16078
        $R327_1 = $79; //@line 16079
        break;
       } else {
        _abort(); //@line 16082
       }
      }
     } while (0);
     if (($77 | 0) == 0) {
      break;
     }
     $93 = $mem + ($and5 + 20) | 0; //@line 16094
     $arrayidx395 = 3632 + (HEAP32[$93 >> 2] << 2) | 0; //@line 16096
     do {
      if (($75 | 0) == (HEAP32[$arrayidx395 >> 2] | 0)) {
       HEAP32[$arrayidx395 >> 2] = $R327_1; //@line 16101
       if (($R327_1 | 0) != 0) {
        break;
       }
       HEAP32[833] = HEAP32[833] & ~(1 << HEAP32[$93 >> 2]); //@line 16111
       break L2116;
      } else {
       if ($77 >>> 0 < (HEAP32[836] | 0) >>> 0) {
        _abort(); //@line 16118
       }
       $arrayidx414 = $77 + 16 | 0; //@line 16121
       if ((HEAP32[$arrayidx414 >> 2] | 0) == ($75 | 0)) {
        HEAP32[$arrayidx414 >> 2] = $R327_1; //@line 16125
       } else {
        HEAP32[$77 + 20 >> 2] = $R327_1; //@line 16128
       }
       if (($R327_1 | 0) == 0) {
        break L2116;
       }
      }
     } while (0);
     if ($R327_1 >>> 0 < (HEAP32[836] | 0) >>> 0) {
      _abort(); //@line 16140
     }
     HEAP32[$R327_1 + 24 >> 2] = $77; //@line 16144
     $103 = HEAP32[$mem + ($and5 + 8) >> 2] | 0; //@line 16148
     do {
      if (($103 | 0) != 0) {
       if ($103 >>> 0 < (HEAP32[836] | 0) >>> 0) {
        _abort(); //@line 16156
       } else {
        HEAP32[$R327_1 + 16 >> 2] = $103; //@line 16160
        HEAP32[$103 + 24 >> 2] = $R327_1; //@line 16162
        break;
       }
      }
     } while (0);
     $107 = HEAP32[$mem + ($and5 + 12) >> 2] | 0; //@line 16170
     if (($107 | 0) == 0) {
      break;
     }
     if ($107 >>> 0 < (HEAP32[836] | 0) >>> 0) {
      _abort(); //@line 16179
     } else {
      HEAP32[$R327_1 + 20 >> 2] = $107; //@line 16183
      HEAP32[$107 + 24 >> 2] = $R327_1; //@line 16185
      break;
     }
    }
   } while (0);
   HEAP32[$p_0 + 4 >> 2] = $add262 | 1; //@line 16192
   HEAP32[$55 + $add262 >> 2] = $add262; //@line 16195
   if (($p_0 | 0) != (HEAP32[837] | 0)) {
    $psize_1 = $add262; //@line 16199
    break;
   }
   HEAP32[834] = $add262; //@line 16202
   return;
  } else {
   HEAP32[$56 >> 2] = $57 & -2; //@line 16206
   HEAP32[$p_0 + 4 >> 2] = $psize_0 | 1; //@line 16209
   HEAP32[$55 + $psize_0 >> 2] = $psize_0; //@line 16212
   $psize_1 = $psize_0; //@line 16213
  }
 } while (0);
 $shr493 = $psize_1 >>> 3; //@line 16217
 if ($psize_1 >>> 0 < 256) {
  $shl500 = $shr493 << 1; //@line 16220
  $111 = 3368 + ($shl500 << 2) | 0; //@line 16222
  $112 = HEAP32[832] | 0; //@line 16223
  $shl503 = 1 << $shr493; //@line 16224
  do {
   if (($112 & $shl503 | 0) == 0) {
    HEAP32[832] = $112 | $shl503; //@line 16230
    $F502_0 = $111; //@line 16233
    $_pre_phi = 3368 + ($shl500 + 2 << 2) | 0; //@line 16233
   } else {
    $113 = 3368 + ($shl500 + 2 << 2) | 0; //@line 16236
    $114 = HEAP32[$113 >> 2] | 0; //@line 16237
    if ($114 >>> 0 >= (HEAP32[836] | 0) >>> 0) {
     $F502_0 = $114; //@line 16242
     $_pre_phi = $113; //@line 16242
     break;
    }
    _abort(); //@line 16245
   }
  } while (0);
  HEAP32[$_pre_phi >> 2] = $p_0; //@line 16251
  HEAP32[$F502_0 + 12 >> 2] = $p_0; //@line 16253
  HEAP32[$p_0 + 8 >> 2] = $F502_0; //@line 16255
  HEAP32[$p_0 + 12 >> 2] = $111; //@line 16257
  return;
 }
 $117 = $p_0; //@line 16260
 $shr527 = $psize_1 >>> 8; //@line 16261
 do {
  if (($shr527 | 0) == 0) {
   $I526_0 = 0; //@line 16265
  } else {
   if ($psize_1 >>> 0 > 16777215) {
    $I526_0 = 31; //@line 16269
    break;
   }
   $and537 = ($shr527 + 1048320 | 0) >>> 16 & 8; //@line 16274
   $shl538 = $shr527 << $and537; //@line 16275
   $and541 = ($shl538 + 520192 | 0) >>> 16 & 4; //@line 16278
   $shl543 = $shl538 << $and541; //@line 16280
   $and546 = ($shl543 + 245760 | 0) >>> 16 & 2; //@line 16283
   $add551 = 14 - ($and541 | $and537 | $and546) + ($shl543 << $and546 >>> 15) | 0; //@line 16288
   $I526_0 = $psize_1 >>> (($add551 + 7 | 0) >>> 0) & 1 | $add551 << 1; //@line 16294
  }
 } while (0);
 $arrayidx559 = 3632 + ($I526_0 << 2) | 0; //@line 16298
 HEAP32[$p_0 + 28 >> 2] = $I526_0; //@line 16301
 HEAP32[$p_0 + 20 >> 2] = 0; //@line 16303
 HEAP32[$p_0 + 16 >> 2] = 0; //@line 16305
 $119 = HEAP32[833] | 0; //@line 16306
 $shl565 = 1 << $I526_0; //@line 16307
 do {
  if (($119 & $shl565 | 0) == 0) {
   HEAP32[833] = $119 | $shl565; //@line 16313
   HEAP32[$arrayidx559 >> 2] = $117; //@line 16314
   HEAP32[$p_0 + 24 >> 2] = $arrayidx559; //@line 16317
   HEAP32[$p_0 + 12 >> 2] = $p_0; //@line 16319
   HEAP32[$p_0 + 8 >> 2] = $p_0; //@line 16321
  } else {
   if (($I526_0 | 0) == 31) {
    $cond = 0; //@line 16326
   } else {
    $cond = 25 - ($I526_0 >>> 1) | 0; //@line 16330
   }
   $K575_0 = $psize_1 << $cond; //@line 16334
   $T_0 = HEAP32[$arrayidx559 >> 2] | 0; //@line 16334
   while (1) {
    if ((HEAP32[$T_0 + 4 >> 2] & -8 | 0) == ($psize_1 | 0)) {
     break;
    }
    $arrayidx591 = $T_0 + 16 + ($K575_0 >>> 31 << 2) | 0; //@line 16346
    $122 = HEAP32[$arrayidx591 >> 2] | 0; //@line 16347
    if (($122 | 0) == 0) {
     label = 1730; //@line 16351
     break;
    } else {
     $K575_0 = $K575_0 << 1; //@line 16354
     $T_0 = $122; //@line 16354
    }
   }
   if ((label | 0) == 1730) {
    if ($arrayidx591 >>> 0 < (HEAP32[836] | 0) >>> 0) {
     _abort(); //@line 16362
    } else {
     HEAP32[$arrayidx591 >> 2] = $117; //@line 16365
     HEAP32[$p_0 + 24 >> 2] = $T_0; //@line 16368
     HEAP32[$p_0 + 12 >> 2] = $p_0; //@line 16370
     HEAP32[$p_0 + 8 >> 2] = $p_0; //@line 16372
     break;
    }
   }
   $fd609 = $T_0 + 8 | 0; //@line 16376
   $125 = HEAP32[$fd609 >> 2] | 0; //@line 16377
   $127 = HEAP32[836] | 0; //@line 16379
   if ($T_0 >>> 0 < $127 >>> 0) {
    _abort(); //@line 16382
   }
   if ($125 >>> 0 < $127 >>> 0) {
    _abort(); //@line 16388
   } else {
    HEAP32[$125 + 12 >> 2] = $117; //@line 16392
    HEAP32[$fd609 >> 2] = $117; //@line 16393
    HEAP32[$p_0 + 8 >> 2] = $125; //@line 16396
    HEAP32[$p_0 + 12 >> 2] = $T_0; //@line 16399
    HEAP32[$p_0 + 24 >> 2] = 0; //@line 16401
    break;
   }
  }
 } while (0);
 $dec = (HEAP32[840] | 0) - 1 | 0; //@line 16407
 HEAP32[840] = $dec; //@line 16408
 if (($dec | 0) == 0) {
  $sp_0_in_i = 3784; //@line 16411
 } else {
  return;
 }
 while (1) {
  $sp_0_i = HEAP32[$sp_0_in_i >> 2] | 0; //@line 16417
  if (($sp_0_i | 0) == 0) {
   break;
  } else {
   $sp_0_in_i = $sp_0_i + 8 | 0; //@line 16423
  }
 }
 HEAP32[840] = -1; //@line 16426
 return;
}
function __AQDdvt_updateParticleChild($self, $particle, $lastAabb, $aabb) {
 $self = $self | 0;
 $particle = $particle | 0;
 $lastAabb = $lastAabb | 0;
 $aabb = $aabb | 0;
 var $0 = 0, $1 = 0.0, $right_i = 0, $9 = 0, $right_i70 = 0, $cmp8_i82 = 0, $tobool = 0, $length_i91 = 0, $20 = 0, $21 = 0, $removed_0 = 0, $added_0 = 0, $updated_0 = 0, $22 = 0, $23 = 0.0, $31 = 0, $cmp8_i131 = 0, $tobool21 = 0, $length_i155 = 0, $42 = 0, $43 = 0, $removed_1 = 0, $added_1 = 0, $updated_1 = 0, $44 = 0, $45 = 0.0, $53 = 0, $cmp8_i195 = 0, $tobool42 = 0, $length_i219 = 0, $64 = 0, $65 = 0, $removed_2 = 0, $added_2 = 0, $updated_2 = 0, $66 = 0, $67 = 0.0, $75 = 0, $cmp8_i148 = 0, $tobool63 = 0, $length_i = 0, $86 = 0, $87 = 0, $removed_3 = 0, $added_3 = 0, $tobool81 = 0, $tobool83 = 0, $length = 0, $length90 = 0, label = 0;
 $0 = HEAP32[$self + 32 >> 2] | 0; //@line 6663
 $1 = +HEAPF32[$0 + 24 >> 2]; //@line 6665
 $right_i = $aabb + 4 | 0; //@line 6666
 do {
  if ($1 < +HEAPF32[$right_i >> 2]) {
   if (+HEAPF32[$0 + 16 >> 2] <= +HEAPF32[$aabb + 12 >> 2]) {
    $9 = 0; //@line 6679
    break;
   }
   if (+HEAPF32[$0 + 20 >> 2] >= +HEAPF32[$aabb >> 2]) {
    $9 = 0; //@line 6689
    break;
   }
   $9 = +HEAPF32[$0 + 12 >> 2] > +HEAPF32[$aabb + 8 >> 2] | 0; //@line 6698
  } else {
   $9 = 0; //@line 6700
  }
 } while (0);
 $right_i70 = $lastAabb + 4 | 0; //@line 6704
 do {
  if ($1 < +HEAPF32[$right_i70 >> 2]) {
   if (+HEAPF32[$0 + 16 >> 2] <= +HEAPF32[$lastAabb + 12 >> 2]) {
    label = 482; //@line 6717
    break;
   }
   if (+HEAPF32[$0 + 20 >> 2] >= +HEAPF32[$lastAabb >> 2]) {
    label = 482; //@line 6727
    break;
   }
   $cmp8_i82 = +HEAPF32[$0 + 12 >> 2] > +HEAPF32[$lastAabb + 8 >> 2]; //@line 6734
   $tobool = ($9 | 0) != 0; //@line 6735
   if ($tobool & $cmp8_i82) {
    __AQDdvt_updateParticle($0, $particle, $lastAabb, $aabb); //@line 6739
    $updated_0 = 1; //@line 6741
    $added_0 = 0; //@line 6741
    $removed_0 = 0; //@line 6741
    break;
   }
   if ($tobool) {
    label = 486; //@line 6746
    break;
   }
   if (!$cmp8_i82) {
    $updated_0 = 0; //@line 6751
    $added_0 = 0; //@line 6751
    $removed_0 = 0; //@line 6751
    break;
   }
   __AQDdvt_removeParticle($0, $particle, $lastAabb); //@line 6754
   $updated_0 = 0; //@line 6756
   $added_0 = 0; //@line 6756
   $removed_0 = 1; //@line 6756
  } else {
   label = 482; //@line 6758
  }
 } while (0);
 if ((label | 0) == 482) {
  if (($9 | 0) == 0) {
   $updated_0 = 0; //@line 6765
   $added_0 = 0; //@line 6765
   $removed_0 = 0; //@line 6765
  } else {
   label = 486; //@line 6767
  }
 }
 L584 : do {
  if ((label | 0) == 486) {
   HEAP32[$0 + 28 >> 2] = 0; //@line 6773
   do {
    if ((HEAP32[$0 + 32 >> 2] | 0) == 0) {
     $length_i91 = $0 + 240 | 0; //@line 6780
     if ((HEAP32[$length_i91 >> 2] | 0) < 48) {
      $20 = _aqretain($particle) | 0; //@line 6787
      $21 = HEAP32[$length_i91 >> 2] | 0; //@line 6788
      HEAP32[$length_i91 >> 2] = $21 + 1; //@line 6790
      HEAP32[$0 + 48 + ($21 << 2) >> 2] = $20; //@line 6792
      $updated_0 = 0; //@line 6794
      $added_0 = 1; //@line 6794
      $removed_0 = 0; //@line 6794
      break L584;
     } else {
      __AQDdvt_toChildren($0); //@line 6797
      break;
     }
    }
   } while (0);
   __AQDdvt_addParticleChild($0, $particle, $aabb); //@line 6803
   $updated_0 = 0; //@line 6804
   $added_0 = 1; //@line 6804
   $removed_0 = 0; //@line 6804
  }
 } while (0);
 $22 = HEAP32[$self + 36 >> 2] | 0; //@line 6811
 $23 = +HEAPF32[$22 + 24 >> 2]; //@line 6813
 do {
  if ($23 < +HEAPF32[$right_i >> 2]) {
   if (+HEAPF32[$22 + 16 >> 2] <= +HEAPF32[$aabb + 12 >> 2]) {
    $31 = 0; //@line 6826
    break;
   }
   if (+HEAPF32[$22 + 20 >> 2] >= +HEAPF32[$aabb >> 2]) {
    $31 = 0; //@line 6836
    break;
   }
   $31 = +HEAPF32[$22 + 12 >> 2] > +HEAPF32[$aabb + 8 >> 2] | 0; //@line 6845
  } else {
   $31 = 0; //@line 6847
  }
 } while (0);
 do {
  if ($23 < +HEAPF32[$right_i70 >> 2]) {
   if (+HEAPF32[$22 + 16 >> 2] <= +HEAPF32[$lastAabb + 12 >> 2]) {
    label = 500; //@line 6863
    break;
   }
   if (+HEAPF32[$22 + 20 >> 2] >= +HEAPF32[$lastAabb >> 2]) {
    label = 500; //@line 6873
    break;
   }
   $cmp8_i131 = +HEAPF32[$22 + 12 >> 2] > +HEAPF32[$lastAabb + 8 >> 2]; //@line 6880
   $tobool21 = ($31 | 0) != 0; //@line 6881
   if ($tobool21 & $cmp8_i131) {
    __AQDdvt_updateParticle($22, $particle, $lastAabb, $aabb); //@line 6885
    $updated_1 = 1; //@line 6887
    $added_1 = $added_0; //@line 6887
    $removed_1 = $removed_0; //@line 6887
    break;
   }
   if ($tobool21) {
    label = 504; //@line 6892
    break;
   }
   if (!$cmp8_i131) {
    $updated_1 = $updated_0; //@line 6897
    $added_1 = $added_0; //@line 6897
    $removed_1 = $removed_0; //@line 6897
    break;
   }
   __AQDdvt_removeParticle($22, $particle, $lastAabb); //@line 6900
   $updated_1 = $updated_0; //@line 6902
   $added_1 = $added_0; //@line 6902
   $removed_1 = 1; //@line 6902
  } else {
   label = 500; //@line 6904
  }
 } while (0);
 if ((label | 0) == 500) {
  if (($31 | 0) == 0) {
   $updated_1 = $updated_0; //@line 6911
   $added_1 = $added_0; //@line 6911
   $removed_1 = $removed_0; //@line 6911
  } else {
   label = 504; //@line 6913
  }
 }
 L609 : do {
  if ((label | 0) == 504) {
   HEAP32[$22 + 28 >> 2] = 0; //@line 6919
   do {
    if ((HEAP32[$22 + 32 >> 2] | 0) == 0) {
     $length_i155 = $22 + 240 | 0; //@line 6926
     if ((HEAP32[$length_i155 >> 2] | 0) < 48) {
      $42 = _aqretain($particle) | 0; //@line 6933
      $43 = HEAP32[$length_i155 >> 2] | 0; //@line 6934
      HEAP32[$length_i155 >> 2] = $43 + 1; //@line 6936
      HEAP32[$22 + 48 + ($43 << 2) >> 2] = $42; //@line 6938
      $updated_1 = $updated_0; //@line 6940
      $added_1 = 1; //@line 6940
      $removed_1 = $removed_0; //@line 6940
      break L609;
     } else {
      __AQDdvt_toChildren($22); //@line 6943
      break;
     }
    }
   } while (0);
   __AQDdvt_addParticleChild($22, $particle, $aabb); //@line 6949
   $updated_1 = $updated_0; //@line 6950
   $added_1 = 1; //@line 6950
   $removed_1 = $removed_0; //@line 6950
  }
 } while (0);
 $44 = HEAP32[$self + 40 >> 2] | 0; //@line 6957
 $45 = +HEAPF32[$44 + 24 >> 2]; //@line 6959
 do {
  if ($45 < +HEAPF32[$right_i >> 2]) {
   if (+HEAPF32[$44 + 16 >> 2] <= +HEAPF32[$aabb + 12 >> 2]) {
    $53 = 0; //@line 6972
    break;
   }
   if (+HEAPF32[$44 + 20 >> 2] >= +HEAPF32[$aabb >> 2]) {
    $53 = 0; //@line 6982
    break;
   }
   $53 = +HEAPF32[$44 + 12 >> 2] > +HEAPF32[$aabb + 8 >> 2] | 0; //@line 6991
  } else {
   $53 = 0; //@line 6993
  }
 } while (0);
 do {
  if ($45 < +HEAPF32[$right_i70 >> 2]) {
   if (+HEAPF32[$44 + 16 >> 2] <= +HEAPF32[$lastAabb + 12 >> 2]) {
    label = 518; //@line 7009
    break;
   }
   if (+HEAPF32[$44 + 20 >> 2] >= +HEAPF32[$lastAabb >> 2]) {
    label = 518; //@line 7019
    break;
   }
   $cmp8_i195 = +HEAPF32[$44 + 12 >> 2] > +HEAPF32[$lastAabb + 8 >> 2]; //@line 7026
   $tobool42 = ($53 | 0) != 0; //@line 7027
   if ($tobool42 & $cmp8_i195) {
    __AQDdvt_updateParticle($44, $particle, $lastAabb, $aabb); //@line 7031
    $updated_2 = 1; //@line 7033
    $added_2 = $added_1; //@line 7033
    $removed_2 = $removed_1; //@line 7033
    break;
   }
   if ($tobool42) {
    label = 522; //@line 7038
    break;
   }
   if (!$cmp8_i195) {
    $updated_2 = $updated_1; //@line 7043
    $added_2 = $added_1; //@line 7043
    $removed_2 = $removed_1; //@line 7043
    break;
   }
   __AQDdvt_removeParticle($44, $particle, $lastAabb); //@line 7046
   $updated_2 = $updated_1; //@line 7048
   $added_2 = $added_1; //@line 7048
   $removed_2 = 1; //@line 7048
  } else {
   label = 518; //@line 7050
  }
 } while (0);
 if ((label | 0) == 518) {
  if (($53 | 0) == 0) {
   $updated_2 = $updated_1; //@line 7057
   $added_2 = $added_1; //@line 7057
   $removed_2 = $removed_1; //@line 7057
  } else {
   label = 522; //@line 7059
  }
 }
 L634 : do {
  if ((label | 0) == 522) {
   HEAP32[$44 + 28 >> 2] = 0; //@line 7065
   do {
    if ((HEAP32[$44 + 32 >> 2] | 0) == 0) {
     $length_i219 = $44 + 240 | 0; //@line 7072
     if ((HEAP32[$length_i219 >> 2] | 0) < 48) {
      $64 = _aqretain($particle) | 0; //@line 7079
      $65 = HEAP32[$length_i219 >> 2] | 0; //@line 7080
      HEAP32[$length_i219 >> 2] = $65 + 1; //@line 7082
      HEAP32[$44 + 48 + ($65 << 2) >> 2] = $64; //@line 7084
      $updated_2 = $updated_1; //@line 7086
      $added_2 = 1; //@line 7086
      $removed_2 = $removed_1; //@line 7086
      break L634;
     } else {
      __AQDdvt_toChildren($44); //@line 7089
      break;
     }
    }
   } while (0);
   __AQDdvt_addParticleChild($44, $particle, $aabb); //@line 7095
   $updated_2 = $updated_1; //@line 7096
   $added_2 = 1; //@line 7096
   $removed_2 = $removed_1; //@line 7096
  }
 } while (0);
 $66 = HEAP32[$self + 44 >> 2] | 0; //@line 7103
 $67 = +HEAPF32[$66 + 24 >> 2]; //@line 7105
 do {
  if ($67 < +HEAPF32[$right_i >> 2]) {
   if (+HEAPF32[$66 + 16 >> 2] <= +HEAPF32[$aabb + 12 >> 2]) {
    $75 = 0; //@line 7118
    break;
   }
   if (+HEAPF32[$66 + 20 >> 2] >= +HEAPF32[$aabb >> 2]) {
    $75 = 0; //@line 7128
    break;
   }
   $75 = +HEAPF32[$66 + 12 >> 2] > +HEAPF32[$aabb + 8 >> 2] | 0; //@line 7137
  } else {
   $75 = 0; //@line 7139
  }
 } while (0);
 do {
  if ($67 < +HEAPF32[$right_i70 >> 2]) {
   if (+HEAPF32[$66 + 16 >> 2] <= +HEAPF32[$lastAabb + 12 >> 2]) {
    label = 536; //@line 7155
    break;
   }
   if (+HEAPF32[$66 + 20 >> 2] >= +HEAPF32[$lastAabb >> 2]) {
    label = 536; //@line 7165
    break;
   }
   $cmp8_i148 = +HEAPF32[$66 + 12 >> 2] > +HEAPF32[$lastAabb + 8 >> 2]; //@line 7172
   $tobool63 = ($75 | 0) != 0; //@line 7173
   if ($tobool63 & $cmp8_i148) {
    __AQDdvt_updateParticle($66, $particle, $lastAabb, $aabb); //@line 7177
    return;
   }
   if ($tobool63) {
    label = 540; //@line 7183
    break;
   }
   if (!$cmp8_i148) {
    $added_3 = $added_2; //@line 7188
    $removed_3 = $removed_2; //@line 7188
    break;
   }
   __AQDdvt_removeParticle($66, $particle, $lastAabb); //@line 7191
   $added_3 = $added_2; //@line 7193
   $removed_3 = 1; //@line 7193
  } else {
   label = 536; //@line 7195
  }
 } while (0);
 if ((label | 0) == 536) {
  if (($75 | 0) == 0) {
   $added_3 = $added_2; //@line 7202
   $removed_3 = $removed_2; //@line 7202
  } else {
   label = 540; //@line 7204
  }
 }
 L660 : do {
  if ((label | 0) == 540) {
   HEAP32[$66 + 28 >> 2] = 0; //@line 7210
   do {
    if ((HEAP32[$66 + 32 >> 2] | 0) == 0) {
     $length_i = $66 + 240 | 0; //@line 7217
     if ((HEAP32[$length_i >> 2] | 0) < 48) {
      $86 = _aqretain($particle) | 0; //@line 7224
      $87 = HEAP32[$length_i >> 2] | 0; //@line 7225
      HEAP32[$length_i >> 2] = $87 + 1; //@line 7227
      HEAP32[$66 + 48 + ($87 << 2) >> 2] = $86; //@line 7229
      $added_3 = 1; //@line 7231
      $removed_3 = $removed_2; //@line 7231
      break L660;
     } else {
      __AQDdvt_toChildren($66); //@line 7234
      break;
     }
    }
   } while (0);
   __AQDdvt_addParticleChild($66, $particle, $aabb); //@line 7240
   $added_3 = 1; //@line 7241
   $removed_3 = $removed_2; //@line 7241
  }
 } while (0);
 if (($updated_2 | 0) != 0) {
  return;
 }
 $tobool81 = ($added_3 | 0) != 0; //@line 7251
 $tobool83 = ($removed_3 | 0) == 0; //@line 7252
 if ($tobool81 & $tobool83) {
  $length = $self + 240 | 0; //@line 7256
  HEAP32[$length >> 2] = (HEAP32[$length >> 2] | 0) + 1; //@line 7259
 }
 if ($tobool83 | $tobool81) {
  return;
 }
 $length90 = $self + 240 | 0; //@line 7267
 HEAP32[$length90 >> 2] = (HEAP32[$length90 >> 2] | 0) - 1; //@line 7270
 return;
}
function __AQDdvt_toChildren($self) {
 $self = $self | 0;
 var $aabb15 = 0, $aabb59_sroa_0_0_tmp60_idx = 0, $aabb59_sroa_0_0_copyload = 0.0, $aabb59_sroa_1_4_tmp60_idx212 = 0, $aabb59_sroa_1_4_copyload = 0.0, $aabb59_sroa_2_8_tmp60_idx213 = 0, $aabb59_sroa_2_8_copyload = 0.0, $aabb59_sroa_3_12_tmp60_idx214 = 0, $aabb59_sroa_3_12_copyload = 0.0, $call_i = 0, $tl = 0, $aabb64_sroa_0_0_copyload = 0.0, $aabb64_sroa_1_4_copyload = 0.0, $aabb64_sroa_2_8_copyload = 0.0, $aabb64_sroa_3_12_copyload = 0.0, $mul_i_i_i71 = 0.0, $add_i3_i = 0.0, $add3_i_i = 0.0, $call_i80 = 0, $tr = 0, $aabb82_sroa_0_0_copyload = 0.0, $aabb82_sroa_1_4_copyload = 0.0, $aabb82_sroa_2_8_copyload = 0.0, $aabb82_sroa_3_12_copyload = 0.0, $mul1_i_i_i96 = 0.0, $sub3_i_i = 0.0, $call_i106 = 0, $bl = 0, $aabb108_sroa_0_0_copyload = 0.0, $aabb108_sroa_1_4_copyload = 0.0, $aabb108_sroa_2_8_copyload = 0.0, $aabb108_sroa_3_12_copyload = 0.0, $mul_i_i_i118 = 0.0, $mul1_i_i_i119 = 0.0, $add_i3_i120 = 0.0, $add3_i_i121 = 0.0, $call_i131 = 0, $br = 0, $4 = 0, $right_i134 = 0, $left2_i137 = 0, $top_i141 = 0, $bottom7_i145 = 0, $index_0236 = 0, $5 = 0, $6 = 0, $length_i = 0, $18 = 0, $19 = 0, $20 = 0, $length_i155 = 0, $32 = 0, $33 = 0, $34 = 0, $length_i171 = 0, $46 = 0, $47 = 0, $48 = 0, $length_i187 = 0, $60 = 0, $61 = 0, sp = 0;
 sp = STACKTOP; //@line 7349
 STACKTOP = STACKTOP + 16 | 0; //@line 7349
 $aabb15 = sp | 0; //@line 7350
 $aabb59_sroa_0_0_tmp60_idx = $self + 12 | 0; //@line 7351
 $aabb59_sroa_0_0_copyload = (copyTempFloat($aabb59_sroa_0_0_tmp60_idx | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 7352
 $aabb59_sroa_1_4_tmp60_idx212 = $self + 16 | 0; //@line 7353
 $aabb59_sroa_1_4_copyload = (copyTempFloat($aabb59_sroa_1_4_tmp60_idx212 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 7354
 $aabb59_sroa_2_8_tmp60_idx213 = $self + 20 | 0; //@line 7355
 $aabb59_sroa_2_8_copyload = (copyTempFloat($aabb59_sroa_2_8_tmp60_idx213 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 7356
 $aabb59_sroa_3_12_tmp60_idx214 = $self + 24 | 0; //@line 7357
 $aabb59_sroa_3_12_copyload = (copyTempFloat($aabb59_sroa_3_12_tmp60_idx214 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 7358
 $call_i = _aqcreate(2424) | 0; //@line 7365
 HEAPF32[$call_i + 12 >> 2] = $aabb59_sroa_0_0_copyload; //@line 7368
 HEAPF32[$call_i + 16 >> 2] = $aabb59_sroa_3_12_copyload + ($aabb59_sroa_1_4_copyload - $aabb59_sroa_3_12_copyload) * .5; //@line 7371
 HEAPF32[$call_i + 20 >> 2] = $aabb59_sroa_0_0_copyload - ($aabb59_sroa_0_0_copyload - $aabb59_sroa_2_8_copyload) * .5; //@line 7374
 HEAPF32[$call_i + 24 >> 2] = $aabb59_sroa_3_12_copyload; //@line 7377
 $tl = $self + 32 | 0; //@line 7380
 HEAP32[$tl >> 2] = _aqretain($call_i) | 0; //@line 7381
 $aabb64_sroa_0_0_copyload = (copyTempFloat($aabb59_sroa_0_0_tmp60_idx | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 7382
 $aabb64_sroa_1_4_copyload = (copyTempFloat($aabb59_sroa_1_4_tmp60_idx212 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 7383
 $aabb64_sroa_2_8_copyload = (copyTempFloat($aabb59_sroa_2_8_tmp60_idx213 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 7384
 $aabb64_sroa_3_12_copyload = (copyTempFloat($aabb59_sroa_3_12_tmp60_idx214 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 7385
 $mul_i_i_i71 = ($aabb64_sroa_1_4_copyload - $aabb64_sroa_3_12_copyload) * .5; //@line 7388
 $add_i3_i = $aabb64_sroa_3_12_copyload + $mul_i_i_i71; //@line 7390
 $add3_i_i = $aabb64_sroa_0_0_copyload + 0.0; //@line 7391
 $call_i80 = _aqcreate(2424) | 0; //@line 7394
 HEAPF32[$call_i80 + 12 >> 2] = $add3_i_i; //@line 7397
 HEAPF32[$call_i80 + 16 >> 2] = $mul_i_i_i71 + $add_i3_i; //@line 7400
 HEAPF32[$call_i80 + 20 >> 2] = $add3_i_i - ($aabb64_sroa_0_0_copyload - $aabb64_sroa_2_8_copyload) * .5; //@line 7403
 HEAPF32[$call_i80 + 24 >> 2] = $add_i3_i; //@line 7406
 $tr = $self + 36 | 0; //@line 7409
 HEAP32[$tr >> 2] = _aqretain($call_i80) | 0; //@line 7410
 $aabb82_sroa_0_0_copyload = (copyTempFloat($aabb59_sroa_0_0_tmp60_idx | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 7411
 $aabb82_sroa_1_4_copyload = (copyTempFloat($aabb59_sroa_1_4_tmp60_idx212 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 7412
 $aabb82_sroa_2_8_copyload = (copyTempFloat($aabb59_sroa_2_8_tmp60_idx213 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 7413
 $aabb82_sroa_3_12_copyload = (copyTempFloat($aabb59_sroa_3_12_tmp60_idx214 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 7414
 $mul1_i_i_i96 = ($aabb82_sroa_0_0_copyload - $aabb82_sroa_2_8_copyload) * .5; //@line 7418
 $sub3_i_i = $aabb82_sroa_0_0_copyload - $mul1_i_i_i96; //@line 7419
 $call_i106 = _aqcreate(2424) | 0; //@line 7422
 HEAPF32[$call_i106 + 12 >> 2] = $sub3_i_i; //@line 7425
 HEAPF32[$call_i106 + 16 >> 2] = $aabb82_sroa_3_12_copyload + ($aabb82_sroa_1_4_copyload - $aabb82_sroa_3_12_copyload) * .5; //@line 7428
 HEAPF32[$call_i106 + 20 >> 2] = $sub3_i_i - $mul1_i_i_i96; //@line 7431
 HEAPF32[$call_i106 + 24 >> 2] = $aabb82_sroa_3_12_copyload; //@line 7434
 $bl = $self + 40 | 0; //@line 7437
 HEAP32[$bl >> 2] = _aqretain($call_i106) | 0; //@line 7438
 $aabb108_sroa_0_0_copyload = (copyTempFloat($aabb59_sroa_0_0_tmp60_idx | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 7439
 $aabb108_sroa_1_4_copyload = (copyTempFloat($aabb59_sroa_1_4_tmp60_idx212 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 7440
 $aabb108_sroa_2_8_copyload = (copyTempFloat($aabb59_sroa_2_8_tmp60_idx213 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 7441
 $aabb108_sroa_3_12_copyload = (copyTempFloat($aabb59_sroa_3_12_tmp60_idx214 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 7442
 $mul_i_i_i118 = ($aabb108_sroa_1_4_copyload - $aabb108_sroa_3_12_copyload) * .5; //@line 7445
 $mul1_i_i_i119 = ($aabb108_sroa_0_0_copyload - $aabb108_sroa_2_8_copyload) * .5; //@line 7446
 $add_i3_i120 = $aabb108_sroa_3_12_copyload + $mul_i_i_i118; //@line 7447
 $add3_i_i121 = $aabb108_sroa_0_0_copyload - $mul1_i_i_i119; //@line 7448
 $call_i131 = _aqcreate(2424) | 0; //@line 7451
 HEAPF32[$call_i131 + 12 >> 2] = $add3_i_i121; //@line 7454
 HEAPF32[$call_i131 + 16 >> 2] = $mul_i_i_i118 + $add_i3_i120; //@line 7457
 HEAPF32[$call_i131 + 20 >> 2] = $add3_i_i121 - $mul1_i_i_i119; //@line 7460
 HEAPF32[$call_i131 + 24 >> 2] = $add_i3_i120; //@line 7463
 $br = $self + 44 | 0; //@line 7466
 HEAP32[$br >> 2] = _aqretain($call_i131) | 0; //@line 7467
 $4 = HEAP32[$self + 240 >> 2] | 0; //@line 7469
 if (($4 | 0) <= 0) {
  STACKTOP = sp; //@line 7473
  return;
 }
 $right_i134 = $aabb15 + 4 | 0; //@line 7475
 $left2_i137 = $aabb15 + 12 | 0; //@line 7476
 $top_i141 = $aabb15 | 0; //@line 7477
 $bottom7_i145 = $aabb15 + 8 | 0; //@line 7478
 $index_0236 = 0; //@line 7480
 do {
  $5 = HEAP32[$self + 48 + ($index_0236 << 2) >> 2] | 0; //@line 7484
  _AQParticle_aabb($aabb15, $5); //@line 7485
  $6 = HEAP32[$tl >> 2] | 0; //@line 7486
  L694 : do {
   if (+HEAPF32[$6 + 24 >> 2] < +HEAPF32[$right_i134 >> 2]) {
    if (+HEAPF32[$6 + 16 >> 2] <= +HEAPF32[$left2_i137 >> 2]) {
     break;
    }
    if (+HEAPF32[$6 + 20 >> 2] >= +HEAPF32[$top_i141 >> 2]) {
     break;
    }
    if (+HEAPF32[$6 + 12 >> 2] <= +HEAPF32[$bottom7_i145 >> 2]) {
     break;
    }
    HEAP32[$6 + 28 >> 2] = 0; //@line 7519
    do {
     if ((HEAP32[$6 + 32 >> 2] | 0) == 0) {
      $length_i = $6 + 240 | 0; //@line 7526
      if ((HEAP32[$length_i >> 2] | 0) < 48) {
       $18 = _aqretain($5) | 0; //@line 7533
       $19 = HEAP32[$length_i >> 2] | 0; //@line 7534
       HEAP32[$length_i >> 2] = $19 + 1; //@line 7536
       HEAP32[$6 + 48 + ($19 << 2) >> 2] = $18; //@line 7538
       break L694;
      } else {
       __AQDdvt_toChildren($6); //@line 7542
       break;
      }
     }
    } while (0);
    __AQDdvt_addParticleChild($6, $5, $aabb15); //@line 7548
   }
  } while (0);
  $20 = HEAP32[$tr >> 2] | 0; //@line 7551
  L706 : do {
   if (+HEAPF32[$20 + 24 >> 2] < +HEAPF32[$right_i134 >> 2]) {
    if (+HEAPF32[$20 + 16 >> 2] <= +HEAPF32[$left2_i137 >> 2]) {
     break;
    }
    if (+HEAPF32[$20 + 20 >> 2] >= +HEAPF32[$top_i141 >> 2]) {
     break;
    }
    if (+HEAPF32[$20 + 12 >> 2] <= +HEAPF32[$bottom7_i145 >> 2]) {
     break;
    }
    HEAP32[$20 + 28 >> 2] = 0; //@line 7584
    do {
     if ((HEAP32[$20 + 32 >> 2] | 0) == 0) {
      $length_i155 = $20 + 240 | 0; //@line 7591
      if ((HEAP32[$length_i155 >> 2] | 0) < 48) {
       $32 = _aqretain($5) | 0; //@line 7598
       $33 = HEAP32[$length_i155 >> 2] | 0; //@line 7599
       HEAP32[$length_i155 >> 2] = $33 + 1; //@line 7601
       HEAP32[$20 + 48 + ($33 << 2) >> 2] = $32; //@line 7603
       break L706;
      } else {
       __AQDdvt_toChildren($20); //@line 7607
       break;
      }
     }
    } while (0);
    __AQDdvt_addParticleChild($20, $5, $aabb15); //@line 7613
   }
  } while (0);
  $34 = HEAP32[$bl >> 2] | 0; //@line 7616
  L718 : do {
   if (+HEAPF32[$34 + 24 >> 2] < +HEAPF32[$right_i134 >> 2]) {
    if (+HEAPF32[$34 + 16 >> 2] <= +HEAPF32[$left2_i137 >> 2]) {
     break;
    }
    if (+HEAPF32[$34 + 20 >> 2] >= +HEAPF32[$top_i141 >> 2]) {
     break;
    }
    if (+HEAPF32[$34 + 12 >> 2] <= +HEAPF32[$bottom7_i145 >> 2]) {
     break;
    }
    HEAP32[$34 + 28 >> 2] = 0; //@line 7649
    do {
     if ((HEAP32[$34 + 32 >> 2] | 0) == 0) {
      $length_i171 = $34 + 240 | 0; //@line 7656
      if ((HEAP32[$length_i171 >> 2] | 0) < 48) {
       $46 = _aqretain($5) | 0; //@line 7663
       $47 = HEAP32[$length_i171 >> 2] | 0; //@line 7664
       HEAP32[$length_i171 >> 2] = $47 + 1; //@line 7666
       HEAP32[$34 + 48 + ($47 << 2) >> 2] = $46; //@line 7668
       break L718;
      } else {
       __AQDdvt_toChildren($34); //@line 7672
       break;
      }
     }
    } while (0);
    __AQDdvt_addParticleChild($34, $5, $aabb15); //@line 7678
   }
  } while (0);
  $48 = HEAP32[$br >> 2] | 0; //@line 7681
  L730 : do {
   if (+HEAPF32[$48 + 24 >> 2] < +HEAPF32[$right_i134 >> 2]) {
    if (+HEAPF32[$48 + 16 >> 2] <= +HEAPF32[$left2_i137 >> 2]) {
     break;
    }
    if (+HEAPF32[$48 + 20 >> 2] >= +HEAPF32[$top_i141 >> 2]) {
     break;
    }
    if (+HEAPF32[$48 + 12 >> 2] <= +HEAPF32[$bottom7_i145 >> 2]) {
     break;
    }
    HEAP32[$48 + 28 >> 2] = 0; //@line 7714
    do {
     if ((HEAP32[$48 + 32 >> 2] | 0) == 0) {
      $length_i187 = $48 + 240 | 0; //@line 7721
      if ((HEAP32[$length_i187 >> 2] | 0) < 48) {
       $60 = _aqretain($5) | 0; //@line 7728
       $61 = HEAP32[$length_i187 >> 2] | 0; //@line 7729
       HEAP32[$length_i187 >> 2] = $61 + 1; //@line 7731
       HEAP32[$48 + 48 + ($61 << 2) >> 2] = $60; //@line 7733
       break L730;
      } else {
       __AQDdvt_toChildren($48); //@line 7737
       break;
      }
     }
    } while (0);
    __AQDdvt_addParticleChild($48, $5, $aabb15); //@line 7743
   }
  } while (0);
  _aqautorelease($5) | 0; //@line 7747
  $index_0236 = $index_0236 + 1 | 0; //@line 7748
 } while (($index_0236 | 0) < ($4 | 0));
 STACKTOP = sp; //@line 7757
 return;
}
function _main_loop() {
 var $event_i = 0, $screenWidth_i = 0, $screenHeight_i = 0, $call1_i = 0, $3 = 0, $state_i = 0, $4 = 0, $call2_i = 0, $6 = 0, $8 = 0, $call5_i = 0, $hadEvent_0_i = 0, $type_i = 0, $9 = 0, $h_i = 0, $10 = 0, $11 = 0, $x_i = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $conv_i = 0.0, $conv23_i = 0.0, $conv26_i = 0, $conv27_i = 0.0, $22 = 0, $24 = 0, $28 = 0, $35 = 0, $38 = 0, $conv64_i = 0.0, $conv66_i = 0.0, $conv68_i = 0.0, $43 = 0, $call75_i = 0, $45 = 0, $47 = 0, $call80_i = 0, $59 = 0, $call100_i = 0, $64 = 0, $conv105_i = 0.0, $conv107_i = 0.0, $conv109_i = 0.0, $69 = 0, $call = 0, $70 = 0, $sub = 0, $conv = 0.0, $div = 0.0, $conv1 = 0.0, label = 0, tempVarArgs = 0, sp = 0;
 sp = STACKTOP; //@line 5113
 STACKTOP = STACKTOP + 64 | 0; //@line 5113
 $event_i = sp | 0; //@line 5114
 $screenWidth_i = sp + 48 | 0; //@line 5115
 $screenHeight_i = sp + 56 | 0; //@line 5116
 $call1_i = _aqinit(_aqalloc(2184) | 0) | 0; //@line 5121
 $3 = HEAP32[670] | 0; //@line 5122
 do {
  if (($3 | 0) == 0) {
   $hadEvent_0_i = 0; //@line 5127
  } else {
   $state_i = $3 + 12 | 0; //@line 5129
   $4 = HEAP32[$state_i >> 2] | 0; //@line 5130
   if (($4 & 7 | 0) == 0) {
    $call2_i = _AQInput_getTouches() | 0; //@line 5135
    $6 = HEAP32[670] | 0; //@line 5137
    _AQArray_remove($call2_i, $6) | 0; //@line 5138
    $8 = HEAP32[670] | 0; //@line 5140
    _aqrelease($8) | 0; //@line 5141
    HEAP32[670] = 0; //@line 5142
    $call5_i = _AQArray_length($call2_i) | 0; //@line 5143
    _printf(704, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 8 | 0, HEAP32[tempVarArgs >> 2] = $call5_i, tempVarArgs) | 0) | 0; //@line 5144
    STACKTOP = tempVarArgs; //@line 5144
    $hadEvent_0_i = 0; //@line 5146
    break;
   }
   if (($4 & 3 | 0) == 0) {
    $hadEvent_0_i = 0; //@line 5153
    break;
   }
   HEAP32[$state_i >> 2] = 4; //@line 5156
   _stepInputWaterTest(); //@line 5157
   $hadEvent_0_i = 1; //@line 5159
  }
 } while (0);
 _AQInput_getScreenSize($screenWidth_i, $screenHeight_i); //@line 5163
 if ((_SDL_PollEvent($event_i | 0) | 0) == 0) {
  if (($hadEvent_0_i | 0) != 0) {
   _aqfree($call1_i); //@line 5171
   $call = _SDL_GetTicks() | 0; //@line 5172
   $70 = HEAP32[688] | 0; //@line 5173
   $sub = $call - $70 | 0; //@line 5174
   $conv = +($sub | 0); //@line 5175
   $div = $conv / 1.0e3; //@line 5176
   $conv1 = $div; //@line 5177
   _stepWaterTest($conv1); //@line 5178
   _drawWaterTest(); //@line 5179
   HEAP32[688] = $call; //@line 5180
   STACKTOP = sp; //@line 5181
   return;
  }
  _stepInputWaterTest(); //@line 5183
  _aqfree($call1_i); //@line 5185
  $call = _SDL_GetTicks() | 0; //@line 5186
  $70 = HEAP32[688] | 0; //@line 5187
  $sub = $call - $70 | 0; //@line 5188
  $conv = +($sub | 0); //@line 5189
  $div = $conv / 1.0e3; //@line 5190
  $conv1 = $div; //@line 5191
  _stepWaterTest($conv1); //@line 5192
  _drawWaterTest(); //@line 5193
  HEAP32[688] = $call; //@line 5194
  STACKTOP = sp; //@line 5195
  return;
 }
 $type_i = $event_i | 0; //@line 5197
 $9 = $event_i + 4 | 0; //@line 5198
 $h_i = $event_i + 8 | 0; //@line 5199
 $10 = $h_i; //@line 5200
 $11 = $event_i + 16 | 0; //@line 5202
 $x_i = $event_i + 12 | 0; //@line 5204
 $12 = $h_i; //@line 5205
 L339 : while (1) {
  $13 = HEAP32[$type_i >> 2] | 0; //@line 5208
  do {
   if (($13 | 0) == 28673) {
    $14 = HEAP32[$9 >> 2] | 0; //@line 5211
    $15 = HEAP32[$10 >> 2] | 0; //@line 5212
    _printf(608, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 16 | 0, HEAP32[tempVarArgs >> 2] = $14, HEAP32[tempVarArgs + 8 >> 2] = $15, tempVarArgs) | 0) | 0; //@line 5213
    STACKTOP = tempVarArgs; //@line 5213
    $conv_i = +(HEAP32[$9 >> 2] | 0); //@line 5215
    HEAPF32[$screenWidth_i >> 2] = $conv_i; //@line 5216
    $conv23_i = +(HEAP32[$10 >> 2] | 0); //@line 5218
    HEAPF32[$screenHeight_i >> 2] = $conv23_i; //@line 5219
    $conv26_i = ~~($conv_i > $conv23_i ? $conv_i : $conv23_i); //@line 5222
    _AQInput_setScreenSize($conv_i, $conv23_i); //@line 5223
    $conv27_i = +($conv26_i | 0); //@line 5225
    _glViewport(~~((+HEAPF32[$screenWidth_i >> 2] - $conv27_i) * .5) | 0, ~~((+HEAPF32[$screenHeight_i >> 2] - $conv27_i) * .5) | 0, $conv26_i | 0, $conv26_i | 0); //@line 5233
   } else if (($13 | 0) == 768) {
    _AQInput_pressKey(HEAP32[$11 >> 2] | 0); //@line 5237
   } else if (($13 | 0) == 769) {
    _AQInput_releaseKey(HEAP32[$11 >> 2] | 0); //@line 5241
   } else if (($13 | 0) == 1024) {
    $22 = HEAP32[670] | 0; //@line 5244
    if (($22 | 0) == 0) {
     break;
    }
    HEAP32[$22 + 12 >> 2] = 2; //@line 5251
    $24 = HEAP32[670] | 0; //@line 5254
    HEAPF32[$24 + 28 >> 2] = +(HEAP32[$x_i >> 2] | 0) - +HEAPF32[$24 + 20 >> 2]; //@line 5259
    $28 = HEAP32[670] | 0; //@line 5264
    HEAPF32[$28 + 32 >> 2] = +HEAPF32[$screenHeight_i >> 2] - +(HEAP32[$11 >> 2] | 0) - +HEAPF32[$28 + 24 >> 2]; //@line 5269
    HEAPF32[(HEAP32[670] | 0) + 20 >> 2] = +(HEAP32[$x_i >> 2] | 0); //@line 5274
    HEAPF32[(HEAP32[670] | 0) + 24 >> 2] = +HEAPF32[$screenHeight_i >> 2] - +(HEAP32[$11 >> 2] | 0); //@line 5281
    $35 = HEAP32[670] | 0; //@line 5282
    _AQInput_screenToWorld(+HEAPF32[$35 + 20 >> 2], +HEAPF32[$35 + 24 >> 2], $35 + 36 | 0, $35 + 40 | 0); //@line 5289
    $38 = HEAP32[670] | 0; //@line 5290
    $conv64_i = +HEAPF32[$38 + 24 >> 2]; //@line 5296
    $conv66_i = +HEAPF32[$38 + 36 >> 2]; //@line 5299
    $conv68_i = +HEAPF32[$38 + 40 >> 2]; //@line 5302
    _printf(336, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 32 | 0, HEAPF64[tempVarArgs >> 3] = +HEAPF32[$38 + 20 >> 2], HEAPF64[tempVarArgs + 8 >> 3] = $conv64_i, HEAPF64[tempVarArgs + 16 >> 3] = $conv66_i, HEAPF64[tempVarArgs + 24 >> 3] = $conv68_i, tempVarArgs) | 0) | 0; //@line 5303
    STACKTOP = tempVarArgs; //@line 5303
   } else if (($13 | 0) == 256) {
    label = 302; //@line 5306
    break L339;
   } else if (($13 | 0) == 1026) {
    $69 = HEAP32[670] | 0; //@line 5309
    if (($69 | 0) == 0) {
     break;
    }
    HEAP32[$69 + 12 >> 2] = 8; //@line 5316
   } else if (($13 | 0) == 1025) {
    $43 = HEAP32[670] | 0; //@line 5319
    if (($43 | 0) != 0) {
     HEAP32[$43 + 12 >> 2] = 16; //@line 5324
     $call75_i = _AQInput_getTouches() | 0; //@line 5325
     $45 = HEAP32[670] | 0; //@line 5327
     _AQArray_remove($call75_i, $45) | 0; //@line 5328
     $47 = HEAP32[670] | 0; //@line 5330
     _aqrelease($47) | 0; //@line 5331
    }
    $call80_i = _aqretain(_aqcreate(2e3) | 0) | 0; //@line 5335
    HEAP32[670] = $call80_i; //@line 5337
    HEAP32[$call80_i + 12 >> 2] = 1; //@line 5340
    HEAP32[(HEAP32[670] | 0) + 16 >> 2] = HEAPU8[$12] | 0; //@line 5345
    HEAPF32[(HEAP32[670] | 0) + 20 >> 2] = +(HEAP32[$x_i >> 2] | 0); //@line 5350
    HEAPF32[(HEAP32[670] | 0) + 24 >> 2] = +HEAPF32[$screenHeight_i >> 2] - +(HEAP32[$11 >> 2] | 0); //@line 5357
    HEAPF32[(HEAP32[670] | 0) + 28 >> 2] = 0.0; //@line 5360
    HEAPF32[(HEAP32[670] | 0) + 32 >> 2] = 0.0; //@line 5363
    $59 = HEAP32[670] | 0; //@line 5364
    _AQInput_screenToWorld(+HEAPF32[$59 + 20 >> 2], +HEAPF32[$59 + 24 >> 2], $59 + 36 | 0, $59 + 40 | 0); //@line 5371
    $call100_i = _AQInput_getTouches() | 0; //@line 5372
    _AQArray_push($call100_i, HEAP32[670] | 0) | 0; //@line 5375
    $64 = HEAP32[670] | 0; //@line 5376
    $conv105_i = +HEAPF32[$64 + 24 >> 2]; //@line 5382
    $conv107_i = +HEAPF32[$64 + 36 >> 2]; //@line 5385
    $conv109_i = +HEAPF32[$64 + 40 >> 2]; //@line 5388
    _printf(200, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 32 | 0, HEAPF64[tempVarArgs >> 3] = +HEAPF32[$64 + 20 >> 2], HEAPF64[tempVarArgs + 8 >> 3] = $conv105_i, HEAPF64[tempVarArgs + 16 >> 3] = $conv107_i, HEAPF64[tempVarArgs + 24 >> 3] = $conv109_i, tempVarArgs) | 0) | 0; //@line 5389
    STACKTOP = tempVarArgs; //@line 5389
   }
  } while (0);
  _stepInputWaterTest(); //@line 5393
  if ((_SDL_PollEvent($event_i | 0) | 0) == 0) {
   label = 307; //@line 5398
   break;
  }
 }
 if ((label | 0) == 302) {
  _SDL_Quit(); //@line 5403
  _exit(0); //@line 5404
 } else if ((label | 0) == 307) {
  _aqfree($call1_i); //@line 5408
  $call = _SDL_GetTicks() | 0; //@line 5409
  $70 = HEAP32[688] | 0; //@line 5410
  $sub = $call - $70 | 0; //@line 5411
  $conv = +($sub | 0); //@line 5412
  $div = $conv / 1.0e3; //@line 5413
  $conv1 = $div; //@line 5414
  _stepWaterTest($conv1); //@line 5415
  _drawWaterTest(); //@line 5416
  HEAP32[688] = $call; //@line 5417
  STACKTOP = sp; //@line 5418
  return;
 }
}
function _AQParticle_test($self, $other, $col) {
 $self = $self | 0;
 $other = $other | 0;
 $col = $col | 0;
 var $sub = 0.0, $sub9 = 0.0, $6 = 0.0, $7 = 0.0, $add = 0.0, $add12 = 0.0, $collideWith = 0, $8 = 0, $self_addr_05_i = 0, $10 = 0, $12 = 0, $itr_06_i_i = 0, $16 = 0, $17 = 0, $itr_06_i34_i = 0, $21 = 0, $itr_06_i22_i = 0, $25 = 0, $26 = 0, $itr_06_i10_i = 0, $collideWithNext = 0, $30 = 0, $call_i = 0, $31 = 0, $call_i_i51 = 0, $32 = 0, $self_addr_0_i53_in = 0, $33 = 0, $34 = 0, $call_i6_i57 = 0, $35 = 0, $36 = 0, $37 = 0, $collideWithNext32 = 0, $39 = 0, $call_i64 = 0, $40 = 0, $call_i_i = 0, $41 = 0, $self_addr_0_i_in = 0, $42 = 0, $43 = 0, $call_i6_i = 0, $44 = 0, $45 = 0, $46 = 0, $conv44 = 0.0, $ingress_0 = 0.0, $sub53 = 0.0, $retval_0 = 0;
 do {
  if ((HEAP8[$self + 96 | 0] | 0) != 0) {
   if ((HEAP8[$other + 96 | 0] | 0) == 0) {
    break;
   } else {
    $retval_0 = 0; //@line 8550
   }
   return $retval_0 | 0; //@line 8553
  }
 } while (0);
 $sub = +HEAPF32[$self + 12 >> 2] - +HEAPF32[$other + 12 >> 2]; //@line 8564
 $sub9 = +HEAPF32[$self + 16 >> 2] - +HEAPF32[$other + 16 >> 2]; //@line 8565
 $6 = +HEAPF32[$self + 20 >> 2]; //@line 8567
 $7 = +HEAPF32[$other + 20 >> 2]; //@line 8569
 $add = $6 + $7; //@line 8570
 $add12 = $sub * $sub + $sub9 * $sub9; //@line 8573
 if ($add12 >= $add * $add) {
  $retval_0 = 0; //@line 8578
  return $retval_0 | 0; //@line 8580
 }
 $collideWith = $self + 112 | 0; //@line 8582
 $8 = HEAP32[$collideWith >> 2] | 0; //@line 8583
 L876 : do {
  if (($8 | 0) != 0) {
   $self_addr_05_i = $8; //@line 8590
   while (1) {
    $10 = HEAP32[$self_addr_05_i >> 2] | 0; //@line 8594
    if (($10 | 0) == 0) {
     break L876;
    }
    if (($10 | 0) == ($other | 0)) {
     $retval_0 = 0; //@line 8602
     break;
    }
    $self_addr_05_i = HEAP32[$self_addr_05_i + 4 >> 2] | 0; //@line 8606
    if (($self_addr_05_i | 0) == 0) {
     break L876;
    }
   }
   return $retval_0 | 0; //@line 8616
  }
 } while (0);
 $12 = HEAP32[$self + 124 >> 2] | 0; //@line 8620
 L884 : do {
  if (!(($12 | 0) == 0 | ($other | 0) == 0)) {
   $itr_06_i_i = $12; //@line 8629
   while (1) {
    if ((HEAP32[$itr_06_i_i >> 2] | 0) == ($other | 0)) {
     $retval_0 = 0; //@line 8637
     break;
    }
    $itr_06_i_i = HEAP32[$itr_06_i_i + 4 >> 2] | 0; //@line 8641
    if (($itr_06_i_i | 0) == 0) {
     break L884;
    }
   }
   return $retval_0 | 0; //@line 8651
  }
 } while (0);
 $16 = HEAP32[$other + 120 >> 2] | 0; //@line 8656
 $17 = HEAP32[$self + 128 >> 2] | 0; //@line 8657
 L891 : do {
  if (!(($17 | 0) == 0 | ($16 | 0) == 0)) {
   $itr_06_i34_i = $17; //@line 8666
   while (1) {
    if ((HEAP32[$itr_06_i34_i >> 2] | 0) == ($16 | 0)) {
     $retval_0 = 0; //@line 8674
     break;
    }
    $itr_06_i34_i = HEAP32[$itr_06_i34_i + 4 >> 2] | 0; //@line 8678
    if (($itr_06_i34_i | 0) == 0) {
     break L891;
    }
   }
   return $retval_0 | 0; //@line 8688
  }
 } while (0);
 $21 = HEAP32[$other + 124 >> 2] | 0; //@line 8692
 L898 : do {
  if (!(($21 | 0) == 0 | ($self | 0) == 0)) {
   $itr_06_i22_i = $21; //@line 8701
   while (1) {
    if ((HEAP32[$itr_06_i22_i >> 2] | 0) == ($self | 0)) {
     $retval_0 = 0; //@line 8709
     break;
    }
    $itr_06_i22_i = HEAP32[$itr_06_i22_i + 4 >> 2] | 0; //@line 8713
    if (($itr_06_i22_i | 0) == 0) {
     break L898;
    }
   }
   return $retval_0 | 0; //@line 8723
  }
 } while (0);
 $25 = HEAP32[$self + 120 >> 2] | 0; //@line 8728
 $26 = HEAP32[$other + 128 >> 2] | 0; //@line 8729
 L905 : do {
  if (!(($26 | 0) == 0 | ($25 | 0) == 0)) {
   $itr_06_i10_i = $26; //@line 8738
   while (1) {
    if ((HEAP32[$itr_06_i10_i >> 2] | 0) == ($25 | 0)) {
     $retval_0 = 0; //@line 8746
     break;
    }
    $itr_06_i10_i = HEAP32[$itr_06_i10_i + 4 >> 2] | 0; //@line 8750
    if (($itr_06_i10_i | 0) == 0) {
     break L905;
    }
   }
   return $retval_0 | 0; //@line 8760
  }
 } while (0);
 $collideWithNext = $self + 116 | 0; //@line 8763
 $30 = HEAP32[$collideWithNext >> 2] | 0; //@line 8764
 do {
  if (($30 | 0) == 0) {
   $call_i = _malloc(8) | 0; //@line 8769
   $31 = $call_i; //@line 8770
   HEAP32[$31 >> 2] = 0; //@line 8774
   HEAP32[$31 + 4 >> 2] = 0; //@line 8776
   HEAP32[$collideWithNext >> 2] = $call_i; //@line 8777
   HEAP32[$collideWith >> 2] = $call_i; //@line 8778
   if (($call_i | 0) != 0) {
    $self_addr_0_i53_in = $call_i; //@line 8782
    break;
   }
   $call_i_i51 = _malloc(8) | 0; //@line 8785
   $32 = $call_i_i51; //@line 8786
   HEAP32[$32 >> 2] = 0; //@line 8790
   HEAP32[$32 + 4 >> 2] = 0; //@line 8792
   $self_addr_0_i53_in = $call_i_i51; //@line 8794
  } else {
   $self_addr_0_i53_in = $30; //@line 8796
  }
 } while (0);
 $33 = $self_addr_0_i53_in + 4 | 0; //@line 8801
 $34 = HEAP32[$33 >> 2] | 0; //@line 8802
 if (($34 | 0) == 0) {
  $call_i6_i57 = _malloc(8) | 0; //@line 8806
  $35 = $call_i6_i57; //@line 8807
  $36 = $call_i6_i57; //@line 8808
  HEAP32[$36 >> 2] = 0; //@line 8812
  HEAP32[$36 + 4 >> 2] = 0; //@line 8814
  HEAP32[$33 >> 2] = $35; //@line 8815
  $37 = $35; //@line 8817
 } else {
  HEAP32[$34 >> 2] = 0; //@line 8820
  $37 = HEAP32[$33 >> 2] | 0; //@line 8822
 }
 HEAP32[$self_addr_0_i53_in >> 2] = $other; //@line 8826
 HEAP32[$collideWithNext >> 2] = $37; //@line 8828
 $collideWithNext32 = $other + 116 | 0; //@line 8829
 $39 = HEAP32[$collideWithNext32 >> 2] | 0; //@line 8830
 do {
  if (($39 | 0) == 0) {
   $call_i64 = _malloc(8) | 0; //@line 8835
   $40 = $call_i64; //@line 8836
   HEAP32[$40 >> 2] = 0; //@line 8840
   HEAP32[$40 + 4 >> 2] = 0; //@line 8842
   HEAP32[$collideWithNext32 >> 2] = $call_i64; //@line 8843
   HEAP32[$other + 112 >> 2] = $call_i64; //@line 8845
   if (($call_i64 | 0) != 0) {
    $self_addr_0_i_in = $call_i64; //@line 8849
    break;
   }
   $call_i_i = _malloc(8) | 0; //@line 8852
   $41 = $call_i_i; //@line 8853
   HEAP32[$41 >> 2] = 0; //@line 8857
   HEAP32[$41 + 4 >> 2] = 0; //@line 8859
   $self_addr_0_i_in = $call_i_i; //@line 8861
  } else {
   $self_addr_0_i_in = $39; //@line 8863
  }
 } while (0);
 $42 = $self_addr_0_i_in + 4 | 0; //@line 8868
 $43 = HEAP32[$42 >> 2] | 0; //@line 8869
 if (($43 | 0) == 0) {
  $call_i6_i = _malloc(8) | 0; //@line 8873
  $44 = $call_i6_i; //@line 8874
  $45 = $call_i6_i; //@line 8875
  HEAP32[$45 >> 2] = 0; //@line 8879
  HEAP32[$45 + 4 >> 2] = 0; //@line 8881
  HEAP32[$42 >> 2] = $44; //@line 8882
  $46 = $44; //@line 8884
 } else {
  HEAP32[$43 >> 2] = 0; //@line 8887
  $46 = HEAP32[$42 >> 2] | 0; //@line 8889
 }
 HEAP32[$self_addr_0_i_in >> 2] = $self; //@line 8893
 HEAP32[$collideWithNext32 >> 2] = $46; //@line 8895
 $conv44 = +Math_sqrt(+$add12); //@line 8896
 HEAPF32[$col + 16 >> 2] = $add - $conv44; //@line 8899
 $ingress_0 = $conv44 == 0.0 ? 9999999747378752.0e-21 : $conv44; //@line 8901
 $sub53 = $7 / $ingress_0 - ($ingress_0 - $6) / $ingress_0; //@line 8905
 HEAPF32[$col + 8 >> 2] = $sub * $sub53; //@line 8908
 HEAPF32[$col + 12 >> 2] = $sub9 * $sub53; //@line 8911
 HEAP32[$col >> 2] = $self; //@line 8913
 HEAP32[$col + 4 >> 2] = $other; //@line 8915
 $retval_0 = 1; //@line 8917
 return $retval_0 | 0; //@line 8919
}
function __AQDdvt_addParticleChild($self, $particle, $aabb) {
 $self = $self | 0;
 $particle = $particle | 0;
 $aabb = $aabb | 0;
 var $0 = 0, $right_i = 0, $length_i107 = 0, $12 = 0, $13 = 0, $added_0 = 0, $14 = 0, $length_i91 = 0, $26 = 0, $27 = 0, $added_1 = 0, $28 = 0, $length_i75 = 0, $40 = 0, $41 = 0, $added_2 = 0, $42 = 0, $length_i = 0, $54 = 0, $55 = 0, $length = 0, label = 0;
 $0 = HEAP32[$self + 32 >> 2] | 0; //@line 5994
 $right_i = $aabb + 4 | 0; //@line 5997
 L468 : do {
  if (+HEAPF32[$0 + 24 >> 2] < +HEAPF32[$right_i >> 2]) {
   if (+HEAPF32[$0 + 16 >> 2] <= +HEAPF32[$aabb + 12 >> 2]) {
    $added_0 = 0; //@line 6010
    break;
   }
   if (+HEAPF32[$0 + 20 >> 2] >= +HEAPF32[$aabb >> 2]) {
    $added_0 = 0; //@line 6020
    break;
   }
   if (+HEAPF32[$0 + 12 >> 2] <= +HEAPF32[$aabb + 8 >> 2]) {
    $added_0 = 0; //@line 6030
    break;
   }
   HEAP32[$0 + 28 >> 2] = 0; //@line 6034
   do {
    if ((HEAP32[$0 + 32 >> 2] | 0) == 0) {
     $length_i107 = $0 + 240 | 0; //@line 6041
     if ((HEAP32[$length_i107 >> 2] | 0) < 48) {
      $12 = _aqretain($particle) | 0; //@line 6048
      $13 = HEAP32[$length_i107 >> 2] | 0; //@line 6049
      HEAP32[$length_i107 >> 2] = $13 + 1; //@line 6051
      HEAP32[$0 + 48 + ($13 << 2) >> 2] = $12; //@line 6053
      $added_0 = 1; //@line 6055
      break L468;
     } else {
      __AQDdvt_toChildren($0); //@line 6058
      break;
     }
    }
   } while (0);
   __AQDdvt_addParticleChild($0, $particle, $aabb); //@line 6064
   $added_0 = 1; //@line 6065
  } else {
   $added_0 = 0; //@line 6067
  }
 } while (0);
 $14 = HEAP32[$self + 36 >> 2] | 0; //@line 6072
 L480 : do {
  if (+HEAPF32[$14 + 24 >> 2] < +HEAPF32[$right_i >> 2]) {
   if (+HEAPF32[$14 + 16 >> 2] <= +HEAPF32[$aabb + 12 >> 2]) {
    $added_1 = $added_0; //@line 6087
    break;
   }
   if (+HEAPF32[$14 + 20 >> 2] >= +HEAPF32[$aabb >> 2]) {
    $added_1 = $added_0; //@line 6097
    break;
   }
   if (+HEAPF32[$14 + 12 >> 2] <= +HEAPF32[$aabb + 8 >> 2]) {
    $added_1 = $added_0; //@line 6107
    break;
   }
   HEAP32[$14 + 28 >> 2] = 0; //@line 6111
   do {
    if ((HEAP32[$14 + 32 >> 2] | 0) == 0) {
     $length_i91 = $14 + 240 | 0; //@line 6118
     if ((HEAP32[$length_i91 >> 2] | 0) < 48) {
      $26 = _aqretain($particle) | 0; //@line 6125
      $27 = HEAP32[$length_i91 >> 2] | 0; //@line 6126
      HEAP32[$length_i91 >> 2] = $27 + 1; //@line 6128
      HEAP32[$14 + 48 + ($27 << 2) >> 2] = $26; //@line 6130
      $added_1 = 1; //@line 6132
      break L480;
     } else {
      __AQDdvt_toChildren($14); //@line 6135
      break;
     }
    }
   } while (0);
   __AQDdvt_addParticleChild($14, $particle, $aabb); //@line 6141
   $added_1 = 1; //@line 6142
  } else {
   $added_1 = $added_0; //@line 6144
  }
 } while (0);
 $28 = HEAP32[$self + 40 >> 2] | 0; //@line 6149
 L492 : do {
  if (+HEAPF32[$28 + 24 >> 2] < +HEAPF32[$right_i >> 2]) {
   if (+HEAPF32[$28 + 16 >> 2] <= +HEAPF32[$aabb + 12 >> 2]) {
    $added_2 = $added_1; //@line 6164
    break;
   }
   if (+HEAPF32[$28 + 20 >> 2] >= +HEAPF32[$aabb >> 2]) {
    $added_2 = $added_1; //@line 6174
    break;
   }
   if (+HEAPF32[$28 + 12 >> 2] <= +HEAPF32[$aabb + 8 >> 2]) {
    $added_2 = $added_1; //@line 6184
    break;
   }
   HEAP32[$28 + 28 >> 2] = 0; //@line 6188
   do {
    if ((HEAP32[$28 + 32 >> 2] | 0) == 0) {
     $length_i75 = $28 + 240 | 0; //@line 6195
     if ((HEAP32[$length_i75 >> 2] | 0) < 48) {
      $40 = _aqretain($particle) | 0; //@line 6202
      $41 = HEAP32[$length_i75 >> 2] | 0; //@line 6203
      HEAP32[$length_i75 >> 2] = $41 + 1; //@line 6205
      HEAP32[$28 + 48 + ($41 << 2) >> 2] = $40; //@line 6207
      $added_2 = 1; //@line 6209
      break L492;
     } else {
      __AQDdvt_toChildren($28); //@line 6212
      break;
     }
    }
   } while (0);
   __AQDdvt_addParticleChild($28, $particle, $aabb); //@line 6218
   $added_2 = 1; //@line 6219
  } else {
   $added_2 = $added_1; //@line 6221
  }
 } while (0);
 $42 = HEAP32[$self + 44 >> 2] | 0; //@line 6226
 L504 : do {
  if (+HEAPF32[$42 + 24 >> 2] < +HEAPF32[$right_i >> 2]) {
   if (+HEAPF32[$42 + 16 >> 2] <= +HEAPF32[$aabb + 12 >> 2]) {
    label = 431; //@line 6241
    break;
   }
   if (+HEAPF32[$42 + 20 >> 2] >= +HEAPF32[$aabb >> 2]) {
    label = 431; //@line 6251
    break;
   }
   if (+HEAPF32[$42 + 12 >> 2] <= +HEAPF32[$aabb + 8 >> 2]) {
    label = 431; //@line 6261
    break;
   }
   HEAP32[$42 + 28 >> 2] = 0; //@line 6265
   do {
    if ((HEAP32[$42 + 32 >> 2] | 0) == 0) {
     $length_i = $42 + 240 | 0; //@line 6272
     if ((HEAP32[$length_i >> 2] | 0) < 48) {
      $54 = _aqretain($particle) | 0; //@line 6279
      $55 = HEAP32[$length_i >> 2] | 0; //@line 6280
      HEAP32[$length_i >> 2] = $55 + 1; //@line 6282
      HEAP32[$42 + 48 + ($55 << 2) >> 2] = $54; //@line 6284
      break L504;
     } else {
      __AQDdvt_toChildren($42); //@line 6288
      break;
     }
    }
   } while (0);
   __AQDdvt_addParticleChild($42, $particle, $aabb); //@line 6294
  } else {
   label = 431; //@line 6296
  }
 } while (0);
 do {
  if ((label | 0) == 431) {
   if (($added_2 | 0) != 0) {
    break;
   }
   return;
  }
 } while (0);
 $length = $self + 240 | 0; //@line 6309
 HEAP32[$length >> 2] = (HEAP32[$length >> 2] | 0) + 1; //@line 6312
 return;
}
function __BBCameraController_update($self, $dt) {
 $self = $self | 0;
 $dt = +$dt;
 var $screenWidth = 0, $screenHeight = 0, $call = 0, $1 = 0.0, $2 = 0, $center = 0, $3 = 0, $position_0_val = 0.0, $position_1_val = 0.0, $add_i49 = 0.0, $add9_i52 = 0.0, $4 = 0, $tmp9_sroa_0_0_insert_insert$1 = 0.0, $8 = 0.0, $conv_i = 0.0, $conv1_i = 0.0, $conv4_i = 0.0, $conv20 = 0.0, $tmp24_sroa_0_0_insert_insert$1 = 0.0, $inputPressed = 0, $14 = 0.0, $15 = 0.0, $scaleValue = 0, $16 = 0.0, $mul33 = 0.0, $y = 0, $17 = 0.0, $add = 0.0, $x = 0, $18 = 0.0, $add37 = 0.0, $sub = 0.0, $sub42 = 0.0, $tmp43_sroa_0_0__idx = 0, $tmp43_sroa_1_4__idx55 = 0, $tmp43_sroa_2_8__idx56 = 0, $tmp43_sroa_3_12__idx57 = 0, sp = 0;
 sp = STACKTOP; //@line 1385
 STACKTOP = STACKTOP + 16 | 0; //@line 1385
 $screenWidth = sp | 0; //@line 1386
 $screenHeight = sp + 8 | 0; //@line 1387
 _AQInput_getScreenSize($screenWidth, $screenHeight); //@line 1388
 $call = _AQRenderer_camera() | 0; //@line 1389
 $1 = +HEAPF32[$screenWidth >> 2]; //@line 1391
 HEAPF32[$call + 28 >> 2] = +HEAPF32[$screenHeight >> 2]; //@line 1393
 HEAPF32[$call + 32 >> 2] = $1; //@line 1395
 HEAPF32[$call + 36 >> 2] = 0.0; //@line 1397
 HEAPF32[$call + 40 >> 2] = 0.0; //@line 1399
 if (!(HEAP8[1472] | 0)) {
  HEAPF32[$call + 12 >> 2] = 640.0; //@line 1404
  HEAPF32[$call + 16 >> 2] = 640.0; //@line 1406
  HEAPF32[$call + 20 >> 2] = 0.0; //@line 1408
  HEAPF32[$call + 24 >> 2] = 0.0; //@line 1410
  HEAP8[1472] = 1; //@line 1411
 }
 $2 = HEAP32[$self + 16 >> 2] | 0; //@line 1415
 do {
  if (($2 | 0) != 0) {
   $center = $self + 24 | 0; //@line 1420
   $3 = HEAP32[$2 + 92 >> 2] | 0; //@line 1422
   $position_0_val = +HEAPF32[$3 + 12 >> 2]; //@line 1424
   $position_1_val = +HEAPF32[$3 + 16 >> 2]; //@line 1426
   $add_i49 = $position_0_val + (+HEAPF32[$center >> 2] - $position_0_val) * .5; //@line 1433
   $add9_i52 = $position_1_val + (+HEAPF32[$self + 28 >> 2] - $position_1_val) * .5; //@line 1436
   $4 = $center; //@line 1437
   $tmp9_sroa_0_0_insert_insert$1 = +$add9_i52; //@line 1447
   HEAPF32[$4 >> 2] = $add_i49; //@line 1449
   HEAPF32[$4 + 4 >> 2] = $tmp9_sroa_0_0_insert_insert$1; //@line 1451
   if ((HEAP32[$2 + 12 >> 2] | 0) != 0) {
    break;
   }
   $8 = +HEAPF32[$2 + 48 >> 2]; //@line 1460
   $conv_i = +HEAPF32[$2 + 44 >> 2]; //@line 1463
   $conv1_i = +Math_cos(+$conv_i); //@line 1465
   $conv4_i = +Math_sin(+$conv_i); //@line 1467
   $conv20 = $8 * +HEAPF32[$2 + 20 >> 2] * .5; //@line 1471
   $tmp24_sroa_0_0_insert_insert$1 = +($add9_i52 + ($add9_i52 + $conv4_i * $conv20 - $add9_i52) * .10000000149011612); //@line 1491
   HEAPF32[$4 >> 2] = $add_i49 + ($add_i49 + $conv1_i * $conv20 - $add_i49) * .10000000149011612; //@line 1493
   HEAPF32[$4 + 4 >> 2] = $tmp24_sroa_0_0_insert_insert$1; //@line 1495
  }
 } while (0);
 $inputPressed = $self + 20 | 0; //@line 1499
 if ((HEAP32[$inputPressed >> 2] | 0) == 0) {
  $14 = +HEAPF32[$self + 32 >> 2]; //@line 1505
  HEAPF32[$self + 44 >> 2] = $14; //@line 1507
  $15 = $14; //@line 1508
  $scaleValue = $self + 48 | 0; //@line 1510
  $16 = +HEAPF32[$scaleValue >> 2]; //@line 1511
  $mul33 = $15 * $16; //@line 1512
  $y = $self + 28 | 0; //@line 1513
  $17 = +HEAPF32[$y >> 2]; //@line 1514
  $add = $17 + $mul33; //@line 1515
  $x = $self + 24 | 0; //@line 1516
  $18 = +HEAPF32[$x >> 2]; //@line 1517
  $add37 = $mul33 + $18; //@line 1518
  $sub = $17 - $mul33; //@line 1519
  $sub42 = $18 - $mul33; //@line 1520
  $tmp43_sroa_0_0__idx = $call + 12 | 0; //@line 1521
  HEAPF32[$tmp43_sroa_0_0__idx >> 2] = $add; //@line 1522
  $tmp43_sroa_1_4__idx55 = $call + 16 | 0; //@line 1523
  HEAPF32[$tmp43_sroa_1_4__idx55 >> 2] = $add37; //@line 1524
  $tmp43_sroa_2_8__idx56 = $call + 20 | 0; //@line 1525
  HEAPF32[$tmp43_sroa_2_8__idx56 >> 2] = $sub; //@line 1526
  $tmp43_sroa_3_12__idx57 = $call + 24 | 0; //@line 1527
  HEAPF32[$tmp43_sroa_3_12__idx57 >> 2] = $sub42; //@line 1528
  HEAP32[$inputPressed >> 2] = 0; //@line 1529
  STACKTOP = sp; //@line 1530
  return;
 } else {
  HEAPF32[$self + 44 >> 2] = 8.0; //@line 1533
  $15 = 8.0; //@line 1535
  $scaleValue = $self + 48 | 0; //@line 1537
  $16 = +HEAPF32[$scaleValue >> 2]; //@line 1538
  $mul33 = $15 * $16; //@line 1539
  $y = $self + 28 | 0; //@line 1540
  $17 = +HEAPF32[$y >> 2]; //@line 1541
  $add = $17 + $mul33; //@line 1542
  $x = $self + 24 | 0; //@line 1543
  $18 = +HEAPF32[$x >> 2]; //@line 1544
  $add37 = $mul33 + $18; //@line 1545
  $sub = $17 - $mul33; //@line 1546
  $sub42 = $18 - $mul33; //@line 1547
  $tmp43_sroa_0_0__idx = $call + 12 | 0; //@line 1548
  HEAPF32[$tmp43_sroa_0_0__idx >> 2] = $add; //@line 1549
  $tmp43_sroa_1_4__idx55 = $call + 16 | 0; //@line 1550
  HEAPF32[$tmp43_sroa_1_4__idx55 >> 2] = $add37; //@line 1551
  $tmp43_sroa_2_8__idx56 = $call + 20 | 0; //@line 1552
  HEAPF32[$tmp43_sroa_2_8__idx56 >> 2] = $sub; //@line 1553
  $tmp43_sroa_3_12__idx57 = $call + 24 | 0; //@line 1554
  HEAPF32[$tmp43_sroa_3_12__idx57 >> 2] = $sub42; //@line 1555
  HEAP32[$inputPressed >> 2] = 0; //@line 1556
  STACKTOP = sp; //@line 1557
  return;
 }
}
function _stepWaterTest($dt) {
 $dt = +$dt;
 var $call1 = 0, $add = 0.0, $2 = 0, $startTime_0 = 0, $conv819 = 0.0, $conv821 = 0.0, $conv12 = 0.0, $5 = 0, $startTime_1 = 0, $endTime_0 = 0, $add19 = 0.0, $8 = 0, $inc29 = 0, $10 = 0, $min_07_i = 0, $i_06_i = 0, $11 = 0, $_min_0_i = 0, $inc_i = 0, $max_07_i = 0, $i_06_i7 = 0, $12 = 0, $_max_0_i = 0, $inc_i10 = 0, $i_07_i = 0, $sum_06_i = 0, $add_i14 = 0, $inc_i15 = 0, $i_07_i_i = 0, $sum_06_i_i = 0, $div_i18 = 0, $div_i_i = 0, $diffSum_010_i = 0, $i_09_i = 0, $sub_i = 0, $conv38 = 0.0, tempVarArgs = 0, sp = 0;
 sp = STACKTOP; //@line 683
 if ((HEAP8[2648] | 0) != 0) {
  STACKTOP = sp; //@line 688
  return;
 }
 $call1 = _aqinit(_aqalloc(2184) | 0) | 0; //@line 691
 $add = +HEAPF32[18] + $dt; //@line 693
 HEAPF32[18] = $add; //@line 694
 do {
  if ($add > .016666666666666666) {
   $2 = HEAP32[690] | 0; //@line 700
   if (($2 | 0) == 0) {
    $startTime_0 = 0; //@line 704
   } else {
    $startTime_0 = FUNCTION_TABLE_i[$2 & 31]() | 0; //@line 709
   }
   HEAP32[692] = (HEAP32[692] | 0) + 1; //@line 714
   _AQLoop_step(.01666666753590107); //@line 715
   $conv819 = +HEAPF32[18]; //@line 717
   if ($conv819 > .016666666666666666) {
    $conv821 = $conv819; //@line 721
    do {
     $conv12 = $conv821 + -.016666666666666666; //@line 725
     $conv821 = $conv12; //@line 726
    } while ($conv821 > .016666666666666666);
    HEAPF32[18] = $conv12; //@line 735
   }
   $5 = HEAP32[690] | 0; //@line 738
   if (($5 | 0) == 0) {
    $endTime_0 = 0; //@line 742
    $startTime_1 = $startTime_0; //@line 742
    break;
   }
   $endTime_0 = FUNCTION_TABLE_i[$5 & 31]() | 0; //@line 748
   $startTime_1 = $startTime_0; //@line 748
  } else {
   $endTime_0 = 0; //@line 750
   $startTime_1 = 0; //@line 750
  }
 } while (0);
 $add19 = +HEAPF32[20] + $dt; //@line 756
 HEAPF32[20] = $add19; //@line 757
 if ($add19 > 1.0) {
  HEAPF32[20] = 0.0; //@line 761
  HEAP32[692] = 0; //@line 762
 }
 do {
  if (!((HEAP32[690] | 0) == 0 | ($startTime_1 | 0) == 0)) {
   $8 = HEAP32[794] | 0; //@line 773
   $inc29 = $8 + 1 | 0; //@line 774
   HEAP32[794] = $inc29; //@line 775
   HEAP32[2776 + ($8 << 2) >> 2] = $endTime_0 - $startTime_1; //@line 777
   if ($inc29 >>> 0 <= 99) {
    break;
   }
   $10 = HEAP32[(HEAP32[650] | 0) + 40 >> 2] | 0; //@line 785
   _printf(184, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 8 | 0, HEAP32[tempVarArgs >> 2] = $10, tempVarArgs) | 0) | 0; //@line 786
   STACKTOP = tempVarArgs; //@line 786
   $i_06_i = 0; //@line 787
   $min_07_i = 2147483647; //@line 787
   while (1) {
    $11 = HEAP32[2776 + ($i_06_i << 2) >> 2] | 0; //@line 792
    $_min_0_i = $11 >>> 0 < $min_07_i >>> 0 ? $11 : $min_07_i; //@line 794
    $inc_i = $i_06_i + 1 | 0; //@line 795
    if ($inc_i >>> 0 < 100) {
     $i_06_i = $inc_i; //@line 799
     $min_07_i = $_min_0_i; //@line 799
    } else {
     $i_06_i7 = 0; //@line 801
     $max_07_i = 0; //@line 801
     break;
    }
   }
   while (1) {
    $12 = HEAP32[2776 + ($i_06_i7 << 2) >> 2] | 0; //@line 809
    $_max_0_i = $12 >>> 0 > $max_07_i >>> 0 ? $12 : $max_07_i; //@line 811
    $inc_i10 = $i_06_i7 + 1 | 0; //@line 812
    if ($inc_i10 >>> 0 < 100) {
     $i_06_i7 = $inc_i10; //@line 816
     $max_07_i = $_max_0_i; //@line 816
    } else {
     $sum_06_i = 0; //@line 818
     $i_07_i = 0; //@line 818
     break;
    }
   }
   while (1) {
    $add_i14 = (HEAP32[2776 + ($i_07_i << 2) >> 2] | 0) + $sum_06_i | 0; //@line 827
    $inc_i15 = $i_07_i + 1 | 0; //@line 828
    if ($inc_i15 >>> 0 < 100) {
     $sum_06_i = $add_i14; //@line 832
     $i_07_i = $inc_i15; //@line 832
    } else {
     $sum_06_i_i = 0; //@line 834
     $i_07_i_i = 0; //@line 834
     break;
    }
   }
   do {
    $sum_06_i_i = (HEAP32[2776 + ($i_07_i_i << 2) >> 2] | 0) + $sum_06_i_i | 0; //@line 843
    $i_07_i_i = $i_07_i_i + 1 | 0; //@line 844
   } while ($i_07_i_i >>> 0 < 100);
   $div_i18 = ($add_i14 >>> 0) / 100 | 0; //@line 853
   $div_i_i = ($sum_06_i_i >>> 0) / 100 | 0; //@line 854
   $i_09_i = 0; //@line 855
   $diffSum_010_i = 0; //@line 855
   do {
    $sub_i = (HEAP32[2776 + ($i_09_i << 2) >> 2] | 0) - $div_i_i | 0; //@line 861
    $diffSum_010_i = (Math_imul($sub_i, $sub_i) | 0) + $diffSum_010_i | 0; //@line 863
    $i_09_i = $i_09_i + 1 | 0; //@line 864
   } while ($i_09_i >>> 0 < 100);
   $conv38 = +Math_sqrt(+(+($diffSum_010_i >>> 0 >>> 0) / 100.0)); //@line 876
   _printf(136, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 32 | 0, HEAP32[tempVarArgs >> 2] = $_min_0_i, HEAP32[tempVarArgs + 8 >> 2] = $_max_0_i, HEAP32[tempVarArgs + 16 >> 2] = $div_i18, HEAPF64[tempVarArgs + 24 >> 3] = $conv38, tempVarArgs) | 0) | 0; //@line 877
   STACKTOP = tempVarArgs; //@line 877
   HEAP32[794] = 0; //@line 878
  }
 } while (0);
 _aqfree($call1); //@line 882
 STACKTOP = sp; //@line 884
 return;
}
function _initWaterTest() {
 var $_compoundliteral = 0, $call1 = 0, $call3 = 0, $call11 = 0, $call13 = 0, $13 = 0, $17 = 0, $call20 = 0, $call22 = 0, $call24 = 0, $call26 = 0, $call28 = 0, $call30 = 0, $call32 = 0, tempVarArgs = 0, sp = 0;
 sp = STACKTOP; //@line 469
 STACKTOP = STACKTOP + 16 | 0; //@line 469
 $_compoundliteral = sp | 0; //@line 470
 $call1 = _aqinit(_aqalloc(2184) | 0) | 0; //@line 472
 _AQLoop_boot(); //@line 473
 _AQRenderer_boot(); //@line 474
 _AQRenderer_setClearColor(255, 255, 255); //@line 475
 _AQAudioDriver_setContext(_AQWebAudioDriver_create() | 0); //@line 478
 _AQAudioDriver_setMasterVolume(1.0); //@line 479
 $call3 = _AQLoop_world() | 0; //@line 480
 HEAP32[650] = $call3; //@line 481
 HEAPF32[$_compoundliteral >> 2] = 12800.0; //@line 483
 HEAPF32[$_compoundliteral + 4 >> 2] = 12800.0; //@line 485
 HEAPF32[$_compoundliteral + 8 >> 2] = -12800.0; //@line 487
 HEAPF32[$_compoundliteral + 12 >> 2] = -12800.0; //@line 489
 _AQWorld_setAabb($call3, $_compoundliteral) | 0; //@line 490
 _AQInput_setWorldFrame(12800.0, 12800.0, 0.0, 0.0); //@line 491
 $call11 = _aqcreate(1752) | 0; //@line 492
 HEAP32[652] = $call11; //@line 494
 _AQRenderer_addView($call11); //@line 495
 $call13 = _aqinit(_aqalloc(2576) | 0) | 0; //@line 497
 HEAP32[660] = $call13; //@line 499
 HEAP32[$call13 + 12 >> 2] = 0; //@line 502
 HEAP32[(HEAP32[660] | 0) + 40 >> 2] = 1; //@line 505
 HEAPF32[(HEAP32[660] | 0) + 24 >> 2] = 6.0; //@line 508
 _AQActor_updateData(HEAP32[660] | 0); //@line 510
 _AQActor_setWorld(HEAP32[660] | 0, HEAP32[650] | 0); //@line 513
 _AQLoop_addUpdater(HEAP32[660] | 0); //@line 516
 _AQRenderer_addView(HEAP32[660] | 0); //@line 519
 $13 = _aqcreate(1880) | 0; //@line 521
 HEAP32[808] = $13; //@line 522
 _BBCameraController_setPlayer($13, HEAP32[660] | 0) | 0; //@line 524
 _AQLoop_addUpdater(HEAP32[808] | 0); //@line 527
 $17 = _aqretain(_aqcreate(1856) | 0) | 0; //@line 530
 HEAP32[806] = $17; //@line 531
 _BBCity_initBlocks($17, 4) | 0; //@line 532
 _BBCity_addToWorld(HEAP32[806] | 0, HEAP32[650] | 0); //@line 535
 _BBCity_addWallsToView(HEAP32[806] | 0, HEAP32[652] | 0); //@line 539
 $call20 = _AQInputAction_create(_aqstr(624) | 0) | 0; //@line 541
 $call22 = _AQInputAction_create(_aqstr(952) | 0) | 0; //@line 543
 $call24 = _AQInputAction_create(_aqstr(904) | 0) | 0; //@line 545
 $call26 = _AQInputAction_create(_aqstr(720) | 0) | 0; //@line 547
 $call28 = _AQInputAction_create(_aqstr(600) | 0) | 0; //@line 549
 $call30 = _AQInputAction_create(_aqstr(360) | 0) | 0; //@line 551
 $call32 = _AQInputAction_create(_aqstr(224) | 0) | 0; //@line 553
 _AQInput_setActionToKeys($call20, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 32 | 0, HEAP32[tempVarArgs >> 2] = 97, HEAP32[tempVarArgs + 8 >> 2] = 106, HEAP32[tempVarArgs + 16 >> 2] = 1104, HEAP32[tempVarArgs + 24 >> 2] = 0, tempVarArgs) | 0); //@line 554
 STACKTOP = tempVarArgs; //@line 554
 _AQInput_setActionToKeys($call22, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 32 | 0, HEAP32[tempVarArgs >> 2] = 100, HEAP32[tempVarArgs + 8 >> 2] = 108, HEAP32[tempVarArgs + 16 >> 2] = 1103, HEAP32[tempVarArgs + 24 >> 2] = 0, tempVarArgs) | 0); //@line 555
 STACKTOP = tempVarArgs; //@line 555
 _AQInput_setActionToKeys($call24, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 32 | 0, HEAP32[tempVarArgs >> 2] = 119, HEAP32[tempVarArgs + 8 >> 2] = 105, HEAP32[tempVarArgs + 16 >> 2] = 1106, HEAP32[tempVarArgs + 24 >> 2] = 0, tempVarArgs) | 0); //@line 556
 STACKTOP = tempVarArgs; //@line 556
 _AQInput_setActionToKeys($call26, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 32 | 0, HEAP32[tempVarArgs >> 2] = 115, HEAP32[tempVarArgs + 8 >> 2] = 107, HEAP32[tempVarArgs + 16 >> 2] = 1105, HEAP32[tempVarArgs + 24 >> 2] = 0, tempVarArgs) | 0); //@line 557
 STACKTOP = tempVarArgs; //@line 557
 _AQInput_setActionToKeys($call28, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 40 | 0, HEAP32[tempVarArgs >> 2] = 113, HEAP32[tempVarArgs + 8 >> 2] = 111, HEAP32[tempVarArgs + 16 >> 2] = 1249, HEAP32[tempVarArgs + 24 >> 2] = 1253, HEAP32[tempVarArgs + 32 >> 2] = 0, tempVarArgs) | 0); //@line 558
 STACKTOP = tempVarArgs; //@line 558
 _AQInput_setActionToKeys($call30, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 24 | 0, HEAP32[tempVarArgs >> 2] = 101, HEAP32[tempVarArgs + 8 >> 2] = 117, HEAP32[tempVarArgs + 16 >> 2] = 0, tempVarArgs) | 0); //@line 559
 STACKTOP = tempVarArgs; //@line 559
 _AQInput_setActionToKeys($call32, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 24 | 0, HEAP32[tempVarArgs >> 2] = 122, HEAP32[tempVarArgs + 8 >> 2] = 46, HEAP32[tempVarArgs + 16 >> 2] = 0, tempVarArgs) | 0); //@line 560
 STACKTOP = tempVarArgs; //@line 560
 _glGenBuffers(1, 3240); //@line 561
 _aqfree($call1); //@line 562
 STACKTOP = sp; //@line 563
 return;
}
function __BBRoom_rotateWall($_wall, $ctx) {
 $_wall = $_wall | 0;
 $ctx = $ctx | 0;
 var $1 = 0, $_sroa_0_0_tmp7_idx = 0, $_sroa_0_0_copyload = 0.0, $2 = 0, $_sroa_1_4_copyload = 0.0, $3 = 0, $_sroa_2_8_copyload = 0.0, $4 = 0, $_sroa_3_12_copyload = 0.0, $oldAabb8_sroa_0_0_copyload = 0.0, $oldAabb8_sroa_1_4_copyload = 0.0, $oldAabb8_sroa_2_8_copyload = 0.0, $oldAabb8_sroa_3_12_copyload = 0.0, $_sroa_050_0_copyload = 0.0, $_sroa_153_4_copyload = 0.0, $_sroa_257_8_copyload = 0.0, $_sroa_361_12_copyload = 0.0, $tmp_sroa_3_12_copyload2368 = 0.0, $tmp_sroa_2_8_copyload2067 = 0.0, $tmp_sroa_1_4_copyload1766 = 0.0, $tmp_sroa_0_0_copyload1465 = 0.0;
 $1 = HEAP32[$ctx + 32 >> 2] | 0; //@line 4079
 $_sroa_0_0_tmp7_idx = $_wall + 12 | 0; //@line 4080
 $_sroa_0_0_copyload = (copyTempFloat($_sroa_0_0_tmp7_idx | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4081
 $2 = $_wall + 16 | 0; //@line 4083
 $_sroa_1_4_copyload = (copyTempFloat($2 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4084
 $3 = $_wall + 20 | 0; //@line 4086
 $_sroa_2_8_copyload = (copyTempFloat($3 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4087
 $4 = $_wall + 24 | 0; //@line 4089
 $_sroa_3_12_copyload = (copyTempFloat($4 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4090
 $oldAabb8_sroa_0_0_copyload = (copyTempFloat($ctx | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4092
 $oldAabb8_sroa_1_4_copyload = (copyTempFloat($ctx + 4 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4095
 $oldAabb8_sroa_2_8_copyload = (copyTempFloat($ctx + 8 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4098
 $oldAabb8_sroa_3_12_copyload = (copyTempFloat($ctx + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4101
 $_sroa_050_0_copyload = (copyTempFloat($ctx + 16 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4103
 $_sroa_153_4_copyload = (copyTempFloat($ctx + 20 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4106
 $_sroa_257_8_copyload = (copyTempFloat($ctx + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4109
 $_sroa_361_12_copyload = (copyTempFloat($ctx + 28 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4112
 if (($1 | 0) == 1) {
  $tmp_sroa_0_0_copyload1465 = $_sroa_050_0_copyload - ($_sroa_3_12_copyload - $oldAabb8_sroa_3_12_copyload); //@line 4123
  $tmp_sroa_1_4_copyload1766 = $_sroa_153_4_copyload - ($oldAabb8_sroa_0_0_copyload - $_sroa_0_0_copyload); //@line 4123
  $tmp_sroa_2_8_copyload2067 = $oldAabb8_sroa_1_4_copyload - $_sroa_1_4_copyload + $_sroa_257_8_copyload; //@line 4123
  $tmp_sroa_3_12_copyload2368 = $_sroa_2_8_copyload - $oldAabb8_sroa_2_8_copyload + $_sroa_361_12_copyload; //@line 4123
 } else if (($1 | 0) == 2) {
  $tmp_sroa_0_0_copyload1465 = $_sroa_050_0_copyload - ($_sroa_2_8_copyload - $oldAabb8_sroa_2_8_copyload); //@line 4134
  $tmp_sroa_1_4_copyload1766 = $_sroa_153_4_copyload - ($_sroa_3_12_copyload - $oldAabb8_sroa_3_12_copyload); //@line 4134
  $tmp_sroa_2_8_copyload2067 = $oldAabb8_sroa_0_0_copyload - $_sroa_0_0_copyload + $_sroa_257_8_copyload; //@line 4134
  $tmp_sroa_3_12_copyload2368 = $oldAabb8_sroa_1_4_copyload - $_sroa_1_4_copyload + $_sroa_361_12_copyload; //@line 4134
 } else if (($1 | 0) == 3) {
  $tmp_sroa_0_0_copyload1465 = $_sroa_050_0_copyload - ($oldAabb8_sroa_1_4_copyload - $_sroa_1_4_copyload); //@line 4145
  $tmp_sroa_1_4_copyload1766 = $_sroa_153_4_copyload - ($_sroa_2_8_copyload - $oldAabb8_sroa_2_8_copyload); //@line 4145
  $tmp_sroa_2_8_copyload2067 = $_sroa_3_12_copyload - $oldAabb8_sroa_3_12_copyload + $_sroa_257_8_copyload; //@line 4145
  $tmp_sroa_3_12_copyload2368 = $oldAabb8_sroa_0_0_copyload - $_sroa_0_0_copyload + $_sroa_361_12_copyload; //@line 4145
 } else {
  $tmp_sroa_0_0_copyload1465 = $_sroa_0_0_copyload; //@line 4147
  $tmp_sroa_1_4_copyload1766 = $_sroa_1_4_copyload; //@line 4147
  $tmp_sroa_2_8_copyload2067 = $_sroa_2_8_copyload; //@line 4147
  $tmp_sroa_3_12_copyload2368 = $_sroa_3_12_copyload; //@line 4147
 }
 HEAPF32[$_sroa_0_0_tmp7_idx >> 2] = $tmp_sroa_0_0_copyload1465; //@line 4153
 HEAPF32[$2 >> 2] = $tmp_sroa_1_4_copyload1766; //@line 4154
 HEAPF32[$3 >> 2] = $tmp_sroa_2_8_copyload2067; //@line 4155
 HEAPF32[$4 >> 2] = $tmp_sroa_3_12_copyload2368; //@line 4156
 _AQList_iterate(HEAP32[$_wall + 28 >> 2] | 0, 46, $ctx) | 0; //@line 4160
 return;
}
function _BBRoom_rotate($self, $rotations) {
 $self = $self | 0;
 $rotations = $rotations | 0;
 var $data = 0, $rotation = 0, $world2 = 0, $1 = 0, $tobool = 0, $2 = 0, $3 = 0, $5 = 0, $6 = 0, $7 = 0, $aabb17_sroa_0_0_tmp19_idx = 0, $aabb17_sroa_0_0_copyload24 = 0.0, $aabb17_sroa_1_4_tmp19_idx26 = 0, $aabb17_sroa_1_4_copyload27 = 0.0, $aabb17_sroa_2_8_tmp19_idx29 = 0, $aabb17_sroa_2_8_copyload30 = 0.0, $aabb17_sroa_3_12_tmp19_idx32 = 0, $aabb17_sroa_3_12_copyload33 = 0.0, $aabb17_sroa_2_8_copyload3039 = 0.0, $aabb17_sroa_1_4_copyload2738 = 0.0, $8 = 0, $9 = 0, $walls = 0, $11 = 0, sp = 0;
 sp = STACKTOP; //@line 4188
 STACKTOP = STACKTOP + 56 | 0; //@line 4188
 $data = sp + 16 | 0; //@line 4190
 if (($rotations | 0) == 0) {
  STACKTOP = sp; //@line 4194
  return $self | 0; //@line 4194
 }
 $rotation = $self + 20 | 0; //@line 4196
 HEAP32[$rotation >> 2] = (HEAP32[$rotation >> 2] | 0) + $rotations & 3; //@line 4200
 $world2 = $self + 40 | 0; //@line 4201
 $1 = HEAP32[$world2 >> 2] | 0; //@line 4202
 $tobool = ($1 | 0) != 0; //@line 4203
 if ($tobool) {
  $2 = HEAP32[$self + 44 >> 2] | 0; //@line 4207
  $3 = $1; //@line 4208
  _AQList_iterate($2, 31, $3) | 0; //@line 4209
  $5 = HEAP32[$world2 >> 2] | 0; //@line 4211
  _aqrelease($5) | 0; //@line 4212
  HEAP32[$world2 >> 2] = 0; //@line 4213
 }
 $6 = sp | 0; //@line 4217
 $7 = $self + 24 | 0; //@line 4218
 HEAP32[$6 >> 2] = HEAP32[$7 >> 2]; //@line 4219
 HEAP32[$6 + 4 >> 2] = HEAP32[$7 + 4 >> 2]; //@line 4219
 HEAP32[$6 + 8 >> 2] = HEAP32[$7 + 8 >> 2]; //@line 4219
 HEAP32[$6 + 12 >> 2] = HEAP32[$7 + 12 >> 2]; //@line 4219
 $aabb17_sroa_0_0_tmp19_idx = $self + 24 | 0; //@line 4220
 $aabb17_sroa_0_0_copyload24 = (copyTempFloat($aabb17_sroa_0_0_tmp19_idx | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4221
 $aabb17_sroa_1_4_tmp19_idx26 = $self + 28 | 0; //@line 4222
 $aabb17_sroa_1_4_copyload27 = (copyTempFloat($aabb17_sroa_1_4_tmp19_idx26 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4223
 $aabb17_sroa_2_8_tmp19_idx29 = $self + 32 | 0; //@line 4224
 $aabb17_sroa_2_8_copyload30 = (copyTempFloat($aabb17_sroa_2_8_tmp19_idx29 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4225
 $aabb17_sroa_3_12_tmp19_idx32 = $self + 36 | 0; //@line 4226
 $aabb17_sroa_3_12_copyload33 = (copyTempFloat($aabb17_sroa_3_12_tmp19_idx32 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4227
 if (($rotations | 0) == 3 | ($rotations | 0) == 1) {
  $aabb17_sroa_1_4_copyload2738 = $aabb17_sroa_3_12_copyload33 + ($aabb17_sroa_0_0_copyload24 - $aabb17_sroa_2_8_copyload30); //@line 4234
  $aabb17_sroa_2_8_copyload3039 = $aabb17_sroa_0_0_copyload24 - ($aabb17_sroa_1_4_copyload27 - $aabb17_sroa_3_12_copyload33); //@line 4234
 } else {
  $aabb17_sroa_1_4_copyload2738 = $aabb17_sroa_1_4_copyload27; //@line 4236
  $aabb17_sroa_2_8_copyload3039 = $aabb17_sroa_2_8_copyload30; //@line 4236
 }
 HEAPF32[$aabb17_sroa_0_0_tmp19_idx >> 2] = $aabb17_sroa_0_0_copyload24; //@line 4240
 HEAPF32[$aabb17_sroa_1_4_tmp19_idx26 >> 2] = $aabb17_sroa_1_4_copyload2738; //@line 4241
 HEAPF32[$aabb17_sroa_2_8_tmp19_idx29 >> 2] = $aabb17_sroa_2_8_copyload3039; //@line 4242
 HEAPF32[$aabb17_sroa_3_12_tmp19_idx32 >> 2] = $aabb17_sroa_3_12_copyload33; //@line 4243
 $8 = $data; //@line 4244
 HEAP32[$8 >> 2] = HEAP32[$6 >> 2]; //@line 4245
 HEAP32[$8 + 4 >> 2] = HEAP32[$6 + 4 >> 2]; //@line 4245
 HEAP32[$8 + 8 >> 2] = HEAP32[$6 + 8 >> 2]; //@line 4245
 HEAP32[$8 + 12 >> 2] = HEAP32[$6 + 12 >> 2]; //@line 4245
 $9 = $data + 16 | 0; //@line 4247
 HEAP32[$9 >> 2] = HEAP32[$7 >> 2]; //@line 4248
 HEAP32[$9 + 4 >> 2] = HEAP32[$7 + 4 >> 2]; //@line 4248
 HEAP32[$9 + 8 >> 2] = HEAP32[$7 + 8 >> 2]; //@line 4248
 HEAP32[$9 + 12 >> 2] = HEAP32[$7 + 12 >> 2]; //@line 4248
 HEAP32[$data + 32 >> 2] = $rotations; //@line 4250
 $walls = $self + 44 | 0; //@line 4251
 _AQList_iterate(HEAP32[$walls >> 2] | 0, 28, $8) | 0; //@line 4253
 if (!$tobool) {
  STACKTOP = sp; //@line 4256
  return $self | 0; //@line 4256
 }
 $11 = $1; //@line 4258
 HEAP32[$world2 >> 2] = _aqretain($11) | 0; //@line 4261
 _AQList_iterate(HEAP32[$walls >> 2] | 0, 49, $11) | 0; //@line 4263
 STACKTOP = sp; //@line 4265
 return $self | 0; //@line 4265
}
function _BBBlock_rotateTo($self, $rotation) {
 $self = $self | 0;
 $rotation = $rotation | 0;
 var $data_i = 0, $rotation1 = 0, $0 = 0, $rem = 0, $oldAabb_i_0_cast2 = 0, $1 = 0, $2 = 0, $aabb11_sroa_0_0_tmp13_idx_i = 0, $aabb11_sroa_0_0_copyload14_i = 0.0, $aabb11_sroa_1_4_tmp13_idx16_i = 0, $aabb11_sroa_1_4_copyload17_i = 0.0, $aabb11_sroa_2_8_tmp13_idx19_i = 0, $aabb11_sroa_2_8_copyload20_i = 0.0, $aabb11_sroa_3_12_tmp13_idx22_i = 0, $aabb11_sroa_3_12_copyload23_i = 0.0, $aabb11_sroa_2_8_copyload2029_i = 0.0, $aabb11_sroa_1_4_copyload1728_i = 0.0, $3 = 0, $$etemp$1$0 = 0, $$etemp$1$1 = 0, sp = 0;
 sp = STACKTOP; //@line 1140
 STACKTOP = STACKTOP + 56 | 0; //@line 1140
 $data_i = sp + 16 | 0; //@line 1142
 $rotation1 = $self + 28 | 0; //@line 1144
 $0 = HEAP32[$rotation1 >> 2] | 0; //@line 1145
 $rem = ($rotation + 4 - $0 | 0) % 4 | 0; //@line 1147
 $oldAabb_i_0_cast2 = sp | 0; //@line 1148
 $1 = $data_i; //@line 1152
 if (($rem | 0) == 0) {
  $$etemp$1$0 = 16; //@line 1156
  $$etemp$1$1 = 0; //@line 1157
  STACKTOP = sp; //@line 1159
  return $self | 0; //@line 1159
 }
 HEAP32[$rotation1 >> 2] = $0 + $rem & 3; //@line 1163
 $2 = $self + 12 | 0; //@line 1165
 HEAP32[$oldAabb_i_0_cast2 >> 2] = HEAP32[$2 >> 2]; //@line 1166
 HEAP32[$oldAabb_i_0_cast2 + 4 >> 2] = HEAP32[$2 + 4 >> 2]; //@line 1166
 HEAP32[$oldAabb_i_0_cast2 + 8 >> 2] = HEAP32[$2 + 8 >> 2]; //@line 1166
 HEAP32[$oldAabb_i_0_cast2 + 12 >> 2] = HEAP32[$2 + 12 >> 2]; //@line 1166
 $aabb11_sroa_0_0_tmp13_idx_i = $self + 12 | 0; //@line 1167
 $aabb11_sroa_0_0_copyload14_i = (copyTempFloat($aabb11_sroa_0_0_tmp13_idx_i | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1168
 $aabb11_sroa_1_4_tmp13_idx16_i = $self + 16 | 0; //@line 1169
 $aabb11_sroa_1_4_copyload17_i = (copyTempFloat($aabb11_sroa_1_4_tmp13_idx16_i | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1170
 $aabb11_sroa_2_8_tmp13_idx19_i = $self + 20 | 0; //@line 1171
 $aabb11_sroa_2_8_copyload20_i = (copyTempFloat($aabb11_sroa_2_8_tmp13_idx19_i | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1172
 $aabb11_sroa_3_12_tmp13_idx22_i = $self + 24 | 0; //@line 1173
 $aabb11_sroa_3_12_copyload23_i = (copyTempFloat($aabb11_sroa_3_12_tmp13_idx22_i | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1174
 if (($rem | 0) == 3 | ($rem | 0) == 1) {
  $aabb11_sroa_1_4_copyload1728_i = $aabb11_sroa_3_12_copyload23_i + ($aabb11_sroa_0_0_copyload14_i - $aabb11_sroa_2_8_copyload20_i); //@line 1181
  $aabb11_sroa_2_8_copyload2029_i = $aabb11_sroa_0_0_copyload14_i - ($aabb11_sroa_1_4_copyload17_i - $aabb11_sroa_3_12_copyload23_i); //@line 1181
 } else {
  $aabb11_sroa_1_4_copyload1728_i = $aabb11_sroa_1_4_copyload17_i; //@line 1183
  $aabb11_sroa_2_8_copyload2029_i = $aabb11_sroa_2_8_copyload20_i; //@line 1183
 }
 HEAPF32[$aabb11_sroa_0_0_tmp13_idx_i >> 2] = $aabb11_sroa_0_0_copyload14_i; //@line 1187
 HEAPF32[$aabb11_sroa_1_4_tmp13_idx16_i >> 2] = $aabb11_sroa_1_4_copyload1728_i; //@line 1188
 HEAPF32[$aabb11_sroa_2_8_tmp13_idx19_i >> 2] = $aabb11_sroa_2_8_copyload2029_i; //@line 1189
 HEAPF32[$aabb11_sroa_3_12_tmp13_idx22_i >> 2] = $aabb11_sroa_3_12_copyload23_i; //@line 1190
 HEAP32[$1 >> 2] = HEAP32[$oldAabb_i_0_cast2 >> 2]; //@line 1191
 HEAP32[$1 + 4 >> 2] = HEAP32[$oldAabb_i_0_cast2 + 4 >> 2]; //@line 1191
 HEAP32[$1 + 8 >> 2] = HEAP32[$oldAabb_i_0_cast2 + 8 >> 2]; //@line 1191
 HEAP32[$1 + 12 >> 2] = HEAP32[$oldAabb_i_0_cast2 + 12 >> 2]; //@line 1191
 $3 = $data_i + 16 | 0; //@line 1193
 HEAP32[$3 >> 2] = HEAP32[$2 >> 2]; //@line 1194
 HEAP32[$3 + 4 >> 2] = HEAP32[$2 + 4 >> 2]; //@line 1194
 HEAP32[$3 + 8 >> 2] = HEAP32[$2 + 8 >> 2]; //@line 1194
 HEAP32[$3 + 12 >> 2] = HEAP32[$2 + 12 >> 2]; //@line 1194
 HEAP32[$data_i + 32 >> 2] = $rem; //@line 1196
 _AQList_iterate(HEAP32[$self + 52 >> 2] | 0, 21, $1) | 0; //@line 1199
 $$etemp$1$0 = 16; //@line 1201
 $$etemp$1$1 = 0; //@line 1202
 STACKTOP = sp; //@line 1204
 return $self | 0; //@line 1204
}
function __AQDdvt_removeParticleChild($self, $particle, $aabb) {
 $self = $self | 0;
 $particle = $particle | 0;
 $aabb = $aabb | 0;
 var $0 = 0, $right_i21 = 0, $2 = 0.0, $9 = 0.0, $removed_0 = 0, $10 = 0, $18 = 0.0, $removed_1 = 0, $19 = 0, $27 = 0.0, $removed_2 = 0, $28 = 0, $removed_376 = 0, $length = 0, $removed_377 = 0, label = 0;
 $0 = HEAP32[$self + 32 >> 2] | 0; //@line 6329
 $right_i21 = $aabb + 4 | 0; //@line 6332
 $2 = +HEAPF32[$right_i21 >> 2]; //@line 6333
 do {
  if (+HEAPF32[$0 + 24 >> 2] < $2) {
   if (+HEAPF32[$0 + 16 >> 2] <= +HEAPF32[$aabb + 12 >> 2]) {
    $removed_0 = 0; //@line 6345
    $9 = $2; //@line 6345
    break;
   }
   if (+HEAPF32[$0 + 20 >> 2] >= +HEAPF32[$aabb >> 2]) {
    $removed_0 = 0; //@line 6355
    $9 = $2; //@line 6355
    break;
   }
   if (+HEAPF32[$0 + 12 >> 2] <= +HEAPF32[$aabb + 8 >> 2]) {
    $removed_0 = 0; //@line 6365
    $9 = $2; //@line 6365
    break;
   }
   __AQDdvt_removeParticle($0, $particle, $aabb); //@line 6368
   $removed_0 = 1; //@line 6371
   $9 = +HEAPF32[$right_i21 >> 2]; //@line 6371
  } else {
   $removed_0 = 0; //@line 6373
   $9 = $2; //@line 6373
  }
 } while (0);
 $10 = HEAP32[$self + 36 >> 2] | 0; //@line 6379
 do {
  if (+HEAPF32[$10 + 24 >> 2] < $9) {
   if (+HEAPF32[$10 + 16 >> 2] <= +HEAPF32[$aabb + 12 >> 2]) {
    $removed_1 = $removed_0; //@line 6393
    $18 = $9; //@line 6393
    break;
   }
   if (+HEAPF32[$10 + 20 >> 2] >= +HEAPF32[$aabb >> 2]) {
    $removed_1 = $removed_0; //@line 6403
    $18 = $9; //@line 6403
    break;
   }
   if (+HEAPF32[$10 + 12 >> 2] <= +HEAPF32[$aabb + 8 >> 2]) {
    $removed_1 = $removed_0; //@line 6413
    $18 = $9; //@line 6413
    break;
   }
   __AQDdvt_removeParticle($10, $particle, $aabb); //@line 6416
   $removed_1 = 1; //@line 6419
   $18 = +HEAPF32[$right_i21 >> 2]; //@line 6419
  } else {
   $removed_1 = $removed_0; //@line 6421
   $18 = $9; //@line 6421
  }
 } while (0);
 $19 = HEAP32[$self + 40 >> 2] | 0; //@line 6427
 do {
  if (+HEAPF32[$19 + 24 >> 2] < $18) {
   if (+HEAPF32[$19 + 16 >> 2] <= +HEAPF32[$aabb + 12 >> 2]) {
    $removed_2 = $removed_1; //@line 6441
    $27 = $18; //@line 6441
    break;
   }
   if (+HEAPF32[$19 + 20 >> 2] >= +HEAPF32[$aabb >> 2]) {
    $removed_2 = $removed_1; //@line 6451
    $27 = $18; //@line 6451
    break;
   }
   if (+HEAPF32[$19 + 12 >> 2] <= +HEAPF32[$aabb + 8 >> 2]) {
    $removed_2 = $removed_1; //@line 6461
    $27 = $18; //@line 6461
    break;
   }
   __AQDdvt_removeParticle($19, $particle, $aabb); //@line 6464
   $removed_2 = 1; //@line 6467
   $27 = +HEAPF32[$right_i21 >> 2]; //@line 6467
  } else {
   $removed_2 = $removed_1; //@line 6469
   $27 = $18; //@line 6469
  }
 } while (0);
 $28 = HEAP32[$self + 44 >> 2] | 0; //@line 6475
 do {
  if (+HEAPF32[$28 + 24 >> 2] < $27) {
   if (+HEAPF32[$28 + 16 >> 2] <= +HEAPF32[$aabb + 12 >> 2]) {
    label = 456; //@line 6489
    break;
   }
   if (+HEAPF32[$28 + 20 >> 2] >= +HEAPF32[$aabb >> 2]) {
    label = 456; //@line 6499
    break;
   }
   if (+HEAPF32[$28 + 12 >> 2] <= +HEAPF32[$aabb + 8 >> 2]) {
    label = 456; //@line 6509
    break;
   }
   __AQDdvt_removeParticle($28, $particle, $aabb); //@line 6512
   $removed_376 = 1; //@line 6514
  } else {
   label = 456; //@line 6516
  }
 } while (0);
 do {
  if ((label | 0) == 456) {
   if (($removed_2 | 0) == 0) {
    $removed_377 = 0; //@line 6524
   } else {
    $removed_376 = $removed_2; //@line 6526
    break;
   }
   return $removed_377 | 0; //@line 6530
  }
 } while (0);
 $length = $self + 240 | 0; //@line 6534
 HEAP32[$length >> 2] = (HEAP32[$length >> 2] | 0) - 1; //@line 6537
 $removed_377 = $removed_376; //@line 6539
 return $removed_377 | 0; //@line 6541
}
function _AQParticle_solve($self, $other, $col) {
 $self = $self | 0;
 $other = $other | 0;
 $col = $col | 0;
 var $mul = 0.0, $mul6 = 0.0, $mul8 = 0.0, $4 = 0.0, $5 = 0.0, $add = 0.0, $x = 0, $x12 = 0, $sub = 0.0, $y = 0, $y13 = 0, $sub14 = 0.0, $conv2_i = 0.0, $x15 = 0, $x16 = 0, $sub17 = 0.0, $y18 = 0, $y19 = 0, $sub20 = 0.0, $conv2_i71 = 0.0, $call22 = 0.0, $conv28 = 0.0, $sub31 = 0.0, $avy_0 = 0.0, $avx_0 = 0.0, $sub40 = 0.0, $bvx_0 = 0.0, $bvy_0 = 0.0, $tobool48 = 0, $bm_0 = 0.0, $am_0 = 0.0, $isTrigger = 0, $isTrigger55 = 0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0;
 $mul = +HEAPF32[$self + 36 >> 2] * +HEAPF32[$other + 36 >> 2]; //@line 8939
 $mul6 = +HEAPF32[$col + 8 >> 2] * $mul; //@line 8942
 $mul8 = $mul * +HEAPF32[$col + 12 >> 2]; //@line 8945
 $4 = +HEAPF32[$self + 28 >> 2]; //@line 8947
 $5 = +HEAPF32[$other + 28 >> 2]; //@line 8949
 $add = $4 + $5; //@line 8950
 $x = $self + 48 | 0; //@line 8953
 $x12 = $self + 12 | 0; //@line 8955
 $sub = +HEAPF32[$x >> 2] - +HEAPF32[$x12 >> 2]; //@line 8957
 $y = $self + 52 | 0; //@line 8958
 $y13 = $self + 16 | 0; //@line 8960
 $sub14 = +HEAPF32[$y >> 2] - +HEAPF32[$y13 >> 2]; //@line 8962
 $conv2_i = +Math_sqrt(+($sub * $sub + $sub14 * $sub14)); //@line 8966
 $x15 = $other + 48 | 0; //@line 8967
 $x16 = $other + 12 | 0; //@line 8969
 $sub17 = +HEAPF32[$x15 >> 2] - +HEAPF32[$x16 >> 2]; //@line 8971
 $y18 = $other + 52 | 0; //@line 8972
 $y19 = $other + 16 | 0; //@line 8974
 $sub20 = +HEAPF32[$y18 >> 2] - +HEAPF32[$y19 >> 2]; //@line 8976
 $conv2_i71 = +Math_sqrt(+($sub17 * $sub17 + $sub20 * $sub20)); //@line 8980
 $call22 = +Math_abs(+(+HEAPF32[$col + 16 >> 2])); //@line 8984
 $conv28 = $call22 * +HEAPF32[$self + 32 >> 2] * +HEAPF32[$other + 32 >> 2]; //@line 8993
 if ($conv2_i != 0.0) {
  $sub31 = $conv2_i - $conv28; //@line 8998
  $avx_0 = $sub31 * ($sub / $conv2_i); //@line 9003
  $avy_0 = $sub31 * ($sub14 / $conv2_i); //@line 9003
 } else {
  $avx_0 = $sub; //@line 9005
  $avy_0 = $sub14; //@line 9005
 }
 if ($conv2_i71 != 0.0) {
  $sub40 = $conv2_i71 - $conv28; //@line 9013
  $bvy_0 = $sub40 * ($sub20 / $conv2_i71); //@line 9018
  $bvx_0 = $sub40 * ($sub17 / $conv2_i71); //@line 9018
 } else {
  $bvy_0 = $sub20; //@line 9020
  $bvx_0 = $sub17; //@line 9020
 }
 if ((HEAP8[$self + 96 | 0] | 0) == 0) {
  $tobool48 = (HEAP8[$other + 96 | 0] | 0) == 0; //@line 9031
  $am_0 = $tobool48 ? $5 / $add : 1.0; //@line 9035
  $bm_0 = $tobool48 ? $4 / $add : 0.0; //@line 9035
 } else {
  $am_0 = 0.0; //@line 9037
  $bm_0 = 1.0; //@line 9037
 }
 $isTrigger = $self + 97 | 0; //@line 9041
 if ((HEAP8[$isTrigger] | 0) != 0) {
  FUNCTION_TABLE_viii[HEAP32[$self + 104 >> 2] & 31]($self, $other, HEAP32[$self + 108 >> 2] | 0); //@line 9052
 }
 $isTrigger55 = $other + 97 | 0; //@line 9055
 if ((HEAP8[$isTrigger55] | 0) != 0) {
  FUNCTION_TABLE_viii[HEAP32[$other + 104 >> 2] & 31]($other, $self, HEAP32[$other + 108 >> 2] | 0); //@line 9066
 }
 if ((HEAP8[$isTrigger] | 0) != 0) {
  return;
 }
 if ((HEAP8[$isTrigger55] | 0) != 0) {
  return;
 }
 $31 = +HEAPF32[$x12 >> 2]; //@line 9081
 HEAPF32[$x >> 2] = $avx_0 + $31; //@line 9083
 $32 = +HEAPF32[$y13 >> 2]; //@line 9084
 HEAPF32[$y >> 2] = $avy_0 + $32; //@line 9086
 HEAPF32[$x12 >> 2] = $mul6 * $am_0 + $31; //@line 9089
 HEAPF32[$y13 >> 2] = $mul8 * $am_0 + $32; //@line 9092
 $33 = +HEAPF32[$x16 >> 2]; //@line 9093
 HEAPF32[$x15 >> 2] = $bvx_0 + $33; //@line 9095
 $34 = +HEAPF32[$y19 >> 2]; //@line 9096
 HEAPF32[$y18 >> 2] = $bvy_0 + $34; //@line 9098
 HEAPF32[$x16 >> 2] = $33 - $mul6 * $bm_0; //@line 9101
 HEAPF32[$y19 >> 2] = $34 - $mul8 * $bm_0; //@line 9104
 return;
}
function _AQDraw_polygon($vertices, $next, $sides, $center, $radius, $angle) {
 $vertices = $vertices | 0;
 $next = $next | 0;
 $sides = $sides | 0;
 $center = $center | 0;
 $radius = +$radius;
 $angle = +$angle;
 var $conv_i = 0.0, $conv1_i = 0.0, $call3_i = 0.0, $conv4_i = 0.0, $conv7_i = 0.0, $conv_i_i = 0.0, $conv1_i_i = 0.0, $call3_i_i = 0.0, $add_i_i = 0.0, $add6_i_i = 0.0, $center_19_val = 0.0, $center_08_val = 0.0, $i_079 = 0, $vertices_addr_078 = 0, $v2_sroa_0_0_load506977 = 0.0, $v2_sroa_1_4_load517076 = 0.0, $v_sroa_0_0_load537175 = 0.0, $v_sroa_1_4_load577274 = 0.0, $add_i20 = 0.0, $add3_i21 = 0.0, $call_i48 = 0, $call6_i = 0, $4 = 0, $add_i31 = 0.0, $inc = 0, $vertices_addr_0_lcssa = 0, tempParam = 0, sp = 0;
 sp = STACKTOP; //@line 3226
 tempParam = $center; //@line 3227
 $center = STACKTOP; //@line 3227
 STACKTOP = STACKTOP + 8 | 0; //@line 3227
 HEAP32[$center >> 2] = HEAP32[tempParam >> 2]; //@line 3227
 HEAP32[$center + 4 >> 2] = HEAP32[tempParam + 4 >> 2]; //@line 3227
 $conv_i = 6.283185307179586 / +($sides | 0); //@line 3231
 $conv1_i = +Math_cos(+$conv_i); //@line 3233
 $call3_i = +Math_sin(+$conv_i); //@line 3234
 $conv4_i = -0.0 - $call3_i; //@line 3236
 $conv7_i = $call3_i; //@line 3237
 $conv_i_i = $angle; //@line 3238
 $conv1_i_i = +Math_cos(+$conv_i_i); //@line 3240
 $call3_i_i = +Math_sin(+$conv_i_i); //@line 3241
 $add_i_i = $conv1_i_i * 0.0 + (-0.0 - $call3_i_i) * $radius; //@line 3247
 $add6_i_i = $conv1_i_i * $radius + $call3_i_i * 0.0; //@line 3250
 if (($sides | 0) <= 0) {
  $vertices_addr_0_lcssa = $vertices; //@line 3254
  STACKTOP = sp; //@line 3256
  return $vertices_addr_0_lcssa | 0; //@line 3256
 }
 $center_19_val = +HEAPF32[$center + 4 >> 2]; //@line 3260
 $center_08_val = +HEAPF32[$center >> 2]; //@line 3261
 $v_sroa_1_4_load577274 = $center_19_val + $add6_i_i; //@line 3271
 $v_sroa_0_0_load537175 = $center_08_val + $add_i_i; //@line 3271
 $v2_sroa_1_4_load517076 = $conv1_i * $add6_i_i + $conv7_i * $add_i_i; //@line 3271
 $v2_sroa_0_0_load506977 = $conv4_i * $add6_i_i + $conv1_i * $add_i_i; //@line 3271
 $vertices_addr_078 = $vertices; //@line 3271
 $i_079 = 0; //@line 3271
 while (1) {
  $add_i20 = $v2_sroa_0_0_load506977 + $center_08_val; //@line 3279
  $add3_i21 = $v2_sroa_1_4_load517076 + $center_19_val; //@line 3280
  HEAPF32[$vertices_addr_078 >> 2] = $v_sroa_0_0_load537175; //@line 3282
  HEAPF32[$vertices_addr_078 + 4 >> 2] = $v_sroa_1_4_load577274; //@line 3285
  $call_i48 = FUNCTION_TABLE_ii[$next & 127]($vertices_addr_078) | 0; //@line 3286
  HEAPF32[$call_i48 >> 2] = $add_i20; //@line 3288
  HEAPF32[$call_i48 + 4 >> 2] = $add3_i21; //@line 3290
  $call6_i = FUNCTION_TABLE_ii[$next & 127]($call_i48) | 0; //@line 3291
  HEAPF32[$call6_i >> 2] = $center_08_val; //@line 3293
  HEAPF32[$call6_i + 4 >> 2] = $center_19_val; //@line 3295
  $4 = FUNCTION_TABLE_ii[$next & 127]($call6_i) | 0; //@line 3297
  $add_i31 = $conv4_i * $v2_sroa_1_4_load517076 + $conv1_i * $v2_sroa_0_0_load506977; //@line 3300
  $inc = $i_079 + 1 | 0; //@line 3304
  if (($inc | 0) < ($sides | 0)) {
   $v_sroa_1_4_load577274 = $add3_i21; //@line 3308
   $v_sroa_0_0_load537175 = $add_i20; //@line 3308
   $v2_sroa_1_4_load517076 = $conv1_i * $v2_sroa_1_4_load517076 + $conv7_i * $v2_sroa_0_0_load506977; //@line 3308
   $v2_sroa_0_0_load506977 = $add_i31; //@line 3308
   $vertices_addr_078 = $4; //@line 3308
   $i_079 = $inc; //@line 3308
  } else {
   $vertices_addr_0_lcssa = $4; //@line 3310
   break;
  }
 }
 STACKTOP = sp; //@line 3315
 return $vertices_addr_0_lcssa | 0; //@line 3315
}
function __AQDdvt_wakeParticle($self, $particle, $aabb) {
 $self = $self | 0;
 $particle = $particle | 0;
 $aabb = $aabb | 0;
 var $0 = 0, $right_i = 0, $2 = 0.0, $9 = 0.0, $contained_0 = 0, $10 = 0, $18 = 0.0, $contained_1 = 0, $19 = 0, $27 = 0.0, $contained_2 = 0, $28 = 0, label = 0;
 $0 = HEAP32[$self + 32 >> 2] | 0; //@line 7892
 if (($0 | 0) == 0) {
  HEAP32[$self + 28 >> 2] = 0; //@line 7897
  return;
 }
 $right_i = $aabb + 4 | 0; //@line 7903
 $2 = +HEAPF32[$right_i >> 2]; //@line 7904
 do {
  if (+HEAPF32[$0 + 24 >> 2] < $2) {
   if (+HEAPF32[$0 + 16 >> 2] <= +HEAPF32[$aabb + 12 >> 2]) {
    $contained_0 = 0; //@line 7916
    $9 = $2; //@line 7916
    break;
   }
   if (+HEAPF32[$0 + 20 >> 2] >= +HEAPF32[$aabb >> 2]) {
    $contained_0 = 0; //@line 7926
    $9 = $2; //@line 7926
    break;
   }
   if (+HEAPF32[$0 + 12 >> 2] <= +HEAPF32[$aabb + 8 >> 2]) {
    $contained_0 = 0; //@line 7936
    $9 = $2; //@line 7936
    break;
   }
   __AQDdvt_wakeParticle($0, $particle, $aabb); //@line 7939
   $contained_0 = 1; //@line 7942
   $9 = +HEAPF32[$right_i >> 2]; //@line 7942
  } else {
   $contained_0 = 0; //@line 7944
   $9 = $2; //@line 7944
  }
 } while (0);
 $10 = HEAP32[$self + 36 >> 2] | 0; //@line 7950
 do {
  if (+HEAPF32[$10 + 24 >> 2] < $9) {
   if (+HEAPF32[$10 + 16 >> 2] <= +HEAPF32[$aabb + 12 >> 2]) {
    $contained_1 = $contained_0; //@line 7964
    $18 = $9; //@line 7964
    break;
   }
   if (+HEAPF32[$10 + 20 >> 2] >= +HEAPF32[$aabb >> 2]) {
    $contained_1 = $contained_0; //@line 7974
    $18 = $9; //@line 7974
    break;
   }
   if (+HEAPF32[$10 + 12 >> 2] <= +HEAPF32[$aabb + 8 >> 2]) {
    $contained_1 = $contained_0; //@line 7984
    $18 = $9; //@line 7984
    break;
   }
   __AQDdvt_wakeParticle($10, $particle, $aabb); //@line 7987
   $contained_1 = 1; //@line 7990
   $18 = +HEAPF32[$right_i >> 2]; //@line 7990
  } else {
   $contained_1 = $contained_0; //@line 7992
   $18 = $9; //@line 7992
  }
 } while (0);
 $19 = HEAP32[$self + 40 >> 2] | 0; //@line 7998
 do {
  if (+HEAPF32[$19 + 24 >> 2] < $18) {
   if (+HEAPF32[$19 + 16 >> 2] <= +HEAPF32[$aabb + 12 >> 2]) {
    $contained_2 = $contained_1; //@line 8012
    $27 = $18; //@line 8012
    break;
   }
   if (+HEAPF32[$19 + 20 >> 2] >= +HEAPF32[$aabb >> 2]) {
    $contained_2 = $contained_1; //@line 8022
    $27 = $18; //@line 8022
    break;
   }
   if (+HEAPF32[$19 + 12 >> 2] <= +HEAPF32[$aabb + 8 >> 2]) {
    $contained_2 = $contained_1; //@line 8032
    $27 = $18; //@line 8032
    break;
   }
   __AQDdvt_wakeParticle($19, $particle, $aabb); //@line 8035
   $contained_2 = 1; //@line 8038
   $27 = +HEAPF32[$right_i >> 2]; //@line 8038
  } else {
   $contained_2 = $contained_1; //@line 8040
   $27 = $18; //@line 8040
  }
 } while (0);
 $28 = HEAP32[$self + 44 >> 2] | 0; //@line 8046
 do {
  if (+HEAPF32[$28 + 24 >> 2] < $27) {
   if (+HEAPF32[$28 + 16 >> 2] <= +HEAPF32[$aabb + 12 >> 2]) {
    label = 644; //@line 8060
    break;
   }
   if (+HEAPF32[$28 + 20 >> 2] >= +HEAPF32[$aabb >> 2]) {
    label = 644; //@line 8070
    break;
   }
   if (+HEAPF32[$28 + 12 >> 2] <= +HEAPF32[$aabb + 8 >> 2]) {
    label = 644; //@line 8080
    break;
   }
   __AQDdvt_wakeParticle($28, $particle, $aabb); //@line 8083
  } else {
   label = 644; //@line 8086
  }
 } while (0);
 do {
  if ((label | 0) == 644) {
   if (($contained_2 | 0) != 0) {
    break;
   }
   return;
  }
 } while (0);
 HEAP32[$self + 28 >> 2] = 0; //@line 8100
 return;
}
function __AQDdvt_updateParticleLeaf($self, $particle, $old, $new) {
 $self = $self | 0;
 $particle = $particle | 0;
 $old = $old | 0;
 $new = $new | 0;
 var $aabb_i = 0, $aabb = 0, $0 = 0.0, $length1_i = 0, $8 = 0, $index_0_i = 0, $14 = 0, $15 = 0, $length1_i_i = 0, $23 = 0, $index_0_i_i = 0, $arrayidx_i_i = 0, label = 0, sp = 0;
 sp = STACKTOP; //@line 5755
 STACKTOP = STACKTOP + 16 | 0; //@line 5755
 $aabb_i = sp | 0; //@line 5756
 $aabb = $self + 12 | 0; //@line 5757
 $0 = +HEAPF32[$self + 24 >> 2]; //@line 5759
 do {
  if ($0 < +HEAPF32[$new + 4 >> 2]) {
   if (+HEAPF32[$self + 16 >> 2] <= +HEAPF32[$new + 12 >> 2]) {
    break;
   }
   if (+HEAPF32[$self + 20 >> 2] >= +HEAPF32[$new >> 2]) {
    break;
   }
   if (+HEAPF32[$aabb >> 2] <= +HEAPF32[$new + 8 >> 2]) {
    break;
   }
   $length1_i = $self + 240 | 0; //@line 5793
   $8 = HEAP32[$length1_i >> 2] | 0; //@line 5794
   $index_0_i = 0; //@line 5796
   while (1) {
    if (($index_0_i | 0) >= ($8 | 0)) {
     break;
    }
    if ((HEAP32[$self + 48 + ($index_0_i << 2) >> 2] | 0) == ($particle | 0)) {
     label = 361; //@line 5810
     break;
    } else {
     $index_0_i = $index_0_i + 1 | 0; //@line 5813
    }
   }
   do {
    if ((label | 0) == 361) {
     if (($index_0_i | 0) == -1) {
      break;
     }
     STACKTOP = sp; //@line 5823
     return;
    }
   } while (0);
   _AQParticle_aabb($aabb_i, $particle); //@line 5827
   HEAP32[$self + 28 >> 2] = 0; //@line 5829
   do {
    if ((HEAP32[$self + 32 >> 2] | 0) == 0) {
     if ((HEAP32[$length1_i >> 2] | 0) >= 48) {
      __AQDdvt_toChildren($self); //@line 5840
      break;
     }
     $14 = _aqretain($particle) | 0; //@line 5846
     $15 = HEAP32[$length1_i >> 2] | 0; //@line 5847
     HEAP32[$length1_i >> 2] = $15 + 1; //@line 5849
     HEAP32[$self + 48 + ($15 << 2) >> 2] = $14; //@line 5851
     STACKTOP = sp; //@line 5853
     return;
    }
   } while (0);
   __AQDdvt_addParticleChild($self, $particle, $aabb_i); //@line 5856
   STACKTOP = sp; //@line 5857
   return;
  }
 } while (0);
 if ($0 >= +HEAPF32[$old + 4 >> 2]) {
  STACKTOP = sp; //@line 5865
  return;
 }
 if (+HEAPF32[$self + 16 >> 2] <= +HEAPF32[$old + 12 >> 2]) {
  STACKTOP = sp; //@line 5874
  return;
 }
 if (+HEAPF32[$self + 20 >> 2] >= +HEAPF32[$old >> 2]) {
  STACKTOP = sp; //@line 5883
  return;
 }
 if (+HEAPF32[$aabb >> 2] <= +HEAPF32[$old + 8 >> 2]) {
  STACKTOP = sp; //@line 5892
  return;
 }
 $length1_i_i = $self + 240 | 0; //@line 5894
 $23 = HEAP32[$length1_i_i >> 2] | 0; //@line 5895
 $index_0_i_i = 0; //@line 5897
 while (1) {
  if (($index_0_i_i | 0) >= ($23 | 0)) {
   label = 381; //@line 5903
   break;
  }
  $arrayidx_i_i = $self + 48 + ($index_0_i_i << 2) | 0; //@line 5906
  if ((HEAP32[$arrayidx_i_i >> 2] | 0) == ($particle | 0)) {
   break;
  } else {
   $index_0_i_i = $index_0_i_i + 1 | 0; //@line 5914
  }
 }
 if ((label | 0) == 381) {
  STACKTOP = sp; //@line 5918
  return;
 }
 if (($index_0_i_i | 0) == -1) {
  STACKTOP = sp; //@line 5923
  return;
 }
 HEAP32[$arrayidx_i_i >> 2] = HEAP32[$self + 48 + ($23 - 1 << 2) >> 2]; //@line 5928
 HEAP32[$length1_i_i >> 2] = (HEAP32[$length1_i_i >> 2] | 0) - 1; //@line 5931
 _aqautorelease($particle) | 0; //@line 5933
 STACKTOP = sp; //@line 5935
 return;
}
function _BBRoom_move($self, $diff) {
 $self = $self | 0;
 $diff = $diff | 0;
 var $diff_0_val = 0.0, $diff_1_val = 0.0, $aabb11_sroa_0_0_tmp13_idx = 0, $aabb11_sroa_0_0_copyload = 0.0, $aabb11_sroa_1_4_tmp13_idx21 = 0, $aabb11_sroa_1_4_copyload = 0.0, $aabb11_sroa_2_8_tmp13_idx22 = 0, $aabb11_sroa_2_8_copyload = 0.0, $aabb11_sroa_3_12_tmp13_idx23 = 0, $add5_i = 0.0, $world3 = 0, $0 = 0, $walls_i14 = 0, $1 = 0, $2 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $9 = 0, $10 = 0, $11 = 0, tempParam = 0, sp = 0;
 sp = STACKTOP; //@line 4395
 tempParam = $diff; //@line 4396
 $diff = STACKTOP; //@line 4396
 STACKTOP = STACKTOP + 8 | 0; //@line 4396
 HEAP32[$diff >> 2] = HEAP32[tempParam >> 2]; //@line 4396
 HEAP32[$diff + 4 >> 2] = HEAP32[tempParam + 4 >> 2]; //@line 4396
 $diff_0_val = +HEAPF32[$diff >> 2]; //@line 4398
 $diff_1_val = +HEAPF32[$diff + 4 >> 2]; //@line 4400
 $aabb11_sroa_0_0_tmp13_idx = $self + 24 | 0; //@line 4401
 $aabb11_sroa_0_0_copyload = (copyTempFloat($aabb11_sroa_0_0_tmp13_idx | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4402
 $aabb11_sroa_1_4_tmp13_idx21 = $self + 28 | 0; //@line 4403
 $aabb11_sroa_1_4_copyload = (copyTempFloat($aabb11_sroa_1_4_tmp13_idx21 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4404
 $aabb11_sroa_2_8_tmp13_idx22 = $self + 32 | 0; //@line 4405
 $aabb11_sroa_2_8_copyload = (copyTempFloat($aabb11_sroa_2_8_tmp13_idx22 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4406
 $aabb11_sroa_3_12_tmp13_idx23 = $self + 36 | 0; //@line 4407
 $add5_i = $diff_0_val + (copyTempFloat($aabb11_sroa_3_12_tmp13_idx23 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4412
 HEAPF32[$aabb11_sroa_0_0_tmp13_idx >> 2] = $diff_1_val + $aabb11_sroa_0_0_copyload; //@line 4413
 HEAPF32[$aabb11_sroa_1_4_tmp13_idx21 >> 2] = $diff_0_val + $aabb11_sroa_1_4_copyload; //@line 4414
 HEAPF32[$aabb11_sroa_2_8_tmp13_idx22 >> 2] = $diff_1_val + $aabb11_sroa_2_8_copyload; //@line 4415
 HEAPF32[$aabb11_sroa_3_12_tmp13_idx23 >> 2] = $add5_i; //@line 4416
 $world3 = $self + 40 | 0; //@line 4417
 $0 = HEAP32[$world3 >> 2] | 0; //@line 4418
 $walls_i14 = $self + 44 | 0; //@line 4420
 $1 = HEAP32[$walls_i14 >> 2] | 0; //@line 4421
 if (($0 | 0) == 0) {
  $10 = $diff; //@line 4424
  _AQList_iterate($1, 17, $10) | 0; //@line 4425
  $11 = HEAP32[$self + 48 >> 2] | 0; //@line 4427
  _AQList_iterate($11, 27, $10) | 0; //@line 4428
  STACKTOP = sp; //@line 4429
  return $self | 0; //@line 4429
 } else {
  $2 = $0; //@line 4431
  _AQList_iterate($1, 31, $2) | 0; //@line 4432
  $4 = HEAP32[$world3 >> 2] | 0; //@line 4434
  _aqrelease($4) | 0; //@line 4435
  HEAP32[$world3 >> 2] = 0; //@line 4436
  $5 = HEAP32[$walls_i14 >> 2] | 0; //@line 4437
  $6 = $diff; //@line 4438
  _AQList_iterate($5, 17, $6) | 0; //@line 4439
  $7 = HEAP32[$self + 48 >> 2] | 0; //@line 4441
  _AQList_iterate($7, 27, $6) | 0; //@line 4442
  HEAP32[$world3 >> 2] = _aqretain($2) | 0; //@line 4445
  $9 = HEAP32[$walls_i14 >> 2] | 0; //@line 4446
  _AQList_iterate($9, 49, $2) | 0; //@line 4447
  STACKTOP = sp; //@line 4449
  return $self | 0; //@line 4449
 }
 return 0; //@line 4451
}
function _BBWall_create($aabb, $wallType) {
 $aabb = $aabb | 0;
 $wallType = $wallType | 0;
 var $call = 0, $0 = 0, $aabb1 = 0, $1 = 0, $aabb14_sroa_0_0_copyload = 0.0, $aabb14_sroa_1_4_copyload = 0.0, $aabb14_sroa_2_8_copyload = 0.0, $aabb14_sroa_3_12_copyload = 0.0, $sub_i = 0.0, $sub1_i = 0.0, $cmp = 0, $div = 0.0, $3 = 0.0, $4 = 0.0, $add = 0.0, $add14 = 0.0, $add16 = 0.0, $5 = 0, $distance_031 = 0.0, $call19 = 0, $6 = 0, $tmp_sroa_0_0_insert_insert$1 = 0.0, tempParam = 0, sp = 0;
 sp = STACKTOP; //@line 4802
 tempParam = $aabb; //@line 4803
 $aabb = STACKTOP; //@line 4803
 STACKTOP = STACKTOP + 16 | 0; //@line 4803
 HEAP32[$aabb >> 2] = HEAP32[tempParam >> 2]; //@line 4803
 HEAP32[$aabb + 4 >> 2] = HEAP32[tempParam + 4 >> 2]; //@line 4803
 HEAP32[$aabb + 8 >> 2] = HEAP32[tempParam + 8 >> 2]; //@line 4803
 HEAP32[$aabb + 12 >> 2] = HEAP32[tempParam + 12 >> 2]; //@line 4803
 $call = _aqcreate(1680) | 0; //@line 4804
 $0 = $call; //@line 4805
 $aabb1 = $call + 12 | 0; //@line 4806
 $1 = $aabb; //@line 4807
 HEAP32[$aabb1 >> 2] = HEAP32[$1 >> 2]; //@line 4808
 HEAP32[$aabb1 + 4 >> 2] = HEAP32[$1 + 4 >> 2]; //@line 4808
 HEAP32[$aabb1 + 8 >> 2] = HEAP32[$1 + 8 >> 2]; //@line 4808
 HEAP32[$aabb1 + 12 >> 2] = HEAP32[$1 + 12 >> 2]; //@line 4808
 HEAP32[$call + 36 >> 2] = $wallType; //@line 4811
 $aabb14_sroa_0_0_copyload = (copyTempFloat($aabb | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4813
 $aabb14_sroa_1_4_copyload = (copyTempFloat($aabb + 4 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4815
 $aabb14_sroa_2_8_copyload = (copyTempFloat($aabb + 8 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4817
 $aabb14_sroa_3_12_copyload = (copyTempFloat($aabb + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4819
 $sub_i = $aabb14_sroa_1_4_copyload - $aabb14_sroa_3_12_copyload; //@line 4820
 $sub1_i = $aabb14_sroa_0_0_copyload - $aabb14_sroa_2_8_copyload; //@line 4821
 $cmp = $sub_i < $sub1_i; //@line 4822
 $div = ($cmp ? $sub_i : $sub1_i) * .5; //@line 4824
 $3 = $cmp ? 1.0 : 0.0; //@line 4827
 $4 = $cmp ? 0.0 : 1.0; //@line 4828
 $add = $aabb14_sroa_3_12_copyload + $div; //@line 4830
 $add14 = $aabb14_sroa_2_8_copyload + $div; //@line 4831
 $add16 = ($cmp ? $sub1_i : $sub_i) - $div * 2.0 + .5; //@line 4833
 if ($add16 < 0.0) {
  STACKTOP = sp; //@line 4837
  return $0 | 0; //@line 4837
 }
 $5 = $call + 28 | 0; //@line 4840
 $distance_031 = 0.0; //@line 4842
 do {
  $call19 = _aqcreate(2208) | 0; //@line 4845
  $6 = $call19 + 12 | 0; //@line 4851
  $tmp_sroa_0_0_insert_insert$1 = +($add14 + $3 * $distance_031); //@line 4861
  HEAPF32[$6 >> 2] = $add + $4 * $distance_031; //@line 4863
  HEAPF32[$6 + 4 >> 2] = $tmp_sroa_0_0_insert_insert$1; //@line 4865
  HEAPF32[$call19 + 20 >> 2] = $div; //@line 4868
  HEAP8[$call19 + 96 | 0] = 1; //@line 4870
  _AQList_push(HEAP32[$5 >> 2] | 0, $call19) | 0; //@line 4873
  $distance_031 = $distance_031 + 1.0; //@line 4874
 } while ($distance_031 <= $add16);
 STACKTOP = sp; //@line 4884
 return $0 | 0; //@line 4884
}
function _AQDdvt_iteratePairs($self, $pairIterator, $ctx) {
 $self = $self | 0;
 $pairIterator = $pairIterator | 0;
 $ctx = $ctx | 0;
 var $isSleeping = 0, $tl = 0, $1 = 0, $2 = 0, $sub = 0, $sleeping_040 = 0, $i_039 = 0, $arrayidx = 0, $3 = 0, $sleeping_0_inc = 0, $add = 0, $5 = 0, $j_037 = 0, $inc15 = 0, $sleeping_0_lcssa = 0, $i_0_lcssa = 0, $sleeping_2 = 0, $tr = 0, $bl = 0, $br = 0;
 $isSleeping = $self + 28 | 0; //@line 8155
 if ((HEAP32[$isSleeping >> 2] | 0) != 0) {
  return;
 }
 $tl = $self + 32 | 0; //@line 8162
 $1 = HEAP32[$tl >> 2] | 0; //@line 8163
 if (($1 | 0) != 0) {
  _AQDdvt_iteratePairs($1, $pairIterator, $ctx); //@line 8167
  $tr = $self + 36 | 0; //@line 8168
  _AQDdvt_iteratePairs(HEAP32[$tr >> 2] | 0, $pairIterator, $ctx); //@line 8170
  $bl = $self + 40 | 0; //@line 8171
  _AQDdvt_iteratePairs(HEAP32[$bl >> 2] | 0, $pairIterator, $ctx); //@line 8173
  $br = $self + 44 | 0; //@line 8174
  _AQDdvt_iteratePairs(HEAP32[$br >> 2] | 0, $pairIterator, $ctx); //@line 8176
  if ((HEAP32[(HEAP32[$tl >> 2] | 0) + 28 >> 2] | 0) == 0) {
   return;
  }
  if ((HEAP32[(HEAP32[$tr >> 2] | 0) + 28 >> 2] | 0) == 0) {
   return;
  }
  if ((HEAP32[(HEAP32[$bl >> 2] | 0) + 28 >> 2] | 0) == 0) {
   return;
  }
  if ((HEAP32[(HEAP32[$br >> 2] | 0) + 28 >> 2] | 0) == 0) {
   return;
  }
  HEAP32[$isSleeping >> 2] = 1; //@line 8209
  return;
 }
 $2 = HEAP32[$self + 240 >> 2] | 0; //@line 8214
 $sub = $2 - 1 | 0; //@line 8215
 if (($sub | 0) > 0) {
  $i_039 = 0; //@line 8219
  $sleeping_040 = 0; //@line 8219
  while (1) {
   $arrayidx = $self + 48 + ($i_039 << 2) | 0; //@line 8223
   $3 = HEAP32[$arrayidx >> 2] | 0; //@line 8224
   $sleeping_0_inc = ((HEAP8[$3 + 98 | 0] | 0) != 0) + $sleeping_040 | 0; //@line 8229
   $add = $i_039 + 1 | 0; //@line 8230
   L821 : do {
    if (($add | 0) < ($2 | 0)) {
     $j_037 = $add; //@line 8235
     $5 = $3; //@line 8235
     while (1) {
      FUNCTION_TABLE_viii[$pairIterator & 31]($5, HEAP32[$self + 48 + ($j_037 << 2) >> 2] | 0, $ctx); //@line 8241
      $inc15 = $j_037 + 1 | 0; //@line 8242
      if (($inc15 | 0) >= ($2 | 0)) {
       break L821;
      }
      $j_037 = $inc15; //@line 8250
      $5 = HEAP32[$arrayidx >> 2] | 0; //@line 8250
     }
    }
   } while (0);
   if (($add | 0) < ($sub | 0)) {
    $i_039 = $add; //@line 8257
    $sleeping_040 = $sleeping_0_inc; //@line 8257
   } else {
    $i_0_lcssa = $sub; //@line 8259
    $sleeping_0_lcssa = $sleeping_0_inc; //@line 8259
    break;
   }
  }
 } else {
  $i_0_lcssa = 0; //@line 8264
  $sleeping_0_lcssa = 0; //@line 8264
 }
 if (($2 | 0) > 0) {
  $sleeping_2 = ((HEAP8[(HEAP32[$self + 48 + ($i_0_lcssa << 2) >> 2] | 0) + 98 | 0] | 0) != 0) + $sleeping_0_lcssa | 0; //@line 8279
 } else {
  $sleeping_2 = $sleeping_0_lcssa; //@line 8281
 }
 if (($sleeping_2 | 0) != ($2 | 0)) {
  return;
 }
 HEAP32[$isSleeping >> 2] = 1; //@line 8289
 return;
}
function __BBBlock_rotateRoom($_room, $ctx) {
 $_room = $_room | 0;
 $ctx = $ctx | 0;
 var $agg_tmp = 0, $0 = 0, $2 = 0, $_sroa_0_0_tmp7_idx = 0, $_sroa_0_0_copyload = 0.0, $_sroa_1_4_copyload = 0.0, $_sroa_2_8_copyload = 0.0, $5 = 0, $_sroa_3_12_copyload = 0.0, $oldAabb8_sroa_1_4_copyload = 0.0, $oldAabb8_sroa_2_8_copyload = 0.0, $_sroa_065_0_copyload = 0.0, $_sroa_376_12_copyload = 0.0, $add59_i88 = 0.0, $sub44_i85 = 0.0, $_sroa_080_0_copyload = 0.0, sp = 0;
 sp = STACKTOP; //@line 1060
 STACKTOP = STACKTOP + 8 | 0; //@line 1060
 $agg_tmp = sp | 0; //@line 1061
 $0 = $_room; //@line 1062
 $2 = HEAP32[$ctx + 32 >> 2] | 0; //@line 1067
 $_sroa_0_0_tmp7_idx = $_room + 24 | 0; //@line 1068
 $_sroa_0_0_copyload = (copyTempFloat($_sroa_0_0_tmp7_idx | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1069
 $_sroa_1_4_copyload = (copyTempFloat($_room + 28 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1072
 $_sroa_2_8_copyload = (copyTempFloat($_room + 32 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1075
 $5 = $_room + 36 | 0; //@line 1077
 $_sroa_3_12_copyload = (copyTempFloat($5 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1078
 $oldAabb8_sroa_1_4_copyload = (copyTempFloat($ctx + 4 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1081
 $oldAabb8_sroa_2_8_copyload = (copyTempFloat($ctx + 8 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1084
 $_sroa_065_0_copyload = (copyTempFloat($ctx + 16 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1086
 $_sroa_376_12_copyload = (copyTempFloat($ctx + 28 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1089
 if (($2 | 0) == 1) {
  $sub44_i85 = $_sroa_065_0_copyload - ($_sroa_3_12_copyload - (copyTempFloat($ctx + 12 | 0), +HEAPF32[tempDoublePtr >> 2])); //@line 1099
  $add59_i88 = $_sroa_2_8_copyload - $oldAabb8_sroa_2_8_copyload + $_sroa_376_12_copyload; //@line 1099
 } else if (($2 | 0) == 2) {
  $sub44_i85 = $_sroa_065_0_copyload - ($_sroa_2_8_copyload - $oldAabb8_sroa_2_8_copyload); //@line 1106
  $add59_i88 = $oldAabb8_sroa_1_4_copyload - $_sroa_1_4_copyload + $_sroa_376_12_copyload; //@line 1106
 } else if (($2 | 0) == 3) {
  $sub44_i85 = $_sroa_065_0_copyload - ($oldAabb8_sroa_1_4_copyload - $_sroa_1_4_copyload); //@line 1115
  $add59_i88 = $_sroa_376_12_copyload + ((copyTempFloat($ctx | 0), +HEAPF32[tempDoublePtr >> 2]) - $_sroa_0_0_copyload); //@line 1115
 } else {
  $sub44_i85 = $_sroa_0_0_copyload; //@line 1117
  $add59_i88 = $_sroa_3_12_copyload; //@line 1117
 }
 _BBRoom_rotate($0, $2) | 0; //@line 1121
 $_sroa_080_0_copyload = (copyTempFloat($_sroa_0_0_tmp7_idx | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1122
 HEAPF32[$agg_tmp >> 2] = $add59_i88 - (copyTempFloat($5 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1127
 HEAPF32[$agg_tmp + 4 >> 2] = $sub44_i85 - $_sroa_080_0_copyload; //@line 1129
 _BBRoom_move($0, $agg_tmp) | 0; //@line 1130
 STACKTOP = sp; //@line 1131
 return;
}
function __AQWorld_integrateIterator($item, $ctx) {
 $item = $item | 0;
 $ctx = $ctx | 0;
 var $newAabb = 0, $0 = 0, $position = 0, $x = 0, $3 = 0, $world = 0, $10 = 0, $13 = 0, $14 = 0, $oldPosition = 0, $sub_i = 0.0, $sub3_i = 0.0, $oldAabb = 0, $21 = 0, $22 = 0, $23$1 = 0, $24 = 0, sp = 0;
 sp = STACKTOP; //@line 9192
 STACKTOP = STACKTOP + 16 | 0; //@line 9192
 $newAabb = sp | 0; //@line 9193
 $0 = $item; //@line 9194
 $position = $item + 12 | 0; //@line 9195
 $x = $position; //@line 9196
 if (((HEAPF32[tempDoublePtr >> 2] = +HEAPF32[$x >> 2], HEAP32[tempDoublePtr >> 2] | 0) & 2147483647) >>> 0 > 2139095040) {
  ___assert_fail(960, 1224, 42, 1408); //@line 9203
 }
 $3 = $item + 16 | 0; //@line 9207
 if (((HEAPF32[tempDoublePtr >> 2] = +HEAPF32[$3 >> 2], HEAP32[tempDoublePtr >> 2] | 0) & 2147483647) >>> 0 > 2139095040) {
  ___assert_fail(960, 1224, 42, 1408); //@line 9214
 }
 if ((HEAP8[$0 + 98 | 0] | 0) == 0) {
  _AQParticle_integrate($0, +HEAPF32[$ctx + 4 >> 2]); //@line 9225
  _AQParticle_testPrep($0); //@line 9226
  _AQParticle_aabb($newAabb, $0); //@line 9227
  $13 = $item + 64 | 0; //@line 9229
  $14 = $newAabb; //@line 9230
  HEAP32[$13 >> 2] = HEAP32[$14 >> 2]; //@line 9231
  HEAP32[$13 + 4 >> 2] = HEAP32[$14 + 4 >> 2]; //@line 9231
  HEAP32[$13 + 8 >> 2] = HEAP32[$14 + 8 >> 2]; //@line 9231
  HEAP32[$13 + 12 >> 2] = HEAP32[$14 + 12 >> 2]; //@line 9231
  $oldPosition = $item + 40 | 0; //@line 9232
  $sub_i = +HEAPF32[$x >> 2] - +HEAPF32[$oldPosition >> 2]; //@line 9240
  $sub3_i = +HEAPF32[$3 >> 2] - +HEAPF32[$oldPosition + 4 >> 2]; //@line 9241
  if ($sub_i * $sub_i + $sub3_i * $sub3_i <= +HEAPF32[$item + 20 >> 2] / 10.0) {
   STACKTOP = sp; //@line 9252
   return;
  }
  $oldAabb = $item + 80 | 0; //@line 9258
  _AQDdvt_updateParticle(HEAP32[(HEAP32[$ctx >> 2] | 0) + 28 >> 2] | 0, $0, $oldAabb, $newAabb); //@line 9260
  $21 = $position; //@line 9261
  $22 = $oldPosition; //@line 9262
  $23$1 = HEAP32[$21 + 4 >> 2] | 0; //@line 9266
  HEAP32[$22 >> 2] = HEAP32[$21 >> 2]; //@line 9268
  HEAP32[$22 + 4 >> 2] = $23$1; //@line 9270
  $24 = $oldAabb; //@line 9271
  HEAP32[$24 >> 2] = HEAP32[$14 >> 2]; //@line 9272
  HEAP32[$24 + 4 >> 2] = HEAP32[$14 + 4 >> 2]; //@line 9272
  HEAP32[$24 + 8 >> 2] = HEAP32[$14 + 8 >> 2]; //@line 9272
  HEAP32[$24 + 12 >> 2] = HEAP32[$14 + 12 >> 2]; //@line 9272
  STACKTOP = sp; //@line 9274
  return;
 } else {
  $world = $ctx; //@line 9276
  if ((_AQList_length(HEAP32[(HEAP32[$world >> 2] | 0) + 44 >> 2] | 0) | 0) >>> 0 >= 128) {
   STACKTOP = sp; //@line 9284
   return;
  }
  $10 = HEAP32[(HEAP32[$world >> 2] | 0) + 44 >> 2] | 0; //@line 9288
  _AQList_push($10, $item) | 0; //@line 9289
  STACKTOP = sp; //@line 9291
  return;
 }
}
function _BBWall_clone($original) {
 $original = $original | 0;
 var $0 = 0, $aabb2_sroa_0_0_copyload4 = 0.0, $aabb2_sroa_1_4_copyload6 = 0.0, $aabb2_sroa_2_8_copyload8 = 0.0, $aabb2_sroa_3_12_copyload10 = 0.0, $call_i = 0, $1 = 0, $sub_i_i = 0.0, $sub1_i_i = 0.0, $cmp_i = 0, $div_i = 0.0, $3 = 0.0, $4 = 0.0, $add_i = 0.0, $add14_i = 0.0, $add16_i = 0.0, $5 = 0, $distance_031_i = 0.0, $call19_i = 0, $6 = 0, $tmp_sroa_0_0_insert_insert_i$1 = 0.0;
 $0 = HEAP32[$original + 36 >> 2] | 0; //@line 4896
 $aabb2_sroa_0_0_copyload4 = (copyTempFloat($original + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4898
 $aabb2_sroa_1_4_copyload6 = (copyTempFloat($original + 16 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4900
 $aabb2_sroa_2_8_copyload8 = (copyTempFloat($original + 20 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4902
 $aabb2_sroa_3_12_copyload10 = (copyTempFloat($original + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4904
 $call_i = _aqcreate(1680) | 0; //@line 4905
 $1 = $call_i; //@line 4906
 HEAPF32[$call_i + 12 >> 2] = $aabb2_sroa_0_0_copyload4; //@line 4909
 HEAPF32[$call_i + 16 >> 2] = $aabb2_sroa_1_4_copyload6; //@line 4912
 HEAPF32[$call_i + 20 >> 2] = $aabb2_sroa_2_8_copyload8; //@line 4915
 HEAPF32[$call_i + 24 >> 2] = $aabb2_sroa_3_12_copyload10; //@line 4918
 HEAP32[$call_i + 36 >> 2] = $0; //@line 4921
 $sub_i_i = $aabb2_sroa_1_4_copyload6 - $aabb2_sroa_3_12_copyload10; //@line 4922
 $sub1_i_i = $aabb2_sroa_0_0_copyload4 - $aabb2_sroa_2_8_copyload8; //@line 4923
 $cmp_i = $sub_i_i < $sub1_i_i; //@line 4924
 $div_i = ($cmp_i ? $sub_i_i : $sub1_i_i) * .5; //@line 4926
 $3 = $cmp_i ? 1.0 : 0.0; //@line 4929
 $4 = $cmp_i ? 0.0 : 1.0; //@line 4930
 $add_i = $aabb2_sroa_3_12_copyload10 + $div_i; //@line 4932
 $add14_i = $aabb2_sroa_2_8_copyload8 + $div_i; //@line 4933
 $add16_i = ($cmp_i ? $sub1_i_i : $sub_i_i) - $div_i * 2.0 + .5; //@line 4935
 if ($add16_i < 0.0) {
  return $1 | 0; //@line 4939
 }
 $5 = $call_i + 28 | 0; //@line 4942
 $distance_031_i = 0.0; //@line 4944
 do {
  $call19_i = _aqcreate(2208) | 0; //@line 4947
  $6 = $call19_i + 12 | 0; //@line 4953
  $tmp_sroa_0_0_insert_insert_i$1 = +($add14_i + $3 * $distance_031_i); //@line 4963
  HEAPF32[$6 >> 2] = $add_i + $4 * $distance_031_i; //@line 4965
  HEAPF32[$6 + 4 >> 2] = $tmp_sroa_0_0_insert_insert_i$1; //@line 4967
  HEAPF32[$call19_i + 20 >> 2] = $div_i; //@line 4970
  HEAP8[$call19_i + 96 | 0] = 1; //@line 4972
  _AQList_push(HEAP32[$5 >> 2] | 0, $call19_i) | 0; //@line 4975
  $distance_031_i = $distance_031_i + 1.0; //@line 4976
 } while ($distance_031_i <= $add16_i);
 return $1 | 0; //@line 4986
}
function _AQList_removeAt($_self, $index) {
 $_self = $_self | 0;
 $index = $index | 0;
 var $head = 0, $node_030 = 0, $length = 0, $1 = 0, $2 = 0, $tobool34 = 0, $node_037 = 0, $i_036 = 0, $inc = 0, $node_0 = 0, $tobool = 0, $tobool_lcssa = 0, $node_0_lcssa = 0, $tail = 0, $prev15 = 0, $7 = 0, $next22_pre = 0, $9 = 0, $item = 0, $13 = 0, $retval_0 = 0;
 if (($index | 0) == -1) {
  $retval_0 = 0; //@line 11514
  return $retval_0 | 0; //@line 11516
 }
 $head = $_self + 16 | 0; //@line 11518
 $node_030 = HEAP32[$head >> 2] | 0; //@line 11520
 $length = $_self + 12 | 0; //@line 11521
 $1 = $length; //@line 11522
 $2 = HEAP32[$1 >> 2] | 0; //@line 11523
 $tobool34 = ($node_030 | 0) == 0; //@line 11527
 if (($index | 0) < 1 | ($2 | 0) < 1 | $tobool34) {
  $node_0_lcssa = $node_030; //@line 11531
  $tobool_lcssa = $tobool34; //@line 11531
 } else {
  $i_036 = 0; //@line 11533
  $node_037 = $node_030; //@line 11533
  while (1) {
   $inc = $i_036 + 1 | 0; //@line 11538
   $node_0 = HEAP32[$node_037 >> 2] | 0; //@line 11539
   $tobool = ($node_0 | 0) == 0; //@line 11543
   if (($inc | 0) >= ($index | 0) | ($inc | 0) >= ($2 | 0) | $tobool) {
    $node_0_lcssa = $node_0; //@line 11547
    $tobool_lcssa = $tobool; //@line 11547
    break;
   } else {
    $i_036 = $inc; //@line 11550
    $node_037 = $node_0; //@line 11550
   }
  }
 }
 if ($tobool_lcssa) {
  $retval_0 = 0; //@line 11558
  return $retval_0 | 0; //@line 11560
 }
 $tail = $_self + 20 | 0; //@line 11562
 if ((HEAP32[$tail >> 2] | 0) == ($node_0_lcssa | 0)) {
  HEAP32[$tail >> 2] = HEAP32[$node_0_lcssa + 4 >> 2]; //@line 11571
 }
 if (($node_030 | 0) == ($node_0_lcssa | 0)) {
  HEAP32[$head >> 2] = HEAP32[$node_030 >> 2]; //@line 11580
 }
 $prev15 = $node_0_lcssa + 4 | 0; //@line 11583
 $7 = HEAP32[$prev15 >> 2] | 0; //@line 11584
 $next22_pre = $node_0_lcssa | 0; //@line 11586
 if (($7 | 0) != 0) {
  HEAP32[$7 >> 2] = HEAP32[$next22_pre >> 2]; //@line 11591
 }
 $9 = HEAP32[$next22_pre >> 2] | 0; //@line 11594
 if (($9 | 0) != 0) {
  HEAP32[$9 + 4 >> 2] = HEAP32[$prev15 >> 2]; //@line 11600
 }
 HEAP32[$prev15 >> 2] = 0; //@line 11603
 HEAP32[$next22_pre >> 2] = 0; //@line 11604
 $item = $node_0_lcssa + 8 | 0; //@line 11605
 $13 = _aqautorelease(HEAP32[$item >> 2] | 0) | 0; //@line 11609
 HEAP32[$item >> 2] = 0; //@line 11610
 _free(_aqlistnode_done($node_0_lcssa) | 0); //@line 11613
 HEAP32[$length >> 2] = (HEAP32[$1 >> 2] | 0) - 1; //@line 11618
 $retval_0 = $13; //@line 11620
 return $retval_0 | 0; //@line 11622
}
function _aqcollision_pop($col) {
 $col = $col | 0;
 var $col_tr = 0, $call_i = 0, $0 = 0, $col_addr_05_i_i = 0, $a_i_i = 0, $3 = 0, $next = 0, $5 = 0, $call_i6 = 0, $6 = 0, $col_addr_05_i_i9 = 0, $a_i_i10 = 0, $retval_0 = 0, label = 0;
 $col_tr = $col; //@line 5489
 while (1) {
  if (($col_tr | 0) == 0) {
   label = 322; //@line 5495
   break;
  }
  if ((HEAP32[$col_tr >> 2] | 0) == 0) {
   $retval_0 = $col_tr; //@line 5503
   label = 332; //@line 5504
   break;
  }
  $next = $col_tr + 20 | 0; //@line 5507
  $5 = HEAP32[$next >> 2] | 0; //@line 5508
  if (($5 | 0) == 0) {
   label = 327; //@line 5512
   break;
  } else {
   $col_tr = $5; //@line 5515
  }
 }
 if ((label | 0) == 327) {
  $call_i6 = _malloc(24) | 0; //@line 5519
  $6 = $call_i6; //@line 5520
  HEAP32[$call_i6 + 20 >> 2] = 0; //@line 5523
  L377 : do {
   if (($call_i6 | 0) != 0) {
    $col_addr_05_i_i9 = $6; //@line 5528
    do {
     $a_i_i10 = $col_addr_05_i_i9 | 0; //@line 5531
     if ((HEAP32[$a_i_i10 >> 2] | 0) == 0) {
      break L377;
     }
     HEAP32[$a_i_i10 >> 2] = 0; //@line 5537
     $col_addr_05_i_i9 = HEAP32[$col_addr_05_i_i9 + 20 >> 2] | 0; //@line 5539
    } while (($col_addr_05_i_i9 | 0) != 0);
   }
  } while (0);
  HEAP32[$next >> 2] = $6; //@line 5550
  $retval_0 = $6; //@line 5552
  return $retval_0 | 0; //@line 5554
 } else if ((label | 0) == 322) {
  $call_i = _malloc(24) | 0; //@line 5557
  $0 = $call_i; //@line 5558
  HEAP32[$call_i + 20 >> 2] = 0; //@line 5561
  if (($call_i | 0) == 0) {
   $retval_0 = $0; //@line 5565
   return $retval_0 | 0; //@line 5567
  } else {
   $col_addr_05_i_i = $0; //@line 5569
  }
  while (1) {
   $a_i_i = $col_addr_05_i_i | 0; //@line 5573
   if ((HEAP32[$a_i_i >> 2] | 0) == 0) {
    $retval_0 = $0; //@line 5577
    label = 336; //@line 5578
    break;
   }
   HEAP32[$a_i_i >> 2] = 0; //@line 5581
   $3 = HEAP32[$col_addr_05_i_i + 20 >> 2] | 0; //@line 5583
   if (($3 | 0) == 0) {
    $retval_0 = $0; //@line 5587
    label = 335; //@line 5588
    break;
   } else {
    $col_addr_05_i_i = $3; //@line 5591
   }
  }
  if ((label | 0) == 335) {
   return $retval_0 | 0; //@line 5596
  } else if ((label | 0) == 336) {
   return $retval_0 | 0; //@line 5600
  }
 } else if ((label | 0) == 332) {
  return $retval_0 | 0; //@line 5605
 }
 return 0; //@line 5607
}
function _AQApp_initApp($argc, $argv) {
 $argc = $argc | 0;
 $argv = $argv | 0;
 var $call1 = 0, $3 = 0, $call2 = 0, $cmp = 0, $sub_ptr_sub = 0, $call4 = 0, $binaryPath_0 = 0, $5 = 0, $8 = 0, $i_021 = 0, $arrayidx18 = 0, $10 = 0, $12 = 0, $15 = 0, tempVarArgs = 0, sp = 0;
 sp = STACKTOP; //@line 10688
 $call1 = _aqinit(_aqalloc(2528) | 0) | 0; //@line 10690
 HEAP32[952] = $call1; //@line 10692
 HEAP32[$call1 + 12 >> 2] = $argc; //@line 10695
 HEAP32[(HEAP32[952] | 0) + 16 >> 2] = $argv; //@line 10698
 $3 = HEAP32[$argv >> 2] | 0; //@line 10699
 $call2 = _strrchr($3 | 0, 47) | 0; //@line 10700
 $cmp = ($call2 | 0) != 0; //@line 10701
 if ($cmp) {
  $sub_ptr_sub = $call2 - $3 | 0; //@line 10706
  $call4 = _malloc($sub_ptr_sub + 1 | 0) | 0; //@line 10708
  _strncpy($call4 | 0, $3 | 0, $sub_ptr_sub | 0) | 0; //@line 10709
  HEAP8[$call4 + $sub_ptr_sub | 0] = 0; //@line 10711
  $binaryPath_0 = $call4; //@line 10713
 } else {
  $binaryPath_0 = 888; //@line 10715
 }
 $5 = _aqretain(_aqstr($binaryPath_0) | 0) | 0; //@line 10721
 HEAP32[(HEAP32[952] | 0) + 24 >> 2] = $5; //@line 10724
 $8 = _aqretain(_aqstr($binaryPath_0) | 0) | 0; //@line 10728
 HEAP32[(HEAP32[952] | 0) + 28 >> 2] = $8; //@line 10731
 _printf(1168, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 8 | 0, HEAP32[tempVarArgs >> 2] = $binaryPath_0, tempVarArgs) | 0) | 0; //@line 10732
 STACKTOP = tempVarArgs; //@line 10732
 if ($cmp) {
  _free($binaryPath_0); //@line 10735
 }
 if (($argc | 0) > 0) {
  $i_021 = 0; //@line 10741
 } else {
  $15 = HEAP32[952] | 0; //@line 10743
  STACKTOP = sp; //@line 10744
  return $15 | 0; //@line 10744
 }
 do {
  $arrayidx18 = $argv + ($i_021 << 2) | 0; //@line 10748
  $10 = HEAP32[$arrayidx18 >> 2] | 0; //@line 10749
  _printf(784, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 16 | 0, HEAP32[tempVarArgs >> 2] = $i_021, HEAP32[tempVarArgs + 8 >> 2] = $10, tempVarArgs) | 0) | 0; //@line 10750
  STACKTOP = tempVarArgs; //@line 10750
  $12 = HEAP32[(HEAP32[952] | 0) + 20 >> 2] | 0; //@line 10753
  _AQList_push($12, _aqstr(HEAP32[$arrayidx18 >> 2] | 0) | 0) | 0; //@line 10757
  $i_021 = $i_021 + 1 | 0; //@line 10758
 } while (($i_021 | 0) < ($argc | 0));
 $15 = HEAP32[952] | 0; //@line 10767
 STACKTOP = sp; //@line 10768
 return $15 | 0; //@line 10768
}
function _BBBlock_moveTo($self, $tl) {
 $self = $self | 0;
 $tl = $tl | 0;
 var $tlDiff4 = 0, $aabb2_sroa_0_0_tmp3_idx = 0, $aabb2_sroa_0_0_copyload = 0.0, $aabb2_sroa_1_4_tmp3_idx = 0, $aabb2_sroa_2_12_tmp3_idx10 = 0, $aabb2_sroa_2_12_copyload = 0.0, $sub_i = 0.0, $sub3_i = 0.0, $aabb5_sroa_1_4_copyload_i = 0.0, $aabb5_sroa_2_8_tmp7_idx12_i = 0, $add3_i_i = 0.0, $1 = 0, tempParam = 0, sp = 0;
 sp = STACKTOP; //@line 1234
 STACKTOP = STACKTOP + 8 | 0; //@line 1234
 tempParam = $tl; //@line 1235
 $tl = STACKTOP; //@line 1235
 STACKTOP = STACKTOP + 8 | 0; //@line 1235
 HEAP32[$tl >> 2] = HEAP32[tempParam >> 2]; //@line 1235
 HEAP32[$tl + 4 >> 2] = HEAP32[tempParam + 4 >> 2]; //@line 1235
 $tlDiff4 = sp | 0; //@line 1236
 $aabb2_sroa_0_0_tmp3_idx = $self + 12 | 0; //@line 1237
 $aabb2_sroa_0_0_copyload = (copyTempFloat($aabb2_sroa_0_0_tmp3_idx | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1238
 $aabb2_sroa_1_4_tmp3_idx = $self + 16 | 0; //@line 1239
 $aabb2_sroa_2_12_tmp3_idx10 = $self + 24 | 0; //@line 1240
 $aabb2_sroa_2_12_copyload = (copyTempFloat($aabb2_sroa_2_12_tmp3_idx10 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1241
 $sub_i = +HEAPF32[$tl >> 2] - $aabb2_sroa_2_12_copyload; //@line 1246
 $sub3_i = +HEAPF32[$tl + 4 >> 2] - $aabb2_sroa_0_0_copyload; //@line 1247
 HEAPF32[$tlDiff4 >> 2] = $sub_i; //@line 1249
 HEAPF32[$tlDiff4 + 4 >> 2] = $sub3_i; //@line 1251
 $aabb5_sroa_1_4_copyload_i = (copyTempFloat($aabb2_sroa_1_4_tmp3_idx | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1252
 $aabb5_sroa_2_8_tmp7_idx12_i = $self + 20 | 0; //@line 1253
 $add3_i_i = $sub3_i + (copyTempFloat($aabb5_sroa_2_8_tmp7_idx12_i | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 1257
 HEAPF32[$aabb2_sroa_0_0_tmp3_idx >> 2] = $sub3_i + $aabb2_sroa_0_0_copyload; //@line 1259
 HEAPF32[$aabb2_sroa_1_4_tmp3_idx >> 2] = $sub_i + $aabb5_sroa_1_4_copyload_i; //@line 1260
 HEAPF32[$aabb5_sroa_2_8_tmp7_idx12_i >> 2] = $add3_i_i; //@line 1261
 HEAPF32[$aabb2_sroa_2_12_tmp3_idx10 >> 2] = $sub_i + $aabb2_sroa_2_12_copyload; //@line 1262
 $1 = $tlDiff4; //@line 1265
 _AQList_iterate(HEAP32[$self + 52 >> 2] | 0, 22, $1) | 0; //@line 1266
 _AQList_iterate(HEAP32[$self + 60 >> 2] | 0, 43, $1) | 0; //@line 1269
 STACKTOP = sp; //@line 1270
 return $self | 0; //@line 1270
}
function _stepInputWaterTest() {
 var $tobool2 = 0, $_17 = 0.0, $movementPower_1 = 0.0, $movementDir_sroa_0_1 = 0.0, $tobool16 = 0, $_18 = 0.0, $movementPower_3 = 0.0, $movementDir_sroa_1_1 = 0.0, $movementPower_4 = 0.0, $conv40 = 0.0, $call58 = 0, $call59 = 0, sp = 0;
 sp = STACKTOP; //@line 581
 STACKTOP = STACKTOP + 16 | 0; //@line 581
 if ((HEAP8[2648] | 0) != 0) {
  STACKTOP = sp; //@line 588
  return;
 }
 _AQInput_getScreenSize(sp | 0, sp + 8 | 0); //@line 590
 $tobool2 = (HEAP32[(_AQInput_findAction(_aqstr(624) | 0) | 0) + 32 >> 2] | 0) == 0; //@line 595
 $_17 = $tobool2 ? 0.0 : -1.0; //@line 597
 if ((HEAP32[(_AQInput_findAction(_aqstr(952) | 0) | 0) + 32 >> 2] | 0) == 0) {
  $movementDir_sroa_0_1 = $_17; //@line 605
  $movementPower_1 = $tobool2 ? 0.0 : .30000001192092896; //@line 605
 } else {
  $movementDir_sroa_0_1 = $_17 + 1.0; //@line 609
  $movementPower_1 = .30000001192092896; //@line 609
 }
 $tobool16 = (HEAP32[(_AQInput_findAction(_aqstr(904) | 0) | 0) + 32 >> 2] | 0) == 0; //@line 617
 $_18 = $tobool16 ? 0.0 : 1.0; //@line 619
 if ((HEAP32[(_AQInput_findAction(_aqstr(720) | 0) | 0) + 32 >> 2] | 0) == 0) {
  $movementDir_sroa_1_1 = $_18; //@line 627
  $movementPower_3 = $tobool16 ? $movementPower_1 : .30000001192092896; //@line 627
 } else {
  $movementDir_sroa_1_1 = $_18 + -1.0; //@line 631
  $movementPower_3 = .30000001192092896; //@line 631
 }
 $movementPower_4 = (HEAP32[(_AQInput_findAction(_aqstr(600) | 0) | 0) + 32 >> 2] | 0) != 0 & $movementPower_3 != 0.0 ? 1.0 : $movementPower_3; //@line 642
 $conv40 = +Math_atan2(+$movementDir_sroa_1_1, +$movementDir_sroa_0_1); //@line 646
 HEAPF32[(HEAP32[660] | 0) + 44 >> 2] = $conv40; //@line 649
 HEAPF32[(HEAP32[660] | 0) + 48 >> 2] = $movementPower_4; //@line 652
 _AQInput_findAction(_aqstr(360) | 0) | 0; //@line 654
 if ((HEAP32[(_AQInput_findAction(_aqstr(224) | 0) | 0) + 32 >> 2] | 0) == 0) {
  $call58 = _AQInput_getTouches() | 0; //@line 662
  $call59 = _AQArray_atIndex($call58, 0) | 0; //@line 663
  STACKTOP = sp; //@line 664
  return;
 }
 _BBCameraController_inputPress(HEAP32[808] | 0) | 0; //@line 667
 $call58 = _AQInput_getTouches() | 0; //@line 669
 $call59 = _AQArray_atIndex($call58, 0) | 0; //@line 670
 STACKTOP = sp; //@line 671
 return;
}
function _AQParticle_integrate($self, $dt) {
 $self = $self | 0;
 $dt = +$dt;
 var $sleepCounter = 0, $inc = 0, $isSleeping5 = 0, $3 = 0, $4$0 = 0, $4$1 = 0, $bitcast = 0.0, $lastPosition = 0, $mul = 0.0, $acceleration_0 = 0, $acceleration_1 = 0, $add_i = 0.0, $add3_i = 0.0, $tmp_sroa_0_0_insert_insert$1 = 0.0, $7 = 0, $sub_i = 0.0, $sub3_i = 0.0, $sleepCounter25 = 0, $inc26 = 0;
 if ((HEAP8[$self + 96 | 0] | 0) != 0) {
  $sleepCounter = $self + 99 | 0; //@line 8400
  $inc = (HEAP8[$sleepCounter] | 0) + 1 & 255; //@line 8402
  HEAP8[$sleepCounter] = $inc; //@line 8403
  if (($inc & 255) <= 20) {
   return;
  }
  HEAP8[$self + 98 | 0] = 1; //@line 8410
  return;
 }
 $isSleeping5 = $self + 98 | 0; //@line 8414
 if ((HEAP8[$isSleeping5] | 0) != 0) {
  return;
 }
 $3 = $self + 12 | 0; //@line 8422
 $4$0 = HEAP32[$3 >> 2] | 0; //@line 8424
 $4$1 = HEAP32[$3 + 4 >> 2] | 0; //@line 8426
 $bitcast = (HEAP32[tempDoublePtr >> 2] = $4$0, +HEAPF32[tempDoublePtr >> 2]); //@line 8429
 $lastPosition = $self + 48 | 0; //@line 8434
 $mul = $dt * $dt; //@line 8441
 $acceleration_0 = $self + 56 | 0; //@line 8442
 $acceleration_1 = $self + 60 | 0; //@line 8444
 $add_i = $bitcast * 2.0 - +HEAPF32[$lastPosition >> 2] + $mul * +HEAPF32[$acceleration_0 >> 2]; //@line 8448
 $add3_i = +HEAPF32[$self + 16 >> 2] * 2.0 - +HEAPF32[$self + 52 >> 2] + $mul * +HEAPF32[$acceleration_1 >> 2]; //@line 8449
 $tmp_sroa_0_0_insert_insert$1 = +$add3_i; //@line 8459
 HEAPF32[$3 >> 2] = $add_i; //@line 8461
 HEAPF32[$3 + 4 >> 2] = $tmp_sroa_0_0_insert_insert$1; //@line 8463
 $7 = $lastPosition; //@line 8464
 HEAP32[$7 >> 2] = $4$0; //@line 8466
 HEAP32[$7 + 4 >> 2] = $4$1; //@line 8468
 HEAPF32[$acceleration_0 >> 2] = 0.0; //@line 8469
 HEAPF32[$acceleration_1 >> 2] = 0.0; //@line 8470
 $sub_i = $add_i - $bitcast; //@line 8476
 $sub3_i = $add3_i - (HEAP32[tempDoublePtr >> 2] = $4$1, +HEAPF32[tempDoublePtr >> 2]); //@line 8477
 if (+Math_abs(+($sub_i * $sub_i + $sub3_i * $sub3_i)) >= .01) {
  return;
 }
 $sleepCounter25 = $self + 99 | 0; //@line 8488
 $inc26 = (HEAP8[$sleepCounter25] | 0) + 1 & 255; //@line 8490
 HEAP8[$sleepCounter25] = $inc26; //@line 8491
 if (($inc26 & 255) <= 20) {
  return;
 }
 HEAP8[$isSleeping5] = 1; //@line 8497
 return;
}
function __AQDdvt_removeParticle($self, $particle, $aabb) {
 $self = $self | 0;
 $particle = $particle | 0;
 $aabb = $aabb | 0;
 var $tl = 0, $length1_i_i = 0, $1 = 0, $index_0_i_i = 0, $arrayidx_i_i = 0, $length = 0, $8 = 0, $tr_i = 0, $bl_i = 0, $br_i = 0, $13 = 0, $15 = 0, $17 = 0, $19 = 0, label = 0;
 $tl = $self + 32 | 0; //@line 6553
 if ((HEAP32[$tl >> 2] | 0) != 0) {
  __AQDdvt_removeParticleChild($self, $particle, $aabb) | 0; //@line 6558
  $length = $self + 240 | 0; //@line 6559
  if ((HEAP32[$length >> 2] | 0) != 24) {
   return;
  }
  HEAP32[$length >> 2] = 0; //@line 6566
  $8 = $self; //@line 6568
  _AQDdvt_iterate(HEAP32[$tl >> 2] | 0, 20, $8); //@line 6569
  $tr_i = $self + 36 | 0; //@line 6570
  _AQDdvt_iterate(HEAP32[$tr_i >> 2] | 0, 20, $8); //@line 6572
  $bl_i = $self + 40 | 0; //@line 6573
  _AQDdvt_iterate(HEAP32[$bl_i >> 2] | 0, 20, $8); //@line 6575
  $br_i = $self + 44 | 0; //@line 6576
  _AQDdvt_iterate(HEAP32[$br_i >> 2] | 0, 20, $8); //@line 6578
  $13 = HEAP32[$tl >> 2] | 0; //@line 6580
  _aqrelease($13) | 0; //@line 6581
  HEAP32[$tl >> 2] = 0; //@line 6582
  $15 = HEAP32[$tr_i >> 2] | 0; //@line 6584
  _aqrelease($15) | 0; //@line 6585
  HEAP32[$tr_i >> 2] = 0; //@line 6586
  $17 = HEAP32[$bl_i >> 2] | 0; //@line 6588
  _aqrelease($17) | 0; //@line 6589
  HEAP32[$bl_i >> 2] = 0; //@line 6590
  $19 = HEAP32[$br_i >> 2] | 0; //@line 6592
  _aqrelease($19) | 0; //@line 6593
  HEAP32[$br_i >> 2] = 0; //@line 6594
  return;
 }
 $length1_i_i = $self + 240 | 0; //@line 6598
 $1 = HEAP32[$length1_i_i >> 2] | 0; //@line 6599
 $index_0_i_i = 0; //@line 6601
 while (1) {
  if (($index_0_i_i | 0) >= ($1 | 0)) {
   label = 474; //@line 6607
   break;
  }
  $arrayidx_i_i = $self + 48 + ($index_0_i_i << 2) | 0; //@line 6610
  if ((HEAP32[$arrayidx_i_i >> 2] | 0) == ($particle | 0)) {
   break;
  } else {
   $index_0_i_i = $index_0_i_i + 1 | 0; //@line 6618
  }
 }
 if ((label | 0) == 474) {
  return;
 }
 if (($index_0_i_i | 0) == -1) {
  return;
 }
 HEAP32[$arrayidx_i_i >> 2] = HEAP32[$self + 48 + ($1 - 1 << 2) >> 2]; //@line 6632
 HEAP32[$length1_i_i >> 2] = (HEAP32[$length1_i_i >> 2] | 0) - 1; //@line 6635
 _aqautorelease($particle) | 0; //@line 6637
 return;
}
function __AQWorld_boxTestIterator($a, $b, $ctx) {
 $a = $a | 0;
 $b = $b | 0;
 $ctx = $ctx | 0;
 var $isSleeping = 0, $10 = 0, $14 = 0, $call_i17 = 0, $17 = 0, $19 = 0, $call3_i20 = 0, $24 = 0, $call_i = 0, $27 = 0, $29 = 0, $call3_i = 0;
 $isSleeping = $a + 98 | 0; //@line 9305
 do {
  if ((HEAP8[$isSleeping] | 0) != 0) {
   if ((HEAP8[$b + 98 | 0] | 0) == 0) {
    break;
   }
   return;
  }
 } while (0);
 if (+HEAPF32[$a + 76 >> 2] >= +HEAPF32[$b + 68 >> 2]) {
  return;
 }
 if (+HEAPF32[$a + 68 >> 2] <= +HEAPF32[$b + 76 >> 2]) {
  return;
 }
 if (+HEAPF32[$a + 72 >> 2] >= +HEAPF32[$b + 64 >> 2]) {
  return;
 }
 if (+HEAPF32[$a + 64 >> 2] <= +HEAPF32[$b + 72 >> 2]) {
  return;
 }
 $10 = $ctx + 52 | 0; //@line 9358
 if ((_AQParticle_test($a, $b, HEAP32[$10 >> 2] | 0) | 0) == 0) {
  return;
 }
 HEAP32[$10 >> 2] = _aqcollision_pop(HEAP32[$10 >> 2] | 0) | 0; //@line 9368
 if ((HEAP8[$isSleeping] | 0) == 0) {
  HEAP8[$a + 99 | 0] = 0; //@line 9374
 } else {
  $14 = $ctx + 32 | 0; //@line 9377
  $call_i17 = _AQList_indexOf(HEAP32[$14 >> 2] | 0, $a | 0) | 0; //@line 9380
  $17 = $ctx + 40 | 0; //@line 9382
  if (($call_i17 | 0) > (HEAP32[$17 >> 2] | 0)) {
   $19 = HEAP32[$14 >> 2] | 0; //@line 9387
   $call3_i20 = _AQList_removeAt($19, $call_i17) | 0; //@line 9388
   _AQList_unshift($19, $call3_i20) | 0; //@line 9389
   HEAP32[$17 >> 2] = (HEAP32[$17 >> 2] | 0) + 1; //@line 9392
  }
  _AQDdvt_wakeParticle(HEAP32[$ctx + 28 >> 2] | 0, $a); //@line 9398
  _AQParticle_wake($a); //@line 9399
 }
 if ((HEAP8[$b + 98 | 0] | 0) == 0) {
  HEAP8[$b + 99 | 0] = 0; //@line 9408
  return;
 }
 $24 = $ctx + 32 | 0; //@line 9412
 $call_i = _AQList_indexOf(HEAP32[$24 >> 2] | 0, $b | 0) | 0; //@line 9415
 $27 = $ctx + 40 | 0; //@line 9417
 if (($call_i | 0) > (HEAP32[$27 >> 2] | 0)) {
  $29 = HEAP32[$24 >> 2] | 0; //@line 9422
  $call3_i = _AQList_removeAt($29, $call_i) | 0; //@line 9423
  _AQList_unshift($29, $call3_i) | 0; //@line 9424
  HEAP32[$27 >> 2] = (HEAP32[$27 >> 2] | 0) + 1; //@line 9427
 }
 _AQDdvt_wakeParticle(HEAP32[$ctx + 28 >> 2] | 0, $b); //@line 9433
 _AQParticle_wake($b); //@line 9434
 return;
}
function _AQList_unshift($_self, $obj) {
 $_self = $_self | 0;
 $obj = $obj | 0;
 var $head_i = 0, $0 = 0, $insertPt_027_i = 0, $call_i = 0, $1 = 0, $next_i_i = 0, $2 = 0, $3 = 0, $prev_i = 0, $7 = 0, $tail_i = 0, $8 = 0, $length_i = 0, $11 = 0, $12 = 0, $inc_i = 0, $13 = 0, $inc_c_i = 0;
 $head_i = $_self + 16 | 0; //@line 11424
 $0 = $head_i; //@line 11425
 $insertPt_027_i = HEAP32[$0 >> 2] | 0; //@line 11426
 $call_i = _malloc(12) | 0; //@line 11428
 $1 = $call_i; //@line 11429
 $next_i_i = $call_i; //@line 11430
 HEAP32[$next_i_i >> 2] = 0; //@line 11431
 $2 = $call_i + 4 | 0; //@line 11433
 HEAP32[$2 >> 2] = 0; //@line 11434
 $3 = $call_i + 8 | 0; //@line 11436
 HEAP32[$3 >> 2] = 0; //@line 11437
 if (($obj | 0) != 0) {
  HEAP32[$3 >> 2] = _aqretain($obj) | 0; //@line 11444
 }
 HEAP32[$next_i_i >> 2] = $insertPt_027_i; //@line 11447
 if (($insertPt_027_i | 0) == 0) {
  $tail_i = $_self + 20 | 0; //@line 11450
  $8 = HEAP32[$tail_i >> 2] | 0; //@line 11451
  HEAP32[$2 >> 2] = $8; //@line 11453
  if (($8 | 0) != 0) {
   HEAP32[$8 >> 2] = $1; //@line 11458
  }
  HEAP32[$tail_i >> 2] = $call_i; //@line 11461
 } else {
  $prev_i = $insertPt_027_i + 4 | 0; //@line 11463
  HEAP32[$2 >> 2] = HEAP32[$prev_i >> 2]; //@line 11465
  $7 = HEAP32[$prev_i >> 2] | 0; //@line 11466
  if (($7 | 0) != 0) {
   HEAP32[$7 >> 2] = $1; //@line 11471
  }
  HEAP32[$prev_i >> 2] = $1; //@line 11474
 }
 if ((HEAP32[$0 >> 2] | 0) != ($insertPt_027_i | 0)) {
  $length_i = $_self + 12 | 0; //@line 11481
  $11 = $length_i; //@line 11482
  $12 = HEAP32[$11 >> 2] | 0; //@line 11483
  $inc_i = $12 + 1 | 0; //@line 11484
  $13 = $length_i | 0; //@line 11485
  $inc_c_i = $inc_i; //@line 11486
  HEAP32[$13 >> 2] = $inc_c_i; //@line 11487
  return $_self | 0; //@line 11488
 }
 HEAP32[$head_i >> 2] = $call_i; //@line 11491
 $length_i = $_self + 12 | 0; //@line 11493
 $11 = $length_i; //@line 11494
 $12 = HEAP32[$11 >> 2] | 0; //@line 11495
 $inc_i = $12 + 1 | 0; //@line 11496
 $13 = $length_i | 0; //@line 11497
 $inc_c_i = $inc_i; //@line 11498
 HEAP32[$13 >> 2] = $inc_c_i; //@line 11499
 return $_self | 0; //@line 11500
}
function _main($argc, $argv) {
 $argc = $argc | 0;
 $argv = $argv | 0;
 var $call1 = 0, $call6 = 0, $call8 = 0, $call13 = 0, $retval_0 = 0, tempVarArgs = 0, sp = 0;
 sp = STACKTOP; //@line 5054
 if ((_SDL_Init(32) | 0) != 0) {
  $call1 = _SDL_GetError() | 0; //@line 5059
  _printf(1048, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 8 | 0, HEAP32[tempVarArgs >> 2] = $call1, tempVarArgs) | 0) | 0; //@line 5060
  STACKTOP = tempVarArgs; //@line 5060
  $retval_0 = 1; //@line 5062
  STACKTOP = sp; //@line 5064
  return $retval_0 | 0; //@line 5064
 }
 _SDL_GL_SetAttribute(5, 1) | 0; //@line 5066
 _SDL_GL_SetAttribute(13, 1) | 0; //@line 5067
 _SDL_GL_SetAttribute(14, 16) | 0; //@line 5068
 $call6 = _SDL_SetVideoMode(640, 480, 16, 83886080) | 0; //@line 5069
 HEAP32[656] = $call6; //@line 5070
 if (($call6 | 0) == 0) {
  $call8 = _SDL_GetError() | 0; //@line 5074
  _printf(1248, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 8 | 0, HEAP32[tempVarArgs >> 2] = $call8, tempVarArgs) | 0) | 0; //@line 5075
  STACKTOP = tempVarArgs; //@line 5075
  $retval_0 = 1; //@line 5077
  STACKTOP = sp; //@line 5079
  return $retval_0 | 0; //@line 5079
 } else {
  _glClearColor(+0.0, +0.0, +0.0, +0.0); //@line 5081
  _enable_resizable(); //@line 5082
  _printf(840, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 32 | 0, HEAP32[tempVarArgs >> 2] = 0, HEAP32[tempVarArgs + 8 >> 2] = -80, HEAP32[tempVarArgs + 16 >> 2] = 640, HEAP32[tempVarArgs + 24 >> 2] = 640, tempVarArgs) | 0) | 0; //@line 5083
  STACKTOP = tempVarArgs; //@line 5083
  _glViewport(0, -80 | 0, 640, 640); //@line 5084
  _AQInput_setScreenSize(640.0, 480.0); //@line 5085
  _emscripten_set_main_loop(17, 0, 0); //@line 5086
  $call13 = _aqinit(_aqalloc(2184) | 0) | 0; //@line 5088
  _AQApp_initApp($argc, $argv) | 0; //@line 5089
  _aqfree($call13); //@line 5090
  _initWaterTest(); //@line 5091
  _setGetTicksFunction(17); //@line 5092
  $retval_0 = 0; //@line 5094
  STACKTOP = sp; //@line 5096
  return $retval_0 | 0; //@line 5096
 }
 return 0; //@line 5098
}
function _AQArray_remove($self, $obj) {
 $self = $self | 0;
 $obj = $obj | 0;
 var $length_i = 0, $0 = 0, $items_i = 0, $i_0_i = 0, $inc_i = 0, $4 = 0, $5 = 0, $inc_i_i12 = 0, $inc_i_i14 = 0, $_pre_i = 0, $6 = 0, $7 = 0, $inc_i_i = 0, $retval_0 = 0, label = 0;
 $length_i = $self + 12 | 0; //@line 10928
 $0 = HEAP32[$length_i >> 2] | 0; //@line 10929
 $items_i = $self + 20 | 0; //@line 10930
 $i_0_i = 0; //@line 10932
 while (1) {
  if (($i_0_i | 0) >= ($0 | 0)) {
   $retval_0 = 0; //@line 10938
   label = 979; //@line 10939
   break;
  }
  $inc_i = $i_0_i + 1 | 0; //@line 10946
  if ((HEAP32[(HEAP32[$items_i >> 2] | 0) + ($i_0_i << 2) >> 2] | 0) == ($obj | 0)) {
   break;
  } else {
   $i_0_i = $inc_i; //@line 10951
  }
 }
 if ((label | 0) == 979) {
  return $retval_0 | 0; //@line 10956
 }
 if (($i_0_i | 0) == -1) {
  $retval_0 = 0; //@line 10961
  return $retval_0 | 0; //@line 10963
 }
 _aqautorelease($obj) | 0; //@line 10966
 HEAP32[$length_i >> 2] = $i_0_i; //@line 10967
 if (($inc_i | 0) >= ($0 | 0)) {
  $retval_0 = 1; //@line 10971
  return $retval_0 | 0; //@line 10973
 }
 $4 = HEAP32[$items_i >> 2] | 0; //@line 10975
 $5 = HEAP32[$4 + ($inc_i << 2) >> 2] | 0; //@line 10977
 HEAP32[$length_i >> 2] = $inc_i; //@line 10978
 HEAP32[$4 + ($i_0_i << 2) >> 2] = $5; //@line 10980
 $inc_i_i12 = $i_0_i + 2 | 0; //@line 10981
 if (($inc_i_i12 | 0) < ($0 | 0)) {
  $inc_i_i14 = $inc_i_i12; //@line 10985
 } else {
  $retval_0 = 1; //@line 10987
  return $retval_0 | 0; //@line 10989
 }
 while (1) {
  $_pre_i = HEAP32[$length_i >> 2] | 0; //@line 10993
  $6 = HEAP32[$items_i >> 2] | 0; //@line 10994
  $7 = HEAP32[$6 + ($inc_i_i14 << 2) >> 2] | 0; //@line 10996
  HEAP32[$length_i >> 2] = $_pre_i + 1; //@line 10998
  HEAP32[$6 + ($_pre_i << 2) >> 2] = $7; //@line 11000
  $inc_i_i = $inc_i_i14 + 1 | 0; //@line 11001
  if (($inc_i_i | 0) < ($0 | 0)) {
   $inc_i_i14 = $inc_i_i; //@line 11005
  } else {
   $retval_0 = 1; //@line 11007
   break;
  }
 }
 return $retval_0 | 0; //@line 11012
}
function __BBRoom_rotateParticle($_particle, $ctx) {
 $_particle = $_particle | 0;
 $ctx = $ctx | 0;
 var $position = 0, $1 = 0, $_0_val = 0.0, $_1_val = 0.0, $oldAabb4_sroa_2_8_copyload = 0.0, $oldAabb4_sroa_3_12_copyload = 0.0, $_sroa_0_0_copyload = 0.0, $_sroa_1_4_copyload = 0.0, $sub28_i20 = 0.0, $sub23_i19 = 0.0, $7 = 0, $tmp_sroa_0_0_insert_insert$1 = 0.0;
 $position = $_particle + 12 | 0; //@line 3996
 $1 = HEAP32[$ctx + 32 >> 2] | 0; //@line 4000
 $_0_val = +HEAPF32[$position >> 2]; //@line 4002
 $_1_val = +HEAPF32[$_particle + 16 >> 2]; //@line 4005
 $oldAabb4_sroa_2_8_copyload = (copyTempFloat($ctx + 8 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4008
 $oldAabb4_sroa_3_12_copyload = (copyTempFloat($ctx + 12 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4011
 $_sroa_0_0_copyload = (copyTempFloat($ctx + 16 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4013
 $_sroa_1_4_copyload = (copyTempFloat($ctx + 20 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4016
 if (($1 | 0) == 1) {
  $sub23_i19 = $_sroa_1_4_copyload - ((copyTempFloat($ctx | 0), +HEAPF32[tempDoublePtr >> 2]) - $_1_val); //@line 4025
  $sub28_i20 = $_sroa_0_0_copyload - ($_0_val - $oldAabb4_sroa_3_12_copyload); //@line 4025
 } else if (($1 | 0) == 2) {
  $sub23_i19 = $_sroa_1_4_copyload - ($_0_val - $oldAabb4_sroa_3_12_copyload); //@line 4032
  $sub28_i20 = $_sroa_0_0_copyload - ($_1_val - $oldAabb4_sroa_2_8_copyload); //@line 4032
 } else if (($1 | 0) == 3) {
  $sub23_i19 = $_sroa_1_4_copyload - ($_1_val - $oldAabb4_sroa_2_8_copyload); //@line 4042
  $sub28_i20 = $_sroa_0_0_copyload - ((copyTempFloat($ctx + 4 | 0), +HEAPF32[tempDoublePtr >> 2]) - $_0_val); //@line 4042
 } else {
  $sub23_i19 = $_0_val; //@line 4044
  $sub28_i20 = $_1_val; //@line 4044
 }
 $7 = $position; //@line 4048
 $tmp_sroa_0_0_insert_insert$1 = +$sub28_i20; //@line 4058
 HEAPF32[$7 >> 2] = $sub23_i19; //@line 4060
 HEAPF32[$7 + 4 >> 2] = $tmp_sroa_0_0_insert_insert$1; //@line 4062
 return;
}
function _AQDraw_rect($vertices, $itr, $rect) {
 $vertices = $vertices | 0;
 $itr = $itr | 0;
 $rect = $rect | 0;
 var $0 = 0.0, $1 = 0.0, $2 = 0.0, $3 = 0.0, $call_i = 0, $call6_i = 0, $call11_i = 0, $call_i23 = 0, $call6_i27 = 0, $11 = 0, tempParam = 0, sp = 0;
 sp = STACKTOP; //@line 3168
 tempParam = $rect; //@line 3169
 $rect = STACKTOP; //@line 3169
 STACKTOP = STACKTOP + 16 | 0; //@line 3169
 HEAP32[$rect >> 2] = HEAP32[tempParam >> 2]; //@line 3169
 HEAP32[$rect + 4 >> 2] = HEAP32[tempParam + 4 >> 2]; //@line 3169
 HEAP32[$rect + 8 >> 2] = HEAP32[tempParam + 8 >> 2]; //@line 3169
 HEAP32[$rect + 12 >> 2] = HEAP32[tempParam + 12 >> 2]; //@line 3169
 $0 = +HEAPF32[$rect + 12 >> 2]; //@line 3171
 $1 = +HEAPF32[$rect >> 2]; //@line 3173
 $2 = +HEAPF32[$rect + 4 >> 2]; //@line 3175
 $3 = +HEAPF32[$rect + 8 >> 2]; //@line 3177
 HEAPF32[$vertices >> 2] = $0; //@line 3179
 HEAPF32[$vertices + 4 >> 2] = $1; //@line 3182
 $call_i = FUNCTION_TABLE_ii[$itr & 127]($vertices) | 0; //@line 3183
 HEAPF32[$call_i >> 2] = $2; //@line 3185
 HEAPF32[$call_i + 4 >> 2] = $1; //@line 3187
 $call6_i = FUNCTION_TABLE_ii[$itr & 127]($call_i) | 0; //@line 3188
 HEAPF32[$call6_i >> 2] = $2; //@line 3190
 HEAPF32[$call6_i + 4 >> 2] = $3; //@line 3192
 $call11_i = FUNCTION_TABLE_ii[$itr & 127]($call6_i) | 0; //@line 3193
 HEAPF32[$call11_i >> 2] = $0; //@line 3195
 HEAPF32[$call11_i + 4 >> 2] = $1; //@line 3197
 $call_i23 = FUNCTION_TABLE_ii[$itr & 127]($call11_i) | 0; //@line 3198
 HEAPF32[$call_i23 >> 2] = $0; //@line 3200
 HEAPF32[$call_i23 + 4 >> 2] = $3; //@line 3202
 $call6_i27 = FUNCTION_TABLE_ii[$itr & 127]($call_i23) | 0; //@line 3203
 HEAPF32[$call6_i27 >> 2] = $2; //@line 3205
 HEAPF32[$call6_i27 + 4 >> 2] = $3; //@line 3207
 $11 = FUNCTION_TABLE_ii[$itr & 127]($call6_i27) | 0; //@line 3209
 STACKTOP = sp; //@line 3210
 return $11 | 0; //@line 3210
}
function _AQWorld_step($self, $dt) {
 $self = $self | 0;
 $dt = +$dt;
 var $integrateContext = 0, $particles = 0, $awakeParticles = 0, $_sleepingParticles = 0, $call218 = 0, $call220 = 0, $9 = 0, $headCollision = 0, sp = 0;
 sp = STACKTOP; //@line 9608
 STACKTOP = STACKTOP + 8 | 0; //@line 9608
 $integrateContext = sp | 0; //@line 9609
 HEAP32[$integrateContext >> 2] = $self; //@line 9611
 HEAPF32[$integrateContext + 4 >> 2] = $dt; //@line 9613
 $particles = $self + 32 | 0; //@line 9614
 $awakeParticles = $self + 40 | 0; //@line 9616
 _AQList_iterateN(HEAP32[$particles >> 2] | 0, HEAP32[$awakeParticles >> 2] | 0, 23, $integrateContext) | 0; //@line 9619
 $_sleepingParticles = $self + 44 | 0; //@line 9620
 $call218 = _AQList_pop(HEAP32[$_sleepingParticles >> 2] | 0) | 0; //@line 9622
 if (($call218 | 0) != 0) {
  $call220 = $call218; //@line 9626
  do {
   _AQList_remove(HEAP32[$particles >> 2] | 0, $call220) | 0; //@line 9630
   _AQList_push(HEAP32[$particles >> 2] | 0, $call220) | 0; //@line 9632
   HEAP32[$awakeParticles >> 2] = (HEAP32[$awakeParticles >> 2] | 0) - 1; //@line 9635
   $call220 = _AQList_pop(HEAP32[$_sleepingParticles >> 2] | 0) | 0; //@line 9637
  } while (($call220 | 0) != 0);
 }
 $9 = $self; //@line 9649
 _AQDdvt_iteratePairs(HEAP32[$self + 28 >> 2] | 0, 19, $9); //@line 9650
 $headCollision = $self + 48 | 0; //@line 9651
 _aqcollision_iterate(HEAP32[$headCollision >> 2] | 0, 45, $9); //@line 9653
 _aqcollision_clear(HEAP32[$headCollision >> 2] | 0); //@line 9655
 HEAP32[$self + 52 >> 2] = HEAP32[$headCollision >> 2]; //@line 9658
 _AQList_iterate(HEAP32[$self + 36 >> 2] | 0, 26, 0) | 0; //@line 9661
 _AQList_iterateN(HEAP32[$particles >> 2] | 0, HEAP32[$awakeParticles >> 2] | 0, 36, $9) | 0; //@line 9664
 STACKTOP = sp; //@line 9665
 return;
}
function _AQWorld_addParticle($self, $particle) {
 $self = $self | 0;
 $particle = $particle | 0;
 var $tmp = 0, $position = 0, $5 = 0, $6 = 0, $awakeParticles = 0, $9 = 0, $10 = 0, $11$1 = 0, $12 = 0, $13 = 0, sp = 0;
 sp = STACKTOP; //@line 9674
 STACKTOP = STACKTOP + 16 | 0; //@line 9674
 $tmp = sp | 0; //@line 9675
 $position = $particle + 12 | 0; //@line 9676
 if (((HEAPF32[tempDoublePtr >> 2] = +HEAPF32[$position >> 2], HEAP32[tempDoublePtr >> 2] | 0) & 2147483647) >>> 0 > 2139095040) {
  ___assert_fail(960, 1224, 285, 1440); //@line 9684
 }
 if (((HEAPF32[tempDoublePtr >> 2] = +HEAPF32[$particle + 16 >> 2], HEAP32[tempDoublePtr >> 2] | 0) & 2147483647) >>> 0 > 2139095040) {
  ___assert_fail(960, 1224, 285, 1440); //@line 9694
 } else {
  _AQDdvt_addParticle(HEAP32[$self + 28 >> 2] | 0, $particle); //@line 9699
  $5 = HEAP32[$self + 32 >> 2] | 0; //@line 9701
  $6 = $particle | 0; //@line 9702
  _AQList_unshift($5, $6) | 0; //@line 9703
  $awakeParticles = $self + 40 | 0; //@line 9704
  HEAP32[$awakeParticles >> 2] = (HEAP32[$awakeParticles >> 2] | 0) + 1; //@line 9707
  HEAPF32[$particle + 24 >> 2] = +HEAPF32[$particle + 20 >> 2]; //@line 9711
  $9 = $position; //@line 9713
  $10 = $particle + 40 | 0; //@line 9714
  $11$1 = HEAP32[$9 + 4 >> 2] | 0; //@line 9718
  HEAP32[$10 >> 2] = HEAP32[$9 >> 2]; //@line 9720
  HEAP32[$10 + 4 >> 2] = $11$1; //@line 9722
  _AQParticle_aabb($tmp, $particle); //@line 9724
  $12 = $particle + 80 | 0; //@line 9725
  $13 = $tmp; //@line 9726
  HEAP32[$12 >> 2] = HEAP32[$13 >> 2]; //@line 9727
  HEAP32[$12 + 4 >> 2] = HEAP32[$13 + 4 >> 2]; //@line 9727
  HEAP32[$12 + 8 >> 2] = HEAP32[$13 + 8 >> 2]; //@line 9727
  HEAP32[$12 + 12 >> 2] = HEAP32[$13 + 12 >> 2]; //@line 9727
  STACKTOP = sp; //@line 9728
  return;
 }
}
function __AQActor_update($_self, $dt) {
 $_self = $_self | 0;
 $dt = +$dt;
 var $4 = 0, $8 = 0.0, $conv_i_i = 0.0, $conv1_i_i = 0.0, $conv4_i_i = 0.0, $mul1_i = 0.0, $11 = 0, $position_i = 0, $13 = 0, $14 = 0, $tmp_sroa_0_0_insert_insert_i$0 = 0.0, $tmp_sroa_0_0_insert_insert_i$1 = 0.0, $17 = 0, $18 = 0, $19 = 0;
 if ((HEAP32[$_self + 40 >> 2] | 0) != 1) {
  return;
 }
 $4 = $_self + 92 | 0; //@line 141
 _AQWorld_wakeParticle(HEAP32[$_self + 88 >> 2] | 0, HEAP32[$4 >> 2] | 0); //@line 143
 $8 = +HEAPF32[$_self + 48 >> 2]; //@line 149
 $conv_i_i = +HEAPF32[$_self + 44 >> 2]; //@line 150
 $conv1_i_i = +Math_cos(+$conv_i_i); //@line 152
 $conv4_i_i = +Math_sin(+$conv_i_i); //@line 154
 $mul1_i = $8 * +HEAPF32[$_self + 20 >> 2] * $dt; //@line 159
 $11 = HEAP32[$4 >> 2] | 0; //@line 162
 $position_i = $11 + 12 | 0; //@line 163
 $13 = HEAP32[$_self + 96 >> 2] | 0; //@line 167
 $14 = $13 + 48 | 0; //@line 176
 $tmp_sroa_0_0_insert_insert_i$0 = +(+HEAPF32[$position_i >> 2] + $conv1_i_i * $mul1_i); //@line 185
 $tmp_sroa_0_0_insert_insert_i$1 = +($conv4_i_i * $mul1_i + +HEAPF32[$11 + 16 >> 2]); //@line 186
 HEAPF32[$14 >> 2] = $tmp_sroa_0_0_insert_insert_i$0; //@line 188
 HEAPF32[$14 + 4 >> 2] = $tmp_sroa_0_0_insert_insert_i$1; //@line 190
 $17 = $13 + 12 | 0; //@line 191
 HEAPF32[$17 >> 2] = $tmp_sroa_0_0_insert_insert_i$0; //@line 193
 HEAPF32[$17 + 4 >> 2] = $tmp_sroa_0_0_insert_insert_i$1; //@line 195
 $18 = $11 + 48 | 0; //@line 196
 HEAPF32[$18 >> 2] = $tmp_sroa_0_0_insert_insert_i$0; //@line 198
 HEAPF32[$18 + 4 >> 2] = $tmp_sroa_0_0_insert_insert_i$1; //@line 200
 $19 = $position_i; //@line 201
 HEAPF32[$19 >> 2] = $tmp_sroa_0_0_insert_insert_i$0; //@line 203
 HEAPF32[$19 + 4 >> 2] = $tmp_sroa_0_0_insert_insert_i$1; //@line 205
 return;
}
function _AQReleasePool_done($self) {
 $self = $self | 0;
 var $0 = 0, $4 = 0, $node_013 = 0, $5 = 0, $6 = 0, $7 = 0, $refCount_i10 = 0, $dec_i = 0, $parentPool = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0;
 $0 = HEAP32[$self + 20 >> 2] | 0; //@line 12504
 if (($0 | 0) != 0) {
  HEAP32[$0 + 4 >> 2] = 0; //@line 12510
  _free(FUNCTION_TABLE_ii[HEAP32[(HEAP32[$0 >> 2] | 0) + 16 >> 2] & 127]($0) | 0); //@line 12516
 }
 $4 = HEAP32[$self + 12 >> 2] | 0; //@line 12520
 if (($4 | 0) != 0) {
  $node_013 = $4; //@line 12524
  while (1) {
   $5 = HEAP32[$node_013 + 4 >> 2] | 0; //@line 12528
   $6 = HEAP32[$node_013 >> 2] | 0; //@line 12530
   $7 = $6; //@line 12531
   do {
    if (($6 | 0) != 0) {
     $refCount_i10 = $6 + 4 | 0; //@line 12536
     $dec_i = (HEAP32[$refCount_i10 >> 2] | 0) - 1 | 0; //@line 12538
     HEAP32[$refCount_i10 >> 2] = $dec_i; //@line 12539
     if (($dec_i | 0) != 0) {
      break;
     }
     HEAP32[$refCount_i10 >> 2] = 0; //@line 12545
     _free(FUNCTION_TABLE_ii[HEAP32[(HEAP32[$6 >> 2] | 0) + 16 >> 2] & 127]($7) | 0); //@line 12551
    }
   } while (0);
   _free($node_013); //@line 12556
   if (($5 | 0) == 0) {
    break;
   } else {
    $node_013 = $5; //@line 12562
   }
  }
 }
 $parentPool = $self + 24 | 0; //@line 12566
 $12 = HEAP32[$parentPool >> 2] | 0; //@line 12567
 if (($12 | 0) == 0) {
  $13 = 0; //@line 12571
  $14 = $13 | 0; //@line 12573
  HEAP32[798] = $14; //@line 12574
  $15 = $self | 0; //@line 12575
  return $15 | 0; //@line 12576
 }
 HEAP32[$12 + 20 >> 2] = 0; //@line 12579
 $13 = HEAP32[$parentPool >> 2] | 0; //@line 12582
 $14 = $13 | 0; //@line 12584
 HEAP32[798] = $14; //@line 12585
 $15 = $self | 0; //@line 12586
 return $15 | 0; //@line 12587
}
function _AQShaders_boot() {
 var $programStatus_i = 0, $call_i = 0, $call1_i = 0, $call3_i = 0, $call1 = 0, $call2 = 0, $call3 = 0, $6 = 0, tempVarArgs = 0, sp = 0;
 sp = STACKTOP; //@line 4485
 STACKTOP = STACKTOP + 8 | 0; //@line 4485
 $programStatus_i = sp | 0; //@line 4486
 $call_i = _glCreateProgram() | 0; //@line 4488
 $call1_i = _glCreateShader(35632) | 0; //@line 4489
 _compileShader($call1_i, 232); //@line 4490
 _glAttachShader($call_i | 0, $call1_i | 0); //@line 4491
 $call3_i = _glCreateShader(35633) | 0; //@line 4492
 _compileShader($call3_i, 368); //@line 4493
 _glAttachShader($call_i | 0, $call3_i | 0); //@line 4494
 _glLinkProgram($call_i | 0); //@line 4495
 _glGetProgramiv($call_i | 0, 35714, $programStatus_i | 0); //@line 4496
 if ((HEAP32[$programStatus_i >> 2] | 0) == 0) {
  _puts(8) | 0; //@line 4501
 }
 HEAP32[800] = $call_i; //@line 4504
 HEAP32[801] = 18; //@line 4505
 _glUseProgram($call_i | 0); //@line 4506
 $call1 = _glGetAttribLocation(HEAP32[800] | 0, 120) | 0; //@line 4508
 HEAP32[802] = $call1; //@line 4509
 _glEnableVertexAttribArray($call1 | 0); //@line 4510
 $call2 = _glGetAttribLocation(HEAP32[800] | 0, 912) | 0; //@line 4512
 HEAP32[803] = $call2; //@line 4513
 _glEnableVertexAttribArray($call2 | 0); //@line 4514
 $call3 = _glGetUniformLocation(HEAP32[800] | 0, 744) | 0; //@line 4516
 HEAP32[804] = $call3; //@line 4517
 $6 = HEAP32[802] | 0; //@line 4519
 _printf(632, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 24 | 0, HEAP32[tempVarArgs >> 2] = HEAP32[800], HEAP32[tempVarArgs + 8 >> 2] = $6, HEAP32[tempVarArgs + 16 >> 2] = $call3, tempVarArgs) | 0) | 0; //@line 4520
 STACKTOP = tempVarArgs; //@line 4520
 STACKTOP = sp; //@line 4521
 return;
}
function _compileShader($shader, $source) {
 $shader = $shader | 0;
 $source = $source | 0;
 var $length = 0, $compileStatus = 0, $infologlength = 0, $arrayinit_begin = 0, $add = 0, $2 = 0, $vla = 0, tempVarArgs = 0, sp = 0;
 sp = STACKTOP; //@line 4603
 STACKTOP = STACKTOP + 32 | 0; //@line 4603
 $length = sp | 0; //@line 4604
 $compileStatus = sp + 16 | 0; //@line 4606
 $infologlength = sp + 24 | 0; //@line 4607
 HEAP32[$length >> 2] = _strlen($source | 0) | 0; //@line 4609
 $arrayinit_begin = sp + 8 | 0; //@line 4610
 HEAP32[$arrayinit_begin >> 2] = $source; //@line 4611
 _glShaderSource($shader | 0, 1, $arrayinit_begin | 0, $length | 0); //@line 4612
 _glCompileShader($shader | 0); //@line 4613
 _glGetShaderiv($shader | 0, 35713, $compileStatus | 0); //@line 4614
 if ((HEAP32[$compileStatus >> 2] | 0) != 0) {
  STACKTOP = sp; //@line 4619
  return;
 }
 _glGetShaderiv($shader | 0, 35716, $infologlength | 0); //@line 4621
 $add = (HEAP32[$infologlength >> 2] | 0) + 1 | 0; //@line 4623
 $2 = _llvm_stacksave() | 0; //@line 4624
 $vla = STACKTOP; //@line 4625
 STACKTOP = STACKTOP + $add | 0; //@line 4625
 STACKTOP = STACKTOP + 7 & -8; //@line 4625
 _glGetShaderInfoLog($shader | 0, HEAP32[$infologlength >> 2] | 0, 0, $vla | 0); //@line 4627
 _puts(40) | 0; //@line 4628
 _printf(96, (tempVarArgs = STACKTOP, STACKTOP = STACKTOP + 8 | 0, HEAP32[tempVarArgs >> 2] = $vla, tempVarArgs) | 0) | 0; //@line 4629
 STACKTOP = tempVarArgs; //@line 4629
 _llvm_stackrestore($2 | 0); //@line 4630
 STACKTOP = sp; //@line 4632
 return;
}
function _AQArray_push($self, $obj) {
 $self = $self | 0;
 $obj = $obj | 0;
 var $length = 0, $0 = 0, $capacity = 0, $add = 0, $2 = 0, $items1_i = 0, $3 = 0, $tmpArray_sroa_3_12_load14_i = 0, $inc_i10_i = 0, $items_pre_phi = 0, $7 = 0, $8 = 0;
 $length = $self + 12 | 0; //@line 10860
 $0 = HEAP32[$length >> 2] | 0; //@line 10861
 $capacity = $self + 16 | 0; //@line 10862
 if (($0 | 0) == (HEAP32[$capacity >> 2] | 0)) {
  $add = $0 + 16 | 0; //@line 10867
  $2 = _calloc($add, 4) | 0; //@line 10869
  $items1_i = $self + 20 | 0; //@line 10870
  $3 = HEAP32[$items1_i >> 2] | 0; //@line 10871
  if (($3 | 0) != 0) {
   if (($0 | 0) > 0) {
    $tmpArray_sroa_3_12_load14_i = 0; //@line 10878
    while (1) {
     $inc_i10_i = $tmpArray_sroa_3_12_load14_i + 1 | 0; //@line 10883
     HEAP32[$2 + ($tmpArray_sroa_3_12_load14_i << 2) >> 2] = HEAP32[$3 + ($tmpArray_sroa_3_12_load14_i << 2) >> 2]; //@line 10885
     if (($inc_i10_i | 0) < ($0 | 0)) {
      $tmpArray_sroa_3_12_load14_i = $inc_i10_i; //@line 10889
     } else {
      break;
     }
    }
   }
   _free($3); //@line 10896
  }
  HEAP32[$capacity >> 2] = $add; //@line 10899
  HEAP32[$items1_i >> 2] = $2; //@line 10900
  $items_pre_phi = $items1_i; //@line 10902
 } else {
  $items_pre_phi = $self + 20 | 0; //@line 10906
 }
 $7 = _aqretain($obj) | 0; //@line 10911
 $8 = HEAP32[$length >> 2] | 0; //@line 10912
 HEAP32[$length >> 2] = $8 + 1; //@line 10914
 HEAP32[(HEAP32[$items_pre_phi >> 2] | 0) + ($8 << 2) >> 2] = $7; //@line 10917
 return 1; //@line 10918
}
function _AQInput_setActionToKey($action, $keyCode) {
 $action = $action | 0;
 $keyCode = $keyCode | 0;
 var $0 = 0, $1 = 0, $2 = 0, $call1 = 0, $3 = 0, $4 = 0, $5 = 0, $keyCodes = 0, $7 = 0, $8 = 0, $9 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0;
 $0 = HEAP32[830] | 0; //@line 10403
 if (($0 | 0) == 0) {
  $1 = _aqinit(_aqalloc(2400) | 0) | 0; //@line 10409
  HEAP32[830] = $1; //@line 10410
  $2 = $1; //@line 10412
 } else {
  $2 = $0; //@line 10414
 }
 $call1 = _aqint($keyCode) | 0; //@line 10417
 $3 = $call1; //@line 10418
 $4 = $2; //@line 10419
 if ((_AQMap_get($4, $call1) | 0) != 0) {
  return;
 }
 $5 = $action; //@line 10426
 _AQMap_set($4, $call1, $5); //@line 10427
 $keyCodes = $action + 16 | 0; //@line 10428
 if ((_AQList_length(HEAP32[$keyCodes >> 2] | 0) | 0) == 0) {
  $7 = HEAP32[826] | 0; //@line 10434
  if (($7 | 0) == 0) {
   $8 = _aqinit(_aqalloc(2400) | 0) | 0; //@line 10440
   HEAP32[826] = $8; //@line 10441
   $9 = $8; //@line 10443
  } else {
   $9 = $7; //@line 10445
  }
  _AQMap_set($9, HEAP32[$action + 12 >> 2] | 0, $5); //@line 10452
  $13 = HEAP32[828] | 0; //@line 10453
  if (($13 | 0) == 0) {
   $14 = _aqinit(_aqalloc(2280) | 0) | 0; //@line 10459
   HEAP32[828] = $14; //@line 10460
   $15 = $14; //@line 10462
  } else {
   $15 = $13; //@line 10464
  }
  $16 = $action | 0; //@line 10467
  _AQList_push($15, $16) | 0; //@line 10468
 }
 _AQList_push(HEAP32[$keyCodes >> 2] | 0, $3) | 0; //@line 10472
 return;
}
function __AQWorld_maintainBoxIterator($particle, $ctx) {
 $particle = $particle | 0;
 $ctx = $ctx | 0;
 var $aabb = 0, $1 = 0.0, $3 = 0.0, $x = 0, $5 = 0.0, $7 = 0.0, $x17 = 0, $9 = 0.0, $11 = 0.0, $y = 0, $13 = 0.0, $14 = 0.0, $y40 = 0, sp = 0;
 sp = STACKTOP; //@line 9508
 STACKTOP = STACKTOP + 16 | 0; //@line 9508
 $aabb = sp | 0; //@line 9509
 if ((HEAP8[$particle + 98 | 0] | 0) != 0) {
  STACKTOP = sp; //@line 9515
  return;
 }
 _AQParticle_aabb($aabb, $particle); //@line 9517
 $1 = +HEAPF32[$aabb + 12 >> 2]; //@line 9519
 $3 = +HEAPF32[$ctx + 24 >> 2]; //@line 9523
 if ($1 < $3) {
  $x = $particle + 12 | 0; //@line 9528
  HEAPF32[$x >> 2] = $3 - $1 + +HEAPF32[$x >> 2]; //@line 9531
 }
 $5 = +HEAPF32[$aabb + 4 >> 2]; //@line 9535
 $7 = +HEAPF32[$ctx + 16 >> 2]; //@line 9538
 if ($5 > $7) {
  $x17 = $particle + 12 | 0; //@line 9543
  HEAPF32[$x17 >> 2] = $7 - $5 + +HEAPF32[$x17 >> 2]; //@line 9546
 }
 $9 = +HEAPF32[$aabb + 8 >> 2]; //@line 9550
 $11 = +HEAPF32[$ctx + 20 >> 2]; //@line 9553
 if ($9 < $11) {
  $y = $particle + 16 | 0; //@line 9558
  HEAPF32[$y >> 2] = $11 - $9 + +HEAPF32[$y >> 2]; //@line 9561
 }
 $13 = +HEAPF32[$aabb >> 2]; //@line 9565
 $14 = +HEAPF32[$ctx + 12 >> 2]; //@line 9567
 if ($13 <= $14) {
  STACKTOP = sp; //@line 9571
  return;
 }
 $y40 = $particle + 16 | 0; //@line 9574
 HEAPF32[$y40 >> 2] = $14 - $13 + +HEAPF32[$y40 >> 2]; //@line 9577
 STACKTOP = sp; //@line 9579
 return;
}
function _AQCamera_setGlMatrix($self, $matrix) {
 $self = $self | 0;
 $matrix = $matrix | 0;
 var $0 = 0.0, $1 = 0.0, $2 = 0.0, $3 = 0.0, $sub8 = 0.0, $div = 0.0, $sub11 = 0.0, $div12 = 0.0, $conv = 0.0, $conv17 = 0.0, $conv21 = 0.0, $div37 = 0.0, $div39 = 0.0, $sub44 = 0.0;
 $0 = +HEAPF32[$self + 16 >> 2]; //@line 1322
 $1 = +HEAPF32[$self + 24 >> 2]; //@line 1324
 $2 = +HEAPF32[$self + 12 >> 2]; //@line 1326
 $3 = +HEAPF32[$self + 20 >> 2]; //@line 1328
 $sub8 = $0 - $1; //@line 1331
 $div = (-0.0 - ($0 + $1)) / $sub8; //@line 1332
 $sub11 = $2 - $3; //@line 1335
 $div12 = (-0.0 - ($2 + $3)) / $sub11; //@line 1336
 $conv = +HEAPF32[$self + 44 >> 2]; //@line 1339
 $conv17 = +Math_cos(+$conv); //@line 1341
 $conv21 = +Math_sin(+$conv); //@line 1343
 $div37 = 2.0 / $sub8; //@line 1344
 HEAPF32[$matrix >> 2] = $conv17 * $div37; //@line 1346
 $div39 = 2.0 / $sub11; //@line 1347
 HEAPF32[$matrix + 16 >> 2] = $conv21 * $div39; //@line 1350
 $sub44 = -0.0 - $conv21; //@line 1351
 HEAPF32[$matrix + 4 >> 2] = $div37 * $sub44; //@line 1354
 HEAPF32[$matrix + 20 >> 2] = $conv17 * $div39; //@line 1357
 HEAPF32[$matrix + 40 >> 2] = -.0020000000949949026; //@line 1359
 HEAPF32[$matrix + 48 >> 2] = $div * $conv17 + $div12 * $conv21; //@line 1364
 HEAPF32[$matrix + 52 >> 2] = $div12 * $conv17 + $div * $sub44; //@line 1369
 HEAPF32[$matrix + 56 >> 2] = -1.0; //@line 1371
 return $self | 0; //@line 1372
}
function __AQActorView_draw($_self) {
 $_self = $_self | 0;
 var $_compoundliteral = 0, $_compoundliteral16 = 0, $vertices1 = 0, $0 = 0, $2 = 0, $call = 0, $call8 = 0, $5 = 0, $call15 = 0, $call21 = 0, sp = 0;
 sp = STACKTOP; //@line 366
 STACKTOP = STACKTOP + 16 | 0; //@line 366
 $_compoundliteral = sp | 0; //@line 367
 $_compoundliteral16 = sp + 8 | 0; //@line 368
 $vertices1 = $_self + 20 | 0; //@line 370
 $0 = $_self + 12 | 0; //@line 372
 $2 = HEAP32[(HEAP32[$0 >> 2] | 0) + 92 >> 2] | 0; //@line 375
 $call = _AQDraw_polygon($vertices1, 18, 32, $2 + 12 | 0, +HEAPF32[$2 + 20 >> 2], 0.0) | 0; //@line 379
 HEAP8[$_compoundliteral | 0] = 0; //@line 381
 HEAP8[$_compoundliteral + 1 | 0] = 0; //@line 383
 HEAP8[$_compoundliteral + 2 | 0] = 0; //@line 385
 HEAP8[$_compoundliteral + 3 | 0] = -1; //@line 387
 $call8 = _AQDraw_color($vertices1, $call, 18, 44, $_compoundliteral) | 0; //@line 388
 $5 = HEAP32[(HEAP32[$0 >> 2] | 0) + 92 >> 2] | 0; //@line 391
 $call15 = _AQDraw_polygon($call8, 18, 32, $5 + 12 | 0, +HEAPF32[$5 + 20 >> 2] + -1.0, 0.0) | 0; //@line 396
 HEAP32[$_compoundliteral16 >> 2] = -1; //@line 397
 $call21 = _AQDraw_color($call8, $call15, 18, 44, $_compoundliteral16) | 0; //@line 398
 _AQShaders_useProgram(1); //@line 399
 _AQShaders_draw(HEAP32[$_self + 16 >> 2] | 0, $vertices1, $call21 - $vertices1 | 0); //@line 406
 STACKTOP = sp; //@line 407
 return;
}
function _AQDraw_color($start, $end, $next, $getcolor, $color) {
 $start = $start | 0;
 $end = $end | 0;
 $next = $next | 0;
 $getcolor = $getcolor | 0;
 $color = $color | 0;
 var $0 = 0, $1 = 0, $ptr_05 = 0, $2 = 0, tempParam = 0, sp = 0;
 sp = STACKTOP; //@line 3327
 tempParam = $color; //@line 3328
 $color = STACKTOP; //@line 3328
 STACKTOP = STACKTOP + 4 | 0; //@line 3328
 STACKTOP = STACKTOP + 7 & -8; //@line 3328
 HEAP32[$color >> 2] = HEAP32[tempParam >> 2]; //@line 3328
 if ($start >>> 0 >= $end >>> 0) {
  STACKTOP = sp; //@line 3332
  return $end | 0; //@line 3332
 }
 $0 = $color; //@line 3334
 $1 = HEAPU8[$0] | HEAPU8[$0 + 1 | 0] << 8 | HEAPU8[$0 + 2 | 0] << 16 | HEAPU8[$0 + 3 | 0] << 24 | 0; //@line 3335
 $ptr_05 = $start; //@line 3337
 do {
  $2 = FUNCTION_TABLE_ii[$getcolor & 127]($ptr_05) | 0; //@line 3341
  tempBigInt = $1; //@line 3342
  HEAP8[$2] = tempBigInt & 255; //@line 3342
  tempBigInt = tempBigInt >> 8; //@line 3342
  HEAP8[$2 + 1 | 0] = tempBigInt & 255; //@line 3342
  tempBigInt = tempBigInt >> 8; //@line 3342
  HEAP8[$2 + 2 | 0] = tempBigInt & 255; //@line 3342
  tempBigInt = tempBigInt >> 8; //@line 3342
  HEAP8[$2 + 3 | 0] = tempBigInt & 255; //@line 3342
  $ptr_05 = FUNCTION_TABLE_ii[$next & 127]($ptr_05) | 0; //@line 3344
 } while ($ptr_05 >>> 0 < $end >>> 0);
 STACKTOP = sp; //@line 3353
 return $end | 0; //@line 3353
}
function __AQDdvt_updateParticle($self, $particle, $old, $new) {
 $self = $self | 0;
 $particle = $particle | 0;
 $old = $old | 0;
 $new = $new | 0;
 var $tl = 0, $length = 0, $3 = 0, $tr_i = 0, $bl_i = 0, $br_i = 0;
 $tl = $self + 32 | 0; //@line 7284
 if ((HEAP32[$tl >> 2] | 0) == 0) {
  __AQDdvt_updateParticleLeaf($self, $particle, $old, $new); //@line 7289
  return;
 }
 __AQDdvt_updateParticleChild($self, $particle, $old, $new); //@line 7293
 $length = $self + 240 | 0; //@line 7294
 if ((HEAP32[$length >> 2] | 0) != 24) {
  return;
 }
 HEAP32[$length >> 2] = 0; //@line 7301
 $3 = $self; //@line 7303
 _AQDdvt_iterate(HEAP32[$tl >> 2] | 0, 20, $3); //@line 7304
 $tr_i = $self + 36 | 0; //@line 7305
 _AQDdvt_iterate(HEAP32[$tr_i >> 2] | 0, 20, $3); //@line 7307
 $bl_i = $self + 40 | 0; //@line 7308
 _AQDdvt_iterate(HEAP32[$bl_i >> 2] | 0, 20, $3); //@line 7310
 $br_i = $self + 44 | 0; //@line 7311
 _AQDdvt_iterate(HEAP32[$br_i >> 2] | 0, 20, $3); //@line 7313
 _aqrelease(HEAP32[$tl >> 2] | 0) | 0; //@line 7316
 HEAP32[$tl >> 2] = 0; //@line 7317
 _aqrelease(HEAP32[$tr_i >> 2] | 0) | 0; //@line 7320
 HEAP32[$tr_i >> 2] = 0; //@line 7321
 _aqrelease(HEAP32[$bl_i >> 2] | 0) | 0; //@line 7324
 HEAP32[$bl_i >> 2] = 0; //@line 7325
 _aqrelease(HEAP32[$br_i >> 2] | 0) | 0; //@line 7328
 HEAP32[$br_i >> 2] = 0; //@line 7329
 return;
}
function _AQWebAudioDriver_loadSound($self, $path) {
 $self = $self | 0;
 $path = $path | 0;
 var $soundMap = 0, $2 = 0, $call = 0, $call1 = 0, $call5 = 0, $context = 0, $5 = 0, $call7 = 0, $call_i = 0, $retval_0_in = 0, $retval_0 = 0;
 $soundMap = $self + 16 | 0; //@line 9996
 $2 = $path; //@line 9999
 $call = _AQMap_get(HEAP32[$soundMap >> 2] | 0, $2) | 0; //@line 10000
 if (($call | 0) != 0) {
  $retval_0_in = $call; //@line 10004
  $retval_0 = $retval_0_in; //@line 10006
  return $retval_0 | 0; //@line 10007
 }
 $call1 = _aqcreate(2048) | 0; //@line 10009
 HEAP32[$call1 + 12 >> 2] = _aqretain($2) | 0; //@line 10014
 $call5 = _AQString_concat(_aqstr(824) | 0, $path) | 0; //@line 10016
 $context = $self + 12 | 0; //@line 10017
 $5 = HEAP32[$context >> 2] | 0; //@line 10018
 $call7 = __webAudioBufferCreate($5 | 0, _AQString_cstr($call5) | 0) | 0; //@line 10020
 $call_i = _aqcreate(1544) | 0; //@line 10021
 HEAP32[$call_i + 12 >> 2] = HEAP32[$context >> 2]; //@line 10025
 HEAP32[$call_i + 16 >> 2] = $call7; //@line 10028
 HEAP32[$call1 + 16 >> 2] = _aqretain($call_i) | 0; //@line 10032
 _AQMap_set(HEAP32[$soundMap >> 2] | 0, $2, $call1); //@line 10035
 $retval_0_in = $call1; //@line 10037
 $retval_0 = $retval_0_in; //@line 10039
 return $retval_0 | 0; //@line 10040
}
function __BBRoom_moveWall($_wall, $diff) {
 $_wall = $_wall | 0;
 $diff = $diff | 0;
 var $diff_0_val = 0.0, $diff_1_val = 0.0, $_sroa_0_0_tmp5_idx = 0, $_sroa_0_0_copyload = 0.0, $0 = 0, $_sroa_1_4_copyload = 0.0, $1 = 0, $_sroa_2_8_copyload = 0.0, $2 = 0, $add5_i = 0.0;
 $diff_0_val = +HEAPF32[$diff >> 2]; //@line 4346
 $diff_1_val = +HEAPF32[$diff + 4 >> 2]; //@line 4348
 $_sroa_0_0_tmp5_idx = $_wall + 12 | 0; //@line 4349
 $_sroa_0_0_copyload = (copyTempFloat($_sroa_0_0_tmp5_idx | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4350
 $0 = $_wall + 16 | 0; //@line 4352
 $_sroa_1_4_copyload = (copyTempFloat($0 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4353
 $1 = $_wall + 20 | 0; //@line 4355
 $_sroa_2_8_copyload = (copyTempFloat($1 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4356
 $2 = $_wall + 24 | 0; //@line 4358
 $add5_i = $diff_0_val + (copyTempFloat($2 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4363
 HEAPF32[$_sroa_0_0_tmp5_idx >> 2] = $diff_1_val + $_sroa_0_0_copyload; //@line 4364
 HEAPF32[$0 >> 2] = $diff_0_val + $_sroa_1_4_copyload; //@line 4365
 HEAPF32[$1 >> 2] = $diff_1_val + $_sroa_2_8_copyload; //@line 4366
 HEAPF32[$2 >> 2] = $add5_i; //@line 4367
 _AQList_iterate(HEAP32[$_wall + 28 >> 2] | 0, 33, $diff) | 0; //@line 4372
 return;
}
function _AQDdvt_iterate($self, $iterator, $ctx) {
 $self = $self | 0;
 $iterator = $iterator | 0;
 $ctx = $ctx | 0;
 var $0 = 0, $self_tr_lcssa = 0, $1 = 0, $index_017 = 0, $3 = 0, $self_tr20 = 0, $6 = 0, $7 = 0;
 $0 = HEAP32[$self + 32 >> 2] | 0; //@line 7822
 if (($0 | 0) == 0) {
  $self_tr_lcssa = $self; //@line 7826
 } else {
  $self_tr20 = $self; //@line 7828
  $3 = $0; //@line 7828
  while (1) {
   _AQDdvt_iterate($3, $iterator, $ctx); //@line 7832
   _AQDdvt_iterate(HEAP32[$self_tr20 + 36 >> 2] | 0, $iterator, $ctx); //@line 7835
   _AQDdvt_iterate(HEAP32[$self_tr20 + 40 >> 2] | 0, $iterator, $ctx); //@line 7838
   $6 = HEAP32[$self_tr20 + 44 >> 2] | 0; //@line 7840
   $7 = HEAP32[$6 + 32 >> 2] | 0; //@line 7842
   if (($7 | 0) == 0) {
    $self_tr_lcssa = $6; //@line 7846
    break;
   } else {
    $self_tr20 = $6; //@line 7849
    $3 = $7; //@line 7849
   }
  }
 }
 $1 = HEAP32[$self_tr_lcssa + 240 >> 2] | 0; //@line 7855
 if (($1 | 0) > 0) {
  $index_017 = 0; //@line 7859
 } else {
  return;
 }
 do {
  FUNCTION_TABLE_vii[$iterator & 63](HEAP32[$self_tr_lcssa + 48 + ($index_017 << 2) >> 2] | 0, $ctx); //@line 7867
  $index_017 = $index_017 + 1 | 0; //@line 7868
 } while (($index_017 | 0) < ($1 | 0));
 return;
}
function _AQActor_init($self) {
 $self = $self | 0;
 var $size = 0, $body = 0, $call4 = 0, $trigger = 0, $div_i = 0.0, $conv_i = 0.0;
 _aqzero($self) | 0; //@line 217
 HEAPF32[$self + 16 >> 2] = 80.0; //@line 219
 $size = $self + 24 | 0; //@line 220
 HEAPF32[$size >> 2] = 8.0; //@line 221
 HEAPF32[$self + 20 >> 2] = 80.0; //@line 223
 HEAP32[$self + 28 >> 2] = 0; //@line 225
 HEAPF32[$self + 84 >> 2] = 0.0; //@line 227
 $body = $self + 92 | 0; //@line 231
 HEAP32[$body >> 2] = _aqinit(_aqalloc(2208) | 0) | 0; //@line 232
 $call4 = _aqinit(_aqalloc(2208) | 0) | 0; //@line 234
 $trigger = $self + 96 | 0; //@line 236
 HEAP32[$trigger >> 2] = $call4; //@line 237
 HEAP8[$call4 + 97 | 0] = 1; //@line 239
 $div_i = +HEAPF32[$size >> 2] * .5; //@line 241
 HEAPF32[(HEAP32[$trigger >> 2] | 0) + 20 >> 2] = $div_i; //@line 244
 HEAPF32[(HEAP32[$body >> 2] | 0) + 20 >> 2] = $div_i; //@line 247
 $conv_i = +HEAPF32[$size >> 2]; //@line 249
 HEAPF32[(HEAP32[$body >> 2] | 0) + 28 >> 2] = $conv_i * $conv_i * 3.141592653589793 * .5 * .5; //@line 257
 HEAP32[$self + 100 >> 2] = _aqinit(_aqalloc(2280) | 0) | 0; //@line 262
 HEAP32[$self + 108 >> 2] = 0; //@line 264
 return $self | 0; //@line 265
}
function _aqcreate($type) {
 $type = $type | 0;
 var $call_i = 0, $call_i1 = 0, $4 = 0, $call_i_i = 0, $headNode_i_i = 0, $tailNode4_i_i = 0;
 $call_i = _malloc(HEAP32[$type + 4 >> 2] | 0) | 0; //@line 12329
 HEAP32[$call_i >> 2] = $type; //@line 12331
 HEAP32[$call_i + 4 >> 2] = 1; //@line 12334
 HEAP32[$call_i + 8 >> 2] = 0; //@line 12337
 $call_i1 = FUNCTION_TABLE_ii[HEAP32[$type + 12 >> 2] & 127]($call_i) | 0; //@line 12340
 $4 = HEAP32[798] | 0; //@line 12341
 if (($4 | 0) == 0) {
  return $call_i1 | 0; //@line 12345
 }
 $call_i_i = _malloc(8) | 0; //@line 12348
 HEAP32[$call_i_i >> 2] = $call_i1; //@line 12350
 HEAP32[$call_i_i + 4 >> 2] = 0; //@line 12353
 $headNode_i_i = $4 + 12 | 0; //@line 12354
 $tailNode4_i_i = $4 + 16 | 0; //@line 12358
 if ((HEAP32[$headNode_i_i >> 2] | 0) == 0) {
  HEAP32[$tailNode4_i_i >> 2] = $call_i_i; //@line 12362
  HEAP32[$headNode_i_i >> 2] = $call_i_i; //@line 12365
  return $call_i1 | 0; //@line 12367
 } else {
  HEAP32[(HEAP32[$tailNode4_i_i >> 2] | 0) + 4 >> 2] = $call_i_i; //@line 12373
  HEAP32[$tailNode4_i_i >> 2] = $call_i_i; //@line 12375
  return $call_i1 | 0; //@line 12376
 }
 return 0; //@line 12378
}
function _AQWorld_setAabb($self, $aabb) {
 $self = $self | 0;
 $aabb = $aabb | 0;
 var $0 = 0, $1 = 0, $3 = 0, tempParam = 0, sp = 0;
 sp = STACKTOP; //@line 9588
 tempParam = $aabb; //@line 9589
 $aabb = STACKTOP; //@line 9589
 STACKTOP = STACKTOP + 16 | 0; //@line 9589
 HEAP32[$aabb >> 2] = HEAP32[tempParam >> 2]; //@line 9589
 HEAP32[$aabb + 4 >> 2] = HEAP32[tempParam + 4 >> 2]; //@line 9589
 HEAP32[$aabb + 8 >> 2] = HEAP32[tempParam + 8 >> 2]; //@line 9589
 HEAP32[$aabb + 12 >> 2] = HEAP32[tempParam + 12 >> 2]; //@line 9589
 $0 = $self + 12 | 0; //@line 9591
 $1 = $aabb; //@line 9592
 HEAP32[$0 >> 2] = HEAP32[$1 >> 2]; //@line 9593
 HEAP32[$0 + 4 >> 2] = HEAP32[$1 + 4 >> 2]; //@line 9593
 HEAP32[$0 + 8 >> 2] = HEAP32[$1 + 8 >> 2]; //@line 9593
 HEAP32[$0 + 12 >> 2] = HEAP32[$1 + 12 >> 2]; //@line 9593
 $3 = (HEAP32[$self + 28 >> 2] | 0) + 12 | 0; //@line 9597
 HEAP32[$3 >> 2] = HEAP32[$1 >> 2]; //@line 9598
 HEAP32[$3 + 4 >> 2] = HEAP32[$1 + 4 >> 2]; //@line 9598
 HEAP32[$3 + 8 >> 2] = HEAP32[$1 + 8 >> 2]; //@line 9598
 HEAP32[$3 + 12 >> 2] = HEAP32[$1 + 12 >> 2]; //@line 9598
 STACKTOP = sp; //@line 9599
 return $self | 0; //@line 9599
}
function _AQList_push($_self, $item) {
 $_self = $_self | 0;
 $item = $item | 0;
 var $call = 0, $1 = 0, $tail = 0, $2 = 0, $_pre = 0, $5 = 0, $length = 0, $head = 0;
 $call = _malloc(12) | 0; //@line 11291
 HEAP32[$call >> 2] = 0; //@line 11293
 $1 = $call + 8 | 0; //@line 11297
 HEAP32[$1 >> 2] = 0; //@line 11298
 $tail = $_self + 20 | 0; //@line 11299
 $2 = HEAP32[$tail >> 2] | 0; //@line 11300
 HEAP32[$call + 4 >> 2] = $2; //@line 11302
 do {
  if (($2 | 0) != 0) {
   HEAP32[$2 >> 2] = $call; //@line 11309
   $_pre = HEAP32[$1 >> 2] | 0; //@line 11310
   if (($_pre | 0) == 0) {
    break;
   }
   $5 = $_pre; //@line 11316
   _aqrelease($5) | 0; //@line 11317
  }
 } while (0);
 HEAP32[$1 >> 2] = 0; //@line 11321
 if (($item | 0) != 0) {
  HEAP32[$1 >> 2] = _aqretain($item) | 0; //@line 11328
 }
 $length = $_self + 12 | 0; //@line 11331
 HEAP32[$length >> 2] = (HEAP32[$length >> 2] | 0) + 1; //@line 11337
 HEAP32[$tail >> 2] = $call; //@line 11338
 $head = $_self + 16 | 0; //@line 11339
 if ((HEAP32[$head >> 2] | 0) != 0) {
  return $_self | 0; //@line 11345
 }
 HEAP32[$head >> 2] = $call; //@line 11348
 return $_self | 0; //@line 11350
}
function _BBBlock_clone($original) {
 $original = $original | 0;
 var $call = 0, $aabb = 0, $1 = 0, $sides = 0, $4 = 0;
 $call = _aqcreate(1904) | 0; //@line 1021
 $aabb = $call + 12 | 0; //@line 1023
 $1 = $original + 12 | 0; //@line 1025
 HEAP32[$aabb >> 2] = HEAP32[$1 >> 2]; //@line 1026
 HEAP32[$aabb + 4 >> 2] = HEAP32[$1 + 4 >> 2]; //@line 1026
 HEAP32[$aabb + 8 >> 2] = HEAP32[$1 + 8 >> 2]; //@line 1026
 HEAP32[$aabb + 12 >> 2] = HEAP32[$1 + 12 >> 2]; //@line 1026
 HEAP32[$call + 28 >> 2] = HEAP32[$original + 28 >> 2]; //@line 1031
 $sides = $call + 36 | 0; //@line 1032
 $4 = $original + 36 | 0; //@line 1034
 HEAP32[$sides >> 2] = HEAP32[$4 >> 2]; //@line 1035
 HEAP32[$sides + 4 >> 2] = HEAP32[$4 + 4 >> 2]; //@line 1035
 HEAP32[$sides + 8 >> 2] = HEAP32[$4 + 8 >> 2]; //@line 1035
 HEAP32[$sides + 12 >> 2] = HEAP32[$4 + 12 >> 2]; //@line 1035
 _AQList_iterate(HEAP32[$original + 52 >> 2] | 0, 38, HEAP32[$call + 52 >> 2] | 0) | 0; //@line 1042
 _AQList_iterate(HEAP32[$original + 60 >> 2] | 0, 18, HEAP32[$call + 60 >> 2] | 0) | 0; //@line 1049
 return $call | 0; //@line 1050
}
function _AQList_pop($_self) {
 $_self = $_self | 0;
 var $tail = 0, $0 = 0, $1 = 0, $2 = 0, $4 = 0, $head = 0, $7 = 0, $10 = 0, $length = 0, $obj_0 = 0;
 $tail = $_self + 20 | 0; //@line 11359
 $0 = HEAP32[$tail >> 2] | 0; //@line 11360
 $1 = $0; //@line 11361
 if (($0 | 0) == 0) {
  $obj_0 = 0; //@line 11365
  return $obj_0 | 0; //@line 11367
 }
 $2 = $0 + 4 | 0; //@line 11370
 HEAP32[$tail >> 2] = HEAP32[$2 >> 2]; //@line 11373
 $4 = HEAP32[$2 >> 2] | 0; //@line 11374
 if (($4 | 0) != 0) {
  HEAP32[$4 >> 2] = 0; //@line 11379
 }
 $head = $_self + 16 | 0; //@line 11382
 if ((HEAP32[$head >> 2] | 0) == ($1 | 0)) {
  HEAP32[$head >> 2] = 0; //@line 11388
 }
 $7 = $0 + 8 | 0; //@line 11392
 $10 = _aqautorelease(HEAP32[$7 >> 2] | 0) | 0; //@line 11396
 HEAP32[$2 >> 2] = 0; //@line 11397
 HEAP32[$0 >> 2] = 0; //@line 11399
 HEAP32[$7 >> 2] = 0; //@line 11400
 _free(_aqlistnode_done($1) | 0); //@line 11403
 $length = $_self + 12 | 0; //@line 11404
 HEAP32[$length >> 2] = (HEAP32[$length >> 2] | 0) - 1; //@line 11410
 $obj_0 = $10; //@line 11412
 return $obj_0 | 0; //@line 11414
}
function _BBRoom_moveTo($self, $tl) {
 $self = $self | 0;
 $tl = $tl | 0;
 var $agg_tmp = 0, $aabb2_sroa_0_0_copyload = 0.0, $aabb2_sroa_2_12_copyload = 0.0, $sub3_i = 0.0, $call = 0, tempParam = 0, sp = 0;
 sp = STACKTOP; //@line 4460
 STACKTOP = STACKTOP + 8 | 0; //@line 4460
 tempParam = $tl; //@line 4461
 $tl = STACKTOP; //@line 4461
 STACKTOP = STACKTOP + 8 | 0; //@line 4461
 HEAP32[$tl >> 2] = HEAP32[tempParam >> 2]; //@line 4461
 HEAP32[$tl + 4 >> 2] = HEAP32[tempParam + 4 >> 2]; //@line 4461
 $agg_tmp = sp | 0; //@line 4462
 $aabb2_sroa_0_0_copyload = (copyTempFloat($self + 24 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4464
 $aabb2_sroa_2_12_copyload = (copyTempFloat($self + 36 | 0), +HEAPF32[tempDoublePtr >> 2]); //@line 4466
 $sub3_i = +HEAPF32[$tl + 4 >> 2] - $aabb2_sroa_0_0_copyload; //@line 4472
 HEAPF32[$agg_tmp >> 2] = +HEAPF32[$tl >> 2] - $aabb2_sroa_2_12_copyload; //@line 4474
 HEAPF32[$agg_tmp + 4 >> 2] = $sub3_i; //@line 4476
 $call = _BBRoom_move($self, $agg_tmp) | 0; //@line 4477
 STACKTOP = sp; //@line 4478
 return $call | 0; //@line 4478
}
function _AQList_findIndex($_self, $iterator, $ctx) {
 $_self = $_self | 0;
 $iterator = $iterator | 0;
 $ctx = $ctx | 0;
 var $node_04 = 0, $node_07 = 0, $index_06 = 0, $node_0 = 0, $retval_0 = 0, label = 0;
 $node_04 = HEAP32[$_self + 16 >> 2] | 0; //@line 11862
 if (($node_04 | 0) == 0) {
  $retval_0 = -1; //@line 11866
  return $retval_0 | 0; //@line 11868
 } else {
  $index_06 = 0; //@line 11870
  $node_07 = $node_04; //@line 11870
 }
 while (1) {
  if ((FUNCTION_TABLE_iii[$iterator & 63](HEAP32[$node_07 + 8 >> 2] | 0, $ctx) | 0) != 0) {
   $retval_0 = $index_06; //@line 11881
   label = 1104; //@line 11882
   break;
  }
  $node_0 = HEAP32[$node_07 >> 2] | 0; //@line 11887
  if (($node_0 | 0) == 0) {
   $retval_0 = -1; //@line 11891
   label = 1103; //@line 11892
   break;
  } else {
   $index_06 = $index_06 + 1 | 0; //@line 11895
   $node_07 = $node_0; //@line 11895
  }
 }
 if ((label | 0) == 1103) {
  return $retval_0 | 0; //@line 11900
 } else if ((label | 0) == 1104) {
  return $retval_0 | 0; //@line 11904
 }
 return 0; //@line 11906
}
function _AQDdvt_done($self) {
 $self = $self | 0;
 var $tl = 0, $0 = 0, $1 = 0, $i_015 = 0, $tr = 0, $bl = 0, $br = 0, $15 = 0;
 $tl = $self + 32 | 0; //@line 5671
 $0 = HEAP32[$tl >> 2] | 0; //@line 5672
 if (($0 | 0) != 0) {
  HEAP32[$tl >> 2] = _aqrelease($0) | 0; //@line 5679
  $tr = $self + 36 | 0; //@line 5680
  HEAP32[$tr >> 2] = _aqrelease(HEAP32[$tr >> 2] | 0) | 0; //@line 5685
  $bl = $self + 40 | 0; //@line 5686
  HEAP32[$bl >> 2] = _aqrelease(HEAP32[$bl >> 2] | 0) | 0; //@line 5691
  $br = $self + 44 | 0; //@line 5692
  HEAP32[$br >> 2] = _aqrelease(HEAP32[$br >> 2] | 0) | 0; //@line 5697
  $15 = $self; //@line 5698
  return $15 | 0; //@line 5699
 }
 $1 = HEAP32[$self + 240 >> 2] | 0; //@line 5702
 if (($1 | 0) > 0) {
  $i_015 = 0; //@line 5706
 } else {
  $15 = $self; //@line 5708
  return $15 | 0; //@line 5709
 }
 do {
  _aqautorelease(HEAP32[$self + 48 + ($i_015 << 2) >> 2] | 0) | 0; //@line 5716
  $i_015 = $i_015 + 1 | 0; //@line 5717
 } while (($i_015 | 0) < ($1 | 0));
 $15 = $self; //@line 5726
 return $15 | 0; //@line 5727
}
function _AQDdvt_updateParticle($self, $particle, $old, $new) {
 $self = $self | 0;
 $particle = $particle | 0;
 $old = $old | 0;
 $new = $new | 0;
 var tempParam = 0, sp = 0;
 sp = STACKTOP; //@line 8138
 tempParam = $old; //@line 8139
 $old = STACKTOP; //@line 8139
 STACKTOP = STACKTOP + 16 | 0; //@line 8139
 HEAP32[$old >> 2] = HEAP32[tempParam >> 2]; //@line 8139
 HEAP32[$old + 4 >> 2] = HEAP32[tempParam + 4 >> 2]; //@line 8139
 HEAP32[$old + 8 >> 2] = HEAP32[tempParam + 8 >> 2]; //@line 8139
 HEAP32[$old + 12 >> 2] = HEAP32[tempParam + 12 >> 2]; //@line 8139
 tempParam = $new; //@line 8140
 $new = STACKTOP; //@line 8140
 STACKTOP = STACKTOP + 16 | 0; //@line 8140
 HEAP32[$new >> 2] = HEAP32[tempParam >> 2]; //@line 8140
 HEAP32[$new + 4 >> 2] = HEAP32[tempParam + 4 >> 2]; //@line 8140
 HEAP32[$new + 8 >> 2] = HEAP32[tempParam + 8 >> 2]; //@line 8140
 HEAP32[$new + 12 >> 2] = HEAP32[tempParam + 12 >> 2]; //@line 8140
 __AQDdvt_updateParticle($self, $particle, $old, $new); //@line 8141
 STACKTOP = sp; //@line 8142
 return;
}
function _AQInput_setActionToKeys($action, varrp) {
 $action = $action | 0;
 varrp = varrp | 0;
 var $args = 0, $arraydecay = 0, $arraydecay1 = 0, $0 = 0, $1 = 0, sp = 0;
 sp = STACKTOP; //@line 10482
 STACKTOP = STACKTOP + 16 | 0; //@line 10482
 $args = sp | 0; //@line 10483
 $arraydecay = $args | 0; //@line 10484
 $arraydecay1 = $args; //@line 10485
 HEAP32[$arraydecay1 >> 2] = varrp; //@line 10486
 HEAP32[$arraydecay1 + 4 >> 2] = 0; //@line 10486
 $0 = (tempInt = HEAP32[$arraydecay + 4 >> 2] | 0, HEAP32[$arraydecay + 4 >> 2] = tempInt + 8, HEAP32[(HEAP32[$arraydecay >> 2] | 0) + tempInt >> 2] | 0); //@line 10487
 if (($0 | 0) == 0) {
  STACKTOP = sp; //@line 10492
  return;
 } else {
  $1 = $0; //@line 10494
 }
 do {
  _AQInput_setActionToKey($action, $1); //@line 10498
  $1 = (tempInt = HEAP32[$arraydecay + 4 >> 2] | 0, HEAP32[$arraydecay + 4 >> 2] = tempInt + 8, HEAP32[(HEAP32[$arraydecay >> 2] | 0) + tempInt >> 2] | 0); //@line 10499
 } while (($1 | 0) != 0);
 STACKTOP = sp; //@line 10509
 return;
}
function __AQWebAudioDriver_createSource($self, $sound) {
 $self = $self | 0;
 $sound = $sound | 0;
 var $sourceList_i = 0, $call_i = 0, $1 = 0, $call_i6 = 0, $context_i = 0, $3 = 0, $5 = 0;
 $sourceList_i = $self + 20 | 0; //@line 10067
 $call_i = _AQList_findIndex(HEAP32[$sourceList_i >> 2] | 0, 21, 0) | 0; //@line 10069
 if (($call_i | 0) != -1) {
  $1 = HEAP32[$sourceList_i >> 2] | 0; //@line 10073
  _AQList_removeAt($1, $call_i) | 0; //@line 10074
 }
 $call_i6 = _aqcreate(1488) | 0; //@line 10077
 $context_i = $self + 12 | 0; //@line 10079
 $3 = HEAP32[$context_i >> 2] | 0; //@line 10080
 HEAP32[$call_i6 + 12 >> 2] = $3; //@line 10083
 $5 = $call_i6 + 16 | 0; //@line 10086
 HEAP32[$5 >> 2] = __webAudioSourceCreate($3 | 0) | 0; //@line 10087
 _AQList_push(HEAP32[$sourceList_i >> 2] | 0, $call_i6) | 0; //@line 10090
 __webAudioSourceSetBuffer(HEAP32[$context_i >> 2] | 0, HEAP32[$5 >> 2] | 0, HEAP32[(HEAP32[$sound + 16 >> 2] | 0) + 16 >> 2] | 0); //@line 10098
 return $call_i6 | 0; //@line 10099
}
function _AQList_indexOf($_self, $item) {
 $_self = $_self | 0;
 $item = $item | 0;
 var $node_04 = 0, $node_07 = 0, $i_06 = 0, $node_0 = 0, $tobool_lcssa = 0, label = 0;
 $node_04 = HEAP32[$_self + 16 >> 2] | 0; //@line 11633
 if (($node_04 | 0) == 0) {
  $tobool_lcssa = -1; //@line 11637
  return $tobool_lcssa | 0; //@line 11639
 } else {
  $i_06 = 0; //@line 11641
  $node_07 = $node_04; //@line 11641
 }
 while (1) {
  if ((HEAP32[$node_07 + 8 >> 2] | 0) == ($item | 0)) {
   $tobool_lcssa = $i_06; //@line 11650
   label = 1077; //@line 11651
   break;
  }
  $node_0 = HEAP32[$node_07 >> 2] | 0; //@line 11656
  if (($node_0 | 0) == 0) {
   $tobool_lcssa = -1; //@line 11660
   label = 1075; //@line 11661
   break;
  } else {
   $i_06 = $i_06 + 1 | 0; //@line 11664
   $node_07 = $node_0; //@line 11664
  }
 }
 if ((label | 0) == 1077) {
  return $tobool_lcssa | 0; //@line 11669
 } else if ((label | 0) == 1075) {
  return $tobool_lcssa | 0; //@line 11673
 }
 return 0; //@line 11675
}
function _AQLoop_step($dt) {
 $dt = +$dt;
 var $0 = 0, $1 = 0, $2 = 0, $onceFunctions = 0, $node_06_i = 0, $5 = 0;
 $0 = HEAP32[824] | 0; //@line 3486
 if (($0 | 0) == 0) {
  $1 = _aqinit(_aqalloc(2256) | 0) | 0; //@line 3492
  HEAP32[824] = $1; //@line 3493
  $2 = $1; //@line 3495
 } else {
  $2 = $0; //@line 3497
 }
 _SLUpdater_iterateList(HEAP32[$2 + 16 >> 2] | 0, $dt); //@line 3502
 $onceFunctions = $2 + 20 | 0; //@line 3503
 $node_06_i = HEAP32[$onceFunctions >> 2] | 0; //@line 3506
 do {
  $5 = HEAP32[$node_06_i >> 2] | 0; //@line 3510
  if (($5 | 0) == 0) {
   break;
  }
  FUNCTION_TABLE_vi[$5 & 31](HEAP32[$node_06_i + 4 >> 2] | 0); //@line 3517
  $node_06_i = HEAP32[$node_06_i + 8 >> 2] | 0; //@line 3519
 } while (($node_06_i | 0) != 0);
 HEAP32[HEAP32[$onceFunctions >> 2] >> 2] = 0; //@line 3530
 HEAP32[$2 + 24 >> 2] = HEAP32[$onceFunctions >> 2]; //@line 3533
 _AQWorld_step(HEAP32[$2 + 12 >> 2] | 0, $dt); //@line 3536
 _AQInput_step(); //@line 3537
 return;
}
function _AQDdvt_create($aabb) {
 $aabb = $aabb | 0;
 var $call = 0, $aabb1 = 0, $1 = 0, tempParam = 0, sp = 0;
 sp = STACKTOP; //@line 5735
 tempParam = $aabb; //@line 5736
 $aabb = STACKTOP; //@line 5736
 STACKTOP = STACKTOP + 16 | 0; //@line 5736
 HEAP32[$aabb >> 2] = HEAP32[tempParam >> 2]; //@line 5736
 HEAP32[$aabb + 4 >> 2] = HEAP32[tempParam + 4 >> 2]; //@line 5736
 HEAP32[$aabb + 8 >> 2] = HEAP32[tempParam + 8 >> 2]; //@line 5736
 HEAP32[$aabb + 12 >> 2] = HEAP32[tempParam + 12 >> 2]; //@line 5736
 $call = _aqcreate(2424) | 0; //@line 5737
 $aabb1 = $call + 12 | 0; //@line 5739
 $1 = $aabb; //@line 5740
 HEAP32[$aabb1 >> 2] = HEAP32[$1 >> 2]; //@line 5741
 HEAP32[$aabb1 + 4 >> 2] = HEAP32[$1 + 4 >> 2]; //@line 5741
 HEAP32[$aabb1 + 8 >> 2] = HEAP32[$1 + 8 >> 2]; //@line 5741
 HEAP32[$aabb1 + 12 >> 2] = HEAP32[$1 + 12 >> 2]; //@line 5741
 STACKTOP = sp; //@line 5742
 return $call | 0; //@line 5742
}
function _AQDdvt_addParticle($self, $particle) {
 $self = $self | 0;
 $particle = $particle | 0;
 var $aabb = 0, $length_i = 0, $3 = 0, $4 = 0, sp = 0;
 sp = STACKTOP; //@line 5943
 STACKTOP = STACKTOP + 16 | 0; //@line 5943
 $aabb = sp | 0; //@line 5944
 _AQParticle_aabb($aabb, $particle); //@line 5945
 HEAP32[$self + 28 >> 2] = 0; //@line 5947
 do {
  if ((HEAP32[$self + 32 >> 2] | 0) == 0) {
   $length_i = $self + 240 | 0; //@line 5954
   if ((HEAP32[$length_i >> 2] | 0) >= 48) {
    __AQDdvt_toChildren($self); //@line 5959
    break;
   }
   $3 = _aqretain($particle) | 0; //@line 5965
   $4 = HEAP32[$length_i >> 2] | 0; //@line 5966
   HEAP32[$length_i >> 2] = $4 + 1; //@line 5968
   HEAP32[$self + 48 + ($4 << 2) >> 2] = $3; //@line 5970
   STACKTOP = sp; //@line 5972
   return;
  }
 } while (0);
 __AQDdvt_addParticleChild($self, $particle, $aabb); //@line 5975
 STACKTOP = sp; //@line 5976
 return;
}
function _AQList_remove($self, $item) {
 $self = $self | 0;
 $item = $item | 0;
 var $node_04_i = 0, $node_07_i = 0, $i_06_i = 0, $node_0_i = 0, $tobool_lcssa_i = 0;
 $node_04_i = HEAP32[$self + 16 >> 2] | 0; //@line 11686
 L1324 : do {
  if (($node_04_i | 0) == 0) {
   $tobool_lcssa_i = -1; //@line 11691
  } else {
   $i_06_i = 0; //@line 11693
   $node_07_i = $node_04_i; //@line 11693
   while (1) {
    if ((HEAP32[$node_07_i + 8 >> 2] | 0) == ($item | 0)) {
     $tobool_lcssa_i = $i_06_i; //@line 11701
     break L1324;
    }
    $node_0_i = HEAP32[$node_07_i >> 2] | 0; //@line 11706
    if (($node_0_i | 0) == 0) {
     $tobool_lcssa_i = -1; //@line 11710
     break;
    } else {
     $i_06_i = $i_06_i + 1 | 0; //@line 11713
     $node_07_i = $node_0_i; //@line 11713
    }
   }
  }
 } while (0);
 return _AQList_removeAt($self, $tobool_lcssa_i) | 0; //@line 11720
}
function _AQDictMap_set($self, $key, $value) {
 $self = $self | 0;
 $key = $key | 0;
 $value = $value | 0;
 var $pairList = 0, $call = 0, $value1 = 0, $3 = 0, $4 = 0, $call_i = 0, $9 = 0;
 $pairList = $self + 12 | 0; //@line 11163
 $call = _AQList_find(HEAP32[$pairList >> 2] | 0, 17, $key) | 0; //@line 11165
 if (($call | 0) == 0) {
  $4 = HEAP32[$pairList >> 2] | 0; //@line 11169
  $call_i = _aqcreate(2376) | 0; //@line 11170
  HEAP32[$call_i + 12 >> 2] = _aqretain($key) | 0; //@line 11175
  HEAP32[$call_i + 16 >> 2] = _aqretain($value) | 0; //@line 11180
  $9 = $call_i; //@line 11181
  _AQList_push($4, $9) | 0; //@line 11182
  return;
 } else {
  $value1 = $call + 16 | 0; //@line 11185
  $3 = HEAP32[$value1 >> 2] | 0; //@line 11188
  _aqrelease($3) | 0; //@line 11189
  HEAP32[$value1 >> 2] = _aqretain($value) | 0; //@line 11192
  return;
 }
}
function __AQDdvt_fromChildrenIterator($particle, $ctx) {
 $particle = $particle | 0;
 $ctx = $ctx | 0;
 var $0 = 0, $1 = 0, $2 = 0, $index_0_i = 0, $5 = 0, $6 = 0, label = 0;
 $0 = $ctx; //@line 7766
 $1 = $ctx + 240 | 0; //@line 7768
 $2 = HEAP32[$1 >> 2] | 0; //@line 7769
 $index_0_i = 0; //@line 7771
 while (1) {
  if (($index_0_i | 0) >= ($2 | 0)) {
   break;
  }
  if ((HEAP32[$0 + 48 + ($index_0_i << 2) >> 2] | 0) == ($particle | 0)) {
   label = 610; //@line 7785
   break;
  } else {
   $index_0_i = $index_0_i + 1 | 0; //@line 7788
  }
 }
 do {
  if ((label | 0) == 610) {
   if (($index_0_i | 0) == -1) {
    break;
   }
   return;
  }
 } while (0);
 $5 = _aqretain($particle) | 0; //@line 7803
 $6 = HEAP32[$1 >> 2] | 0; //@line 7804
 HEAP32[$1 >> 2] = $6 + 1; //@line 7806
 HEAP32[$0 + 48 + ($6 << 2) >> 2] = $5; //@line 7808
 return;
}
function _AQWebAudioDriver_playSoundAt($self, $sound, $x, $y) {
 $self = $self | 0;
 $sound = $sound | 0;
 $x = +$x;
 $y = +$y;
 var $call = 0, $context = 0, $source1 = 0, $call5 = 0;
 $call = __AQWebAudioDriver_createSource($self, $sound) | 0; //@line 10174
 $context = $self + 12 | 0; //@line 10175
 $source1 = $call + 16 | 0; //@line 10177
 __webAudioSourceSetPosition(HEAP32[$context >> 2] | 0, HEAP32[$source1 >> 2] | 0, +$x, +$y, +0.0); //@line 10181
 __webAudioSourcePlay(HEAP32[$context >> 2] | 0, HEAP32[$source1 >> 2] | 0); //@line 10184
 $call5 = _aqcreate(2072) | 0; //@line 10185
 HEAP32[$call5 + 12 >> 2] = _aqretain($sound) | 0; //@line 10192
 HEAP32[$call5 + 16 >> 2] = _aqretain($call) | 0; //@line 10197
 HEAPF64[$call5 + 24 >> 3] = $x; //@line 10200
 HEAPF64[$call5 + 32 >> 3] = $y; //@line 10203
 return $call5 | 0; //@line 10204
}
function _AQArray_done($self) {
 $self = $self | 0;
 var $items = 0, $0 = 0, $1 = 0, $2 = 0, $i_05_i = 0, $inc_i = 0, $_pre4 = 0, $5 = 0;
 $items = $self + 20 | 0; //@line 10787
 $0 = HEAP32[$items >> 2] | 0; //@line 10788
 if (($0 | 0) == 0) {
  return $self | 0; //@line 10792
 }
 $1 = HEAP32[$self + 12 >> 2] | 0; //@line 10795
 if (($1 | 0) > 0) {
  $i_05_i = 0; //@line 10799
  $2 = $0; //@line 10799
  while (1) {
   _aqrelease(HEAP32[$2 + ($i_05_i << 2) >> 2] | 0) | 0; //@line 10806
   $inc_i = $i_05_i + 1 | 0; //@line 10807
   $_pre4 = HEAP32[$items >> 2] | 0; //@line 10809
   if (($inc_i | 0) < ($1 | 0)) {
    $i_05_i = $inc_i; //@line 10812
    $2 = $_pre4; //@line 10812
   } else {
    $5 = $_pre4; //@line 10814
    break;
   }
  }
 } else {
  $5 = $0; //@line 10819
 }
 _free($5); //@line 10823
 return $self | 0; //@line 10825
}
function _AQString_concat($a, $b) {
 $a = $a | 0;
 $b = $b | 0;
 var $size = 0, $0 = 0, $size1 = 0, $call = 0, $call13 = 0;
 $size = $a + 12 | 0; //@line 12657
 $0 = HEAP32[$size >> 2] | 0; //@line 12658
 $size1 = $b + 12 | 0; //@line 12659
 $call = _malloc($0 + 1 + (HEAP32[$size1 >> 2] | 0) | 0) | 0; //@line 12663
 _strncpy($call | 0, HEAP32[$a + 16 >> 2] | 0, $0 | 0) | 0; //@line 12666
 _strncpy($call + (HEAP32[$size >> 2] | 0) | 0, HEAP32[$b + 16 >> 2] | 0, HEAP32[$size1 >> 2] | 0) | 0; //@line 12672
 HEAP8[$call + ((HEAP32[$size1 >> 2] | 0) + (HEAP32[$size >> 2] | 0)) | 0] = 0; //@line 12677
 $call13 = _aqcreate(2024) | 0; //@line 12678
 HEAP32[$call13 + 12 >> 2] = (HEAP32[$size1 >> 2] | 0) + (HEAP32[$size >> 2] | 0); //@line 12685
 HEAP32[$call13 + 16 >> 2] = $call; //@line 12688
 return $call13 | 0; //@line 12689
}
function _AQWorld_removeParticle($self, $particle) {
 $self = $self | 0;
 $particle = $particle | 0;
 var $particles = 0, $call = 0, $awakeParticles = 0, $3 = 0, $4 = 0, $call3 = 0;
 _AQDdvt_removeParticle(HEAP32[$self + 28 >> 2] | 0, $particle, $particle + 80 | 0); //@line 9741
 $particles = $self + 32 | 0; //@line 9742
 $call = _AQList_indexOf(HEAP32[$particles >> 2] | 0, $particle | 0) | 0; //@line 9745
 $awakeParticles = $self + 40 | 0; //@line 9746
 $3 = HEAP32[$awakeParticles >> 2] | 0; //@line 9747
 if (($call | 0) >= ($3 | 0)) {
  $4 = HEAP32[$particles >> 2] | 0; //@line 9751
  $call3 = _AQList_removeAt($4, $call) | 0; //@line 9752
  return;
 }
 HEAP32[$awakeParticles >> 2] = $3 - 1; //@line 9756
 $4 = HEAP32[$particles >> 2] | 0; //@line 9758
 $call3 = _AQList_removeAt($4, $call) | 0; //@line 9759
 return;
}
function _BBPathNode_move($pathNode, $diff) {
 $pathNode = $pathNode | 0;
 $diff = $diff | 0;
 var $position = 0, $0 = 0, $tmp_sroa_0_0_insert_insert$1 = 0.0, tempParam = 0, sp = 0;
 sp = STACKTOP; //@line 3731
 tempParam = $diff; //@line 3732
 $diff = STACKTOP; //@line 3732
 STACKTOP = STACKTOP + 8 | 0; //@line 3732
 HEAP32[$diff >> 2] = HEAP32[tempParam >> 2]; //@line 3732
 HEAP32[$diff + 4 >> 2] = HEAP32[tempParam + 4 >> 2]; //@line 3732
 $position = $pathNode + 12 | 0; //@line 3733
 $0 = $position; //@line 3744
 $tmp_sroa_0_0_insert_insert$1 = +(+HEAPF32[$pathNode + 16 >> 2] + +HEAPF32[$diff + 4 >> 2]); //@line 3754
 HEAPF32[$0 >> 2] = +HEAPF32[$position >> 2] + +HEAPF32[$diff >> 2]; //@line 3756
 HEAPF32[$0 + 4 >> 2] = $tmp_sroa_0_0_insert_insert$1; //@line 3758
 STACKTOP = sp; //@line 3759
 return;
}
function _memset(ptr, value, num) {
 ptr = ptr | 0;
 value = value | 0;
 num = num | 0;
 var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
 stop = ptr + num | 0; //@line 16512
 if ((num | 0) >= 20) {
  value = value & 255; //@line 16515
  unaligned = ptr & 3; //@line 16516
  value4 = value | value << 8 | value << 16 | value << 24; //@line 16517
  stop4 = stop & ~3; //@line 16518
  if (unaligned) {
   unaligned = ptr + 4 - unaligned | 0; //@line 16520
   while ((ptr | 0) < (unaligned | 0)) {
    HEAP8[ptr] = value; //@line 16522
    ptr = ptr + 1 | 0; //@line 16523
   }
  }
  while ((ptr | 0) < (stop4 | 0)) {
   HEAP32[ptr >> 2] = value4; //@line 16527
   ptr = ptr + 4 | 0; //@line 16528
  }
 }
 while ((ptr | 0) < (stop | 0)) {
  HEAP8[ptr] = value; //@line 16532
  ptr = ptr + 1 | 0; //@line 16533
 }
}
function _aqautorelease($self) {
 $self = $self | 0;
 var $0 = 0, $call_i = 0, $headNode_i = 0, $tailNode4_i = 0;
 $0 = HEAP32[798] | 0; //@line 12387
 if (($0 | 0) == 0) {
  return $self | 0; //@line 12391
 }
 $call_i = _malloc(8) | 0; //@line 12394
 HEAP32[$call_i >> 2] = $self; //@line 12396
 HEAP32[$call_i + 4 >> 2] = 0; //@line 12399
 $headNode_i = $0 + 12 | 0; //@line 12400
 $tailNode4_i = $0 + 16 | 0; //@line 12404
 if ((HEAP32[$headNode_i >> 2] | 0) == 0) {
  HEAP32[$tailNode4_i >> 2] = $call_i; //@line 12408
  HEAP32[$headNode_i >> 2] = $call_i; //@line 12411
  return $self | 0; //@line 12413
 } else {
  HEAP32[(HEAP32[$tailNode4_i >> 2] | 0) + 4 >> 2] = $call_i; //@line 12419
  HEAP32[$tailNode4_i >> 2] = $call_i; //@line 12421
  return $self | 0; //@line 12422
 }
 return 0; //@line 12424
}
function _memcpy(dest, src, num) {
 dest = dest | 0;
 src = src | 0;
 num = num | 0;
 var ret = 0;
 ret = dest | 0; //@line 16485
 if ((dest & 3) == (src & 3)) {
  while (dest & 3) {
   if ((num | 0) == 0) return ret | 0; //@line 16488
   HEAP8[dest] = HEAP8[src] | 0; //@line 16489
   dest = dest + 1 | 0; //@line 16490
   src = src + 1 | 0; //@line 16491
   num = num - 1 | 0; //@line 16492
  }
  while ((num | 0) >= 4) {
   HEAP32[dest >> 2] = HEAP32[src >> 2]; //@line 16495
   dest = dest + 4 | 0; //@line 16496
   src = src + 4 | 0; //@line 16497
   num = num - 4 | 0; //@line 16498
  }
 }
 while ((num | 0) > 0) {
  HEAP8[dest] = HEAP8[src] | 0; //@line 16502
  dest = dest + 1 | 0; //@line 16503
  src = src + 1 | 0; //@line 16504
  num = num - 1 | 0; //@line 16505
 }
 return ret | 0; //@line 16507
}
function _AQWorld_init($self) {
 $self = $self | 0;
 var $agg_tmp = 0, $call6 = 0, sp = 0;
 sp = STACKTOP; //@line 9126
 STACKTOP = STACKTOP + 16 | 0; //@line 9126
 $agg_tmp = sp | 0; //@line 9127
 _memset($agg_tmp | 0, 0, 16); //@line 9129
 HEAP32[$self + 28 >> 2] = _aqretain(_AQDdvt_create($agg_tmp) | 0) | 0; //@line 9135
 HEAP32[$self + 32 >> 2] = _aqretain(_aqcreate(2280) | 0) | 0; //@line 9140
 HEAP32[$self + 36 >> 2] = _aqretain(_aqcreate(2280) | 0) | 0; //@line 9145
 $call6 = _aqcollision_pop(0) | 0; //@line 9146
 HEAP32[$self + 48 >> 2] = $call6; //@line 9148
 HEAP32[$self + 52 >> 2] = $call6; //@line 9150
 HEAP32[$self + 40 >> 2] = 0; //@line 9152
 HEAP32[$self + 44 >> 2] = _aqretain(_aqcreate(2280) | 0) | 0; //@line 9157
 STACKTOP = sp; //@line 9158
 return $self | 0; //@line 9158
}
function _AQView_addToList($list, $object) {
 $list = $list | 0;
 $object = $object | 0;
 var $object_tr_lcssa = 0, $object_tr9 = 0, $call2 = 0, $call6 = 0;
 L286 : do {
  if ((_aqcast($object, 1992) | 0) == 0) {
   $object_tr9 = $object; //@line 4722
   while (1) {
    $call2 = _aqcast($object_tr9, 1976) | 0; //@line 4725
    if (($call2 | 0) == 0) {
     break;
    }
    $call6 = FUNCTION_TABLE_ii[HEAP32[$call2 + 4 >> 2] & 127]($object_tr9) | 0; //@line 4734
    if ((_aqcast($call6, 1992) | 0) == 0) {
     $object_tr9 = $call6; //@line 4739
    } else {
     $object_tr_lcssa = $call6; //@line 4741
     break L286;
    }
   }
   return;
  } else {
   $object_tr_lcssa = $object; //@line 4747
  }
 } while (0);
 _AQList_push($list, $object_tr_lcssa) | 0; //@line 4752
 return;
}
function _calloc($n_elements, $elem_size) {
 $n_elements = $n_elements | 0;
 $elem_size = $elem_size | 0;
 var $mul = 0, $req_0 = 0, $call = 0;
 do {
  if (($n_elements | 0) == 0) {
   $req_0 = 0; //@line 16439
  } else {
   $mul = Math_imul($elem_size, $n_elements) | 0; //@line 16441
   if (($elem_size | $n_elements) >>> 0 <= 65535) {
    $req_0 = $mul; //@line 16445
    break;
   }
   $req_0 = (($mul >>> 0) / ($n_elements >>> 0) | 0 | 0) == ($elem_size | 0) ? $mul : -1; //@line 16451
  }
 } while (0);
 $call = _malloc($req_0) | 0; //@line 16455
 if (($call | 0) == 0) {
  return $call | 0; //@line 16458
 }
 if ((HEAP32[$call - 4 >> 2] & 3 | 0) == 0) {
  return $call | 0; //@line 16466
 }
 _memset($call | 0, 0, $req_0 | 0); //@line 16468
 return $call | 0; //@line 16469
}
function _AQWorld_wakeParticle($self, $particle) {
 $self = $self | 0;
 $particle = $particle | 0;
 var $particles = 0, $call = 0, $awakeParticles = 0, $3 = 0, $call3 = 0;
 $particles = $self + 32 | 0; //@line 9445
 $call = _AQList_indexOf(HEAP32[$particles >> 2] | 0, $particle | 0) | 0; //@line 9448
 $awakeParticles = $self + 40 | 0; //@line 9449
 if (($call | 0) > (HEAP32[$awakeParticles >> 2] | 0)) {
  $3 = HEAP32[$particles >> 2] | 0; //@line 9454
  $call3 = _AQList_removeAt($3, $call) | 0; //@line 9455
  _AQList_unshift($3, $call3) | 0; //@line 9456
  HEAP32[$awakeParticles >> 2] = (HEAP32[$awakeParticles >> 2] | 0) + 1; //@line 9459
 }
 _AQDdvt_wakeParticle(HEAP32[$self + 28 >> 2] | 0, $particle); //@line 9464
 _AQParticle_wake($particle); //@line 9465
 return;
}
function _AQList_iterate($_self, $iterator, $ctx) {
 $_self = $_self | 0;
 $iterator = $iterator | 0;
 $ctx = $ctx | 0;
 var $1 = 0, $node_04_i = 0, $node_09_i = 0, $n_addr_08_i = 0;
 $1 = HEAP32[$_self + 12 >> 2] | 0; //@line 11732
 $node_04_i = HEAP32[$_self + 16 >> 2] | 0; //@line 11735
 if (($node_04_i | 0) == 0 | ($1 | 0) == 0) {
  return $_self | 0; //@line 11741
 } else {
  $n_addr_08_i = $1; //@line 11743
  $node_09_i = $node_04_i; //@line 11743
 }
 do {
  $n_addr_08_i = $n_addr_08_i - 1 | 0; //@line 11748
  FUNCTION_TABLE_vii[$iterator & 63](HEAP32[$node_09_i + 8 >> 2] | 0, $ctx); //@line 11751
  $node_09_i = HEAP32[$node_09_i >> 2] | 0; //@line 11753
 } while (!(($node_09_i | 0) == 0 | ($n_addr_08_i | 0) == 0));
 return $_self | 0; //@line 11764
}
function _AQList_find($_self, $iterator, $ctx) {
 $_self = $_self | 0;
 $iterator = $iterator | 0;
 $ctx = $ctx | 0;
 var $node_0_in = 0, $node_0 = 0, $item = 0, $retval_0 = 0, label = 0;
 $node_0_in = $_self + 16 | 0; //@line 11819
 while (1) {
  $node_0 = HEAP32[$node_0_in >> 2] | 0; //@line 11822
  if (($node_0 | 0) == 0) {
   $retval_0 = 0; //@line 11826
   label = 1098; //@line 11827
   break;
  }
  $item = $node_0 + 8 | 0; //@line 11830
  if ((FUNCTION_TABLE_iii[$iterator & 63](HEAP32[$item >> 2] | 0, $ctx) | 0) == 0) {
   $node_0_in = $node_0 | 0; //@line 11837
  } else {
   break;
  }
 }
 if ((label | 0) == 1098) {
  return $retval_0 | 0; //@line 11844
 }
 $retval_0 = HEAP32[$item >> 2] | 0; //@line 11848
 return $retval_0 | 0; //@line 11850
}
function _AQWebAudioDriver_playSoundLoop($self, $sound) {
 $self = $self | 0;
 $sound = $sound | 0;
 var $call = 0, $context = 0, $source1 = 0, $call4 = 0;
 $call = __AQWebAudioDriver_createSource($self, $sound) | 0; //@line 10137
 $context = $self + 12 | 0; //@line 10138
 $source1 = $call + 16 | 0; //@line 10140
 __webAudioSourceSetLooping(HEAP32[$context >> 2] | 0, HEAP32[$source1 >> 2] | 0, 1); //@line 10142
 __webAudioSourcePlay(HEAP32[$context >> 2] | 0, HEAP32[$source1 >> 2] | 0); //@line 10145
 $call4 = _aqcreate(2072) | 0; //@line 10146
 HEAP32[$call4 + 12 >> 2] = _aqretain($sound) | 0; //@line 10153
 HEAP32[$call4 + 16 >> 2] = _aqretain($call) | 0; //@line 10158
 HEAP32[$call4 + 20 >> 2] = 1; //@line 10161
 return $call4 | 0; //@line 10162
}
function __BBMultiWallView_drawWall($_wall, $ctx) {
 $_wall = $_wall | 0;
 $ctx = $ctx | 0;
 var $color = 0, $tmpcast = 0, $2 = 0, sp = 0;
 sp = STACKTOP; //@line 3628
 STACKTOP = STACKTOP + 8 | 0; //@line 3628
 $color = sp | 0; //@line 3629
 $tmpcast = $color; //@line 3630
 HEAP32[$color >> 2] = -16777216; //@line 3631
 if ((HEAP32[$_wall + 36 >> 2] | 0) == 1) {
  HEAP8[$color] = 66; //@line 3639
  HEAP8[$tmpcast + 1 | 0] = 33; //@line 3641
  HEAP8[$tmpcast + 2 | 0] = 0; //@line 3643
  HEAP8[$tmpcast + 3 | 0] = -1; //@line 3645
 }
 $2 = HEAP32[$ctx >> 2] | 0; //@line 3648
 HEAP32[$ctx >> 2] = _AQDraw_color($2, _AQDraw_rect($2, 18, $_wall + 12 | 0) | 0, 18, 44, $tmpcast) | 0; //@line 3653
 STACKTOP = sp; //@line 3654
 return;
}
function _BBRoom_addWall($self, $aabb, $wallType) {
 $self = $self | 0;
 $aabb = $aabb | 0;
 $wallType = $wallType | 0;
 var $0 = 0, tempParam = 0, sp = 0;
 sp = STACKTOP; //@line 4171
 tempParam = $aabb; //@line 4172
 $aabb = STACKTOP; //@line 4172
 STACKTOP = STACKTOP + 16 | 0; //@line 4172
 HEAP32[$aabb >> 2] = HEAP32[tempParam >> 2]; //@line 4172
 HEAP32[$aabb + 4 >> 2] = HEAP32[tempParam + 4 >> 2]; //@line 4172
 HEAP32[$aabb + 8 >> 2] = HEAP32[tempParam + 8 >> 2]; //@line 4172
 HEAP32[$aabb + 12 >> 2] = HEAP32[tempParam + 12 >> 2]; //@line 4172
 $0 = HEAP32[$self + 44 >> 2] | 0; //@line 4174
 _AQList_push($0, _BBWall_create($aabb, $wallType) | 0) | 0; //@line 4177
 STACKTOP = sp; //@line 4178
 return;
}
function _AQList_iterateN($_self, $n, $iterator, $ctx) {
 $_self = $_self | 0;
 $n = $n | 0;
 $iterator = $iterator | 0;
 $ctx = $ctx | 0;
 var $node_04 = 0, $node_09 = 0, $n_addr_08 = 0;
 $node_04 = HEAP32[$_self + 16 >> 2] | 0; //@line 11777
 if (($node_04 | 0) == 0 | ($n | 0) == 0) {
  return $_self | 0; //@line 11783
 } else {
  $n_addr_08 = $n; //@line 11785
  $node_09 = $node_04; //@line 11785
 }
 do {
  $n_addr_08 = $n_addr_08 - 1 | 0; //@line 11790
  FUNCTION_TABLE_vii[$iterator & 63](HEAP32[$node_09 + 8 >> 2] | 0, $ctx); //@line 11793
  $node_09 = HEAP32[$node_09 >> 2] | 0; //@line 11795
 } while (!(($node_09 | 0) == 0 | ($n_addr_08 | 0) == 0));
 return $_self | 0; //@line 11806
}
function _BBRoom_clone($original) {
 $original = $original | 0;
 var $call = 0, $aabb = 0, $1 = 0;
 $call = _aqcreate(1704) | 0; //@line 3965
 $aabb = $call + 24 | 0; //@line 3967
 $1 = $original + 24 | 0; //@line 3969
 HEAP32[$aabb >> 2] = HEAP32[$1 >> 2]; //@line 3970
 HEAP32[$aabb + 4 >> 2] = HEAP32[$1 + 4 >> 2]; //@line 3970
 HEAP32[$aabb + 8 >> 2] = HEAP32[$1 + 8 >> 2]; //@line 3970
 HEAP32[$aabb + 12 >> 2] = HEAP32[$1 + 12 >> 2]; //@line 3970
 _AQList_iterate(HEAP32[$original + 44 >> 2] | 0, 25, HEAP32[$call + 44 >> 2] | 0) | 0; //@line 3977
 _AQList_iterate(HEAP32[$original + 48 >> 2] | 0, 19, HEAP32[$call + 48 >> 2] | 0) | 0; //@line 3984
 return $call | 0; //@line 3985
}
function _aqcollision_iterate($col, $iterator, $ctx) {
 $col = $col | 0;
 $iterator = $iterator | 0;
 $ctx = $ctx | 0;
 var $col_addr_05 = 0, $1 = 0, label = 0;
 if (($col | 0) == 0) {
  return;
 } else {
  $col_addr_05 = $col; //@line 5622
 }
 while (1) {
  if ((HEAP32[$col_addr_05 >> 2] | 0) == 0) {
   label = 342; //@line 5630
   break;
  }
  FUNCTION_TABLE_vii[$iterator & 63]($col_addr_05, $ctx); //@line 5633
  $1 = HEAP32[$col_addr_05 + 20 >> 2] | 0; //@line 5635
  if (($1 | 0) == 0) {
   label = 341; //@line 5639
   break;
  } else {
   $col_addr_05 = $1; //@line 5642
  }
 }
 if ((label | 0) == 341) {
  return;
 } else if ((label | 0) == 342) {
  return;
 }
}
function _AQDdvt_removeParticle($self, $particle, $aabb) {
 $self = $self | 0;
 $particle = $particle | 0;
 $aabb = $aabb | 0;
 var tempParam = 0, sp = 0;
 sp = STACKTOP; //@line 8112
 tempParam = $aabb; //@line 8113
 $aabb = STACKTOP; //@line 8113
 STACKTOP = STACKTOP + 16 | 0; //@line 8113
 HEAP32[$aabb >> 2] = HEAP32[tempParam >> 2]; //@line 8113
 HEAP32[$aabb + 4 >> 2] = HEAP32[tempParam + 4 >> 2]; //@line 8113
 HEAP32[$aabb + 8 >> 2] = HEAP32[tempParam + 8 >> 2]; //@line 8113
 HEAP32[$aabb + 12 >> 2] = HEAP32[tempParam + 12 >> 2]; //@line 8113
 __AQDdvt_removeParticle($self, $particle, $aabb); //@line 8114
 STACKTOP = sp; //@line 8115
 return;
}
function _AQRenderer_init($self) {
 $self = $self | 0;
 var $1 = 0;
 $1 = $self + 12 | 0; //@line 3768
 tempBigInt = -14739958; //@line 3769
 HEAP8[$1] = tempBigInt & 255; //@line 3769
 tempBigInt = tempBigInt >> 8; //@line 3769
 HEAP8[$1 + 1 | 0] = tempBigInt & 255; //@line 3769
 tempBigInt = tempBigInt >> 8; //@line 3769
 HEAP8[$1 + 2 | 0] = tempBigInt & 255; //@line 3769
 tempBigInt = tempBigInt >> 8; //@line 3769
 HEAP8[$1 + 3 | 0] = tempBigInt & 255; //@line 3769
 HEAP32[$self + 16 >> 2] = _aqinit(_aqalloc(2464) | 0) | 0; //@line 3774
 HEAP32[$self + 20 >> 2] = _aqinit(_aqalloc(2280) | 0) | 0; //@line 3779
 return $self | 0; //@line 3780
}
function _AQCamera_init($self) {
 $self = $self | 0;
 var $0 = 0, $1 = 0;
 $0 = $self + 12 | 0; //@line 1296
 HEAPF32[$self + 12 >> 2] = 1.0; //@line 1298
 HEAPF32[$self + 16 >> 2] = 1.0; //@line 1300
 HEAPF32[$self + 20 >> 2] = 0.0; //@line 1302
 HEAPF32[$self + 24 >> 2] = 0.0; //@line 1304
 $1 = $self + 28 | 0; //@line 1306
 HEAP32[$1 >> 2] = HEAP32[$0 >> 2]; //@line 1307
 HEAP32[$1 + 4 >> 2] = HEAP32[$0 + 4 >> 2]; //@line 1307
 HEAP32[$1 + 8 >> 2] = HEAP32[$0 + 8 >> 2]; //@line 1307
 HEAP32[$1 + 12 >> 2] = HEAP32[$0 + 12 >> 2]; //@line 1307
 HEAPF32[$self + 44 >> 2] = 0.0; //@line 1309
 return $self | 0; //@line 1310
}
function _AQActor_updateData($self) {
 $self = $self | 0;
 var $size_i = 0, $div_i = 0.0, $body_i = 0, $conv_i = 0.0;
 HEAPF32[$self + 20 >> 2] = +HEAPF32[$self + 16 >> 2]; //@line 316
 $size_i = $self + 24 | 0; //@line 317
 $div_i = +HEAPF32[$size_i >> 2] * .5; //@line 319
 HEAPF32[(HEAP32[$self + 96 >> 2] | 0) + 20 >> 2] = $div_i; //@line 323
 $body_i = $self + 92 | 0; //@line 324
 HEAPF32[(HEAP32[$body_i >> 2] | 0) + 20 >> 2] = $div_i; //@line 327
 $conv_i = +HEAPF32[$size_i >> 2]; //@line 329
 HEAPF32[(HEAP32[$body_i >> 2] | 0) + 28 >> 2] = $conv_i * $conv_i * 3.141592653589793 * .5 * .5; //@line 337
 return;
}
function _AQInput_releaseKey($keyCode) {
 $keyCode = $keyCode | 0;
 var $0 = 0, $1 = 0, $2 = 0, $call2 = 0, $5 = 0;
 $0 = HEAP32[830] | 0; //@line 10557
 if (($0 | 0) == 0) {
  $1 = _aqinit(_aqalloc(2400) | 0) | 0; //@line 10563
  HEAP32[830] = $1; //@line 10564
  $2 = $1; //@line 10566
 } else {
  $2 = $0; //@line 10568
 }
 $call2 = _AQMap_get($2, _aqint($keyCode) | 0) | 0; //@line 10573
 if (($call2 | 0) == 0) {
  return;
 }
 HEAP32[$call2 + 28 >> 2] = 1; //@line 10581
 $5 = $call2 + 20 | 0; //@line 10583
 if ((HEAP32[$5 >> 2] | 0) != ($keyCode | 0)) {
  return;
 }
 HEAP32[$5 >> 2] = 0; //@line 10590
 return;
}
function _aqrelease($self) {
 $self = $self | 0;
 var $0 = 0, $dec = 0, $retval_0 = 0;
 if (($self | 0) == 0) {
  $retval_0 = 0; //@line 12292
  return $retval_0 | 0; //@line 12294
 }
 $0 = $self + 4 | 0; //@line 12297
 $dec = (HEAP32[$0 >> 2] | 0) - 1 | 0; //@line 12299
 HEAP32[$0 >> 2] = $dec; //@line 12300
 if (($dec | 0) != 0) {
  $retval_0 = $self; //@line 12304
  return $retval_0 | 0; //@line 12306
 }
 HEAP32[$0 >> 2] = 0; //@line 12308
 _free(FUNCTION_TABLE_ii[HEAP32[(HEAP32[$self >> 2] | 0) + 16 >> 2] & 127]($self) | 0); //@line 12314
 $retval_0 = 0; //@line 12316
 return $retval_0 | 0; //@line 12318
}
function _aqcollision_clear($col) {
 $col = $col | 0;
 var $col_addr_05 = 0, $a = 0, $1 = 0, label = 0;
 if (($col | 0) == 0) {
  return;
 } else {
  $col_addr_05 = $col; //@line 5432
 }
 while (1) {
  $a = $col_addr_05 | 0; //@line 5436
  if ((HEAP32[$a >> 2] | 0) == 0) {
   label = 314; //@line 5440
   break;
  }
  HEAP32[$a >> 2] = 0; //@line 5443
  $1 = HEAP32[$col_addr_05 + 20 >> 2] | 0; //@line 5445
  if (($1 | 0) == 0) {
   label = 315; //@line 5449
   break;
  } else {
   $col_addr_05 = $1; //@line 5452
  }
 }
 if ((label | 0) == 315) {
  return;
 } else if ((label | 0) == 314) {
  return;
 }
}
function _AQParticle_aabb($agg_result, $self) {
 $agg_result = $agg_result | 0;
 $self = $self | 0;
 var $0 = 0.0, $position_0_val = 0.0, $position_1_val = 0.0;
 $0 = +HEAPF32[$self + 20 >> 2]; //@line 8366
 $position_0_val = +HEAPF32[$self + 12 >> 2]; //@line 8368
 $position_1_val = +HEAPF32[$self + 16 >> 2]; //@line 8370
 HEAPF32[$agg_result >> 2] = $0 + $position_1_val; //@line 8376
 HEAPF32[$agg_result + 4 >> 2] = $0 + $position_0_val; //@line 8378
 HEAPF32[$agg_result + 8 >> 2] = $position_1_val - $0; //@line 8380
 HEAPF32[$agg_result + 12 >> 2] = $position_0_val - $0; //@line 8382
 return;
}
function _ColorShader_draw($buffer, $data, $bytes) {
 $buffer = $buffer | 0;
 $data = $data | 0;
 $bytes = $bytes | 0;
 if ((HEAP32[805] | 0) != 0) {
  _glUniformMatrix4fv(HEAP32[804] | 0, 1, 0, 2688); //@line 4536
  HEAP32[805] = 0; //@line 4537
 }
 _glBindBuffer(34962, $buffer | 0); //@line 4540
 _glBufferData(34962, $bytes | 0, $data | 0, 35048); //@line 4541
 _glVertexAttribPointer(HEAP32[802] | 0, 2, 5126, 0, 12, 0); //@line 4543
 _glVertexAttribPointer(HEAP32[803] | 0, 4, 5121, 1, 12, 8); //@line 4545
 _glDrawArrays(4, 0, ($bytes >>> 0) / 12 | 0 | 0); //@line 4547
 return;
}
function __BBMultiWallView_draw($obj) {
 $obj = $obj | 0;
 var $vertices = 0, $vertices1 = 0, sp = 0;
 sp = STACKTOP; //@line 3545
 STACKTOP = STACKTOP + 8 | 0; //@line 3545
 $vertices = sp | 0; //@line 3546
 $vertices1 = $obj + 20 | 0; //@line 3547
 HEAP32[$vertices >> 2] = $vertices1; //@line 3548
 _AQList_iterate(HEAP32[$obj + 12 >> 2] | 0, 30, $vertices) | 0; //@line 3553
 _AQShaders_useProgram(1); //@line 3554
 _AQShaders_draw(HEAP32[$obj + 16 >> 2] | 0, $vertices1, (HEAP32[$vertices >> 2] | 0) - $vertices1 | 0); //@line 3562
 STACKTOP = sp; //@line 3563
 return;
}
function _AQInput_pressKey($keyCode) {
 $keyCode = $keyCode | 0;
 var $0 = 0, $1 = 0, $2 = 0, $call2 = 0;
 $0 = HEAP32[830] | 0; //@line 10517
 if (($0 | 0) == 0) {
  $1 = _aqinit(_aqalloc(2400) | 0) | 0; //@line 10523
  HEAP32[830] = $1; //@line 10524
  $2 = $1; //@line 10526
 } else {
  $2 = $0; //@line 10528
 }
 $call2 = _AQMap_get($2, _aqint($keyCode) | 0) | 0; //@line 10533
 if (($call2 | 0) == 0) {
  return;
 }
 HEAP32[$call2 + 24 >> 2] = 1; //@line 10541
 HEAP32[$call2 + 32 >> 2] = 1; //@line 10544
 HEAP32[$call2 + 20 >> 2] = $keyCode; //@line 10547
 return;
}
function _AQReleasePool_init($self) {
 $self = $self | 0;
 var $2 = 0, $3 = 0;
 HEAP32[$self + 12 >> 2] = 0; //@line 12471
 HEAP32[$self + 16 >> 2] = 0; //@line 12473
 HEAP32[$self + 20 >> 2] = 0; //@line 12475
 HEAP32[$self + 24 >> 2] = HEAP32[798]; //@line 12479
 $2 = HEAP32[798] | 0; //@line 12480
 if (($2 | 0) == 0) {
  $3 = $self | 0; //@line 12484
  HEAP32[798] = $3; //@line 12485
  return $3 | 0; //@line 12486
 }
 HEAP32[$2 + 20 >> 2] = $self; //@line 12490
 $3 = $self | 0; //@line 12492
 HEAP32[798] = $3; //@line 12493
 return $3 | 0; //@line 12494
}
function copyTempDouble(ptr) {
 ptr = ptr | 0;
 HEAP8[tempDoublePtr] = HEAP8[ptr]; //@line 32
 HEAP8[tempDoublePtr + 1 | 0] = HEAP8[ptr + 1 | 0]; //@line 33
 HEAP8[tempDoublePtr + 2 | 0] = HEAP8[ptr + 2 | 0]; //@line 34
 HEAP8[tempDoublePtr + 3 | 0] = HEAP8[ptr + 3 | 0]; //@line 35
 HEAP8[tempDoublePtr + 4 | 0] = HEAP8[ptr + 4 | 0]; //@line 36
 HEAP8[tempDoublePtr + 5 | 0] = HEAP8[ptr + 5 | 0]; //@line 37
 HEAP8[tempDoublePtr + 6 | 0] = HEAP8[ptr + 6 | 0]; //@line 38
 HEAP8[tempDoublePtr + 7 | 0] = HEAP8[ptr + 7 | 0]; //@line 39
}
function _AQString_compare($self, $_other) {
 $self = $self | 0;
 $_other = $_other | 0;
 var $4 = 0, $6 = 0, $retval_0 = 0;
 if ((HEAP32[$_other >> 2] | 0) != 2024) {
  $retval_0 = 1; //@line 12713
  return $retval_0 | 0; //@line 12715
 }
 $4 = HEAP32[$self + 12 >> 2] | 0; //@line 12723
 $6 = HEAP32[$_other + 12 >> 2] | 0; //@line 12726
 $retval_0 = _strncmp(HEAP32[$self + 16 >> 2] | 0, HEAP32[$_other + 16 >> 2] | 0, ($4 >>> 0 < $6 >>> 0 ? $4 : $6) | 0) | 0; //@line 12731
 return $retval_0 | 0; //@line 12733
}
function __BBRoom_moveParticle($_particle, $diff) {
 $_particle = $_particle | 0;
 $diff = $diff | 0;
 var $position = 0, $1 = 0, $tmp_sroa_0_0_insert_insert$1 = 0.0;
 $position = $_particle + 12 | 0; //@line 4307
 $1 = $position; //@line 4319
 $tmp_sroa_0_0_insert_insert$1 = +(+HEAPF32[$_particle + 16 >> 2] + +HEAPF32[$diff + 4 >> 2]); //@line 4329
 HEAPF32[$1 >> 2] = +HEAPF32[$position >> 2] + +HEAPF32[$diff >> 2]; //@line 4331
 HEAPF32[$1 + 4 >> 2] = $tmp_sroa_0_0_insert_insert$1; //@line 4333
 return;
}
function _AQWebAudioDriver_playSound($self, $sound) {
 $self = $self | 0;
 $sound = $sound | 0;
 var $call = 0, $call2 = 0;
 $call = __AQWebAudioDriver_createSource($self, $sound) | 0; //@line 10108
 __webAudioSourcePlay(HEAP32[$self + 12 >> 2] | 0, HEAP32[$call + 16 >> 2] | 0); //@line 10113
 $call2 = _aqcreate(2072) | 0; //@line 10114
 HEAP32[$call2 + 12 >> 2] = _aqretain($sound) | 0; //@line 10121
 HEAP32[$call2 + 16 >> 2] = _aqretain($call) | 0; //@line 10126
 return $call2 | 0; //@line 10127
}
function _BBPathNode_clone($original) {
 $original = $original | 0;
 var $call = 0, $1 = 0, $2 = 0, $3$1 = 0;
 $call = _aqcreate(1728) | 0; //@line 3700
 $1 = $original + 12 | 0; //@line 3704
 $2 = $call + 12 | 0; //@line 3705
 $3$1 = HEAP32[$1 + 4 >> 2] | 0; //@line 3709
 HEAP32[$2 >> 2] = HEAP32[$1 >> 2]; //@line 3711
 HEAP32[$2 + 4 >> 2] = $3$1; //@line 3713
 _AQList_iterate(HEAP32[$original + 20 >> 2] | 0, 41, HEAP32[$call + 20 >> 2] | 0) | 0; //@line 3720
 return $call | 0; //@line 3721
}
function _AQRenderer_draw() {
 var $0 = 0;
 $0 = HEAP32[822] | 0; //@line 3863
 _glClearColor(+(+(HEAPU8[$0 + 12 | 0] | 0 | 0) / 255.0), +(+(HEAPU8[$0 + 13 | 0] | 0 | 0) / 255.0), +(+(HEAPU8[$0 + 14 | 0] | 0 | 0) / 255.0), +1.0); //@line 3882
 _glClear(16384); //@line 3883
 _AQCamera_setGlMatrix(HEAP32[(HEAP32[822] | 0) + 16 >> 2] | 0, 2096) | 0; //@line 3887
 _AQShaders_setMatrix(2096); //@line 3888
 _AQView_iterateList(HEAP32[(HEAP32[822] | 0) + 20 >> 2] | 0); //@line 3892
 return;
}
function __SLUpdate_iterator($object, $ctx) {
 $object = $object | 0;
 $ctx = $ctx | 0;
 var $0 = 0, $call = 0, $2 = 0;
 $0 = $object; //@line 4641
 $call = _aqcast($0, 1664) | 0; //@line 4642
 if (($call | 0) == 0) {
  ___assert_fail(1312, 1280, 9, 1384); //@line 4646
 }
 $2 = HEAP32[$call + 4 >> 2] | 0; //@line 4651
 if (($2 | 0) == 0) {
  ___assert_fail(1312, 1280, 9, 1384); //@line 4655
 } else {
  FUNCTION_TABLE_vif[$2 & 31]($0, +HEAPF32[$ctx >> 2]); //@line 4660
  return;
 }
}
function _AQInt_compare($a, $b) {
 $a = $a | 0;
 $b = $b | 0;
 var $retval_0 = 0;
 if ((_aqistype($b, 2304) | 0) != 0) {
  $retval_0 = (HEAP32[$a + 12 >> 2] | 0) - (HEAP32[$b + 12 >> 2] | 0) | 0; //@line 11996
  return $retval_0 | 0; //@line 11998
 }
 if ((_aqistype($b, 2352) | 0) == 0) {
  $retval_0 = 1; //@line 12004
  return $retval_0 | 0; //@line 12006
 }
 $retval_0 = ~~(+(HEAP32[$a + 12 >> 2] | 0) - +HEAPF64[$b + 16 >> 3]); //@line 12018
 return $retval_0 | 0; //@line 12020
}
function _AQDouble_compare($a, $b) {
 $a = $a | 0;
 $b = $b | 0;
 var $retval_0 = 0;
 if ((_aqistype($b, 2352) | 0) != 0) {
  $retval_0 = ~~(+HEAPF64[$a + 16 >> 3] - +HEAPF64[$b + 16 >> 3]); //@line 12066
  return $retval_0 | 0; //@line 12068
 }
 if ((_aqistype($b, 2304) | 0) == 0) {
  $retval_0 = 1; //@line 12074
  return $retval_0 | 0; //@line 12076
 }
 $retval_0 = ~~(+HEAPF64[$a + 16 >> 3] - +(HEAP32[$b + 12 >> 2] | 0)); //@line 12088
 return $retval_0 | 0; //@line 12090
}
function _aqstr($value) {
 $value = $value | 0;
 var $call = 0, $call1 = 0, $1 = 0, $call3 = 0;
 $call = _aqcreate(2024) | 0; //@line 12635
 $call1 = _strlen($value | 0) | 0; //@line 12637
 $1 = $call + 12 | 0; //@line 12639
 HEAP32[$1 >> 2] = $call1; //@line 12640
 $call3 = _malloc($call1) | 0; //@line 12641
 HEAP32[$call + 16 >> 2] = $call3; //@line 12644
 _strncpy($call3 | 0, $value | 0, HEAP32[$1 >> 2] | 0) | 0; //@line 12646
 return $call | 0; //@line 12647
}
function _AQLoop_init($self) {
 $self = $self | 0;
 var $call_i = 0, $2 = 0;
 HEAP32[$self + 12 >> 2] = _aqinit(_aqalloc(1928) | 0) | 0; //@line 3383
 HEAP32[$self + 16 >> 2] = _aqinit(_aqalloc(2280) | 0) | 0; //@line 3388
 $call_i = _malloc(12) | 0; //@line 3389
 $2 = $call_i; //@line 3390
 _memset($call_i | 0, 0, 12); //@line 3391
 HEAP32[$self + 20 >> 2] = $2; //@line 3393
 HEAP32[$self + 24 >> 2] = $2; //@line 3395
 return $self | 0; //@line 3396
}
function _BBCity_done($self) {
 $self = $self | 0;
 var $6 = 0;
 _aqrelease(HEAP32[$self + 32 >> 2] | 0) | 0; //@line 1647
 _aqrelease(HEAP32[$self + 44 >> 2] | 0) | 0; //@line 1651
 _aqrelease(HEAP32[$self + 48 >> 2] | 0) | 0; //@line 1655
 $6 = HEAP32[$self + 40 >> 2] | 0; //@line 1657
 if (($6 | 0) == 0) {
  return $self | 0; //@line 1661
 }
 _free($6); //@line 1664
 return $self | 0; //@line 1666
}
function __AQActor_view($_self) {
 $_self = $_self | 0;
 var $0 = 0, $1 = 0, $3 = 0, $4 = 0;
 $0 = $_self + 112 | 0; //@line 101
 $1 = HEAP32[$0 >> 2] | 0; //@line 102
 if (($1 | 0) != 0) {
  $4 = $1; //@line 106
  return $4 | 0; //@line 108
 }
 $3 = _AQActorView_create($_self) | 0; //@line 112
 HEAP32[$0 >> 2] = $3; //@line 113
 $4 = $3; //@line 115
 return $4 | 0; //@line 117
}
function _AQLoop_addUpdater($object) {
 $object = $object | 0;
 var $0 = 0, $1 = 0, $2 = 0;
 $0 = HEAP32[824] | 0; //@line 3460
 if (($0 | 0) == 0) {
  $1 = _aqinit(_aqalloc(2256) | 0) | 0; //@line 3466
  HEAP32[824] = $1; //@line 3467
  $2 = $1; //@line 3469
 } else {
  $2 = $0; //@line 3471
 }
 _SLUpdater_addToList(HEAP32[$2 + 16 >> 2] | 0, $object); //@line 3476
 return;
}
function _AQInput_screenToWorld($x, $y, $wx, $wy) {
 $x = +$x;
 $y = +$y;
 $wx = $wx | 0;
 $wy = $wy | 0;
 var $2 = 0.0, $5 = 0.0;
 $2 = +HEAPF32[817]; //@line 10285
 HEAPF32[$wx >> 2] = $2 + $x / +HEAPF32[820] * (+HEAPF32[815] - $2); //@line 10289
 $5 = +HEAPF32[816]; //@line 10293
 HEAPF32[$wy >> 2] = $5 + $y / +HEAPF32[821] * (+HEAPF32[814] - $5); //@line 10297
 return;
}
function _AQDdvt_wakeParticle($self, $particle) {
 $self = $self | 0;
 $particle = $particle | 0;
 var $aabb = 0, sp = 0;
 sp = STACKTOP; //@line 8123
 STACKTOP = STACKTOP + 16 | 0; //@line 8123
 $aabb = sp | 0; //@line 8124
 _AQParticle_aabb($aabb, $particle); //@line 8125
 __AQDdvt_wakeParticle($self, $particle, $aabb); //@line 8126
 STACKTOP = sp; //@line 8127
 return;
}
function _strncpy(pdest, psrc, num) {
 pdest = pdest | 0;
 psrc = psrc | 0;
 num = num | 0;
 var padding = 0, i = 0;
 while ((i | 0) < (num | 0)) {
  HEAP8[pdest + i | 0] = padding ? 0 : HEAP8[psrc + i | 0] | 0; //@line 16541
  padding = padding ? 1 : (HEAP8[psrc + i | 0] | 0) == 0; //@line 16542
  i = i + 1 | 0; //@line 16543
 }
 return pdest | 0; //@line 16545
}
function _AQActor_setWorld($self, $world) {
 $self = $self | 0;
 $world = $world | 0;
 var $world1 = 0, $3 = 0;
 $world1 = $self + 88 | 0; //@line 347
 _aqrelease(HEAP32[$world1 >> 2] | 0) | 0; //@line 350
 $3 = _aqretain($world) | 0; //@line 353
 HEAP32[$world1 >> 2] = $3; //@line 354
 _AQWorld_addParticle($3, HEAP32[$self + 92 >> 2] | 0); //@line 357
 return;
}
function _aqcast($self, $interface) {
 $self = $self | 0;
 $interface = $interface | 0;
 var $retval_0 = 0;
 if (($self | 0) == 0) {
  $retval_0 = 0; //@line 12436
  return $retval_0 | 0; //@line 12438
 }
 $retval_0 = FUNCTION_TABLE_iii[HEAP32[(HEAP32[$self >> 2] | 0) + 20 >> 2] & 63]($self, $interface) | 0; //@line 12447
 return $retval_0 | 0; //@line 12449
}
function _AQMap_get($self, $key) {
 $self = $self | 0;
 $key = $key | 0;
 var $call = 0, $cond = 0;
 $call = _aqcast($self, 2248) | 0; //@line 11915
 if (($call | 0) == 0) {
  $cond = 0; //@line 11919
  return $cond | 0; //@line 11921
 }
 $cond = FUNCTION_TABLE_iii[HEAP32[$call + 4 >> 2] & 63]($self, $key) | 0; //@line 11928
 return $cond | 0; //@line 11930
}
function _AQArray_atIndex($self, $index) {
 $self = $self | 0;
 $index = $index | 0;
 var $retval_0 = 0;
 if ((HEAP32[$self + 12 >> 2] | 0) <= ($index | 0)) {
  $retval_0 = 0; //@line 10839
  return $retval_0 | 0; //@line 10841
 }
 $retval_0 = HEAP32[(HEAP32[$self + 20 >> 2] | 0) + ($index << 2) >> 2] | 0; //@line 10848
 return $retval_0 | 0; //@line 10850
}
function _AQDictMap_get($self, $key) {
 $self = $self | 0;
 $key = $key | 0;
 var $call = 0, $cond = 0;
 $call = _AQList_find(HEAP32[$self + 12 >> 2] | 0, 17, $key) | 0; //@line 11137
 if (($call | 0) == 0) {
  $cond = 0; //@line 11141
  return $cond | 0; //@line 11143
 }
 $cond = HEAP32[$call + 16 >> 2] | 0; //@line 11150
 return $cond | 0; //@line 11152
}
function _aqcompare($a, $b) {
 $a = $a | 0;
 $b = $b | 0;
 var $call = 0, $retval_0 = 0;
 $call = _aqcast($a, 2448) | 0; //@line 11031
 if (($call | 0) == 0) {
  $retval_0 = 1; //@line 11035
  return $retval_0 | 0; //@line 11037
 }
 $retval_0 = FUNCTION_TABLE_iii[HEAP32[$call + 4 >> 2] & 63]($a, $b) | 0; //@line 11044
 return $retval_0 | 0; //@line 11046
}
function _AQDictMap_unset($self, $key) {
 $self = $self | 0;
 $key = $key | 0;
 var $pairList = 0, $call = 0;
 $pairList = $self + 12 | 0; //@line 11204
 $call = _AQList_findIndex(HEAP32[$pairList >> 2] | 0, 17, $key) | 0; //@line 11206
 if (($call | 0) == -1) {
  return;
 }
 _AQList_removeAt(HEAP32[$pairList >> 2] | 0, $call) | 0; //@line 11213
 return;
}
function _AQWebAudioDriver_init($self) {
 $self = $self | 0;
 _memset($self + 288 | 0, 0, 12); //@line 9909
 HEAP32[$self + 12 >> 2] = __webAudioContextInit() | 0; //@line 9912
 HEAP32[$self + 16 >> 2] = _aqinit(_aqalloc(2400) | 0) | 0; //@line 9917
 HEAP32[$self + 20 >> 2] = _aqinit(_aqalloc(2280) | 0) | 0; //@line 9922
 return $self | 0; //@line 9923
}
function _SLUpdater_iterateList($list, $dt) {
 $list = $list | 0;
 $dt = +$dt;
 var $dt_addr = 0, sp = 0;
 sp = STACKTOP; //@line 4688
 STACKTOP = STACKTOP + 8 | 0; //@line 4688
 $dt_addr = sp | 0; //@line 4689
 HEAPF32[$dt_addr >> 2] = $dt; //@line 4690
 _AQList_iterate($list, 37, $dt_addr) | 0; //@line 4692
 STACKTOP = sp; //@line 4693
 return;
}
function _AQInput_findAction($name) {
 $name = $name | 0;
 var $0 = 0, $1 = 0, $2 = 0;
 $0 = HEAP32[826] | 0; //@line 10375
 if (($0 | 0) == 0) {
  $1 = _aqinit(_aqalloc(2400) | 0) | 0; //@line 10381
  HEAP32[826] = $1; //@line 10382
  $2 = $1; //@line 10384
 } else {
  $2 = $0; //@line 10386
 }
 return _AQMap_get($2, $name) | 0; //@line 10393
}
function _AQParticle_init($self) {
 $self = $self | 0;
 _memset($self + 12 | 0, 0, 120); //@line 8301
 HEAPF32[$self + 20 >> 2] = 1.0; //@line 8303
 HEAPF32[$self + 28 >> 2] = 1.0; //@line 8305
 HEAPF32[$self + 32 >> 2] = 9999999747378752.0e-21; //@line 8307
 HEAPF32[$self + 36 >> 2] = .5; //@line 8309
 return $self | 0; //@line 8311
}
function _BBBlock_init($self) {
 $self = $self | 0;
 _aqzero($self) | 0; //@line 948
 HEAP32[$self + 52 >> 2] = _aqinit(_aqalloc(2280) | 0) | 0; //@line 953
 HEAP32[$self + 56 >> 2] = _aqinit(_aqalloc(2280) | 0) | 0; //@line 958
 HEAP32[$self + 60 >> 2] = _aqinit(_aqalloc(2280) | 0) | 0; //@line 963
 return $self | 0; //@line 964
}
function _BBWall_removeFromWorld($self, $world) {
 $self = $self | 0;
 $world = $world | 0;
 var $world1 = 0;
 _AQList_iterate(HEAP32[$self + 28 >> 2] | 0, 48, $world) | 0; //@line 5039
 $world1 = $self + 32 | 0; //@line 5040
 _aqrelease(HEAP32[$world1 >> 2] | 0) | 0; //@line 5043
 HEAP32[$world1 >> 2] = 0; //@line 5044
 return;
}
function _AQWorld_done($self) {
 $self = $self | 0;
 _aqrelease(HEAP32[$self + 28 >> 2] | 0) | 0; //@line 9169
 _aqrelease(HEAP32[$self + 32 >> 2] | 0) | 0; //@line 9173
 _aqrelease(HEAP32[$self + 36 >> 2] | 0) | 0; //@line 9177
 _aqcollision_done(HEAP32[$self + 48 >> 2] | 0) | 0; //@line 9180
 return $self | 0; //@line 9181
}
function _AQRenderer_setClearColor($r, $g, $b) {
 $r = $r | 0;
 $g = $g | 0;
 $b = $b | 0;
 var $0 = 0;
 $0 = HEAP32[822] | 0; //@line 3831
 HEAP8[$0 + 12 | 0] = $r & 255; //@line 3836
 HEAP8[$0 + 13 | 0] = $g & 255; //@line 3838
 HEAP8[$0 + 14 | 0] = $b & 255; //@line 3840
 HEAP8[$0 + 15 | 0] = -1; //@line 3842
 return;
}
function _AQInput_step() {
 var $0 = 0, $1 = 0, $2 = 0;
 $0 = HEAP32[828] | 0; //@line 10622
 if (($0 | 0) == 0) {
  $1 = _aqinit(_aqalloc(2280) | 0) | 0; //@line 10628
  HEAP32[828] = $1; //@line 10629
  $2 = $1; //@line 10631
 } else {
  $2 = $0; //@line 10633
 }
 _AQList_iterate($2, 39, 0) | 0; //@line 10636
 return;
}
function _AQInput_getTouches() {
 var $0 = 0, $1 = 0, $2 = 0;
 $0 = HEAP32[818] | 0; //@line 10305
 if (($0 | 0) != 0) {
  $2 = $0; //@line 10309
  return $2 | 0; //@line 10311
 }
 $1 = _aqinit(_aqalloc(2504) | 0) | 0; //@line 10315
 HEAP32[818] = $1; //@line 10316
 $2 = $1; //@line 10318
 return $2 | 0; //@line 10320
}
function _BBCameraController_init($self) {
 $self = $self | 0;
 _aqzero($self) | 0; //@line 1567
 HEAPF32[$self + 32 >> 2] = 1.0; //@line 1569
 HEAPF32[$self + 36 >> 2] = 100.0; //@line 1571
 HEAPF32[$self + 44 >> 2] = 1.0; //@line 1573
 HEAPF32[$self + 48 >> 2] = 80.0; //@line 1575
 return $self | 0; //@line 1576
}
function _AQLoop_world() {
 var $0 = 0, $1 = 0, $2 = 0;
 $0 = HEAP32[824] | 0; //@line 3436
 if (($0 | 0) == 0) {
  $1 = _aqinit(_aqalloc(2256) | 0) | 0; //@line 3442
  HEAP32[824] = $1; //@line 3443
  $2 = $1; //@line 3445
 } else {
  $2 = $0; //@line 3447
 }
 return HEAP32[$2 + 12 >> 2] | 0; //@line 3452
}
function _BBCameraController_setPlayer($self, $actor) {
 $self = $self | 0;
 $actor = $actor | 0;
 var $actor1 = 0;
 $actor1 = $self + 16 | 0; //@line 1608
 _aqrelease(HEAP32[$actor1 >> 2] | 0) | 0; //@line 1611
 HEAP32[$actor1 >> 2] = _aqretain($actor) | 0; //@line 1615
 return $self | 0; //@line 1616
}
function _AQAudioDriver_setMasterVolume($volume) {
 $volume = +$volume;
 var $1 = 0, $call1 = 0;
 $1 = HEAP32[950] | 0; //@line 9784
 $call1 = _aqcast($1, 2488) | 0; //@line 9785
 if (($call1 | 0) == 0) {
  return;
 }
 FUNCTION_TABLE_vif[HEAP32[$call1 + 4 >> 2] & 31]($1, $volume); //@line 9794
 return;
}
function _AQMap_set($self, $key, $value) {
 $self = $self | 0;
 $key = $key | 0;
 $value = $value | 0;
 var $call = 0;
 $call = _aqcast($self, 2248) | 0; //@line 11940
 if (($call | 0) == 0) {
  return;
 }
 FUNCTION_TABLE_viii[HEAP32[$call + 8 >> 2] & 31]($self, $key, $value); //@line 11949
 return;
}
function _AQInput_setWorldFrame($top, $right, $bottom, $left) {
 $top = +$top;
 $right = +$right;
 $bottom = +$bottom;
 $left = +$left;
 HEAPF32[814] = $top; //@line 10267
 HEAPF32[815] = $right; //@line 10268
 HEAPF32[816] = $bottom; //@line 10269
 HEAPF32[817] = $left; //@line 10270
 return;
}
function _AQParticle_done($self) {
 $self = $self | 0;
 _aqcollidewith_done(HEAP32[$self + 112 >> 2] | 0) | 0; //@line 8322
 _aqcollidewith_done(HEAP32[$self + 124 >> 2] | 0) | 0; //@line 8326
 _aqcollidewith_done(HEAP32[$self + 128 >> 2] | 0) | 0; //@line 8330
 return $self | 0; //@line 8332
}
function _AQApp_init($self) {
 $self = $self | 0;
 _memset($self + 384 | 0, 0, 20); //@line 10647
 HEAP32[$self + 20 >> 2] = _aqinit(_aqalloc(2280) | 0) | 0; //@line 10652
 HEAP32[$self + 24 >> 2] = 0; //@line 10654
 HEAP32[$self + 28 >> 2] = 0; //@line 10656
 return $self | 0; //@line 10657
}
function _aqcollidewith_done($self) {
 $self = $self | 0;
 var $0 = 0;
 if (($self | 0) == 0) {
  return 0; //@line 8343
 }
 $0 = HEAP32[$self + 4 >> 2] | 0; //@line 8346
 if (($0 | 0) != 0) {
  _aqcollidewith_done($0) | 0; //@line 8350
 }
 _free($self); //@line 8354
 return 0; //@line 8356
}
function _aqcollision_done($col) {
 $col = $col | 0;
 var $0 = 0;
 $0 = HEAP32[$col + 20 >> 2] | 0; //@line 5469
 if (($0 | 0) == 0) {
  return $col | 0; //@line 5473
 } else {
  _free(_aqcollision_done($0) | 0); //@line 5477
  return $col | 0; //@line 5478
 }
 return 0; //@line 5480
}
function copyTempFloat(ptr) {
 ptr = ptr | 0;
 HEAP8[tempDoublePtr] = HEAP8[ptr]; //@line 25
 HEAP8[tempDoublePtr + 1 | 0] = HEAP8[ptr + 1 | 0]; //@line 26
 HEAP8[tempDoublePtr + 2 | 0] = HEAP8[ptr + 2 | 0]; //@line 27
 HEAP8[tempDoublePtr + 3 | 0] = HEAP8[ptr + 3 | 0]; //@line 28
}
function __AQInputAction_update($self, $ctx) {
 $self = $self | 0;
 $ctx = $ctx | 0;
 HEAP32[$self + 24 >> 2] = 0; //@line 10602
 HEAP32[$self + 28 >> 2] = 0; //@line 10604
 if ((HEAP32[$self + 20 >> 2] | 0) != 0) {
  return;
 }
 HEAP32[$self + 32 >> 2] = 0; //@line 10613
 return;
}
function _aqalloc($st) {
 $st = $st | 0;
 var $call = 0;
 $call = _malloc(HEAP32[$st + 4 >> 2] | 0) | 0; //@line 12202
 HEAP32[$call >> 2] = $st; //@line 12204
 HEAP32[$call + 4 >> 2] = 1; //@line 12207
 HEAP32[$call + 8 >> 2] = 0; //@line 12210
 return $call | 0; //@line 12211
}
function _aqlistnode_done($self) {
 $self = $self | 0;
 var $0 = 0;
 $0 = HEAP32[$self >> 2] | 0; //@line 11224
 if (($0 | 0) != 0) {
  _free(_aqlistnode_done($0) | 0); //@line 11230
 }
 _aqrelease(HEAP32[$self + 8 >> 2] | 0) | 0; //@line 11236
 return $self | 0; //@line 11237
}
function _AQShaders_useProgram($shaderEnum) {
 $shaderEnum = $shaderEnum | 0;
 if ((HEAP32[812] | 0) == ($shaderEnum | 0)) {
  return;
 }
 HEAP32[812] = $shaderEnum; //@line 4562
 if (($shaderEnum | 0) != 1) {
  return;
 }
 _glUseProgram(HEAP32[800] | 0); //@line 4569
 return;
}
function _AQWebAudioDriver_done($self) {
 $self = $self | 0;
 __webAudioContextDone(HEAP32[$self + 12 >> 2] | 0); //@line 9933
 _aqrelease(HEAP32[$self + 16 >> 2] | 0) | 0; //@line 9937
 _aqrelease(HEAP32[$self + 20 >> 2] | 0) | 0; //@line 9941
 return $self | 0; //@line 9942
}
function _AQDouble_getInterface($self, $id) {
 $self = $self | 0;
 $id = $id | 0;
 var $retval_0 = 0;
 if (($id | 0) == 2232) {
  $retval_0 = 1600; //@line 12154
 } else {
  $retval_0 = ($id | 0) == 2448 ? 1616 : 0; //@line 12159
 }
 return $retval_0 | 0; //@line 12162
}
function _BBBlock_addToWorld($self, $world) {
 $self = $self | 0;
 $world = $world | 0;
 var $0 = 0;
 $0 = $world; //@line 1279
 HEAP32[$self + 32 >> 2] = _aqretain($0) | 0; //@line 1283
 _AQList_iterate(HEAP32[$self + 52 >> 2] | 0, 44, $0) | 0; //@line 1286
 return;
}
function _BBWall_addToWorld($self, $world) {
 $self = $self | 0;
 $world = $world | 0;
 var $0 = 0;
 $0 = $world; //@line 5019
 HEAP32[$self + 32 >> 2] = _aqretain($0) | 0; //@line 5023
 _AQList_iterate(HEAP32[$self + 28 >> 2] | 0, 40, $0) | 0; //@line 5026
 return;
}
function _BBRoom_addToWorld($self, $world) {
 $self = $self | 0;
 $world = $world | 0;
 var $0 = 0;
 $0 = $world; //@line 4274
 HEAP32[$self + 40 >> 2] = _aqretain($0) | 0; //@line 4278
 _AQList_iterate(HEAP32[$self + 44 >> 2] | 0, 49, $0) | 0; //@line 4281
 return;
}
function _BBCity_addToWorld($self, $world) {
 $self = $self | 0;
 $world = $world | 0;
 var $0 = 0;
 $0 = $world; //@line 3076
 HEAP32[$self + 28 >> 2] = _aqretain($0) | 0; //@line 3080
 _AQList_iterate(HEAP32[$self + 32 >> 2] | 0, 47, $0) | 0; //@line 3083
 return;
}
function _AQInt_getInterface($self, $id) {
 $self = $self | 0;
 $id = $id | 0;
 var $retval_0 = 0;
 if (($id | 0) == 2232) {
  $retval_0 = 1576; //@line 12118
 } else {
  $retval_0 = ($id | 0) == 2448 ? 1592 : 0; //@line 12123
 }
 return $retval_0 | 0; //@line 12126
}
function _BBRoom_init($self) {
 $self = $self | 0;
 _aqzero($self) | 0; //@line 3902
 HEAP32[$self + 44 >> 2] = _aqinit(_aqalloc(2280) | 0) | 0; //@line 3907
 HEAP32[$self + 48 >> 2] = _aqinit(_aqalloc(2280) | 0) | 0; //@line 3912
 return $self | 0; //@line 3913
}
function _AQApp_done($self) {
 $self = $self | 0;
 _aqrelease(HEAP32[$self + 20 >> 2] | 0) | 0; //@line 10668
 _aqrelease(HEAP32[$self + 24 >> 2] | 0) | 0; //@line 10672
 _aqrelease(HEAP32[$self + 28 >> 2] | 0) | 0; //@line 10676
 return $self | 0; //@line 10677
}
function _AQActor_getInterface($self, $id) {
 $self = $self | 0;
 $id = $id | 0;
 var $retval_0 = 0;
 if (($id | 0) == 1664) {
  $retval_0 = 1648; //@line 296
 } else {
  $retval_0 = ($id | 0) == 1976 ? 1640 : 0; //@line 301
 }
 return $retval_0 | 0; //@line 304
}
function _AQActor_done($self) {
 $self = $self | 0;
 _aqrelease(HEAP32[$self + 92 >> 2] | 0) | 0; //@line 276
 _aqrelease(HEAP32[$self + 100 >> 2] | 0) | 0; //@line 280
 _aqrelease(HEAP32[$self + 112 >> 2] | 0) | 0; //@line 283
 return $self | 0; //@line 284
}
function _BBBlock_done($self) {
 $self = $self | 0;
 _aqrelease(HEAP32[$self + 52 >> 2] | 0) | 0; //@line 975
 _aqrelease(HEAP32[$self + 56 >> 2] | 0) | 0; //@line 979
 _aqrelease(HEAP32[$self + 60 >> 2] | 0) | 0; //@line 983
 return $self | 0; //@line 984
}
function _AQWebAudioDriver_stopSound($self, $soundInstance) {
 $self = $self | 0;
 $soundInstance = $soundInstance | 0;
 __webAudioSourceStop(HEAP32[$self + 12 >> 2] | 0, HEAP32[(HEAP32[$soundInstance + 16 >> 2] | 0) + 16 >> 2] | 0); //@line 10220
 return;
}
function __AQWorld_performConstraints($interfacePtr, $ctx) {
 $interfacePtr = $interfacePtr | 0;
 $ctx = $ctx | 0;
 FUNCTION_TABLE_vi[HEAP32[(HEAP32[$interfacePtr + 16 >> 2] | 0) + 8 >> 2] & 31](HEAP32[$interfacePtr + 12 >> 2] | 0); //@line 9497
 return;
}
function _AQRenderer_boot() {
 HEAP32[822] = _aqinit(_aqalloc(2160) | 0) | 0; //@line 3806
 _glClearColor(+0.0, +0.0, +0.0, +0.0); //@line 3807
 _glEnable(3042); //@line 3808
 _glBlendFunc(770, 771); //@line 3809
 _AQShaders_boot(); //@line 3810
 return;
}
function _AQList_done($self) {
 $self = $self | 0;
 var $0 = 0;
 $0 = HEAP32[$self + 16 >> 2] | 0; //@line 11260
 if (($0 | 0) == 0) {
  return $self | 0; //@line 11264
 }
 _free(_aqlistnode_done($0) | 0); //@line 11268
 return $self | 0; //@line 11270
}
function _BBMultiWallView_init($self) {
 $self = $self | 0;
 _aqzero($self) | 0; //@line 3572
 HEAP32[$self + 12 >> 2] = _aqinit(_aqalloc(2280) | 0) | 0; //@line 3577
 _glGenBuffers(1, $self + 16 | 0); //@line 3579
 return $self | 0; //@line 3580
}
function _AQParticle_testPrep($self) {
 $self = $self | 0;
 var $0 = 0;
 $0 = HEAP32[$self + 112 >> 2] | 0; //@line 8508
 HEAP32[$self + 116 >> 2] = $0; //@line 8510
 if (($0 | 0) == 0) {
  return;
 }
 HEAP32[$0 >> 2] = 0; //@line 8517
 return;
}
function _aqzero($self) {
 $self = $self | 0;
 if (($self | 0) == 0) {
  return $self | 0; //@line 12245
 }
 _memset($self + 12 | 0, 0, (HEAP32[(HEAP32[$self >> 2] | 0) + 4 >> 2] | 0) - 12 | 0); //@line 12253
 return $self | 0; //@line 12255
}
function _aqfree($self) {
 $self = $self | 0;
 if (($self | 0) == 0) {
  return;
 }
 HEAP32[$self + 4 >> 2] = 0; //@line 12226
 _free(FUNCTION_TABLE_ii[HEAP32[(HEAP32[$self >> 2] | 0) + 16 >> 2] & 127]($self) | 0); //@line 12232
 return;
}
function _BBCity_addWallsToView($self, $view) {
 $self = $self | 0;
 $view = $view | 0;
 HEAP32[$self + 52 >> 2] = _aqretain($view) | 0; //@line 3133
 _AQList_iterate(HEAP32[$self + 32 >> 2] | 0, 29, $view) | 0; //@line 3136
 return;
}
function _AQString_done($self) {
 $self = $self | 0;
 var $0 = 0;
 $0 = HEAP32[$self + 16 >> 2] | 0; //@line 12608
 if (($0 | 0) == 0) {
  return $self | 0; //@line 12612
 }
 _free($0); //@line 12614
 return $self | 0; //@line 12616
}
function _BBRoom_rotateTo($self, $rotation) {
 $self = $self | 0;
 $rotation = $rotation | 0;
 _BBRoom_rotate($self, ($rotation + 4 - (HEAP32[$self + 20 >> 2] | 0) | 0) % 4 | 0) | 0; //@line 4296
 return $self | 0; //@line 4297
}
function __AQWebAudioDriver_findNotPlayingSourceIterator($obj, $ctx) {
 $obj = $obj | 0;
 $ctx = $ctx | 0;
 return (__webAudioSourceIsPlaying(HEAP32[$obj + 12 >> 2] | 0, HEAP32[$obj + 16 >> 2] | 0) | 0) == 0 | 0; //@line 10057
}
function __AQView_iterator($object, $ctx) {
 $object = $object | 0;
 $ctx = $ctx | 0;
 var $0 = 0;
 $0 = $object; //@line 4702
 FUNCTION_TABLE_vi[HEAP32[(_aqcast($0, 1992) | 0) + 4 >> 2] & 31]($0); //@line 4707
 return;
}
function _loopfuncnode_done($self) {
 $self = $self | 0;
 var $0 = 0;
 $0 = HEAP32[$self + 8 >> 2] | 0; //@line 3362
 if (($0 | 0) != 0) {
  _loopfuncnode_done($0); //@line 3366
 }
 _free($self); //@line 3370
 return;
}
function _AQList_init($self) {
 $self = $self | 0;
 HEAP32[$self + 12 >> 2] = 0; //@line 11246
 HEAP32[$self + 16 >> 2] = 0; //@line 11248
 HEAP32[$self + 20 >> 2] = 0; //@line 11250
 return $self | 0; //@line 11251
}
function _AQInputAction_create($name) {
 $name = $name | 0;
 var $call = 0;
 $call = _aqcreate(2328) | 0; //@line 10359
 HEAP32[$call + 12 >> 2] = _aqretain($name) | 0; //@line 10366
 return $call | 0; //@line 10367
}
function _BBMultiWallView_addWall($self, $wall) {
 $self = $self | 0;
 $wall = $wall | 0;
 _AQList_push(HEAP32[$self + 12 >> 2] | 0, $wall | 0) | 0; //@line 3617
 HEAP32[$wall + 40 >> 2] = 1; //@line 3619
 return;
}
function _AQInput_getScreenSize($width, $height) {
 $width = $width | 0;
 $height = $height | 0;
 HEAPF32[$width >> 2] = +HEAPF32[820]; //@line 10253
 HEAPF32[$height >> 2] = +HEAPF32[821]; //@line 10255
 return;
}
function _AQActorView_create($actor) {
 $actor = $actor | 0;
 var $call = 0;
 $call = _aqcreate(2552) | 0; //@line 452
 HEAP32[$call + 12 >> 2] = _aqretain($actor) | 0; //@line 459
 return $call | 0; //@line 460
}
function _drawWaterTest() {
 var $call1 = 0;
 $call1 = _aqinit(_aqalloc(2184) | 0) | 0; //@line 892
 _AQRenderer_draw(); //@line 893
 _AQShaders_useProgram(1); //@line 894
 _aqfree($call1); //@line 895
 return;
}
function _AQInputAction_done($self) {
 $self = $self | 0;
 _aqrelease(HEAP32[$self + 12 >> 2] | 0) | 0; //@line 10346
 _aqrelease(HEAP32[$self + 16 >> 2] | 0) | 0; //@line 10350
 return $self | 0; //@line 10351
}
function _AQSoundInstance_done($self) {
 $self = $self | 0;
 _aqrelease(HEAP32[$self + 12 >> 2] | 0) | 0; //@line 9845
 _aqrelease(HEAP32[$self + 16 >> 2] | 0) | 0; //@line 9848
 return $self | 0; //@line 9849
}
function _AQDictPair_done($self) {
 $self = $self | 0;
 _aqrelease(HEAP32[$self + 12 >> 2] | 0) | 0; //@line 11069
 _aqrelease(HEAP32[$self + 16 >> 2] | 0) | 0; //@line 11073
 return $self | 0; //@line 11074
}
function _AQWebAudioDriver_setListenerPosition($self, $x, $y) {
 $self = $self | 0;
 $x = +$x;
 $y = +$y;
 __webAudioContextSetListenerPosition(HEAP32[$self + 12 >> 2] | 0, +$x, +$y); //@line 9985
 return;
}
function _AQRenderer_done($self) {
 $self = $self | 0;
 _aqrelease(HEAP32[$self + 16 >> 2] | 0) | 0; //@line 3791
 _aqrelease(HEAP32[$self + 20 >> 2] | 0) | 0; //@line 3795
 return $self | 0; //@line 3796
}
function _AQLoop_done($self) {
 $self = $self | 0;
 _aqrelease(HEAP32[$self + 16 >> 2] | 0) | 0; //@line 3407
 _loopfuncnode_done(HEAP32[$self + 20 >> 2] | 0); //@line 3410
 return $self | 0; //@line 3411
}
function dynCall_iiiff(index, a1, a2, a3, a4) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = +a3;
 a4 = +a4;
 return FUNCTION_TABLE_iiiff[index & 31](a1 | 0, a2 | 0, +a3, +a4) | 0; //@line 17270
}
function _SLUpdater_addToList($list, $object) {
 $list = $list | 0;
 $object = $object | 0;
 if ((_aqcast($object, 1664) | 0) == 0) {
  return;
 }
 _AQList_push($list, $object) | 0; //@line 4678
 return;
}
function _AQShaders_draw($buffer, $data, $bytes) {
 $buffer = $buffer | 0;
 $data = $data | 0;
 $bytes = $bytes | 0;
 FUNCTION_TABLE_viii[HEAP32[801] & 31]($buffer, $data, $bytes); //@line 4593
 return;
}
function _BBMultiWallView_done($self) {
 $self = $self | 0;
 _aqrelease(HEAP32[$self + 12 >> 2] | 0) | 0; //@line 3591
 _glDeleteBuffers(1, $self + 16 | 0); //@line 3593
 return $self | 0; //@line 3594
}
function _AQSound_done($self) {
 $self = $self | 0;
 _aqrelease(HEAP32[$self + 12 >> 2] | 0) | 0; //@line 9819
 _aqrelease(HEAP32[$self + 16 >> 2] | 0) | 0; //@line 9822
 return $self | 0; //@line 9823
}
function _BBRoom_done($self) {
 $self = $self | 0;
 _aqrelease(HEAP32[$self + 44 >> 2] | 0) | 0; //@line 3924
 _aqrelease(HEAP32[$self + 48 >> 2] | 0) | 0; //@line 3928
 return $self | 0; //@line 3929
}
function _AQInputAction_init($self) {
 $self = $self | 0;
 _aqzero($self) | 0; //@line 10329
 HEAP32[$self + 16 >> 2] = _aqinit(_aqalloc(2280) | 0) | 0; //@line 10334
 return $self | 0; //@line 10335
}
function stackAlloc(size) {
 size = size | 0;
 var ret = 0;
 ret = STACKTOP; //@line 3
 STACKTOP = STACKTOP + size | 0; //@line 4
 STACKTOP = STACKTOP + 7 & -8; //@line 5
 return ret | 0; //@line 6
}
function _AQShaders_setMatrix($_matrix) {
 $_matrix = $_matrix | 0;
 var $0 = 0;
 HEAP32[805] = 1; //@line 4579
 $0 = $_matrix; //@line 4580
 _memcpy(2688, $0 | 0, 64) | 0; //@line 4581
 return;
}
function _AQActorView_done($self) {
 $self = $self | 0;
 _glDeleteBuffers(1, $self + 16 | 0); //@line 428
 _aqrelease(HEAP32[$self + 12 >> 2] | 0) | 0; //@line 432
 return $self | 0; //@line 433
}
function _BBPathNode_init($self) {
 $self = $self | 0;
 _aqzero($self) | 0; //@line 3663
 HEAP32[$self + 20 >> 2] = _aqinit(_aqalloc(2280) | 0) | 0; //@line 3668
 return $self | 0; //@line 3669
}
function _BBCameraController_getInterface($self, $interfaceName) {
 $self = $self | 0;
 $interfaceName = $interfaceName | 0;
 return (($interfaceName | 0) == 1664 ? 1480 : 0) | 0; //@line 1599
}
function _aqint($value) {
 $value = $value | 0;
 var $call = 0;
 $call = _aqcreate(2304) | 0; //@line 12170
 HEAP32[$call + 12 >> 2] = $value; //@line 12173
 return $call | 0; //@line 12174
}
function __AQWebAudioSource_done($self) {
 $self = $self | 0;
 __webAudioSourceDelete(HEAP32[$self + 12 >> 2] | 0, HEAP32[$self + 16 >> 2] | 0); //@line 9898
 return $self | 0; //@line 9899
}
function __AQWebAudioBuffer_done($self) {
 $self = $self | 0;
 __webAudioBufferDelete(HEAP32[$self + 12 >> 2] | 0, HEAP32[$self + 16 >> 2] | 0); //@line 9873
 return $self | 0; //@line 9874
}
function _BBWall_init($self) {
 $self = $self | 0;
 _aqzero($self) | 0; //@line 4772
 HEAP32[$self + 28 >> 2] = _aqinit(_aqalloc(2280) | 0) | 0; //@line 4777
 return $self | 0; //@line 4778
}
function _aqretain($self) {
 $self = $self | 0;
 var $0 = 0;
 $0 = $self + 4 | 0; //@line 12277
 HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + 1; //@line 12280
 return $self | 0; //@line 12281
}
function _strlen(ptr) {
 ptr = ptr | 0;
 var curr = 0;
 curr = ptr; //@line 16476
 while (HEAP8[curr] | 0) {
  curr = curr + 1 | 0; //@line 16478
 }
 return curr - ptr | 0; //@line 16480
}
function __AQWorld_solveIterator($col, $ctx) {
 $col = $col | 0;
 $ctx = $ctx | 0;
 _AQParticle_solve(HEAP32[$col >> 2] | 0, HEAP32[$col + 4 >> 2] | 0, $col); //@line 9479
 return;
}
function __AQWebAudioSource_init($self) {
 $self = $self | 0;
 HEAP32[$self + 12 >> 2] = 0; //@line 9883
 HEAP32[$self + 16 >> 2] = 0; //@line 9885
 return $self | 0; //@line 9886
}
function __AQWebAudioBuffer_init($self) {
 $self = $self | 0;
 HEAP32[$self + 12 >> 2] = 0; //@line 9858
 HEAP32[$self + 16 >> 2] = 0; //@line 9860
 return $self | 0; //@line 9861
}
function __BBCity_iterateBlocks_addWallsToView($obj, $ctx) {
 $obj = $obj | 0;
 $ctx = $ctx | 0;
 _AQList_iterate(HEAP32[$obj + 52 >> 2] | 0, 32, $ctx) | 0; //@line 3121
 return;
}
function __BBRoom_clonePathNode($pathNode, $ctx) {
 $pathNode = $pathNode | 0;
 $ctx = $ctx | 0;
 _AQList_push($ctx, _BBPathNode_clone($pathNode) | 0) | 0; //@line 3956
 return;
}
function __BBCity_iterateRooms_addWallsToView($obj, $ctx) {
 $obj = $obj | 0;
 $ctx = $ctx | 0;
 _AQList_iterate(HEAP32[$obj + 44 >> 2] | 0, 42, $ctx) | 0; //@line 3108
 return;
}
function dynCall_viii(index, a1, a2, a3) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 FUNCTION_TABLE_viii[index & 31](a1 | 0, a2 | 0, a3 | 0); //@line 17389
}
function _AQInput_setScreenSize($width, $height) {
 $width = +$width;
 $height = +$height;
 HEAPF32[820] = $width; //@line 10241
 HEAPF32[821] = $height; //@line 10242
 return;
}
function _AQDictPair_init($self) {
 $self = $self | 0;
 HEAP32[$self + 12 >> 2] = 0; //@line 11055
 HEAP32[$self + 16 >> 2] = 0; //@line 11057
 return $self | 0; //@line 11058
}
function _AQString_init($self) {
 $self = $self | 0;
 HEAP32[$self + 12 >> 2] = 0; //@line 12596
 HEAP32[$self + 16 >> 2] = 0; //@line 12598
 return $self | 0; //@line 12599
}
function setThrew(threw, value) {
 threw = threw | 0;
 value = value | 0;
 if ((__THREW__ | 0) == 0) {
  __THREW__ = threw; //@line 19
  threwValue = value; //@line 20
 }
}
function __BBWall_removeParticleIterator($particle, $ctx) {
 $particle = $particle | 0;
 $ctx = $ctx | 0;
 _AQWorld_removeParticle($ctx, $particle); //@line 5009
 return;
}
function __AQDictMap_listGetIterator($obj, $ctx) {
 $obj = $obj | 0;
 $ctx = $ctx | 0;
 return (_aqcompare(HEAP32[$obj + 12 >> 2] | 0, $ctx) | 0) == 0 | 0; //@line 11126
}
function _AQSound_init($self) {
 $self = $self | 0;
 HEAP32[$self + 12 >> 2] = 0; //@line 9805
 HEAP32[$self + 16 >> 2] = 0; //@line 9807
 return $self | 0; //@line 9808
}
function _AQActorView_init($self) {
 $self = $self | 0;
 _aqzero($self) | 0; //@line 416
 _glGenBuffers(1, $self + 16 | 0); //@line 418
 return $self | 0; //@line 419
}
function _AQAudioDriver_setContext($ctx) {
 $ctx = $ctx | 0;
 _aqrelease(HEAP32[950] | 0) | 0; //@line 9770
 HEAP32[950] = _aqretain($ctx) | 0; //@line 9774
 return;
}
function dynCall_viff(index, a1, a2, a3) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = +a2;
 a3 = +a3;
 FUNCTION_TABLE_viff[index & 31](a1 | 0, +a2, +a3); //@line 17032
}
function __BBWall_addParticleIterator($particle, $ctx) {
 $particle = $particle | 0;
 $ctx = $ctx | 0;
 _AQWorld_addParticle($ctx, $particle); //@line 4997
 return;
}
function __BBBlock_clonePathNode($self, $ctx) {
 $self = $self | 0;
 $ctx = $ctx | 0;
 _AQList_push($ctx, _BBPathNode_clone($self) | 0) | 0; //@line 1011
 return;
}
function __BBRoom_movePathNode($_pathNode, $diff) {
 $_pathNode = $_pathNode | 0;
 $diff = $diff | 0;
 _BBPathNode_move($_pathNode, $diff); //@line 4383
 return;
}
function _AQDictMap_init($self) {
 $self = $self | 0;
 HEAP32[$self + 12 >> 2] = _aqinit(_aqalloc(2280) | 0) | 0; //@line 11086
 return $self | 0; //@line 11087
}
function dynCall_iii(index, a1, a2) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 return FUNCTION_TABLE_iii[index & 63](a1 | 0, a2 | 0) | 0; //@line 17746
}
function __BBBlock_movePathNode($pathNode, $diff) {
 $pathNode = $pathNode | 0;
 $diff = $diff | 0;
 _BBPathNode_move($pathNode, $diff); //@line 1223
 return;
}
function jsCall_iiiff_15(a1, a2, a3, a4) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = +a3;
 a4 = +a4;
 return jsCall(15, a1 | 0, a2 | 0, +a3, +a4) | 0; //@line 17381
}
function jsCall_iiiff_14(a1, a2, a3, a4) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = +a3;
 a4 = +a4;
 return jsCall(14, a1 | 0, a2 | 0, +a3, +a4) | 0; //@line 17374
}
function jsCall_iiiff_13(a1, a2, a3, a4) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = +a3;
 a4 = +a4;
 return jsCall(13, a1 | 0, a2 | 0, +a3, +a4) | 0; //@line 17367
}
function jsCall_iiiff_12(a1, a2, a3, a4) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = +a3;
 a4 = +a4;
 return jsCall(12, a1 | 0, a2 | 0, +a3, +a4) | 0; //@line 17360
}
function jsCall_iiiff_11(a1, a2, a3, a4) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = +a3;
 a4 = +a4;
 return jsCall(11, a1 | 0, a2 | 0, +a3, +a4) | 0; //@line 17353
}
function jsCall_iiiff_10(a1, a2, a3, a4) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = +a3;
 a4 = +a4;
 return jsCall(10, a1 | 0, a2 | 0, +a3, +a4) | 0; //@line 17346
}
function _AQRenderer_addView($object) {
 $object = $object | 0;
 _AQView_addToList(HEAP32[(HEAP32[822] | 0) + 20 >> 2] | 0, $object); //@line 3854
 return;
}
function jsCall_iiiff_9(a1, a2, a3, a4) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = +a3;
 a4 = +a4;
 return jsCall(9, a1 | 0, a2 | 0, +a3, +a4) | 0; //@line 17339
}
function jsCall_iiiff_8(a1, a2, a3, a4) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = +a3;
 a4 = +a4;
 return jsCall(8, a1 | 0, a2 | 0, +a3, +a4) | 0; //@line 17332
}
function jsCall_iiiff_7(a1, a2, a3, a4) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = +a3;
 a4 = +a4;
 return jsCall(7, a1 | 0, a2 | 0, +a3, +a4) | 0; //@line 17325
}
function jsCall_iiiff_6(a1, a2, a3, a4) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = +a3;
 a4 = +a4;
 return jsCall(6, a1 | 0, a2 | 0, +a3, +a4) | 0; //@line 17318
}
function jsCall_iiiff_5(a1, a2, a3, a4) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = +a3;
 a4 = +a4;
 return jsCall(5, a1 | 0, a2 | 0, +a3, +a4) | 0; //@line 17311
}
function jsCall_iiiff_4(a1, a2, a3, a4) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = +a3;
 a4 = +a4;
 return jsCall(4, a1 | 0, a2 | 0, +a3, +a4) | 0; //@line 17304
}
function jsCall_iiiff_3(a1, a2, a3, a4) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = +a3;
 a4 = +a4;
 return jsCall(3, a1 | 0, a2 | 0, +a3, +a4) | 0; //@line 17297
}
function jsCall_iiiff_2(a1, a2, a3, a4) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = +a3;
 a4 = +a4;
 return jsCall(2, a1 | 0, a2 | 0, +a3, +a4) | 0; //@line 17290
}
function jsCall_iiiff_1(a1, a2, a3, a4) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = +a3;
 a4 = +a4;
 return jsCall(1, a1 | 0, a2 | 0, +a3, +a4) | 0; //@line 17283
}
function jsCall_iiiff_0(a1, a2, a3, a4) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = +a3;
 a4 = +a4;
 return jsCall(0, a1 | 0, a2 | 0, +a3, +a4) | 0; //@line 17276
}
function __BBRoom_cloneWall($wall, $ctx) {
 $wall = $wall | 0;
 $ctx = $ctx | 0;
 _AQList_push($ctx, _BBWall_clone($wall) | 0) | 0; //@line 3942
 return;
}
function __BBPathNode_copyLink($pathNode, $ctx) {
 $pathNode = $pathNode | 0;
 $ctx = $ctx | 0;
 _AQList_push($ctx, $pathNode) | 0; //@line 3691
 return;
}
function __BBBlock_cloneRoom($self, $ctx) {
 $self = $self | 0;
 $ctx = $ctx | 0;
 _AQList_push($ctx, _BBRoom_clone($self) | 0) | 0; //@line 997
 return;
}
function _BBCameraController_done($self) {
 $self = $self | 0;
 _aqrelease(HEAP32[$self + 16 >> 2] | 0) | 0; //@line 1587
 return $self | 0; //@line 1588
}
function dynCall_vii(index, a1, a2) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 FUNCTION_TABLE_vii[index & 63](a1 | 0, a2 | 0); //@line 16913
}
function _aqinit($self) {
 $self = $self | 0;
 return FUNCTION_TABLE_ii[HEAP32[(HEAP32[$self >> 2] | 0) + 12 >> 2] & 127]($self) | 0; //@line 12268
}
function _AQWebAudioDriver_getInterface($self, $id) {
 $self = $self | 0;
 $id = $id | 0;
 return (($id | 0) == 2488 ? 1512 : 0) | 0; //@line 9953
}
function _AQDictMap_done($self) {
 $self = $self | 0;
 _aqrelease(HEAP32[$self + 12 >> 2] | 0) | 0; //@line 11098
 return $self | 0; //@line 11099
}
function _BBPathNode_done($self) {
 $self = $self | 0;
 _aqrelease(HEAP32[$self + 20 >> 2] | 0) | 0; //@line 3680
 return $self | 0; //@line 3681
}
function _BBMultiWallView_getInterface($self, $id) {
 $self = $self | 0;
 $id = $id | 0;
 return (($id | 0) == 1992 ? 1464 : 0) | 0; //@line 3605
}
function _AQParticle_wake($self) {
 $self = $self | 0;
 HEAP8[$self + 98 | 0] = 0; //@line 9115
 HEAP8[$self + 99 | 0] = 0; //@line 9117
 return;
}
function _BBCameraController_inputPress($self) {
 $self = $self | 0;
 HEAP32[$self + 20 >> 2] = 1; //@line 1625
 return $self | 0; //@line 1626
}
function dynCall_vif(index, a1, a2) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = +a2;
 FUNCTION_TABLE_vif[index & 31](a1 | 0, +a2); //@line 16556
}
function __BBCity_addWallToView($obj, $ctx) {
 $obj = $obj | 0;
 $ctx = $ctx | 0;
 _BBMultiWallView_addWall($ctx, $obj); //@line 3095
 return;
}
function _aqistype($self, $type) {
 $self = $self | 0;
 $type = $type | 0;
 return (HEAP32[$self >> 2] | 0) == ($type | 0) | 0; //@line 12462
}
function _BBWall_done($self) {
 $self = $self | 0;
 _aqrelease(HEAP32[$self + 28 >> 2] | 0) | 0; //@line 4789
 return $self | 0; //@line 4790
}
function _AQDictMap_getInterface($self, $id) {
 $self = $self | 0;
 $id = $id | 0;
 return (($id | 0) == 2248 ? 1624 : 0) | 0; //@line 11110
}
function _AQActorView_getInterface($self, $id) {
 $self = $self | 0;
 $id = $id | 0;
 return (($id | 0) == 1992 ? 1656 : 0) | 0; //@line 444
}
function _AQString_getInterface($self, $id) {
 $self = $self | 0;
 $id = $id | 0;
 return (($id | 0) == 2448 ? 1568 : 0) | 0; //@line 12627
}
function _AQLoop_boot() {
 if ((HEAP32[824] | 0) != 0) {
  return;
 }
 HEAP32[824] = _aqinit(_aqalloc(2256) | 0) | 0; //@line 3427
 return;
}
function __BBBlock_moveRoom($room, $diff) {
 $room = $room | 0;
 $diff = $diff | 0;
 _BBRoom_move($room, $diff) | 0; //@line 1213
 return;
}
function _AQSoundInstance_init($self) {
 $self = $self | 0;
 _memset($self + 12 | 0, 0, 28); //@line 9833
 return $self | 0; //@line 9834
}
function dynCall_ii(index, a1) {
 index = index | 0;
 a1 = a1 | 0;
 return FUNCTION_TABLE_ii[index & 127](a1 | 0) | 0; //@line 17151
}
function _AQTouch_init($self) {
 $self = $self | 0;
 _memset($self + 12 | 0, 0, 32); //@line 10231
 return $self | 0; //@line 10232
}
function _AQArray_init($self) {
 $self = $self | 0;
 _memset($self + 12 | 0, 0, 12); //@line 10778
 return $self | 0; //@line 10779
}
function jsCall_viii_15(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 jsCall(15, a1 | 0, a2 | 0, a3 | 0); //@line 17500
}
function jsCall_viii_14(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 jsCall(14, a1 | 0, a2 | 0, a3 | 0); //@line 17493
}
function jsCall_viii_13(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 jsCall(13, a1 | 0, a2 | 0, a3 | 0); //@line 17486
}
function jsCall_viii_12(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 jsCall(12, a1 | 0, a2 | 0, a3 | 0); //@line 17479
}
function jsCall_viii_11(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 jsCall(11, a1 | 0, a2 | 0, a3 | 0); //@line 17472
}
function jsCall_viii_10(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 jsCall(10, a1 | 0, a2 | 0, a3 | 0); //@line 17465
}
function b6(p0, p1, p2, p3) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = +p2;
 p3 = +p3;
 abort(6); //@line 17867
 return 0; //@line 17867
}
function _AQDdvt_init($self) {
 $self = $self | 0;
 _memset($self + 12 | 0, 0, 232); //@line 5660
 return $self | 0; //@line 5662
}
function jsCall_viii_9(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 jsCall(9, a1 | 0, a2 | 0, a3 | 0); //@line 17458
}
function jsCall_viii_8(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 jsCall(8, a1 | 0, a2 | 0, a3 | 0); //@line 17451
}
function jsCall_viii_7(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 jsCall(7, a1 | 0, a2 | 0, a3 | 0); //@line 17444
}
function jsCall_viii_6(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 jsCall(6, a1 | 0, a2 | 0, a3 | 0); //@line 17437
}
function jsCall_viii_5(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 jsCall(5, a1 | 0, a2 | 0, a3 | 0); //@line 17430
}
function jsCall_viii_4(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 jsCall(4, a1 | 0, a2 | 0, a3 | 0); //@line 17423
}
function jsCall_viii_3(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 jsCall(3, a1 | 0, a2 | 0, a3 | 0); //@line 17416
}
function jsCall_viii_2(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 jsCall(2, a1 | 0, a2 | 0, a3 | 0); //@line 17409
}
function jsCall_viii_1(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 jsCall(1, a1 | 0, a2 | 0, a3 | 0); //@line 17402
}
function jsCall_viii_0(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 jsCall(0, a1 | 0, a2 | 0, a3 | 0); //@line 17395
}
function _setSpaceLeaperResourceCallback($callback) {
 $callback = $callback | 0;
 HEAP32[658] = $callback; //@line 938
 return;
}
function _setSpaceLeaperVisitedCallback($callback) {
 $callback = $callback | 0;
 HEAP32[654] = $callback; //@line 929
 return;
}
function _AQObj_getInterface($self, $interface) {
 $self = $self | 0;
 $interface = $interface | 0;
 return 0; //@line 12192
}
function _setSpaceLeaperEndCallback($callback) {
 $callback = $callback | 0;
 HEAP32[796] = $callback; //@line 920
 return;
}
function _setGetTicksFunction($_getTicks) {
 $_getTicks = $_getTicks | 0;
 HEAP32[690] = $_getTicks; //@line 571
 return;
}
function dynCall_vi(index, a1) {
 index = index | 0;
 a1 = a1 | 0;
 FUNCTION_TABLE_vi[index & 31](a1 | 0); //@line 16794
}
function jsCall_viff_15(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = +a2;
 a3 = +a3;
 jsCall(15, a1 | 0, +a2, +a3); //@line 17143
}
function jsCall_viff_14(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = +a2;
 a3 = +a3;
 jsCall(14, a1 | 0, +a2, +a3); //@line 17136
}
function jsCall_viff_13(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = +a2;
 a3 = +a3;
 jsCall(13, a1 | 0, +a2, +a3); //@line 17129
}
function jsCall_viff_12(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = +a2;
 a3 = +a3;
 jsCall(12, a1 | 0, +a2, +a3); //@line 17122
}
function jsCall_viff_11(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = +a2;
 a3 = +a3;
 jsCall(11, a1 | 0, +a2, +a3); //@line 17115
}
function jsCall_viff_10(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = +a2;
 a3 = +a3;
 jsCall(10, a1 | 0, +a2, +a3); //@line 17108
}
function jsCall_viff_9(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = +a2;
 a3 = +a3;
 jsCall(9, a1 | 0, +a2, +a3); //@line 17101
}
function jsCall_viff_8(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = +a2;
 a3 = +a3;
 jsCall(8, a1 | 0, +a2, +a3); //@line 17094
}
function jsCall_viff_7(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = +a2;
 a3 = +a3;
 jsCall(7, a1 | 0, +a2, +a3); //@line 17087
}
function jsCall_viff_6(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = +a2;
 a3 = +a3;
 jsCall(6, a1 | 0, +a2, +a3); //@line 17080
}
function jsCall_viff_5(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = +a2;
 a3 = +a3;
 jsCall(5, a1 | 0, +a2, +a3); //@line 17073
}
function jsCall_viff_4(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = +a2;
 a3 = +a3;
 jsCall(4, a1 | 0, +a2, +a3); //@line 17066
}
function jsCall_viff_3(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = +a2;
 a3 = +a3;
 jsCall(3, a1 | 0, +a2, +a3); //@line 17059
}
function jsCall_viff_2(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = +a2;
 a3 = +a3;
 jsCall(2, a1 | 0, +a2, +a3); //@line 17052
}
function jsCall_viff_1(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = +a2;
 a3 = +a3;
 jsCall(1, a1 | 0, +a2, +a3); //@line 17045
}
function jsCall_viff_0(a1, a2, a3) {
 a1 = a1 | 0;
 a2 = +a2;
 a3 = +a3;
 jsCall(0, a1 | 0, +a2, +a3); //@line 17038
}
function _BBCity_init($self) {
 $self = $self | 0;
 _aqzero($self) | 0; //@line 1635
 return $self | 0; //@line 1636
}
function _AQView_iterateList($list) {
 $list = $list | 0;
 _AQList_iterate($list, 24, 0) | 0; //@line 4762
 return;
}
function jsCall_iii_15(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 return jsCall(15, a1 | 0, a2 | 0) | 0; //@line 17857
}
function jsCall_iii_14(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 return jsCall(14, a1 | 0, a2 | 0) | 0; //@line 17850
}
function jsCall_iii_13(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 return jsCall(13, a1 | 0, a2 | 0) | 0; //@line 17843
}
function jsCall_iii_12(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 return jsCall(12, a1 | 0, a2 | 0) | 0; //@line 17836
}
function jsCall_iii_11(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 return jsCall(11, a1 | 0, a2 | 0) | 0; //@line 17829
}
function jsCall_iii_10(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 return jsCall(10, a1 | 0, a2 | 0) | 0; //@line 17822
}
function dynCall_fi(index, a1) {
 index = index | 0;
 a1 = a1 | 0;
 return +FUNCTION_TABLE_fi[index & 31](a1 | 0);
}
function jsCall_iii_9(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 return jsCall(9, a1 | 0, a2 | 0) | 0; //@line 17815
}
function jsCall_iii_8(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 return jsCall(8, a1 | 0, a2 | 0) | 0; //@line 17808
}
function jsCall_iii_7(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 return jsCall(7, a1 | 0, a2 | 0) | 0; //@line 17801
}
function jsCall_iii_6(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 return jsCall(6, a1 | 0, a2 | 0) | 0; //@line 17794
}
function jsCall_iii_5(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 return jsCall(5, a1 | 0, a2 | 0) | 0; //@line 17787
}
function jsCall_iii_4(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 return jsCall(4, a1 | 0, a2 | 0) | 0; //@line 17780
}
function jsCall_iii_3(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 return jsCall(3, a1 | 0, a2 | 0) | 0; //@line 17773
}
function jsCall_iii_2(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 return jsCall(2, a1 | 0, a2 | 0) | 0; //@line 17766
}
function jsCall_iii_1(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 return jsCall(1, a1 | 0, a2 | 0) | 0; //@line 17759
}
function jsCall_iii_0(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 return jsCall(0, a1 | 0, a2 | 0) | 0; //@line 17752
}
function _AQDouble_asInt($_self) {
 $_self = $_self | 0;
 return ~~+HEAPF64[$_self + 16 >> 3] | 0; //@line 12032
}
function _AQWebAudioDriver_setMasterVolume($self, $volume) {
 $self = $self | 0;
 $volume = +$volume;
 return;
}
function _colorvertex_next($vertices) {
 $vertices = $vertices | 0;
 return $vertices + 12 | 0; //@line 3147
}
function _AQList_length($_self) {
 $_self = $_self | 0;
 return HEAP32[$_self + 12 >> 2] | 0; //@line 11281
}
function dynCall_i(index) {
 index = index | 0;
 return FUNCTION_TABLE_i[index & 31]() | 0; //@line 16675
}
function _AQInt_asInt($_self) {
 $_self = $_self | 0;
 return HEAP32[$_self + 12 >> 2] | 0; //@line 11962
}
function _AQArray_length($self) {
 $self = $self | 0;
 return HEAP32[$self + 12 >> 2] | 0; //@line 11022
}
function jsCall_vii_15(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 jsCall(15, a1 | 0, a2 | 0); //@line 17024
}
function jsCall_vii_14(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 jsCall(14, a1 | 0, a2 | 0); //@line 17017
}
function jsCall_vii_13(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 jsCall(13, a1 | 0, a2 | 0); //@line 17010
}
function jsCall_vii_12(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 jsCall(12, a1 | 0, a2 | 0); //@line 17003
}
function jsCall_vii_11(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 jsCall(11, a1 | 0, a2 | 0); //@line 16996
}
function jsCall_vii_10(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 jsCall(10, a1 | 0, a2 | 0); //@line 16989
}
function _colorvertex_getcolor($vertex) {
 $vertex = $vertex | 0;
 return $vertex + 8 | 0; //@line 3157
}
function _AQString_cstr($self) {
 $self = $self | 0;
 return HEAP32[$self + 16 >> 2] | 0; //@line 12699
}
function jsCall_vii_9(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 jsCall(9, a1 | 0, a2 | 0); //@line 16982
}
function jsCall_vii_8(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 jsCall(8, a1 | 0, a2 | 0); //@line 16975
}
function jsCall_vii_7(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 jsCall(7, a1 | 0, a2 | 0); //@line 16968
}
function jsCall_vii_6(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 jsCall(6, a1 | 0, a2 | 0); //@line 16961
}
function jsCall_vii_5(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 jsCall(5, a1 | 0, a2 | 0); //@line 16954
}
function jsCall_vii_4(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 jsCall(4, a1 | 0, a2 | 0); //@line 16947
}
function jsCall_vii_3(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 jsCall(3, a1 | 0, a2 | 0); //@line 16940
}
function jsCall_vii_2(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 jsCall(2, a1 | 0, a2 | 0); //@line 16933
}
function jsCall_vii_1(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 jsCall(1, a1 | 0, a2 | 0); //@line 16926
}
function jsCall_vii_0(a1, a2) {
 a1 = a1 | 0;
 a2 = a2 | 0;
 jsCall(0, a1 | 0, a2 | 0); //@line 16919
}
function b10(p0, p1) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 abort(10); //@line 17871
 return 0; //@line 17871
}
function _AQInt_asDouble($_self) {
 $_self = $_self | 0;
 return +(+(HEAP32[$_self + 12 >> 2] | 0));
}
function _AQDouble_asDouble($_self) {
 $_self = $_self | 0;
 return +(+HEAPF64[$_self + 16 >> 3]);
}
function jsCall_vif_15(a1, a2) {
 a1 = a1 | 0;
 a2 = +a2;
 jsCall(15, a1 | 0, +a2); //@line 16667
}
function jsCall_vif_14(a1, a2) {
 a1 = a1 | 0;
 a2 = +a2;
 jsCall(14, a1 | 0, +a2); //@line 16660
}
function jsCall_vif_13(a1, a2) {
 a1 = a1 | 0;
 a2 = +a2;
 jsCall(13, a1 | 0, +a2); //@line 16653
}
function jsCall_vif_12(a1, a2) {
 a1 = a1 | 0;
 a2 = +a2;
 jsCall(12, a1 | 0, +a2); //@line 16646
}
function jsCall_vif_11(a1, a2) {
 a1 = a1 | 0;
 a2 = +a2;
 jsCall(11, a1 | 0, +a2); //@line 16639
}
function jsCall_vif_10(a1, a2) {
 a1 = a1 | 0;
 a2 = +a2;
 jsCall(10, a1 | 0, +a2); //@line 16632
}
function jsCall_vif_9(a1, a2) {
 a1 = a1 | 0;
 a2 = +a2;
 jsCall(9, a1 | 0, +a2); //@line 16625
}
function jsCall_vif_8(a1, a2) {
 a1 = a1 | 0;
 a2 = +a2;
 jsCall(8, a1 | 0, +a2); //@line 16618
}
function jsCall_vif_7(a1, a2) {
 a1 = a1 | 0;
 a2 = +a2;
 jsCall(7, a1 | 0, +a2); //@line 16611
}
function jsCall_vif_6(a1, a2) {
 a1 = a1 | 0;
 a2 = +a2;
 jsCall(6, a1 | 0, +a2); //@line 16604
}
function jsCall_vif_5(a1, a2) {
 a1 = a1 | 0;
 a2 = +a2;
 jsCall(5, a1 | 0, +a2); //@line 16597
}
function jsCall_vif_4(a1, a2) {
 a1 = a1 | 0;
 a2 = +a2;
 jsCall(4, a1 | 0, +a2); //@line 16590
}
function jsCall_vif_3(a1, a2) {
 a1 = a1 | 0;
 a2 = +a2;
 jsCall(3, a1 | 0, +a2); //@line 16583
}
function jsCall_vif_2(a1, a2) {
 a1 = a1 | 0;
 a2 = +a2;
 jsCall(2, a1 | 0, +a2); //@line 16576
}
function jsCall_vif_1(a1, a2) {
 a1 = a1 | 0;
 a2 = +a2;
 jsCall(1, a1 | 0, +a2); //@line 16569
}
function jsCall_vif_0(a1, a2) {
 a1 = a1 | 0;
 a2 = +a2;
 jsCall(0, a1 | 0, +a2); //@line 16562
}
function dynCall_v(index) {
 index = index | 0;
 FUNCTION_TABLE_v[index & 31](); //@line 17508
}
function _AQRenderer_camera() {
 return HEAP32[(HEAP32[822] | 0) + 16 >> 2] | 0; //@line 3821
}
function b7(p0, p1, p2) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 abort(7); //@line 17868
}
function jsCall_ii_15(a1) {
 a1 = a1 | 0;
 return jsCall(15, a1 | 0) | 0; //@line 17262
}
function jsCall_ii_14(a1) {
 a1 = a1 | 0;
 return jsCall(14, a1 | 0) | 0; //@line 17255
}
function jsCall_ii_13(a1) {
 a1 = a1 | 0;
 return jsCall(13, a1 | 0) | 0; //@line 17248
}
function jsCall_ii_12(a1) {
 a1 = a1 | 0;
 return jsCall(12, a1 | 0) | 0; //@line 17241
}
function jsCall_ii_11(a1) {
 a1 = a1 | 0;
 return jsCall(11, a1 | 0) | 0; //@line 17234
}
function jsCall_ii_10(a1) {
 a1 = a1 | 0;
 return jsCall(10, a1 | 0) | 0; //@line 17227
}
function b4(p0, p1, p2) {
 p0 = p0 | 0;
 p1 = +p1;
 p2 = +p2;
 abort(4); //@line 17865
}
function jsCall_ii_9(a1) {
 a1 = a1 | 0;
 return jsCall(9, a1 | 0) | 0; //@line 17220
}
function jsCall_ii_8(a1) {
 a1 = a1 | 0;
 return jsCall(8, a1 | 0) | 0; //@line 17213
}
function jsCall_ii_7(a1) {
 a1 = a1 | 0;
 return jsCall(7, a1 | 0) | 0; //@line 17206
}
function jsCall_ii_6(a1) {
 a1 = a1 | 0;
 return jsCall(6, a1 | 0) | 0; //@line 17199
}
function jsCall_ii_5(a1) {
 a1 = a1 | 0;
 return jsCall(5, a1 | 0) | 0; //@line 17192
}
function jsCall_ii_4(a1) {
 a1 = a1 | 0;
 return jsCall(4, a1 | 0) | 0; //@line 17185
}
function jsCall_ii_3(a1) {
 a1 = a1 | 0;
 return jsCall(3, a1 | 0) | 0; //@line 17178
}
function jsCall_ii_2(a1) {
 a1 = a1 | 0;
 return jsCall(2, a1 | 0) | 0; //@line 17171
}
function jsCall_ii_1(a1) {
 a1 = a1 | 0;
 return jsCall(1, a1 | 0) | 0; //@line 17164
}
function jsCall_ii_0(a1) {
 a1 = a1 | 0;
 return jsCall(0, a1 | 0) | 0; //@line 17157
}
function _AQDouble_init($self) {
 $self = $self | 0;
 return $self | 0; //@line 12134
}
function _AQDouble_done($self) {
 $self = $self | 0;
 return $self | 0; //@line 12142
}
function _AQObj_done($self) {
 $self = $self | 0;
 return $self | 0; //@line 12183
}
function _AQInt_init($self) {
 $self = $self | 0;
 return $self | 0; //@line 12098
}
function _AQInt_done($self) {
 $self = $self | 0;
 return $self | 0; //@line 12106
}
function b5(p0) {
 p0 = p0 | 0;
 abort(5); //@line 17866
 return 0; //@line 17866
}
function i__SDL_GetTicks__wrapper() {
 return _SDL_GetTicks() | 0; //@line 16551
}
function setTempRet9(value) {
 value = value | 0;
 tempRet9 = value; //@line 89
}
function setTempRet8(value) {
 value = value | 0;
 tempRet8 = value; //@line 84
}
function setTempRet7(value) {
 value = value | 0;
 tempRet7 = value; //@line 79
}
function setTempRet6(value) {
 value = value | 0;
 tempRet6 = value; //@line 74
}
function setTempRet5(value) {
 value = value | 0;
 tempRet5 = value; //@line 69
}
function setTempRet4(value) {
 value = value | 0;
 tempRet4 = value; //@line 64
}
function setTempRet3(value) {
 value = value | 0;
 tempRet3 = value; //@line 59
}
function setTempRet2(value) {
 value = value | 0;
 tempRet2 = value; //@line 54
}
function setTempRet1(value) {
 value = value | 0;
 tempRet1 = value; //@line 49
}
function setTempRet0(value) {
 value = value | 0;
 tempRet0 = value; //@line 44
}
function _AQWebAudioDriver_create() {
 return _aqcreate(1952) | 0; //@line 9962
}
function jsCall_vi_15(a1) {
 a1 = a1 | 0;
 jsCall(15, a1 | 0); //@line 16905
}
function jsCall_vi_14(a1) {
 a1 = a1 | 0;
 jsCall(14, a1 | 0); //@line 16898
}
function jsCall_vi_13(a1) {
 a1 = a1 | 0;
 jsCall(13, a1 | 0); //@line 16891
}
function jsCall_vi_12(a1) {
 a1 = a1 | 0;
 jsCall(12, a1 | 0); //@line 16884
}
function jsCall_vi_11(a1) {
 a1 = a1 | 0;
 jsCall(11, a1 | 0); //@line 16877
}
function jsCall_vi_10(a1) {
 a1 = a1 | 0;
 jsCall(10, a1 | 0); //@line 16870
}
function jsCall_vi_9(a1) {
 a1 = a1 | 0;
 jsCall(9, a1 | 0); //@line 16863
}
function jsCall_vi_8(a1) {
 a1 = a1 | 0;
 jsCall(8, a1 | 0); //@line 16856
}
function jsCall_vi_7(a1) {
 a1 = a1 | 0;
 jsCall(7, a1 | 0); //@line 16849
}
function jsCall_vi_6(a1) {
 a1 = a1 | 0;
 jsCall(6, a1 | 0); //@line 16842
}
function jsCall_vi_5(a1) {
 a1 = a1 | 0;
 jsCall(5, a1 | 0); //@line 16835
}
function jsCall_vi_4(a1) {
 a1 = a1 | 0;
 jsCall(4, a1 | 0); //@line 16828
}
function jsCall_vi_3(a1) {
 a1 = a1 | 0;
 jsCall(3, a1 | 0); //@line 16821
}
function jsCall_vi_2(a1) {
 a1 = a1 | 0;
 jsCall(2, a1 | 0); //@line 16814
}
function jsCall_vi_1(a1) {
 a1 = a1 | 0;
 jsCall(1, a1 | 0); //@line 16807
}
function jsCall_vi_0(a1) {
 a1 = a1 | 0;
 jsCall(0, a1 | 0); //@line 16800
}
function b3(p0, p1) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 abort(3); //@line 17864
}
function stackRestore(top) {
 top = top | 0;
 STACKTOP = top; //@line 13
}
function b0(p0, p1) {
 p0 = p0 | 0;
 p1 = +p1;
 abort(0); //@line 17861
}
function jsCall_fi_15(a1) {
 a1 = a1 | 0;
 return +jsCall(15, a1 | 0);
}
function jsCall_fi_14(a1) {
 a1 = a1 | 0;
 return +jsCall(14, a1 | 0);
}
function jsCall_fi_13(a1) {
 a1 = a1 | 0;
 return +jsCall(13, a1 | 0);
}
function jsCall_fi_12(a1) {
 a1 = a1 | 0;
 return +jsCall(12, a1 | 0);
}
function jsCall_fi_11(a1) {
 a1 = a1 | 0;
 return +jsCall(11, a1 | 0);
}
function jsCall_fi_10(a1) {
 a1 = a1 | 0;
 return +jsCall(10, a1 | 0);
}
function _resumeSpaceLeaper() {
 HEAP8[2648] = 0; //@line 911
 return;
}
function b9(p0) {
 p0 = p0 | 0;
 abort(9); //@line 17870
 return 0.0;
}
function _pauseSpaceLeaper() {
 HEAP8[2648] = 1; //@line 903
 return;
}
function jsCall_fi_9(a1) {
 a1 = a1 | 0;
 return +jsCall(9, a1 | 0);
}
function jsCall_fi_8(a1) {
 a1 = a1 | 0;
 return +jsCall(8, a1 | 0);
}
function jsCall_fi_7(a1) {
 a1 = a1 | 0;
 return +jsCall(7, a1 | 0);
}
function jsCall_fi_6(a1) {
 a1 = a1 | 0;
 return +jsCall(6, a1 | 0);
}
function jsCall_fi_5(a1) {
 a1 = a1 | 0;
 return +jsCall(5, a1 | 0);
}
function jsCall_fi_4(a1) {
 a1 = a1 | 0;
 return +jsCall(4, a1 | 0);
}
function jsCall_fi_3(a1) {
 a1 = a1 | 0;
 return +jsCall(3, a1 | 0);
}
function jsCall_fi_2(a1) {
 a1 = a1 | 0;
 return +jsCall(2, a1 | 0);
}
function jsCall_fi_1(a1) {
 a1 = a1 | 0;
 return +jsCall(1, a1 | 0);
}
function jsCall_fi_0(a1) {
 a1 = a1 | 0;
 return +jsCall(0, a1 | 0);
}
function b1() {
 abort(1); //@line 17862
 return 0; //@line 17862
}
function jsCall_i_15() {
 return jsCall(15) | 0; //@line 16786
}
function jsCall_i_14() {
 return jsCall(14) | 0; //@line 16779
}
function jsCall_i_13() {
 return jsCall(13) | 0; //@line 16772
}
function jsCall_i_12() {
 return jsCall(12) | 0; //@line 16765
}
function jsCall_i_11() {
 return jsCall(11) | 0; //@line 16758
}
function jsCall_i_10() {
 return jsCall(10) | 0; //@line 16751
}
function jsCall_i_9() {
 return jsCall(9) | 0; //@line 16744
}
function jsCall_i_8() {
 return jsCall(8) | 0; //@line 16737
}
function jsCall_i_7() {
 return jsCall(7) | 0; //@line 16730
}
function jsCall_i_6() {
 return jsCall(6) | 0; //@line 16723
}
function jsCall_i_5() {
 return jsCall(5) | 0; //@line 16716
}
function jsCall_i_4() {
 return jsCall(4) | 0; //@line 16709
}
function jsCall_i_3() {
 return jsCall(3) | 0; //@line 16702
}
function jsCall_i_2() {
 return jsCall(2) | 0; //@line 16695
}
function jsCall_i_1() {
 return jsCall(1) | 0; //@line 16688
}
function jsCall_i_0() {
 return jsCall(0) | 0; //@line 16681
}
function b2(p0) {
 p0 = p0 | 0;
 abort(2); //@line 17863
}
function stackSave() {
 return STACKTOP | 0; //@line 9
}
function jsCall_v_15() {
 jsCall(15); //@line 17619
}
function jsCall_v_14() {
 jsCall(14); //@line 17612
}
function jsCall_v_13() {
 jsCall(13); //@line 17605
}
function jsCall_v_12() {
 jsCall(12); //@line 17598
}
function jsCall_v_11() {
 jsCall(11); //@line 17591
}
function jsCall_v_10() {
 jsCall(10); //@line 17584
}
function jsCall_v_9() {
 jsCall(9); //@line 17577
}
function jsCall_v_8() {
 jsCall(8); //@line 17570
}
function jsCall_v_7() {
 jsCall(7); //@line 17563
}
function jsCall_v_6() {
 jsCall(6); //@line 17556
}
function jsCall_v_5() {
 jsCall(5); //@line 17549
}
function jsCall_v_4() {
 jsCall(4); //@line 17542
}
function jsCall_v_3() {
 jsCall(3); //@line 17535
}
function jsCall_v_2() {
 jsCall(2); //@line 17528
}
function jsCall_v_1() {
 jsCall(1); //@line 17521
}
function jsCall_v_0() {
 jsCall(0); //@line 17514
}
function b8() {
 abort(8); //@line 17869
}
function runPostSets() {
}
// EMSCRIPTEN_END_FUNCS
  var FUNCTION_TABLE_vif = [b0,jsCall_vif_0,jsCall_vif_1,jsCall_vif_2,jsCall_vif_3,jsCall_vif_4,jsCall_vif_5,jsCall_vif_6,jsCall_vif_7,jsCall_vif_8,jsCall_vif_9,jsCall_vif_10,jsCall_vif_11,jsCall_vif_12,jsCall_vif_13,jsCall_vif_14,jsCall_vif_15,__BBCameraController_update,__AQActor_update,_AQWebAudioDriver_setMasterVolume,b0,b0,b0,b0,b0,b0,b0,b0,b0
  ,b0,b0,b0];
  var FUNCTION_TABLE_i = [b1,jsCall_i_0,jsCall_i_1,jsCall_i_2,jsCall_i_3,jsCall_i_4,jsCall_i_5,jsCall_i_6,jsCall_i_7,jsCall_i_8,jsCall_i_9,jsCall_i_10,jsCall_i_11,jsCall_i_12,jsCall_i_13,jsCall_i_14,jsCall_i_15,i__SDL_GetTicks__wrapper,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1
  ,b1,b1,b1];
  var FUNCTION_TABLE_vi = [b2,jsCall_vi_0,jsCall_vi_1,jsCall_vi_2,jsCall_vi_3,jsCall_vi_4,jsCall_vi_5,jsCall_vi_6,jsCall_vi_7,jsCall_vi_8,jsCall_vi_9,jsCall_vi_10,jsCall_vi_11,jsCall_vi_12,jsCall_vi_13,jsCall_vi_14,jsCall_vi_15,__AQActorView_draw,__BBMultiWallView_draw,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2
  ,b2,b2,b2];
  var FUNCTION_TABLE_vii = [b3,jsCall_vii_0,jsCall_vii_1,jsCall_vii_2,jsCall_vii_3,jsCall_vii_4,jsCall_vii_5,jsCall_vii_6,jsCall_vii_7,jsCall_vii_8,jsCall_vii_9,jsCall_vii_10,jsCall_vii_11,jsCall_vii_12,jsCall_vii_13,jsCall_vii_14,jsCall_vii_15,__BBRoom_moveWall,__BBBlock_clonePathNode,__BBRoom_clonePathNode,__AQDdvt_fromChildrenIterator,__BBBlock_rotateRoom,__BBBlock_moveRoom,__AQWorld_integrateIterator,__AQView_iterator,__BBRoom_cloneWall,__AQWorld_performConstraints,__BBRoom_movePathNode,__BBRoom_rotateWall
  ,__BBCity_iterateBlocks_addWallsToView,__BBMultiWallView_drawWall,_BBWall_removeFromWorld,__BBCity_iterateRooms_addWallsToView,__BBRoom_moveParticle,_AQWebAudioDriver_stopSound,_AQDictMap_unset,__AQWorld_maintainBoxIterator,__SLUpdate_iterator,__BBBlock_cloneRoom,__AQInputAction_update,__BBWall_addParticleIterator,__BBPathNode_copyLink,__BBCity_addWallToView,__BBBlock_movePathNode,_BBRoom_addToWorld,__AQWorld_solveIterator,__BBRoom_rotateParticle,_BBBlock_addToWorld,__BBWall_removeParticleIterator,_BBWall_addToWorld,b3,b3,b3,b3,b3,b3,b3,b3,b3
  ,b3,b3,b3,b3,b3];
  var FUNCTION_TABLE_viff = [b4,jsCall_viff_0,jsCall_viff_1,jsCall_viff_2,jsCall_viff_3,jsCall_viff_4,jsCall_viff_5,jsCall_viff_6,jsCall_viff_7,jsCall_viff_8,jsCall_viff_9,jsCall_viff_10,jsCall_viff_11,jsCall_viff_12,jsCall_viff_13,jsCall_viff_14,jsCall_viff_15,_AQWebAudioDriver_setListenerPosition,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4
  ,b4,b4,b4];
  var FUNCTION_TABLE_ii = [b5,jsCall_ii_0,jsCall_ii_1,jsCall_ii_2,jsCall_ii_3,jsCall_ii_4,jsCall_ii_5,jsCall_ii_6,jsCall_ii_7,jsCall_ii_8,jsCall_ii_9,jsCall_ii_10,jsCall_ii_11,jsCall_ii_12,jsCall_ii_13,jsCall_ii_14,jsCall_ii_15,_AQList_done,_colorvertex_next,_AQSoundInstance_init,_AQDictPair_init,_BBPathNode_done,_AQSound_done,_AQDouble_init,_BBRoom_init,_AQInt_done,_AQActor_done,_BBCameraController_done,_AQParticle_init
  ,_AQActorView_done,_AQInputAction_init,_AQActor_init,_AQReleasePool_done,_AQString_done,_AQTouch_init,_AQList_init,_AQDdvt_init,_AQDouble_asInt,_AQLoop_init,_AQArray_init,_BBPathNode_init,__AQWebAudioSource_init,__AQActor_view,_BBMultiWallView_done,_colorvertex_getcolor,_AQObj_done,_BBBlock_init,_AQInt_init,_AQInputAction_done,_BBCity_done,_AQDictMap_done,_AQDdvt_done,_BBRoom_done,_AQDouble_done,_AQReleasePool_init,_BBBlock_done,_AQParticle_done,__AQWebAudioBuffer_init,_AQDictMap_init
  ,_AQString_init,__AQWebAudioSource_done,_BBWall_done,_AQCamera_init,_AQWebAudioDriver_init,_AQArray_done,_BBCameraController_init,__AQWebAudioBuffer_done,_AQInt_asInt,_BBCity_init,_AQWebAudioDriver_done,_AQSound_init,_AQSoundInstance_done,_AQRenderer_done,_AQWorld_init,_AQLoop_done,_AQActorView_init,_AQDictPair_done,_AQApp_done,_AQWorld_done,_AQRenderer_init,_BBMultiWallView_init,_AQApp_init,_BBWall_init,b5,b5,b5,b5,b5,b5
  ,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5
  ,b5,b5,b5,b5,b5,b5,b5,b5,b5];
  var FUNCTION_TABLE_iiiff = [b6,jsCall_iiiff_0,jsCall_iiiff_1,jsCall_iiiff_2,jsCall_iiiff_3,jsCall_iiiff_4,jsCall_iiiff_5,jsCall_iiiff_6,jsCall_iiiff_7,jsCall_iiiff_8,jsCall_iiiff_9,jsCall_iiiff_10,jsCall_iiiff_11,jsCall_iiiff_12,jsCall_iiiff_13,jsCall_iiiff_14,jsCall_iiiff_15,_AQWebAudioDriver_playSoundAt,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6
  ,b6,b6,b6];
  var FUNCTION_TABLE_viii = [b7,jsCall_viii_0,jsCall_viii_1,jsCall_viii_2,jsCall_viii_3,jsCall_viii_4,jsCall_viii_5,jsCall_viii_6,jsCall_viii_7,jsCall_viii_8,jsCall_viii_9,jsCall_viii_10,jsCall_viii_11,jsCall_viii_12,jsCall_viii_13,jsCall_viii_14,jsCall_viii_15,_AQDictMap_set,_ColorShader_draw,__AQWorld_boxTestIterator,b7,b7,b7,b7,b7,b7,b7,b7,b7
  ,b7,b7,b7];
  var FUNCTION_TABLE_v = [b8,jsCall_v_0,jsCall_v_1,jsCall_v_2,jsCall_v_3,jsCall_v_4,jsCall_v_5,jsCall_v_6,jsCall_v_7,jsCall_v_8,jsCall_v_9,jsCall_v_10,jsCall_v_11,jsCall_v_12,jsCall_v_13,jsCall_v_14,jsCall_v_15,_main_loop,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8
  ,b8,b8,b8];
  var FUNCTION_TABLE_fi = [b9,jsCall_fi_0,jsCall_fi_1,jsCall_fi_2,jsCall_fi_3,jsCall_fi_4,jsCall_fi_5,jsCall_fi_6,jsCall_fi_7,jsCall_fi_8,jsCall_fi_9,jsCall_fi_10,jsCall_fi_11,jsCall_fi_12,jsCall_fi_13,jsCall_fi_14,jsCall_fi_15,_AQInt_asDouble,_AQDouble_asDouble,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9
  ,b9,b9,b9];
  var FUNCTION_TABLE_iii = [b10,jsCall_iii_0,jsCall_iii_1,jsCall_iii_2,jsCall_iii_3,jsCall_iii_4,jsCall_iii_5,jsCall_iii_6,jsCall_iii_7,jsCall_iii_8,jsCall_iii_9,jsCall_iii_10,jsCall_iii_11,jsCall_iii_12,jsCall_iii_13,jsCall_iii_14,jsCall_iii_15,__AQDictMap_listGetIterator,_AQActorView_getInterface,_AQObj_getInterface,_AQDictMap_get,__AQWebAudioDriver_findNotPlayingSourceIterator,_BBCameraController_getInterface,_BBMultiWallView_getInterface,_AQWebAudioDriver_loadSound,_AQDouble_getInterface,_AQWebAudioDriver_playSound,_AQInt_getInterface,_AQWebAudioDriver_getInterface
  ,_AQWebAudioDriver_playSoundLoop,_AQDouble_compare,_AQDictMap_getInterface,_AQString_compare,_AQInt_compare,_AQString_getInterface,_AQActor_getInterface,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10
  ,b10,b10,b10,b10,b10];
  return { _strlen: _strlen, _free: _free, _main: _main, _pauseSpaceLeaper: _pauseSpaceLeaper, _strncpy: _strncpy, _memset: _memset, _malloc: _malloc, _resumeSpaceLeaper: _resumeSpaceLeaper, _setSpaceLeaperVisitedCallback: _setSpaceLeaperVisitedCallback, _calloc: _calloc, _setSpaceLeaperResourceCallback: _setSpaceLeaperResourceCallback, _memcpy: _memcpy, _setSpaceLeaperEndCallback: _setSpaceLeaperEndCallback, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, setThrew: setThrew, setTempRet0: setTempRet0, setTempRet1: setTempRet1, setTempRet2: setTempRet2, setTempRet3: setTempRet3, setTempRet4: setTempRet4, setTempRet5: setTempRet5, setTempRet6: setTempRet6, setTempRet7: setTempRet7, setTempRet8: setTempRet8, setTempRet9: setTempRet9, dynCall_vif: dynCall_vif, dynCall_i: dynCall_i, dynCall_vi: dynCall_vi, dynCall_vii: dynCall_vii, dynCall_viff: dynCall_viff, dynCall_ii: dynCall_ii, dynCall_iiiff: dynCall_iiiff, dynCall_viii: dynCall_viii, dynCall_v: dynCall_v, dynCall_fi: dynCall_fi, dynCall_iii: dynCall_iii };
})
// EMSCRIPTEN_END_ASM
({ "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array }, { "abort": abort, "assert": assert, "asmPrintInt": asmPrintInt, "asmPrintFloat": asmPrintFloat, "min": Math_min, "jsCall": jsCall, "invoke_vif": invoke_vif, "invoke_i": invoke_i, "invoke_vi": invoke_vi, "invoke_vii": invoke_vii, "invoke_viff": invoke_viff, "invoke_ii": invoke_ii, "invoke_iiiff": invoke_iiiff, "invoke_viii": invoke_viii, "invoke_v": invoke_v, "invoke_fi": invoke_fi, "invoke_iii": invoke_iii, "_llvm_lifetime_end": _llvm_lifetime_end, "_glClearColor": _glClearColor, "_llvm_dbg_value": _llvm_dbg_value, "_enable_resizable": _enable_resizable, "_glLinkProgram": _glLinkProgram, "_fflush": _fflush, "_fputc": _fputc, "__webAudioBufferCreate": __webAudioBufferCreate, "_llvm_stackrestore": _llvm_stackrestore, "_fwrite": _fwrite, "_send": _send, "_fputs": _fputs, "_glCompileShader": _glCompileShader, "__webAudioSourceCreate": __webAudioSourceCreate, "__webAudioSourceStop": __webAudioSourceStop, "_glCreateShader": _glCreateShader, "_llvm_va_end": _llvm_va_end, "__webAudioContextSetListenerPosition": __webAudioContextSetListenerPosition, "_glGetProgramiv": _glGetProgramiv, "_glVertexAttribPointer": _glVertexAttribPointer, "_glGetUniformLocation": _glGetUniformLocation, "___setErrNo": ___setErrNo, "__webAudioSourceIsPlaying": __webAudioSourceIsPlaying, "__webAudioSourceSetPosition": __webAudioSourceSetPosition, "_glDrawArrays": _glDrawArrays, "_exit": _exit, "__webAudioContextInit": __webAudioContextInit, "_strrchr": _strrchr, "_glAttachShader": _glAttachShader, "__webAudioSourceSetLooping": __webAudioSourceSetLooping, "_glShaderSource": _glShaderSource, "_SDL_GetTicks": _SDL_GetTicks, "_cos": _cos, "_SDL_PollEvent": _SDL_PollEvent, "_llvm_stacksave": _llvm_stacksave, "_SDL_Init": _SDL_Init, "_glGetShaderiv": _glGetShaderiv, "__exit": __exit, "_strncmp": _strncmp, "_fabsf": _fabsf, "_floorf": _floorf, "__webAudioSourceDelete": __webAudioSourceDelete, "_printf": _printf, "_SDL_SetVideoMode": _SDL_SetVideoMode, "_sqrtf": _sqrtf, "_SDL_GL_SetAttribute": _SDL_GL_SetAttribute, "_sysconf": _sysconf, "_puts": _puts, "_glClear": _glClear, "_glEnableVertexAttribArray": _glEnableVertexAttribArray, "_glBindBuffer": _glBindBuffer, "_SDL_GetError": _SDL_GetError, "_glBufferData": _glBufferData, "__formatString": __formatString, "__webAudioBufferDelete": __webAudioBufferDelete, "_sbrk": _sbrk, "___errno_location": ___errno_location, "_llvm_lifetime_start": _llvm_lifetime_start, "_SDL_Quit": _SDL_Quit, "__webAudioSourcePlay": __webAudioSourcePlay, "_glUseProgram": _glUseProgram, "___assert_fail": ___assert_fail, "_glGetShaderInfoLog": _glGetShaderInfoLog, "_abort": _abort, "_fprintf": _fprintf, "__webAudioSourceSetBuffer": __webAudioSourceSetBuffer, "__reallyNegative": __reallyNegative, "_glEnable": _glEnable, "_write": _write, "_glGenBuffers": _glGenBuffers, "_glGetAttribLocation": _glGetAttribLocation, "_sin": _sin, "_glBlendFunc": _glBlendFunc, "_glCreateProgram": _glCreateProgram, "_glViewport": _glViewport, "_emscripten_set_main_loop": _emscripten_set_main_loop, "__webAudioContextDone": __webAudioContextDone, "_glUniformMatrix4fv": _glUniformMatrix4fv, "_pwrite": _pwrite, "_glDeleteBuffers": _glDeleteBuffers, "_atan2": _atan2, "_time": _time, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "NaN": NaN, "Infinity": Infinity }, buffer);
var _strlen = Module["_strlen"] = asm["_strlen"];
var _free = Module["_free"] = asm["_free"];
var _main = Module["_main"] = asm["_main"];
var _pauseSpaceLeaper = Module["_pauseSpaceLeaper"] = asm["_pauseSpaceLeaper"];
var _strncpy = Module["_strncpy"] = asm["_strncpy"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _resumeSpaceLeaper = Module["_resumeSpaceLeaper"] = asm["_resumeSpaceLeaper"];
var _setSpaceLeaperVisitedCallback = Module["_setSpaceLeaperVisitedCallback"] = asm["_setSpaceLeaperVisitedCallback"];
var _calloc = Module["_calloc"] = asm["_calloc"];
var _setSpaceLeaperResourceCallback = Module["_setSpaceLeaperResourceCallback"] = asm["_setSpaceLeaperResourceCallback"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _setSpaceLeaperEndCallback = Module["_setSpaceLeaperEndCallback"] = asm["_setSpaceLeaperEndCallback"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_vif = Module["dynCall_vif"] = asm["dynCall_vif"];
var dynCall_i = Module["dynCall_i"] = asm["dynCall_i"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
var dynCall_viff = Module["dynCall_viff"] = asm["dynCall_viff"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_iiiff = Module["dynCall_iiiff"] = asm["dynCall_iiiff"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_fi = Module["dynCall_fi"] = asm["dynCall_fi"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
Runtime.stackAlloc = function(size) { return asm['stackAlloc'](size) };
Runtime.stackSave = function() { return asm['stackSave']() };
Runtime.stackRestore = function(top) { asm['stackRestore'](top) };
// Warning: printing of i64 values may be slightly rounded! No deep i64 math used, so precise i64 code not included
var i64Math = null;
// === Auto-generated postamble setup entry stuff ===
if (memoryInitializer) {
  function applyData(data) {
    HEAPU8.set(data, STATIC_BASE);
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    applyData(Module['readBinary'](memoryInitializer));
  } else {
    addRunDependency('memory initializer');
    Browser.asyncLoad(memoryInitializer, function(data) {
      applyData(data);
      removeRunDependency('memory initializer');
    }, function(data) {
      throw 'could not load memory initializer ' + memoryInitializer;
    });
  }
}
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;
var initialStackTop;
var preloadStartTime = null;
var calledMain = false;
dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun'] && shouldRunNow) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}
Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');
  args = args || [];
  if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
    Module.printErr('preload time: ' + (Date.now() - preloadStartTime) + ' ms');
  }
  ensureInitRuntime();
  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString("/bin/this.program"), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);
  initialStackTop = STACKTOP;
  try {
    var ret = Module['_main'](argc, argv, 0);
    // if we're not running an evented main loop, it's time to exit
    if (!Module['noExitRuntime']) {
      exit(ret);
    }
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}
function run(args) {
  args = args || Module['arguments'];
  if (preloadStartTime === null) preloadStartTime = Date.now();
  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }
  preRun();
  if (runDependencies > 0) {
    // a preRun added a dependency, run will be called later
    return;
  }
  function doRun() {
    ensureInitRuntime();
    preMain();
    Module['calledRun'] = true;
    if (Module['_main'] && shouldRunNow) {
      Module['callMain'](args);
    }
    postRun();
  }
  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      if (!ABORT) doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;
function exit(status) {
  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;
  // exit the runtime
  exitRuntime();
  // TODO We should handle this differently based on environment.
  // In the browser, the best we can do is throw an exception
  // to halt execution, but in node we could process.exit and
  // I'd imagine SM shell would have something equivalent.
  // This would let us set a proper exit status (which
  // would be great for checking test exit statuses).
  // https://github.com/kripken/emscripten/issues/1371
  // throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;
function abort(text) {
  if (text) {
    Module.print(text);
    Module.printErr(text);
  }
  ABORT = true;
  EXITSTATUS = 1;
  throw 'abort() at ' + stackTrace();
}
Module['abort'] = Module.abort = abort;
// {{PRE_RUN_ADDITIONS}}
if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}
// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}
run();
// {{POST_RUN_ADDITIONS}}
// {{MODULE_ADDITIONS}}
//
/*! jQuery v1.7.1 jquery.com | jquery.org/license */
(function(a,b){function cy(a){return f.isWindow(a)?a:a.nodeType===9?a.defaultView||a.parentWindow:!1}function cv(a){if(!ck[a]){var b=c.body,d=f("<"+a+">").appendTo(b),e=d.css("display");d.remove();if(e==="none"||e===""){cl||(cl=c.createElement("iframe"),cl.frameBorder=cl.width=cl.height=0),b.appendChild(cl);if(!cm||!cl.createElement)cm=(cl.contentWindow||cl.contentDocument).document,cm.write((c.compatMode==="CSS1Compat"?"<!doctype html>":"")+"<html><body>"),cm.close();d=cm.createElement(a),cm.body.appendChild(d),e=f.css(d,"display"),b.removeChild(cl)}ck[a]=e}return ck[a]}function cu(a,b){var c={};f.each(cq.concat.apply([],cq.slice(0,b)),function(){c[this]=a});return c}function ct(){cr=b}function cs(){setTimeout(ct,0);return cr=f.now()}function cj(){try{return new a.ActiveXObject("Microsoft.XMLHTTP")}catch(b){}}function ci(){try{return new a.XMLHttpRequest}catch(b){}}function cc(a,c){a.dataFilter&&(c=a.dataFilter(c,a.dataType));var d=a.dataTypes,e={},g,h,i=d.length,j,k=d[0],l,m,n,o,p;for(g=1;g<i;g++){if(g===1)for(h in a.converters)typeof h=="string"&&(e[h.toLowerCase()]=a.converters[h]);l=k,k=d[g];if(k==="*")k=l;else if(l!=="*"&&l!==k){m=l+" "+k,n=e[m]||e["* "+k];if(!n){p=b;for(o in e){j=o.split(" ");if(j[0]===l||j[0]==="*"){p=e[j[1]+" "+k];if(p){o=e[o],o===!0?n=p:p===!0&&(n=o);break}}}}!n&&!p&&f.error("No conversion from "+m.replace(" "," to ")),n!==!0&&(c=n?n(c):p(o(c)))}}return c}function cb(a,c,d){var e=a.contents,f=a.dataTypes,g=a.responseFields,h,i,j,k;for(i in g)i in d&&(c[g[i]]=d[i]);while(f[0]==="*")f.shift(),h===b&&(h=a.mimeType||c.getResponseHeader("content-type"));if(h)for(i in e)if(e[i]&&e[i].test(h)){f.unshift(i);break}if(f[0]in d)j=f[0];else{for(i in d){if(!f[0]||a.converters[i+" "+f[0]]){j=i;break}k||(k=i)}j=j||k}if(j){j!==f[0]&&f.unshift(j);return d[j]}}function ca(a,b,c,d){if(f.isArray(b))f.each(b,function(b,e){c||bE.test(a)?d(a,e):ca(a+"["+(typeof e=="object"||f.isArray(e)?b:"")+"]",e,c,d)});else if(!c&&b!=null&&typeof b=="object")for(var e in b)ca(a+"["+e+"]",b[e],c,d);else d(a,b)}function b_(a,c){var d,e,g=f.ajaxSettings.flatOptions||{};for(d in c)c[d]!==b&&((g[d]?a:e||(e={}))[d]=c[d]);e&&f.extend(!0,a,e)}function b$(a,c,d,e,f,g){f=f||c.dataTypes[0],g=g||{},g[f]=!0;var h=a[f],i=0,j=h?h.length:0,k=a===bT,l;for(;i<j&&(k||!l);i++)l=h[i](c,d,e),typeof l=="string"&&(!k||g[l]?l=b:(c.dataTypes.unshift(l),l=b$(a,c,d,e,l,g)));(k||!l)&&!g["*"]&&(l=b$(a,c,d,e,"*",g));return l}function bZ(a){return function(b,c){typeof b!="string"&&(c=b,b="*");if(f.isFunction(c)){var d=b.toLowerCase().split(bP),e=0,g=d.length,h,i,j;for(;e<g;e++)h=d[e],j=/^\+/.test(h),j&&(h=h.substr(1)||"*"),i=a[h]=a[h]||[],i[j?"unshift":"push"](c)}}}function bC(a,b,c){var d=b==="width"?a.offsetWidth:a.offsetHeight,e=b==="width"?bx:by,g=0,h=e.length;if(d>0){if(c!=="border")for(;g<h;g++)c||(d-=parseFloat(f.css(a,"padding"+e[g]))||0),c==="margin"?d+=parseFloat(f.css(a,c+e[g]))||0:d-=parseFloat(f.css(a,"border"+e[g]+"Width"))||0;return d+"px"}d=bz(a,b,b);if(d<0||d==null)d=a.style[b]||0;d=parseFloat(d)||0;if(c)for(;g<h;g++)d+=parseFloat(f.css(a,"padding"+e[g]))||0,c!=="padding"&&(d+=parseFloat(f.css(a,"border"+e[g]+"Width"))||0),c==="margin"&&(d+=parseFloat(f.css(a,c+e[g]))||0);return d+"px"}function bp(a,b){b.src?f.ajax({url:b.src,async:!1,dataType:"script"}):f.globalEval((b.text||b.textContent||b.innerHTML||"").replace(bf,"/*$0*/")),b.parentNode&&b.parentNode.removeChild(b)}function bo(a){var b=c.createElement("div");bh.appendChild(b),b.innerHTML=a.outerHTML;return b.firstChild}function bn(a){var b=(a.nodeName||"").toLowerCase();b==="input"?bm(a):b!=="script"&&typeof a.getElementsByTagName!="undefined"&&f.grep(a.getElementsByTagName("input"),bm)}function bm(a){if(a.type==="checkbox"||a.type==="radio")a.defaultChecked=a.checked}function bl(a){return typeof a.getElementsByTagName!="undefined"?a.getElementsByTagName("*"):typeof a.querySelectorAll!="undefined"?a.querySelectorAll("*"):[]}function bk(a,b){var c;if(b.nodeType===1){b.clearAttributes&&b.clearAttributes(),b.mergeAttributes&&b.mergeAttributes(a),c=b.nodeName.toLowerCase();if(c==="object")b.outerHTML=a.outerHTML;else if(c!=="input"||a.type!=="checkbox"&&a.type!=="radio"){if(c==="option")b.selected=a.defaultSelected;else if(c==="input"||c==="textarea")b.defaultValue=a.defaultValue}else a.checked&&(b.defaultChecked=b.checked=a.checked),b.value!==a.value&&(b.value=a.value);b.removeAttribute(f.expando)}}function bj(a,b){if(b.nodeType===1&&!!f.hasData(a)){var c,d,e,g=f._data(a),h=f._data(b,g),i=g.events;if(i){delete h.handle,h.events={};for(c in i)for(d=0,e=i[c].length;d<e;d++)f.event.add(b,c+(i[c][d].namespace?".":"")+i[c][d].namespace,i[c][d],i[c][d].data)}h.data&&(h.data=f.extend({},h.data))}}function bi(a,b){return f.nodeName(a,"table")?a.getElementsByTagName("tbody")[0]||a.appendChild(a.ownerDocument.createElement("tbody")):a}function U(a){var b=V.split("|"),c=a.createDocumentFragment();if(c.createElement)while(b.length)c.createElement(b.pop());return c}function T(a,b,c){b=b||0;if(f.isFunction(b))return f.grep(a,function(a,d){var e=!!b.call(a,d,a);return e===c});if(b.nodeType)return f.grep(a,function(a,d){return a===b===c});if(typeof b=="string"){var d=f.grep(a,function(a){return a.nodeType===1});if(O.test(b))return f.filter(b,d,!c);b=f.filter(b,d)}return f.grep(a,function(a,d){return f.inArray(a,b)>=0===c})}function S(a){return!a||!a.parentNode||a.parentNode.nodeType===11}function K(){return!0}function J(){return!1}function n(a,b,c){var d=b+"defer",e=b+"queue",g=b+"mark",h=f._data(a,d);h&&(c==="queue"||!f._data(a,e))&&(c==="mark"||!f._data(a,g))&&setTimeout(function(){!f._data(a,e)&&!f._data(a,g)&&(f.removeData(a,d,!0),h.fire())},0)}function m(a){for(var b in a){if(b==="data"&&f.isEmptyObject(a[b]))continue;if(b!=="toJSON")return!1}return!0}function l(a,c,d){if(d===b&&a.nodeType===1){var e="data-"+c.replace(k,"-$1").toLowerCase();d=a.getAttribute(e);if(typeof d=="string"){try{d=d==="true"?!0:d==="false"?!1:d==="null"?null:f.isNumeric(d)?parseFloat(d):j.test(d)?f.parseJSON(d):d}catch(g){}f.data(a,c,d)}else d=b}return d}function h(a){var b=g[a]={},c,d;a=a.split(/\s+/);for(c=0,d=a.length;c<d;c++)b[a[c]]=!0;return b}var c=a.document,d=a.navigator,e=a.location,f=function(){function J(){if(!e.isReady){try{c.documentElement.doScroll("left")}catch(a){setTimeout(J,1);return}e.ready()}}var e=function(a,b){return new e.fn.init(a,b,h)},f=a.jQuery,g=a.$,h,i=/^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/,j=/\S/,k=/^\s+/,l=/\s+$/,m=/^<(\w+)\s*\/?>(?:<\/\1>)?$/,n=/^[\],:{}\s]*$/,o=/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,p=/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,q=/(?:^|:|,)(?:\s*\[)+/g,r=/(webkit)[ \/]([\w.]+)/,s=/(opera)(?:.*version)?[ \/]([\w.]+)/,t=/(msie) ([\w.]+)/,u=/(mozilla)(?:.*? rv:([\w.]+))?/,v=/-([a-z]|[0-9])/ig,w=/^-ms-/,x=function(a,b){return(b+"").toUpperCase()},y=d.userAgent,z,A,B,C=Object.prototype.toString,D=Object.prototype.hasOwnProperty,E=Array.prototype.push,F=Array.prototype.slice,G=String.prototype.trim,H=Array.prototype.indexOf,I={};e.fn=e.prototype={constructor:e,init:function(a,d,f){var g,h,j,k;if(!a)return this;if(a.nodeType){this.context=this[0]=a,this.length=1;return this}if(a==="body"&&!d&&c.body){this.context=c,this[0]=c.body,this.selector=a,this.length=1;return this}if(typeof a=="string"){a.charAt(0)!=="<"||a.charAt(a.length-1)!==">"||a.length<3?g=i.exec(a):g=[null,a,null];if(g&&(g[1]||!d)){if(g[1]){d=d instanceof e?d[0]:d,k=d?d.ownerDocument||d:c,j=m.exec(a),j?e.isPlainObject(d)?(a=[c.createElement(j[1])],e.fn.attr.call(a,d,!0)):a=[k.createElement(j[1])]:(j=e.buildFragment([g[1]],[k]),a=(j.cacheable?e.clone(j.fragment):j.fragment).childNodes);return e.merge(this,a)}h=c.getElementById(g[2]);if(h&&h.parentNode){if(h.id!==g[2])return f.find(a);this.length=1,this[0]=h}this.context=c,this.selector=a;return this}return!d||d.jquery?(d||f).find(a):this.constructor(d).find(a)}if(e.isFunction(a))return f.ready(a);a.selector!==b&&(this.selector=a.selector,this.context=a.context);return e.makeArray(a,this)},selector:"",jquery:"1.7.1",length:0,size:function(){return this.length},toArray:function(){return F.call(this,0)},get:function(a){return a==null?this.toArray():a<0?this[this.length+a]:this[a]},pushStack:function(a,b,c){var d=this.constructor();e.isArray(a)?E.apply(d,a):e.merge(d,a),d.prevObject=this,d.context=this.context,b==="find"?d.selector=this.selector+(this.selector?" ":"")+c:b&&(d.selector=this.selector+"."+b+"("+c+")");return d},each:function(a,b){return e.each(this,a,b)},ready:function(a){e.bindReady(),A.add(a);return this},eq:function(a){a=+a;return a===-1?this.slice(a):this.slice(a,a+1)},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},slice:function(){return this.pushStack(F.apply(this,arguments),"slice",F.call(arguments).join(","))},map:function(a){return this.pushStack(e.map(this,function(b,c){return a.call(b,c,b)}))},end:function(){return this.prevObject||this.constructor(null)},push:E,sort:[].sort,splice:[].splice},e.fn.init.prototype=e.fn,e.extend=e.fn.extend=function(){var a,c,d,f,g,h,i=arguments[0]||{},j=1,k=arguments.length,l=!1;typeof i=="boolean"&&(l=i,i=arguments[1]||{},j=2),typeof i!="object"&&!e.isFunction(i)&&(i={}),k===j&&(i=this,--j);for(;j<k;j++)if((a=arguments[j])!=null)for(c in a){d=i[c],f=a[c];if(i===f)continue;l&&f&&(e.isPlainObject(f)||(g=e.isArray(f)))?(g?(g=!1,h=d&&e.isArray(d)?d:[]):h=d&&e.isPlainObject(d)?d:{},i[c]=e.extend(l,h,f)):f!==b&&(i[c]=f)}return i},e.extend({noConflict:function(b){a.$===e&&(a.$=g),b&&a.jQuery===e&&(a.jQuery=f);return e},isReady:!1,readyWait:1,holdReady:function(a){a?e.readyWait++:e.ready(!0)},ready:function(a){if(a===!0&&!--e.readyWait||a!==!0&&!e.isReady){if(!c.body)return setTimeout(e.ready,1);e.isReady=!0;if(a!==!0&&--e.readyWait>0)return;A.fireWith(c,[e]),e.fn.trigger&&e(c).trigger("ready").off("ready")}},bindReady:function(){if(!A){A=e.Callbacks("once memory");if(c.readyState==="complete")return setTimeout(e.ready,1);if(c.addEventListener)c.addEventListener("DOMContentLoaded",B,!1),a.addEventListener("load",e.ready,!1);else if(c.attachEvent){c.attachEvent("onreadystatechange",B),a.attachEvent("onload",e.ready);var b=!1;try{b=a.frameElement==null}catch(d){}c.documentElement.doScroll&&b&&J()}}},isFunction:function(a){return e.type(a)==="function"},isArray:Array.isArray||function(a){return e.type(a)==="array"},isWindow:function(a){return a&&typeof a=="object"&&"setInterval"in a},isNumeric:function(a){return!isNaN(parseFloat(a))&&isFinite(a)},type:function(a){return a==null?String(a):I[C.call(a)]||"object"},isPlainObject:function(a){if(!a||e.type(a)!=="object"||a.nodeType||e.isWindow(a))return!1;try{if(a.constructor&&!D.call(a,"constructor")&&!D.call(a.constructor.prototype,"isPrototypeOf"))return!1}catch(c){return!1}var d;for(d in a);return d===b||D.call(a,d)},isEmptyObject:function(a){for(var b in a)return!1;return!0},error:function(a){throw new Error(a)},parseJSON:function(b){if(typeof b!="string"||!b)return null;b=e.trim(b);if(a.JSON&&a.JSON.parse)return a.JSON.parse(b);if(n.test(b.replace(o,"@").replace(p,"]").replace(q,"")))return(new Function("return "+b))();e.error("Invalid JSON: "+b)},parseXML:function(c){var d,f;try{a.DOMParser?(f=new DOMParser,d=f.parseFromString(c,"text/xml")):(d=new ActiveXObject("Microsoft.XMLDOM"),d.async="false",d.loadXML(c))}catch(g){d=b}(!d||!d.documentElement||d.getElementsByTagName("parsererror").length)&&e.error("Invalid XML: "+c);return d},noop:function(){},globalEval:function(b){b&&j.test(b)&&(a.execScript||function(b){a.eval.call(a,b)})(b)},camelCase:function(a){return a.replace(w,"ms-").replace(v,x)},nodeName:function(a,b){return a.nodeName&&a.nodeName.toUpperCase()===b.toUpperCase()},each:function(a,c,d){var f,g=0,h=a.length,i=h===b||e.isFunction(a);if(d){if(i){for(f in a)if(c.apply(a[f],d)===!1)break}else for(;g<h;)if(c.apply(a[g++],d)===!1)break}else if(i){for(f in a)if(c.call(a[f],f,a[f])===!1)break}else for(;g<h;)if(c.call(a[g],g,a[g++])===!1)break;return a},trim:G?function(a){return a==null?"":G.call(a)}:function(a){return a==null?"":(a+"").replace(k,"").replace(l,"")},makeArray:function(a,b){var c=b||[];if(a!=null){var d=e.type(a);a.length==null||d==="string"||d==="function"||d==="regexp"||e.isWindow(a)?E.call(c,a):e.merge(c,a)}return c},inArray:function(a,b,c){var d;if(b){if(H)return H.call(b,a,c);d=b.length,c=c?c<0?Math.max(0,d+c):c:0;for(;c<d;c++)if(c in b&&b[c]===a)return c}return-1},merge:function(a,c){var d=a.length,e=0;if(typeof c.length=="number")for(var f=c.length;e<f;e++)a[d++]=c[e];else while(c[e]!==b)a[d++]=c[e++];a.length=d;return a},grep:function(a,b,c){var d=[],e;c=!!c;for(var f=0,g=a.length;f<g;f++)e=!!b(a[f],f),c!==e&&d.push(a[f]);return d},map:function(a,c,d){var f,g,h=[],i=0,j=a.length,k=a instanceof e||j!==b&&typeof j=="number"&&(j>0&&a[0]&&a[j-1]||j===0||e.isArray(a));if(k)for(;i<j;i++)f=c(a[i],i,d),f!=null&&(h[h.length]=f);else for(g in a)f=c(a[g],g,d),f!=null&&(h[h.length]=f);return h.concat.apply([],h)},guid:1,proxy:function(a,c){if(typeof c=="string"){var d=a[c];c=a,a=d}if(!e.isFunction(a))return b;var f=F.call(arguments,2),g=function(){return a.apply(c,f.concat(F.call(arguments)))};g.guid=a.guid=a.guid||g.guid||e.guid++;return g},access:function(a,c,d,f,g,h){var i=a.length;if(typeof c=="object"){for(var j in c)e.access(a,j,c[j],f,g,d);return a}if(d!==b){f=!h&&f&&e.isFunction(d);for(var k=0;k<i;k++)g(a[k],c,f?d.call(a[k],k,g(a[k],c)):d,h);return a}return i?g(a[0],c):b},now:function(){return(new Date).getTime()},uaMatch:function(a){a=a.toLowerCase();var b=r.exec(a)||s.exec(a)||t.exec(a)||a.indexOf("compatible")<0&&u.exec(a)||[];return{browser:b[1]||"",version:b[2]||"0"}},sub:function(){function a(b,c){return new a.fn.init(b,c)}e.extend(!0,a,this),a.superclass=this,a.fn=a.prototype=this(),a.fn.constructor=a,a.sub=this.sub,a.fn.init=function(d,f){f&&f instanceof e&&!(f instanceof a)&&(f=a(f));return e.fn.init.call(this,d,f,b)},a.fn.init.prototype=a.fn;var b=a(c);return a},browser:{}}),e.each("Boolean Number String Function Array Date RegExp Object".split(" "),function(a,b){I["[object "+b+"]"]=b.toLowerCase()}),z=e.uaMatch(y),z.browser&&(e.browser[z.browser]=!0,e.browser.version=z.version),e.browser.webkit&&(e.browser.safari=!0),j.test(" ")&&(k=/^[\s\xA0]+/,l=/[\s\xA0]+$/),h=e(c),c.addEventListener?B=function(){c.removeEventListener("DOMContentLoaded",B,!1),e.ready()}:c.attachEvent&&(B=function(){c.readyState==="complete"&&(c.detachEvent("onreadystatechange",B),e.ready())});return e}(),g={};f.Callbacks=function(a){a=a?g[a]||h(a):{};var c=[],d=[],e,i,j,k,l,m=function(b){var d,e,g,h,i;for(d=0,e=b.length;d<e;d++)g=b[d],h=f.type(g),h==="array"?m(g):h==="function"&&(!a.unique||!o.has(g))&&c.push(g)},n=function(b,f){f=f||[],e=!a.memory||[b,f],i=!0,l=j||0,j=0,k=c.length;for(;c&&l<k;l++)if(c[l].apply(b,f)===!1&&a.stopOnFalse){e=!0;break}i=!1,c&&(a.once?e===!0?o.disable():c=[]:d&&d.length&&(e=d.shift(),o.fireWith(e[0],e[1])))},o={add:function(){if(c){var a=c.length;m(arguments),i?k=c.length:e&&e!==!0&&(j=a,n(e[0],e[1]))}return this},remove:function(){if(c){var b=arguments,d=0,e=b.length;for(;d<e;d++)for(var f=0;f<c.length;f++)if(b[d]===c[f]){i&&f<=k&&(k--,f<=l&&l--),c.splice(f--,1);if(a.unique)break}}return this},has:function(a){if(c){var b=0,d=c.length;for(;b<d;b++)if(a===c[b])return!0}return!1},empty:function(){c=[];return this},disable:function(){c=d=e=b;return this},disabled:function(){return!c},lock:function(){d=b,(!e||e===!0)&&o.disable();return this},locked:function(){return!d},fireWith:function(b,c){d&&(i?a.once||d.push([b,c]):(!a.once||!e)&&n(b,c));return this},fire:function(){o.fireWith(this,arguments);return this},fired:function(){return!!e}};return o};var i=[].slice;f.extend({Deferred:function(a){var b=f.Callbacks("once memory"),c=f.Callbacks("once memory"),d=f.Callbacks("memory"),e="pending",g={resolve:b,reject:c,notify:d},h={done:b.add,fail:c.add,progress:d.add,state:function(){return e},isResolved:b.fired,isRejected:c.fired,then:function(a,b,c){i.done(a).fail(b).progress(c);return this},always:function(){i.done.apply(i,arguments).fail.apply(i,arguments);return this},pipe:function(a,b,c){return f.Deferred(function(d){f.each({done:[a,"resolve"],fail:[b,"reject"],progress:[c,"notify"]},function(a,b){var c=b[0],e=b[1],g;f.isFunction(c)?i[a](function(){g=c.apply(this,arguments),g&&f.isFunction(g.promise)?g.promise().then(d.resolve,d.reject,d.notify):d[e+"With"](this===i?d:this,[g])}):i[a](d[e])})}).promise()},promise:function(a){if(a==null)a=h;else for(var b in h)a[b]=h[b];return a}},i=h.promise({}),j;for(j in g)i[j]=g[j].fire,i[j+"With"]=g[j].fireWith;i.done(function(){e="resolved"},c.disable,d.lock).fail(function(){e="rejected"},b.disable,d.lock),a&&a.call(i,i);return i},when:function(a){function m(a){return function(b){e[a]=arguments.length>1?i.call(arguments,0):b,j.notifyWith(k,e)}}function l(a){return function(c){b[a]=arguments.length>1?i.call(arguments,0):c,--g||j.resolveWith(j,b)}}var b=i.call(arguments,0),c=0,d=b.length,e=Array(d),g=d,h=d,j=d<=1&&a&&f.isFunction(a.promise)?a:f.Deferred(),k=j.promise();if(d>1){for(;c<d;c++)b[c]&&b[c].promise&&f.isFunction(b[c].promise)?b[c].promise().then(l(c),j.reject,m(c)):--g;g||j.resolveWith(j,b)}else j!==a&&j.resolveWith(j,d?[a]:[]);return k}}),f.support=function(){var b,d,e,g,h,i,j,k,l,m,n,o,p,q=c.createElement("div"),r=c.documentElement;q.setAttribute("className","t"),q.innerHTML="   <link/><table></table><a href='/a' style='top:1px;float:left;opacity:.55;'>a</a><input type='checkbox'/>",d=q.getElementsByTagName("*"),e=q.getElementsByTagName("a")[0];if(!d||!d.length||!e)return{};g=c.createElement("select"),h=g.appendChild(c.createElement("option")),i=q.getElementsByTagName("input")[0],b={leadingWhitespace:q.firstChild.nodeType===3,tbody:!q.getElementsByTagName("tbody").length,htmlSerialize:!!q.getElementsByTagName("link").length,style:/top/.test(e.getAttribute("style")),hrefNormalized:e.getAttribute("href")==="/a",opacity:/^0.55/.test(e.style.opacity),cssFloat:!!e.style.cssFloat,checkOn:i.value==="on",optSelected:h.selected,getSetAttribute:q.className!=="t",enctype:!!c.createElement("form").enctype,html5Clone:c.createElement("nav").cloneNode(!0).outerHTML!=="<:nav></:nav>",submitBubbles:!0,changeBubbles:!0,focusinBubbles:!1,deleteExpando:!0,noCloneEvent:!0,inlineBlockNeedsLayout:!1,shrinkWrapBlocks:!1,reliableMarginRight:!0},i.checked=!0,b.noCloneChecked=i.cloneNode(!0).checked,g.disabled=!0,b.optDisabled=!h.disabled;try{delete q.test}catch(s){b.deleteExpando=!1}!q.addEventListener&&q.attachEvent&&q.fireEvent&&(q.attachEvent("onclick",function(){b.noCloneEvent=!1}),q.cloneNode(!0).fireEvent("onclick")),i=c.createElement("input"),i.value="t",i.setAttribute("type","radio"),b.radioValue=i.value==="t",i.setAttribute("checked","checked"),q.appendChild(i),k=c.createDocumentFragment(),k.appendChild(q.lastChild),b.checkClone=k.cloneNode(!0).cloneNode(!0).lastChild.checked,b.appendChecked=i.checked,k.removeChild(i),k.appendChild(q),q.innerHTML="",a.getComputedStyle&&(j=c.createElement("div"),j.style.width="0",j.style.marginRight="0",q.style.width="2px",q.appendChild(j),b.reliableMarginRight=(parseInt((a.getComputedStyle(j,null)||{marginRight:0}).marginRight,10)||0)===0);if(q.attachEvent)for(o in{submit:1,change:1,focusin:1})n="on"+o,p=n in q,p||(q.setAttribute(n,"return;"),p=typeof q[n]=="function"),b[o+"Bubbles"]=p;k.removeChild(q),k=g=h=j=q=i=null,f(function(){var a,d,e,g,h,i,j,k,m,n,o,r=c.getElementsByTagName("body")[0];!r||(j=1,k="position:absolute;top:0;left:0;width:1px;height:1px;margin:0;",m="visibility:hidden;border:0;",n="style='"+k+"border:5px solid #000;padding:0;'",o="<div "+n+"><div></div></div>"+"<table "+n+" cellpadding='0' cellspacing='0'>"+"<tr><td></td></tr></table>",a=c.createElement("div"),a.style.cssText=m+"width:0;height:0;position:static;top:0;margin-top:"+j+"px",r.insertBefore(a,r.firstChild),q=c.createElement("div"),a.appendChild(q),q.innerHTML="<table><tr><td style='padding:0;border:0;display:none'></td><td>t</td></tr></table>",l=q.getElementsByTagName("td"),p=l[0].offsetHeight===0,l[0].style.display="",l[1].style.display="none",b.reliableHiddenOffsets=p&&l[0].offsetHeight===0,q.innerHTML="",q.style.width=q.style.paddingLeft="1px",f.boxModel=b.boxModel=q.offsetWidth===2,typeof q.style.zoom!="undefined"&&(q.style.display="inline",q.style.zoom=1,b.inlineBlockNeedsLayout=q.offsetWidth===2,q.style.display="",q.innerHTML="<div style='width:4px;'></div>",b.shrinkWrapBlocks=q.offsetWidth!==2),q.style.cssText=k+m,q.innerHTML=o,d=q.firstChild,e=d.firstChild,h=d.nextSibling.firstChild.firstChild,i={doesNotAddBorder:e.offsetTop!==5,doesAddBorderForTableAndCells:h.offsetTop===5},e.style.position="fixed",e.style.top="20px",i.fixedPosition=e.offsetTop===20||e.offsetTop===15,e.style.position=e.style.top="",d.style.overflow="hidden",d.style.position="relative",i.subtractsBorderForOverflowNotVisible=e.offsetTop===-5,i.doesNotIncludeMarginInBodyOffset=r.offsetTop!==j,r.removeChild(a),q=a=null,f.extend(b,i))});return b}();var j=/^(?:\{.*\}|\[.*\])$/,k=/([A-Z])/g;f.extend({cache:{},uuid:0,expando:"jQuery"+(f.fn.jquery+Math.random()).replace(/\D/g,""),noData:{embed:!0,object:"clsid:D27CDB6E-AE6D-11cf-96B8-444553540000",applet:!0},hasData:function(a){a=a.nodeType?f.cache[a[f.expando]]:a[f.expando];return!!a&&!m(a)},data:function(a,c,d,e){if(!!f.acceptData(a)){var g,h,i,j=f.expando,k=typeof c=="string",l=a.nodeType,m=l?f.cache:a,n=l?a[j]:a[j]&&j,o=c==="events";if((!n||!m[n]||!o&&!e&&!m[n].data)&&k&&d===b)return;n||(l?a[j]=n=++f.uuid:n=j),m[n]||(m[n]={},l||(m[n].toJSON=f.noop));if(typeof c=="object"||typeof c=="function")e?m[n]=f.extend(m[n],c):m[n].data=f.extend(m[n].data,c);g=h=m[n],e||(h.data||(h.data={}),h=h.data),d!==b&&(h[f.camelCase(c)]=d);if(o&&!h[c])return g.events;k?(i=h[c],i==null&&(i=h[f.camelCase(c)])):i=h;return i}},removeData:function(a,b,c){if(!!f.acceptData(a)){var d,e,g,h=f.expando,i=a.nodeType,j=i?f.cache:a,k=i?a[h]:h;if(!j[k])return;if(b){d=c?j[k]:j[k].data;if(d){f.isArray(b)||(b in d?b=[b]:(b=f.camelCase(b),b in d?b=[b]:b=b.split(" ")));for(e=0,g=b.length;e<g;e++)delete d[b[e]];if(!(c?m:f.isEmptyObject)(d))return}}if(!c){delete j[k].data;if(!m(j[k]))return}f.support.deleteExpando||!j.setInterval?delete j[k]:j[k]=null,i&&(f.support.deleteExpando?delete a[h]:a.removeAttribute?a.removeAttribute(h):a[h]=null)}},_data:function(a,b,c){return f.data(a,b,c,!0)},acceptData:function(a){if(a.nodeName){var b=f.noData[a.nodeName.toLowerCase()];if(b)return b!==!0&&a.getAttribute("classid")===b}return!0}}),f.fn.extend({data:function(a,c){var d,e,g,h=null;if(typeof a=="undefined"){if(this.length){h=f.data(this[0]);if(this[0].nodeType===1&&!f._data(this[0],"parsedAttrs")){e=this[0].attributes;for(var i=0,j=e.length;i<j;i++)g=e[i].name,g.indexOf("data-")===0&&(g=f.camelCase(g.substring(5)),l(this[0],g,h[g]));f._data(this[0],"parsedAttrs",!0)}}return h}if(typeof a=="object")return this.each(function(){f.data(this,a)});d=a.split("."),d[1]=d[1]?"."+d[1]:"";if(c===b){h=this.triggerHandler("getData"+d[1]+"!",[d[0]]),h===b&&this.length&&(h=f.data(this[0],a),h=l(this[0],a,h));return h===b&&d[1]?this.data(d[0]):h}return this.each(function(){var b=f(this),e=[d[0],c];b.triggerHandler("setData"+d[1]+"!",e),f.data(this,a,c),b.triggerHandler("changeData"+d[1]+"!",e)})},removeData:function(a){return this.each(function(){f.removeData(this,a)})}}),f.extend({_mark:function(a,b){a&&(b=(b||"fx")+"mark",f._data(a,b,(f._data(a,b)||0)+1))},_unmark:function(a,b,c){a!==!0&&(c=b,b=a,a=!1);if(b){c=c||"fx";var d=c+"mark",e=a?0:(f._data(b,d)||1)-1;e?f._data(b,d,e):(f.removeData(b,d,!0),n(b,c,"mark"))}},queue:function(a,b,c){var d;if(a){b=(b||"fx")+"queue",d=f._data(a,b),c&&(!d||f.isArray(c)?d=f._data(a,b,f.makeArray(c)):d.push(c));return d||[]}},dequeue:function(a,b){b=b||"fx";var c=f.queue(a,b),d=c.shift(),e={};d==="inprogress"&&(d=c.shift()),d&&(b==="fx"&&c.unshift("inprogress"),f._data(a,b+".run",e),d.call(a,function(){f.dequeue(a,b)},e)),c.length||(f.removeData(a,b+"queue "+b+".run",!0),n(a,b,"queue"))}}),f.fn.extend({queue:function(a,c){typeof a!="string"&&(c=a,a="fx");if(c===b)return f.queue(this[0],a);return this.each(function(){var b=f.queue(this,a,c);a==="fx"&&b[0]!=="inprogress"&&f.dequeue(this,a)})},dequeue:function(a){return this.each(function(){f.dequeue(this,a)})},delay:function(a,b){a=f.fx?f.fx.speeds[a]||a:a,b=b||"fx";return this.queue(b,function(b,c){var d=setTimeout(b,a);c.stop=function(){clearTimeout(d)}})},clearQueue:function(a){return this.queue(a||"fx",[])},promise:function(a,c){function m(){--h||d.resolveWith(e,[e])}typeof a!="string"&&(c=a,a=b),a=a||"fx";var d=f.Deferred(),e=this,g=e.length,h=1,i=a+"defer",j=a+"queue",k=a+"mark",l;while(g--)if(l=f.data(e[g],i,b,!0)||(f.data(e[g],j,b,!0)||f.data(e[g],k,b,!0))&&f.data(e[g],i,f.Callbacks("once memory"),!0))h++,l.add(m);m();return d.promise()}});var o=/[\n\t\r]/g,p=/\s+/,q=/\r/g,r=/^(?:button|input)$/i,s=/^(?:button|input|object|select|textarea)$/i,t=/^a(?:rea)?$/i,u=/^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i,v=f.support.getSetAttribute,w,x,y;f.fn.extend({attr:function(a,b){return f.access(this,a,b,!0,f.attr)},removeAttr:function(a){return this.each(function(){f.removeAttr(this,a)})},prop:function(a,b){return f.access(this,a,b,!0,f.prop)},removeProp:function(a){a=f.propFix[a]||a;return this.each(function(){try{this[a]=b,delete this[a]}catch(c){}})},addClass:function(a){var b,c,d,e,g,h,i;if(f.isFunction(a))return this.each(function(b){f(this).addClass(a.call(this,b,this.className))});if(a&&typeof a=="string"){b=a.split(p);for(c=0,d=this.length;c<d;c++){e=this[c];if(e.nodeType===1)if(!e.className&&b.length===1)e.className=a;else{g=" "+e.className+" ";for(h=0,i=b.length;h<i;h++)~g.indexOf(" "+b[h]+" ")||(g+=b[h]+" ");e.className=f.trim(g)}}}return this},removeClass:function(a){var c,d,e,g,h,i,j;if(f.isFunction(a))return this.each(function(b){f(this).removeClass(a.call(this,b,this.className))});if(a&&typeof a=="string"||a===b){c=(a||"").split(p);for(d=0,e=this.length;d<e;d++){g=this[d];if(g.nodeType===1&&g.className)if(a){h=(" "+g.className+" ").replace(o," ");for(i=0,j=c.length;i<j;i++)h=h.replace(" "+c[i]+" "," ");g.className=f.trim(h)}else g.className=""}}return this},toggleClass:function(a,b){var c=typeof a,d=typeof b=="boolean";if(f.isFunction(a))return this.each(function(c){f(this).toggleClass(a.call(this,c,this.className,b),b)});return this.each(function(){if(c==="string"){var e,g=0,h=f(this),i=b,j=a.split(p);while(e=j[g++])i=d?i:!h.hasClass(e),h[i?"addClass":"removeClass"](e)}else if(c==="undefined"||c==="boolean")this.className&&f._data(this,"__className__",this.className),this.className=this.className||a===!1?"":f._data(this,"__className__")||""})},hasClass:function(a){var b=" "+a+" ",c=0,d=this.length;for(;c<d;c++)if(this[c].nodeType===1&&(" "+this[c].className+" ").replace(o," ").indexOf(b)>-1)return!0;return!1},val:function(a){var c,d,e,g=this[0];{if(!!arguments.length){e=f.isFunction(a);return this.each(function(d){var g=f(this),h;if(this.nodeType===1){e?h=a.call(this,d,g.val()):h=a,h==null?h="":typeof h=="number"?h+="":f.isArray(h)&&(h=f.map(h,function(a){return a==null?"":a+""})),c=f.valHooks[this.nodeName.toLowerCase()]||f.valHooks[this.type];if(!c||!("set"in c)||c.set(this,h,"value")===b)this.value=h}})}if(g){c=f.valHooks[g.nodeName.toLowerCase()]||f.valHooks[g.type];if(c&&"get"in c&&(d=c.get(g,"value"))!==b)return d;d=g.value;return typeof d=="string"?d.replace(q,""):d==null?"":d}}}}),f.extend({valHooks:{option:{get:function(a){var b=a.attributes.value;return!b||b.specified?a.value:a.text}},select:{get:function(a){var b,c,d,e,g=a.selectedIndex,h=[],i=a.options,j=a.type==="select-one";if(g<0)return null;c=j?g:0,d=j?g+1:i.length;for(;c<d;c++){e=i[c];if(e.selected&&(f.support.optDisabled?!e.disabled:e.getAttribute("disabled")===null)&&(!e.parentNode.disabled||!f.nodeName(e.parentNode,"optgroup"))){b=f(e).val();if(j)return b;h.push(b)}}if(j&&!h.length&&i.length)return f(i[g]).val();return h},set:function(a,b){var c=f.makeArray(b);f(a).find("option").each(function(){this.selected=f.inArray(f(this).val(),c)>=0}),c.length||(a.selectedIndex=-1);return c}}},attrFn:{val:!0,css:!0,html:!0,text:!0,data:!0,width:!0,height:!0,offset:!0},attr:function(a,c,d,e){var g,h,i,j=a.nodeType;if(!!a&&j!==3&&j!==8&&j!==2){if(e&&c in f.attrFn)return f(a)[c](d);if(typeof a.getAttribute=="undefined")return f.prop(a,c,d);i=j!==1||!f.isXMLDoc(a),i&&(c=c.toLowerCase(),h=f.attrHooks[c]||(u.test(c)?x:w));if(d!==b){if(d===null){f.removeAttr(a,c);return}if(h&&"set"in h&&i&&(g=h.set(a,d,c))!==b)return g;a.setAttribute(c,""+d);return d}if(h&&"get"in h&&i&&(g=h.get(a,c))!==null)return g;g=a.getAttribute(c);return g===null?b:g}},removeAttr:function(a,b){var c,d,e,g,h=0;if(b&&a.nodeType===1){d=b.toLowerCase().split(p),g=d.length;for(;h<g;h++)e=d[h],e&&(c=f.propFix[e]||e,f.attr(a,e,""),a.removeAttribute(v?e:c),u.test(e)&&c in a&&(a[c]=!1))}},attrHooks:{type:{set:function(a,b){if(r.test(a.nodeName)&&a.parentNode)f.error("type property can't be changed");else if(!f.support.radioValue&&b==="radio"&&f.nodeName(a,"input")){var c=a.value;a.setAttribute("type",b),c&&(a.value=c);return b}}},value:{get:function(a,b){if(w&&f.nodeName(a,"button"))return w.get(a,b);return b in a?a.value:null},set:function(a,b,c){if(w&&f.nodeName(a,"button"))return w.set(a,b,c);a.value=b}}},propFix:{tabindex:"tabIndex",readonly:"readOnly","for":"htmlFor","class":"className",maxlength:"maxLength",cellspacing:"cellSpacing",cellpadding:"cellPadding",rowspan:"rowSpan",colspan:"colSpan",usemap:"useMap",frameborder:"frameBorder",contenteditable:"contentEditable"},prop:function(a,c,d){var e,g,h,i=a.nodeType;if(!!a&&i!==3&&i!==8&&i!==2){h=i!==1||!f.isXMLDoc(a),h&&(c=f.propFix[c]||c,g=f.propHooks[c]);return d!==b?g&&"set"in g&&(e=g.set(a,d,c))!==b?e:a[c]=d:g&&"get"in g&&(e=g.get(a,c))!==null?e:a[c]}},propHooks:{tabIndex:{get:function(a){var c=a.getAttributeNode("tabindex");return c&&c.specified?parseInt(c.value,10):s.test(a.nodeName)||t.test(a.nodeName)&&a.href?0:b}}}}),f.attrHooks.tabindex=f.propHooks.tabIndex,x={get:function(a,c){var d,e=f.prop(a,c);return e===!0||typeof e!="boolean"&&(d=a.getAttributeNode(c))&&d.nodeValue!==!1?c.toLowerCase():b},set:function(a,b,c){var d;b===!1?f.removeAttr(a,c):(d=f.propFix[c]||c,d in a&&(a[d]=!0),a.setAttribute(c,c.toLowerCase()));return c}},v||(y={name:!0,id:!0},w=f.valHooks.button={get:function(a,c){var d;d=a.getAttributeNode(c);return d&&(y[c]?d.nodeValue!=="":d.specified)?d.nodeValue:b},set:function(a,b,d){var e=a.getAttributeNode(d);e||(e=c.createAttribute(d),a.setAttributeNode(e));return e.nodeValue=b+""}},f.attrHooks.tabindex.set=w.set,f.each(["width","height"],function(a,b){f.attrHooks[b]=f.extend(f.attrHooks[b],{set:function(a,c){if(c===""){a.setAttribute(b,"auto");return c}}})}),f.attrHooks.contenteditable={get:w.get,set:function(a,b,c){b===""&&(b="false"),w.set(a,b,c)}}),f.support.hrefNormalized||f.each(["href","src","width","height"],function(a,c){f.attrHooks[c]=f.extend(f.attrHooks[c],{get:function(a){var d=a.getAttribute(c,2);return d===null?b:d}})}),f.support.style||(f.attrHooks.style={get:function(a){return a.style.cssText.toLowerCase()||b},set:function(a,b){return a.style.cssText=""+b}}),f.support.optSelected||(f.propHooks.selected=f.extend(f.propHooks.selected,{get:function(a){var b=a.parentNode;b&&(b.selectedIndex,b.parentNode&&b.parentNode.selectedIndex);return null}})),f.support.enctype||(f.propFix.enctype="encoding"),f.support.checkOn||f.each(["radio","checkbox"],function(){f.valHooks[this]={get:function(a){return a.getAttribute("value")===null?"on":a.value}}}),f.each(["radio","checkbox"],function(){f.valHooks[this]=f.extend(f.valHooks[this],{set:function(a,b){if(f.isArray(b))return a.checked=f.inArray(f(a).val(),b)>=0}})});var z=/^(?:textarea|input|select)$/i,A=/^([^\.]*)?(?:\.(.+))?$/,B=/\bhover(\.\S+)?\b/,C=/^key/,D=/^(?:mouse|contextmenu)|click/,E=/^(?:focusinfocus|focusoutblur)$/,F=/^(\w*)(?:#([\w\-]+))?(?:\.([\w\-]+))?$/,G=function(a){var b=F.exec(a);b&&(b[1]=(b[1]||"").toLowerCase(),b[3]=b[3]&&new RegExp("(?:^|\\s)"+b[3]+"(?:\\s|$)"));return b},H=function(a,b){var c=a.attributes||{};return(!b[1]||a.nodeName.toLowerCase()===b[1])&&(!b[2]||(c.id||{}).value===b[2])&&(!b[3]||b[3].test((c["class"]||{}).value))},I=function(a){return f.event.special.hover?a:a.replace(B,"mouseenter$1 mouseleave$1")};
f.event={add:function(a,c,d,e,g){var h,i,j,k,l,m,n,o,p,q,r,s;if(!(a.nodeType===3||a.nodeType===8||!c||!d||!(h=f._data(a)))){d.handler&&(p=d,d=p.handler),d.guid||(d.guid=f.guid++),j=h.events,j||(h.events=j={}),i=h.handle,i||(h.handle=i=function(a){return typeof f!="undefined"&&(!a||f.event.triggered!==a.type)?f.event.dispatch.apply(i.elem,arguments):b},i.elem=a),c=f.trim(I(c)).split(" ");for(k=0;k<c.length;k++){l=A.exec(c[k])||[],m=l[1],n=(l[2]||"").split(".").sort(),s=f.event.special[m]||{},m=(g?s.delegateType:s.bindType)||m,s=f.event.special[m]||{},o=f.extend({type:m,origType:l[1],data:e,handler:d,guid:d.guid,selector:g,quick:G(g),namespace:n.join(".")},p),r=j[m];if(!r){r=j[m]=[],r.delegateCount=0;if(!s.setup||s.setup.call(a,e,n,i)===!1)a.addEventListener?a.addEventListener(m,i,!1):a.attachEvent&&a.attachEvent("on"+m,i)}s.add&&(s.add.call(a,o),o.handler.guid||(o.handler.guid=d.guid)),g?r.splice(r.delegateCount++,0,o):r.push(o),f.event.global[m]=!0}a=null}},global:{},remove:function(a,b,c,d,e){var g=f.hasData(a)&&f._data(a),h,i,j,k,l,m,n,o,p,q,r,s;if(!!g&&!!(o=g.events)){b=f.trim(I(b||"")).split(" ");for(h=0;h<b.length;h++){i=A.exec(b[h])||[],j=k=i[1],l=i[2];if(!j){for(j in o)f.event.remove(a,j+b[h],c,d,!0);continue}p=f.event.special[j]||{},j=(d?p.delegateType:p.bindType)||j,r=o[j]||[],m=r.length,l=l?new RegExp("(^|\\.)"+l.split(".").sort().join("\\.(?:.*\\.)?")+"(\\.|$)"):null;for(n=0;n<r.length;n++)s=r[n],(e||k===s.origType)&&(!c||c.guid===s.guid)&&(!l||l.test(s.namespace))&&(!d||d===s.selector||d==="**"&&s.selector)&&(r.splice(n--,1),s.selector&&r.delegateCount--,p.remove&&p.remove.call(a,s));r.length===0&&m!==r.length&&((!p.teardown||p.teardown.call(a,l)===!1)&&f.removeEvent(a,j,g.handle),delete o[j])}f.isEmptyObject(o)&&(q=g.handle,q&&(q.elem=null),f.removeData(a,["events","handle"],!0))}},customEvent:{getData:!0,setData:!0,changeData:!0},trigger:function(c,d,e,g){if(!e||e.nodeType!==3&&e.nodeType!==8){var h=c.type||c,i=[],j,k,l,m,n,o,p,q,r,s;if(E.test(h+f.event.triggered))return;h.indexOf("!")>=0&&(h=h.slice(0,-1),k=!0),h.indexOf(".")>=0&&(i=h.split("."),h=i.shift(),i.sort());if((!e||f.event.customEvent[h])&&!f.event.global[h])return;c=typeof c=="object"?c[f.expando]?c:new f.Event(h,c):new f.Event(h),c.type=h,c.isTrigger=!0,c.exclusive=k,c.namespace=i.join("."),c.namespace_re=c.namespace?new RegExp("(^|\\.)"+i.join("\\.(?:.*\\.)?")+"(\\.|$)"):null,o=h.indexOf(":")<0?"on"+h:"";if(!e){j=f.cache;for(l in j)j[l].events&&j[l].events[h]&&f.event.trigger(c,d,j[l].handle.elem,!0);return}c.result=b,c.target||(c.target=e),d=d!=null?f.makeArray(d):[],d.unshift(c),p=f.event.special[h]||{};if(p.trigger&&p.trigger.apply(e,d)===!1)return;r=[[e,p.bindType||h]];if(!g&&!p.noBubble&&!f.isWindow(e)){s=p.delegateType||h,m=E.test(s+h)?e:e.parentNode,n=null;for(;m;m=m.parentNode)r.push([m,s]),n=m;n&&n===e.ownerDocument&&r.push([n.defaultView||n.parentWindow||a,s])}for(l=0;l<r.length&&!c.isPropagationStopped();l++)m=r[l][0],c.type=r[l][1],q=(f._data(m,"events")||{})[c.type]&&f._data(m,"handle"),q&&q.apply(m,d),q=o&&m[o],q&&f.acceptData(m)&&q.apply(m,d)===!1&&c.preventDefault();c.type=h,!g&&!c.isDefaultPrevented()&&(!p._default||p._default.apply(e.ownerDocument,d)===!1)&&(h!=="click"||!f.nodeName(e,"a"))&&f.acceptData(e)&&o&&e[h]&&(h!=="focus"&&h!=="blur"||c.target.offsetWidth!==0)&&!f.isWindow(e)&&(n=e[o],n&&(e[o]=null),f.event.triggered=h,e[h](),f.event.triggered=b,n&&(e[o]=n));return c.result}},dispatch:function(c){c=f.event.fix(c||a.event);var d=(f._data(this,"events")||{})[c.type]||[],e=d.delegateCount,g=[].slice.call(arguments,0),h=!c.exclusive&&!c.namespace,i=[],j,k,l,m,n,o,p,q,r,s,t;g[0]=c,c.delegateTarget=this;if(e&&!c.target.disabled&&(!c.button||c.type!=="click")){m=f(this),m.context=this.ownerDocument||this;for(l=c.target;l!=this;l=l.parentNode||this){o={},q=[],m[0]=l;for(j=0;j<e;j++)r=d[j],s=r.selector,o[s]===b&&(o[s]=r.quick?H(l,r.quick):m.is(s)),o[s]&&q.push(r);q.length&&i.push({elem:l,matches:q})}}d.length>e&&i.push({elem:this,matches:d.slice(e)});for(j=0;j<i.length&&!c.isPropagationStopped();j++){p=i[j],c.currentTarget=p.elem;for(k=0;k<p.matches.length&&!c.isImmediatePropagationStopped();k++){r=p.matches[k];if(h||!c.namespace&&!r.namespace||c.namespace_re&&c.namespace_re.test(r.namespace))c.data=r.data,c.handleObj=r,n=((f.event.special[r.origType]||{}).handle||r.handler).apply(p.elem,g),n!==b&&(c.result=n,n===!1&&(c.preventDefault(),c.stopPropagation()))}}return c.result},props:"attrChange attrName relatedNode srcElement altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(a,b){a.which==null&&(a.which=b.charCode!=null?b.charCode:b.keyCode);return a}},mouseHooks:{props:"button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(a,d){var e,f,g,h=d.button,i=d.fromElement;a.pageX==null&&d.clientX!=null&&(e=a.target.ownerDocument||c,f=e.documentElement,g=e.body,a.pageX=d.clientX+(f&&f.scrollLeft||g&&g.scrollLeft||0)-(f&&f.clientLeft||g&&g.clientLeft||0),a.pageY=d.clientY+(f&&f.scrollTop||g&&g.scrollTop||0)-(f&&f.clientTop||g&&g.clientTop||0)),!a.relatedTarget&&i&&(a.relatedTarget=i===a.target?d.toElement:i),!a.which&&h!==b&&(a.which=h&1?1:h&2?3:h&4?2:0);return a}},fix:function(a){if(a[f.expando])return a;var d,e,g=a,h=f.event.fixHooks[a.type]||{},i=h.props?this.props.concat(h.props):this.props;a=f.Event(g);for(d=i.length;d;)e=i[--d],a[e]=g[e];a.target||(a.target=g.srcElement||c),a.target.nodeType===3&&(a.target=a.target.parentNode),a.metaKey===b&&(a.metaKey=a.ctrlKey);return h.filter?h.filter(a,g):a},special:{ready:{setup:f.bindReady},load:{noBubble:!0},focus:{delegateType:"focusin"},blur:{delegateType:"focusout"},beforeunload:{setup:function(a,b,c){f.isWindow(this)&&(this.onbeforeunload=c)},teardown:function(a,b){this.onbeforeunload===b&&(this.onbeforeunload=null)}}},simulate:function(a,b,c,d){var e=f.extend(new f.Event,c,{type:a,isSimulated:!0,originalEvent:{}});d?f.event.trigger(e,null,b):f.event.dispatch.call(b,e),e.isDefaultPrevented()&&c.preventDefault()}},f.event.handle=f.event.dispatch,f.removeEvent=c.removeEventListener?function(a,b,c){a.removeEventListener&&a.removeEventListener(b,c,!1)}:function(a,b,c){a.detachEvent&&a.detachEvent("on"+b,c)},f.Event=function(a,b){if(!(this instanceof f.Event))return new f.Event(a,b);a&&a.type?(this.originalEvent=a,this.type=a.type,this.isDefaultPrevented=a.defaultPrevented||a.returnValue===!1||a.getPreventDefault&&a.getPreventDefault()?K:J):this.type=a,b&&f.extend(this,b),this.timeStamp=a&&a.timeStamp||f.now(),this[f.expando]=!0},f.Event.prototype={preventDefault:function(){this.isDefaultPrevented=K;var a=this.originalEvent;!a||(a.preventDefault?a.preventDefault():a.returnValue=!1)},stopPropagation:function(){this.isPropagationStopped=K;var a=this.originalEvent;!a||(a.stopPropagation&&a.stopPropagation(),a.cancelBubble=!0)},stopImmediatePropagation:function(){this.isImmediatePropagationStopped=K,this.stopPropagation()},isDefaultPrevented:J,isPropagationStopped:J,isImmediatePropagationStopped:J},f.each({mouseenter:"mouseover",mouseleave:"mouseout"},function(a,b){f.event.special[a]={delegateType:b,bindType:b,handle:function(a){var c=this,d=a.relatedTarget,e=a.handleObj,g=e.selector,h;if(!d||d!==c&&!f.contains(c,d))a.type=e.origType,h=e.handler.apply(this,arguments),a.type=b;return h}}}),f.support.submitBubbles||(f.event.special.submit={setup:function(){if(f.nodeName(this,"form"))return!1;f.event.add(this,"click._submit keypress._submit",function(a){var c=a.target,d=f.nodeName(c,"input")||f.nodeName(c,"button")?c.form:b;d&&!d._submit_attached&&(f.event.add(d,"submit._submit",function(a){this.parentNode&&!a.isTrigger&&f.event.simulate("submit",this.parentNode,a,!0)}),d._submit_attached=!0)})},teardown:function(){if(f.nodeName(this,"form"))return!1;f.event.remove(this,"._submit")}}),f.support.changeBubbles||(f.event.special.change={setup:function(){if(z.test(this.nodeName)){if(this.type==="checkbox"||this.type==="radio")f.event.add(this,"propertychange._change",function(a){a.originalEvent.propertyName==="checked"&&(this._just_changed=!0)}),f.event.add(this,"click._change",function(a){this._just_changed&&!a.isTrigger&&(this._just_changed=!1,f.event.simulate("change",this,a,!0))});return!1}f.event.add(this,"beforeactivate._change",function(a){var b=a.target;z.test(b.nodeName)&&!b._change_attached&&(f.event.add(b,"change._change",function(a){this.parentNode&&!a.isSimulated&&!a.isTrigger&&f.event.simulate("change",this.parentNode,a,!0)}),b._change_attached=!0)})},handle:function(a){var b=a.target;if(this!==b||a.isSimulated||a.isTrigger||b.type!=="radio"&&b.type!=="checkbox")return a.handleObj.handler.apply(this,arguments)},teardown:function(){f.event.remove(this,"._change");return z.test(this.nodeName)}}),f.support.focusinBubbles||f.each({focus:"focusin",blur:"focusout"},function(a,b){var d=0,e=function(a){f.event.simulate(b,a.target,f.event.fix(a),!0)};f.event.special[b]={setup:function(){d++===0&&c.addEventListener(a,e,!0)},teardown:function(){--d===0&&c.removeEventListener(a,e,!0)}}}),f.fn.extend({on:function(a,c,d,e,g){var h,i;if(typeof a=="object"){typeof c!="string"&&(d=c,c=b);for(i in a)this.on(i,c,d,a[i],g);return this}d==null&&e==null?(e=c,d=c=b):e==null&&(typeof c=="string"?(e=d,d=b):(e=d,d=c,c=b));if(e===!1)e=J;else if(!e)return this;g===1&&(h=e,e=function(a){f().off(a);return h.apply(this,arguments)},e.guid=h.guid||(h.guid=f.guid++));return this.each(function(){f.event.add(this,a,e,d,c)})},one:function(a,b,c,d){return this.on.call(this,a,b,c,d,1)},off:function(a,c,d){if(a&&a.preventDefault&&a.handleObj){var e=a.handleObj;f(a.delegateTarget).off(e.namespace?e.type+"."+e.namespace:e.type,e.selector,e.handler);return this}if(typeof a=="object"){for(var g in a)this.off(g,c,a[g]);return this}if(c===!1||typeof c=="function")d=c,c=b;d===!1&&(d=J);return this.each(function(){f.event.remove(this,a,d,c)})},bind:function(a,b,c){return this.on(a,null,b,c)},unbind:function(a,b){return this.off(a,null,b)},live:function(a,b,c){f(this.context).on(a,this.selector,b,c);return this},die:function(a,b){f(this.context).off(a,this.selector||"**",b);return this},delegate:function(a,b,c,d){return this.on(b,a,c,d)},undelegate:function(a,b,c){return arguments.length==1?this.off(a,"**"):this.off(b,a,c)},trigger:function(a,b){return this.each(function(){f.event.trigger(a,b,this)})},triggerHandler:function(a,b){if(this[0])return f.event.trigger(a,b,this[0],!0)},toggle:function(a){var b=arguments,c=a.guid||f.guid++,d=0,e=function(c){var e=(f._data(this,"lastToggle"+a.guid)||0)%d;f._data(this,"lastToggle"+a.guid,e+1),c.preventDefault();return b[e].apply(this,arguments)||!1};e.guid=c;while(d<b.length)b[d++].guid=c;return this.click(e)},hover:function(a,b){return this.mouseenter(a).mouseleave(b||a)}}),f.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(a,b){f.fn[b]=function(a,c){c==null&&(c=a,a=null);return arguments.length>0?this.on(b,null,a,c):this.trigger(b)},f.attrFn&&(f.attrFn[b]=!0),C.test(b)&&(f.event.fixHooks[b]=f.event.keyHooks),D.test(b)&&(f.event.fixHooks[b]=f.event.mouseHooks)}),function(){function x(a,b,c,e,f,g){for(var h=0,i=e.length;h<i;h++){var j=e[h];if(j){var k=!1;j=j[a];while(j){if(j[d]===c){k=e[j.sizset];break}if(j.nodeType===1){g||(j[d]=c,j.sizset=h);if(typeof b!="string"){if(j===b){k=!0;break}}else if(m.filter(b,[j]).length>0){k=j;break}}j=j[a]}e[h]=k}}}function w(a,b,c,e,f,g){for(var h=0,i=e.length;h<i;h++){var j=e[h];if(j){var k=!1;j=j[a];while(j){if(j[d]===c){k=e[j.sizset];break}j.nodeType===1&&!g&&(j[d]=c,j.sizset=h);if(j.nodeName.toLowerCase()===b){k=j;break}j=j[a]}e[h]=k}}}var a=/((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^\[\]]*\]|['"][^'"]*['"]|[^\[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,d="sizcache"+(Math.random()+"").replace(".",""),e=0,g=Object.prototype.toString,h=!1,i=!0,j=/\\/g,k=/\r\n/g,l=/\W/;[0,0].sort(function(){i=!1;return 0});var m=function(b,d,e,f){e=e||[],d=d||c;var h=d;if(d.nodeType!==1&&d.nodeType!==9)return[];if(!b||typeof b!="string")return e;var i,j,k,l,n,q,r,t,u=!0,v=m.isXML(d),w=[],x=b;do{a.exec(""),i=a.exec(x);if(i){x=i[3],w.push(i[1]);if(i[2]){l=i[3];break}}}while(i);if(w.length>1&&p.exec(b))if(w.length===2&&o.relative[w[0]])j=y(w[0]+w[1],d,f);else{j=o.relative[w[0]]?[d]:m(w.shift(),d);while(w.length)b=w.shift(),o.relative[b]&&(b+=w.shift()),j=y(b,j,f)}else{!f&&w.length>1&&d.nodeType===9&&!v&&o.match.ID.test(w[0])&&!o.match.ID.test(w[w.length-1])&&(n=m.find(w.shift(),d,v),d=n.expr?m.filter(n.expr,n.set)[0]:n.set[0]);if(d){n=f?{expr:w.pop(),set:s(f)}:m.find(w.pop(),w.length===1&&(w[0]==="~"||w[0]==="+")&&d.parentNode?d.parentNode:d,v),j=n.expr?m.filter(n.expr,n.set):n.set,w.length>0?k=s(j):u=!1;while(w.length)q=w.pop(),r=q,o.relative[q]?r=w.pop():q="",r==null&&(r=d),o.relative[q](k,r,v)}else k=w=[]}k||(k=j),k||m.error(q||b);if(g.call(k)==="[object Array]")if(!u)e.push.apply(e,k);else if(d&&d.nodeType===1)for(t=0;k[t]!=null;t++)k[t]&&(k[t]===!0||k[t].nodeType===1&&m.contains(d,k[t]))&&e.push(j[t]);else for(t=0;k[t]!=null;t++)k[t]&&k[t].nodeType===1&&e.push(j[t]);else s(k,e);l&&(m(l,h,e,f),m.uniqueSort(e));return e};m.uniqueSort=function(a){if(u){h=i,a.sort(u);if(h)for(var b=1;b<a.length;b++)a[b]===a[b-1]&&a.splice(b--,1)}return a},m.matches=function(a,b){return m(a,null,null,b)},m.matchesSelector=function(a,b){return m(b,null,null,[a]).length>0},m.find=function(a,b,c){var d,e,f,g,h,i;if(!a)return[];for(e=0,f=o.order.length;e<f;e++){h=o.order[e];if(g=o.leftMatch[h].exec(a)){i=g[1],g.splice(1,1);if(i.substr(i.length-1)!=="\\"){g[1]=(g[1]||"").replace(j,""),d=o.find[h](g,b,c);if(d!=null){a=a.replace(o.match[h],"");break}}}}d||(d=typeof b.getElementsByTagName!="undefined"?b.getElementsByTagName("*"):[]);return{set:d,expr:a}},m.filter=function(a,c,d,e){var f,g,h,i,j,k,l,n,p,q=a,r=[],s=c,t=c&&c[0]&&m.isXML(c[0]);while(a&&c.length){for(h in o.filter)if((f=o.leftMatch[h].exec(a))!=null&&f[2]){k=o.filter[h],l=f[1],g=!1,f.splice(1,1);if(l.substr(l.length-1)==="\\")continue;s===r&&(r=[]);if(o.preFilter[h]){f=o.preFilter[h](f,s,d,r,e,t);if(!f)g=i=!0;else if(f===!0)continue}if(f)for(n=0;(j=s[n])!=null;n++)j&&(i=k(j,f,n,s),p=e^i,d&&i!=null?p?g=!0:s[n]=!1:p&&(r.push(j),g=!0));if(i!==b){d||(s=r),a=a.replace(o.match[h],"");if(!g)return[];break}}if(a===q)if(g==null)m.error(a);else break;q=a}return s},m.error=function(a){throw new Error("Syntax error, unrecognized expression: "+a)};var n=m.getText=function(a){var b,c,d=a.nodeType,e="";if(d){if(d===1||d===9){if(typeof a.textContent=="string")return a.textContent;if(typeof a.innerText=="string")return a.innerText.replace(k,"");for(a=a.firstChild;a;a=a.nextSibling)e+=n(a)}else if(d===3||d===4)return a.nodeValue}else for(b=0;c=a[b];b++)c.nodeType!==8&&(e+=n(c));return e},o=m.selectors={order:["ID","NAME","TAG"],match:{ID:/#((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,CLASS:/\.((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,NAME:/\[name=['"]*((?:[\w\u00c0-\uFFFF\-]|\\.)+)['"]*\]/,ATTR:/\[\s*((?:[\w\u00c0-\uFFFF\-]|\\.)+)\s*(?:(\S?=)\s*(?:(['"])(.*?)\3|(#?(?:[\w\u00c0-\uFFFF\-]|\\.)*)|)|)\s*\]/,TAG:/^((?:[\w\u00c0-\uFFFF\*\-]|\\.)+)/,CHILD:/:(only|nth|last|first)-child(?:\(\s*(even|odd|(?:[+\-]?\d+|(?:[+\-]?\d*)?n\s*(?:[+\-]\s*\d+)?))\s*\))?/,POS:/:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^\-]|$)/,PSEUDO:/:((?:[\w\u00c0-\uFFFF\-]|\\.)+)(?:\((['"]?)((?:\([^\)]+\)|[^\(\)]*)+)\2\))?/},leftMatch:{},attrMap:{"class":"className","for":"htmlFor"},attrHandle:{href:function(a){return a.getAttribute("href")},type:function(a){return a.getAttribute("type")}},relative:{"+":function(a,b){var c=typeof b=="string",d=c&&!l.test(b),e=c&&!d;d&&(b=b.toLowerCase());for(var f=0,g=a.length,h;f<g;f++)if(h=a[f]){while((h=h.previousSibling)&&h.nodeType!==1);a[f]=e||h&&h.nodeName.toLowerCase()===b?h||!1:h===b}e&&m.filter(b,a,!0)},">":function(a,b){var c,d=typeof b=="string",e=0,f=a.length;if(d&&!l.test(b)){b=b.toLowerCase();for(;e<f;e++){c=a[e];if(c){var g=c.parentNode;a[e]=g.nodeName.toLowerCase()===b?g:!1}}}else{for(;e<f;e++)c=a[e],c&&(a[e]=d?c.parentNode:c.parentNode===b);d&&m.filter(b,a,!0)}},"":function(a,b,c){var d,f=e++,g=x;typeof b=="string"&&!l.test(b)&&(b=b.toLowerCase(),d=b,g=w),g("parentNode",b,f,a,d,c)},"~":function(a,b,c){var d,f=e++,g=x;typeof b=="string"&&!l.test(b)&&(b=b.toLowerCase(),d=b,g=w),g("previousSibling",b,f,a,d,c)}},find:{ID:function(a,b,c){if(typeof b.getElementById!="undefined"&&!c){var d=b.getElementById(a[1]);return d&&d.parentNode?[d]:[]}},NAME:function(a,b){if(typeof b.getElementsByName!="undefined"){var c=[],d=b.getElementsByName(a[1]);for(var e=0,f=d.length;e<f;e++)d[e].getAttribute("name")===a[1]&&c.push(d[e]);return c.length===0?null:c}},TAG:function(a,b){if(typeof b.getElementsByTagName!="undefined")return b.getElementsByTagName(a[1])}},preFilter:{CLASS:function(a,b,c,d,e,f){a=" "+a[1].replace(j,"")+" ";if(f)return a;for(var g=0,h;(h=b[g])!=null;g++)h&&(e^(h.className&&(" "+h.className+" ").replace(/[\t\n\r]/g," ").indexOf(a)>=0)?c||d.push(h):c&&(b[g]=!1));return!1},ID:function(a){return a[1].replace(j,"")},TAG:function(a,b){return a[1].replace(j,"").toLowerCase()},CHILD:function(a){if(a[1]==="nth"){a[2]||m.error(a[0]),a[2]=a[2].replace(/^\+|\s*/g,"");var b=/(-?)(\d*)(?:n([+\-]?\d*))?/.exec(a[2]==="even"&&"2n"||a[2]==="odd"&&"2n+1"||!/\D/.test(a[2])&&"0n+"+a[2]||a[2]);a[2]=b[1]+(b[2]||1)-0,a[3]=b[3]-0}else a[2]&&m.error(a[0]);a[0]=e++;return a},ATTR:function(a,b,c,d,e,f){var g=a[1]=a[1].replace(j,"");!f&&o.attrMap[g]&&(a[1]=o.attrMap[g]),a[4]=(a[4]||a[5]||"").replace(j,""),a[2]==="~="&&(a[4]=" "+a[4]+" ");return a},PSEUDO:function(b,c,d,e,f){if(b[1]==="not")if((a.exec(b[3])||"").length>1||/^\w/.test(b[3]))b[3]=m(b[3],null,null,c);else{var g=m.filter(b[3],c,d,!0^f);d||e.push.apply(e,g);return!1}else if(o.match.POS.test(b[0])||o.match.CHILD.test(b[0]))return!0;return b},POS:function(a){a.unshift(!0);return a}},filters:{enabled:function(a){return a.disabled===!1&&a.type!=="hidden"},disabled:function(a){return a.disabled===!0},checked:function(a){return a.checked===!0},selected:function(a){a.parentNode&&a.parentNode.selectedIndex;return a.selected===!0},parent:function(a){return!!a.firstChild},empty:function(a){return!a.firstChild},has:function(a,b,c){return!!m(c[3],a).length},header:function(a){return/h\d/i.test(a.nodeName)},text:function(a){var b=a.getAttribute("type"),c=a.type;return a.nodeName.toLowerCase()==="input"&&"text"===c&&(b===c||b===null)},radio:function(a){return a.nodeName.toLowerCase()==="input"&&"radio"===a.type},checkbox:function(a){return a.nodeName.toLowerCase()==="input"&&"checkbox"===a.type},file:function(a){return a.nodeName.toLowerCase()==="input"&&"file"===a.type},password:function(a){return a.nodeName.toLowerCase()==="input"&&"password"===a.type},submit:function(a){var b=a.nodeName.toLowerCase();return(b==="input"||b==="button")&&"submit"===a.type},image:function(a){return a.nodeName.toLowerCase()==="input"&&"image"===a.type},reset:function(a){var b=a.nodeName.toLowerCase();return(b==="input"||b==="button")&&"reset"===a.type},button:function(a){var b=a.nodeName.toLowerCase();return b==="input"&&"button"===a.type||b==="button"},input:function(a){return/input|select|textarea|button/i.test(a.nodeName)},focus:function(a){return a===a.ownerDocument.activeElement}},setFilters:{first:function(a,b){return b===0},last:function(a,b,c,d){return b===d.length-1},even:function(a,b){return b%2===0},odd:function(a,b){return b%2===1},lt:function(a,b,c){return b<c[3]-0},gt:function(a,b,c){return b>c[3]-0},nth:function(a,b,c){return c[3]-0===b},eq:function(a,b,c){return c[3]-0===b}},filter:{PSEUDO:function(a,b,c,d){var e=b[1],f=o.filters[e];if(f)return f(a,c,b,d);if(e==="contains")return(a.textContent||a.innerText||n([a])||"").indexOf(b[3])>=0;if(e==="not"){var g=b[3];for(var h=0,i=g.length;h<i;h++)if(g[h]===a)return!1;return!0}m.error(e)},CHILD:function(a,b){var c,e,f,g,h,i,j,k=b[1],l=a;switch(k){case"only":case"first":while(l=l.previousSibling)if(l.nodeType===1)return!1;if(k==="first")return!0;l=a;case"last":while(l=l.nextSibling)if(l.nodeType===1)return!1;return!0;case"nth":c=b[2],e=b[3];if(c===1&&e===0)return!0;f=b[0],g=a.parentNode;if(g&&(g[d]!==f||!a.nodeIndex)){i=0;for(l=g.firstChild;l;l=l.nextSibling)l.nodeType===1&&(l.nodeIndex=++i);g[d]=f}j=a.nodeIndex-e;return c===0?j===0:j%c===0&&j/c>=0}},ID:function(a,b){return a.nodeType===1&&a.getAttribute("id")===b},TAG:function(a,b){return b==="*"&&a.nodeType===1||!!a.nodeName&&a.nodeName.toLowerCase()===b},CLASS:function(a,b){return(" "+(a.className||a.getAttribute("class"))+" ").indexOf(b)>-1},ATTR:function(a,b){var c=b[1],d=m.attr?m.attr(a,c):o.attrHandle[c]?o.attrHandle[c](a):a[c]!=null?a[c]:a.getAttribute(c),e=d+"",f=b[2],g=b[4];return d==null?f==="!=":!f&&m.attr?d!=null:f==="="?e===g:f==="*="?e.indexOf(g)>=0:f==="~="?(" "+e+" ").indexOf(g)>=0:g?f==="!="?e!==g:f==="^="?e.indexOf(g)===0:f==="$="?e.substr(e.length-g.length)===g:f==="|="?e===g||e.substr(0,g.length+1)===g+"-":!1:e&&d!==!1},POS:function(a,b,c,d){var e=b[2],f=o.setFilters[e];if(f)return f(a,c,b,d)}}},p=o.match.POS,q=function(a,b){return"\\"+(b-0+1)};for(var r in o.match)o.match[r]=new RegExp(o.match[r].source+/(?![^\[]*\])(?![^\(]*\))/.source),o.leftMatch[r]=new RegExp(/(^(?:.|\r|\n)*?)/.source+o.match[r].source.replace(/\\(\d+)/g,q));var s=function(a,b){a=Array.prototype.slice.call(a,0);if(b){b.push.apply(b,a);return b}return a};try{Array.prototype.slice.call(c.documentElement.childNodes,0)[0].nodeType}catch(t){s=function(a,b){var c=0,d=b||[];if(g.call(a)==="[object Array]")Array.prototype.push.apply(d,a);else if(typeof a.length=="number")for(var e=a.length;c<e;c++)d.push(a[c]);else for(;a[c];c++)d.push(a[c]);return d}}var u,v;c.documentElement.compareDocumentPosition?u=function(a,b){if(a===b){h=!0;return 0}if(!a.compareDocumentPosition||!b.compareDocumentPosition)return a.compareDocumentPosition?-1:1;return a.compareDocumentPosition(b)&4?-1:1}:(u=function(a,b){if(a===b){h=!0;return 0}if(a.sourceIndex&&b.sourceIndex)return a.sourceIndex-b.sourceIndex;var c,d,e=[],f=[],g=a.parentNode,i=b.parentNode,j=g;if(g===i)return v(a,b);if(!g)return-1;if(!i)return 1;while(j)e.unshift(j),j=j.parentNode;j=i;while(j)f.unshift(j),j=j.parentNode;c=e.length,d=f.length;for(var k=0;k<c&&k<d;k++)if(e[k]!==f[k])return v(e[k],f[k]);return k===c?v(a,f[k],-1):v(e[k],b,1)},v=function(a,b,c){if(a===b)return c;var d=a.nextSibling;while(d){if(d===b)return-1;d=d.nextSibling}return 1}),function(){var a=c.createElement("div"),d="script"+(new Date).getTime(),e=c.documentElement;a.innerHTML="<a name='"+d+"'/>",e.insertBefore(a,e.firstChild),c.getElementById(d)&&(o.find.ID=function(a,c,d){if(typeof c.getElementById!="undefined"&&!d){var e=c.getElementById(a[1]);return e?e.id===a[1]||typeof e.getAttributeNode!="undefined"&&e.getAttributeNode("id").nodeValue===a[1]?[e]:b:[]}},o.filter.ID=function(a,b){var c=typeof a.getAttributeNode!="undefined"&&a.getAttributeNode("id");return a.nodeType===1&&c&&c.nodeValue===b}),e.removeChild(a),e=a=null}(),function(){var a=c.createElement("div");a.appendChild(c.createComment("")),a.getElementsByTagName("*").length>0&&(o.find.TAG=function(a,b){var c=b.getElementsByTagName(a[1]);if(a[1]==="*"){var d=[];for(var e=0;c[e];e++)c[e].nodeType===1&&d.push(c[e]);c=d}return c}),a.innerHTML="<a href='#'></a>",a.firstChild&&typeof a.firstChild.getAttribute!="undefined"&&a.firstChild.getAttribute("href")!=="#"&&(o.attrHandle.href=function(a){return a.getAttribute("href",2)}),a=null}(),c.querySelectorAll&&function(){var a=m,b=c.createElement("div"),d="__sizzle__";b.innerHTML="<p class='TEST'></p>";if(!b.querySelectorAll||b.querySelectorAll(".TEST").length!==0){m=function(b,e,f,g){e=e||c;if(!g&&!m.isXML(e)){var h=/^(\w+$)|^\.([\w\-]+$)|^#([\w\-]+$)/.exec(b);if(h&&(e.nodeType===1||e.nodeType===9)){if(h[1])return s(e.getElementsByTagName(b),f);if(h[2]&&o.find.CLASS&&e.getElementsByClassName)return s(e.getElementsByClassName(h[2]),f)}if(e.nodeType===9){if(b==="body"&&e.body)return s([e.body],f);if(h&&h[3]){var i=e.getElementById(h[3]);if(!i||!i.parentNode)return s([],f);if(i.id===h[3])return s([i],f)}try{return s(e.querySelectorAll(b),f)}catch(j){}}else if(e.nodeType===1&&e.nodeName.toLowerCase()!=="object"){var k=e,l=e.getAttribute("id"),n=l||d,p=e.parentNode,q=/^\s*[+~]/.test(b);l?n=n.replace(/'/g,"\\$&"):e.setAttribute("id",n),q&&p&&(e=e.parentNode);try{if(!q||p)return s(e.querySelectorAll("[id='"+n+"'] "+b),f)}catch(r){}finally{l||k.removeAttribute("id")}}}return a(b,e,f,g)};for(var e in a)m[e]=a[e];b=null}}(),function(){var a=c.documentElement,b=a.matchesSelector||a.mozMatchesSelector||a.webkitMatchesSelector||a.msMatchesSelector;if(b){var d=!b.call(c.createElement("div"),"div"),e=!1;try{b.call(c.documentElement,"[test!='']:sizzle")}catch(f){e=!0}m.matchesSelector=function(a,c){c=c.replace(/\=\s*([^'"\]]*)\s*\]/g,"='$1']");if(!m.isXML(a))try{if(e||!o.match.PSEUDO.test(c)&&!/!=/.test(c)){var f=b.call(a,c);if(f||!d||a.document&&a.document.nodeType!==11)return f}}catch(g){}return m(c,null,null,[a]).length>0}}}(),function(){var a=c.createElement("div");a.innerHTML="<div class='test e'></div><div class='test'></div>";if(!!a.getElementsByClassName&&a.getElementsByClassName("e").length!==0){a.lastChild.className="e";if(a.getElementsByClassName("e").length===1)return;o.order.splice(1,0,"CLASS"),o.find.CLASS=function(a,b,c){if(typeof b.getElementsByClassName!="undefined"&&!c)return b.getElementsByClassName(a[1])},a=null}}(),c.documentElement.contains?m.contains=function(a,b){return a!==b&&(a.contains?a.contains(b):!0)}:c.documentElement.compareDocumentPosition?m.contains=function(a,b){return!!(a.compareDocumentPosition(b)&16)}:m.contains=function(){return!1},m.isXML=function(a){var b=(a?a.ownerDocument||a:0).documentElement;return b?b.nodeName!=="HTML":!1};var y=function(a,b,c){var d,e=[],f="",g=b.nodeType?[b]:b;while(d=o.match.PSEUDO.exec(a))f+=d[0],a=a.replace(o.match.PSEUDO,"");a=o.relative[a]?a+"*":a;for(var h=0,i=g.length;h<i;h++)m(a,g[h],e,c);return m.filter(f,e)};m.attr=f.attr,m.selectors.attrMap={},f.find=m,f.expr=m.selectors,f.expr[":"]=f.expr.filters,f.unique=m.uniqueSort,f.text=m.getText,f.isXMLDoc=m.isXML,f.contains=m.contains}();var L=/Until$/,M=/^(?:parents|prevUntil|prevAll)/,N=/,/,O=/^.[^:#\[\.,]*$/,P=Array.prototype.slice,Q=f.expr.match.POS,R={children:!0,contents:!0,next:!0,prev:!0};f.fn.extend({find:function(a){var b=this,c,d;if(typeof a!="string")return f(a).filter(function(){for(c=0,d=b.length;c<d;c++)if(f.contains(b[c],this))return!0});var e=this.pushStack("","find",a),g,h,i;for(c=0,d=this.length;c<d;c++){g=e.length,f.find(a,this[c],e);if(c>0)for(h=g;h<e.length;h++)for(i=0;i<g;i++)if(e[i]===e[h]){e.splice(h--,1);break}}return e},has:function(a){var b=f(a);return this.filter(function(){for(var a=0,c=b.length;a<c;a++)if(f.contains(this,b[a]))return!0})},not:function(a){return this.pushStack(T(this,a,!1),"not",a)},filter:function(a){return this.pushStack(T(this,a,!0),"filter",a)},is:function(a){return!!a&&(typeof a=="string"?Q.test(a)?f(a,this.context).index(this[0])>=0:f.filter(a,this).length>0:this.filter(a).length>0)},closest:function(a,b){var c=[],d,e,g=this[0];if(f.isArray(a)){var h=1;while(g&&g.ownerDocument&&g!==b){for(d=0;d<a.length;d++)f(g).is(a[d])&&c.push({selector:a[d],elem:g,level:h});g=g.parentNode,h++}return c}var i=Q.test(a)||typeof a!="string"?f(a,b||this.context):0;for(d=0,e=this.length;d<e;d++){g=this[d];while(g){if(i?i.index(g)>-1:f.find.matchesSelector(g,a)){c.push(g);break}g=g.parentNode;if(!g||!g.ownerDocument||g===b||g.nodeType===11)break}}c=c.length>1?f.unique(c):c;return this.pushStack(c,"closest",a)},index:function(a){if(!a)return this[0]&&this[0].parentNode?this.prevAll().length:-1;if(typeof a=="string")return f.inArray(this[0],f(a));return f.inArray(a.jquery?a[0]:a,this)},add:function(a,b){var c=typeof a=="string"?f(a,b):f.makeArray(a&&a.nodeType?[a]:a),d=f.merge(this.get(),c);return this.pushStack(S(c[0])||S(d[0])?d:f.unique(d))},andSelf:function(){return this.add(this.prevObject)}}),f.each({parent:function(a){var b=a.parentNode;return b&&b.nodeType!==11?b:null},parents:function(a){return f.dir(a,"parentNode")},parentsUntil:function(a,b,c){return f.dir(a,"parentNode",c)},next:function(a){return f.nth(a,2,"nextSibling")},prev:function(a){return f.nth(a,2,"previousSibling")},nextAll:function(a){return f.dir(a,"nextSibling")},prevAll:function(a){return f.dir(a,"previousSibling")},nextUntil:function(a,b,c){return f.dir(a,"nextSibling",c)},prevUntil:function(a,b,c){return f.dir(a,"previousSibling",c)},siblings:function(a){return f.sibling(a.parentNode.firstChild,a)},children:function(a){return f.sibling(a.firstChild)},contents:function(a){return f.nodeName(a,"iframe")?a.contentDocument||a.contentWindow.document:f.makeArray(a.childNodes)}},function(a,b){f.fn[a]=function(c,d){var e=f.map(this,b,c);L.test(a)||(d=c),d&&typeof d=="string"&&(e=f.filter(d,e)),e=this.length>1&&!R[a]?f.unique(e):e,(this.length>1||N.test(d))&&M.test(a)&&(e=e.reverse());return this.pushStack(e,a,P.call(arguments).join(","))}}),f.extend({filter:function(a,b,c){c&&(a=":not("+a+")");return b.length===1?f.find.matchesSelector(b[0],a)?[b[0]]:[]:f.find.matches(a,b)},dir:function(a,c,d){var e=[],g=a[c];while(g&&g.nodeType!==9&&(d===b||g.nodeType!==1||!f(g).is(d)))g.nodeType===1&&e.push(g),g=g[c];return e},nth:function(a,b,c,d){b=b||1;var e=0;for(;a;a=a[c])if(a.nodeType===1&&++e===b)break;return a},sibling:function(a,b){var c=[];for(;a;a=a.nextSibling)a.nodeType===1&&a!==b&&c.push(a);return c}});var V="abbr|article|aside|audio|canvas|datalist|details|figcaption|figure|footer|header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",W=/ jQuery\d+="(?:\d+|null)"/g,X=/^\s+/,Y=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,Z=/<([\w:]+)/,$=/<tbody/i,_=/<|&#?\w+;/,ba=/<(?:script|style)/i,bb=/<(?:script|object|embed|option|style)/i,bc=new RegExp("<(?:"+V+")","i"),bd=/checked\s*(?:[^=]|=\s*.checked.)/i,be=/\/(java|ecma)script/i,bf=/^\s*<!(?:\[CDATA\[|\-\-)/,bg={option:[1,"<select multiple='multiple'>","</select>"],legend:[1,"<fieldset>","</fieldset>"],thead:[1,"<table>","</table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],col:[2,"<table><tbody></tbody><colgroup>","</colgroup></table>"],area:[1,"<map>","</map>"],_default:[0,"",""]},bh=U(c);bg.optgroup=bg.option,bg.tbody=bg.tfoot=bg.colgroup=bg.caption=bg.thead,bg.th=bg.td,f.support.htmlSerialize||(bg._default=[1,"div<div>","</div>"]),f.fn.extend({text:function(a){if(f.isFunction(a))return this.each(function(b){var c=f(this);c.text(a.call(this,b,c.text()))});if(typeof a!="object"&&a!==b)return this.empty().append((this[0]&&this[0].ownerDocument||c).createTextNode(a));return f.text(this)},wrapAll:function(a){if(f.isFunction(a))return this.each(function(b){f(this).wrapAll(a.call(this,b))});if(this[0]){var b=f(a,this[0].ownerDocument).eq(0).clone(!0);this[0].parentNode&&b.insertBefore(this[0]),b.map(function(){var a=this;while(a.firstChild&&a.firstChild.nodeType===1)a=a.firstChild;return a}).append(this)}return this},wrapInner:function(a){if(f.isFunction(a))return this.each(function(b){f(this).wrapInner(a.call(this,b))});return this.each(function(){var b=f(this),c=b.contents();c.length?c.wrapAll(a):b.append(a)})},wrap:function(a){var b=f.isFunction(a);return this.each(function(c){f(this).wrapAll(b?a.call(this,c):a)})},unwrap:function(){return this.parent().each(function(){f.nodeName(this,"body")||f(this).replaceWith(this.childNodes)}).end()},append:function(){return this.domManip(arguments,!0,function(a){this.nodeType===1&&this.appendChild(a)})},prepend:function(){return this.domManip(arguments,!0,function(a){this.nodeType===1&&this.insertBefore(a,this.firstChild)})},before:function(){if(this[0]&&this[0].parentNode)return this.domManip(arguments,!1,function(a){this.parentNode.insertBefore(a,this)});if(arguments.length){var a=f.clean(arguments);a.push.apply(a,this.toArray());return this.pushStack(a,"before",arguments)}},after:function(){if(this[0]&&this[0].parentNode)return this.domManip(arguments,!1,function(a){this.parentNode.insertBefore(a,this.nextSibling)});if(arguments.length){var a=this.pushStack(this,"after",arguments);a.push.apply(a,f.clean(arguments));return a}},remove:function(a,b){for(var c=0,d;(d=this[c])!=null;c++)if(!a||f.filter(a,[d]).length)!b&&d.nodeType===1&&(f.cleanData(d.getElementsByTagName("*")),f.cleanData([d])),d.parentNode&&d.parentNode.removeChild(d);return this},empty:function()
{for(var a=0,b;(b=this[a])!=null;a++){b.nodeType===1&&f.cleanData(b.getElementsByTagName("*"));while(b.firstChild)b.removeChild(b.firstChild)}return this},clone:function(a,b){a=a==null?!1:a,b=b==null?a:b;return this.map(function(){return f.clone(this,a,b)})},html:function(a){if(a===b)return this[0]&&this[0].nodeType===1?this[0].innerHTML.replace(W,""):null;if(typeof a=="string"&&!ba.test(a)&&(f.support.leadingWhitespace||!X.test(a))&&!bg[(Z.exec(a)||["",""])[1].toLowerCase()]){a=a.replace(Y,"<$1></$2>");try{for(var c=0,d=this.length;c<d;c++)this[c].nodeType===1&&(f.cleanData(this[c].getElementsByTagName("*")),this[c].innerHTML=a)}catch(e){this.empty().append(a)}}else f.isFunction(a)?this.each(function(b){var c=f(this);c.html(a.call(this,b,c.html()))}):this.empty().append(a);return this},replaceWith:function(a){if(this[0]&&this[0].parentNode){if(f.isFunction(a))return this.each(function(b){var c=f(this),d=c.html();c.replaceWith(a.call(this,b,d))});typeof a!="string"&&(a=f(a).detach());return this.each(function(){var b=this.nextSibling,c=this.parentNode;f(this).remove(),b?f(b).before(a):f(c).append(a)})}return this.length?this.pushStack(f(f.isFunction(a)?a():a),"replaceWith",a):this},detach:function(a){return this.remove(a,!0)},domManip:function(a,c,d){var e,g,h,i,j=a[0],k=[];if(!f.support.checkClone&&arguments.length===3&&typeof j=="string"&&bd.test(j))return this.each(function(){f(this).domManip(a,c,d,!0)});if(f.isFunction(j))return this.each(function(e){var g=f(this);a[0]=j.call(this,e,c?g.html():b),g.domManip(a,c,d)});if(this[0]){i=j&&j.parentNode,f.support.parentNode&&i&&i.nodeType===11&&i.childNodes.length===this.length?e={fragment:i}:e=f.buildFragment(a,this,k),h=e.fragment,h.childNodes.length===1?g=h=h.firstChild:g=h.firstChild;if(g){c=c&&f.nodeName(g,"tr");for(var l=0,m=this.length,n=m-1;l<m;l++)d.call(c?bi(this[l],g):this[l],e.cacheable||m>1&&l<n?f.clone(h,!0,!0):h)}k.length&&f.each(k,bp)}return this}}),f.buildFragment=function(a,b,d){var e,g,h,i,j=a[0];b&&b[0]&&(i=b[0].ownerDocument||b[0]),i.createDocumentFragment||(i=c),a.length===1&&typeof j=="string"&&j.length<512&&i===c&&j.charAt(0)==="<"&&!bb.test(j)&&(f.support.checkClone||!bd.test(j))&&(f.support.html5Clone||!bc.test(j))&&(g=!0,h=f.fragments[j],h&&h!==1&&(e=h)),e||(e=i.createDocumentFragment(),f.clean(a,i,e,d)),g&&(f.fragments[j]=h?e:1);return{fragment:e,cacheable:g}},f.fragments={},f.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(a,b){f.fn[a]=function(c){var d=[],e=f(c),g=this.length===1&&this[0].parentNode;if(g&&g.nodeType===11&&g.childNodes.length===1&&e.length===1){e[b](this[0]);return this}for(var h=0,i=e.length;h<i;h++){var j=(h>0?this.clone(!0):this).get();f(e[h])[b](j),d=d.concat(j)}return this.pushStack(d,a,e.selector)}}),f.extend({clone:function(a,b,c){var d,e,g,h=f.support.html5Clone||!bc.test("<"+a.nodeName)?a.cloneNode(!0):bo(a);if((!f.support.noCloneEvent||!f.support.noCloneChecked)&&(a.nodeType===1||a.nodeType===11)&&!f.isXMLDoc(a)){bk(a,h),d=bl(a),e=bl(h);for(g=0;d[g];++g)e[g]&&bk(d[g],e[g])}if(b){bj(a,h);if(c){d=bl(a),e=bl(h);for(g=0;d[g];++g)bj(d[g],e[g])}}d=e=null;return h},clean:function(a,b,d,e){var g;b=b||c,typeof b.createElement=="undefined"&&(b=b.ownerDocument||b[0]&&b[0].ownerDocument||c);var h=[],i;for(var j=0,k;(k=a[j])!=null;j++){typeof k=="number"&&(k+="");if(!k)continue;if(typeof k=="string")if(!_.test(k))k=b.createTextNode(k);else{k=k.replace(Y,"<$1></$2>");var l=(Z.exec(k)||["",""])[1].toLowerCase(),m=bg[l]||bg._default,n=m[0],o=b.createElement("div");b===c?bh.appendChild(o):U(b).appendChild(o),o.innerHTML=m[1]+k+m[2];while(n--)o=o.lastChild;if(!f.support.tbody){var p=$.test(k),q=l==="table"&&!p?o.firstChild&&o.firstChild.childNodes:m[1]==="<table>"&&!p?o.childNodes:[];for(i=q.length-1;i>=0;--i)f.nodeName(q[i],"tbody")&&!q[i].childNodes.length&&q[i].parentNode.removeChild(q[i])}!f.support.leadingWhitespace&&X.test(k)&&o.insertBefore(b.createTextNode(X.exec(k)[0]),o.firstChild),k=o.childNodes}var r;if(!f.support.appendChecked)if(k[0]&&typeof (r=k.length)=="number")for(i=0;i<r;i++)bn(k[i]);else bn(k);k.nodeType?h.push(k):h=f.merge(h,k)}if(d){g=function(a){return!a.type||be.test(a.type)};for(j=0;h[j];j++)if(e&&f.nodeName(h[j],"script")&&(!h[j].type||h[j].type.toLowerCase()==="text/javascript"))e.push(h[j].parentNode?h[j].parentNode.removeChild(h[j]):h[j]);else{if(h[j].nodeType===1){var s=f.grep(h[j].getElementsByTagName("script"),g);h.splice.apply(h,[j+1,0].concat(s))}d.appendChild(h[j])}}return h},cleanData:function(a){var b,c,d=f.cache,e=f.event.special,g=f.support.deleteExpando;for(var h=0,i;(i=a[h])!=null;h++){if(i.nodeName&&f.noData[i.nodeName.toLowerCase()])continue;c=i[f.expando];if(c){b=d[c];if(b&&b.events){for(var j in b.events)e[j]?f.event.remove(i,j):f.removeEvent(i,j,b.handle);b.handle&&(b.handle.elem=null)}g?delete i[f.expando]:i.removeAttribute&&i.removeAttribute(f.expando),delete d[c]}}}});var bq=/alpha\([^)]*\)/i,br=/opacity=([^)]*)/,bs=/([A-Z]|^ms)/g,bt=/^-?\d+(?:px)?$/i,bu=/^-?\d/,bv=/^([\-+])=([\-+.\de]+)/,bw={position:"absolute",visibility:"hidden",display:"block"},bx=["Left","Right"],by=["Top","Bottom"],bz,bA,bB;f.fn.css=function(a,c){if(arguments.length===2&&c===b)return this;return f.access(this,a,c,!0,function(a,c,d){return d!==b?f.style(a,c,d):f.css(a,c)})},f.extend({cssHooks:{opacity:{get:function(a,b){if(b){var c=bz(a,"opacity","opacity");return c===""?"1":c}return a.style.opacity}}},cssNumber:{fillOpacity:!0,fontWeight:!0,lineHeight:!0,opacity:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":f.support.cssFloat?"cssFloat":"styleFloat"},style:function(a,c,d,e){if(!!a&&a.nodeType!==3&&a.nodeType!==8&&!!a.style){var g,h,i=f.camelCase(c),j=a.style,k=f.cssHooks[i];c=f.cssProps[i]||i;if(d===b){if(k&&"get"in k&&(g=k.get(a,!1,e))!==b)return g;return j[c]}h=typeof d,h==="string"&&(g=bv.exec(d))&&(d=+(g[1]+1)*+g[2]+parseFloat(f.css(a,c)),h="number");if(d==null||h==="number"&&isNaN(d))return;h==="number"&&!f.cssNumber[i]&&(d+="px");if(!k||!("set"in k)||(d=k.set(a,d))!==b)try{j[c]=d}catch(l){}}},css:function(a,c,d){var e,g;c=f.camelCase(c),g=f.cssHooks[c],c=f.cssProps[c]||c,c==="cssFloat"&&(c="float");if(g&&"get"in g&&(e=g.get(a,!0,d))!==b)return e;if(bz)return bz(a,c)},swap:function(a,b,c){var d={};for(var e in b)d[e]=a.style[e],a.style[e]=b[e];c.call(a);for(e in b)a.style[e]=d[e]}}),f.curCSS=f.css,f.each(["height","width"],function(a,b){f.cssHooks[b]={get:function(a,c,d){var e;if(c){if(a.offsetWidth!==0)return bC(a,b,d);f.swap(a,bw,function(){e=bC(a,b,d)});return e}},set:function(a,b){if(!bt.test(b))return b;b=parseFloat(b);if(b>=0)return b+"px"}}}),f.support.opacity||(f.cssHooks.opacity={get:function(a,b){return br.test((b&&a.currentStyle?a.currentStyle.filter:a.style.filter)||"")?parseFloat(RegExp.$1)/100+"":b?"1":""},set:function(a,b){var c=a.style,d=a.currentStyle,e=f.isNumeric(b)?"alpha(opacity="+b*100+")":"",g=d&&d.filter||c.filter||"";c.zoom=1;if(b>=1&&f.trim(g.replace(bq,""))===""){c.removeAttribute("filter");if(d&&!d.filter)return}c.filter=bq.test(g)?g.replace(bq,e):g+" "+e}}),f(function(){f.support.reliableMarginRight||(f.cssHooks.marginRight={get:function(a,b){var c;f.swap(a,{display:"inline-block"},function(){b?c=bz(a,"margin-right","marginRight"):c=a.style.marginRight});return c}})}),c.defaultView&&c.defaultView.getComputedStyle&&(bA=function(a,b){var c,d,e;b=b.replace(bs,"-$1").toLowerCase(),(d=a.ownerDocument.defaultView)&&(e=d.getComputedStyle(a,null))&&(c=e.getPropertyValue(b),c===""&&!f.contains(a.ownerDocument.documentElement,a)&&(c=f.style(a,b)));return c}),c.documentElement.currentStyle&&(bB=function(a,b){var c,d,e,f=a.currentStyle&&a.currentStyle[b],g=a.style;f===null&&g&&(e=g[b])&&(f=e),!bt.test(f)&&bu.test(f)&&(c=g.left,d=a.runtimeStyle&&a.runtimeStyle.left,d&&(a.runtimeStyle.left=a.currentStyle.left),g.left=b==="fontSize"?"1em":f||0,f=g.pixelLeft+"px",g.left=c,d&&(a.runtimeStyle.left=d));return f===""?"auto":f}),bz=bA||bB,f.expr&&f.expr.filters&&(f.expr.filters.hidden=function(a){var b=a.offsetWidth,c=a.offsetHeight;return b===0&&c===0||!f.support.reliableHiddenOffsets&&(a.style&&a.style.display||f.css(a,"display"))==="none"},f.expr.filters.visible=function(a){return!f.expr.filters.hidden(a)});var bD=/%20/g,bE=/\[\]$/,bF=/\r?\n/g,bG=/#.*$/,bH=/^(.*?):[ \t]*([^\r\n]*)\r?$/mg,bI=/^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i,bJ=/^(?:about|app|app\-storage|.+\-extension|file|res|widget):$/,bK=/^(?:GET|HEAD)$/,bL=/^\/\//,bM=/\?/,bN=/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,bO=/^(?:select|textarea)/i,bP=/\s+/,bQ=/([?&])_=[^&]*/,bR=/^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/,bS=f.fn.load,bT={},bU={},bV,bW,bX=["*/"]+["*"];try{bV=e.href}catch(bY){bV=c.createElement("a"),bV.href="",bV=bV.href}bW=bR.exec(bV.toLowerCase())||[],f.fn.extend({load:function(a,c,d){if(typeof a!="string"&&bS)return bS.apply(this,arguments);if(!this.length)return this;var e=a.indexOf(" ");if(e>=0){var g=a.slice(e,a.length);a=a.slice(0,e)}var h="GET";c&&(f.isFunction(c)?(d=c,c=b):typeof c=="object"&&(c=f.param(c,f.ajaxSettings.traditional),h="POST"));var i=this;f.ajax({url:a,type:h,dataType:"html",data:c,complete:function(a,b,c){c=a.responseText,a.isResolved()&&(a.done(function(a){c=a}),i.html(g?f("<div>").append(c.replace(bN,"")).find(g):c)),d&&i.each(d,[c,b,a])}});return this},serialize:function(){return f.param(this.serializeArray())},serializeArray:function(){return this.map(function(){return this.elements?f.makeArray(this.elements):this}).filter(function(){return this.name&&!this.disabled&&(this.checked||bO.test(this.nodeName)||bI.test(this.type))}).map(function(a,b){var c=f(this).val();return c==null?null:f.isArray(c)?f.map(c,function(a,c){return{name:b.name,value:a.replace(bF,"\r\n")}}):{name:b.name,value:c.replace(bF,"\r\n")}}).get()}}),f.each("ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split(" "),function(a,b){f.fn[b]=function(a){return this.on(b,a)}}),f.each(["get","post"],function(a,c){f[c]=function(a,d,e,g){f.isFunction(d)&&(g=g||e,e=d,d=b);return f.ajax({type:c,url:a,data:d,success:e,dataType:g})}}),f.extend({getScript:function(a,c){return f.get(a,b,c,"script")},getJSON:function(a,b,c){return f.get(a,b,c,"json")},ajaxSetup:function(a,b){b?b_(a,f.ajaxSettings):(b=a,a=f.ajaxSettings),b_(a,b);return a},ajaxSettings:{url:bV,isLocal:bJ.test(bW[1]),global:!0,type:"GET",contentType:"application/x-www-form-urlencoded",processData:!0,async:!0,accepts:{xml:"application/xml, text/xml",html:"text/html",text:"text/plain",json:"application/json, text/javascript","*":bX},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText"},converters:{"* text":a.String,"text html":!0,"text json":f.parseJSON,"text xml":f.parseXML},flatOptions:{context:!0,url:!0}},ajaxPrefilter:bZ(bT),ajaxTransport:bZ(bU),ajax:function(a,c){function w(a,c,l,m){if(s!==2){s=2,q&&clearTimeout(q),p=b,n=m||"",v.readyState=a>0?4:0;var o,r,u,w=c,x=l?cb(d,v,l):b,y,z;if(a>=200&&a<300||a===304){if(d.ifModified){if(y=v.getResponseHeader("Last-Modified"))f.lastModified[k]=y;if(z=v.getResponseHeader("Etag"))f.etag[k]=z}if(a===304)w="notmodified",o=!0;else try{r=cc(d,x),w="success",o=!0}catch(A){w="parsererror",u=A}}else{u=w;if(!w||a)w="error",a<0&&(a=0)}v.status=a,v.statusText=""+(c||w),o?h.resolveWith(e,[r,w,v]):h.rejectWith(e,[v,w,u]),v.statusCode(j),j=b,t&&g.trigger("ajax"+(o?"Success":"Error"),[v,d,o?r:u]),i.fireWith(e,[v,w]),t&&(g.trigger("ajaxComplete",[v,d]),--f.active||f.event.trigger("ajaxStop"))}}typeof a=="object"&&(c=a,a=b),c=c||{};var d=f.ajaxSetup({},c),e=d.context||d,g=e!==d&&(e.nodeType||e instanceof f)?f(e):f.event,h=f.Deferred(),i=f.Callbacks("once memory"),j=d.statusCode||{},k,l={},m={},n,o,p,q,r,s=0,t,u,v={readyState:0,setRequestHeader:function(a,b){if(!s){var c=a.toLowerCase();a=m[c]=m[c]||a,l[a]=b}return this},getAllResponseHeaders:function(){return s===2?n:null},getResponseHeader:function(a){var c;if(s===2){if(!o){o={};while(c=bH.exec(n))o[c[1].toLowerCase()]=c[2]}c=o[a.toLowerCase()]}return c===b?null:c},overrideMimeType:function(a){s||(d.mimeType=a);return this},abort:function(a){a=a||"abort",p&&p.abort(a),w(0,a);return this}};h.promise(v),v.success=v.done,v.error=v.fail,v.complete=i.add,v.statusCode=function(a){if(a){var b;if(s<2)for(b in a)j[b]=[j[b],a[b]];else b=a[v.status],v.then(b,b)}return this},d.url=((a||d.url)+"").replace(bG,"").replace(bL,bW[1]+"//"),d.dataTypes=f.trim(d.dataType||"*").toLowerCase().split(bP),d.crossDomain==null&&(r=bR.exec(d.url.toLowerCase()),d.crossDomain=!(!r||r[1]==bW[1]&&r[2]==bW[2]&&(r[3]||(r[1]==="http:"?80:443))==(bW[3]||(bW[1]==="http:"?80:443)))),d.data&&d.processData&&typeof d.data!="string"&&(d.data=f.param(d.data,d.traditional)),b$(bT,d,c,v);if(s===2)return!1;t=d.global,d.type=d.type.toUpperCase(),d.hasContent=!bK.test(d.type),t&&f.active++===0&&f.event.trigger("ajaxStart");if(!d.hasContent){d.data&&(d.url+=(bM.test(d.url)?"&":"?")+d.data,delete d.data),k=d.url;if(d.cache===!1){var x=f.now(),y=d.url.replace(bQ,"$1_="+x);d.url=y+(y===d.url?(bM.test(d.url)?"&":"?")+"_="+x:"")}}(d.data&&d.hasContent&&d.contentType!==!1||c.contentType)&&v.setRequestHeader("Content-Type",d.contentType),d.ifModified&&(k=k||d.url,f.lastModified[k]&&v.setRequestHeader("If-Modified-Since",f.lastModified[k]),f.etag[k]&&v.setRequestHeader("If-None-Match",f.etag[k])),v.setRequestHeader("Accept",d.dataTypes[0]&&d.accepts[d.dataTypes[0]]?d.accepts[d.dataTypes[0]]+(d.dataTypes[0]!=="*"?", "+bX+"; q=0.01":""):d.accepts["*"]);for(u in d.headers)v.setRequestHeader(u,d.headers[u]);if(d.beforeSend&&(d.beforeSend.call(e,v,d)===!1||s===2)){v.abort();return!1}for(u in{success:1,error:1,complete:1})v[u](d[u]);p=b$(bU,d,c,v);if(!p)w(-1,"No Transport");else{v.readyState=1,t&&g.trigger("ajaxSend",[v,d]),d.async&&d.timeout>0&&(q=setTimeout(function(){v.abort("timeout")},d.timeout));try{s=1,p.send(l,w)}catch(z){if(s<2)w(-1,z);else throw z}}return v},param:function(a,c){var d=[],e=function(a,b){b=f.isFunction(b)?b():b,d[d.length]=encodeURIComponent(a)+"="+encodeURIComponent(b)};c===b&&(c=f.ajaxSettings.traditional);if(f.isArray(a)||a.jquery&&!f.isPlainObject(a))f.each(a,function(){e(this.name,this.value)});else for(var g in a)ca(g,a[g],c,e);return d.join("&").replace(bD,"+")}}),f.extend({active:0,lastModified:{},etag:{}});var cd=f.now(),ce=/(\=)\?(&|$)|\?\?/i;f.ajaxSetup({jsonp:"callback",jsonpCallback:function(){return f.expando+"_"+cd++}}),f.ajaxPrefilter("json jsonp",function(b,c,d){var e=b.contentType==="application/x-www-form-urlencoded"&&typeof b.data=="string";if(b.dataTypes[0]==="jsonp"||b.jsonp!==!1&&(ce.test(b.url)||e&&ce.test(b.data))){var g,h=b.jsonpCallback=f.isFunction(b.jsonpCallback)?b.jsonpCallback():b.jsonpCallback,i=a[h],j=b.url,k=b.data,l="$1"+h+"$2";b.jsonp!==!1&&(j=j.replace(ce,l),b.url===j&&(e&&(k=k.replace(ce,l)),b.data===k&&(j+=(/\?/.test(j)?"&":"?")+b.jsonp+"="+h))),b.url=j,b.data=k,a[h]=function(a){g=[a]},d.always(function(){a[h]=i,g&&f.isFunction(i)&&a[h](g[0])}),b.converters["script json"]=function(){g||f.error(h+" was not called");return g[0]},b.dataTypes[0]="json";return"script"}}),f.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/javascript|ecmascript/},converters:{"text script":function(a){f.globalEval(a);return a}}}),f.ajaxPrefilter("script",function(a){a.cache===b&&(a.cache=!1),a.crossDomain&&(a.type="GET",a.global=!1)}),f.ajaxTransport("script",function(a){if(a.crossDomain){var d,e=c.head||c.getElementsByTagName("head")[0]||c.documentElement;return{send:function(f,g){d=c.createElement("script"),d.async="async",a.scriptCharset&&(d.charset=a.scriptCharset),d.src=a.url,d.onload=d.onreadystatechange=function(a,c){if(c||!d.readyState||/loaded|complete/.test(d.readyState))d.onload=d.onreadystatechange=null,e&&d.parentNode&&e.removeChild(d),d=b,c||g(200,"success")},e.insertBefore(d,e.firstChild)},abort:function(){d&&d.onload(0,1)}}}});var cf=a.ActiveXObject?function(){for(var a in ch)ch[a](0,1)}:!1,cg=0,ch;f.ajaxSettings.xhr=a.ActiveXObject?function(){return!this.isLocal&&ci()||cj()}:ci,function(a){f.extend(f.support,{ajax:!!a,cors:!!a&&"withCredentials"in a})}(f.ajaxSettings.xhr()),f.support.ajax&&f.ajaxTransport(function(c){if(!c.crossDomain||f.support.cors){var d;return{send:function(e,g){var h=c.xhr(),i,j;c.username?h.open(c.type,c.url,c.async,c.username,c.password):h.open(c.type,c.url,c.async);if(c.xhrFields)for(j in c.xhrFields)h[j]=c.xhrFields[j];c.mimeType&&h.overrideMimeType&&h.overrideMimeType(c.mimeType),!c.crossDomain&&!e["X-Requested-With"]&&(e["X-Requested-With"]="XMLHttpRequest");try{for(j in e)h.setRequestHeader(j,e[j])}catch(k){}h.send(c.hasContent&&c.data||null),d=function(a,e){var j,k,l,m,n;try{if(d&&(e||h.readyState===4)){d=b,i&&(h.onreadystatechange=f.noop,cf&&delete ch[i]);if(e)h.readyState!==4&&h.abort();else{j=h.status,l=h.getAllResponseHeaders(),m={},n=h.responseXML,n&&n.documentElement&&(m.xml=n),m.text=h.responseText;try{k=h.statusText}catch(o){k=""}!j&&c.isLocal&&!c.crossDomain?j=m.text?200:404:j===1223&&(j=204)}}}catch(p){e||g(-1,p)}m&&g(j,k,m,l)},!c.async||h.readyState===4?d():(i=++cg,cf&&(ch||(ch={},f(a).unload(cf)),ch[i]=d),h.onreadystatechange=d)},abort:function(){d&&d(0,1)}}}});var ck={},cl,cm,cn=/^(?:toggle|show|hide)$/,co=/^([+\-]=)?([\d+.\-]+)([a-z%]*)$/i,cp,cq=[["height","marginTop","marginBottom","paddingTop","paddingBottom"],["width","marginLeft","marginRight","paddingLeft","paddingRight"],["opacity"]],cr;f.fn.extend({show:function(a,b,c){var d,e;if(a||a===0)return this.animate(cu("show",3),a,b,c);for(var g=0,h=this.length;g<h;g++)d=this[g],d.style&&(e=d.style.display,!f._data(d,"olddisplay")&&e==="none"&&(e=d.style.display=""),e===""&&f.css(d,"display")==="none"&&f._data(d,"olddisplay",cv(d.nodeName)));for(g=0;g<h;g++){d=this[g];if(d.style){e=d.style.display;if(e===""||e==="none")d.style.display=f._data(d,"olddisplay")||""}}return this},hide:function(a,b,c){if(a||a===0)return this.animate(cu("hide",3),a,b,c);var d,e,g=0,h=this.length;for(;g<h;g++)d=this[g],d.style&&(e=f.css(d,"display"),e!=="none"&&!f._data(d,"olddisplay")&&f._data(d,"olddisplay",e));for(g=0;g<h;g++)this[g].style&&(this[g].style.display="none");return this},_toggle:f.fn.toggle,toggle:function(a,b,c){var d=typeof a=="boolean";f.isFunction(a)&&f.isFunction(b)?this._toggle.apply(this,arguments):a==null||d?this.each(function(){var b=d?a:f(this).is(":hidden");f(this)[b?"show":"hide"]()}):this.animate(cu("toggle",3),a,b,c);return this},fadeTo:function(a,b,c,d){return this.filter(":hidden").css("opacity",0).show().end().animate({opacity:b},a,c,d)},animate:function(a,b,c,d){function g(){e.queue===!1&&f._mark(this);var b=f.extend({},e),c=this.nodeType===1,d=c&&f(this).is(":hidden"),g,h,i,j,k,l,m,n,o;b.animatedProperties={};for(i in a){g=f.camelCase(i),i!==g&&(a[g]=a[i],delete a[i]),h=a[g],f.isArray(h)?(b.animatedProperties[g]=h[1],h=a[g]=h[0]):b.animatedProperties[g]=b.specialEasing&&b.specialEasing[g]||b.easing||"swing";if(h==="hide"&&d||h==="show"&&!d)return b.complete.call(this);c&&(g==="height"||g==="width")&&(b.overflow=[this.style.overflow,this.style.overflowX,this.style.overflowY],f.css(this,"display")==="inline"&&f.css(this,"float")==="none"&&(!f.support.inlineBlockNeedsLayout||cv(this.nodeName)==="inline"?this.style.display="inline-block":this.style.zoom=1))}b.overflow!=null&&(this.style.overflow="hidden");for(i in a)j=new f.fx(this,b,i),h=a[i],cn.test(h)?(o=f._data(this,"toggle"+i)||(h==="toggle"?d?"show":"hide":0),o?(f._data(this,"toggle"+i,o==="show"?"hide":"show"),j[o]()):j[h]()):(k=co.exec(h),l=j.cur(),k?(m=parseFloat(k[2]),n=k[3]||(f.cssNumber[i]?"":"px"),n!=="px"&&(f.style(this,i,(m||1)+n),l=(m||1)/j.cur()*l,f.style(this,i,l+n)),k[1]&&(m=(k[1]==="-="?-1:1)*m+l),j.custom(l,m,n)):j.custom(l,h,""));return!0}var e=f.speed(b,c,d);if(f.isEmptyObject(a))return this.each(e.complete,[!1]);a=f.extend({},a);return e.queue===!1?this.each(g):this.queue(e.queue,g)},stop:function(a,c,d){typeof a!="string"&&(d=c,c=a,a=b),c&&a!==!1&&this.queue(a||"fx",[]);return this.each(function(){function h(a,b,c){var e=b[c];f.removeData(a,c,!0),e.stop(d)}var b,c=!1,e=f.timers,g=f._data(this);d||f._unmark(!0,this);if(a==null)for(b in g)g[b]&&g[b].stop&&b.indexOf(".run")===b.length-4&&h(this,g,b);else g[b=a+".run"]&&g[b].stop&&h(this,g,b);for(b=e.length;b--;)e[b].elem===this&&(a==null||e[b].queue===a)&&(d?e[b](!0):e[b].saveState(),c=!0,e.splice(b,1));(!d||!c)&&f.dequeue(this,a)})}}),f.each({slideDown:cu("show",1),slideUp:cu("hide",1),slideToggle:cu("toggle",1),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(a,b){f.fn[a]=function(a,c,d){return this.animate(b,a,c,d)}}),f.extend({speed:function(a,b,c){var d=a&&typeof a=="object"?f.extend({},a):{complete:c||!c&&b||f.isFunction(a)&&a,duration:a,easing:c&&b||b&&!f.isFunction(b)&&b};d.duration=f.fx.off?0:typeof d.duration=="number"?d.duration:d.duration in f.fx.speeds?f.fx.speeds[d.duration]:f.fx.speeds._default;if(d.queue==null||d.queue===!0)d.queue="fx";d.old=d.complete,d.complete=function(a){f.isFunction(d.old)&&d.old.call(this),d.queue?f.dequeue(this,d.queue):a!==!1&&f._unmark(this)};return d},easing:{linear:function(a,b,c,d){return c+d*a},swing:function(a,b,c,d){return(-Math.cos(a*Math.PI)/2+.5)*d+c}},timers:[],fx:function(a,b,c){this.options=b,this.elem=a,this.prop=c,b.orig=b.orig||{}}}),f.fx.prototype={update:function(){this.options.step&&this.options.step.call(this.elem,this.now,this),(f.fx.step[this.prop]||f.fx.step._default)(this)},cur:function(){if(this.elem[this.prop]!=null&&(!this.elem.style||this.elem.style[this.prop]==null))return this.elem[this.prop];var a,b=f.css(this.elem,this.prop);return isNaN(a=parseFloat(b))?!b||b==="auto"?0:b:a},custom:function(a,c,d){function h(a){return e.step(a)}var e=this,g=f.fx;this.startTime=cr||cs(),this.end=c,this.now=this.start=a,this.pos=this.state=0,this.unit=d||this.unit||(f.cssNumber[this.prop]?"":"px"),h.queue=this.options.queue,h.elem=this.elem,h.saveState=function(){e.options.hide&&f._data(e.elem,"fxshow"+e.prop)===b&&f._data(e.elem,"fxshow"+e.prop,e.start)},h()&&f.timers.push(h)&&!cp&&(cp=setInterval(g.tick,g.interval))},show:function(){var a=f._data(this.elem,"fxshow"+this.prop);this.options.orig[this.prop]=a||f.style(this.elem,this.prop),this.options.show=!0,a!==b?this.custom(this.cur(),a):this.custom(this.prop==="width"||this.prop==="height"?1:0,this.cur()),f(this.elem).show()},hide:function(){this.options.orig[this.prop]=f._data(this.elem,"fxshow"+this.prop)||f.style(this.elem,this.prop),this.options.hide=!0,this.custom(this.cur(),0)},step:function(a){var b,c,d,e=cr||cs(),g=!0,h=this.elem,i=this.options;if(a||e>=i.duration+this.startTime){this.now=this.end,this.pos=this.state=1,this.update(),i.animatedProperties[this.prop]=!0;for(b in i.animatedProperties)i.animatedProperties[b]!==!0&&(g=!1);if(g){i.overflow!=null&&!f.support.shrinkWrapBlocks&&f.each(["","X","Y"],function(a,b){h.style["overflow"+b]=i.overflow[a]}),i.hide&&f(h).hide();if(i.hide||i.show)for(b in i.animatedProperties)f.style(h,b,i.orig[b]),f.removeData(h,"fxshow"+b,!0),f.removeData(h,"toggle"+b,!0);d=i.complete,d&&(i.complete=!1,d.call(h))}return!1}i.duration==Infinity?this.now=e:(c=e-this.startTime,this.state=c/i.duration,this.pos=f.easing[i.animatedProperties[this.prop]](this.state,c,0,1,i.duration),this.now=this.start+(this.end-this.start)*this.pos),this.update();return!0}},f.extend(f.fx,{tick:function(){var a,b=f.timers,c=0;for(;c<b.length;c++)a=b[c],!a()&&b[c]===a&&b.splice(c--,1);b.length||f.fx.stop()},interval:13,stop:function(){clearInterval(cp),cp=null},speeds:{slow:600,fast:200,_default:400},step:{opacity:function(a){f.style(a.elem,"opacity",a.now)},_default:function(a){a.elem.style&&a.elem.style[a.prop]!=null?a.elem.style[a.prop]=a.now+a.unit:a.elem[a.prop]=a.now}}}),f.each(["width","height"],function(a,b){f.fx.step[b]=function(a){f.style(a.elem,b,Math.max(0,a.now)+a.unit)}}),f.expr&&f.expr.filters&&(f.expr.filters.animated=function(a){return f.grep(f.timers,function(b){return a===b.elem}).length});var cw=/^t(?:able|d|h)$/i,cx=/^(?:body|html)$/i;"getBoundingClientRect"in c.documentElement?f.fn.offset=function(a){var b=this[0],c;if(a)return this.each(function(b){f.offset.setOffset(this,a,b)});if(!b||!b.ownerDocument)return null;if(b===b.ownerDocument.body)return f.offset.bodyOffset(b);try{c=b.getBoundingClientRect()}catch(d){}var e=b.ownerDocument,g=e.documentElement;if(!c||!f.contains(g,b))return c?{top:c.top,left:c.left}:{top:0,left:0};var h=e.body,i=cy(e),j=g.clientTop||h.clientTop||0,k=g.clientLeft||h.clientLeft||0,l=i.pageYOffset||f.support.boxModel&&g.scrollTop||h.scrollTop,m=i.pageXOffset||f.support.boxModel&&g.scrollLeft||h.scrollLeft,n=c.top+l-j,o=c.left+m-k;return{top:n,left:o}}:f.fn.offset=function(a){var b=this[0];if(a)return this.each(function(b){f.offset.setOffset(this,a,b)});if(!b||!b.ownerDocument)return null;if(b===b.ownerDocument.body)return f.offset.bodyOffset(b);var c,d=b.offsetParent,e=b,g=b.ownerDocument,h=g.documentElement,i=g.body,j=g.defaultView,k=j?j.getComputedStyle(b,null):b.currentStyle,l=b.offsetTop,m=b.offsetLeft;while((b=b.parentNode)&&b!==i&&b!==h){if(f.support.fixedPosition&&k.position==="fixed")break;c=j?j.getComputedStyle(b,null):b.currentStyle,l-=b.scrollTop,m-=b.scrollLeft,b===d&&(l+=b.offsetTop,m+=b.offsetLeft,f.support.doesNotAddBorder&&(!f.support.doesAddBorderForTableAndCells||!cw.test(b.nodeName))&&(l+=parseFloat(c.borderTopWidth)||0,m+=parseFloat(c.borderLeftWidth)||0),e=d,d=b.offsetParent),f.support.subtractsBorderForOverflowNotVisible&&c.overflow!=="visible"&&(l+=parseFloat(c.borderTopWidth)||0,m+=parseFloat(c.borderLeftWidth)||0),k=c}if(k.position==="relative"||k.position==="static")l+=i.offsetTop,m+=i.offsetLeft;f.support.fixedPosition&&k.position==="fixed"&&(l+=Math.max(h.scrollTop,i.scrollTop),m+=Math.max(h.scrollLeft,i.scrollLeft));return{top:l,left:m}},f.offset={bodyOffset:function(a){var b=a.offsetTop,c=a.offsetLeft;f.support.doesNotIncludeMarginInBodyOffset&&(b+=parseFloat(f.css(a,"marginTop"))||0,c+=parseFloat(f.css(a,"marginLeft"))||0);return{top:b,left:c}},setOffset:function(a,b,c){var d=f.css(a,"position");d==="static"&&(a.style.position="relative");var e=f(a),g=e.offset(),h=f.css(a,"top"),i=f.css(a,"left"),j=(d==="absolute"||d==="fixed")&&f.inArray("auto",[h,i])>-1,k={},l={},m,n;j?(l=e.position(),m=l.top,n=l.left):(m=parseFloat(h)||0,n=parseFloat(i)||0),f.isFunction(b)&&(b=b.call(a,c,g)),b.top!=null&&(k.top=b.top-g.top+m),b.left!=null&&(k.left=b.left-g.left+n),"using"in b?b.using.call(a,k):e.css(k)}},f.fn.extend({position:function(){if(!this[0])return null;var a=this[0],b=this.offsetParent(),c=this.offset(),d=cx.test(b[0].nodeName)?{top:0,left:0}:b.offset();c.top-=parseFloat(f.css(a,"marginTop"))||0,c.left-=parseFloat(f.css(a,"marginLeft"))||0,d.top+=parseFloat(f.css(b[0],"borderTopWidth"))||0,d.left+=parseFloat(f.css(b[0],"borderLeftWidth"))||0;return{top:c.top-d.top,left:c.left-d.left}},offsetParent:function(){return this.map(function(){var a=this.offsetParent||c.body;while(a&&!cx.test(a.nodeName)&&f.css(a,"position")==="static")a=a.offsetParent;return a})}}),f.each(["Left","Top"],function(a,c){var d="scroll"+c;f.fn[d]=function(c){var e,g;if(c===b){e=this[0];if(!e)return null;g=cy(e);return g?"pageXOffset"in g?g[a?"pageYOffset":"pageXOffset"]:f.support.boxModel&&g.document.documentElement[d]||g.document.body[d]:e[d]}return this.each(function(){g=cy(this),g?g.scrollTo(a?f(g).scrollLeft():c,a?c:f(g).scrollTop()):this[d]=c})}}),f.each(["Height","Width"],function(a,c){var d=c.toLowerCase();f.fn["inner"+c]=function(){var a=this[0];return a?a.style?parseFloat(f.css(a,d,"padding")):this[d]():null},f.fn["outer"+c]=function(a){var b=this[0];return b?b.style?parseFloat(f.css(b,d,a?"margin":"border")):this[d]():null},f.fn[d]=function(a){var e=this[0];if(!e)return a==null?null:this;if(f.isFunction(a))return this.each(function(b){var c=f(this);c[d](a.call(this,b,c[d]()))});if(f.isWindow(e)){var g=e.document.documentElement["client"+c],h=e.document.body;return e.document.compatMode==="CSS1Compat"&&g||h&&h["client"+c]||g}if(e.nodeType===9)return Math.max(e.documentElement["client"+c],e.body["scroll"+c],e.documentElement["scroll"+c],e.body["offset"+c],e.documentElement["offset"+c]);if(a===b){var i=f.css(e,d),j=parseFloat(i);return f.isNumeric(j)?j:i}return this.css(d,typeof a=="string"?a:a+"px")}}),a.jQuery=a.$=f,typeof define=="function"&&define.amd&&define.amd.jQuery&&define("jquery",[],function(){return f})})(window);
/*!

 handlebars v1.1.2

Copyright (C) 2011 by Yehuda Katz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

@license
*/
var Handlebars = (function() {
// handlebars/safe-string.js
var __module3__ = (function() {
  "use strict";
  var __exports__;
  // Build out our basic SafeString type
  function SafeString(string) {
    this.string = string;
  }

  SafeString.prototype.toString = function() {
    return "" + this.string;
  };

  __exports__ = SafeString;
  return __exports__;
})();

// handlebars/utils.js
var __module2__ = (function(__dependency1__) {
  "use strict";
  var __exports__ = {};
  var SafeString = __dependency1__;

  var escape = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "`": "&#x60;"
  };

  var badChars = /[&<>"'`]/g;
  var possible = /[&<>"'`]/;

  function escapeChar(chr) {
    return escape[chr] || "&amp;";
  }

  function extend(obj, value) {
    for(var key in value) {
      if(value.hasOwnProperty(key)) {
        obj[key] = value[key];
      }
    }
  }

  __exports__.extend = extend;var toString = Object.prototype.toString;
  __exports__.toString = toString;
  // Sourced from lodash
  // https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
  var isFunction = function(value) {
    return typeof value === 'function';
  };
  // fallback for older versions of Chrome and Safari
  if (isFunction(/x/)) {
    isFunction = function(value) {
      return typeof value === 'function' && toString.call(value) === '[object Function]';
    };
  }
  var isFunction;
  __exports__.isFunction = isFunction;
  var isArray = Array.isArray || function(value) {
    return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
  };
  __exports__.isArray = isArray;

  function escapeExpression(string) {
    // don't escape SafeStrings, since they're already safe
    if (string instanceof SafeString) {
      return string.toString();
    } else if (!string && string !== 0) {
      return "";
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = "" + string;

    if(!possible.test(string)) { return string; }
    return string.replace(badChars, escapeChar);
  }

  __exports__.escapeExpression = escapeExpression;function isEmpty(value) {
    if (!value && value !== 0) {
      return true;
    } else if (isArray(value) && value.length === 0) {
      return true;
    } else {
      return false;
    }
  }

  __exports__.isEmpty = isEmpty;
  return __exports__;
})(__module3__);

// handlebars/exception.js
var __module4__ = (function() {
  "use strict";
  var __exports__;

  var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

  function Exception(/* message */) {
    var tmp = Error.prototype.constructor.apply(this, arguments);

    // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
    for (var idx = 0; idx < errorProps.length; idx++) {
      this[errorProps[idx]] = tmp[errorProps[idx]];
    }
  }

  Exception.prototype = new Error();

  __exports__ = Exception;
  return __exports__;
})();

// handlebars/base.js
var __module1__ = (function(__dependency1__, __dependency2__) {
  "use strict";
  var __exports__ = {};
  /*globals Exception, Utils */
  var Utils = __dependency1__;
  var Exception = __dependency2__;

  var VERSION = "1.1.2";
  __exports__.VERSION = VERSION;var COMPILER_REVISION = 4;
  __exports__.COMPILER_REVISION = COMPILER_REVISION;
  var REVISION_CHANGES = {
    1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
    2: '== 1.0.0-rc.3',
    3: '== 1.0.0-rc.4',
    4: '>= 1.0.0'
  };
  __exports__.REVISION_CHANGES = REVISION_CHANGES;
  var isArray = Utils.isArray,
      isFunction = Utils.isFunction,
      toString = Utils.toString,
      objectType = '[object Object]';

  function HandlebarsEnvironment(helpers, partials) {
    this.helpers = helpers || {};
    this.partials = partials || {};

    registerDefaultHelpers(this);
  }

  __exports__.HandlebarsEnvironment = HandlebarsEnvironment;HandlebarsEnvironment.prototype = {
    constructor: HandlebarsEnvironment,

    logger: logger,
    log: log,

    registerHelper: function(name, fn, inverse) {
      if (toString.call(name) === objectType) {
        if (inverse || fn) { throw new Exception('Arg not supported with multiple helpers'); }
        Utils.extend(this.helpers, name);
      } else {
        if (inverse) { fn.not = inverse; }
        this.helpers[name] = fn;
      }
    },

    registerPartial: function(name, str) {
      if (toString.call(name) === objectType) {
        Utils.extend(this.partials,  name);
      } else {
        this.partials[name] = str;
      }
    }
  };

  function registerDefaultHelpers(instance) {
    instance.registerHelper('helperMissing', function(arg) {
      if(arguments.length === 2) {
        return undefined;
      } else {
        throw new Error("Missing helper: '" + arg + "'");
      }
    });

    instance.registerHelper('blockHelperMissing', function(context, options) {
      var inverse = options.inverse || function() {}, fn = options.fn;

      if (isFunction(context)) { context = context.call(this); }

      if(context === true) {
        return fn(this);
      } else if(context === false || context == null) {
        return inverse(this);
      } else if (isArray(context)) {
        if(context.length > 0) {
          return instance.helpers.each(context, options);
        } else {
          return inverse(this);
        }
      } else {
        return fn(context);
      }
    });

    instance.registerHelper('each', function(context, options) {
      var fn = options.fn, inverse = options.inverse;
      var i = 0, ret = "", data;

      if (isFunction(context)) { context = context.call(this); }

      if (options.data) {
        data = createFrame(options.data);
      }

      if(context && typeof context === 'object') {
        if (isArray(context)) {
          for(var j = context.length; i<j; i++) {
            if (data) {
              data.index = i;
              data.first = (i === 0)
              data.last  = (i === (context.length-1));
            }
            ret = ret + fn(context[i], { data: data });
          }
        } else {
          for(var key in context) {
            if(context.hasOwnProperty(key)) {
              if(data) { data.key = key; }
              ret = ret + fn(context[key], {data: data});
              i++;
            }
          }
        }
      }

      if(i === 0){
        ret = inverse(this);
      }

      return ret;
    });

    instance.registerHelper('if', function(conditional, options) {
      if (isFunction(conditional)) { conditional = conditional.call(this); }

      // Default behavior is to render the positive path if the value is truthy and not empty.
      // The `includeZero` option may be set to treat the condtional as purely not empty based on the
      // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
      if ((!options.hash.includeZero && !conditional) || Utils.isEmpty(conditional)) {
        return options.inverse(this);
      } else {
        return options.fn(this);
      }
    });

    instance.registerHelper('unless', function(conditional, options) {
      return instance.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn, hash: options.hash});
    });

    instance.registerHelper('with', function(context, options) {
      if (isFunction(context)) { context = context.call(this); }

      if (!Utils.isEmpty(context)) return options.fn(context);
    });

    instance.registerHelper('log', function(context, options) {
      var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
      instance.log(level, context);
    });
  }

  var logger = {
    methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

    // State enum
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    level: 3,

    // can be overridden in the host environment
    log: function(level, obj) {
      if (logger.level <= level) {
        var method = logger.methodMap[level];
        if (typeof console !== 'undefined' && console[method]) {
          console[method].call(console, obj);
        }
      }
    }
  };
  __exports__.logger = logger;
  function log(level, obj) { logger.log(level, obj); }

  __exports__.log = log;var createFrame = function(object) {
    var obj = {};
    Utils.extend(obj, object);
    return obj;
  };
  __exports__.createFrame = createFrame;
  return __exports__;
})(__module2__, __module4__);

// handlebars/runtime.js
var __module5__ = (function(__dependency1__, __dependency2__, __dependency3__) {
  "use strict";
  var __exports__ = {};
  /*global Utils */
  var Utils = __dependency1__;
  var Exception = __dependency2__;
  var COMPILER_REVISION = __dependency3__.COMPILER_REVISION;
  var REVISION_CHANGES = __dependency3__.REVISION_CHANGES;

  function checkRevision(compilerInfo) {
    var compilerRevision = compilerInfo && compilerInfo[0] || 1,
        currentRevision = COMPILER_REVISION;

    if (compilerRevision !== currentRevision) {
      if (compilerRevision < currentRevision) {
        var runtimeVersions = REVISION_CHANGES[currentRevision],
            compilerVersions = REVISION_CHANGES[compilerRevision];
        throw new Error("Template was precompiled with an older version of Handlebars than the current runtime. "+
              "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
      } else {
        // Use the embedded version info since the runtime doesn't know about this revision yet
        throw new Error("Template was precompiled with a newer version of Handlebars than the current runtime. "+
              "Please update your runtime to a newer version ("+compilerInfo[1]+").");
      }
    }
  }

  // TODO: Remove this line and break up compilePartial

  function template(templateSpec, env) {
    if (!env) {
      throw new Error("No environment passed to template");
    }

    var invokePartialWrapper;
    if (env.compile) {
      invokePartialWrapper = function(partial, name, context, helpers, partials, data) {
        // TODO : Check this for all inputs and the options handling (partial flag, etc). This feels
        // like there should be a common exec path
        var result = invokePartial.apply(this, arguments);
        if (result) { return result; }

        var options = { helpers: helpers, partials: partials, data: data };
        partials[name] = env.compile(partial, { data: data !== undefined }, env);
        return partials[name](context, options);
      };
    } else {
      invokePartialWrapper = function(partial, name /* , context, helpers, partials, data */) {
        var result = invokePartial.apply(this, arguments);
        if (result) { return result; }
        throw new Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
      };
    }

    // Just add water
    var container = {
      escapeExpression: Utils.escapeExpression,
      invokePartial: invokePartialWrapper,
      programs: [],
      program: function(i, fn, data) {
        var programWrapper = this.programs[i];
        if(data) {
          programWrapper = program(i, fn, data);
        } else if (!programWrapper) {
          programWrapper = this.programs[i] = program(i, fn);
        }
        return programWrapper;
      },
      merge: function(param, common) {
        var ret = param || common;

        if (param && common && (param !== common)) {
          ret = {};
          Utils.extend(ret, common);
          Utils.extend(ret, param);
        }
        return ret;
      },
      programWithDepth: programWithDepth,
      noop: noop,
      compilerInfo: null
    };

    return function(context, options) {
      options = options || {};
      var namespace = options.partial ? options : env,
          helpers,
          partials;

      if (!options.partial) {
        helpers = options.helpers;
        partials = options.partials;
      }
      var result = templateSpec.call(
            container,
            namespace, context,
            helpers,
            partials,
            options.data);

      if (!options.partial) {
        checkRevision(container.compilerInfo);
      }

      return result;
    };
  }

  __exports__.template = template;function programWithDepth(i, fn, data /*, $depth */) {
    var args = Array.prototype.slice.call(arguments, 3);

    var prog = function(context, options) {
      options = options || {};

      return fn.apply(this, [context, options.data || data].concat(args));
    };
    prog.program = i;
    prog.depth = args.length;
    return prog;
  }

  __exports__.programWithDepth = programWithDepth;function program(i, fn, data) {
    var prog = function(context, options) {
      options = options || {};

      return fn(context, options.data || data);
    };
    prog.program = i;
    prog.depth = 0;
    return prog;
  }

  __exports__.program = program;function invokePartial(partial, name, context, helpers, partials, data) {
    var options = { partial: true, helpers: helpers, partials: partials, data: data };

    if(partial === undefined) {
      throw new Exception("The partial " + name + " could not be found");
    } else if(partial instanceof Function) {
      return partial(context, options);
    }
  }

  __exports__.invokePartial = invokePartial;function noop() { return ""; }

  __exports__.noop = noop;
  return __exports__;
})(__module2__, __module4__, __module1__);

// handlebars.runtime.js
var __module0__ = (function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__) {
  "use strict";
  var __exports__;
  var base = __dependency1__;

  // Each of these augment the Handlebars object. No need to setup here.
  // (This is done to easily share code between commonjs and browse envs)
  var SafeString = __dependency2__;
  var Exception = __dependency3__;
  var Utils = __dependency4__;
  var runtime = __dependency5__;

  // For compatibility and usage outside of module systems, make the Handlebars object a namespace
  var create = function() {
    var hb = new base.HandlebarsEnvironment();

    Utils.extend(hb, base);
    hb.SafeString = SafeString;
    hb.Exception = Exception;
    hb.Utils = Utils;

    hb.VM = runtime;
    hb.template = function(spec) {
      return runtime.template(spec, hb);
    };

    return hb;
  };

  var Handlebars = create();
  Handlebars.create = create;

  __exports__ = Handlebars;
  return __exports__;
})(__module1__, __module3__, __module4__, __module2__, __module5__);

  return __module0__;
})();

this["JST"] = this["JST"] || {};

this["JST"]["dialog.hbs"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "<img src=\"";
  if (stack1 = helpers.image) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.image); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "\">";
  return buffer;
  }

  stack1 = helpers['if'].call(depth0, (depth0 && depth0.image), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  });

this["JST"]["livescore.hbs"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"live-score\"><div>\n  <div class=\"score visited\">Visited <div>0</div></div>\n  <div class=\"score resource\">Resource Total <div>0</div></div>\n  <div class=\"score survived-for\">Since last report <div>0:00.00</div></div>\n</div></div>\n";
  });

this["JST"]["storyend.hbs"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"story-end\"><div>\n  <div>\n    <a class=\"story-end-hide\" href=\"#\" onclick=\"$('.story-end-1, .story-end-hide').hide(); $('.story-end-show').show(); return false;\">hide</a>\n    <a style=\"display:none\" class=\"story-end-show\" href=\"#\" onclick=\"$('.story-end-1, .story-end-hide').show(); $('.story-end-show').hide(); return false;\">show</a>\n  </div>\n\n  <div class=\"story-end-1\">\n  <p>Space Anomaly 3122D - Report 6</p>\n\n  <p>Time is short ...</p>\n\n  <p>I hope you find this capsule. The data I have found should be useful.</p>\n\n  <p>Goodbye.</p>\n\n  <!-- <p>It feels like I can taste the vacuum outside, but I know my brain is just playing tricks on me.</p> -->\n\n  <p>- Theresa<br>\n  -- END OF ENTRY --</p>\n  </div>\n\n  <div class=\"final-score\">\n    <div class=\"score visited\">Visited <div>0</div></div>\n    <div class=\"score resource\">Resource Total <div>0</div></div>\n    <div class=\"score survived-for\">Survived For <div>0:00.00</div></div>\n  </div>\n\n  <div class=\"click-to-dismiss\"><a href=\"#\" onclick=\"location.reload();return false;\">Click to Play Again</a></div>\n</div></div>\n";
  });

this["JST"]["storystart.hbs"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"story-start\"><div>\n  <p>Space Anomaly 3122D - Report 5</p>\n\n  <p>The hole in space we found was not what we expected. We had sent probes through to here and thoroughly analyzed the data that came back. It was confusing though. The strange thing was, the only observable matter visibly was that that the probe was at that time touching.</p>\n\n  <p>Eventually each probe returned to us, but I have not been able to discover any exit. My oxygen supply is running short and it is growing tough to find resources to power the oxygen scrubber that I have left at the location I entered this exotic space at. I fear I will die here.</p>\n\n  <p>However I am not letting this get me down. This is an amazing place I never would have imagined that I would get to explore. I will continue to collect data and strive to return so that I may give my report in person instead of these datams I leave for whoever may ... well, best not jinx myself.</p>\n\n  <p>- Theresa<br>\n  -- END OF ENTRY --</p>\n\n  <div class=\"click-to-dismiss\">Click To Dismiss</div>\n</div></div>\n";
  });
if ( !window.SP ) {
  var SP = window.SP = {};
}

if ( !SP.pauseSpaceLeaper ) {
  SP.pauseSpaceLeaper = function() {};
}
if ( !SP.resumeSpaceLeaper ) {
  SP.resumeSpaceLeaper = function() {};
}
if ( !SP.setSpaceLeaperEndCallback ) {
  SP.setSpaceLeaperEndCallback = function() {};
}
if ( !SP.setSpaceLeaperVisitedCallback ) {
  SP.setSpaceLeaperVisitedCallback = function() {};
}
if ( !SP.setSpaceLeaperResourceCallback ) {
  SP.setSpaceLeaperResourceCallback = function() {};
}

if ( window.Module ) {
  SP.requestAnimationFrame = Module.requestAnimationFrame;

  SP.pauseSpaceLeaper = Module.cwrap('pauseSpaceLeaper', 'undefined', []);
  SP.resumeSpaceLeaper = Module.cwrap('resumeSpaceLeaper', 'undefined', []);
  SP.setSpaceLeaperEndCallback =
    Module.cwrap('setSpaceLeaperEndCallback', 'undefined', ['number']);
  SP.setSpaceLeaperVisitedCallback =
    Module.cwrap('setSpaceLeaperVisitedCallback', 'undefined', ['number']);
  SP.setSpaceLeaperResourceCallback =
    Module.cwrap('setSpaceLeaperResourceCallback', 'undefined', ['number']);
}

require=(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){

},{}],"src/platform/web/bean.ui":[function(require,module,exports){
module.exports=require('YrFPKj');
},{}],"YrFPKj":[function(require,module,exports){
var Dialog = require( 'src/ui/dialog' );

// SP.pauseSpaceLeaper();

_gaq.push(['_trackEvent','Bean','Version','1.0']);

},{"src/ui/dialog":"FVpzu8"}],"jst":[function(require,module,exports){
module.exports=require('IrjS0M');
},{}],"IrjS0M":[function(require,module,exports){
this["JST"] = this["JST"] || {};

this["JST"]["dialog.hbs"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "<img src=\"";
  if (stack1 = helpers.image) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.image); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "\">";
  return buffer;
  }

  stack1 = helpers['if'].call(depth0, (depth0 && depth0.image), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  });

this["JST"]["livescore.hbs"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"live-score\"><div>\n  <div class=\"score visited\">Visited <div>0</div></div>\n  <div class=\"score resource\">Resource Total <div>0</div></div>\n  <div class=\"score survived-for\">Since last report <div>0:00.00</div></div>\n</div></div>\n";
  });

this["JST"]["storyend.hbs"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"story-end\"><div>\n  <div>\n    <a class=\"story-end-hide\" href=\"#\" onclick=\"$('.story-end-1, .story-end-hide').hide(); $('.story-end-show').show(); return false;\">hide</a>\n    <a style=\"display:none\" class=\"story-end-show\" href=\"#\" onclick=\"$('.story-end-1, .story-end-hide').show(); $('.story-end-show').hide(); return false;\">show</a>\n  </div>\n\n  <div class=\"story-end-1\">\n  <p>Space Anomaly 3122D - Report 6</p>\n\n  <p>Time is short ...</p>\n\n  <p>I hope you find this capsule. The data I have found should be useful.</p>\n\n  <p>Goodbye.</p>\n\n  <!-- <p>It feels like I can taste the vacuum outside, but I know my brain is just playing tricks on me.</p> -->\n\n  <p>- Theresa<br>\n  -- END OF ENTRY --</p>\n  </div>\n\n  <div class=\"final-score\">\n    <div class=\"score visited\">Visited <div>0</div></div>\n    <div class=\"score resource\">Resource Total <div>0</div></div>\n    <div class=\"score survived-for\">Survived For <div>0:00.00</div></div>\n  </div>\n\n  <div class=\"click-to-dismiss\"><a href=\"#\" onclick=\"location.reload();return false;\">Click to Play Again</a></div>\n</div></div>\n";
  });

this["JST"]["storystart.hbs"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"story-start\"><div>\n  <p>Space Anomaly 3122D - Report 5</p>\n\n  <p>The hole in space we found was not what we expected. We had sent probes through to here and thoroughly analyzed the data that came back. It was confusing though. The strange thing was, the only observable matter visibly was that that the probe was at that time touching.</p>\n\n  <p>Eventually each probe returned to us, but I have not been able to discover any exit. My oxygen supply is running short and it is growing tough to find resources to power the oxygen scrubber that I have left at the location I entered this exotic space at. I fear I will die here.</p>\n\n  <p>However I am not letting this get me down. This is an amazing place I never would have imagined that I would get to explore. I will continue to collect data and strive to return so that I may give my report in person instead of these datams I leave for whoever may ... well, best not jinx myself.</p>\n\n  <p>- Theresa<br>\n  -- END OF ENTRY --</p>\n\n  <div class=\"click-to-dismiss\">Click To Dismiss</div>\n</div></div>\n";
  });
},{}],"src/platform/web/audiocontext":[function(require,module,exports){
module.exports=require('ExmBZz');
},{}],"ExmBZz":[function(require,module,exports){
var AQAudioContext;

(function() {
  var diskette = null;

  AQAudioContext = function _AQAudioContext() {
    this.id = AQAudioContext.prototype._nextId++;
    AQAudioContext.contexts[ this.id ] = this;

    this.nextBufferId = 0;
    this.buffers = {};
    this.nextSourceId = 0;
    this.sources = {};

    this.chainPromise = when();

    var contextConstructor = (
      window.webkitAudioContext || window.mozAudioContext || window.AudioContext
    );

    if ( !contextConstructor ) {
      console.error( 'WebAudio is not supported. Sound will not be played.' );
      return;
    }

    this.webAudioContext = new contextConstructor();

    this.webAudioDestination = this.webAudioContext.destination;

    this.webAudioDynamics = this.webAudioContext.createDynamicsCompressor();
    this.webAudioDynamics.connect( this.webAudioDestination );

    this.webAudioMasterGain = this.webAudioContext.createGain();
    this.webAudioMasterGain.connect( this.webAudioDynamics );

    this.targetNode = this.webAudioMasterGain;
  };

  AQAudioContext.prototype._nextId = 0;

  AQAudioContext.contexts = {};

  AQAudioContext.context = function( id ) {
    return this.contexts[ id ];
  };

  AQAudioContext.prototype._initDiskette = function() {
    if ( !this.webAudioContext ) {
      return {
        read: function() {
          return when.defer().promise;
        }
      };
    }

    if ( diskette === null ) {
      diskette = new Diskette();
      diskette.config( 'diskette.json' );
    }
    return diskette;
  };

  AQAudioContext.prototype._chain = function( promise ) {
    this.chainPromise = when.all([ this.chainPromise, promise ]);
    return this.chainPromise;
  };

  AQAudioContext.prototype.done = function() {};

  AQAudioContext.prototype.setListenerPosition = function( x, y ) {
    if ( this.webAudioContext ) {
      this.webAudioContext.listener.setPosition( x, y, 0 );
    }
  };

  AQAudioContext.prototype.createBuffer = function( path ) {
    var self = this;
    var bufferId = self.nextBufferId++;

    var bufferData = {
      id: bufferId,
      buffer: null
    };
    self.buffers[ bufferId ] = bufferData;

    this._chain(
      self._initDiskette().read( path, 'arraybuffer' ).then(function( data ) {
        var defer = when.defer();
        if ( self.webAudioContext ) {
          self.webAudioContext.decodeAudioData( data, function( buffer ) {
            bufferData.buffer = buffer;
            defer.resolve( bufferData );
          }, defer.reject );
        }
        return defer.promise;
      })
    );

    return bufferData;
  };

  AQAudioContext.prototype.deleteBuffer = function( buffer ) {
    var self = this;
    self.chainPromise.then(function() {
      delete self.buffers[ buffer.id ];
      delete self.bufferData[ buffer.id ];
    });
  };

  AQAudioContext.prototype.createSource = function() {
    var source = new AQAudioSource( this );
    this.sources[ source.id ] = source;
    return source;
  };

  AQAudioContext.prototype.deleteSource = function( source ) {
    delete this.sources[ source.id ];
  };

  AQAudioContext.prototype.buffer = function( id ) {
    return this.buffers[ id ];
  };

  AQAudioContext.prototype.source = function( id ) {
    return this.sources[ id ];
  };

  function AQAudioSource( ctx ) {
    this.id = ctx.nextSourceId++;
    this.context = ctx;

    this.playing = false;

    if ( !ctx.webAudioContext ) {
      return;
    }

    this.sourceNode = ctx.webAudioContext.createBufferSource();
    this.sourceNode.onended = function() {
      this.playing = false;
    }.bind( this );

    this.pannerNode = null;
    this.gainNode = null;

    this.playNode = this.sourceNode;
  }

  AQAudioSource.prototype.isPlaying = function() {
    return this.playing;
  };

  AQAudioSource.prototype.setBuffer = function( buffer ) {
    if ( buffer.buffer !== null ) {
      this.sourceNode.buffer = buffer.buffer;
    }
  };

  AQAudioSource.prototype.setPosition = function( x, y ) {
    if ( this.pannerNode !== null ) { return; }

    if ( !this.context.webAudioContext ) {
      return;
    }

    this.pannerNode = this.context.webAudioContext.createPanner();
    this.pannerNode.setPosition( x, y, 0 );
    this.playNode.connect( this.pannerNode );
    this.playNode = this.pannerNode;
  };

  AQAudioSource.prototype.play = function() {
    if ( !this.context.webAudioContext ) {
      return;
    }

    this.playNode.connect( this.context.targetNode );
    this.sourceNode.start( 0 );

    this.playing = true;
  };

  AQAudioSource.prototype.stop = function() {
    this.sourceNode.stop( 0 );

    this.playing = false;
  };
}());

},{}],"src/platform/web/spaceleap.module":[function(require,module,exports){
module.exports=require('P+Gnjs');
},{}],"P+Gnjs":[function(require,module,exports){
// connect to canvas
var Module = {
  preRun: [],
  postRun: [],
  print: (function() {
    var element = document.getElementById('output');
    element.value = ''; // clear browser cache
    return function(text) {
      text = Array.prototype.slice.call(arguments).join(' ');
      // These replacements are necessary if you render to raw HTML
      //text = text.replace(/&/g, "&amp;");
      //text = text.replace(/</g, "&lt;");
      //text = text.replace(/>/g, "&gt;");
      //text = text.replace('\n', '<br>', 'g');
      element.value += text + "\n";
      element.scrollTop = 99999; // focus on bottom
      console.log( text );
    };
  })(),
  printErr: function(text) {
    // text = Array.prototype.slice.call(arguments).join(' ');
    // console.error(text);
  },
  canvas: document.getElementById('canvas'),
  setStatus: function(text) {
    if (Module.setStatus.interval) clearInterval(Module.setStatus.interval);
    var m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
    var statusElement = document.getElementById('status');
    var progressElement = document.getElementById('progress');
    if (!progressElement) {
      return;
    }
    if (m) {
      text = m[1];
      progressElement.value = parseInt(m[2])*100;
      progressElement.max = parseInt(m[4])*100;
      progressElement.hidden = false;
    } else {
      progressElement.value = null;
      progressElement.max = null;
      progressElement.hidden = true;
    }
    statusElement.innerHTML = text;
  },
  totalDependencies: 0,
  monitorRunDependencies: function(left) {
    this.totalDependencies = Math.max(this.totalDependencies, left);
    Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies-left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
  }
};
Module.setStatus('Downloading...');

},{}],"src/platform/web/spaceleap.shim.emscripten":[function(require,module,exports){
module.exports=require('t6sWL7');
},{}],"t6sWL7":[function(require,module,exports){
if ( window.Module ) {
  SP.requestAnimationFrame = Module.requestAnimationFrame;

  SP.pauseSpaceLeaper = Module.cwrap('pauseSpaceLeaper', 'undefined', []);
  SP.resumeSpaceLeaper = Module.cwrap('resumeSpaceLeaper', 'undefined', []);
  SP.setSpaceLeaperEndCallback =
    Module.cwrap('setSpaceLeaperEndCallback', 'undefined', ['number']);
  SP.setSpaceLeaperVisitedCallback =
    Module.cwrap('setSpaceLeaperVisitedCallback', 'undefined', ['number']);
  SP.setSpaceLeaperResourceCallback =
    Module.cwrap('setSpaceLeaperResourceCallback', 'undefined', ['number']);
}

},{}],"src/platform/web/spaceleap.shim.missing":[function(require,module,exports){
module.exports=require('2VM970');
},{}],"2VM970":[function(require,module,exports){
if ( !window.SP ) {
  var SP = window.SP = {};
}

if ( !SP.pauseSpaceLeaper ) {
  SP.pauseSpaceLeaper = function() {};
}
if ( !SP.resumeSpaceLeaper ) {
  SP.resumeSpaceLeaper = function() {};
}
if ( !SP.setSpaceLeaperEndCallback ) {
  SP.setSpaceLeaperEndCallback = function() {};
}
if ( !SP.setSpaceLeaperVisitedCallback ) {
  SP.setSpaceLeaperVisitedCallback = function() {};
}
if ( !SP.setSpaceLeaperResourceCallback ) {
  SP.setSpaceLeaperResourceCallback = function() {};
}

},{}],"src/platform/web/watertest.ui":[function(require,module,exports){
module.exports=require('HQLVgQ');
},{}],"HQLVgQ":[function(require,module,exports){
(function() {

var setupStats = function() {
  var stats = new Stats();
  document.body.appendChild( stats.domElement );

  var stepStart = function() {
    stats.begin();
  };
  var stepEnd = function() {
    stats.end();
  };

  Module.ccall(
    'setEventListener',
    'undefined',
    [ 'number', 'number' ],
    [ 0, Runtime.addFunction( stepStart ) ]
  );

  Module.ccall(
    'setEventListener',
    'undefined',
    [ 'number', 'number' ],
    [ 1, Runtime.addFunction( stepEnd ) ]
  );
};

setupStats();
}());

},{}],"src/platform/web/spaceleap.ui":[function(require,module,exports){
module.exports=require('IxzFAn');
},{}],"IxzFAn":[function(require,module,exports){
var Dialog = require( 'src/ui/dialog' );

var alive = true;
var lastFrame = 0;
var survivedFor = 0;

var resource = 0;
var visits = 0;

function padNubmer( n ) {
  n = n.toString();
  if ( n.length === 1 ) {
    return '0' + n;
  }
  return n;
}

$( '.story-start' ).replaceWith( JST[ 'storystart.hbs' ]() );
$( '.story-end' ).replaceWith( JST[ 'storyend.hbs' ]() );
$( '.live-score' ).replaceWith( JST[ 'livescore.hbs' ]() );

$('body').click(function hideStart() {
  $('.story-start, .title').animate({'opacity':0},1000);
  $('body').off('click', hideStart);
  SP.resumeSpaceLeaper();
  $('.live-score').show().css('opacity','0').animate({'opacity':1},1000);

  SP.requestAnimationFrame(function time(){
    if ( alive ) {
      SP.requestAnimationFrame(time);

      var now = Date.now();
      if ( now - lastFrame < 1000 ) {
        survivedFor += ( now - lastFrame ) / 1000;

        $( '.survived-for > div' ).text(
          padNubmer( Math.floor( survivedFor / 60 )) + ':' +
            padNubmer( Math.floor( survivedFor % 60 )) + '.' +
            ( survivedFor % 1 ).toString().substring( 2, 4 ) );
      }
      lastFrame = now;
    }
  });

  _gaq.push(['_trackEvent','SpaceLeap','GameState','Start']);
});

var once = true;
var endCallback = function() {
  if ( once ) {
    alive = false;
    $('.story-end, .title')
      .show()
      .css('opacity', '0')
      .animate({'opacity':1}, 1000);
    $('.live-score').animate({'opacity':0},1000);

    _gaq.push(['_trackEvent','SpaceLeap','GameState','End']);
    _gaq.push(['_trackEvent','SpaceLeap','Score','Visits',visits]);
    _gaq.push(['_trackEvent','SpaceLeap','Score','Resources',resource]);
    _gaq.push(
      ['_trackEvent','SpaceLeap','Score','SurvivedFor',survivedFor]
    );
  }
  once = false;
};
var visitedCallback = function( _visits ) {
  visits = _visits;
  $('.visited > div').text( visits );
};
var resourceCallback = function( _resource ) {
  resource = _resource;
  $('.resource > div').text( resource );
};

var endCallbackPtr = Runtime.addFunction( endCallback );
var visitedCallbackPtr = Runtime.addFunction( visitedCallback );
var resourceCallbackPtr = Runtime.addFunction( resourceCallback );

SP.setSpaceLeaperEndCallback( endCallbackPtr );
SP.setSpaceLeaperVisitedCallback( visitedCallbackPtr );
SP.setSpaceLeaperResourceCallback( resourceCallbackPtr );

SP.pauseSpaceLeaper();

_gaq.push(['_trackEvent','SpaceLeap','Version','1.0']);

},{"src/ui/dialog":"FVpzu8"}],"src/platform/web/when_shim":[function(require,module,exports){
module.exports=require('uKjKH1');
},{}],"uKjKH1":[function(require,module,exports){
window.define = function(factory) {
  try{ delete window.define; } catch(e){ window.define = void 0; } // IE
  window.when = factory();
};
window.define.amd = {};

},{}],"src/ui/dialog":[function(require,module,exports){
module.exports=require('FVpzu8');
},{}],"FVpzu8":[function(require,module,exports){
var JST = require( 'jst' );

},{"jst":"IrjS0M"}]},{},["YrFPKj"])
//
//# sourceMappingURL=bean.js.map