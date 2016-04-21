// parseUrl() and resolveUrl() are from https://gist.github.com/1088850
//   -  released as public domain by author ("Yaffle") - see comments on gist
function parseUrl (url) {
  var m = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:\/?#]+:)?(\/\/(?:[^:@]*(?::[^:@]*)?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/)
  // authority = '//' + user + ':' + pass '@' + hostname + ':' port
  return (m ? {
    href: m[0] || '',
    protocol: m[1] || '',
    authority: m[2] || '',
    host: m[3] || '',
    hostname: m[4] || '',
    port: m[5] || '',
    pathname: m[6] || '',
    search: m[7] || '',
    hash: m[8] || ''
  } : null)
}

function resolveUrl (base, href) { // RFC 3986
  function removeDotSegments (input) {
    var output = []
    input.replace(/^(\.\.?(\/|$))+/, '')
      .replace(/\/(\.(\/|$))+/g, '/')
      .replace(/\/\.\.$/, '/../')
      .replace(/\/?[^\/]*/g, function (p) {
        if (p === '/..') {
          output.pop()
        } else {
          output.push(p)
        }
      })
    return output.join('').replace(/^\//, input.charAt(0) === '/' ? '/' : '')
  }

  href = parseUrl(href || '')
  base = parseUrl(base || '')

  return !href || !base ? null : (href.protocol || base.protocol) +
  (href.protocol || href.authority ? href.authority : base.authority) +
  removeDotSegments(href.protocol || href.authority || href.pathname.charAt(0) === '/' ? href.pathname : (href.pathname ? ((base.authority && !base.pathname ? '/' : '') + base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + href.pathname) : base.pathname)) +
  (href.protocol || href.authority || href.pathname ? href.search : (href.search || base.search)) +
  href.hash
}

function isSubUrl (baseUrl, testUrl) {
  if (testUrl.substring(0, baseUrl.length) === baseUrl) {
    var remainder = testUrl.substring(baseUrl.length)
    if ((testUrl.length > 0 && testUrl.charAt(baseUrl.length - 1) === '/')
      || remainder.charAt(0) === '#'
      || remainder.charAt(0) === '?') {
      return true
    }
  }
  return false
}

function parseQuery (queryString) {
  var result = {}
  ;(queryString.match(/(^\??|&)([^&]+)/g) || []).forEach(function (part) {
    part = part.substring(1)
    var key = part.split('=', 1)[0]
    var value = part.substring(key.length + 1)
    result[decodeURIComponent(key)] = decodeURIComponent(value)
  })
  return result
}

function encodeQuery (query) {
  var parts = []
  for (var key in query) {
    parts.push(encodeURIComponent(key) + '=' + encodeQueryComponent(query[key]))
  }
  return parts.length ? ('?' + parts.join('&')) : ''
}

function encodeQueryComponent (str) {
  return encodeURIComponent(str).replace(/%2F/gi, '/')
}

var relativeUrl = function (base, href, keepAbsolutePath) {
  href = urlUtils.resolveUrl(base, href)
  var loc = base
  if (!keepAbsolutePath && href === loc) return
  var locParsed = urlUtils.parseUrl(loc)
  var domain = locParsed.protocol + locParsed.authority
  var path = base.replace(/[#?].*/g, '').replace(/\/$/, '')
  if (!keepAbsolutePath && href.substring(0, path.length) === path) {
    href = href.substring(path.length)
  } else if (href.substring(0, domain.length) === domain) {
    href = href.substring(domain.length)
  }
  return href
}

module.exports = {
  encodeQuery: encodeQuery,
  encodeQueryComponent: encodeQueryComponent,
  isSubUrl: isSubUrl,
  parseQuery: parseQuery,
  parseUrl: parseUrl,
  relativeUrl: relativeUrl,
  resolveUrl: resolveUrl
}
