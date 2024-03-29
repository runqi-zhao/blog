---
title: "请求处理流程"
description: 
date: 2023-08-29T08:43:31+08:00
image: https://shenyu.apache.org/zh/img/logo.svg
math: 
license: 
hidden: false
comments: true
categories:
    - Java
tags:
    - Apache Shenyu
    - 源码阅读
draft: false

---

最近开学了，折磨的机器学习回来了，讲道理，自己接这个任务时间点太不对了，自己都忙成狗了，还没有提前做完，最近还卡住了，但是无论如何，加油吧。

接着上一讲，在我们知道了shenyu的基本架构之后，分别启动shenyu-admin与shenyu-bootstrap。

下面将结合shenyu-examples-divide进行断点调试，试图找到shenyu插件请求处理的流程。

首先先来到shenyu-examples/shenyu-examples-divide下面，运行已经写好的divide插件，对应的日志如下：

```shell
2023-08-29 09:00:57.321  INFO 3136 --- [           main] o.a.s.e.http.ShenyuTestHttpApplication   : Starting ShenyuTestHttpApplication using Java 1.8.0_333 on DESKTOP-M708U6C with PID 3136 (E:\shenyu\shenyu-examples\shenyu-examples-http\target\classes started by root in E:\shenyu)
2023-08-29 09:00:57.327  INFO 3136 --- [           main] o.a.s.e.http.ShenyuTestHttpApplication   : No active profile set, falling back to 1 default profile: "default"
2023-08-29 09:00:59.179  INFO 3136 --- [           main] o.s.b.a.e.web.EndpointLinksResolver      : Exposing 1 endpoint(s) beneath base path '/actuator'
2023-08-29 09:00:59.280  INFO 3136 --- [           main] o.a.s.c.c.s.ShenyuClientShutdownHook     : Add hook ShenyuClientShutdownHook-1
2023-08-29 09:00:59.982  INFO 3136 --- [           main] o.s.b.web.embedded.netty.NettyWebServer  : Netty started on port 8189
2023-08-29 09:01:00.335  INFO 3136 --- [      Thread-12] o.a.s.c.c.s.ShenyuClientShutdownHook     : hook Thread-7 will sleep 3000ms when it start
2023-08-29 09:01:00.335  INFO 3136 --- [      Thread-12] o.a.s.c.c.s.ShenyuClientShutdownHook     : hook Thread-0 will sleep 3000ms when it start
2023-08-29 09:01:00.335  INFO 3136 --- [      Thread-12] o.a.s.c.c.s.ShenyuClientShutdownHook     : hook SpringApplicationShutdownHook will sleep 3000ms when it start
2023-08-29 09:01:01.407  INFO 3136 --- [or_consumer_-42] o.a.s.r.client.http.utils.RegisterUtils  : login success: {"id":"1","userName":"admin","role":1,"enabled":true,"dateCreated":"2023-08-29 08:58:47","dateUpdated":"2023-08-29 08:58:47","token":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyTmFtZSI6ImFkbWluIiwiZXhwIjoxNjkzMzU3MjYxfQ.O2GeU9KyasKCqKNgLzCMqjSlbfp1GfuYG9vrsWW7npQ","expiredTime":86400000} 
2023-08-29 09:01:01.436  INFO 3136 --- [or_consumer_-34] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/test/**","pathDesc":"","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.HttpTestController","ruleName":"/http/test/**","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860328,"addPrefixed":false} 
2023-08-29 09:01:01.436  INFO 3136 --- [or_consumer_-46] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/post/hi","pathDesc":"spring annotation register","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController","methodName":"post","ruleName":"/http/post/hi","parameterTypes":"java.lang.String","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860334,"addPrefixed":false} 
2023-08-29 09:01:01.436  INFO 3136 --- [or_consumer_-38] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/order/path/**/name","pathDesc":"","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.OrderController","methodName":"testRestFul","ruleName":"/http/order/path/**/name","parameterTypes":"java.lang.String","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860331,"addPrefixed":false} 
2023-08-29 09:01:01.436  INFO 3136 --- [or_consumer_-56] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/oauth/authorize","httpMethod":0,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.OauthController\",\"methodName\":\"testCode\",\"parameterTypes\":\"\"}","apiOwner":"admin","apiDesc":"authorize","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/oauth/authorize\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/oauth/authorize\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/oauth/authorize] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:01.436  INFO 3136 --- [or_consumer_-37] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/order/oauth2/test","pathDesc":"","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.OrderController","methodName":"testRestFul","ruleName":"/http/order/oauth2/test","parameterTypes":"org.springframework.http.server.reactive.ServerHttpRequest","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860330,"addPrefixed":false} 
2023-08-29 09:01:01.436  INFO 3136 --- [or_consumer_-49] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/upload/**","pathDesc":"","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.UploadController","ruleName":"/http/upload/**","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860335,"addPrefixed":false} 
2023-08-29 09:01:01.436  INFO 3136 --- [or_consumer_-44] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/shenyu/client/hello","pathDesc":"","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.ShenyuClientPathController","methodName":"hello","ruleName":"/http/shenyu/client/hello","parameterTypes":"","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860333,"addPrefixed":false} 
2023-08-29 09:01:01.436  INFO 3136 --- [or_consumer_-53] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/test/path/{id}/name","httpMethod":0,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{}","apiOwner":"admin","apiDesc":"path/{id}/name","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/test/path/{id}/name\",\"parameters\":[{\"name\":\"id\",\"in\":\"path\",\"required\":true,\"schema\":{\"type\":\"string\"}}],\"responses\":{\"200\":{\"description\":\"/http/test/path/{id}/name\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/test/path/{id}/name] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:01.438  INFO 3136 --- [or_consumer_-45] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/shenyu/client/hi","pathDesc":"","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.ShenyuClientPathController","methodName":"hello","ruleName":"/http/shenyu/client/hi","parameterTypes":"java.lang.String","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860333,"addPrefixed":false} 
2023-08-29 09:01:01.438  INFO 3136 --- [or_consumer_-54] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/test/findByPage","httpMethod":0,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{}","apiOwner":"admin","apiDesc":"findByPage","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/test/findByPage\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/test/findByPage\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/test/findByPage] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:01.440  INFO 3136 --- [or_consumer_-50] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/test/payment","httpMethod":2,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{}","apiOwner":"admin","apiDesc":"payment","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/test/payment\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/test/payment\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/test/payment] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:01.440  INFO 3136 --- [or_consumer_-55] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/test/path/{id}","httpMethod":0,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{}","apiOwner":"admin","apiDesc":"path/{id}","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/test/path/{id}\",\"parameters\":[{\"name\":\"id\",\"in\":\"path\",\"required\":true,\"schema\":{\"type\":\"string\"}}],\"responses\":{\"200\":{\"description\":\"/http/test/path/{id}\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/test/path/{id}] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:01.440  INFO 3136 --- [or_consumer_-35] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/oauth/oauth","pathDesc":"","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.OauthController","methodName":"testCode","ruleName":"/http/oauth/oauth","parameterTypes":"","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860329,"addPrefixed":false} 
2023-08-29 09:01:01.441  INFO 3136 --- [or_consumer_-47] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/hello","pathDesc":"spring annotation register","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController","methodName":"hello","ruleName":"/http/hello","parameterTypes":"","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860334,"addPrefixed":false} 
2023-08-29 09:01:01.444  INFO 3136 --- [or_consumer_-48] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/hi","pathDesc":"spring annotation register","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController","methodName":"hello","ruleName":"/http/hi","parameterTypes":"java.lang.String","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860334,"addPrefixed":false} 
2023-08-29 09:01:01.444  INFO 3136 --- [or_consumer_-51] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/test/findByUserId","httpMethod":0,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{}","apiOwner":"admin","apiDesc":"findByUserId","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/test/findByUserId\",\"parameters\":[{\"name\":\"userId\",\"in\":\"query\",\"required\":true,\"schema\":{\"type\":\"string\"}}],\"responses\":{\"200\":{\"description\":\"/http/test/findByUserId\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/test/findByUserId] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:01.444  INFO 3136 --- [or_consumer_-52] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/test/findByUserIdName","httpMethod":0,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{}","apiOwner":"admin","apiDesc":"findByUserIdName","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/test/findByUserIdName\",\"parameters\":[{\"name\":\"userId\",\"in\":\"query\",\"required\":true,\"schema\":{\"type\":\"string\"}},{\"name\":\"name\",\"in\":\"query\",\"required\":true,\"schema\":{\"type\":\"string\"}}],\"responses\":{\"200\":{\"description\":\"/http/test/findByUserIdName\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/test/findByUserIdName] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:01.445  INFO 3136 --- [or_consumer_-40] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/request/**","pathDesc":"","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.RequestController","ruleName":"/http/request/**","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860331,"addPrefixed":false} 
2023-08-29 09:01:01.445  INFO 3136 --- [or_consumer_-36] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/order/save","pathDesc":"","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.OrderController","methodName":"save","ruleName":"/http/order/save","parameterTypes":"org.apache.shenyu.examples.http.dto.OrderDTO","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860330,"addPrefixed":false} 
2023-08-29 09:01:01.445  INFO 3136 --- [or_consumer_-39] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/order/path/**","pathDesc":"","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.OrderController","methodName":"getPathVariable","ruleName":"/http/order/path/**","parameterTypes":"java.lang.String,java.lang.String","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860331,"addPrefixed":false} 
2023-08-29 09:01:01.447  INFO 3136 --- [or_consumer_-42] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/shenyu/client/timeout","pathDesc":"","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.ShenyuClientPathController","methodName":"timeout","ruleName":"/http/shenyu/client/timeout","parameterTypes":"","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860332,"addPrefixed":false} 
2023-08-29 09:01:01.447  INFO 3136 --- [or_consumer_-41] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/order/findById","pathDesc":"","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.OrderController","methodName":"findById","ruleName":"/http/order/findById","parameterTypes":"java.lang.String","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860331,"addPrefixed":false} 
2023-08-29 09:01:01.447  INFO 3136 --- [or_consumer_-43] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/shenyu/client/post/hi","pathDesc":"shenyu client annotation register","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.ShenyuClientPathController","methodName":"post","ruleName":"/http/shenyu/client/post/hi","parameterTypes":"java.lang.String","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860333,"addPrefixed":false} 
2023-08-29 09:01:01.447  INFO 3136 --- [or_consumer_-57] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/order/save","httpMethod":2,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.OrderController\",\"methodName\":\"save\",\"parameterTypes\":\"org.apache.shenyu.examples.http.dto.OrderDTO\"}","apiOwner":"admin","apiDesc":"save","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/order/save\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/order/save\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/order/save] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:01.448  INFO 3136 --- [or_consumer_-33] o.a.s.r.client.http.utils.RegisterUtils  : uri client register success: {"protocol":"http://","appName":"http","contextPath":"/http","rpcType":"http","host":"192.168.186.1","port":8189,"eventType":"REGISTER"} 
2023-08-29 09:01:01.641  INFO 3136 --- [or_consumer_-58] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/order/oauth2/test","httpMethod":0,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.OrderController\",\"methodName\":\"testRestFul\",\"parameterTypes\":\"org.springframework.http.server.reactive.ServerHttpRequest\"}","apiOwner":"admin","apiDesc":"oauth2/test","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/order/oauth2/test\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/order/oauth2/test\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/order/oauth2/test] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:02.040  INFO 3136 --- [or_consumer_-59] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/order/path/{id}/name","httpMethod":0,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.OrderController\",\"methodName\":\"testRestFul\",\"parameterTypes\":\"java.lang.String\"}","apiOwner":"admin","apiDesc":"path/**/name","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/order/path/{id}/name\",\"parameters\":[{\"name\":\"id\",\"in\":\"path\",\"required\":true,\"schema\":{\"type\":\"string\"}}],\"responses\":{\"200\":{\"description\":\"/http/order/path/{id}/name\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/order/path/{id}/name] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:02.369  INFO 3136 --- [or_consumer_-60] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/order/path/{id}/{name}","httpMethod":0,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.OrderController\",\"methodName\":\"getPathVariable\",\"parameterTypes\":\"java.lang.String,java.lang.String\"}","apiOwner":"admin","apiDesc":"path/**","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/order/path/{id}/{name}\",\"parameters\":[{\"name\":\"id\",\"in\":\"path\",\"required\":true,\"schema\":{\"type\":\"string\"}},{\"name\":\"name\",\"in\":\"path\",\"required\":true,\"schema\":{\"type\":\"string\"}}],\"responses\":{\"200\":{\"description\":\"/http/order/path/{id}/{name}\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/order/path/{id}/{name}] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:02.667  INFO 3136 --- [or_consumer_-61] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/order/findById","httpMethod":0,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.OrderController\",\"methodName\":\"findById\",\"parameterTypes\":\"java.lang.String\"}","apiOwner":"admin","apiDesc":"findById","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/order/findById\",\"parameters\":[{\"name\":\"id\",\"in\":\"query\",\"required\":true,\"schema\":{\"type\":\"string\"}}],\"responses\":{\"200\":{\"description\":\"/http/order/findById\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/order/findById] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:02.995  INFO 3136 --- [or_consumer_-62] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/post/hi","httpMethod":2,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController\",\"methodName\":\"post\",\"parameterTypes\":\"java.lang.String\"}","apiOwner":"admin","apiDesc":"post/hi","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/post/hi\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/post/hi\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/post/hi] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:06.461  INFO 3136 --- [or_consumer_-34] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/hello","httpMethod":1,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController\",\"methodName\":\"hello\",\"parameterTypes\":\"\"}","apiOwner":"admin","apiDesc":"hello","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/hello\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/hello\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/hello] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:06.461  INFO 3136 --- [or_consumer_-37] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/hello","httpMethod":4,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController\",\"methodName\":\"hello\",\"parameterTypes\":\"\"}","apiOwner":"admin","apiDesc":"hello","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/hello\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/hello\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/hello] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:06.461  INFO 3136 --- [or_consumer_-56] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/hello","httpMethod":2,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController\",\"methodName\":\"hello\",\"parameterTypes\":\"\"}","apiOwner":"admin","apiDesc":"hello","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/hello\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/hello\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/hello] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:06.461  INFO 3136 --- [or_consumer_-46] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/hello","httpMethod":0,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController\",\"methodName\":\"hello\",\"parameterTypes\":\"\"}","apiOwner":"admin","apiDesc":"hello","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/hello\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/hello\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/hello] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:06.461  INFO 3136 --- [or_consumer_-49] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/hello","httpMethod":7,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController\",\"methodName\":\"hello\",\"parameterTypes\":\"\"}","apiOwner":"admin","apiDesc":"hello","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/hello\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/hello\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/hello] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:06.462  INFO 3136 --- [or_consumer_-64] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/hello","httpMethod":5,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController\",\"methodName\":\"hello\",\"parameterTypes\":\"\"}","apiOwner":"admin","apiDesc":"hello","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/hello\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/hello\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/hello] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:06.462  INFO 3136 --- [or_consumer_-63] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/hello","httpMethod":6,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController\",\"methodName\":\"hello\",\"parameterTypes\":\"\"}","apiOwner":"admin","apiDesc":"hello","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/hello\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/hello\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/hello] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:06.463  INFO 3136 --- [or_consumer_-38] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/hello","httpMethod":3,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController\",\"methodName\":\"hello\",\"parameterTypes\":\"\"}","apiOwner":"admin","apiDesc":"hello","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/hello\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/hello\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/hello] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:09.793  INFO 3136 --- [or_consumer_-35] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/hi","httpMethod":5,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController\",\"methodName\":\"hello\",\"parameterTypes\":\"java.lang.String\"}","apiOwner":"admin","apiDesc":"hi","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/hi\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/hi\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/hi] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:09.793  INFO 3136 --- [or_consumer_-50] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/hi","httpMethod":3,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController\",\"methodName\":\"hello\",\"parameterTypes\":\"java.lang.String\"}","apiOwner":"admin","apiDesc":"hi","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/hi\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/hi\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/hi] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:09.793  INFO 3136 --- [or_consumer_-44] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/hi","httpMethod":6,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController\",\"methodName\":\"hello\",\"parameterTypes\":\"java.lang.String\"}","apiOwner":"admin","apiDesc":"hi","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/hi\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/hi\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/hi] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:09.793  INFO 3136 --- [or_consumer_-54] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/hi","httpMethod":2,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController\",\"methodName\":\"hello\",\"parameterTypes\":\"java.lang.String\"}","apiOwner":"admin","apiDesc":"hi","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/hi\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/hi\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/hi] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:09.794  INFO 3136 --- [or_consumer_-45] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/hi","httpMethod":7,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController\",\"methodName\":\"hello\",\"parameterTypes\":\"java.lang.String\"}","apiOwner":"admin","apiDesc":"hi","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/hi\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/hi\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/hi] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:09.795  INFO 3136 --- [or_consumer_-53] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/hi","httpMethod":4,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController\",\"methodName\":\"hello\",\"parameterTypes\":\"java.lang.String\"}","apiOwner":"admin","apiDesc":"hi","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/hi\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/hi\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/hi] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:09.796  INFO 3136 --- [or_consumer_-48] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/upload/webFluxFiles","httpMethod":2,"consume":"multipart/form-data,text/plain","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{}","apiOwner":"admin","apiDesc":"webFluxFiles","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/upload/webFluxFiles\",\"parameters\":[{\"name\":\"files\",\"in\":\"query\",\"required\":false,\"schema\":{\"type\":\"string\"}}],\"responses\":{\"200\":{\"description\":\"/http/upload/webFluxFiles\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/upload/webFluxFiles] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:09.798  INFO 3136 --- [or_consumer_-55] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/hi","httpMethod":1,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController\",\"methodName\":\"hello\",\"parameterTypes\":\"java.lang.String\"}","apiOwner":"admin","apiDesc":"hi","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/hi\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/hi\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/hi] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:09.799  INFO 3136 --- [or_consumer_-35] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/upload/webFluxSingle","httpMethod":2,"consume":"multipart/form-data,text/plain","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{}","apiOwner":"admin","apiDesc":"webFluxSingle","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/upload/webFluxSingle\",\"parameters\":[{\"name\":\"file\",\"in\":\"query\",\"required\":true,\"schema\":{\"type\":\"string\"}}],\"responses\":{\"200\":{\"description\":\"/http/upload/webFluxSingle\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/upload/webFluxSingle] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:09.799  INFO 3136 --- [or_consumer_-47] o.a.s.r.client.http.utils.RegisterUtils  : apiDoc client register success: {"contextPath":"/http","apiPath":"/http/hi","httpMethod":0,"consume":"*/*","produce":"*/*","version":"v0.01","rpcType":"http","state":0,"ext":"{\"protocol\":\"http://\",\"host\":\"192.168.186.1\",\"port\":8189,\"addPrefixed\":false,\"serviceName\":\"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController\",\"methodName\":\"hello\",\"parameterTypes\":\"java.lang.String\"}","apiOwner":"admin","apiDesc":"hi","apiSource":1,"document":"{\"tags\":[],\"operationId\":\"/http/hi\",\"parameters\":[],\"responses\":{\"200\":{\"description\":\"/http/hi\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"404\":{\"description\":\"the path [/http/hi] not found\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}},\"409\":{\"description\":\"conflict\",\"content\":{\"*/*\":{\"schema\":{\"type\":\"string\"}}}}}}","eventType":"REGISTER","tags":[]} 
2023-08-29 09:01:09.804  INFO 3136 --- [           main] o.a.s.e.http.ShenyuTestHttpApplication   : Started ShenyuTestHttpApplication in 13.143 seconds (JVM running for 14.434)
```

