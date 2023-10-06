---
title: "服务调用"
description: 以http插件为例
date: 2023-09-22T18:59:19+08:00
image: https://shenyu.apache.org/zh/img/logo.svg
math: 
license: 
categories:
    - Java
tags:
    - Apache Shenyu
    - 源码阅读
hidden: false
comments: true
draft: false
---

## 项目介绍

Apache ShenYu 是一个 **高性能，多协议，易扩展，响应式的API网关**

兼容各种主流框架体系，支持热插拔，用户可以定制化开发，满足用户各种场景的现状和未来需求，经历过大规模场景的锤炼

[ShenYu 官网](https://shenyu.apache.org/zh/docs/index/)

[Github 地址](https://github.com/apache/shenyu)

## 服务调用

本文仍然采用http插件为例，一个直连请求如下：

```shell
GET http://localhost:8189/order/findById?id=100
Accept: application/json
```

经过`Shenyu`网关之后，请求如下：

```shell
GET http://localhost:9195/http/order/findById?id=100
Accept: application/json
```

通过`Shenyu`网关代理后的服务能够请求到之前的服务，在这里起作用的就是`divide`插件。类继承关系如下：

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/20231006192149.png)

- ShenyuPlugin：顶层接口，定义接口方法；
- AbstractShenyuPlugin：抽象类，实现插件共有逻辑；
- DividePlugin：Divide插件。

### 请求接收

通过`Shenyu`网关代理后，请求入口是`ShenyuWebHandler`，它实现了`org.springframework.web.server.WebHandler`

```java
public final class ShenyuWebHandler implements WebHandler, ApplicationListener<SortPluginEvent> {
    //......
    
    /**
     * 处理web请求
     */
    @Override
    public Mono<Void> handle(@NonNull final ServerWebExchange exchange) {
        // 执行默认插件链
        Mono<Void> execute = new DefaultShenyuPluginChain(plugins).execute(exchange);
        if (scheduled) {
            return execute.subscribeOn(scheduler);
        }
        return execute;
    }
    
     private static class DefaultShenyuPluginChain implements ShenyuPluginChain {

         private int index;

        private final List<ShenyuPlugin> plugins;
    
        /**
         * Instantiates a new Default shenyu plugin chain.
         *
         * @param plugins the plugins
         */
         //实例化默认插件链
        DefaultShenyuPluginChain(final List<ShenyuPlugin> plugins) {
            this.plugins = plugins;
        }

        /**
         * Delegate to the next {@code WebFilter} in the chain.
         *
         * @param exchange the current server exchange
         * @return {@code Mono<Void>} to indicate when request handling is complete
         */
         //执行每个插件
        @Override
        public Mono<Void> execute(final ServerWebExchange exchange) {
            return Mono.defer(() -> {
                if (this.index < plugins.size()) {
                    //获取当前执行插件
                    ShenyuPlugin plugin = plugins.get(this.index++);
                    //是否跳过当前插件
                    boolean skip = plugin.skip(exchange);
                    if (skip) {
                        //如果跳过就执行下一个
                        return this.execute(exchange);
                    }
                    //执行当前插件
                    return plugin.execute(exchange, this);
                }
                return Mono.empty();
            });
        }
    }
}
```

这里顺便说一嘴，`shenyu-ingerss-controller`的目的就是启用插件，将对应的selectordata、ruledata以及metadata进行传入，直接到达请求接收这里，不需要使用服务注册等内容。

### 规则匹配

org.apache.shenyu.plugin.base.AbstractShenyuPlugin#execute()

在`execute()`方法中执行选择器和规则的匹配逻辑。

- 匹配选择器；
- 匹配规则；
- 执行插件。

```java
@Override
public Mono<Void> execute(final ServerWebExchange exchange, final ShenyuPluginChain chain) {
    // 插件名称
    String pluginName = named();
    // 插件信息
    PluginData pluginData = BaseDataCache.getInstance().obtainPluginData(pluginName);
    if (pluginData != null && pluginData.getEnabled()) {
        // 选择器信息
        final Collection<SelectorData> selectors = BaseDataCache.getInstance().obtainSelectorData(pluginName);
        if (CollectionUtils.isEmpty(selectors)) {
            return handleSelectorIfNull(pluginName, exchange, chain);
        }
        // 匹配选择器
        SelectorData selectorData = matchSelector(exchange, selectors);
        if (Objects.isNull(selectorData)) {
            return handleSelectorIfNull(pluginName, exchange, chain);
        }
        selectorLog(selectorData, pluginName);
        // 规则信息
        List<RuleData> rules = BaseDataCache.getInstance().obtainRuleData(selectorData.getId());
        if (CollectionUtils.isEmpty(rules)) {
            return handleRuleIfNull(pluginName, exchange, chain);
        }
        // 匹配规则
        RuleData rule;
        if (selectorData.getType() == SelectorTypeEnum.FULL_FLOW.getCode()) {
            //get last
            rule = rules.get(rules.size() - 1);
        } else {
            rule = matchRule(exchange, rules);
        }
        if (Objects.isNull(rule)) {
            return handleRuleIfNull(pluginName, exchange, chain);
        }
        ruleLog(rule, pluginName);
        // 执行插件
        return doExecute(exchange, chain, selectorData, rule);
    }
    return chain.execute(exchange);
}
```

### 执行divide插件

org.apache.shenyu.plugin.divide.DividePlugin#doExecute()

在`doExecute()`方法中执行`divide`插件的具体逻辑：

- 校验`header`大小；
- 校验`request`大小；
- 获取服务列表；
- 实现负载均衡；
- 设置请求`url`，超时时间，重试策略。

```java
@Override
protected Mono<Void> doExecute(final ServerWebExchange exchange, final ShenyuPluginChain chain, final SelectorData selector, final RuleData rule) {
    // 获取上下文信息
    ShenyuContext shenyuContext = exchange.getAttribute(Constants.CONTEXT);
    assert shenyuContext != null;
    // 获取规则的handle属性
    DivideRuleHandle ruleHandle = DividePluginDataHandler.CACHED_HANDLE.get().obtainHandle(CacheKeyUtils.INST.getKey(rule));
    long headerSize = 0;
    // 校验header大小
    for (List<String> multiHeader : exchange.getRequest().getHeaders().values()) {
        for (String value : multiHeader) {
            headerSize += value.getBytes(StandardCharsets.UTF_8).length;
        }
    }
    if (headerSize > ruleHandle.getHeaderMaxSize()) {
        LOG.error("request header is too large");
        Object error = ShenyuResultWrap.error(exchange, ShenyuResultEnum.REQUEST_HEADER_TOO_LARGE, null);
        return WebFluxResultUtils.result(exchange, error);
    }

    // 校验request大小
    if (exchange.getRequest().getHeaders().getContentLength() > ruleHandle.getRequestMaxSize()) {
        LOG.error("request entity is too large");
        Object error = ShenyuResultWrap.error(exchange, ShenyuResultEnum.REQUEST_ENTITY_TOO_LARGE, null);
        return WebFluxResultUtils.result(exchange, error);
    }
    // 获取服务列表upstreamList
    List<Upstream> upstreamList = UpstreamCacheManager.getInstance().findUpstreamListBySelectorId(selector.getId());
    if (CollectionUtils.isEmpty(upstreamList)) {
        LOG.error("divide upstream configuration error： {}", rule);
        Object error = ShenyuResultWrap.error(exchange, ShenyuResultEnum.CANNOT_FIND_HEALTHY_UPSTREAM_URL, null);
        return WebFluxResultUtils.result(exchange, error);
    }
    // 请求ip
    String ip = Objects.requireNonNull(exchange.getRequest().getRemoteAddress()).getAddress().getHostAddress();
    // 实现负载均衡
    Upstream upstream = LoadBalancerFactory.selector(upstreamList, ruleHandle.getLoadBalance(), ip);
    if (Objects.isNull(upstream)) {
        LOG.error("divide has no upstream");
        Object error = ShenyuResultWrap.error(exchange, ShenyuResultEnum.CANNOT_FIND_HEALTHY_UPSTREAM_URL, null);
        return WebFluxResultUtils.result(exchange, error);
    }
    // 设置url
    String domain = upstream.buildDomain();
    exchange.getAttributes().put(Constants.HTTP_DOMAIN, domain);
    // 设置超时时间
    exchange.getAttributes().put(Constants.HTTP_TIME_OUT, ruleHandle.getTimeout());
    exchange.getAttributes().put(Constants.HTTP_RETRY, ruleHandle.getRetry());
    // 设置重试策略
    exchange.getAttributes().put(Constants.RETRY_STRATEGY, ruleHandle.getRetryStrategy());
    exchange.getAttributes().put(Constants.LOAD_BALANCE, ruleHandle.getLoadBalance());
    exchange.getAttributes().put(Constants.DIVIDE_SELECTOR_ID, selector.getId());
    return chain.execute(exchange);
}
```

这里说一句，`dubbo`插件这个内容一定要进行查看，`dubbo`插件这里面还是有点东西的，顺便还能学习一下`dubbo`。

### 发起请求

默认由`WebClientPlugin`向`http`服务发起调用请求，类继承关系如下：

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/20231006194106.png)

