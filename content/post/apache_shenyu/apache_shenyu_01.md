---
title: "shenyu 架构分析"
description: 
date: 2023-08-28T19:19:24+08:00
image: https://shenyu.apache.org/zh/img/logo.svg
math: 
license: 
hidden: false
categories:
    - Java
tags:
    - 源码阅读
comments: true
draft: false
---

最近在做开源之夏的项目，使用shenyu-k8s-ingress增强项目，自己是在太菜了，导致PMC都无话可说了，加上自己没有时间，但是既然接手了，一定要做到最好，因此，这个系列的目的就是记录shenyu插件的运行流程，同时说明shenyu-k8s-ingress中的注入流程。

之所以把这个系列写在博客上面而不是写在自己的笔记上面，算是对自己的监督吧。也是把自己放在耻辱柱一回，去年开源之夏太简单了，导致自己过于大意，这个开源之夏其实一点都不难，就是自己对于基础知识不熟悉以及shenyu插件不熟悉（双重bug叠满了），导致自己进度缓慢，尤其是今天开发websocket，对于websocket运行流程一无所知，实在是太离谱了...

下面进入正题，将从shenyu的启动，shenyu-websocket插件运行流程进行讲解说明。

## 本地化启动shenyu

首先本地化启动是一个傻瓜式教程，这里的话根据最近的理解，简单说一下shenyu的架构吧。

![img](https://shenyu.apache.org/img/shenyu/activite/shenyu-xmind.png)

上图算是[shenyu官网](https://shenyu.apache.org/zh/docs/index)的总体架构，其中算是很详细的说明了：

1. shenyu的优点。
2. 与其他网关插件比较。
3. 特点
4. 解决的问题
5. 核心架构

前面的话可以参考官网，但是最核心的第5点，下面详细说明第5点。

## 核心架构

核心架构主要包含了shenyu-admin与shenyu-bootstrap两个方面的内容。这里还是分开进行讲解。

### shenyu-admin

shenyu-admin主要实现3个功能：

1. 配置功能服务。
2. 同步服务数据。
3. 权限控制。

下面的话从源码上面进行说明，启动流程参见官网上面的本地部署，由于目前的工作暂时没有使用到同步服务数据。因此这部分暂时先跳过源码分析，暂时理解成就是一个数据前端展示页面。

### shenyu-bootstrap

这部分是需要重点关注的，主要实现的功能是：

1. 与客户端的数据进行同步
2. 插件模块
3. 处理模块事件

今天先这样吧，下一讲主要结合插件，分析插件注入的时候执行的具体流程。

