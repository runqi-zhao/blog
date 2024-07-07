---
title: "CDN详解"
description: 
date: 2024-05-11T16:42:42+08:00
image: 
math: 
license: 
categories:
    - 计算机基础
tags:
    - 计算机网络
hidden: false
comments: true
draft: false
---

## 什么是CDN

**CDN** 全称是 Content Delivery Network/Content Distribution Network，翻译过的意思是 **内容分发网络** 。

这个概念个人觉得可以跟DNS进行比较，也就是咱们再找对应目标（数据）的时候，从不同DNS上查找，减少总域名服务器的压力。总体来说，CDN可以分为两个部分：

1. 内容：指的是静态资源比如图片、视频、文档、JS、CSS、HTML。
2. 分发网络：指的是将这些静态资源分发到位于多个不同的地理位置机房中的服务器上，这样，就可以实现静态资源的就近访问比如北京的用户直接访问北京机房的数据。

**CDN 就是将静态资源分发到多个不同的地方以实现就近访问，进而加快静态资源的访问速度，减轻服务器以及带宽的负担。**

![图片](https://img-1312072469.cos.ap-nanjing.myqcloud.com/640)

我们经常拿全站加速和内容分发网络做对比，不要把两者搞混了！全站加速（不同云服务商叫法不同，腾讯云叫 ECDN、阿里云叫 DCDN）既可以加速静态资源又可以加速动态资源，内容分发网络（CDN）主要针对的是 **静态资源** 。



## CDN工作原理

咱们再请求资源的时候，如果没有CDN，会经过以下步骤：

![1715419331824](https://img-1312072469.cos.ap-nanjing.myqcloud.com/1715419331824.jpg)

而在使用CDN后，源站域名解析将配置为Cname，即将域名解析到CDN域名，并最终由CDN厂商的GSLB分配IP。此时，整体的访问流程变成如下所示，浏览器将到CDN节点请求资源。

![1715419348731](https://img-1312072469.cos.ap-nanjing.myqcloud.com/1715419348731.jpg)

### GSLB

GSLB系统可以基于智能的DNS技术来实现，相比于传统DNS具有功能更加强大、更加智能的特点。GSLB根据预先配置好的策略，为用户分配最适合的节点地址。

以下几种为GSLB常见的调度策略：

**. 基于Local DNS的静态调度**

该策略会根据Local DNS的IP地址（或者终端机器的IP地址），然后在配置里面找到IP所对应的区域，返回该区域最适合的CDN节点地址给到客户端。

**. 基于RTT的调度**

RTT（Round-Trip Time）指节点到目标之间数据的往返时延，该策略会根据Local DNS的IP地址，将候选的CDN节点与该地址的RTT进行比较，并将其中RTT小的节点调度给用户。

**. 基于成本和带宽的调度**

成本方面主要从CDN厂商角度考虑，比如在某些业务少的地区，调度器会将部分请求调度给到其他区域的节点处理，这样可以减少在该区域的节点部署 。而基于带宽的调度则会根据CDN节点的出口带宽大小计算权重，分配访问请求。

**. 基于服务等级的调度**

该策略基于目标域名的企业服务等级，通常会将质量更好节点分配给等级更高的企业客户，以便提供给高级别用户更好的服务。

以上几种为常见的调度策略，CDN厂商通常会将这几种方式结合使用，在成本和带宽满足的情况下，尽量提供就近选择的节点资源。当然，不排除部分CDN厂商还会有自身的定制化策略。

### 缓存系统

缓存系统最基本的工作单元就是许许多多的Cache节点(缓存服务器），Cache节点负责直接响应最终用户的访问请求，把缓存在本地的内容快速提供给用户。同时 ，Cache节点也会与源站进行内容同步，把更新的内容以及本地没有的内容从源站点获取并保存在本地。

缓存系统可能存在着多层级的架构，如典型的三层架构：边缘节点作为最接近用户的节点，提供给到用户进行就近访问。当边缘节点未命中资源时，会向上层节点请求。如果在中心节点仍未命中，则会回源到源站进行获取。

![1715419477618](https://img-1312072469.cos.ap-nanjing.myqcloud.com/1715419477618.jpg)

这个其实就是：咱们将对应经常使用的，放在对应的边缘节点，然后不经常使用的放在中心节点。

### 静态资源是如何加载到CDN中的

可以使用预热与回源两种方法进行加载：

- 预热是指在 CDN 上提前将内容缓存到 CDN 节点上。这样当用户在请求这些资源时，能够快速地从最近的 CDN 节点获取到而不需要回源，进而减少了对源站的访问压力，提高了访问速度。
- 回源：当 CDN 节点上没有用户请求的资源或该资源的缓存已经过期时，CDN 节点需要从原始服务器获取最新的资源内容，这个过程就是回源。当用户请求发生回源的话，会导致该请求的响应速度比未使用 CDN 还慢，因为相比于未使用 CDN 还多了一层 CDN 的调用流程。

## 如何防止资源被盗

如果我们的资源被其他用户或者网站非法盗刷的话，将会是一笔不小的开支。

解决这个问题最常用最简单的办法设置 **Referer 防盗链**，具体来说就是根据 HTTP 请求的头信息里面的 Referer 字段对请求进行限制。我们可以通过 Referer 字段获取到当前请求页面的来源页面的网站地址，这样我们就能确定请求是否来自合法的网站。

![腾讯云 CDN Referer 防盗链配置](https://img-1312072469.cos.ap-nanjing.myqcloud.com/cnd-tencent-cloud-anti-theft.png)

这种方式比较基础，如果站点的防盗链配置允许 Referer 为空的话，通过隐藏 Referer，可以直接绕开防盗链。

因此，通常情况下，我们会配合其他机制来确保静态资源被盗用，一种常用的机制是 **时间戳防盗链** 。相比之下，**时间戳防盗链** 的安全性更强一些。时间戳防盗链加密的 URL 具有时效性，过期之后就无法再被允许访问。

时间戳防盗链的 URL 通常会有两个参数一个是签名字符串，一个是过期时间。签名字符串一般是通过对用户设定的加密字符串、请求路径、过期时间通过 MD5 哈希算法取哈希的方式获得。

## 总结

CDN 就是将静态资源分发到多个不同的地方以实现就近访问，进而加快静态资源的访问速度，减轻服务器以及带宽的负担。

基于成本、稳定性和易用性考虑，建议直接选择专业的云厂商（比如阿里云、腾讯云、华为云、青云）或者 CDN 厂商（比如网宿、蓝汛）提供的开箱即用的 CDN 服务。

GSLB （Global Server Load Balance，全局负载均衡）是 CDN 的大脑，负责多个 CDN 节点之间相互协作，最常用的是基于 DNS 的 GSLB。CDN 会通过 GSLB 找到最合适的 CDN 节点。

为了防止静态资源被盗用，我们可以利用 **Referer 防盗链** + **时间戳防盗链** 。