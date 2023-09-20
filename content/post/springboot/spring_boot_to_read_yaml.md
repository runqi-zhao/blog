---
title: "SpringBoot是如何读到yaml文档的"
description: 
date: 2023-09-20T22:38:59+08:00
image: 
math: 
license: 
hidden: false
categories:
    - Java
tags:
    - Spring Boot
    - 源码阅读
comments: true
draft: false
---

这篇将会逐步调用SpringBoot，直到读到对应的yaml文档或者是配置文件。

将从下面三个部分进行展示：

- springboot监听器初始化
- springboot事件发布器初始化
- springboot监听器工作原理

这里使用shenyu-examples-http为例

## SpringBoot监听器初始化

下面是SpringBoot主类

```java
package org.apache.shenyu.examples.http;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * ShenyuTestHttpApplication.
 */
@SpringBootApplication
public class ShenyuTestHttpApplication {

    /**
     * main.
     *
     * @param args args
     */
    public static void main(final String[] args) {
        SpringApplication.run(ShenyuTestHttpApplication.class, args);
    }
}
```

在run方法中隐藏着启动细节,进入run方法真实逻辑为创建SpringApplication对象并调用该对象的run方法

这里面使用了反射机制。按下不表，来个TODO

```java
	/**
	 * Static helper that can be used to run a {@link SpringApplication} from the
	 * specified source using default settings.
	 * @param primarySource the primary source to load
	 * @param args the application arguments (usually passed from a Java main method)
	 * @return the running {@link ApplicationContext}
	 */
	public static ConfigurableApplicationContext run(Class<?> primarySource, String... args) {
		return run(new Class<?>[] { primarySource }, args);
	}
```

首先分析SpringApplication构造函数，其功能就是初始化包括如下内容

- 资源加载器初始化
- 设置启动主类为primarySources
- 判断当前应用是否是web应用
- 设置初始化器
- 设置监听器 （本文重点分析此处逻辑）
- 设置主类

```java
public SpringApplication(ResourceLoader resourceLoader, Class<?>... primarySources) {
    this.resourceLoader = resourceLoader;
    Assert.notNull(primarySources, "PrimarySources must not be null");
    this.primarySources = new LinkedHashSet<>(Arrays.asList(primarySources));
    this.webApplicationType = WebApplicationType.deduceFromClasspath();
    setInitializers((Collection) getSpringFactoriesInstances(ApplicationContextInitializer.class));
    setListeners((Collection) getSpringFactoriesInstances(ApplicationListener.class));
    this.mainApplicationClass = deduceMainApplicationClass();
}
```

此处重点分析setListeners方法，此方法比较简单代码如下

```java
private List<ApplicationListener<?>> listeners;
public void setListeners(Collection<? extends ApplicationListener<?>> listeners) {
	this.listeners = new ArrayList<>(listeners);
}
```

> ApplicationListener是基于JDK观察者模式设计的接口 类图如下
> ApplicationEvent,EventListener均为JDK中默认接口

![观察者模式](https://img-blog.csdnimg.cn/20210206135535534.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dvc2hpeWl6aGl5dTA=,size_16,color_FFFFFF,t_70#pic_center)

查看完setListeners方法，继续分析该方法入参调用函数getSpringFactoriesInstances,该方法加载type类型的所有class全限定名并进行初始化

- SpringFactoriesLoader.loadFactoryNames(type, classLoader) 此方法加载所有jar包中META-INF/spring.factories文件

```java
private <T> Collection<T> getSpringFactoriesInstances(Class<T> type, Class<?>[] parameterTypes, Object... args) {
		ClassLoader classLoader = getClassLoader();
		// Use names and ensure unique to protect against duplicates
		Set<String> names = new LinkedHashSet<>(SpringFactoriesLoader.loadFactoryNames(type, classLoader));
		List<T> instances = createSpringFactoriesInstances(type, parameterTypes, classLoader, args, names);
		AnnotationAwareOrderComparator.sort(instances);
		return instances;
	}
```

通过springboot的源码中发现ApplicationListener类在下图中有10个其中打购类为配置文件解析监听器,这些类通过反射创建完成后传入setListeners完成赋值操作

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/20230920232439.png)