- ShenyuPlugin：顶层插件，定义插件方法；
- AbstractHttpClientPlugin：抽象类，实现请求调用的公共逻辑；
- WebClientPlugin：通过`WebClient`发起请求；
- NettyHttpClientPlugin：通过`Netty`发起请求。

发起请求调用：

org.apache.shenyu.plugin.httpclient.AbstractHttpClientPlugin#execute()

在`execute()`方法中发起请求调用：

- 获取指定的超时时间，重试次数
- 发起请求
- 根据指定的重试策略进行失败后重试操作

```java

public abstract class AbstractHttpClientPlugin<R> implements ShenyuPlugin {

    protected static final Logger LOG = LoggerFactory.getLogger(AbstractHttpClientPlugin.class);

    @Override
    public final Mono<Void> execute(final ServerWebExchange exchange, final ShenyuPluginChain chain) {
        // 获取上下文信息
        final ShenyuContext shenyuContext = exchange.getAttribute(Constants.CONTEXT);
        assert shenyuContext != null;
        // 获取uri
        final URI uri = exchange.getAttribute(Constants.HTTP_URI);
        if (Objects.isNull(uri)) {
            Object error = ShenyuResultWrap.error(exchange, ShenyuResultEnum.CANNOT_FIND_URL, null);
            return WebFluxResultUtils.result(exchange, error);
        }
        // 获取指定的超时时间
        final long timeout = (long) Optional.ofNullable(exchange.getAttribute(Constants.HTTP_TIME_OUT)).orElse(3000L);
        final Duration duration = Duration.ofMillis(timeout);
        // 获取指定重试次数
        final int retryTimes = (int) Optional.ofNullable(exchange.getAttribute(Constants.HTTP_RETRY)).orElse(0);
        // 获取指定的重试策略
        final String retryStrategy = (String) Optional.ofNullable(exchange.getAttribute(Constants.RETRY_STRATEGY)).orElseGet(RetryEnum.CURRENT::getName);
        LOG.info("The request urlPath is {}, retryTimes is {}, retryStrategy is {}", uri.toASCIIString(), retryTimes, retryStrategy);
        // 构建header
        final HttpHeaders httpHeaders = buildHttpHeaders(exchange);
        // 发起请求
        final Mono<R> response = doRequest(exchange, exchange.getRequest().getMethodValue(), uri, httpHeaders, exchange.getRequest().getBody())
                .timeout(duration, Mono.error(new TimeoutException("Response took longer than timeout: " + duration)))
                .doOnError(e -> LOG.error(e.getMessage(), e));
        
        // 重试策略CURRENT，对当前服务进行重试
        if (RetryEnum.CURRENT.getName().equals(retryStrategy)) {
            //old version of DividePlugin and SpringCloudPlugin will run on this
            return response.retryWhen(Retry.anyOf(TimeoutException.class, ConnectTimeoutException.class, ReadTimeoutException.class, IllegalStateException.class)
                    .retryMax(retryTimes)
                    .backoff(Backoff.exponential(Duration.ofMillis(200), Duration.ofSeconds(20), 2, true)))
                    .onErrorMap(TimeoutException.class, th -> new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, th.getMessage(), th))
                    .flatMap((Function<Object, Mono<? extends Void>>) o -> chain.execute(exchange));
        }
        
        // 对其他服务进行重试
        // 排除已经调用过的服务
        final Set<URI> exclude = Sets.newHashSet(uri);
        // 请求重试
        return resend(response, exchange, duration, httpHeaders, exclude, retryTimes)
                .onErrorMap(TimeoutException.class, th -> new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, th.getMessage(), th))
                .flatMap((Function<Object, Mono<? extends Void>>) o -> chain.execute(exchange));
    }

    private Mono<R> resend(final Mono<R> clientResponse,
                           final ServerWebExchange exchange,
                           final Duration duration,
                           final HttpHeaders httpHeaders,
                           final Set<URI> exclude,
                           final int retryTimes) {
        Mono<R> result = clientResponse;
        // 根据指定的重试次数进行重试
        for (int i = 0; i < retryTimes; i++) {
            result = resend(result, exchange, duration, httpHeaders, exclude);
        }
        return result;
    }

    private Mono<R> resend(final Mono<R> response,
                           final ServerWebExchange exchange,
                           final Duration duration,
                           final HttpHeaders httpHeaders,
                           final Set<URI> exclude) {
        return response.onErrorResume(th -> {
            final String selectorId = exchange.getAttribute(Constants.DIVIDE_SELECTOR_ID);
            final String loadBalance = exchange.getAttribute(Constants.LOAD_BALANCE);
            //查询可用服务
            final List<Upstream> upstreamList = UpstreamCacheManager.getInstance().findUpstreamListBySelectorId(selectorId)
                    .stream().filter(data -> {
                        final String trimUri = data.getUrl().trim();
                        for (URI needToExclude : exclude) {
                            // exclude already called
                            if ((needToExclude.getHost() + ":" + needToExclude.getPort()).equals(trimUri)) {
                                return false;
                            }
                        }
                        return true;
                    }).collect(Collectors.toList());
            if (CollectionUtils.isEmpty(upstreamList)) {
                // no need to retry anymore
                return Mono.error(new ShenyuException(ShenyuResultEnum.CANNOT_FIND_HEALTHY_UPSTREAM_URL_AFTER_FAILOVER.getMsg()));
            }
            // 请求ip
            final String ip = Objects.requireNonNull(exchange.getRequest().getRemoteAddress()).getAddress().getHostAddress();
            // 实现负载均衡
            final Upstream upstream = LoadBalancerFactory.selector(upstreamList, loadBalance, ip);
            if (Objects.isNull(upstream)) {
                // no need to retry anymore
                return Mono.error(new ShenyuException(ShenyuResultEnum.CANNOT_FIND_HEALTHY_UPSTREAM_URL_AFTER_FAILOVER.getMsg()));
            }
            final URI newUri = RequestUrlUtils.buildRequestUri(exchange, upstream.buildDomain());
            // 排除已经调用的uri
            exclude.add(newUri);
             // 进行再次调用
            return doRequest(exchange, exchange.getRequest().getMethodValue(), newUri, httpHeaders, exchange.getRequest().getBody())
                    .timeout(duration, Mono.error(new TimeoutException("Response took longer than timeout: " + duration)))
                    .doOnError(e -> LOG.error(e.getMessage(), e));
        });
    }

    //......
}

```

