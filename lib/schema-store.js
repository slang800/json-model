var urlUtils = require('./url-utils')

var SchemaStore = function SchemaStore (parent) {
  this.schemas = parent ? Object.create(parent.schemas) : {}
  this.missingUrls = parent ? Object.create(parent.missingUrls) : {}
  this.missing = function (url, noAdd) {
    if (url === undefined) {
      if (!parent) {
        return Object.keys(this.missingUrls)
      } else {
        var result = []
        for (var key in this.missingUrls) {
          if (parent.missing(key)) {
            result.push(key)
          } else {
            delete this.missingUrls[key]
          }
        }
        return result
      }
    } else {
      if (this.schemas[url]) return false
      var baseUrl = url.replace(/#.*/, '')
      var result = (this.missingUrls[baseUrl] || !(baseUrl in this.schemas)) && (!parent || parent.missing(url))
      if (result && !noAdd) {
        this.missingUrls[baseUrl] = true
      }
      return result
    }
  }
}

SchemaStore.prototype = {
  child: function () {
    return new SchemaStore(this)
  },
  add: function (url, schema) {
    if (typeof url === 'object') {
      schema = url
      url = schema.id || arguments[1]
    }
    var baseUrl = url.replace(/#.*/, '')
    if (url === baseUrl + '#') {
      url = baseUrl
    }
    if (schema) schema.id = schema.id || url
    delete this.missingUrls[baseUrl]
    this.schemas[url] = schema
    this._searchSchema(schema, url)
  },
  _searchSchema: function (schema, baseUri) {
    if (schema && typeof schema === 'object') {
      if (baseUri === undefined) {
        baseUri = schema.id
      } else if (typeof schema.id === 'string') {
        schema.id = baseUri = urlUtils.resolveUrl(baseUri, schema.id)
      }

      if (Array.isArray(schema)) {
        for (var i = 0; i < schema.length; i++) {
          this._searchSchema(schema[i], baseUri)
        }
      } else {
        if (typeof schema.id === 'string' && urlUtils.isSubUrl(baseUri, schema.id)) {
          if (this.schemas[schema.id] === undefined) {
            this.schemas[schema.id] = schema
          }
        }
        if (typeof schema['$ref'] === 'string') {
          schema['$ref'] = urlUtils.resolveUrl(baseUri, schema['$ref'])
        }
        for (var key in schema) {
          if (key === 'enum') {
            continue
          } else if (typeof schema[key] === 'object') {
            this._searchSchema(schema[key], baseUri)
          } else if (key === '$ref') {
            var refUri = schema[key]
            var baseRefUri = refUri.replace(/#.*/, '')
            if (baseRefUri && !(refUri in this.schemas) && !(baseRefUri in this.schemas)) {
              this.missingUrls[baseRefUri] = true
            }
          }
        }
      }
    }
  },
  resolveRefs: function (schema, urlHistory) {
    if (schema && schema['$ref'] !== undefined) {
      urlHistory = urlHistory || {}
      if (urlHistory[schema['$ref']]) {
        return this.createError(ErrorCodes.CIRCULAR_REFERENCE, {urls: Object.keys(urlHistory).join(', ')}, '', '')
      }
      urlHistory[schema['$ref']] = true
      schema = this.get(schema['$ref'], urlHistory)
    }
    return schema
  },
  get: function (url, urlHistory, ignoreRefs) {
    var schema
    if (this.schemas[url] !== undefined) {
      schema = this.schemas[url]
      return ignoreRefs ? schema : this.resolveRefs(schema, urlHistory)
    }
    var baseUrl = url.replace(/#.*/, '')
    var fragment = url.substring(baseUrl.length + 1)
    if (typeof this.schemas[baseUrl] === 'object') {
      schema = this.schemas[baseUrl]
      var pointerPath = decodeURIComponent(fragment)
      if (pointerPath === '') {
        return ignoreRefs ? schema : this.resolveRefs(schema, urlHistory)
      } else if (pointerPath.charAt(0) !== '/') {
        return undefined
      }
      var parts = pointerPath.split('/').slice(1)
      for (var i = 0; i < parts.length; i++) {
        var component = parts[i].replace(/~1/g, '/').replace(/~0/g, '~')
        if (!schema || schema[component] === undefined) {
          return undefined
        }
        schema = schema[component]
      }
      if (schema !== undefined) {
        return ignoreRefs ? schema : this.resolveRefs(schema, urlHistory)
      }
    }
    this.missingUrls[baseUrl] = true
  }
}

module.exports = SchemaStore
