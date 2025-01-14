/* istanbul ignore file */
/**
 * @file Hash Function. Support hash get function
 * @author zhangzhiqiang(zhiqiangzhang37@163.com)
 */

/* global top screen location, MIP */

import event from './util/dom/event'
import Gesture from './util/gesture/index'
import platform from './util/platform'
import EventAction from './util/event-action/index'
import EventEmitter from './util/event-emitter'
import {fn, makeCacheUrl, parseCacheUrl} from './util'
import {supportsPassive} from './page/util/feature-detect'
import viewport from './viewport'
import Page from './page/index'
import {
  CUSTOM_EVENT_SHOW_PAGE,
  CUSTOM_EVENT_HIDE_PAGE,
  OUTER_MESSAGE_PUSH_STATE,
  OUTER_MESSAGE_REPLACE_STATE,
  OUTER_MESSAGE_MIP_PAGE_LOAD,
  OUTER_MESSAGE_PERFORMANCE_UPDATE
} from './page/const'
import {isMIPShellDisabled} from './page/util/dom'
import {resolvePath} from './page/util/path'
import Messager from './messager'
import fixedElement from './fixed-element'
import clientPrerender from './client-prerender'

/**
 * Save window.
 *
 * @inner
 * @type {Object}
 */
const win = window

const eventListenerOptions = supportsPassive ? {passive: true} : false

/**
 * The mip viewer.Complement native viewer, and solve the page-level problems.
 */