到此SpringApplication对象的创建工作结束了，接下来分析run方法中逻辑，由于run方法逻辑比较复杂本文只分析与配置文件加载相关代码

```java
public ConfigurableApplicationContext run(String... args) {
  StopWatch stopWatch = new StopWatch();
  stopWatch.start();
  ConfigurableApplicationContext context = null;
  Collection<SpringBootExceptionReporter> exceptionReporters = new ArrayList<>();
  configureHeadlessProperty();
  SpringApplicationRunListeners listeners = getRunListeners(args);
  listeners.starting();
  try {
	 ApplicationArguments applicationArguments = new DefaultApplicationArguments(args);
	 ConfigurableEnvironment environment = prepareEnvironment(listeners, applicationArguments);
	 configureIgnoreBeanInfo(environment);
	 Banner printedBanner = printBanner(environment);
	 context = createApplicationContext();
	 exceptionReporters = getSpringFactoriesInstances(SpringBootExceptionReporter.class,new Class[] { ConfigurableApplicationContext.class }, context);
	 prepareContext(context, environment, listeners, applicationArguments, printedBanner);
	 .....省略代码.....
	try {
		listeners.running(context);
	}
	catch (Throwable ex) {
		handleRunFailure(context, ex, exceptionReporters, null);
		throw new IllegalStateException(ex);
	}
	return context;
}
```

主要实现以下两种功能：

- 获取springboot 事件发布器
- 发布springboot 容器启动事件

> SpringApplicationRunListeners listeners = getRunListeners(args);
> listeners.starting();