org.apache.shenyu.plugin.httpclient.WebClientPlugin#doRequest()

在`doRequest()`方法中通过`webClient`发起真正的请求调用。

```java
@Override
protected Mono<ClientResponse> doRequest(final ServerWebExchange exchange, final String httpMethod, final URI uri,
                                         final HttpHeaders httpHeaders, final Flux<DataBuffer> body) {
    return webClient.method(HttpMethod.valueOf(httpMethod)).uri(uri) //请求uri
            .headers(headers -> headers.addAll(httpHeaders)) // 请求header
            .body(BodyInserters.fromDataBuffers(body))
            .exchange() // 发起请求
            .doOnSuccess(res -> {
                if (res.statusCode().is2xxSuccessful()) { // 成功
                    exchange.getAttributes().put(Constants.CLIENT_RESPONSE_RESULT_TYPE, ResultEnum.SUCCESS.getName());
                } else { // 失败
                    exchange.getAttributes().put(Constants.CLIENT_RESPONSE_RESULT_TYPE, ResultEnum.ERROR.getName());
                }
                exchange.getResponse().setStatusCode(res.statusCode());
                exchange.getAttributes().put(Constants.CLIENT_RESPONSE_ATTR, res);
            });
}
```

### 处理相应结果

org.apache.shenyu.plugin.response.ResponsePlugin#execute()