从日志上面分析，判断注入到网关上面需要经历的过程：

## 服务注册

首先先看第一句：

```shell
2023-08-29 09:01:01.407  INFO 3136 --- [or_consumer_-42] o.a.s.r.client.http.utils.RegisterUtils  : login success: {"id":"1","userName":"admin","role":1,"enabled":true,"dateCreated":"2023-08-29 08:58:47","dateUpdated":"2023-08-29 08:58:47","token":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyTmFtZSI6ImFkbWluIiwiZXhwIjoxNjkzMzU3MjYxfQ.O2GeU9KyasKCqKNgLzCMqjSlbfp1GfuYG9vrsWW7npQ","expiredTime":86400000} 
```

这个其实就是首先登录与shenyu-admin进行连接，这个在yaml文档中有配置：

```yaml
shenyu:
  register:
    registerType: http #zookeeper #etcd #nacos #consul
    serverLists: http://localhost:9095 #localhost:2181 #http://localhost:2379 #localhost:8848
    props:
      username: admin
      password: 123456

```

shenyu.register.registerType代表类型，包括http,zk,nacos等。

shenyu.register.serverListsd代表shenyu-admin的地址或者是其他服务的地址，根据对应的地址注入对应的形式。

shenyu.register.props标识需要输入的用户名以及密码。