![EventPublishingRunListener](https://img-blog.csdnimg.cn/20210206172631952.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dvc2hpeWl6aGl5dTA=,size_16,color_FFFFFF,t_70#pic_center)

EventPublishingRunListener 中持有SpringApplication对象，该对象持有所有ApplicationListener对象因此可以实现发布事件到所有监听器

![在这里插入图片描述](https://img-blog.csdnimg.cn/2021020618091273.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dvc2hpeWl6aGl5dTA=,size_16,color_FFFFFF,t_70)

EventPublishingRunListener starting()方法就是对所有监听器发布容器启动事件，该事件会被独有监听器接受并判断是否处理，处理配置文件的监听器ConfigFileApplicationListener也会收到该事件

```java
public void starting() {
	this.initialMulticaster.multicastEvent(new ApplicationStartingEvent(this.application, this.args));
}
```

ConfigFileApplicationListener处理的事件类型为ApplicationEnvironmentPreparedEvent，ApplicationPreparedEvent，因此ApplicationStartingEvent并不会处理

往下继续查看run方法中代码会发现prepareEnvironment方法会创建ConfigurableEnvironment类此类是springboot中存储所有配置的类

```
ConfigurableEnvironment environment = prepareEnvironment(listeners, applicationArguments);
```

进入该方法发现事件发布器向所有坚挺着发布一个环境准备完毕的事件此事件正式上文提到的ApplicationEnvironmentPreparedEvent因此会触发ConfigFileApplicationListener处理，但是此时必须已经创建ConfigurableEnvironment类。

ConfigFileApplicationListener监听到ApplicationEnvironmentPreparedEvent事件处理以下几件事情

- 加载后置处理器
- 对后置处理器优先级进行排序
- 调用后置处理器处理逻辑

![在这里插入图片描述](https://img-blog.csdnimg.cn/20210206194105455.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dvc2hpeWl6aGl5dTA=,size_16,color_FFFFFF,t_70)

后置处理器是所有EnvironmentPostProcessor实现类加载方式与监听器一样可参考上文，ConfigFileApplicationListener同样实现了EnvironmentPostProcessor后置处理器接口因此postProcessors.add(this); 是将自己注册到所有处理器中实现处理逻辑

```java
loadPostProcessors() {
	return SpringFactoriesLoader.loadFactories(EnvironmentPostProcessor.class,getClass().getClassLoader());
}
```

这里特此声明真正实现配置文件加载的逻辑开始
postProcessEnvironment调用addPropertySources调用Loader(environment, resourceLoader).load()，所有的逻辑处理都是通过Loader 这个内部类来完成的，此处的处理方式跟SpringApplication(primarySources).run(args) 是不是极为相似

![在这里插入图片描述](https://img-blog.csdnimg.cn/20210206195302344.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dvc2hpeWl6aGl5dTA=,size_16,color_FFFFFF,t_70)

最后分析下Loader类的逻辑首先初始化完成

- springboot环境类用于存放所有配置文件中的key=value
- 变量占位符解析类
- 资源加载器
- 配置文件解析加载器,处理 properties,yml,yaml文件的加载

![在这里插入图片描述](https://img-blog.csdnimg.cn/20210206200130870.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dvc2hpeWl6aGl5dTA=,size_16,color_FFFFFF,t_70)

PropertySourceLoader实现类为下图中两个，因此配置文件的加载会根据文件扩展名不同使用不用类来处理

![在这里插入图片描述](https://img-blog.csdnimg.cn/20210206200543454.png)

重要的逻辑终于出来了，此处重点逻辑分为

- 处理spring.profiles.active，spring.profiles.include配置
- 加载配置文件并与profile绑定
- 将配置文件与springboot Environment 绑定
- 激活对应的profile

![在这里插入图片描述](https://img-blog.csdnimg.cn/20210206200914187.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dvc2hpeWl6aGl5dTA=,size_16,color_FFFFFF,t_70)

load方法首先会在几个默认路径下尝试加载,默认路径如下

DEFAULT_SEARCH_LOCATIONS = “classpath:/,classpath:/config/,file:./,file:./config/*/,file:./config/”;

getSearchNames()方法返回配置文件名字默认名字为:application

![在这里插入图片描述](https://img-blog.csdnimg.cn/20210206201746554.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dvc2hpeWl6aGl5dTA=,size_16,color_FFFFFF,t_70)

此处特别说明下如果启动方式为 java -jar xxx.jar -Dspring.config.name=xx.properties 则不会加载默认名字的配置文件，网上很多关于spring.config.name使用这里通过源码分析说明了使用方式

接下来是load方法因为name非空则直接进入红框逻辑，通过扩展名来处理不同类型配置文件

![在这里插入图片描述](https://img-blog.csdnimg.cn/20210206203258147.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dvc2hpeWl6aGl5dTA=,size_16,color_FFFFFF,t_70)

如果没有配置spring.profile.active直接进入红框逻辑
![在这里插入图片描述](https://img-blog.csdnimg.cn/2021020620374844.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dvc2hpeWl6aGl5dTA=,size_16,color_FFFFFF,t_70)

通过resourceLoader加载路径下配置文件通过合法行校验后加载对应配置文件等待下一步解析

![在这里插入图片描述](https://img-blog.csdnimg.cn/2021020620422585.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dvc2hpeWl6aGl5dTA=,size_16,color_FFFFFF,t_70)

配置文件加载完毕后进行解析此处consumer lambda方法为addToLoaded并将其与
Map<Profile, MutablePropertySources> loaded 绑定

![在这里插入图片描述](https://img-blog.csdnimg.cn/20210206204609686.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dvc2hpeWl6aGl5dTA=,size_16,color_FFFFFF,t_70)

最后是将配置与enviroment 绑定

![在这里插入图片描述](https://img-blog.csdnimg.cn/20210206205930420.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dvc2hpeWl6aGl5dTA=,size_16,color_FFFFFF,t_70)

