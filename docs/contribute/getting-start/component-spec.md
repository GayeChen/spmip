# MIP 组件开发规范

在本文档中，使用的关键字会以英文表示：`"MUST"`, `"MUST NOT"`, `"REQUIRED"`, `"SHALL"`, `"SHALL NOT"`, `"SHOULD"`, `"SHOULD NOT"`, `"RECOMMENDED"`, `"MAY"`, 和 `"OPTIONAL"`被定义在 rfc2119 中。

## 源文件仓库

MIP 官方扩展组件仓库是 https://github.com/mipengine/mip2-extensions 。中央仓库 master 分支下的代码永远是稳定的。根目录下，每个 mip- 前缀的目录为一个扩展组件。
MIP 第三方组件仓库是 https://github.com/mipengine/mip2-extensions-platform。

## 开发方式

MIP 扩展组件开发采用 [Forking工作流](https://github.com/oldratlee/translations/blob/master/git-workflows-and-tutorials/workflow-forking.md) 的方式。

- 开发者需要 fork MIP 扩展组件仓库
- 开发者在自己的仓库下开发
- 开发完成后通过 pull request 提交修改，由 MIP 开发小组审核与合并
- 不允许在主仓库 https://github.com/mipengine/mip2-extensions 下开发。


## 审核标准

  - <a href="#1">目录规范</a>
  - <a href="#2">文档规范</a>
  - <a href="#3">命名规范</a>
  - <a href="#4">JavaScript 规范</a>
  - <a href="#5">CSS 规范</a>


<div id="1"></div>
## 目录规范

#### 1. 官方组件

对于[官方组件仓库](https://github.com/mipengine/mip2-extensions)，开发者主要只需关心 `components`、`common`、`static` 三个目录下的内容，其中：

- [MUST] 所有组件必须在 `components` 目录下编写
- [MUST] `components` 目录下的组件目录必须以 `mip-xxx` 的形式命名，所有组件目录必须是组件名称
- [MUST] `components/mip-xxx` 组件目录下，必须包含 ① 组件入口文件 `mip-xxx.js` 或 `mip-xxx.vue` ② `example` 示例，③ 组件说明文件 `README.md`
- [MUST] `components/mip-xxx/example` 目录至少包含一个使用了该组件的示例 html
- [SHOULD] `common` 目录用于放置公用的工具类方法如 utils.js 等 ，组件中 import 使用即可
- [SHOULD] `static` 目录用于放置图片、字体文件

#### 2. 第三方（站长）组件

[第三方组件仓库](https://github.com/mipengine/mip2-extensions-platform#mip2-extensions-platform)以项目（一个站点）的粒度来管理站长组件。所有的站长组件位于 `sites` 目录

- [MUST] 站长组件必须提交到 `sites` 目录，且以站点的名称命名，如 `xiongzhang.baidu.com`
- 站长组件目录结构与官方组件基本一致，规范参考上述第 1 点。
- [MUST] （补充）站长组件命名需要加上站点名称标识，如 `mysite.com` 下的 tab 组件，可命名为 `mip-mysite-tab`

单个组件结构示例：

```bash
  components
    ├── mip-mysite-example // 组件 1
          ├── mip-mysite-example.js
          ├── README.md
          ├── example
                ├── mip-mysite-example.html

```



第三方组件结构示例
```bash
  mip2-extensions-platform
    ├── sites
          ├── baidu.com // 具体第三方站点名
                ├── components
                      ├── mip-baidu-header // 组件 1
                      ├── mip-baidu-footer // 组件 2
                      ├── mip-baidu-nav // 组件 3
```



<div id="2"></div>
## 文档规范

文档规范指的是各组件目录下的 README.md 文件的编写规范，MIP2 复用 [MIP1 的规范](https://github.com/mipengine/mip-extensions/blob/master/docs/spec-readme-md.md)


<div id="3"></div>
## 命名规范

命名规范涵盖以下几个部分
- 组件命名规范
- 组件属性命名规范
- 组件配置命名规范

#### 1.组件命名规范

MIP 扩展组件仓库 下，每个 mip- 前缀的目录为一个扩展组件。其中：
- 目录名称为组件名称
- 目录名称（组件名称）必须是 mip- 为前缀的全小写字符串，以 `-` 分隔
- 站长组件需要加上站点名称标识，如 `mip-mysite-tab`

#### 2.组件属性命名规范

自定义属性[强制]单词全字母小写，单词间以 - 分隔

```html
<mip-a some-attribute="xxx"></mip-a>
```
#### 3.组件配置命名规范

MIP 自定义组件的配置项需符合 Camel 规范，不得采用中划线

```html
<mip-a>
  <script type="application/json">
  {
      "goodAttribute": "good",
      "bad-attribute": "bad",
      "bad_arrtibute_1": "bad"
  }
  </script>
</mip-a>
```

<div id="4"></div>
## JavaScript 规范

- [MUST] 组件的脚本开发必须遵守 JavaScript Standard Style [[CN](https://standardjs.com/rules-zhcn.html)/[EN](https://standardjs.com/rules-en.html)] 代码规范
- [MUST] 组件的模版开发应该遵循 [Vue Style Guide](https://cn.vuejs.org/v2/style-guide/index.html)
- [MUST] 禁止使用白名单之外的原生 JS API (参考：[沙盒机制](../principle/sandbox.md))
- [SHOULD] 使用 ES6 和 ES Module 模块化组织代码
- [SHOULD] 使用 NPM 加载第三方 JS 模块，并且该模块必须在 MIP 第三方组件白名单中

开发过程中可以通过 [ESLint](https://eslint.org/) 工具检查，在组件校验和审核环节要求所有代码必须通过 ESLint，一般不允许使用 `eslint-disable` 来豁免检测。


<div id="5"></div>
## CSS 规范

- [MUST] 组件的样式必须遵循 Stylelint 中 [`stylelint-config-standard`](https://github.com/stylelint/stylelint-config-standard) 中包含的规范，且必须通过 Stylelint 工具审核之后才能提交。
- [MUST] 组件所有样式必须 scoped
- [MUST NOT] 组件样式禁止使用 `position: fixed`
- [MUST] 所有样式文件必须使用 UTF-8 编码
- [MUST] 选择器的第一层如果是标签选择器，只允许使用组件自身标签，组件的样式定义应只对组件本身以及组件内部生效。

```css
/* good */
mip-sample span {
  color: red;
}

/* bad */
span {
  color: red;
}
```

- [SHOULD] 组件样式选择器应该使用 `mip-组件名` 或以组件名为前缀，尽量避免对使用方页面产生冲突影响。

```css
/* good */
.mip-sample-title {
  color: red;
}

/* bad */
.title {
  color: red;
}
```

- [SHOULD NOT] 不允许使用 ID 选择器：组件的设计，需要考虑一个页面上同时存在多个组件的场景。所以组件及内部元素都不应该拥有 hard code 的 ID 属性。



