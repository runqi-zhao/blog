---
title: "服务同步"
description: 以websocket为例
date: 2023-09-23T18:59:19+08:00
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

## 同步什么信息，有几种方式

在`ShenYu`网关中，数据同步是指，当在后台管理系统中，数据发送了更新后，如何将更新的数据同步到网关中。`Apache ShenYu` 网关当前支持`ZooKeeper`、`WebSocket`、`Http长轮询`、`Nacos` 、`etcd` 和 `Consul` 进行数据同步。

![img](https://img-1312072469.cos.ap-nanjing.myqcloud.com/plugin-data-5c5e8976bda725e8a236faef293b185a.png)

在最初的版本中，配置服务依赖 `Zookeeper` 实现，管理后台将变更信息 `push` 给网关。而现在可以支持 `WebSocket`、`Http长轮询`、`Zookeeper`、`Nacos`、`Etcd` 和 `Consul`，通过在配置文件中设置 `shenyu.sync.${strategy}` 指定对应的同步策略，默认使用 `WebSocket` 同步策略，可以做到秒级数据同步。但是，有一点需要注意的是，`Apache ShenYu`网关 和 `shenyu-admin` 必须使用相同的同步策略。

如下图所示，`shenyu-admin` 在用户发生配置变更之后，会通过 `EventPublisher` 发出配置变更通知，由 `EventDispatcher` 处理该变更通知，然后根据配置的同步策略(`Http、WebSocket、Zookeeper、Nacos、Etcd、Consul`)，将配置发送给对应的事件处理器。

- 如果是 `WebSocket` 同步策略，则将变更后的数据主动推送给 `shenyu-web`，并且在网关层，会有对应的 `WebsocketDataHandler` 处理器来处理 `shenyu-admin` 的数据推送。
- 如果是 `Zookeeper` 同步策略，将变更数据更新到 `Zookeeper`，而 `ZookeeperSyncCache` 会监听到 `Zookeeper` 的数据变更，并予以处理。
- 如果是 `Http` 同步策略，由网关主动发起长轮询请求，默认有 `90s` 超时时间，如果 `shenyu-admin` 没有数据变更，则会阻塞 `Http` 请求，如果有数据发生变更则响应变更的数据信息，如果超过 `60s` 仍然没有数据变更则响应空数据，网关层接到响应后，继续发起 `Http` 请求，反复同样的请求。

![img](https://shenyu.apache.org/img/shenyu/dataSync/config-strategy-processor-zh.png)

本文以`WebSocket`为例，从源码角度出发说明同步的具体过程。

## 什么是webscoket

`WebSocket`协议诞生于`2008`年，在`2011`年成为国际标准。它可以双向通信，服务器可以主动向客户端推送信息，客户端也可以主动向服务器发送信息。`WebSocket`协议建立在 `TCP` 协议之上，属于应用层，性能开销小，通信高效，协议标识符是`ws`。

## Admin数据同步

通过一个实际案例，说明数据同步的过程：

![img](https://img-1312072469.cos.ap-nanjing.myqcloud.com/add-selector-93ff1008c1b0b4627dd3329abc92a7bd.png)

### 接收数据

SelectorController.createSelector()

进入`SelectorController`类中的`createSelector()`方法，它负责数据的校验，添加或更新数据，返回结果信息。

```java
@Validated
@RestController
@RequestMapping("/selector")
public class SelectorController implements PagedController<SelectorQueryCondition, SelectorVO> {
	private final SelectorService selectorService;
    
    /**
     * create selector.
     *
     * @param selectorDTO selector.
     * @return {@linkplain ShenyuAdminResult}
     */
    @PostMapping("")
    public ShenyuAdminResult createSelector(@Valid @RequestBody final SelectorDTO selectorDTO) {
        // 添加或更新数据
        Integer createCount = selectorService.createOrUpdate(selectorDTO);
        // 返回结果信息
        return ShenyuAdminResult.success(ShenyuResultMessage.CREATE_SUCCESS, createCount);
    }
}
```

### 处理数据

在`SelectorServiceImpl`类中通过`createOrUpdate()`方法完成数据的转换，保存到数据库，发布事件，更新`upstream`。

```java
default int createOrUpdate(SelectorDTO selectorDTO) {
    //条件判断
    if (Objects.equals(SelectorTypeEnum.CUSTOM_FLOW.getCode(), selectorDTO.getType())) {
        Assert.notNull(selectorDTO.getMatchMode(), "if type is custom, matchMode is not null");
        Assert.notEmpty(selectorDTO.getSelectorConditions(), "if type is custom, selectorConditions is not empty");
        selectorDTO.getSelectorConditions().forEach(selectorConditionDTO -> {
            Assert.notBlack(selectorConditionDTO.getParamType(), "if type is custom, paramType is not empty");
            Assert.notBlack(selectorConditionDTO.getParamName(), "if type is custom, paramName is not empty");
            Assert.notBlack(selectorConditionDTO.getParamValue(), "if type is custom, paramValue is not empty");
        });
    }
    //判断是否存在这个Selector，存在则进行更新，不存在则创建
    return StringUtils.isEmpty(selectorDTO.getId()) ? create(selectorDTO) : update(selectorDTO);
}
```

下面看看对应的`create()`与`update()`方法。

```java
@Override
public int create(final SelectorDTO selectorDTO) {
     // 构建数据 DTO --> DO
    SelectorDO selectorDO = SelectorDO.buildSelectorDO(selectorDTO);
    // 插入选择器数据
    final int selectorCount = selectorMapper.insertSelective(selectorDO);
     // 插入选择器中的条件数据
    createCondition(selectorDO.getId(), selectorDTO.getSelectorConditions());
     // 发布事件
    publishEvent(selectorDO, selectorDTO.getSelectorConditions(), Collections.emptyList());
    // 更新upstream
    if (selectorCount > 0) {
        selectorEventPublisher.onCreated(selectorDO);
    }
    return selectorCount;

}

private void createCondition(final String selectorId, final List<SelectorConditionDTO> selectorConditions) {
    for (SelectorConditionDTO condition : selectorConditions) {
        condition.setSelectorId(selectorId);
        selectorConditionMapper.insertSelective(SelectorConditionDO.buildSelectorConditionDO(condition));
    }
}

@Override
public void onCreated(final SelectorDO selector) {
    publish(new SelectorCreatedEvent(selector, SessionUtil.visitorName()));
}


public int update(final SelectorDTO selectorDTO) {
	//构建更新数据
    final SelectorDO before = selectorMapper.selectById(selectorDTO.getId());
    SelectorDO selectorDO = SelectorDO.buildSelectorDO(selectorDTO);
    final int selectorCount = selectorMapper.updateSelective(selectorDO);

    // need old data for cleaning
    List<SelectorConditionDO> beforeSelectorConditionList = selectorConditionMapper.selectByQuery(new SelectorConditionQuery(selectorDO.getId()));
    List<RuleConditionDTO> beforeCondition = beforeSelectorConditionList.stream().map(selectorConditionDO ->
            SelectorConditionDTO.builder()
                    .selectorId(selectorConditionDO.getSelectorId())
                    .operator(selectorConditionDO.getOperator())
                    .paramName(selectorConditionDO.getParamName())
                    .paramType(selectorConditionDO.getParamType())
                    .paramValue(selectorConditionDO.getParamValue())
                    .build()).collect(Collectors.toList());
    List<RuleConditionDTO> currentCondition = selectorDTO.getSelectorConditions().stream().map(selectorConditionDTO ->
            SelectorConditionDTO.builder()
                    .selectorId(selectorConditionDTO.getSelectorId())
                    .operator(selectorConditionDTO.getOperator())
                    .paramName(selectorConditionDTO.getParamName())
                    .paramType(selectorConditionDTO.getParamType())
                    .paramValue(selectorConditionDTO.getParamValue())
                    .build()).collect(Collectors.toList());
    if (CollectionUtils.isEqualCollection(beforeCondition, currentCondition)) {
        beforeSelectorConditionList = Collections.emptyList();
    }

    //delete rule condition then add
    // 更新数据，先删除再新增
    selectorConditionMapper.deleteByQuery(new SelectorConditionQuery(selectorDO.getId()));
    createCondition(selectorDO.getId(), selectorDTO.getSelectorConditions());
    // 发布事件
    publishEvent(selectorDO, selectorDTO.getSelectorConditions(), beforeSelectorConditionList);
    if (selectorCount > 0) {
        selectorEventPublisher.onUpdated(selectorDO, before);
    }
    return selectorCount;
}

@Override
public void onUpdated(final SelectorDO selector, final SelectorDO before) {
    publish(new SelectorUpdatedEvent(selector, before, SessionUtil.visitorName()));
}
```

`publishEvent()`方法的逻辑是：找到选择器对应的插件，构建条件数据，发布变更数据。

```java
 private void publishEvent(final SelectorDO selectorDO, final List<SelectorConditionDTO> selectorConditions, final List<SelectorConditionDO> beforeSelectorCondition) {
    // 找到选择器对应的插件
    PluginDO pluginDO = pluginMapper.selectById(selectorDO.getPluginId());
    // 构建条件数据
    List<ConditionData> conditionDataList = ListUtil.map(selectorConditions, ConditionTransfer.INSTANCE::mapToSelectorDTO);
    List<ConditionData> beforeConditionDataList = ListUtil.map(beforeSelectorCondition, ConditionTransfer.INSTANCE::mapToSelectorDO);
    // build selector data.
    SelectorData selectorData = SelectorDO.transFrom(selectorDO, pluginDO.getName(), conditionDataList, beforeConditionDataList);
    // publish change event.
    // 发布变更数据
    eventPublisher.publishEvent(new DataChangedEvent(ConfigGroupEnum.SELECTOR, DataEventTypeEnum.UPDATE,
            Collections.singletonList(selectorData)));
}
```

发布变更数据通过`eventPublisher.publishEvent()`完成，这个`eventPublisher`对象是一个`ApplicationEventPublisher`类，这个类的全限定名是`org.springframework.context.ApplicationEventPublisher`。看到这儿，我们知道了发布数据是通过`Spring`相关的功能来完成的。

> 关于`ApplicationEventPublisher`：
>
> 当有状态发生变化时，发布者调用 `ApplicationEventPublisher` 的 `publishEvent` 方法发布一个事件，`Spring`容器广播事件给所有观察者，调用观察者的 `onApplicationEvent` 方法把事件对象传递给观察者。调用 `publishEvent`方法有两种途径，一种是实现接口由容器注入 `ApplicationEventPublisher` 对象然后调用其方法，另一种是直接调用容器的方法，两种方法发布事件没有太大区别。
>
> - `ApplicationEventPublisher`：发布事件；
> - `ApplicationEvent`：`Spring` 事件，记录事件源、时间和数据；
> - `ApplicationListener`：事件监听者，观察者。

在`Spring`的事件发布机制中，有三个对象，

一个是发布事件的`ApplicationEventPublisher`，在`ShenYu`中通过构造器注入了一个`eventPublisher`。

另一个对象是`ApplicationEvent`，在`ShenYu`中通过`DataChangedEvent`继承了它，表示事件对象。

```java
public class DataChangedEvent extends ApplicationEvent {
    //......
}
```

最后一个是 `ApplicationListener`，在`ShenYu`中通过`DataChangedEventDispatcher`类实现了该接口，作为事件的监听者，负责处理事件对象。

```java
@Component
public class DataChangedEventDispatcher implements ApplicationListener<DataChangedEvent>, InitializingBean {
    //......   
}
```

#### 分发数据

DataChangedEventDispatcher.onApplicationEvent()

当事件发布完成后，会自动进入到`DataChangedEventDispatcher`类中的`onApplicationEvent()`方法，进行事件处理。

```java
@Component
public class DataChangedEventDispatcher implements ApplicationListener<DataChangedEvent>, InitializingBean {

  /**
     * 有数据变更时，调用此方法
     * @param event
     */
    @Override
    @SuppressWarnings("unchecked")
    public void onApplicationEvent(final DataChangedEvent event) {
        // 遍历数据变更监听器(一般使用一种数据同步的方式就好了)
        for (DataChangedListener listener : listeners) {
            // 哪种数据发生变更
            switch (event.getGroupKey()) {
                case APP_AUTH: // 认证信息
                    listener.onAppAuthChanged((List<AppAuthData>) event.getSource(), event.getEventType());
                    break;
                case PLUGIN:  // 插件信息
                    listener.onPluginChanged((List<PluginData>) event.getSource(), event.getEventType());
                    break;
                case RULE:    // 规则信息
                    listener.onRuleChanged((List<RuleData>) event.getSource(), event.getEventType());
                    break;
                case SELECTOR:   // 选择器信息
                    listener.onSelectorChanged((List<SelectorData>) event.getSource(), event.getEventType());
                    break;
                case META_DATA:  // 元数据
                    listener.onMetaDataChanged((List<MetaData>) event.getSource(), event.getEventType());
                    break;
                default:  // 其他类型，抛出异常
                    throw new IllegalStateException("Unexpected value: " + event.getGroupKey());
            }
        }
    }
    
}
```

当有数据变更时，调用`onApplicationEvent`方法，然后遍历所有数据变更监听器，判断是哪种数据类型，交给相应的数据监听器进行处理。

`ShenYu`将所有数据进行了分组，一共是五种：认证信息、插件信息、规则信息、选择器信息和元数据。

这里的数据变更监听器（`DataChangedListener`），就是数据同步策略的抽象，它的具体实现有：

![img](https://img-1312072469.cos.ap-nanjing.myqcloud.com/data-changed-listener-b01d7410746ca4afd526d8c9df865e9b.png)

这几个实现类就是当前`ShenYu`支持的同步策略：

- `WebsocketDataChangedListener`：基于`websocket`的数据同步；
- `ZookeeperDataChangedListener`：基于`zookeeper`的数据同步；
- `ConsulDataChangedListener`：基于`consul`的数据同步；
- `EtcdDataDataChangedListener`：基于`etcd`的数据同步；
- `HttpLongPollingDataChangedListener`：基于`http长轮询`的数据同步；
- `NacosDataChangedListener`：基于`nacos`的数据同步；

既然有这么多种实现策略，那么如何确定使用哪一种呢？

因为本文是基于`websocket`的数据同步源码分析，所以这里以`WebsocketDataChangedListener`为例，分析它是如何被加载并实现的。

通过在源码工程中进行全局搜索，可以看到，它的实现是在`DataSyncConfiguration`类完成的。

今天先到这 明天继续

这个系列确实值得好好学习一下 很多细节值得推敲。

## 总结

本文主要分析了Apache Shenyu的服务调用过程。

本系列是自己对shenyu进行学习的系列，参考了许多博客以及官网上面的内容，完全是班门弄斧，放在自己的博客上面，如果存在错误或者侵权，请在下面评论。

## 参考

- https://shenyu.apache.org/zh/docs/design/data-sync/
- https://shenyu.apache.org/zh/blog/DataSync-SourceCode-Analysis-WebSocket-Data-Sync/#1-%E5%85%B3%E4%BA%8Ewebsocket%E9%80%9A%E4%BF%A1