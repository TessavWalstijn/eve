'use strict';

 /*------
 | Why is eve in an IIFE?
 |
 | The eve project started before ES6 was out.
 | We did the namespaceing in a IIFE in ES5.
 | An IIFE removes the unused variables and functions.
 | Everything that is returned will be saved.
*/
const eve = (()=> {

  let eve = {
    __version: {
      name: '0.0.2',
      code: '000',
    },
    __jsfiles: [],
    __modules: [],
    __namespaces: [],
  }

  //#region Encode and Decode
  const encode = {
    Base64 (string) { return btoa(string); },
  }

  const decode = {
    Base64 (string) { return atob(string); },
  }
  //#endregion

  const get = {
    //#region HTML
    HTMLElementById (id) { return document.getElementById(id); },
    HTMLElementsByClass (name) { return document.getElementsByClassName(name) },
    HTMLElementsByTag (tag) { return document.getElementsByTagName(tag) },
    //#endregion
    IncrementId: (()=> {
      let id = 0;
      return ()=> {
        return id += 1;
      }
    })(),
  }

  const clear = {
    Key (keyName, object = window) {
      try {
        delete object[keyName];
      } catch (err) {
        object[keyName] = undefined;
      }
    },

    Function (functionName, object) {
      if (typeof functionName === 'function')
      this.Key(functionName, object);
    },

    Object (objectName, object) {
      if (typeof objectName === 'object')
      this.Key(objectName, object);
    },

    Variable (variable, object) {
      this.Key(variable, object);
    },

    Array (arrayName, object) {
      if (typeof arrayName === 'object') {
        if (arrayName instanceof Array) {
          this.Key(arrayName, object);
        }
      }
    },
  }

  const add = {
    //#region File loading
    File (source, options, callback, errorCallback)
    {
      let callbackCount = 0;
      let argumentCount = 0;

      // Do some sort of smart type checking
      if (
        // Used for basic js files.
        source.indexOf('.js') > 0 &&
        source.indexOf('.json') < 0
        // This is to indicate to EVE it is a javascript module.
        // source.indexOf('.mjs')
      ) {
        return this.JSFile(source, options, callback, errorCallback);
      } else if (
        source.indexOf('.css') > 0 
        // Implementing a scss compiler
        // Or as module
        // source.indexOf('.scss')
        // Implementing a sass compiler
        // Or as module
        // source.indexOf('.sass')
      ) {
        return this.CSSFile(source, callback, errorCallback);
      }

      // Trim the callbacks off the end to get an idea of how many arguments are passed
      const max = arguments.length -1
      for (let i = max; i > 0; i -= 1) {
        if (typeof arguments[i] === 'function') {
          callbackCount += 1;
        } else break;
      }

      // The number of arguments minus callbacks
      argumentCount = arguments.length - callbackCount;

      let result = create.Request(arguments, argumentCount);
      let { type, request } = result;
      callback = result.callback;
      errorCallback = result.errorCallback;

      // Do even more a kind of smart type control
      if (!type) {
        if (source.indexOf('.json') !== -1) {
          type = 'json';
        } else if (source.indexOf('.xml') !== -1) {
          type = 'xml';
        } else {
          type = 'text';
        }
      }

      fetch(request)
        .then((res)=> {
          if (!res.ok) throw res;
          
          switch (type) {
            case 'json':
              return res.json();
            case 'binary':
              return res.blob();
            case 'arrayBuffer':
              return res.arrayBuffer();
            case 'xml':
              return res.text().then(function(text) {
                var parser = new DOMParser();
                var xml = parser.parseFromString(text, 'text/xml');
                return parseXML(xml.documentElement);
              });
            default:
              return res.text();
          }
        })
        .then(callback || function() {})
        .catch(errorCallback || console.error);
    },

    JSFile (
      source,
      {
        divId,
        async = true,
      },
      callback,
      errorCallback,
    ) {
      try {

        if (eve.__jsfiles.find((element) => {
          if (element == source) return true;
          else return false; 
        })) {
          callback && callback();
          return add;
        }

        if (eve.__jsfiles.length > 0) {
          eve.__jsfiles = [...eve.__jsfiles, source];
        } else {
          eve.__jsfiles = [source];
        }

        let div = null;

        if (get.HTMLElementById(divId))
          div = get.HTMLElementById(divId);
        else {
          const script = get.HTMLElementsByTag('div')[0];
          div = create.HTMLElement('div');
          div.id = divId;
          script.parentNode.insertBefore(div, script);
        }

        const element = create.HTMLElement('script');
        if (!element) throw 'element could not be created!' 

        element.src = source;
        element.async = async;
        element.type = 'application/javascript';

        function func ()
        {
          element.onreadystatechange = null;
          element.onload = null;

          callback && callback();
        }

        element.onreadystatechange = func;
        element.onload = func;

        if (div) div.appendChild(element);
        else throw 'div can not be created or does not exist!';

        return add;
      } catch (err) {
        (errorCallback)
         ? errorCallback(err)
         : console.error(err);
      }
    },

    CSSFile (
      source,
      callback,
      errorCallback,
    ) {
      try {
        const head = get.HTMLElementsByTag(`head`)[0];
        const link = create.HTMLElement(`link`);

        link.rel  = 'stylesheet';
        link.type = 'text/css';
        link.href = source;
        link.media = 'all';

        head.appendChild(link);

        callback && callback();

        return add;
      } catch (err) {
        (errorCallback)
         ? errorCallback(err)
         : console.error(err);
      }
    },
    //#endregion

    Module (object, name, callback, errorCallback)
    {
      try {
        // check if the module is an eve module
        let isEVE = (object.__version);

        const maxModules = eve.__modules.length;
        for (let i = 0; i < maxModules; i += 1) {
          if (eve.__modules[i] == name) {
            throw `eve already has ${name} in her list`;
          }
        }

        if (eve.__modules.length > 0) {
          eve.__modules = [...eve.__modules, name]
        } else {
          eve.__modules = [name]
        }

        if (isEVE) {
          for(let key in object) {
            let keyAproved = AproveKey(key);

            if (keyAproved) {
              eve[key]
                ? eve[key] = { ...eve[key], ...object[key] }
                : eve[key] = object[key];
            } else {
              eve[key] = object[key];
            }
          }
        } else eve[name] = object;

        callback && callback();

      } catch (err) {
        (errorCallback)
         ? errorCallback(err)
         : console.error(err);
      }
    },

    NameSpace (name, errorCallback)
    {
      try {
        const maxNameSpaces = eve.__namespaces.length;
        for (let i = 0; i < maxNameSpaces; i += 1) {
          if (eve.__namespaces[i] == name) {
            throw `eve already has a(n) ${name} as namespace`;
          }
        }

        if (AproveKey(name)) throw `you can not use a namespace of eve like: ${name}`;

        if (eve.__namespaces.length > 0) {
          eve.__namespaces = [...eve.__namespaces, name]
        } else {
          eve.__namespaces = [name]
        }

      } catch (err) {
        (errorCallback)
         ? errorCallback(err)
         : console.error(err);
      }
    },

    HTMLElement (element, addId)
    {
      let html = get.HTMLElementById(addId);

      if (html === null) {
        html = create.HTMLElement ('div');
        html.id = addId;
        const body = get.HTMLElementsByTag('body');
        body[0].appendChild(html);
      }

      html.appendChild(element);
    }
  }

  const create = {
    HTMLElement (element) { return document.createElement(element); },
    Request (parameters, argumentCount)
    {
      let callback;
      let errorCallback;
      if (
        argumentCount === 2 &&
        typeof parameters[0] === 'string' &&
        typeof parameters[1] === 'object'
      ) {
        // Intended for more advanced use, pass in Request parameters directly
        let request = new Request(parameters[0], parameters[1]);
        callback = parameters[2];
        errorCallback = parameters[3];

        return {
          request,
          callback,
          errorCallback,
        };
      } else {
        let path = parameters[0];
        let contentType = 'text/plain';
        let method = 'GET';
        let type;
        let data;

        const max = parameters.length;
        for (let i = 1; i < max; i += 1) {
          let parameter = parameters[i];

          if (typeof parameter === 'string') {
            if (
              parameter === 'GET' ||
              parameter === 'POST' ||
              parameter === 'PUT' ||
              parameter === 'DELETE'
            ) {
              method = parameter;
            } else if (
              parameter === 'json' ||
              parameter === 'jsonp' ||
              parameter === 'binary' ||
              parameter === 'arrayBuffer' ||
              parameter === 'xml' ||
              parameter === 'text'
            ) {
              type = parameter;
            } else {
              data = parameter;
            }
          } else if (typeof parameter === 'number') {
            data = parameter.toString();
          } else if (typeof parameter === 'object') {
            data = JSON.stringify(parameter);
            contentType = 'application/json';
          } else if (typeof parameter === 'function') {
            if (!callback) {
              callback = parameter;
            } else {
              errorCallback = parameter;
            }
          }
        }

        request = new Request(path, {
          method: method,
          mode: 'cors',
          body: data,
          headers: new Headers({
            'Content-Type': contentType
          })
        });

        return {
          type,
          request,
          callback,
          errorCallback,
        };
      }
    }
  }

  function AproveKey (key) 
  {
    switch (key) {
      case 'aprove':
      case 'encode':
      case 'decode':
      case 'get':
      case 'set':
      case 'add':
      case 'create':
      case 'clear':
        return true;
    }
    return false;
  }

  eve = { 
    ...eve,
    AproveKey: AproveKey,
    encode: encode,
    decode: decode,
    get: get,
    add: add,
    create: create,
    clear: clear,
  };

  return eve;
})();