然后是怎么进行连接的，这里直接使用admin接口进行同步。

这里直接看shenyu-register-http(application中可以进行映射，先将文件中的配置进行读入，TODO搞清楚为什么能够来到这个类)

这里的话应该涉及到数据同步的内容吧，这里先按下不表。

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/20231005232757.png)

这里其实可以看到是道道HttpClientRegisterRepository中，这里肯定直接调用了对应的内容。

然后找到下面这个类：

```java
public final class RegisterUtils {
	/**
     * Do register.
     *
     * @param json the json
     * @param url  the url
     * @param type the type
     * @throws IOException the io exception
     */
    public static void doRegister(final String json, final String url, final String type) throws IOException {
        String result = OkHttpTools.getInstance().post(url, json);
        if (Objects.equals(SUCCESS, result)) {
            LOGGER.info("{} client register success: {} ", type, json);
        } else {
            LOGGER.error("{} client register error: {} ", type, json);
        }
    }
```

这个可以知道对应这里，但是怎么讲数据传输过来，虽然找到了部分源码，但是应该与spring也有关系，这里来个TODO。

这部分使用的到的是服务注册中的内容，可以看服务注册的那篇文章。

ok，这一句的作用讲解完毕，看下面的日志：

```shell
2023-08-29 09:01:01.436  INFO 3136 --- [or_consumer_-34] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/test/**","pathDesc":"","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.HttpTestController","ruleName":"/http/test/**","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860328,"addPrefixed":false}
2023-08-29 09:01:01.436  INFO 3136 --- [or_consumer_-34] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/test/**","pathDesc":"","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.HttpTestController","ruleName":"/http/test/**","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860328,"addPrefixed":false} 
2023-08-29 09:01:01.436  INFO 3136 --- [or_consumer_-46] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/post/hi","pathDesc":"spring annotation register","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.SpringMvcMappingPathController","methodName":"post","ruleName":"/http/post/hi","parameterTypes":"java.lang.String","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860334,"addPrefixed":false} 
2023-08-29 09:01:01.436  INFO 3136 --- [or_consumer_-38] o.a.s.r.client.http.utils.RegisterUtils  : metadata client register success: {"appName":"http","contextPath":"/http","path":"/http/order/path/**/name","pathDesc":"","rpcType":"http","serviceName":"org.apache.shenyu.examples.http.controller.OrderController","methodName":"testRestFul","ruleName":"/http/order/path/**/name","parameterTypes":"java.lang.String","enabled":true,"pluginNames":[],"registerMetaData":true,"timeMillis":1693270860331,"addPrefixed":false} 
```

