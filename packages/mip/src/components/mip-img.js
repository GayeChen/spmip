/**
 * @file mip-img 图片组件
 * @author wangpei07,JennyL
 */

/* global Image */
/* eslint-disable no-new */

import util from '../util/index'
import {customEmit} from '../util/custom-event'
import CustomElement from '../custom-element'
import viewport from '../viewport'
import viewer from '../viewer'

const {css, rect, event, naboo, platform, dom} = util

// 取值根据 https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement
let imgAttributes = [
  'alt',
  'ismap',
  'src',
  'sizes',
  'srcset',
  'usemap',
  'title'
]

/**
 * 获取弹出图片的位置
 * 2018-10-11 增加：由于浏览效果改为了 contain 效果，所以 carousel 内部采用 div 的 background-image 来显示图片。
 * 所以 carousel 必须设置的高宽都固定成了视口的高宽。保留这个函数只是为了动画效果。
 *
 * @param  {number} imgWidth  原始图片的宽度
 * @param  {number} imgHeight 原始图片的高度
 * @return {Object}           包含定位信息的对象
 */
function getPopupImgPos (imgWidth, imgHeight) {
  let viewportW = viewport.getWidth()
  let viewportH = viewport.getHeight()
  let top = 0
  let left = 0
  if (viewportH / viewportW < imgHeight / imgWidth) {
    let width = Math.round(viewportH * imgWidth / imgHeight)
    left = (viewportW - width) / 2
    return {
      height: viewportH,
      width,
      left,
      top: 0
    }
  }
  let height = Math.round(viewportW * imgHeight / imgWidth)
  top = (viewportH - height) / 2
  return {
    height,
    width: viewportW,
    left: 0,
    top
  }
}
/**
 * 从 mip-img 属性列表里获取属性
 *
 * @param {Object} attributes 参考: https://dom.spec.whatwg.org/#interface-namednodemap
 * @return {Object} 属性列表JSON
 * @example
 * {
 *     "src": "http://xx.jpeg"
 *     "width": "720"
 * }
 */
function getAttributeSet (attributes) {
  let attrs = {}
  Array.prototype.slice.apply(attributes).forEach(function (attr) {
    attrs[attr.name] = attr.value
  })
  return attrs
}
/**
 * 获取图片的 offset
 *
 * @param  {HTMLElement} img img
 * @return {Object} 一个包含 offset 信息的对象
 */
function getImgOffset (img) {
  let imgOffset = rect.getElementOffset(img)
  return imgOffset
}
/**
 * 获取有 popup 属性的 mip-img src 和本元素在数组中对应的 index
 *
 * @param {HTMLElement} ele mip-img 组件元素
 * @return {Object} 保存 src 数组和 index
 */
function getImgsSrcIndex (ele) {
  // 取 popup 图片，不包括 carousel 中头尾的两个图片
  const mipImgs = [...document.querySelectorAll('mip-img[popup]')]
                    .filter(mipImg => !mipImg.classList.contains('mip-carousel-extra-img'))
  let index = mipImgs.indexOf(ele)
  /* istanbul ignore if */
  if (index === -1) {
    return {imgsSrcArray: [], index}
  }
  const imgsSrcArray = mipImgs.map(mipImg => {
    let img = mipImg.querySelector('img')
    /* istanbul ignore if */
    if (!img) {
      return mipImg.getAttribute('src')
    }
    return img.src
  })
  return {imgsSrcArray, index}
}
/**
 * 找出当前视口下的图片
 * @param  {HTMLElement} carouselWrapper carouselWrapper
 * @param  {HTMLElement} mipCarousel mipCarousel
 * @return {HTMLElement} img
 */
