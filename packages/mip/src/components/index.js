/**
 * @file index.js Builtins register
 * @author zhangzhiqiang(zhiqiangzhang37@163.com)
 */

/* eslint-disable no-new */

import MipImg from './mip-img'
import MipRem from './mip-rem'
import MipVideo from './mip-video'
import MipCarousel from './mip-carousel'
import MipIframe from './mip-iframe'
import MipPix from './mip-pix'
import mipBindInit from './mip-bind/init'
import MipDataWatch from './mip-bind/mip-data-watch'
import MipData from './mip-bind/mip-data'
import MipShell from './mip-shell/index'
import MipFixed from './mip-fixed/index'
import MipLayout from './mip-layout'
import registerElement from '../register-element'
import {isMIPShellDisabled} from '../page/util/dom'

export default {

  /**
   * Register the builtin components.
   */
  register () {
    registerElement('mip-layout', MipLayout)
    registerElement('mip-pix', MipPix)
    registerElement('mip-img', MipImg)
    registerElement('mip-rem', MipRem)
    registerElement('mip-carousel', MipCarousel)
    registerElement('mip-iframe', MipIframe)
    registerElement('mip-video', MipVideo)
    registerElement('mip-fixed', MipFixed)
    mipBindInit()
    registerElement('mip-data-watch', MipDataWatch)
    registerElement('mip-data', MipData)
    isMIPShellDisabled() || registerElement('mip-shell', MipShell)
  }
}