响应结果由`ResponsePlugin`插件处理。

```java
@Override
public Mono<Void> execute(final ServerWebExchange exchange, final ShenyuPluginChain chain) {
    ShenyuContext shenyuContext = exchange.getAttribute(Constants.CONTEXT);
    assert shenyuContext != null;
    // 根据rpc类型处理结果
    return writerMap.get(shenyuContext.getRpcType()).writeWith(exchange, chain);
}
```

处理类型由`MessageWriter`决定，类继承关系如下：

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/20231006195557.png)

- MessageWriter：接口，定义消息处理方法；
- NettyClientMessageWriter：处理`Netty`调用结果；
- RPCMessageWriter：处理`RPC`调用结果；
- WebClientMessageWriter：处理`WebClient`调用结果；

默认是通过`WebCient`发起`http`请求。

org.apache.shenyu.plugin.response.strategy.WebClientMessageWriter#writeWith()

在`writeWith()`方法中处理响应结果。

```java
@Override
public Mono<Void> writeWith(final ServerWebExchange exchange, final ShenyuPluginChain chain) {
    return chain.execute(exchange).then(Mono.defer(() -> {
        // 获取响应
        ServerHttpResponse response = exchange.getResponse();
        ClientResponse clientResponse = exchange.getAttribute(Constants.CLIENT_RESPONSE_ATTR);
        if (Objects.isNull(clientResponse)) {
            Object error = ShenyuResultWrap.error(exchange, ShenyuResultEnum.SERVICE_RESULT_ERROR, null);
            return WebFluxResultUtils.result(exchange, error);
        }
        //获取cookies和headers
        response.getCookies().putAll(clientResponse.cookies());
        response.getHeaders().putAll(clientResponse.headers().asHttpHeaders());
        // image, pdf or stream does not do format processing.
        // 处理特殊响应类型
        if (clientResponse.headers().contentType().isPresent()) {
            final String media = clientResponse.headers().contentType().get().toString().toLowerCase();
            if (media.matches(COMMON_BIN_MEDIA_TYPE_REGEX)) {
                return response.writeWith(clientResponse.body(BodyExtractors.toDataBuffers()))
                        .doOnCancel(() -> clean(exchange));
            }
        }
        // 处理一般响应类型
        clientResponse = ResponseUtils.buildClientResponse(response, clientResponse.body(BodyExtractors.toDataBuffers()));
        return clientResponse.bodyToMono(byte[].class)
                .flatMap(originData -> WebFluxResultUtils.result(exchange, originData))
                .doOnCancel(() -> clean(exchange));
    }));
}
```

分析至此，关于`Divide`插件的源码分析就完成了，分析流程图如下：

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/divide-execute-zh-c145705430fc3aec6e561cc4ad183a05.png)

## 总结

本文主要分析了Apache Shenyu的服务调用过程。

本系列是自己对shenyu进行学习的系列，参考了许多博客以及官网上面的内容，完全是班门弄斧，放在自己的博客上面，如果存在错误或者侵权，请在下面评论。

## 参考

- https://shenyu.apache.org/zh/blog/Plugin-SourceCode-Analysis-Divide-Plugin/
- https://juejin.cn/post/7103865514258071566