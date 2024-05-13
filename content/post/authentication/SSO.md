---
title: "SSO单点登录"
description: 
date: 2024-05-13T08:34:23+08:00
image: 
math: 
license: 
hidden: false
comments: true
categories:
    - Java
tags:
    - 认证鉴权
draft: false
---

## SSO介绍

### 概念

SSO 英文全称 Single Sign On，单点登录。SSO 是在多个应用系统中，用户只需要登录一次就可以访问所有相互信任的应用系统。

### 好处

**用户角度** :用户能够做到一次登录多次使用，无需记录多套用户名和密码，省心。

**系统管理员角度** : 管理员只需维护好一个统一的账号中心就可以了，方便。

**新系统开发角度:** 新系统开发时只需直接对接统一的账号中心即可，简化开发流程，省时

## 实现方式

设计方式：

![单点登录（SSO）设计](https://img-1312072469.cos.ap-nanjing.myqcloud.com/sso-system.png-kblb.png)

### 用户登录状态的存储与校验

常见的 Web 框架对于 Session 的实现都是生成一个 SessionId 存储在浏览器 Cookie 中。然后将 Session 内容存储在服务器端内存中。

用户登录成功之后，生成 AuthToken 交给客户端保存。如果是浏览器，就保存在 Cookie 中。如果是手机 App 就保存在 App 本地缓存中。本篇主要探讨基于 Web 站点的 SSO。

用户在浏览需要登录的页面时，客户端将 AuthToken 提交给 SSO 服务校验登录状态/获取用户登录信息

对于登录信息的存储，建议采用 Redis，使用 Redis 集群来存储登录信息，既可以保证高可用，又可以线性扩充。同时也可以让 SSO 服务满足负载均衡/可伸缩的需求。

| 对象      | 说明                                                         |
| --------- | ------------------------------------------------------------ |
| AuthToken | 直接使用 UUID/GUID 即可，如果有验证 AuthToken 合法性需求，可以将 UserName+时间戳加密生成，服务端解密之后验证合法性 |
| 登录信息  | 通常是将 UserId，UserName 缓存起来                           |

### 用户登录/登录校验

登陆时序图

![SSO系统设计-登录时序图](https://img-1312072469.cos.ap-nanjing.myqcloud.com/sso-login-sequence.png-kbrb.png)

按照上图，用户登录后 AuthToken 保存在 Cookie 中。 [domain=test.comopen in new window](http://domain=test.com)
 浏览器会将 domain 设置成 .test.com，

这样访问所有 *.test.com 的 web 站点，都会将 AuthToken 携带到服务器端。然后通过 SSO 服务，完成对用户状态的校验/用户登录信息的获取

**登录信息获取/登录状态校验**

![SSO系统设计-登录信息获取/登录状态校验](https://img-1312072469.cos.ap-nanjing.myqcloud.com/sso-logincheck-sequence.png-kbrb.png)

### 用户登出

用户登出时要做的事情很简单：

1. 服务端清除缓存（Redis）中的登录状态
2. 客户端清除存储的 AuthToken

**登出时序图**

![SSO系统设计-用户登出](https://img-1312072469.cos.ap-nanjing.myqcloud.com/sso-logout-sequence.png-kbrb.png)

### 跨域登录、登出

前面提到过，核心思路是客户端存储 AuthToken，服务器端通过 Redis 存储登录信息。由于客户端是将 AuthToken 存储在 Cookie 中的。所以跨域要解决的问题，就是如何解决 Cookie 的跨域读写问题。

解决跨域的核心思路就是：

- 登录完成之后通过回调的方式，将 AuthToken 传递给主域名之外的站点，该站点自行将 AuthToken 保存在当前域下的 Cookie 中。
- 登出完成之后通过回调的方式，调用非主域名站点的登出页面，完成设置 Cookie 中的 AuthToken 过期的操作。

**跨域登录（主域名已登录）**

![SSO系统设计-跨域登录（主域名已登录）](https://img-1312072469.cos.ap-nanjing.myqcloud.com/sso-crossdomain-login-loggedin-sequence.png-kbrb.png)

**跨域登录（主域名未登录）**

![SSO系统设计-跨域登录（主域名未登录）](https://img-1312072469.cos.ap-nanjing.myqcloud.com/sso-crossdomain-login-unlogin-sequence.png-kbrb.png)

**跨域登出**

![SSO系统设计-跨域登出](https://img-1312072469.cos.ap-nanjing.myqcloud.com/sso-crossdomain-logout-sequence.png-kbrb.png)