function getCurrentImg (carouselWrapper, mipCarousel) {
  // 例如：'translate3d(-90px,0,0)'
  let str = carouselWrapper.style.webkitTransform || carouselWrapper.style.transform
  let result = /translate3d\(-?([0-9]+)/i.exec(str)
  // 原先宽度是视口宽度，现在需要的是图片本身宽度。最后还是一样的。。。
  let width = mipCarousel.getAttribute('width')
  let number = parseInt(result[1], 10) / width
  return carouselWrapper.querySelectorAll('.div-mip-img')[number]
}
/**
 * 创建图片弹层
 *
 * @param  {HTMLElement} element mip-img 组件元素
 * @return {HTMLElment} 图片弹层的 div
 */
function createPopup (element) {
  const {imgsSrcArray, index} = getImgsSrcIndex(element)
  /* istanbul ignore if */
  if (imgsSrcArray.length === 0 || index === -1) {
    return
  }
  let popup = document.createElement('div')
  css(popup, 'display', 'block')

  popup.className = 'mip-img-popUp-wrapper'
  popup.setAttribute('data-name', 'mip-img-popUp-name')

  // 创建图片预览图层
  let popUpBg = document.createElement('div')
  // 创建多图预览 wrapper
  let carouselWrapper = document.createElement('div')
  // 计算 wrapper 窗口大小，变为视口大小
  css(carouselWrapper, {
    'position': 'absolute',
    'width': viewport.getWidth(),
    'height': viewport.getHeight(),
    'left': 0,
    'top': 0
  })
  // 创建 mip-carousel
  let carousel = document.createElement('mip-carousel')

  carousel.setAttribute('layout', 'responsive')
  carousel.setAttribute('index', index + 1)
  carousel.setAttribute('width', viewport.getWidth())
  carousel.setAttribute('height', viewport.getHeight())

  for (let i = 0; i < imgsSrcArray.length; i++) {
    let mipImg = document.createElement('div')
    mipImg.className = 'div-mip-img'
    mipImg.setAttribute('data-src', imgsSrcArray[i])
    css(mipImg, {
      'background-image': `url(${imgsSrcArray[i]})`,
      'background-repeat': 'no-repeat',
      'background-size': 'contain',
      'background-position': 'center'
    })
    carousel.appendChild(mipImg)
  }
  popUpBg.className = 'mip-img-popUp-bg'

  carouselWrapper.appendChild(carousel)
  popup.appendChild(popUpBg)
  popup.appendChild(carouselWrapper)
  document.body.appendChild(popup)
  return popup
}
/**
 * 将图片与弹层绑定
 *
 * @param  {HTMLElement} element mip-img
 * @param  {HTMLElement} img     mip-img 下的 img
 * @return {void}         无
 */
function bindPopup (element, img) {
  // 是否在 mip-carousel 中
  let carouselOutside = element.customElement.carouselOutside
  // 图片点击时展现图片
  img.addEventListener('click', function (event) {
    event.stopPropagation()
    let current = img.currentSrc || img.src
    // 图片未加载则不弹层
    /* istanbul ignore if */
    if (!current || img.naturalWidth === 0) {
      return
    }

    // Show page mask
    window.MIP.viewer.page.togglePageMask(true, {
      skipTransition: true,
      extraClass: 'black'
    })
    let popup = createPopup(element)
    /* istanbul ignore if */
    if (!popup) {
      return
    }

    if (carouselOutside) {
      customEmit(carouselOutside, 'open-popup')
    }

    let popupBg = popup.querySelector('.mip-img-popUp-bg')
    let mipCarousel = popup.querySelector('mip-carousel')
    let popupImg = new Image()
    popupImg.setAttribute('src', current)
    popup.appendChild(popupImg)

    // 背景 fade in
    naboo.animate(popupBg, {
      opacity: 1
    }).start()

    let imgOffset = getImgOffset(img)

    popup.addEventListener('click', imagePop, false)

    function imagePop () {
      // Hide page mask
      window.MIP.viewer.page.togglePageMask(false, {
        skipTransition: true,
        extraClass: 'black'
      })

      let mipCarouselWrapper = popup.querySelector('.mip-carousel-wrapper')
      /* istanbul ignore if */
      if (mipCarouselWrapper == null) return

      // 找出当前视口下的图片
      let currentImg = getCurrentImg(mipCarouselWrapper, mipCarousel)
      popupImg.setAttribute('src', currentImg.getAttribute('data-src'))
      let previousPos = getImgOffset(img)
      // 获取弹出图片滑动的距离，根据前面的设定，top 大于 0 就不是长图，小于 0 才是滑动的距离。
      let currentImgPos = getImgOffset(currentImg)
      currentImgPos.top < 0 && (previousPos.top -= currentImgPos.top)
      currentImgPos.left < 0 && (previousPos.left -= currentImgPos.left)
      css(popupImg, getPopupImgPos(popupImg.naturalWidth, popupImg.naturalHeight))
      css(popupImg, 'display', 'block')
      css(mipCarousel, 'display', 'none')
      naboo.animate(popupBg, {
        opacity: 0
      }).start()

      naboo.animate(popup, {'display': 'none'})
      naboo.animate(popupImg, previousPos).start(() => {
        css(img, 'visibility', 'visible')
        css(popup, 'display', 'none')
        popup.removeEventListener('click', imagePop, false)
        popup.remove()
      })

      if (carouselOutside) {
        customEmit(carouselOutside, 'close-popup')
      }
    }

    let onResize = function () {
      imgOffset = getImgOffset(img)
      css(popupImg, imgOffset)
      naboo.animate(popupImg, getPopupImgPos(img.naturalWidth, img.naturalHeight)).start()
    }
    window.addEventListener('resize', onResize)

    css(popupImg, imgOffset)
    css(mipCarousel, 'visibility', 'hidden')
    css(popupBg, 'opacity', 1)

    naboo.animate(popupImg, getPopupImgPos(img.naturalWidth, img.naturalHeight)).start(() => {
      css(popupImg, 'display', 'none')
      css(mipCarousel, 'visibility', 'visible')
    })
    css(img, 'visibility', 'hidden')
    css(img.parentNode, 'zIndex', 'inherit')
  }, false)
}

/**
 * 调起手百图片浏览器
 * 应对 popup 不支持缩放，手百 ios iframe 长按无法保存图片的情况
 *
 * @param  {HTMLElement} ele     mip-img
 * @param  {HTMLElement} img     mip-img 下的 img
 * @return {void}         无
 */
function bindInvocation (ele, img) {
  // ios iframe 中长按调起
  if (viewer.isIframed && platform.isIOS()) {
    let timeout
    img.addEventListener('touchstart', () => {
      timeout = setTimeout(invoke, 300)
    })
    img.addEventListener('touchmove', () => {
      clearTimeout(timeout)
    })
    img.addEventListener('touchend', () => {
      clearTimeout(timeout)
    })
  }
  // 有 popup 属性的图片点击调起
  if (ele.hasAttribute('popup')) {
    img.addEventListener('click', e => {
      e.stopPropagation()
      invoke(true)
    })
  }

  function invoke (isPopup) {
    let current = img.currentSrc || img.src
    // 图片未加载则不调起
    /* istanbul ignore if */
    if (!current || img.naturalWidth === 0) {
      return
    }
    // 长按只显示当前图片
    let imgsSrcArray = [current]
    // 对于 popup 可滑动
    if (isPopup) {
      imgsSrcArray = getImgsSrcIndex(ele).imgsSrcArray || [current]
    }
    let scheme = 'baiduboxapp://v19/utils/previewImage?params=' + encodeURIComponent(JSON.stringify({urls: imgsSrcArray, current}))
    let iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = scheme
    let body = document.body
    body.appendChild(iframe)
    // 销毁 iframe
    setTimeout(() => {
      body.removeChild(iframe)
      iframe = null
    }, 0)
  }
}

class MipImg extends CustomElement {
  static get observedAttributes () {
    return imgAttributes
  }

  isLoadingEnabled () {
    return true
  }

  /**
   * Check whether the element need to be rendered in advance
   *
   * @param {Object} elementRect element rect
   * @param {Object} viewportRect viewport rect
   *
   * @return {boolean}
   */
  prerenderAllowed (elementRect, viewportRect) {
    let threshold = viewportRect.height
    return viewportRect.top + viewportRect.height + threshold >= elementRect.top &&
      elementRect.top + elementRect.height + threshold >= viewportRect.top
  }

  /** @overwrite */
  build () {
    // 在 build 中判断，在 layoutCallback 可能不对（与执行顺序有关）
    this.carouselOutside = dom.closest(this.element, 'mip-carousel')
    this.createPlaceholder()
  }

  /**
   * Create default placeholder if element has not define size
   */
  createPlaceholder () {
    if (this.element.classList.contains('mip-layout-size-defined')) {
      return
    }

    /* istanbul ignore if */
    if (this.element.querySelector('.mip-default-placeholder')) {
      return
    }

    let placeholder = document.createElement('mip-i-space')
    placeholder.classList.add('mip-default-placeholder')

    // FIX ME: padding-bottom 应设更合理的值，不至于太大而导致其他元素不在视窗
    this.element.appendChild(css(
      placeholder, {
        'padding-bottom': '75%',
        'background': 'rgba(0, 0, 0, 0.08)',
        'opacity': '1'
      })
    )
  }

  removePlaceholder () {
    let placeholder = this.element.querySelector('.mip-default-placeholder')
    if (placeholder) {
      this.element.removeChild(placeholder)
    }
  }

  async layoutCallback () {
    let ele = this.element
    let img = new Image()

    this.applyFillContent(img, true)

    // transfer attributes from mip-img to img tag
    this.attributes = getAttributeSet(ele.attributes)
    for (let k in this.attributes) {
      if (this.attributes.hasOwnProperty(k) && imgAttributes.indexOf(k) > -1) {
        img.setAttribute(k, this.attributes[k])
      }
    }

    // 如果有 <source>, 移动 <source> 和 <img> 到 <picture> 下
    let sources = [...ele.querySelectorAll('source')]
    if (sources.length) {
      let pic = document.createElement('picture')
      sources.forEach(source => {
        pic.appendChild(source)
      })
      pic.appendChild(img)
      ele.appendChild(pic)
    } else {
      ele.appendChild(img)
    }

    // 在手百中，可调起图片查看器
    if (platform.isBaiduApp()) {
      bindInvocation(ele, img)
    } else if (ele.hasAttribute('popup')) {
      bindPopup(ele, img)
    }
    ele.classList.add('mip-img-loading')

    try {
      await event.loadPromise(img)
      this.resourcesComplete()
      this.removePlaceholder()
      ele.classList.remove('mip-img-loading')
      ele.classList.add('mip-img-loaded')
      customEmit(ele, 'load')
    } catch (reason) {
      /* istanbul ignore if */
      if (!viewer.isIframed) {
        return
      }
      let ele = document.createElement('a')
      ele.href = img.src
      if (!/(\?|&)mip_img_ori=1(&|$)/.test(ele.search)) {
        let search = ele.search || '?'
        ele.search += (/[?&]$/.test(search) ? '' : '&') + 'mip_img_ori=1'
        img.src = ele.href
      }
    }
  }

  attributeChangedCallback (attributeName, oldValue, newValue, namespace) {
    if (attributeName === 'src' && oldValue !== newValue) {
      let img = this.element.querySelector('img')

      if (!img) {
        return
      }

      event.loadPromise(img).then(() => {
        this.element.toggleFallback(false)
      })

      img.src = newValue
    }
  }

  hasResources () {
    return true
  }
}

export default MipImg
