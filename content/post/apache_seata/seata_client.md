---
title: "Seata Client端启动流程"
description: 讲述Seata的Client的启动流程
date: 2024-07-04T22:35:24+08:00
image: https://seata.apache.org/img/seata_logo.png
math: true
license: Apache License 2.0
hidden: false
comments: true
draft: false
---

### Apache Seata

Seata 是一款开源的分布式事务解决方案，致力于在微服务架构下提供高性能和简单易用的分布式事务服务。在 Seata 开源之前，其内部版本在阿里系内部一直扮演着应用架构层数据一致性的中间件角色，帮助经济体平稳的度过历年的双11，对上层业务进行了有力的技术支撑。经过多年沉淀与积累，其商业化产品先后在阿里云、金融云上售卖。2019.1 为了打造更加完善的技术生态和普惠技术成果，Seata 正式宣布对外开源，未来 Seata 将以社区共建的形式帮助用户快速落地分布式事务解决方案。

![img](https://img-1312072469.cos.ap-nanjing.myqcloud.com/68747470733a2f2f696d672d313331323037323436392e636f732e61702d6e616e6a696e672e6d7971636c6f75642e636f6d2f5442317244706b4a41766f4b31526a535a5066585858504b4658612d3739342d3437382e706e67)

本文将从源码的角度分析一下AT模式下Client端启动流程。

所谓的Client端，即业务应用放。分布式事务分为三个模块：TC、TM、RM。其中TC位于server端，而TM、RM通过SDK的方式运行在client端。

下面展示了一个分布式场景的Demo，分为几个微服务，共同实现一个订单、扣库存、扣余额的分布式事务：

- **BusinessService：** 业务服务，下单服务的入口
- **StorageService：** 库存微服务，用于扣减商品库存
- **OrderService：** 订单微服务，创建订单
- **AccountService：** 账户微服务，扣减用户账户的余额

![在这里插入图片描述](https://camo.githubusercontent.com/07bb523669b0832060fb69d76dc43b78230290e16971915ee35dfd5c9fb8038f/68747470733a2f2f696d672d313331323037323436392e636f732e61702d6e616e6a696e672e6d7971636c6f75642e636f6d2f32303230303832303138343135363735382e6a7067)

从上图也可以看出，在AT模式下Seata Client端主要通过如下三个模块来实现分布式事务：

- **GlobalTransactionScanner：** GlobalTransactionScanner负责初始TM、RM模块，并为添加分布式事务注解的方法添加拦截器，拦截器负责全局事务的开启、提交或回滚
- **DatasourceProxy：** DatasourceProxy为DataSource添加拦截，拦截器会拦截所有SQL执行，并作为RM事务参与方的角色参与分布式事务执行。
- **Rpc Interceptor：** Rpc Interceptor的职责就是负责在多个微服务之间传播事务。

## seata-spring-boot-starter

引用seata分布式事务SDK有两种方式，依赖seata-all或者seata-spring-boot-starter，推荐使用seata-spring-boot-starter，因为该starter已经自动注入了上面提到的三个模块，用户只要添加相应的配置，在业务代码添加全局分布式事务注解即可。下面从seata-spring-boot-starter项目中的代码入手：

![1720331088488](https://img-1312072469.cos.ap-nanjing.myqcloud.com/1720331088488.jpg)

这里的话提供了集中集中不同启动client 的方式，详细内容可以看一眼注释，下面的话选择`SteataAutoConfiguration`进行查看，已说明对应的启动流程

```java
/**
 * The type Seata auto configuration
 *
 */
@ConditionalOnProperty(prefix = SEATA_PREFIX, name = "enabled", havingValue = "true", matchIfMissing = true)
@AutoConfigureAfter({SeataCoreAutoConfiguration.class})
public class SeataAutoConfiguration {
    // Logger
    private static final Logger LOGGER = LoggerFactory.getLogger(SeataAutoConfiguration.class);

    @Bean(BEAN_NAME_FAILURE_HANDLER)
    @ConditionalOnMissingBean(FailureHandler.class)
    public FailureHandler failureHandler() {
        return new DefaultFailureHandlerImpl();
    }

    // GlobalTransactionScanner负责添加GlobalTransactionScanner注解的方法添加拦截器，并且负责初始化RM、TM
    @Bean
    @DependsOn({BEAN_NAME_SPRING_APPLICATION_CONTEXT_PROVIDER, BEAN_NAME_FAILURE_HANDLER})
    @ConditionalOnMissingBean(GlobalTransactionScanner.class)
    public static GlobalTransactionScanner globalTransactionScanner(SeataProperties seataProperties, FailureHandler failureHandler,
            ConfigurableListableBeanFactory beanFactory,
            @Autowired(required = false) List<ScannerChecker> scannerCheckers) {
        if (LOGGER.isInfoEnabled()) {
            LOGGER.info("Automatically configure Seata");
        }

        //下面的话使用一些了配置文件的属性，比如applicationId、txServiceGroup、scanPackages、excludesForScanning、accessKey、secretKey
        //然后用户可以自己设置对应的属性。

        // set bean factory
        GlobalTransactionScanner.setBeanFactory(beanFactory);

        // add checkers
        // '/META-INF/services/org.apache.seata.spring.annotation.ScannerChecker'
        GlobalTransactionScanner.addScannerCheckers(EnhancedServiceLoader.loadAll(ScannerChecker.class));
        // spring beans
        GlobalTransactionScanner.addScannerCheckers(scannerCheckers);

        // add scannable packages
        GlobalTransactionScanner.addScannablePackages(seataProperties.getScanPackages());
        // add excludeBeanNames
        GlobalTransactionScanner.addScannerExcludeBeanNames(seataProperties.getExcludesForScanning());
        //set accessKey and secretKey
        GlobalTransactionScanner.setAccessKey(seataProperties.getAccessKey());
        GlobalTransactionScanner.setSecretKey(seataProperties.getSecretKey());
        // create global transaction scanner
        return new GlobalTransactionScanner(seataProperties.getApplicationId(), seataProperties.getTxServiceGroup(),
                seataProperties.isExposeProxy(), failureHandler);
    }
}
```

可以看到，在进行拦截的时候，使用到了一个类，为`GlobalTransactionScanner`，下面详细的查看这个类。

### GlobalTransactionScanner

GlobalTransactionScanner继承于AbstractAutoProxyCreator，AbstractAutoProxyCreator可以用来判断是否需要实现对应的动态代理，下面重点查看字段和拦截代理的核心方法：

```java
public class GlobalTransactionScanner extends AbstractAutoProxyCreator
        implements CachedConfigurationChangeListener, InitializingBean, ApplicationContextAware, DisposableBean {
    // PROXYED_SET存储已经代理过的实例，防止重复处理
    private static final Set<String> PROXYED_SET = new HashSet<>();
    private static final Set<String> EXCLUDE_BEAN_NAME_SET = new HashSet<>();
    private static final Set<ScannerChecker> SCANNER_CHECKER_SET = new LinkedHashSet<>();

    private static ConfigurableListableBeanFactory beanFactory;

    // interceptor字段是对应一个代理对象的拦截器，
    // 可以认为是一个临时变量，有效期是一个被代理对象
    private MethodInterceptor interceptor;

    // applicationId是一个服务的唯一标识，对应springcloud项目中的spring.application.name
    private final String applicationId;
    // 事务的分组标识，参考文章wiki：https://seata.apache.org/zh-cn/docs/user/txgroup/transaction-group/
    private final String txServiceGroup;
    /**
     * The following will be scanned, and added corresponding interceptor:
     * 将扫描以下内容，并添加相应的拦截器：
     * <p>
     *  首先是TM模式，这种模式下尝试
     * TM:
     *
     * @see org.apache.seata.spring.annotation.GlobalTransactional // TM annotation
     * Corresponding interceptor:org.apache.seata.integration.tx.api.interceptor.handler.GlobalTransactionalInterceptorHandler
     * @see GlobalTransactionalInterceptorHandler#handleGlobalTransaction(InvocationWrapper, AspectTransactional) // TM handler
     * <p>
     * GlobalLock:
     * @see org.apache.seata.spring.annotation.GlobalLock // GlobalLock annotation
     * Corresponding interceptor:
     * @see GlobalTransactionalInterceptorHandler#handleGlobalLock(InvocationWrapper, GlobalLock)  // GlobalLock handler
     * <p>
     * TCC mode:
     * @see org.apache.seata.rm.tcc.api.LocalTCC // TCC annotation on interface
     * @see org.apache.seata.rm.tcc.api.TwoPhaseBusinessAction // TCC annotation on try method
     * @see org.apache.seata.integration.tx.api.remoting.RemotingParser // Remote TCC service parser
     * Corresponding interceptor:
     * @see org.apache.seata.rm.tcc.interceptor.TccActionInterceptorHandler // the interceptor of TCC mode
     */
    @Override
    protected Object wrapIfNecessary(Object bean, String beanName, Object cacheKey) {
        // do checkers
        if (!doCheckers(bean, beanName)) {
            return bean;
        }

        try {
            //这部分加上synchronized，具体功能可能还需要进行查看
            // TODO：这里的synchronized是为了保证PROXYED_SET和NEED_ENHANCE_BEAN_NAME_SET的一致性，但是这里的逻辑还是需要进一步查看
            synchronized (PROXYED_SET) {
                if (PROXYED_SET.contains(beanName)) {
                    return bean;
                }
                if (!NEED_ENHANCE_BEAN_NAME_SET.contains(beanName)) {
                    return bean;
                }
                // 每次处理一个被代理对象时先把interceptor置为null，所以interceptor的
                // 生命周期是一个被代理对象，由于是在另外一个方法getAdvicesAndAdvisorsForBean
                // 中使用interceptor，所以该interceptor要定义为一个类变量
                interceptor = null;
                //判定对应的十五类型，主要判定依据是方法上是否有对应的注解
                ProxyInvocationHandler proxyInvocationHandler = DefaultInterfaceParser.get().parserInterfaceToProxy(bean, beanName);
                if (proxyInvocationHandler == null) {
                    return bean;
                }

                // 创建对应的事务
                interceptor = new AdapterSpringSeataInterceptor(proxyInvocationHandler);
                LOGGER.info("Bean [{}] with name [{}] would use interceptor [{}]", bean.getClass().getName(), beanName, interceptor.toString());
                if (!AopUtils.isAopProxy(bean)) {
                    // 如果bean本身不是Proxy对象，则直接调用父类的wrapIfNecessary生成代理对象即可
                    // 在父类中会调用getAdvicesAndAdvisorsForBean获取到上面定义的interceptor
                    bean = super.wrapIfNecessary(bean, beanName, cacheKey);
                } else {
                    // 如果该bean已经是代理对象了，则直接在代理对象的拦截调用链AdvisedSupport
                    // 上直接添加新的interceptor即可。
                    AdvisedSupport advised = SpringProxyUtils.getAdvisedSupport(bean);
                    Advisor[] advisor = buildAdvisors(beanName, getAdvicesAndAdvisorsForBean(null, null, null));
                    int pos;
                    for (Advisor avr : advisor) {
                        // Find the position based on the advisor's order, and add to advisors by pos
                        pos = findAddSeataAdvisorPosition(advised, avr);
                        advised.addAdvisor(pos, avr);
                    }
                }
                // 标识该beanName已经处理过了
                PROXYED_SET.add(beanName);
                return bean;
            }
        } catch (Exception exx) {
            throw new RuntimeException(exx);
        }
    }
}
```

当调用被`@GlobalTransactional`或`@GlobalLock`注解修饰的方法时，会调到代理对象，而增强逻辑在`GlobalTransactionalInterceptor`类的invoke方法里。而具体是如何增强的以及事务时如何执行的放在另一篇专门讲解。

#### 初始化TM和BM

GlobalTransactionScanner还实现了`InitializingBean`接口，所以在初始化阶段还会调用`afterPropertiesSet`方法

```java
@Override
    public void afterPropertiesSet() {
        if (disableGlobalTransaction) {
            if (LOGGER.isInfoEnabled()) {
                LOGGER.info("Global transaction is disabled.");
            }
            ConfigurationFactory.getInstance().addConfigListener(ConfigurationKeys.DISABLE_GLOBAL_TRANSACTION, (CachedConfigurationChangeListener) this);
            return;
        }
        // 如果seata客户端还未初始化，则进行初始化
        if (initialized.compareAndSet(false, true)) {
            initClient();
        }

        this.findBusinessBeanNamesNeededEnhancement();
    }
```

这里会对TM和RM进行初始化，本质上都是创建一个netty客户端，然后向tc注册

```java
protected void initClient() {
    if (LOGGER.isInfoEnabled()) {
        LOGGER.info("Initializing Global Transaction Clients ... ");
    }
    if (DEFAULT_TX_GROUP_OLD.equals(txServiceGroup)) {
        LOGGER.warn("the default value of seata.tx-service-group: {} has already changed to {} since Seata 1.5, " +
                        "please change your default configuration as soon as possible " +
                        "and we don't recommend you to use default tx-service-group's value provided by seata",
                DEFAULT_TX_GROUP_OLD, DEFAULT_TX_GROUP);
    }
    if (StringUtils.isNullOrEmpty(applicationId) || StringUtils.isNullOrEmpty(txServiceGroup)) {
        throw new IllegalArgumentException(String.format("applicationId: %s, txServiceGroup: %s", applicationId, txServiceGroup));
    }
    //init TM
    // 初始化 TM，本质就是创建一个tm的netty客户端，然后向tc注册
    TMClient.init(applicationId, txServiceGroup, accessKey, secretKey);
    if (LOGGER.isInfoEnabled()) {
        LOGGER.info("Transaction Manager Client is initialized. applicationId[{}] txServiceGroup[{}]", applicationId, txServiceGroup);
    }
    //init RM
    // 初始化 RM，本质就是创建一个rm的netty客户端，然后向tc注册
    //TODO:不出意外改造的就是这里，改造的目的是为了支持多Client的模式
    RMClient.init(applicationId, txServiceGroup);
    if (LOGGER.isInfoEnabled()) {
        LOGGER.info("Resource Manager is initialized. applicationId[{}] txServiceGroup[{}]", applicationId, txServiceGroup);
    }

    if (LOGGER.isInfoEnabled()) {
        LOGGER.info("Global Transaction Clients are initialized. ");
    }
    registerSpringShutdownHook();

}
```

初始化 TM

```java
public static void init(String applicationId, String transactionServiceGroup, String accessKey, String secretKey) {
    // 获取TM客户端实例
    TmNettyRemotingClient tmNettyRemotingClient = TmNettyRemotingClient.getInstance(applicationId, transactionServiceGroup, accessKey, secretKey);
    // 初始化TM的netty客户端
    tmNettyRemotingClient.init();
}
```

在获取TM客户端实例时，会创建netty客户端，但还未启动

```java
@Override
public void init() {
    // 注册相关处理器
    registerProcessor();
    if (initialized.compareAndSet(false, true)) {
        // 调用父类初始化方法
        super.init();
    }
}
```

注册两个处理器，用来处理TC返回给TM的响应

```java
private void registerProcessor() {
    // 1.registry TC response processor
    // 注册Seata-Server返回的Response的处理Processor，用于Client主动发起Request，
    // Seata-Server返回的Response
    ClientOnResponseProcessor onResponseProcessor =
            new ClientOnResponseProcessor(mergeMsgMap, super.getFutures(), getTransactionMessageHandler());
    super.registerProcessor(MessageType.TYPE_SEATA_MERGE_RESULT, onResponseProcessor, null);
    super.registerProcessor(MessageType.TYPE_GLOBAL_BEGIN_RESULT, onResponseProcessor, null);
    super.registerProcessor(MessageType.TYPE_GLOBAL_COMMIT_RESULT, onResponseProcessor, null);
    super.registerProcessor(MessageType.TYPE_GLOBAL_REPORT_RESULT, onResponseProcessor, null);
    super.registerProcessor(MessageType.TYPE_GLOBAL_ROLLBACK_RESULT, onResponseProcessor, null);
    super.registerProcessor(MessageType.TYPE_GLOBAL_STATUS_RESULT, onResponseProcessor, null);
    super.registerProcessor(MessageType.TYPE_REG_CLT_RESULT, onResponseProcessor, null);
    super.registerProcessor(MessageType.TYPE_BATCH_RESULT_MSG, onResponseProcessor, null);
    // 2.registry heartbeat message processor
    // ClientOnResponseProcessor负责把Client发送的Request和Seata-Server
    // 返回的Response对应起来，从而实现Rpc
    ClientHeartbeatProcessor clientHeartbeatProcessor = new ClientHeartbeatProcessor();
    super.registerProcessor(MessageType.TYPE_HEARTBEAT_MSG, clientHeartbeatProcessor, null);
}
```

在父类AbstractNettyRemotingClient中启动TM的netty客户端，这里的话暂时按下不表。下面简单分析RM的init方法：

```java
@Override
public void init() {
    // 定时重新发送 RegisterTMRequest（RM 客户端会发送 RegisterRMRequest）请求尝试连接服务端
    timerExecutor.scheduleAtFixedRate(new Runnable() {
        @Override
        public void run() {
            clientChannelManager.reconnect(getTransactionServiceGroup());
        }
    }, SCHEDULE_DELAY_MILLS, SCHEDULE_INTERVAL_MILLS, TimeUnit.MILLISECONDS);
    if (NettyClientConfig.isEnableClientBatchSendRequest()) {
        mergeSendExecutorService = new ThreadPoolExecutor(MAX_MERGE_SEND_THREAD,
                                                          MAX_MERGE_SEND_THREAD,
                                                          KEEP_ALIVE_TIME, TimeUnit.MILLISECONDS,
                                                          new LinkedBlockingQueue<>(),
                                                          new NamedThreadFactory(getThreadPrefix(), MAX_MERGE_SEND_THREAD));
        mergeSendExecutorService.submit(new MergedSendRunnable());
    }
    super.init();
    // 启动netty 客户端
    clientBootstrap.start();
}

```

初始化RM
初始化过程跟TM一样，下面只贴出相关代码

```java
public static void init(String applicationId, String transactionServiceGroup) {
    // 创建RM的netty客户端
    RmNettyRemotingClient rmNettyRemotingClient = RmNettyRemotingClient.getInstance(applicationId, transactionServiceGroup);
    // 设置RM进去
    rmNettyRemotingClient.setResourceManager(DefaultResourceManager.get());
    rmNettyRemotingClient.setTransactionMessageHandler(DefaultRMHandler.get());
    // 初始化
    rmNettyRemotingClient.init();
}
```

```java
@Override
public void init() {
    // 注册处理器
    registerProcessor();
    if (initialized.compareAndSet(false, true)) {
        super.init();

        // Found one or more resources that were registered before initialization
        if (resourceManager != null
            && !resourceManager.getManagedResources().isEmpty()
            && StringUtils.isNotBlank(transactionServiceGroup)) {
            getClientChannelManager().reconnect(transactionServiceGroup);
        }
    }
}

```

```java
private void registerProcessor() {
    // 1.registry rm client handle branch commit processor
    // 注册Seata-Server发起branchCommit的处理Processor
    RmBranchCommitProcessor rmBranchCommitProcessor = new RmBranchCommitProcessor(getTransactionMessageHandler(), this);
    super.registerProcessor(MessageType.TYPE_BRANCH_COMMIT, rmBranchCommitProcessor, messageExecutor);

    // 2.registry rm client handle branch commit processor
    // 注册Seata-Server发起branchRollback的处理Processor
    RmBranchRollbackProcessor rmBranchRollbackProcessor = new RmBranchRollbackProcessor(getTransactionMessageHandler(), this);
    super.registerProcessor(MessageType.TYPE_BRANCH_ROLLBACK, rmBranchRollbackProcessor, messageExecutor);

    // 3.registry rm handler undo log processor
    // 注册Seata-Server发起删除undoLog的处理Processor
    RmUndoLogProcessor rmUndoLogProcessor = new RmUndoLogProcessor(getTransactionMessageHandler());
    super.registerProcessor(MessageType.TYPE_RM_DELETE_UNDOLOG, rmUndoLogProcessor, messageExecutor);

    // 4.registry TC response processor
    // 注册Seata-Server返回Response的处理Processor，用于处理由Client主动发起Request，
    // Seata-Server返回的Response。
    // ClientOnResponseProcessor负责把Client发送的Request和Seata-Server
    // 返回的Response对应起来，从而实现Rpc
    ClientOnResponseProcessor onResponseProcessor =
        new ClientOnResponseProcessor(mergeMsgMap, super.getFutures(), getTransactionMessageHandler());
    super.registerProcessor(MessageType.TYPE_SEATA_MERGE_RESULT, onResponseProcessor, null);
    super.registerProcessor(MessageType.TYPE_BRANCH_REGISTER_RESULT, onResponseProcessor, null);
    super.registerProcessor(MessageType.TYPE_BRANCH_STATUS_REPORT_RESULT, onResponseProcessor, null);
    super.registerProcessor(MessageType.TYPE_GLOBAL_LOCK_QUERY_RESULT, onResponseProcessor, null);
    super.registerProcessor(MessageType.TYPE_REG_RM_RESULT, onResponseProcessor, null);

    // 5.registry heartbeat message processor
    // 处理Seata-Server返回的心跳消息
    ClientHeartbeatProcessor clientHeartbeatProcessor = new ClientHeartbeatProcessor();
    super.registerProcessor(MessageType.TYPE_HEARTBEAT_MSG, clientHeartbeatProcessor, null);
}

```

```java
@Override
public void init() {
    // 定时重新发送 RegisterTMRequest（RM 客户端会发送 RegisterRMRequest）请求尝试连接服务端
    timerExecutor.scheduleAtFixedRate(new Runnable() {
        @Override
        public void run() {
            clientChannelManager.reconnect(getTransactionServiceGroup());
        }
    }, SCHEDULE_DELAY_MILLS, SCHEDULE_INTERVAL_MILLS, TimeUnit.MILLISECONDS);
    if (NettyClientConfig.isEnableClientBatchSendRequest()) {
        mergeSendExecutorService = new ThreadPoolExecutor(MAX_MERGE_SEND_THREAD,
                                                          MAX_MERGE_SEND_THREAD,
                                                          KEEP_ALIVE_TIME, TimeUnit.MILLISECONDS,
                                                          new LinkedBlockingQueue<>(),
                                                          new NamedThreadFactory(getThreadPrefix(), MAX_MERGE_SEND_THREAD));
        mergeSendExecutorService.submit(new MergedSendRunnable());
    }
    super.init();
    // 启动netty 客户端
    clientBootstrap.start();
}
```

总结来说初始化TM和RM做的事就是分别注册几个处理器以及启动各自的Netty客户端。

### 数据源代理

SeataDataSourceAutoConfiguration

```java
@ConditionalOnBean(DataSource.class)
@ConditionalOnExpression("${seata.enabled:true} && ${seata.enableAutoDataSourceProxy:true} && ${seata.enable-auto-data-source-proxy:true}")
@AutoConfigureOrder(Ordered.LOWEST_PRECEDENCE)
@AutoConfigureAfter(value = {SeataCoreAutoConfiguration.class},
    name = "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration")
public class SeataDataSourceAutoConfiguration {

    /**
     * The bean seataAutoDataSourceProxyCreator.
     */
    /**
     * 负责为Spring中的所有DataSource生成代理对象，从而拦截SQL的执行，在SQL执行前后实现seata的逻辑
     */
    @Bean(BEAN_NAME_SEATA_AUTO_DATA_SOURCE_PROXY_CREATOR)
    @ConditionalOnMissingBean(SeataAutoDataSourceProxyCreator.class)
    public static SeataAutoDataSourceProxyCreator seataAutoDataSourceProxyCreator(SeataProperties seataProperties) {
        return new SeataAutoDataSourceProxyCreator(seataProperties.isUseJdkProxy(),
            seataProperties.getExcludesForAutoProxying(), seataProperties.getDataSourceProxyMode());
    }

}
```

该配置类要生效的条件是`${seata.enable:true} && ${seata.enableAutoDataSourceProxy:true} && ${seata.enable-auto-data-source-proxy:true}`这几个配置都为true，但是我在配置文件中都设置为true后也没生效，不知道哪里问题，所以我换一种方式，在启动类上添加@EnableAutoDataSourceProxy注解。

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Import(AutoDataSourceProxyRegistrar.class)
@Documented
public @interface EnableAutoDataSourceProxy {
    /**
     * Whether use JDK proxy instead of CGLIB proxy
     *
     * @return useJdkProxy
     */
    boolean useJdkProxy() default false;

    /**
     * Specifies which datasource bean are not eligible for auto-proxying
     *
     * @return excludes
     */
    String[] excludes() default {};

    /**
     * Data source proxy mode, AT or XA
     *
     * @return dataSourceProxyMode
     */
    String dataSourceProxyMode() default "AT";
}
```

该注解上导入了另一个类`AutoDataSourceProxyRegistrar`

```java
public class AutoDataSourceProxyRegistrar implements ImportBeanDefinitionRegistrar {
    private static final String ATTRIBUTE_KEY_USE_JDK_PROXY = "useJdkProxy";
    private static final String ATTRIBUTE_KEY_EXCLUDES = "excludes";
    private static final String ATTRIBUTE_KEY_DATA_SOURCE_PROXY_MODE = "dataSourceProxyMode";

    public static final String BEAN_NAME_SEATA_DATA_SOURCE_BEAN_POST_PROCESSOR = "seataDataSourceBeanPostProcessor";
    public static final String BEAN_NAME_SEATA_AUTO_DATA_SOURCE_PROXY_CREATOR = "seataAutoDataSourceProxyCreator";

    @Override
    public void registerBeanDefinitions(AnnotationMetadata importingClassMetadata, BeanDefinitionRegistry registry) {
        Map<String, Object> annotationAttributes = importingClassMetadata.getAnnotationAttributes(EnableAutoDataSourceProxy.class.getName());

        boolean useJdkProxy = Boolean.parseBoolean(annotationAttributes.get(ATTRIBUTE_KEY_USE_JDK_PROXY).toString());
        String[] excludes = (String[]) annotationAttributes.get(ATTRIBUTE_KEY_EXCLUDES);
        String dataSourceProxyMode = (String) annotationAttributes.get(ATTRIBUTE_KEY_DATA_SOURCE_PROXY_MODE);

        //register seataDataSourceBeanPostProcessor bean def
        if (!registry.containsBeanDefinition(BEAN_NAME_SEATA_DATA_SOURCE_BEAN_POST_PROCESSOR)) {
            AbstractBeanDefinition beanDefinition = BeanDefinitionBuilder
                .genericBeanDefinition(SeataDataSourceBeanPostProcessor.class)
                .addConstructorArgValue(excludes)
                .addConstructorArgValue(dataSourceProxyMode)
                .getBeanDefinition();
            registry.registerBeanDefinition(BEAN_NAME_SEATA_DATA_SOURCE_BEAN_POST_PROCESSOR, beanDefinition);
        }

        //register seataAutoDataSourceProxyCreator bean def
        if (!registry.containsBeanDefinition(BEAN_NAME_SEATA_AUTO_DATA_SOURCE_PROXY_CREATOR)) {
            AbstractBeanDefinition beanDefinition = BeanDefinitionBuilder
                .genericBeanDefinition(SeataAutoDataSourceProxyCreator.class)
                .addConstructorArgValue(useJdkProxy)
                .addConstructorArgValue(excludes)
                .addConstructorArgValue(dataSourceProxyMode)
                .getBeanDefinition();
            registry.registerBeanDefinition(BEAN_NAME_SEATA_AUTO_DATA_SOURCE_PROXY_CREATOR, beanDefinition);
        }
    }
}
```

`AutoDataSourceProxyRegistrar`实现了`ImportBeanDefinitionRegistrar`接口，这样我们就知道该类额外注册了`BeanDefinition`。通过源码可知，该类注册了两个bean，分别是`SeataDataSourceBeanPostProcessor`和`SeataAutoDataSourceProxyCreator`。

#### SeataDataSourceBeanPostProcessor

该类是一个BeanPostProcessor，主要就是用来生成数据源代理的

```java
public class SeataDataSourceBeanPostProcessor implements BeanPostProcessor {

    private static final Logger LOGGER = LoggerFactory.getLogger(SeataDataSourceBeanPostProcessor.class);

    private final List<String> excludes;
    private final BranchType dataSourceProxyMode;

    public SeataDataSourceBeanPostProcessor(String[] excludes, String dataSourceProxyMode) {
        this.excludes = Arrays.asList(excludes);
        this.dataSourceProxyMode = BranchType.XA.name().equalsIgnoreCase(dataSourceProxyMode) ? BranchType.XA : BranchType.AT;
    }

    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) {
        return bean;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        if (bean instanceof DataSource) {
            //When not in the excludes, put and init proxy.
            if (!excludes.contains(bean.getClass().getName())) {
                // 这里只是生成代理，并不返回代理，返回的还是真实数据源，
                // 毕竟不是每个sql都需要代理，在需要使用代理的时候再取出来
                DataSourceProxyHolder.get().putDataSource((DataSource) bean, dataSourceProxyMode);
            }

            // 如果是代理数据源，则返回真实数据源
            if (bean instanceof SeataDataSourceProxy) {
                LOGGER.info("Unwrap the bean of the data source," +
                    " and return the original data source to replace the data source proxy.");
                return ((SeataDataSourceProxy) bean).getTargetDataSource();
            }
        }
        return bean;
    }
}
```

DataSourceProxyHolder是用来存放代理数据源的，如果当前bean是DataSource，则会为该DataSource生成一个代理DataSource。在putDataSource方法中，会进行数据源代理类的创建，当然，该方法除了创建数据源代理，获取数据源代理也是调用这个方法。

```java
public SeataDataSourceProxy putDataSource(DataSource dataSource, BranchType dataSourceProxyMode) {
    DataSource originalDataSource;
    // 如果已经是代理数据源并且事务模式也跟想要的一样，则直接返回了
    if (dataSource instanceof SeataDataSourceProxy) {
        SeataDataSourceProxy dataSourceProxy = (SeataDataSourceProxy) dataSource;

        // 就是想要的代理类就直接返回了
        if (dataSourceProxyMode == dataSourceProxy.getBranchType()) {
            return (SeataDataSourceProxy) dataSource;
        }

        // 获取原数据源，下面根据该数据源创建或获取数据源代理类
        originalDataSource = dataSourceProxy.getTargetDataSource();
    } else {
        originalDataSource = dataSource;
    }
    // 从缓存中获取真实数据源对应的代理
    SeataDataSourceProxy dsProxy = dataSourceProxyMap.get(originalDataSource);
    if (dsProxy == null) {
        synchronized (dataSourceProxyMap) {
            dsProxy = dataSourceProxyMap.get(originalDataSource);
            if (dsProxy == null) {
                // 没获取到就根据事务模式和真实数据源创建一个代理
                dsProxy = createDsProxyByMode(dataSourceProxyMode, originalDataSource);
                // 放进缓存
                dataSourceProxyMap.put(originalDataSource, dsProxy);
            }
        }
    }
    return dsProxy;
}
```

XA模式就创建DataSourceProxyXA，其他模式创建DataSourceProx。

```java
private SeataDataSourceProxy createDsProxyByMode(BranchType mode, DataSource originDs) {
    return BranchType.XA == mode ? new DataSourceProxyXA(originDs) : new DataSourceProxy(originDs);
}
```

#### SeataAutoDataSourceProxyCreator

上面为每个数据源生成了seata的代理对象，但是该代理对象并不能通过AOP切入，所以还是需要一个AOP代理对象。SeataAutoDataSourceProxyCreator也是继承了AbstractAutoProxyCreator类，继承该类就可以对指定的bean生成AOP代理。

```java
public class SeataAutoDataSourceProxyCreator extends AbstractAutoProxyCreator {
    private static final Logger LOGGER = LoggerFactory.getLogger(SeataAutoDataSourceProxyCreator.class);
    private final List<String> excludes;
    private final Advisor advisor;

    public SeataAutoDataSourceProxyCreator(boolean useJdkProxy, String[] excludes, String dataSourceProxyMode) {
        this.excludes = Arrays.asList(excludes);
        this.advisor = new DefaultIntroductionAdvisor(new SeataAutoDataSourceProxyAdvice(dataSourceProxyMode));
        setProxyTargetClass(!useJdkProxy);
    }

    @Override
    protected Object[] getAdvicesAndAdvisorsForBean(Class<?> beanClass, String beanName, TargetSource customTargetSource) throws BeansException {
        if (LOGGER.isInfoEnabled()) {
            LOGGER.info("Auto proxy of [{}]", beanName);
        }
        return new Object[]{advisor};
    }

    @Override
    protected boolean shouldSkip(Class<?> beanClass, String beanName) {
        // 这个类只对DataSource生成代理
        return !DataSource.class.isAssignableFrom(beanClass) ||
            SeataProxy.class.isAssignableFrom(beanClass) ||
            excludes.contains(beanClass.getName());
    }
}
```

从shouldSkip方法可知，只会对DataSource生成代理，而它添加的增强逻辑在SeataAutoDataSourceProxyAdvice内。

```java
/**
 * 对DataSource进行增强，代理DataSource中的方法
 *
 * @author xingfudeshi@gmail.com
 */
public class SeataAutoDataSourceProxyAdvice implements MethodInterceptor, IntroductionInfo {

    private final BranchType dataSourceProxyMode;
    private final Class<? extends SeataDataSourceProxy> dataSourceProxyClazz;

    public SeataAutoDataSourceProxyAdvice(String dataSourceProxyMode) {
        if (BranchType.AT.name().equalsIgnoreCase(dataSourceProxyMode)) {
            this.dataSourceProxyMode = BranchType.AT;
            this.dataSourceProxyClazz = DataSourceProxy.class;
        } else if (BranchType.XA.name().equalsIgnoreCase(dataSourceProxyMode)) {
            this.dataSourceProxyMode = BranchType.XA;
            this.dataSourceProxyClazz = DataSourceProxyXA.class;
        } else {
            throw new IllegalArgumentException("Unknown dataSourceProxyMode: " + dataSourceProxyMode);
        }

        //Set the default branch type in the RootContext.
        RootContext.setDefaultBranchType(this.dataSourceProxyMode);
    }

    @Override
    public Object invoke(MethodInvocation invocation) throws Throwable {
        // 如果不是在@GlobalLock方法或事务模式跟当前的不匹配，则直接调用原方法
        if (!RootContext.requireGlobalLock() && dataSourceProxyMode != RootContext.getBranchType()) {
            return invocation.proceed();
        }

        Method method = invocation.getMethod();
        Object[] args = invocation.getArguments();
        Method m = BeanUtils.findDeclaredMethod(dataSourceProxyClazz, method.getName(), method.getParameterTypes());
        if (m != null && DataSource.class.isAssignableFrom(method.getDeclaringClass())) {
            // 获取seata创建的代理数据源，调用代理数据源的方法
            SeataDataSourceProxy dataSourceProxy = DataSourceProxyHolder.get().putDataSource((DataSource) invocation.getThis(), dataSourceProxyMode);
            return m.invoke(dataSourceProxy, args);
        } else {
            return invocation.proceed();
        }
    }

    @Override
    public Class<?>[] getInterfaces() {
        return new Class[]{SeataProxy.class};
    }
}
```

当调用DataSource的方法时，就会通过AOP代理对象调用到SeataDataSourceProxy实现类的方法，即seata的代理。

### Web MVC代理

这个的话比较简单，直接贴上相关代码：

```java
/**
 * Auto bean add for spring webmvc if in springboot env.
 *
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnWebApplication
@ConditionalOnMissingBean(SeataWebMvcConfigurer.class)
@ConditionalOnProperty(prefix = HTTP_PREFIX, name = "interceptor-enabled", havingValue = "true", matchIfMissing = true)
@AutoConfigureOrder(Ordered.LOWEST_PRECEDENCE)
public class SeataHttpAutoConfiguration {

    /**
     * The Jakarta seata web mvc configurer.
     *
     * @return the seata web mvc configurer
     */
    @Bean
    @ConditionalOnClass(name = "jakarta.servlet.http.HttpServletRequest")
    public JakartaSeataWebMvcConfigurer jakartaSeataWebMvcConfigurer() {
        return new JakartaSeataWebMvcConfigurer();
    }

    /**
     * The Javax seata web mvc configurer.
     *
     * @return the seata web mvc configurer
     */
    @Bean
    @ConditionalOnMissingBean(JakartaSeataWebMvcConfigurer.class)
    public SeataWebMvcConfigurer seataWebMvcConfigurer() {
        return new SeataWebMvcConfigurer();
    }
}
```

然后接着往里面看：

```java
/**
 * The Seata Web Mvc Configurer
 *
 */
public class SeataWebMvcConfigurer implements WebMvcConfigurerAdapter {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new TransactionPropagationInterceptor());
    }
}
```

`WebMvcConfigurerAdapter`可以以灵活的方式扩展和定制 Spring MVC 的配置，然后的话看`TransactionPropagationInterceptor`

```java
public class TransactionPropagationInterceptor implements HandlerInterceptorAdapter {

    private static final Logger LOGGER = LoggerFactory.getLogger(TransactionPropagationInterceptor.class);


    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String rpcXid = request.getHeader(RootContext.KEY_XID);
        return this.bindXid(rpcXid);
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        if (RootContext.inGlobalTransaction()) {
            String rpcXid = request.getHeader(RootContext.KEY_XID);
            this.cleanXid(rpcXid);
        }
    }


    protected boolean bindXid(String rpcXid) {
        String xid = RootContext.getXID();

        if (LOGGER.isDebugEnabled()) {
            LOGGER.debug("xid in RootContext[{}] xid in HttpContext[{}]", xid, rpcXid);
        }
        if (StringUtils.isBlank(xid) && StringUtils.isNotBlank(rpcXid)) {
            RootContext.bind(rpcXid);
            if (LOGGER.isDebugEnabled()) {
                LOGGER.debug("bind[{}] to RootContext", rpcXid);
            }
        }

        return true;
    }

    protected void cleanXid(String rpcXid) {
        XidResource.cleanXid(rpcXid);
    }

}
```

这个方法就相当于创建对应的适配器，通过获取对应的xid，从而进行适配。

