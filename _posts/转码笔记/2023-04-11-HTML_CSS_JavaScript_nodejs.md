---
layout: post
title: 一文讲清HTML，CSS, JavaScript, NodeJS
category: 转码笔记
tags: [front-end]
description: 前端入门
---


最准确的网页设计思路是把网页分成三个层次，即：结构层(HTML)、表示层(CSS)、行为层(Javascript)。
## HTML、CSS、JavaScript简介及简单分工

1.什么是HTML（超文本标记语言 Hyper Text Markup Language），HTML 是用来描述网页的一种语言。
2.CSS(层叠样式表 Cascading Style Sheets),样式定义如何显示 HTML 元素，语法为：selector {property：value} (选择符 {属性：值})
3.JavaScript是一种脚本语言，其源代码在发往客户端运行之前不需经过编译，而是将文本格式的字符代码发送给浏览器由浏览器解释运行

对于一个网页，HTML定义网页的结构，CSS描述网页的样子，JavaScript设置一个很经典的例子是说HTML就像 一个人的骨骼、器官，而CSS就是人的皮肤，有了这两样也就构成了一个植物人了，加上javascript这个植物人就可以对外界刺激做出反应，可以思 考、运动、可以给自己整容化妆（改变CSS）等等，成为一个活生生的人。


如果说HTML是肉身、CSS就是皮相、Javascript就是灵魂。没有Javascript,HTML+CSS是植物人，没有Javascript、CSS是个毁容的植物人。
如果说HTML是建筑师，CSS就是干装修的，Javascript是魔术师。