这个就是将客户端的内容注册到网关之中，如下：

```
  client:
      http:
        props:
          contextPath: /http
          appName: http
#          port: 8189
```

这里最近在编写自己的插件时，产生了一些疑问：

按照shenyu的架构，在这里编写的client应该会跳转到shenyu-client下面进行调用。

首先先看上面的日志，最开始第一句，用户仍然会调用到RegisterUtils中：

```java
public final class RegisterUtils {

    private static final Logger LOGGER = LoggerFactory.getLogger(RegisterUtils.class);

    private RegisterUtils() {
    }

    /**
     * Do register.
     *
     * @param json        the json
     * @param url         the url
     * @param type        the type
     * @param accessToken the token
     * @throws IOException the io exception
     */
    public static void doRegister(final String json, final String url, final String type, final String accessToken) throws IOException {
        if (StringUtils.isBlank(accessToken)) {
            LOGGER.error("{} client register error accessToken is null, please check the config : {} ", type, json);
            return;
        }
        Headers headers = new Headers.Builder().add(Constants.X_ACCESS_TOKEN, accessToken).build();
        String result = OkHttpTools.getInstance().post(url, json, headers);
        if (Objects.equals(SUCCESS, result)) {
            LOGGER.info("{} client register success: {} ", type, json);
        } else {
            LOGGER.error("{} client register error: {} ", type, json);
        }
    }
    
    /**
     * Do register.
     *
     * @param json the json
     * @param url  the url
     * @param type the type
     * @throws IOException the io exception
     */
    public static void doRegister(final String json, final String url, final String type) throws IOException {
        String result = OkHttpTools.getInstance().post(url, json);
        if (Objects.equals(SUCCESS, result)) {
            LOGGER.info("{} client register success: {} ", type, json);
        } else {
            LOGGER.error("{} client register error: {} ", type, json);
        }
    }
```

这里不妨使用断点进行跳转，直接运行起来，在这个位置打上断点。

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/20231005233904.png)

打上断点直接到达这里，这里应该是使用spring boot中的内容，这里值得好好研究一番。

这一个也是服务注册的内容，也可以看服务注册的文章。

## 服务调用

当我们请求服务时，会经过什么过程，这个请看服务调用的文章。

## 服务同步

此处如何进行服务同步，请看服务同步的那篇文章。
