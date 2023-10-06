---
title: "Apache Shenyu服务注册"
description: 以http为例
date: 2023-09-20T17:50:53+08:00
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

## 服务注册

![未命名文件](https://img-1312072469.cos.ap-nanjing.myqcloud.com/%E6%9C%AA%E5%91%BD%E5%90%8D%E6%96%87%E4%BB%B6.svg)

### 声明注册接口

这里还是以shenyu-examples-http为例，查看流程：

在对应shenyu-examples-http中，我们可以看到引入下面依赖：

```xml
<dependency>
     <groupId>org.apache.shenyu</groupId>
     <artifactId>shenyu-spring-boot-starter-client-springmvc</artifactId>
     <version>${project.version}</version>
</dependency>
```

可以看到，在引用时，引用了对应的client包。

接着看对应服务在进行注册时如何进行调用：

```java
@RestController
@RequestMapping("/order")
@ShenyuSpringMvcClient("/order")
@ApiModule(value = "order")
public class OrderController {

    /**
     * Save order dto.
     *
     * @param orderDTO the order dto
     * @return the order dto
     */
    @PostMapping("/save")
    @ShenyuSpringMvcClient("/save")
    @ApiDoc(desc = "save")
    public OrderDTO save(@RequestBody final OrderDTO orderDTO) {
        orderDTO.setName("hello world save order");
        return orderDTO;
    }
```

可以看使用`ShenyuSpringMvcClient`注解，这个是即是使用对应的客户端。

```java
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface ShenyuSpringMvcClient {
    
    /**
     * Path string.
     *
     * @return the string
     */
    @AliasFor(attribute = "path")
    String value() default "";

    /**
     * Path string.
     *
     * @return the string
     */
    @AliasFor(attribute = "value")
    String path() default "";

    /**
     * Rule name string.
     *
     * @return the string
     */
    String ruleName() default "";
    
    /**
     * Desc string.
     *
     * @return String string
     */
    String desc() default "";

    /**
     * Enabled boolean.
     *
     * @return the boolean
     */
    boolean enabled() default true;
    
    /**
     * Register meta data boolean.
     *
     * @return the boolean
     */
    boolean registerMetaData() default true;
}
```

### 扫描注解信息

> 先备注一下：很多文章（甚至包包括官网）中都说再扫描注解信息时使用了`SpringMvcClientBeanPostProcessor`，这个类在[#3484](https://github.com/apache/shenyu/issues/3484)中已经被更改，里面的逻辑没有变换。但是很多代码位置进行了改变。

注解扫描通过`ShenyuClientRegisterEventPublisher`完成，在构造器例化的过程中：

- 读取属性配置
- 添加注解，读取`path`信息
- 启动注册中心，向`shenyu-admin`注册

```java
 public SpringMvcClientEventListener(final PropertiesConfig clientConfig,
                                        final ShenyuClientRegisterRepository shenyuClientRegisterRepository) {
        super(clientConfig, shenyuClientRegisterRepository);
     	//1.读取属性配置
        Properties props = clientConfig.getProps();
        this.isFull = Boolean.parseBoolean(props.getProperty(ShenyuClientConstants.IS_FULL, Boolean.FALSE.toString()));
        this.protocol = props.getProperty(ShenyuClientConstants.PROTOCOL, ShenyuClientConstants.HTTP);
        this.addPrefixed = Boolean.parseBoolean(props.getProperty(ShenyuClientConstants.ADD_PREFIXED,
                Boolean.FALSE.toString()));
     	//2，添加注解
        mappingAnnotation.add(ShenyuSpringMvcClient.class);
        mappingAnnotation.add(RequestMapping.class);
    }

//下面时super(clientConfig, shenyuClientRegisterRepository);
public AbstractContextRefreshedEventListener(final PropertiesConfig clientConfig,
                                                 final ShenyuClientRegisterRepository shenyuClientRegisterRepository) {
    	//1. 读取属性配置，这些字段是所有插件中应该包含的
        Properties props = clientConfig.getProps();
        this.appName = props.getProperty(ShenyuClientConstants.APP_NAME);
        this.contextPath = Optional.ofNullable(props.getProperty(ShenyuClientConstants.CONTEXT_PATH)).map(UriUtils::repairData).orElse("");
        if (StringUtils.isBlank(appName) && StringUtils.isBlank(contextPath)) {
            String errorMsg = "client register param must config the appName or contextPath";
            LOG.error(errorMsg);
            throw new ShenyuClientIllegalArgumentException(errorMsg);
        }
        this.ipAndPort = props.getProperty(ShenyuClientConstants.IP_PORT);
        this.host = props.getProperty(ShenyuClientConstants.HOST);
        this.port = props.getProperty(ShenyuClientConstants.PORT);
    	//3.启动注册中心
        publisher.start(shenyuClientRegisterRepository);
    }
```

在此类初始化完成之后，会读取注解信息，构建元数据对象和`URI`对象，并向`shenyu-admin`注册。

~~~java
//对应父类方法
protected void handle(final String beanName, final T bean) {
        //
        Class<?> clazz = getCorrectedClass(bean);
        final A beanShenyuClient = AnnotatedElementUtils.findMergedAnnotation(clazz, getAnnotationType());
        final String superPath = buildApiSuperPath(clazz, beanShenyuClient);
        // Compatible with previous versions
        if (Objects.nonNull(beanShenyuClient) && superPath.contains("*")) {
            handleClass(clazz, bean, beanShenyuClient, superPath);
            return;
        }
        final Method[] methods = ReflectionUtils.getUniqueDeclaredMethods(clazz);
        for (Method method : methods) {
            handleMethod(bean, clazz, beanShenyuClient, method, superPath);
        }
    }
~~~

因为所有插件都是实现对应流程，只是具体插件流程不太一样，因此将其中公共部分进行抽象出来，写道对应的父类之中，下面一个一个方法进行查看，一句一句进行分析：

```java
 protected Class<?> getCorrectedClass(final T bean) {
        Class<?> clazz = bean.getClass();
        if (AopUtils.isAopProxy(bean)) {
            clazz = AopUtils.getTargetClass(bean);
        }
        return clazz;
    }
```

这的函数的作用是将拿到类对应的反射，而不是类本身

> 这里利用一个TODO：反射的好处是什么，为什么不直接使用对应的对象。

再看下面：

```java
//这个作用时读取上面反射过来类上的注解，此处是ShenyuClientMvcClient。
final A beanShenyuClient = AnnotatedElementUtils.findMergedAnnotation(clazz, getAnnotationType());
//构建superPath
final String superPath = buildApiSuperPath(clazz, beanShenyuClient);
// Compatible with previous versions
//是否注册整个方法
if (Objects.nonNull(beanShenyuClient) && superPath.contains("*")) {
//构建元数据对象，然后向shenyu-admin注册
handleClass(clazz, bean, beanShenyuClient, superPath);
return;
}
```

handlerClass中方法如下：

```java
protected void handleClass(final Class<?> clazz,
                           final T bean,
                           @NonNull final A beanShenyuClient,
                           final String superPath) {
  publisher.publishEvent(buildMetaDataDTO(bean, beanShenyuClient, pathJoin(contextPath, superPath), clazz, null));
}
```

在进行superPath构建的时候 ，上面 使用了`buildApiSuperPath`方法，这个方法需要 着重查看一下：

这里的话查看对应SpringMvcClient的逻辑：

```java
//先从类上的注解ShenyuSpringMvcClient取path属性，如果没有，就从当前类的RequestMapping注解中取path信息。
@Override
protected String buildApiSuperPath(final Class<?> clazz, @Nullable final ShenyuSpringMvcClient beanShenyuClient) {
    //先从类上的注解shenyuSpringMvcClient取path属性
    if (Objects.nonNull(beanShenyuClient) && StringUtils.isNotBlank(beanShenyuClient.path())) {
        return beanShenyuClient.path();
    }
    //从当前类中的RequestMapping注解中取path信息
    RequestMapping requestMapping = AnnotationUtils.findAnnotation(clazz, RequestMapping.class);
    // Only the first path is supported temporarily
    if (Objects.nonNull(requestMapping) && ArrayUtils.isNotEmpty(requestMapping.path()) && StringUtils.isNotBlank(requestMapping.path()[0])) {
        return requestMapping.path()[0];
    }
    return "";
}
```

继续看下面的方法：

```java
//读取所有方法
final Method[] methods = ReflectionUtils.getUniqueDeclaredMethods(clazz);
//根据 具体类实现 其中具体逻辑
for (Method method : methods) {
    handleMethod(bean, clazz, beanShenyuClient, method, superPath);
    }
```

下面查看http使用handleMethod方法：

~~~java
@Override
protected void handleMethod(final Object bean, final Class<?> clazz,
                            @Nullable final ShenyuSpringMvcClient beanShenyuClient,
                            final Method method, final String superPath) {
    // 在element上查询RequestMapping类型注解
	// 将查询出的多个RequestMapping类型注解属性合并到查询的第一个注解中
	// 多个相同注解合并
    final RequestMapping requestMapping = AnnotatedElementUtils.findMergedAnnotation(method, RequestMapping.class);
    //获取对应ShenyuSpringMvcClient注解，查询出多个RequestMapping类型注解属性合并到查询的第一个注解中，多个形同的属性进行合并
    ShenyuSpringMvcClient methodShenyuClient = AnnotatedElementUtils.findMergedAnnotation(method, ShenyuSpringMvcClient.class);
    //判定对应的ShenyuSpringMvcClient是否存在 ，如果不存在，则使用类上面的注解
    methodShenyuClient = Objects.isNull(methodShenyuClient) ? beanShenyuClient : methodShenyuClient;
    // the result of ReflectionUtils#getUniqueDeclaredMethods contains method such as hashCode, wait, toSting
    // add Objects.nonNull(requestMapping) to make sure not register wrong method
    if (Objects.nonNull(methodShenyuClient) && Objects.nonNull(requestMapping)) {
        //构建path信息，构建元数据对象，向shenyu-admin进行注册
        final MetaDataRegisterDTO metaData = buildMetaDataDTO(bean, methodShenyuClient,
                buildApiPath(method, superPath, methodShenyuClient), clazz, method);
        getPublisher().publishEvent(metaData);
        getMetaDataMap().put(method, metaData);
    }
}
~~~

这里面需要注意的方法是`buildApiPath`,先读取方法上的注解`ShenyuSpringMvcClient`，如果存在就构建；否则从方法的其他注解上获取`path`信息；完整的`path = contextPath(上下文信息)+superPath(类信息)+methodPath(方法信息)`。

```java
@Override
protected String buildApiPath(final Method method, final String superPath,
                              @NonNull final ShenyuSpringMvcClient methodShenyuClient) {
    //1.获取对应的Contextpath
    String contextPath = getContextPath();
    //如果存在path，就构建
    if (StringUtils.isNotBlank(methodShenyuClient.path())) {
        //完整path=ContextPath+superPath+methodPath
        return pathJoin(contextPath, superPath, methodShenyuClient.path());
    }
    //2.从方法的其他注解上面获取path信息
    final String path = getPathByMethod(method);
    if (StringUtils.isNotBlank(path)) {
        //完整的path=contextPath+superPath+methodPath
        return pathJoin(contextPath, superPath, path);
    }
    return pathJoin(contextPath, superPath);
}
```

看一下`getPathByMethod`方法：

```java
private String getPathByMethod(@NonNull final Method method) {
    for (Class<? extends Annotation> mapping : mappingAnnotation) {
        final String pathByAnnotation = getPathByAnnotation(AnnotatedElementUtils.findMergedAnnotation(method, mapping));
        if (StringUtils.isNotBlank(pathByAnnotation)) {
            return pathByAnnotation;
        }
    }
    return null;
}
```

这个方法是从其他注解上获取 `path`信息，可以看看`getPathByAnnotation`:

```java
private String getPathByAnnotation(@Nullable final Annotation annotation) {
    if (Objects.isNull(annotation)) {
        return null;
    }
    final Object value = AnnotationUtils.getValue(annotation, "value");
    if (value instanceof String && StringUtils.isNotBlank((String) value)) {
        return (String) value;
    }
    // Only the first path is supported temporarily
    if (value instanceof String[] && ArrayUtils.isNotEmpty((String[]) value) && StringUtils.isNotBlank(((String[]) value)[0])) {
        return ((String[]) value)[0];
    }
    return null;
}
```

其他注解包括 在对应的`annotation`包下面：

- ShenyuSpringMvcClient
- PostMapping
- GetMapping
- DeleteMapping
- PutMapping
- RequestMapping

扫描注解完成后，构建元数据对象，然后将该对象发送到`shenyu-admin`，即可完成注册。

再看`buildMetaDataDTO`：

```java
private MetaDataRegisterDTO buildMetaDataDTO(@NonNull final ShenyuSpringMvcClient shenyuSpringMvcClient, final String path) {
    return MetaDataRegisterDTO.builder()
            .contextPath(contextPath) // contextPath
            .appName(appName) // appName
            .path(path) // 注册路径，在网关规则匹配时使用
            .pathDesc(shenyuSpringMvcClient.desc()) // 描述信息
            .rpcType(RpcTypeEnum.HTTP.getName()) // divide插件，默认时http类型
            .enabled(shenyuSpringMvcClient.enabled()) // 是否启用规则
            .ruleName(StringUtils.defaultIfBlank(shenyuSpringMvcClient.ruleName(), path))//规则名称
            .registerMetaData(shenyuSpringMvcClient.registerMetaData()) //是否注册元数据信息
            .build();
}
```

此方法就是构建对应的元数据对象，包括当前注册的规则信息。

### 注册URI信息

当扫描完成对应的注解信息之后，需要注册对应`URI`信息。最新版本中仍然是使用`SpringMvcClientEventListener`方法进行实现的。

首先还是说明初始化，在上面接口扫描中已经说明了对应的初始化，对应的语句是下面几句：

```java
this.appName = props.getProperty(ShenyuClientConstants.APP_NAME);
this.contextPath = Optional.ofNullable(props.getProperty(ShenyuClientConstants.CONTEXT_PATH)).map(UriUtils::repairData).orElse("");
if (StringUtils.isBlank(appName) && StringUtils.isBlank(contextPath)) {
String errorMsg = "client register param must config the appName or contextPath";
	LOG.error(errorMsg);
	throw new ShenyuClientIllegalArgumentException(errorMsg);
}
this.ipAndPort = props.getProperty(ShenyuClientConstants.IP_PORT);
this.host = props.getProperty(ShenyuClientConstants.HOST);
this.port = props.getProperty(ShenyuClientConstants.PORT);
-----
this.isFull = Boolean.parseBoolean(props.getProperty(ShenyuClientConstants.IS_FULL, Boolean.FALSE.toString()));
this.protocol = props.getProperty(ShenyuClientConstants.PROTOCOL, ShenyuClientConstants.HTTP);
this.addPrefixed = Boolean.parseBoolean(props.getProperty(ShenyuClientConstants.ADD_PREFIXED,
        Boolean.FALSE.toString()));
```

上面是在两个类中进行拿去，其实这里做的事情仍然是读取属性配置。

接下来来到注册`URI`的逻辑：

```java
@Override
public void onApplicationEvent(@NonNull final ContextRefreshedEvent event) {
    //获取对应的ApplicationContext
    context = event.getApplicationContext();
    //从context获取对应的bean
    Map<String, T> beans = getBeans(context);
    //如果说没有注册对应的URI，返回null
    if (MapUtils.isEmpty(beans)) {
        return;
    }
    //保证该方法执行一次
    if (!registered.compareAndSet(false, true)) {
        return;
    }
    //构建URI数据，并进行注册
    publisher.publishEvent(buildURIRegisterDTO(context, beans));
    //遍历每一个元数据
    beans.forEach(this::handle);
    //获得ApiMoudle注解
    Map<String, Object> apiModules = context.getBeansWithAnnotation(ApiModule.class);
    //处理ApiDoc注解
    apiModules.forEach((k, v) -> handleApiDoc(v, beans));
}
```

可以查看对应的`buildURIRegisterDTO`方法：

```java
@Override
protected URIRegisterDTO buildURIRegisterDTO(final ApplicationContext context,
                                             final Map<String, Object> beans) {
    try {
        return URIRegisterDTO.builder()
                .contextPath(getContextPath()) // contextPath
                .appName(getAppName())// appName
                .protocol(protocol)// 服务使用的协议
                .host(super.getHost())//主机
                .port(Integer.valueOf(getPort())) // 端口
                .rpcType(RpcTypeEnum.HTTP.getName())// divide插件，默认注册http类型
                .eventType(EventType.REGISTER)
                .build();
    } catch (ShenyuException e) {
        throw new ShenyuException(e.getMessage() + "please config ${shenyu.client.http.props.port} in xml/yml !");
    }
}
```

### 处理注册流程

客户端通过注册中心注册的元数据和`URI`数据，在`shenyu-admin`进行处理，负责存储到数据库和同步给`shenyu`网关。`Divide`插件的客户端注册处理逻辑在`ShenyuClientRegisterDivideServiceImpl`中。继承关系如下：

![img](https://img-1312072469.cos.ap-nanjing.myqcloud.com/ShenyuClientRegisterDivideServiceImpl-4d9351b1efbb545cde2a3a172e35f59c.png)

- ShenyuClientRegisterService：客户端注册服务，顶层接口；
- FallbackShenyuClientRegisterService：注册失败，提供重试操作；
- AbstractShenyuClientRegisterServiceImpl：抽象类，实现部分公共注册逻辑；
- AbstractContextPathRegisterService：抽象类，负责注册`ContextPath`；
- ShenyuClientRegisterDivideServiceImpl：实现`Divide`插件的注册；

#### 注册服务

org.apache.shenyu.admin.service.register.AbstractShenyuClientRegisterServiceImpl#register()

客户端通过注册中心注册的元数据`MetaDataRegisterDTO`对象在`shenyu-admin`的`register()`方法被接送到。

```java
@Override
public String register(final MetaDataRegisterDTO dto) {
    //handler plugin selector
    //1.注册选择器
    String selectorHandler = selectorHandler(dto);
    String selectorId = selectorService.registerDefault(dto, PluginNameAdapter.rpcTypeAdapter(rpcType()), selectorHandler);
    //handler selector rule
    //2.注册规则
    String ruleHandler = ruleHandler();
    RuleDTO ruleDTO = buildRpcDefaultRuleDTO(selectorId, dto, ruleHandler);
    ruleService.registerDefault(ruleDTO);
    //handler register metadata
    //3.注册元数据
    registerMetadata(dto);
    //handler context path
    //4.注册ContextPath
    String contextPath = dto.getContextPath();
    if (StringUtils.isNotEmpty(contextPath)) {
        registerContextPath(dto);
    }
    return ShenyuResultMessage.SUCCESS;
}
```

#### 注册选择器

org.apache.shenyu.admin.service.impl.SelectorServiceImpl#registerDefault()

构建`contextPath`，查找选择器信息是否存在，如果存在就返回`id`；不存在就创建默认的选择器信息。

```java
@Override
public String registerDefault(final MetaDataRegisterDTO dto, final String pluginName, final String selectorHandler) {
    // 构建contextPath
    String contextPath = ContextPathUtils.buildContextPath(dto.getContextPath(), dto.getAppName());
    // 通过名称查找选择器信息是否存在
    SelectorDO selectorDO = findByNameAndPluginName(contextPath, pluginName);
    if (Objects.isNull(selectorDO)) {
        // 不存在就创建默认的选择器信息
        return registerSelector(contextPath, pluginName, selectorHandler);
    }
    return selectorDO.getId();
}
```

默认选择器信息

在这里构建默认选择器信息及其条件属性。

```java
//注册选择器
private String registerSelector(final String contextPath, final String pluginName, final String selectorHandler) {
    //构建选择器
    SelectorDTO selectorDTO = buildSelectorDTO(contextPath, pluginMapper.selectByName(pluginName).getId());
    selectorDTO.setHandle(selectorHandler);
    //注册默认选择器
    return registerDefault(selectorDTO);
}
 //构建选择器
private SelectorDTO buildSelectorDTO(final String contextPath, final String pluginId) {
    //构建默认选择器
    SelectorDTO selectorDTO = buildDefaultSelectorDTO(contextPath);
    selectorDTO.setPluginId(pluginId);
     //构建默认选择器的条件属性
    selectorDTO.setSelectorConditions(buildDefaultSelectorConditionDTO(contextPath));
    return selectorDTO;
}
```

构建默认选择器

```java
private SelectorDTO buildDefaultSelectorDTO(final String name) {
    return SelectorDTO.builder()
            .name(name) // 名称
            .type(SelectorTypeEnum.CUSTOM_FLOW.getCode()) // 默认类型自定义
            .matchMode(MatchModeEnum.AND.getCode()) //默认匹配方式 and
            .enabled(Boolean.TRUE)  //默认启开启
            .loged(Boolean.TRUE)  //默认记录日志
            .continued(Boolean.TRUE) //默认继续后续选择器
            .sort(1) //默认顺序1
            .build();
}
```

构建默认选择器条件属性

```java
private List<SelectorConditionDTO> buildDefaultSelectorConditionDTO(final String contextPath) {
    SelectorConditionDTO selectorConditionDTO = new SelectorConditionDTO();
    selectorConditionDTO.setParamType(ParamTypeEnum.URI.getName()); // 默认参数类型URI
    selectorConditionDTO.setParamName("/");
    selectorConditionDTO.setOperator(OperatorEnum.MATCH.getAlias()); // 默认匹配策略 match
    selectorConditionDTO.setParamValue(contextPath + AdminConstants.URI_SUFFIX); // 默认值 /contextPath/**
    return Collections.singletonList(selectorConditionDTO);
}
```

注册默认选择器

```java
@Override
public String registerDefault(final SelectorDTO selectorDTO) {
    //选择器信息
    SelectorDO selectorDO = SelectorDO.buildSelectorDO(selectorDTO);
    //选择器条件属性
    List<SelectorConditionDTO> selectorConditionDTOs = selectorDTO.getSelectorConditions();
    if (StringUtils.isEmpty(selectorDTO.getId())) {
        // 向数据库插入选择器信息
        selectorMapper.insertSelective(selectorDO);
          // 向数据库插入选择器条件属性
        selectorConditionDTOs.forEach(selectorConditionDTO -> {
            selectorConditionDTO.setSelectorId(selectorDO.getId());        
                selectorConditionMapper.insertSelective(SelectorConditionDO.buildSelectorConditionDO(selectorConditionDTO));
        });
    }
    // 发布同步事件，向网关同步选择信息及其条件属性
    publishEvent(selectorDO, selectorConditionDTOs);
    return selectorDO.getId();
}
```

#### **注册规则**

在注册服务的第二步中，开始构建默认规则，然后注册规则。

```java
@Override
    public String register(final MetaDataRegisterDTO dto) {
        //1. 注册选择器
        //......
        
        //2. 注册规则
        // 默认规则处理属性
        String ruleHandler = ruleHandler();
        // 构建默认规则信息
        RuleDTO ruleDTO = buildRpcDefaultRuleDTO(selectorId, dto, ruleHandler);
        // 注册规则
        ruleService.registerDefault(ruleDTO);
        
        //3. 注册元数据
        //......
        
        //4. 注册ContextPath
        //......
        
        return ShenyuResultMessage.SUCCESS;
    }
```

默认规则处理属性

```java
@Override
protected String ruleHandler() {
    // 默认规则处理属性
    return new DivideRuleHandle().toJson();
}
```

`Divide`插件默认规则处理属性

```java

public class DivideRuleHandle implements RuleHandle {

    /**
     * 负载均衡：默认随机
     */
    private String loadBalance = LoadBalanceEnum.RANDOM.getName();

    /**
     * 重试策略：默认重试当前服务
     */
    private String retryStrategy = RetryEnum.CURRENT.getName();

    /**
     * 重试次数：默认3次
     */
    private int retry = 3;

    /**
     * 调用超时：默认 3000
     */
    private long timeout = Constants.TIME_OUT;

    /**
     * header最大值：10240 byte
     */
    private long headerMaxSize = Constants.HEADER_MAX_SIZE;

    /**
     * request最大值：102400 byte
     */
    private long requestMaxSize = Constants.REQUEST_MAX_SIZE;
}
```

构建默认规则信息

```java
// 构建默认规则信息
private RuleDTO buildRpcDefaultRuleDTO(final String selectorId, final MetaDataRegisterDTO metaDataDTO, final String ruleHandler) {
    return buildRuleDTO(selectorId, ruleHandler, metaDataDTO.getRuleName(), metaDataDTO.getPath());
}
//  构建默认规则信息
private RuleDTO buildRuleDTO(final String selectorId, final String ruleHandler, final String ruleName, final String path) {
    RuleDTO ruleDTO = RuleDTO.builder()
            .selectorId(selectorId) //关联的选择器id
            .name(ruleName) //规则名称
            .matchMode(MatchModeEnum.AND.getCode()) // 默认匹配模式 and
            .enabled(Boolean.TRUE) // 默认开启
            .loged(Boolean.TRUE) //默认记录日志
            .sort(1) //默认顺序 1
            .handle(ruleHandler)
            .build();
    RuleConditionDTO ruleConditionDTO = RuleConditionDTO.builder()
            .paramType(ParamTypeEnum.URI.getName()) // 默认参数类型URI
            .paramName("/")
            .paramValue(path) //参数值path
            .build();
    if (path.indexOf("*") > 1) {
        ruleConditionDTO.setOperator(OperatorEnum.MATCH.getAlias()); //如果path中有*，操作类型则默认为 match
    } else {
        ruleConditionDTO.setOperator(OperatorEnum.EQ.getAlias()); // 否则，默认操作类型 = 
    }
    ruleDTO.setRuleConditions(Collections.singletonList(ruleConditionDTO));
    return ruleDTO;
}
```

org.apache.shenyu.admin.service.impl.RuleServiceImpl#registerDefault()

注册规则：向数据库插入记录，并向网关发布事件，进行数据同步。

```java
@Override
public String registerDefault(final RuleDTO ruleDTO) {
    RuleDO exist = ruleMapper.findBySelectorIdAndName(ruleDTO.getSelectorId(), ruleDTO.getName());
    if (Objects.nonNull(exist)) {
        return "";
    }

    RuleDO ruleDO = RuleDO.buildRuleDO(ruleDTO);
    List<RuleConditionDTO> ruleConditions = ruleDTO.getRuleConditions();
    if (StringUtils.isEmpty(ruleDTO.getId())) {
        // 向数据库插入规则信息
        ruleMapper.insertSelective(ruleDO);
        //向数据库插入规则体条件属性
        ruleConditions.forEach(ruleConditionDTO -> {
            ruleConditionDTO.setRuleId(ruleDO.getId());            
            ruleConditionMapper.insertSelective(RuleConditionDO.buildRuleConditionDO(ruleConditionDTO));
        });
    }
    // 向网关发布事件，进行数据同步
    publishEvent(ruleDO, ruleConditions);
    return ruleDO.getId();
}

```

#### 注册元数据

```java
@Override
public String register(final MetaDataRegisterDTO dto) {
    //1. 注册选择器
    //......

    //2. 注册规则
    //......

    //3. 注册元数据
    registerMetadata(dto);

    //4. 注册ContextPath
    //......

    return ShenyuResultMessage.SUCCESS;
}
```

org.apache.shenyu.admin.service.register.ShenyuClientRegisterDivideServiceImpl#registerMetadata()

插入或更新元数据，然后发布同步事件到网关。

```java
@Override
protected void registerMetadata(final MetaDataRegisterDTO dto) {
    if (dto.isRegisterMetaData()) { // 如果注册元数据
        // 获取metaDataService
        MetaDataService metaDataService = getMetaDataService();
        // 元数据是否存在
        MetaDataDO exist = metaDataService.findByPath(dto.getPath());
        // 插入或更新元数据
        metaDataService.saveOrUpdateMetaData(exist, dto);
    }
}

@Override
public void saveOrUpdateMetaData(final MetaDataDO exist, final MetaDataRegisterDTO metaDataDTO) {
    DataEventTypeEnum eventType;
    // 数据类型转换 DTO->DO
    MetaDataDO metaDataDO = MetaDataTransfer.INSTANCE.mapRegisterDTOToEntity(metaDataDTO);
    // 插入数据
    if (Objects.isNull(exist)) {
        Timestamp currentTime = new Timestamp(System.currentTimeMillis());
        metaDataDO.setId(UUIDUtils.getInstance().generateShortUuid());
        metaDataDO.setDateCreated(currentTime);
        metaDataDO.setDateUpdated(currentTime);
        metaDataMapper.insert(metaDataDO);
        eventType = DataEventTypeEnum.CREATE;
    } else {
        // 更新数据
        metaDataDO.setId(exist.getId());
        metaDataMapper.update(metaDataDO);
        eventType = DataEventTypeEnum.UPDATE;
    }
    // 发布同步事件到网关
    eventPublisher.publishEvent(new DataChangedEvent(ConfigGroupEnum.META_DATA, eventType,
            Collections.singletonList(MetaDataTransfer.INSTANCE.mapToData(metaDataDO))));
}
```

#### **注册ContextPath**

```java
@Override
public String register(final MetaDataRegisterDTO dto) {
    //1. 注册选择器
    //......

    //2. 注册规则
    //......

    //3. 注册元数据
    //......

    //4. 注册ContextPath
    String contextPath = dto.getContextPath();
    if (StringUtils.isNotEmpty(contextPath)) {
        registerContextPath(dto);
    }
    return ShenyuResultMessage.SUCCESS;
}
```

org.apache.shenyu.admin.service.register.AbstractContextPathRegisterService#registerContextPath()

```java
@Override
public void registerContextPath(final MetaDataRegisterDTO dto) {
    // 设置选择器的contextPath
    String contextPathSelectorId = getSelectorService().registerDefault(dto, PluginEnum.CONTEXT_PATH.getName(), "");
    ContextMappingRuleHandle handle = new ContextMappingRuleHandle();
    handle.setContextPath(PathUtils.decoratorContextPath(dto.getContextPath()));
    // 设置规则的contextPath
    getRuleService().registerDefault(buildContextPathDefaultRuleDTO(contextPathSelectorId, dto, handle.toJson()));
}
```

### 注册URI

org.apache.shenyu.admin.service.register.FallbackShenyuClientRegisterService#registerURI()

服务端收到客户端注册的`URI`信息后，进行处理。

```java
@Override
public String registerURI(final String selectorName, final List<URIRegisterDTO> uriList) {
    String result;
    String key = key(selectorName);
    try {
        this.removeFallBack(key);
        // 注册URI
        result = this.doRegisterURI(selectorName, uriList);
        logger.info("Register success: {},{}", selectorName, uriList);
    } catch (Exception ex) {
        logger.warn("Register exception: cause:{}", ex.getMessage());
        result = "";
        // 注册失败后，进行重试
        this.addFallback(key, new FallbackHolder(selectorName, uriList));
    }
    return result;
}
```

org.apache.shenyu.admin.service.register.AbstractShenyuClientRegisterServiceImpl#doRegisterURI()

从客户端注册的`URI`中获取有效的`URI`，更新对应的选择器`handle`属性，向网关发送选择器更新事件。

```java
@Override
public String doRegisterURI(final String selectorName, final List<URIRegisterDTO> uriList) {
    //参数检查
    if (CollectionUtils.isEmpty(uriList)) {
        return "";
    }
    //获取选择器信息
    SelectorDO selectorDO = selectorService.findByNameAndPluginName(selectorName, PluginNameAdapter.rpcTypeAdapter(rpcType()));
    if (Objects.isNull(selectorDO)) {
        throw new ShenyuException("doRegister Failed to execute,wait to retry.");
    }
    // 获取有效的URI
    List<URIRegisterDTO> validUriList = uriList.stream().filter(dto -> Objects.nonNull(dto.getPort()) && StringUtils.isNotBlank(dto.getHost())).collect(Collectors.toList());
    // 构建选择器的handle属性
    String handler = buildHandle(validUriList, selectorDO);
    if (handler != null) {
        selectorDO.setHandle(handler);
        SelectorData selectorData = selectorService.buildByName(selectorName, PluginNameAdapter.rpcTypeAdapter(rpcType()));
        selectorData.setHandle(handler);
        // 向数据库更新选择器的handle属性
        selectorService.updateSelective(selectorDO);
        // 向网关发送选择器更新事件
        eventPublisher.publishEvent(new DataChangedEvent(ConfigGroupEnum.SELECTOR, DataEventTypeEnum.UPDATE, Collections.singletonList(selectorData)));
    }
    return ShenyuResultMessage.SUCCESS;
}
```

引用官网上面一张图，总结整个流程（注意，因为类的变换，读取接口信息构造元数据以及读取配置信息，构造URI数据都在一个类中），但是具体的流程没有改变。

![img](https://img-1312072469.cos.ap-nanjing.myqcloud.com/divide-register-zh-0697d4849e6ae1dbd2f15a0fd528cd32.png)

当然，这个图片中少了一个很重要的内容，网关中的数据如何同步到本地缓存中。这个需要专门写一篇文章。

下面在使用一个博客中的内容作为整个过程的总结：

![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b27580bed73c49369783a09e65537337~tplv-k3u1fbpfcp-watermark.image)

> TODO：重新画这个图，这个图中存在一些问题，因为部分的类更改了，上文中进行了具体的分析。

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b59dfb47a30b441b953787345308e87d~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

## 总结

本文主要是说明了服务注册的过程，但是里面还有很多问题没有进行具体说明：

1. 服务是如何进行同步的
2. 服务在进行调用的时候流程是什么

本系列是自己对shenyu进行学习的系列，参考了许多博客以及官网上面的内容，完全是班门弄斧，放在自己的博客上面，如果存在错误或者侵权，请在下面评论。

## 参考 

- https://shenyu.apache.org/zh/blog/Plugin-SourceCode-Analysis-Divide-Plugin/
- https://juejin.cn/post/7103865514258071566