怎么把这三者联系在一起呢，当然得通过网页的肉身HTML,HTML是一直描述语言，它是对着浏览器描述自己的，那么它通常怎么描述具体的这个网页呢？

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>网页标题</title>
<link rel="stylesheet" type="text/css" href="mycss.css" />
<script type="text/javascript" src="myjs.js"></script>
</head>
<body>
<p>这是一个段落</p>
</body>
</html>
```
这是一个最简单的HTML文档，文档说的是，浏览器啊，我是遵循W3C标准XHTML1.0过渡版本规范（文件类型声明），我采用的编码是utf-8,我的标题是“网页标题”，描述我的模样的样式表是我同目录的mycss.css文件，与我有关的javascript代码在我同级的myks.js文件中，我的内容有一个段落，段落的内容是“这是一个段落”。

## HTML、CSS、JavaScript发展

### HTML的版本

超文本标记语言（第一版）——在1993年6月作为互联网工程工作小组（IETF）工作草案发布（并非标准）：
HTML 2.0——1995年11月作为RFC 1866发布，在RFC 2854于2000年6月发布之后被宣布已经过时
HTML 3.2——1997年1月14日，W3C推荐标准
html 5
html 5
HTML 4.0——1997年12月18日，W3C推荐标准
HTML 4.01（微小改进）——1999年12月24日，W3C推荐标准
HTML 5——2014年10月28日，W3C推荐标准[4]  

现在我们只说HTML 4.01和HTML5,因为2000年国际万维网联盟（W3C）公布发行了XHTML 1.0版本。XHTML 1.0是一种在HTML 4.0基础上优化和改进的的新语言，目的是基于XML应用。而XHTML 与 HTML 4.01 几乎是相同的，HTML从最初发展到XHTML的过程中变得更加的严谨，更加的灵活，与CSS结合的更好。原则上说现在能看到的大部分网页是使用HTML4或者HTML5这两个版本的。
HTML5
它是对HTML5的一次重大的修改，虽然HTML5 标准还在制定中，但不能阻碍其势不可挡的脚步，不用HTML5你就OUT了，我们经常为HTML5而HTML5,其实对于比较低端的前端（我这样的），特别是用div+CSS实现网页来说，真的改变不大。
那么，HTML5的精髓在哪呢？这个得单独说一下，请见《HTML5的入门与深入理解》

### CSS的版本（Level）
1996年W3C正式推出了CSS1；
1998年W3C正式推出了CSS2；
CSS2.1是W3C现在正在推荐使用的；
CSS3现在还处于开发中。
如果说HTML的发展是一个不断修改的过程，那么CSS的发展就是一个不断补充的过程，所以在使用CSS的时候，不需要像HTML那行申明使用的标准，高版本的浏览器认识高版本的CSS定义，低版本的浏览器略过不认识的CSS定义。不管什么版本，CSS的语法很简单，选择器：{属性：属性值}，所以火爆的CSS3无外乎是扩展了选择器和属性。
CSS3新增的选择器和属性请见《CSS3新增的选择器和属性》

### JavaScript

JavaScript一种直译式脚本语言，它的解释器被称为JavaScript引擎，是浏览器的一部分，即：JavaScript是由客户端的浏览器解释执行的，所以在谈JavaScript的历史之前我们要先说一下浏览器，最早的web浏览器是创建于1991年的WorldWideWeb，后来改名为Nexus，之后出现了各类浏览器，直到1994年，网景公司（Netscape）发布了Navigator浏览器0.9版，这是历史上第一个比较成熟的网络浏览器，随后的1995年微软推出了IE浏览器，从此掀起了浏览器大战，微软采取操作系统捆绑IE浏览器，最终获得压倒性胜利，战争失利的Netscape在之后被收购、合并、解散。之后一段时间IE独领风骚，之后被Opera，Safari，Firefox，Chrome陆续瓜分掉一些市场份额，改变了一家独大的局面。

但是谈到JavaScript的历史，必须提到一个公司和一个人，那就是Netscape公司及其员工Brendan Eich，网景公司在发布了Navigator之后，急于解决浏览器与用户交互这个问题，Javascript之父Brendan Eich只用了10天的时间发明了livescript(让我辈情何以堪）,由于网景高层是java的粉丝，或者说为了抱上当时热炒的java的大腿，livascript更名为javascript,Brendan Eich他的思路是：
   （1）借鉴C语言的基本语法；

　　（2）借鉴Java语言的数据类型和内存管理；

　　（3）借鉴Scheme语言，将函数提升到"第一等公民"（first class）的地位；

　　（4）借鉴Self语言，使用基于原型（prototype）的继承机制。
所以，Javascript语言实际上是两种语言风格的混合产物----（简化的）函数式编程+（简化的）面向对象编程。
Javascript 1.0获得了巨大的成功，Netscape随后推出了1.1，之后作为竞争对手的微软在自家的 IE3 中加入了名为 JScript （名称不同是为了避免侵权）的JavaScript实现。由此JavaScript 的规范化被提上日程，1997年，以 JavaScript1.1 为蓝本的建议被提交给了 欧洲计算机制造商协会 （ECMA），ECMA牵头经过数月的努力完成了 ECMA-262 ——定义了一种名为 ECMAScript 的新脚本语言的标准。

虽然 JavaScript 和 ECMAScript 通常被人用来表达相同的意思，但 JavaScript 的含义去比 ECMA-262 中规定的多得多。
一个完整的 JavaScript 实现应由三个部分组成：

（1）核心（ECMAScript）， 描述了该语言的语法和基本对象。

（2）文档对象模型（DOM），描述处理网页内容的方法和接口。

（3）浏览器对象模型（BOM），描述与浏览器进行交互的方法和接口。

1995年发明了Javascript,1997年就推出了国际标准，迫切需要浏览器与用户相互的情况下，javascript发展的太快了，Javascript的规格还没来及调整，就固化了。相比之下，C语言问世将近20年之后，国际标准才颁布。
Javascript有很多缺陷，但是JavaScript 在前端地位无可替代，

### 什么是Node.js

Node.js于2009年首次推出，由Ryan Dahl开发，是一个建立在谷歌V8引擎上的JavaScript运行环境，其主要目的是在服务器上运行JavaScript，因此JavaScript可以在浏览器之外执行。Node.js最棒的地方在于它从不阻塞I/O，是事件驱动的，可以用来创建高度可扩展的应用程序。在Node.js中，所有东西都是一个模块，利用这些模块，开发者可以利用Node.js创建网络API、Rest API服务器、命令行应用程序和实时聊天应用程序。

### Node.js和Java Script区别

JavaScript是一种适当的高级编程语言，用于创建网络脚本，而Node.js是一种建立在谷歌V8引擎上的运行时间环境。
JavaScript是在浏览器中执行的，而使用Node.js使我们有能力在浏览器之外执行JavaScript。
JavaScript可以操作DOM或在其中添加HTML，而Node.js没有添加HTML的能力。
JavaScript主要用于创建前端Web应用程序或开发客户端，而Node.js则用于后端开发，即服务器端开发。
JavaScript在编写程序时遵循JavaScript的标准，而Node.js是用C++编写的，同时使用v8引擎，它在浏览器外运行JavaScript。
JavaScript需要任何运行环境，因为它可以在任何引擎上执行，如Firefox的spider monkey、google chrome的v8引擎、Safari的JavaScript核心，而Node.js只在google chrome的v8引擎上运行。

JavaScript是一种高级的、轻量级的（简单的语法）和面向对象的编程语言，几乎每个网络开发者都会使用它来创建网页、网络应用程序、移动应用程序，也被用于游戏开发。Node.js是一个建立在google v8引擎上的JavaScript运行环境，用于在浏览器之外运行JavaScript，简单地说，它只是一个具有许多模块的JavaScript库的扩展，因此使JavaScript更加强大。