let viewer = {

  /**
     * The initialise method of viewer
     */
  init () {
    /**
     * SF 创建的第一个页面的 window.name
     */
    this.rootName = fn.getRootName(window.name)

    /**
     * SF 创建的第一个页面的 window.name
     */
    this.rootName = fn.getRootName(window.name)

    /**
     * Send Message, keep messager only one if prerender have created
     *
     * @inner
     * @type {Object}
     */
    const messager = clientPrerender.messager
    this.messager = messager || new Messager({name: this.rootName})

    /**
     * The gesture of document.Used by the event-action of Viewer.
     *
     * @private
     * @type {Gesture}
     */
    this._gesture = new Gesture(document, {
      preventX: false
    })

    this.setupEventAction()

    this.page = new Page()

    // solve many browser quirks...
    this.handleBrowserQuirks()

    // start rendering page
    this.page.start()

    // notify internal performance module
    this.isShow = true
    this._showTiming = Date.now()
    this.trigger('show', this._showTiming)

    // move <mip-fixed> to second <body>. see fixed-element.js
    this.fixedElement = fixedElement
    fixedElement.init()

    isMIPShellDisabled() || setTimeout(() => this._proxyLink(this.page))
  },

  /**
   * whether in an <iframe> ?
   * **Important** if you want to know whether in BaiduResult page, DO NOT use this flag
   *
   * @type {Boolean}
   * @public
   */
  isIframed: win !== top,

  /**
   * Show contents of page. The contents will not be displayed until the components are registered.
   */
  show () {
    // Job complete! Hide the loading spinner
    document.body.setAttribute('mip-ready', '')

    // notify SF hide its loading
    if (win.MIP.viewer.page.isRootPage) {
      this.sendMessage(OUTER_MESSAGE_MIP_PAGE_LOAD, {
        time: Date.now(),
        title: encodeURIComponent(document.title)
      })
    }
  },

  /**
   * Send message to BaiduResult page,
   * including following types:
   * 1. `pushState` when clicking a `<a mip-link>` element (called 'loadiframe')
   * 2. `mipscroll` when scrolling inside an iframe, try to let parent page hide its header.
   * 3. `mippageload` when current page loaded
   * 4. `performance-update`
   *
   * @param {string} eventName
   * @param {Object} data Message body
   */
  sendMessage (eventName, data = {}) {
    if (!win.MIP.standalone) {
      // Send Message in normal case
      // Save in queue and execute when page-active received, and update recoreded event time if prerendered
      clientPrerender.execute(() => {
        if (clientPrerender.isPrerendered && data.time) {
          data.time = Date.now()
        }
        this.messager.sendMessage(eventName, data)
      })
    }

    this.sendMessageToBaiduApp(eventName, data)
  },

  /**
   * Send message to BaiduApp
   * including following types:
   *
   * @param {string} eventName
   * @param {Object} data Message body
   */
  sendMessageToBaiduApp (eventName, data = {}) {
    // 和端通信, 可以上报性能数据，也可以通知隐藏 loading
    if (platform.isBaiduApp()) {
      let act = {
        [OUTER_MESSAGE_MIP_PAGE_LOAD]: 'hideloading',
        [OUTER_MESSAGE_PERFORMANCE_UPDATE]: 'perf',
        [OUTER_MESSAGE_PUSH_STATE]: 'click',
        [OUTER_MESSAGE_REPLACE_STATE]: 'click'
      }[eventName]

      if (platform.isAndroid()) {
        act && window._flyflowNative && window._flyflowNative.exec(
          'bd_mip',
          'onMessage',
          JSON.stringify({
            type: 5, // 必选，和 android 端的约定
            act,
            data
          }), ''
        )
      }
      if (platform.isIOS()) {
        let iframe = document.createElement('iframe');
        let paramStr = encodeURIComponent(JSON.stringify({ act, data }))
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.src = `baiduboxapp://mipPageShow?service=bd_mip&action=onMeessage&args=${paramStr}&callbackId=''`;
        setTimeout(() => iframe.parentNode.removeChild(iframe));
      }
    }
  },

  onMessage (eventName, callback) {
    if (!win.MIP.standalone) {
      this.messager.on(eventName, callback)
    }
  },

  /**
   * Setup event-action of viewer. To handle `on="tap:xxx"`.
   */
  setupEventAction () {
    let hasTouch = fn.hasTouch()
    let eventAction = this.eventAction = new EventAction()

    const inputDebounced = fn.debounce(function (event) {
      event.value = event.target.value
      eventAction.execute('input-debounced', event.target, event)
    }, 300)
    const inputThrottle = fn.throttle(function (event) {
      event.value = event.target.value
      eventAction.execute('input-throttled', event.target, event)
    }, 100)
    let inputHandle = function (event) {
      inputDebounced(event)
      inputThrottle(event)
    }

    if (hasTouch) {
      // In mobile phone, bind Gesture-tap which listen to touchstart/touchend event
      this._gesture.on('tap', event => {
        eventAction.execute('tap', event.target, event)
      })
    } else {
      // In personal computer, bind click event, then trigger event. eg. `on=tap:sidebar.open`, when click, trigger open() function of #sidebar
      document.addEventListener('click', event => {
        eventAction.execute('tap', event.target, event)
      }, false)
    }

    document.addEventListener('click', event => {
      eventAction.execute('click', event.target, event)
    }, false)

    document.addEventListener('input', inputHandle, false)

    event.delegate(document, 'input', 'change', event => {
      event.value = event.target.value
      eventAction.execute('change', event.target, event)
    })
  },

  /**
   * navigate to url
   * 对于新窗打开，使用 window.open，并处理 opener
   * 对于页内跳转，使用 viewer.open
   * @param {string} url 地址
   * @param {string} target 打开方式
   * @param {boolean} opener 是否支持 opener
   */
  navigateTo (url, target, opener) {
    if (['_blank', '_top'].indexOf(target) === -1) {
      return
    }
    if (target === '_blank') {
      this.openWindow(url, target, opener)
    } else {
      this.open(url, {replace: true, isMipLink: false})
    }
  },

  /**
   * 对 window.open 作兼容性处理
   * @param {string} url 地址
   * @param {string} target 打开方式
   * @param {boolean} opener 是否支持 opener
   */
  openWindow (url, target, opener) {
    let opt
    // Chrome 不能使用 noopener，会导致使用新 window 而不是新 tab 打开
    if ((platform.isIOS() || !platform.isChrome()) && opener === false) {
      opt = 'noopener'
    }

    // 先尝试 open，如果失败再使用 '_top'，因为 ios WKWebview 对于非 '_top' 打开可能失败
    let newWin
    try {
      newWin = window.open(url, target, opt)
    } catch (e) {}

    if (!newWin && target !== '_top') {
        newWin = window.open(url, '_top')
    }

    // 由于 Chrome 没有使用 noopener，需要手动清空 opener
    if (newWin && opener === false) {
      newWin.opener = null
    }
    return newWin
  },

  /**
   *
   * @param {string} to Target url
   * @param {Object} options
   * @param {boolean} options.isMipLink Whether targetUrl is a MIP page. If not, use `top.location.href`. Defaults to `true`
   * @param {boolean} options.replace If true, use `history.replace` instead of `history.push`. Defaults to `false`
   * @param {Object} options.state Target page info
   * @param {Object} options.cacheFirst If true, use cached iframe when available
   */
  open (to, {isMipLink = true, replace = false, state, cacheFirst} = {}) {
    if (!state) {
      state = {click: undefined, title: undefined, defaultTitle: undefined}
    }

    let hash = ''
    if (to.lastIndexOf('#') > -1) {
      hash = to.substring(to.lastIndexOf('#'))
    }
    let isHashInCurrentPage = hash && to.indexOf(window.location.origin + window.location.pathname) > -1

    // Invalid target, ignore it
    if (!to) {
      return
    }

    // Jump in top window directly
    // 1. ( Cross origin or MIP Shell is disabled ) and NOT in SF
    // 2. Not MIP page and not only hash change
    if (((this._isCrossOrigin(to) || isMIPShellDisabled()) && (window.MIP.standalone && !window.MIP.util.isCacheUrl(location.href))) ||
      (!isMipLink && !isHashInCurrentPage)) {
      if (replace) {
        window.top.location.replace(to)
      } else {
        window.top.location.href = to
      }
      return
    }

    let completeUrl
    if (/^\/\//.test(to)) {
      completeUrl = location.protocol + to
    } else if (to.charAt(0) === '/' || to.charAt(0) === '.') {
      completeUrl = location.origin + resolvePath(to, location.pathname)
    } else {
      completeUrl = to
    }
    // Send statics message to BaiduResult page
    let pushMessage = {
      url: parseCacheUrl(completeUrl),
      state,
      click: Date.now()
    }
    this.sendMessage(replace ? OUTER_MESSAGE_REPLACE_STATE : OUTER_MESSAGE_PUSH_STATE, pushMessage)

    let routePath = (window.MIP.standalone && !window.MIP.util.isCacheUrl(location.href)) ? to : makeCacheUrl(to)
    let routeSplits = routePath.split('#')
    let hashStr = '#'
    let targetHashobj = MIP.hash._getHashObj(routeSplits[1] || '')
    let sourceHashObj = MIP.hash._getHashObj(location.hash)
    let couldPassHash = true;
    let retHashObj = {};

    // 处理一下锚点的情况，删除前一个页面的锚点
    for (let key in sourceHashObj) {
      if (sourceHashObj[key].sep !== '=') {
        delete sourceHashObj[key];
      }
    }
    // 如果是锚点的跳转，就不透传 hash 了，透传的 hash 会导致锚点失效
    for (let key in targetHashobj) {
      if (targetHashobj[key].sep !== '=') {
        couldPassHash = false;
        break;
      }
    }

    retHashObj = couldPassHash
      ? Object.assign({}, sourceHashObj, targetHashobj)
      : targetHashobj

    for (let key in retHashObj) {
      // 不透传熊掌号相关的 hash，只保证第一次 logo + title 展现
      if (key !== 'cambrian') {
        hashStr += `${key}${retHashObj[key].sep}${retHashObj[key].value}&`
      }
    }

    // hash 透传机制
    routePath = routeSplits[0] + hashStr.substr(0, hashStr.length - 1)

    // Create target route
    let targetRoute = {
      path: routePath
    }

    if (isMipLink) {
      // Reload page even if it's already existed
      targetRoute.meta = {
        reload: true,
        cacheFirst,
        header: {
          title: pushMessage.state.title,
          defaultTitle: pushMessage.state.defaultTitle
        }
      }
    }

    // Handle <a mip-link replace> & hash
    if (isHashInCurrentPage || replace) {
      this.page.replace(targetRoute, {allowTransition: true})
    } else {
      this.page.push(targetRoute, {allowTransition: true})
    }
  },

  /**
   * Event binding callback.
   * For overridding _bindEventCallback of EventEmitter.
   *
   * @private
   * @param {string} name
   * @param {Function} handler
   */
  _bindEventCallback (name, handler) {
    if (name === 'show' && this.isShow && typeof handler === 'function') {
      handler.call(this, this._showTiming)
    }
  },

  /**
   * Listerning viewport scroll
   *
   * @private
   */
  viewportScroll () {
    let self = this
    let dist = 0
    let direct = 0
    let scrollTop = viewport.getScrollTop()
    // let lastDirect;
    let scrollHeight = viewport.getScrollHeight()
    let lastScrollTop = 0
    let wrapper = viewport.scroller

    wrapper.addEventListener('touchstart', e => {
      scrollTop = viewport.getScrollTop()
      scrollHeight = viewport.getScrollHeight()
    }, eventListenerOptions)

    function pagemove (e) {
      scrollTop = viewport.getScrollTop()
      scrollHeight = viewport.getScrollHeight()
      if (scrollTop > 0 && scrollTop < scrollHeight) {
        if (lastScrollTop < scrollTop) {
          // down
          direct = 1
        } else if (lastScrollTop > scrollTop) {
          // up
          direct = -1
        }
        dist = lastScrollTop - scrollTop
        lastScrollTop = scrollTop
        if (dist > 10 || dist < -10) {
          // 转向判断，暂时没用到，后续升级需要
          // lastDirect = dist / Math.abs(dist);
          self.sendMessage('mipscroll', {direct, dist})
        }
      } else if (scrollTop === 0) {
        self.sendMessage('mipscroll', {direct: 0})
      }
    }
    wrapper.addEventListener('touchmove', event => pagemove(event), eventListenerOptions)
    wrapper.addEventListener('touchend', event => pagemove(event))
  },

  /**
   * Proxy all the links in page.
   *
   * @private
   */
  _proxyLink () {
    let self = this
    let httpRegexp = /^http/
    let telRegexp = /^tel:/

    /**
     * if an <a> tag has `mip-link` or `data-type='mip'` let router handle it,
     * otherwise let TOP jump
     */
    event.delegate(document, 'a', 'click', function (event) {
      let isMipLink = this.hasAttribute('mip-link') || this.getAttribute('data-type') === 'mip'

      if (!isMipLink && this.getAttribute('target') === '_blank') {
        return
      }

      /**
       * browser will resolve fullpath, including path, query & hash
       * eg. http://localhost:8080/examples/page/tree.html?a=b#hash
       * don't use `this.getAttribute('href')`
       */
      let to = this.href
      let replace = this.hasAttribute('replace')
      let cacheFirst = this.hasAttribute('cache-first')
      let state = self._getMipLinkData.call(this)

      /**
       * For mail、phone、market、app ...
       * Safari failed when iframed. So add the `target="_top"` to fix it. except uc and tel.
       */
      if (platform.isUc() && telRegexp.test(to)) {
        return
      }

      if (!httpRegexp.test(to)) {
        this.setAttribute('target', '_top')
        return
      }

      // 以下情况使用 MIP 接管页面跳转
      // 1. Standalone
      // 2. New MIP Service
      let useNewMIPService = window.MIP.standalone || window.mipService === '2'
      if (useNewMIPService) {
        self.open(to, {isMipLink, replace, state, cacheFirst})
      } else if (isMipLink) {
        let message = self._getMessageData.call(this)
        self.sendMessage(message.messageKey, message.messageData)
      } else {
        top.location.href = this.href
      }

      event.preventDefault()
    }, false)
  },

  /**
   * get alink postMessage data
   *
   * @return {Object} messageData
   */
  _getMipLinkData () {
    // compatible with MIP1
    let parentNode = this.parentNode

    return {
      click: this.getAttribute('data-click') || parentNode.getAttribute('data-click') || undefined,
      title: this.getAttribute('data-title') || parentNode.getAttribute('title') || undefined,
      defaultTitle: this.innerText.trim().split('\n')[0] || undefined
    }
  },

  /**
   * get alink postMessage data
   * @return {Object} messageData
   */
  _getMessageData () {
    let messageKey = 'loadiframe'
    let messageData = {}
    messageData.url = this.href
    if (this.hasAttribute('no-head')) {
      messageData.nohead = true
    }
    if (this.hasAttribute('mip-link')) {
      let parent = this.parentNode
      messageData.title = parent.getAttribute('title') || parent.innerText.trim().split('\n')[0]
      messageData.click = parent.getAttribute('data-click')
    } else {
      messageData.title = this.getAttribute('data-title') || this.innerText.trim().split('\n')[0]
      messageData.click = this.getAttribute('data-click')
    }
    return {messageKey, messageData}
  },

  handleBrowserQuirks () {
    // add normal scroll class to body. except ios in iframe.
    // Patch for ios+iframe is default in mip.css
    if (!platform.needSpecialScroll) {
      setTimeout(() => {
        document.documentElement.classList.add('mip-i-android-scroll')
        document.body.classList.add('mip-i-android-scroll')
      }, 0)
    }

    // prevent bouncy scroll in iOS 7 & 8
    if (platform.isIos()) {
      let iosVersion = platform.getOsVersion()
      iosVersion = iosVersion ? iosVersion.split('.')[0] : ''
      setTimeout(() => {
        document.documentElement.classList.add('mip-i-ios-scroll')
        document.documentElement.classList.add('mip-i-ios-width')
        window.addEventListener('orientationchange', () => {
          document.documentElement.classList.remove('mip-i-ios-scroll')
          setTimeout(() => {
            document.documentElement.classList.add('mip-i-ios-scroll')
          })
        })
      }, 0)

      if (!this.page.isRootPage) {
        this.fixIOSPageFreeze()
      }

      if (this.isIframed) {
        // 这些兼容性的代码会严重触发 reflow，但又不需要在首帧执行
        // 使用 setTimeout 不阻塞 postMessage 回调执行
        setTimeout(() => {
          this.fixSoftKeyboard()
          this.viewportScroll()
        }, 0)
        this.lockBodyScroll()

        // While the back button is clicked,
        // the cached page has some problems.
        // So we are forced to load the page in below conditions:
        // 1. IOS 8 + UC
        // 2. IOS 9 & 10 + Safari
        // 3. IOS 8 & 9 & 10 + UC & BaiduApp & Baidu
        let needBackReload = (iosVersion === '8' && platform.isUc() && screen.width === 320) ||
          ((iosVersion === '9' || iosVersion === '10') && platform.isSafari()) ||
          ((iosVersion === '8' || iosVersion === '9' || iosVersion === '10') && (platform.isUc() || platform.isBaiduApp() || platform.isBaidu()))
        if (needBackReload) {
          window.addEventListener('pageshow', e => {
            if (e.persisted) {
              document.body.style.display = 'none'
              location.reload()
            }
          })
        }
      }
    }

    /**
     * trigger layout to solve a strange bug in Android Superframe,
     * which will make page unscrollable
     */
    if (platform.isAndroid()) {
      setTimeout(() => {
        document.documentElement.classList.add('trigger-layout')
        document.body.classList.add('trigger-layout')
      })
    }
  },

  /**
   * fix a iOS UC/Shoubai bug when hiding current iframe,
   * which will cause the whole page freeze
   *
   * https://github.com/mipengine/mip2/issues/19
   */
  fixIOSPageFreeze () {
    let $style = document.createElement('style')
    let $head = document.head || document.getElementsByTagName('head')[0]
    $style.setAttribute('mip-bouncy-scrolling', '')
    $style.textContent = '* {-webkit-overflow-scrolling: auto!important;}'

    if (!platform.isSafari() && !platform.isChrome()) {
      window.addEventListener(CUSTOM_EVENT_SHOW_PAGE, (e) => {
        try {
          $head.removeChild($style)
        } catch (e) {}
      })
      window.addEventListener(CUSTOM_EVENT_HIDE_PAGE, (e) => {
        $head.appendChild($style)
      })
    }
  },

  /**
   * 修复安卓手机软键盘遮挡的问题
   * 在 iframe 内部点击输入框弹出软键盘后，浏览器不会自动聚焦到输入框，从而导致软键盘遮挡住输入框。输入一个字可以恢复。
   */
  fixSoftKeyboard () {
    if (platform.isAndroid()) {
      window.addEventListener('resize', () => {
        let element = document.activeElement
        let tagName = element.tagName.toLowerCase()

        if (element && (tagName === 'input' || tagName === 'textarea')) {
          setTimeout(() => {
            if (typeof element.scrollIntoViewIfNeeded === 'function') {
              element.scrollIntoViewIfNeeded()
            } else if (typeof element.scrollIntoView === 'function') {
              element.scrollIntoView()
              document.body.scrollTop -= 44
            }
          }, 250)
        }
      })
    }
  },

  /**
   * lock body scroll in iOS
   *
   * https://medium.com/jsdownunder/locking-body-scroll-for-all-devices-22def9615177
   * http://blog.christoffer.online/2015-06-10-six-things-i-learnt-about-ios-rubberband-overflow-scrolling/
   */
  lockBodyScroll () {
    viewport.on('scroll', () => {
      let scrollTop = viewport.getScrollTop()
      let totalScroll = viewport.getScrollHeight()
      if (scrollTop === 0) {
        viewport.setScrollTop(1)
      } else if (scrollTop === totalScroll) {
        viewport.setScrollTop(scrollTop - 1)
      }
    }, eventListenerOptions)

    // scroll 1px
    document.documentElement.classList.add('trigger-layout')
    document.body.classList.add('trigger-layout')
    viewport.setScrollTop(1)
  },

  /**
   * Whether target url is a cross origin one
   * @param {string} to targetUrl
   */
  _isCrossOrigin (to) {
    let target = to

    // Below 3 conditions are NOT cross origin
    // 1. '/'
    // 2. Absolute path ('/absolute/path')
    // 3. Relative path ('./relative/path' or '../parent/path')
    if (target.length === 1 ||
      (target.charAt(0) === '/' && target.charAt(1) !== '/') ||
      target.charAt(0) === '.') {
      return false
    }

    // Check protocol
    if (/^http(s?):\/\//i.test(target)) {
      // Starts with 'http://' or 'https://'
      if (!(new RegExp('^' + location.protocol, 'i')).test(target)) {
        return true
      }

      target = target.replace(/^http(s?):\/\//i, '')
    } else if (/^\/\//.test(target)) {
      // Starts with '//'
      target = target.substring(2, target.length)
    }

    let hostAndPort = target.split('/')[0]
    if (location.host !== hostAndPort) {
      return true
    }

    return false
  }
}

EventEmitter.mixin(viewer)

export default viewer
