---
title: "API网关基本概念"
description: 
date: 2023-08-20T16:55:17+08:00
image: https://shenyu.apache.org/zh/img/logo.svg
math: 
license: 
hidden: false
categories:
    - Java
tags:
    - 网关
    - 源码阅读
comments: true
draft: false
---

## 什么是网关

微服务背景下，一个系统被拆分多个服务，但是像安全认证，流量控制，日志，监控等功能是每个服务都需要的，那么每个服务都需要进行单独实现，这使得我们做了很多重复的内容，没有一个全局的视图。

因此，出现了网管这个概念，这里借用JavaGuide画的图进行展示：

![网关示意图](https://img-1312072469.cos.ap-nanjing.myqcloud.com/api-gateway-overview.png)

一般情况下， 网关可以为我们提供请求转发、安全认证 （身份/权限认证）、流量控制、负载均衡、降级绒杜纳、日志、监控、参数检验、协议转换等功能。

总的来说，网关就实现了两件事：**请求转发+请求过滤**。

当热按，咱们就是说网管在进行部署的时候可以进行负载均衡，以保证达到高可用，避免单点的风险。

## 网关的功能

绝大多数网关可以做到一下几种功能：

- **请求转发**：将强求转发到目标为服务上面
- **负载均衡**：根据各个微服务示例的负载均衡情况或者具体的复杂均衡策略对请求实现动态的负载均衡。
- **安全认证**：对用户请求进行身份验证并且仅允许可信客户端访问API，并且还能狗使用类似RBAC等方式来进行授权。
- **参数校验**：支持参数映射与检验逻辑。
- **日志记录**：方便用户进行排查。
- **监控警告**：从业务指标、机器指标、JVM指标等方面进行监控并提供配套的告警机制。
- **熔断降级**：试试监控请求的统计信息，达到配置的失败阈值后，自动熔断，返回默认值。
- **响应缓存**：当用户请求获取的是一些静态的或更新不频繁的数据时，一段时间内多次请求获取到的数据很可能是一样的。对于这种情况可以将响应缓存起来。这样用户请求可以直接在网关层得到响应数据，无需再去访问业务服务，减轻业务服务的负担。
- **响应聚合**：某些情况下用户请求要获取的响应内容可能会来自于多个业务服务。网关作为业务服务的调用方，可以把多个服务的响应整合起来，再一并返回给用户。
- **灰度发布**：将请求动态分流到不同的服务版本（最基本的一种灰度发布）。
- **异常处理**：对于业务服务返回的异常响应，可以在网关层在返回给用户之前做转换处理。这样可以把一些业务侧返回的异常细节隐藏，转换成用户友好的错误提示返回。
- **API 文档：** 如果计划将 API 暴露给组织以外的开发人员，那么必须考虑使用 API 文档，例如 Swagger 或 OpenAPI。
- **协议转换**：通过协议转换整合后台基于 REST、AMQP、Dubbo 等不同风格和实现技术的微服务，面向 Web Mobile、开放平台等特定客户端提供统一服务。

## 本系列主角

本次主要是在oosp与glcc参与到Apache Shenyu里面为契机，对Apache Shenyu进行系统性的学习，对于里面的内容进行整理，同时对里面插件进行学习，直接记录到个人博客上面，希望自己日后能够发现最开始看的不足。

在介绍主角之前， 肯定要对常见的网关插件有一定的了解，即常听说的Spring Cloud与 Netflix Zuul。

### Netflix Zuul

Zuul 是 Netflix 开发的一款提供动态路由、监控、弹性、安全的网关服务，基于 Java 技术栈开发，可以和 Eureka、Ribbon、Hystrix 等组件配合使用。

Zuul 核心架构如下：

![Zuul 核心架构](https://img-1312072469.cos.ap-nanjing.myqcloud.com/zuul-core-architecture.webp)

Zuul 主要通过过滤器（类似于 AOP）来过滤请求，从而实现网关必备的各种功能。

![Zuul 请求声明周期](https://img-1312072469.cos.ap-nanjing.myqcloud.com/zuul-request-lifecycle.webp)

我们可以自定义过滤器来处理请求，并且，Zuul 生态本身就有很多现成的过滤器供我们使用。

### Spring Cloud

SpringCloud Gateway 属于 Spring Cloud 生态系统中的网关，其诞生的目标是为了替代老牌网关 **Zuul**。准确点来说，应该是 Zuul 1.x。SpringCloud Gateway 起步要比 Zuul 2.x 更早。

为了提升网关的性能，SpringCloud Gateway 基于 Spring WebFlux 。Spring WebFlux 使用 Reactor 库来实现响应式编程模型，底层基于 Netty 实现同步非阻塞的 I/O。

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/springcloud-gateway-%2520demo.png)

Spring Cloud Gateway 不仅提供统一的路由方式，并且基于 Filter 链的方式提供了网关基本的功能，例如：安全，监控/指标，限流。

Spring Cloud Gateway 和 Zuul 2.x 的差别不大，也是通过过滤器来处理请求。不过，目前更加推荐使用 Spring Cloud Gateway 而非 Zuul，Spring Cloud 生态对其支持更加友好。

#### Spring Cloud Gateway 的工作流程？

Spring Cloud Gateway 的工作流程如下图所示：

![Spring Cloud Gateway diagram](https://static.spring.io/blog/fombico/20220826/spring-cloud-gateway-diagram.png)

具体流程如下：

1. 路由断言：客户端的请求到达网关后，先经过Gateway Handler Mapping处理，这里会做断言（Predicate）判断，看下符合哪个路径规则，这个路由映射后端的某个服务。
2. 请求过滤：然后请求到达 Gateway Web Handler，这里面有很多过滤器，组成过滤器链（Filter Chain），这些过滤器可以对请求进行拦截和修改，比如添加请求头、参数校验等等，有点像净化污水。然后将请求转发到实际的后端服务。这些过滤器逻辑上可以称作 Pre-Filters，Pre 可以理解为“在...之前”。
3. **服务处理**：后端服务会对请求进行处理。
4. **响应过滤**：后端处理完结果后，返回给 Gateway 的过滤器再次做处理，逻辑上可以称作 Post-Filters，Post 可以理解为“在...之后”。
5. **响应返回**：响应经过过滤处理后，返回给客户端。

总结：客户端的请求先通过匹配规则找到合适的路由，就能映射到具体的服务。然后请求经过过滤器处理后转发给具体的服务，服务处理后，再次经过过滤器处理，最后返回给客户端。

#### Spring Cloud Gateway 的断言是什么？

断言（Predicate）这个词听起来极其深奥，它是一种编程术语，我们生活中根本就不会用它。说白了它就是对一个表达式进行 if 判断，结果为真或假，如果为真则做这件事，否则做那件事。

在 Gateway 中，如果客户端发送的请求满足了断言的条件，则映射到指定的路由器，就能转发到指定的服务上进行处理。

断言配置的示例如下，配置了两个路由规则，有一个 predicates 断言配置，当请求 url 中包含 `api/thirdparty`，就匹配到了第一个路由 `route_thirdparty`。

![断言配置示例](https://img-1312072469.cos.ap-nanjing.myqcloud.com/spring-cloud-gateway-predicate-example.png)

常见的断言规则如下：

![Spring Cloud GateWay 路由断言规则](https://img-1312072469.cos.ap-nanjing.myqcloud.com/spring-cloud-gateway-predicate-rules.png)

#### Spring Cloud Gateway 的路由和断言是什么关系？

Route 路由和 Predicate 断言的对应关系如下：

![路由和断言的对应关系](https://img-1312072469.cos.ap-nanjing.myqcloud.com/spring-cloud-gateway-predicate-route.png)

**一对多**：一个路由规则可以包含多个断言。如上图中路由 Route1 配置了三个断言 Predicate。

**同时满足**：如果一个路由规则中有多个断言，则需要同时满足才能匹配。如上图中路由 Route2 配置了两个断言，客户端发送的请求必须同时满足这两个断言，才能匹配路由 Route2。

**第一个匹配成功**：如果一个请求可以匹配多个路由，则映射第一个匹配成功的路由。如上图所示，客户端发送的请求满足 Route3 和 Route4 的断言，但是 Route3 的配置在配置文件中靠前，所以只会匹配 Route3。

#### Spring Cloud Gateway 如何实现动态路由？

在使用 Spring Cloud Gateway 的时候，官方文档提供的方案总是基于配置文件或代码配置的方式。

Spring Cloud Gateway 作为微服务的入口，需要尽量避免重启，而现在配置更改需要重启服务不能满足实际生产过程中的动态刷新、实时变更的业务需求，所以我们需要在 Spring Cloud Gateway 运行时动态配置网关。

实现动态路由的方式有很多种，其中一种推荐的方式是基于 Nacos 注册中心来做。 Spring Cloud Gateway可以从注册中心获取服务的元数据（例如服务名称、路径等），然后根据这些信息自动生成路由规则。这样，当你添加、移除或更新服务实例时，网关会自动感知并相应地调整路由规则，无需手动维护路由配置。

其实这些复杂的步骤并不需要我们手动实现，通过 Nacos Server 和 Spring Cloud Alibaba Nacos Config 即可实现配置的动态变更，[官方文档地址][https://github.com/alibaba/spring-cloud-alibaba/wiki/Nacos-config]

当然，在shenyu种，我们可以自己进行选择：选择Eureka或者Nacos。

这个具体远离暂时不细究，标记TODO点。

#### Spring Cloud Gateway 的过滤器有哪些？

过滤器 Filter 按照请求和响应可以分为两种：

- **Pre 类型**：在请求被转发到微服务之前，对请求进行拦截和修改，例如参数校验、权限校验、流量监控、日志输出以及协议转换等操作。
- **Post 类型**：微服务处理完请求后，返回响应给网关，网关可以再次进行处理，例如修改响应内容或响应头、日志输出、流量监控等。

另外一种分类是按照过滤器 Filter 作用的范围进行划分：

- **GatewayFilter**：局部过滤器，应用在单个路由或一组路由上的过滤器。标红色表示比较常用的过滤器。
- **GlobalFilter**：全局过滤器，应用在所有路由上的过滤器。

##### 局部过滤器

常见的局部过滤器如下图所示：

![img](https://img-1312072469.cos.ap-nanjing.myqcloud.com/spring-cloud-gateway-gatewayfilters.png)

具体怎么用呢？这里有个示例，如果 URL 匹配成功，则去掉 URL 中的 “api”。

```yaml
filters: #过滤器
  - RewritePath=/api/(?<segment>.*),/$\{segment} # 将跳转路径中包含的 “api” 替换成空
```

##### 全局过滤器

常见的全局过滤器如下图所示：

![img](https://img-1312072469.cos.ap-nanjing.myqcloud.com/spring-cloud-gateway-globalfilters.png)

全局过滤器最常见的用法是进行负载均衡。配置如下所示：

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: route_member # 第三方微服务路由规则
          uri: lb://passjava-member # 负载均衡，将请求转发到注册中心注册的 passjava-member 服务
          predicates: # 断言
            - Path=/api/member/** # 如果前端请求路径包含 api/member，则应用这条路由规则
          filters: #过滤器
            - RewritePath=/api/(?<segment>.*),/$\{segment} # 将跳转路径中包含的api替换成空
```

这里有个关键字 `lb`，用到了全局过滤器 `LoadBalancerClientFilter`，当匹配到这个路由后，会将请求转发到 passjava-member 服务，且支持负载均衡转发，也就是先将 passjava-member 解析成实际的微服务的 host 和 port，然后再转发给实际的微服务。

#### 支持限流

Spring Cloud Gateway 自带了限流过滤器，对应的接口是 `RateLimiter`，`RateLimiter` 接口只有一个实现类 `RedisRateLimiter` （基于 Redis + Lua 实现的限流），提供的限流功能比较简易且不易使用。

#### 全局异常处理

在 SpringBoot 项目中，我们捕获全局异常只需要在项目中配置 `@RestControllerAdvice`和 `@ExceptionHandler`就可以了。不过，这种方式在 Spring Cloud Gateway 下不适用。

Spring Cloud Gateway 提供了多种全局处理的方式，比较常用的一种是实现`ErrorWebExceptionHandler`并重写其中的`handle`方法。

```java
@Order(-1)
@Component
@RequiredArgsConstructor
public class GlobalErrorWebExceptionHandler implements ErrorWebExceptionHandler {
    private final ObjectMapper objectMapper;

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
    // ...
    }
}
```



## 参考

- https://javaguide.cn/distributed-system/spring-cloud-gateway-questions.html#spring-cloud-gateway-%E6%94%AF%E6%8C%81%E9%99%90%E6%B5%81%E5%90%97
- https://cloud.spring.io/spring-cloud-gateway/reference/html/
- https://spring.io/blog/2022/08/26/creating-a-custom-spring-cloud-gateway-filter
- https://zhuanlan.zhihu.com/p/347028665