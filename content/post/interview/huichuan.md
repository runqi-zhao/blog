---
title: "汇川一面"
description: 汇川一面面试记录
date: 2023-09-07T15:52:00+08:00
image: 
math: 
license: 
hidden: false
tags:
    - 面试
    - 八股
comments: true
draft: fasle
---

一些问题的复盘 ，想想自己为什么会被挂

这个面试时纯八股，因此相当于考验自己八股背的熟不熟。

## 请你介绍一下synchronized关键字

这个当时回答的话逻辑存在些问题，当时在介绍的时候逻辑如下：

1. 这个关键字的作用是什么
2. 为什么会产生这个问题
3. 使用这个关键字的流程。

下面将重新系统梳理整体逻辑，包括与Lock的比较。

### synchronized是什么？有什么用？

synchronized时Java中的一个关机簪子，翻译中文就是同步的意思。主要解决的就是多个线程之间访问资源的同步性，可以保证被它修饰的方法或者代码块在任意时刻只有一个线程执行。

在Java早期版本中，synchronized关键字属于**重量级锁**。效率低下。这是因为监视器所时要来与底层操作修通的Mutex Lock实现的，Java的线程是映射到操作系统的原生线程之上的。如果要挂起或者唤醒一个线程，都需要操作系统帮忙完成，而操作系统线程之间的切换时需要从用户态转换到内核态，这个状态之间的转换需要相对较长的时间，时间成本相对较高。


但是在Java6之后，synchronized引入了大量优化如自旋锁、适应性自旋锁、锁消除、锁粗化、偏向锁、轻量级锁等技术来减少锁操作的开销。这使得`synchronized`效率得到了提升。

以上就是一些基本概念，在了解了这些基本概念之后，下面需要介绍如何使用synchronized的使用

### 如何使用synchronized？

1. 修饰实例方法
2. 修饰静态方法
3. 修饰代码块

#### 修饰实例方法

给当前对象示例加锁，进入同步代码前要获得**当前对象实例的锁**。

#### 修饰静态方法

给当前类加锁，作用域类的多有对象实例，进入同步代码块前要**获得当前class锁。**

#### 修饰代码块（锁定当前类）

给当前类进行加锁，会作用域类的所有对象示例，进入统合部代码前要获得当前class锁。

#### 修饰代码块（锁指定对象/类）

对括号里面指定的对象/类加锁：

1. `synchronized(object)`标识进入同步代码库要获得**给定对象的锁。**
2. `synchronized(类.class)` 表示进入同步代码前要获得 **给定 Class 的锁**。

#### 总结

`synchronized` 关键字加到 `static` 静态方法和 `synchronized(class)` 代码块上都是是给 Class 类上锁；

`synchronized` 关键字加到实例方法上是给对象实例上锁；

尽量不要使用 `synchronized(String a)` 因为 JVM 中，字符串常量池具有缓存功能。

### 构造方法可以用synchronized修饰吗

先说结论：**构造方法不能使用 synchronized 关键字修饰。**

构造方法本身就属于线程安全的，不存在同步的构造方法一说。

重头戏是下面这块

### synchronized底层原理了解吗

synchronized 关键字底层原理属于 JVM 层面的东西。

#### synchronized 同步语句块的情况

```java
public class SynchronizedDemo {
    public void method() {
        synchronized (this) {
            System.out.println("synchronized 代码块");
        }
    }
}
```

通过 JDK 自带的 `javap` 命令查看 `SynchronizedDemo` 类的相关字节码信息：首先切换到类的对应目录执行 `javac SynchronizedDemo.java` 命令生成编译后的 .class 文件，然后执行`javap -c -s -v -l SynchronizedDemo.class`。

![synchronized关键字原理](https://img-1312072469.cos.ap-nanjing.myqcloud.com/synchronized-principle.png)

从上面我们可以看出：synchronized` 同步语句块的实现使用的是 `monitorenter` 和 `monitorexit` 指令，其中 `monitorenter` 指令指向同步代码块的开始位置，`monitorexit` 指令则指明同步代码块的结束位置。

上面的字节码中包含一个 `monitorenter` 指令以及两个 `monitorexit` 指令，这是为了保证锁在同步代码块代码正常执行以及出现异常的这两种情况下都能被正确释放。

当执行 `monitorenter` 指令时，线程试图获取锁也就是获取 **对象监视器 `monitor`** 的持有权。

> 在 Java 虚拟机(HotSpot)中，Monitor 是基于 C++实现的，由[ObjectMonitoropen in new window](https://github.com/openjdk-mirror/jdk7u-hotspot/blob/50bdefc3afe944ca74c3093e7448d6b889cd20d1/src/share/vm/runtime/objectMonitor.cpp)实现的。每个对象中都内置了一个 `ObjectMonitor`对象。
>
> 另外，`wait/notify`等方法也依赖于`monitor`对象，这就是为什么只有在同步的块或者方法中才能调用`wait/notify`等方法，否则会抛出`java.lang.IllegalMonitorStateException`的异常的原因。

在执行`monitorenter`时，会尝试获取对象的锁，如果锁的计数器为 0 则表示锁可以被获取，获取后将锁计数器设为 1 也就是加 1。

![执行 monitorenter 获取锁](https://img-1312072469.cos.ap-nanjing.myqcloud.com/synchronized-get-lock-code-block.png)

对象锁的的拥有者线程才可以执行 `monitorexit` 指令来释放锁。在执行 `monitorexit` 指令后，将锁计数器设为 0，表明锁被释放，其他线程可以尝试获取锁。

![执行 monitorexit 释放锁](https://img-1312072469.cos.ap-nanjing.myqcloud.com/synchronized-release-lock-block.png)

如果获取对象锁失败，那当前线程就要阻塞等待，直到锁被另外一个线程释放为止。

#### synchronized 修饰方法的的情况

```java
public class SynchronizedDemo2 {
    public synchronized void method() {
        System.out.println("synchronized 方法");
    }
}
```

![synchronized关键字原理](https://oss.javaguide.cn/github/javaguide/synchronized%E5%85%B3%E9%94%AE%E5%AD%97%E5%8E%9F%E7%90%862.png)

`synchronized`修饰的方法并没有使用`mintorenter`指令和`mintorexit`指令。取而代之的却是`ACC_SYNCHONIZED`访问表示来判别一个方法是否声明为同步方法，从而执行响应的同步调用。

如果是实例方法，JVM 会尝试获取实例对象的锁。如果是静态方法，JVM 会尝试获取当前 class 的锁。

### 总结

`synchronized` 同步语句块的实现使用的是 `monitorenter` 和 `monitorexit` 指令，其中 `monitorenter` 指令指向同步代码块的开始位置，`monitorexit` 指令则指明同步代码块的结束位置。

`synchronized` 修饰的方法并没有 `monitorenter` 指令和 `monitorexit` 指令，取得代之的确实是 `ACC_SYNCHRONIZED` 标识，该标识指明了该方法是一个同步方法。

**不过两者的本质都是对对象监视器 monitor 的获取。**

----

以上是参考JavaGuide进行编写的，但是这部分感觉并不是很深入，因此下面从我自己原本的笔记上面进行提炼总结。（主要是从深入理解JVM上面进行总结，因为上面知识简单说明了对应指令的使用，并没有说明）

### Moniterenter、Moniterexit

这两个是JVM指令，主要是基于`Mask word`和`Object monitor`来实现显得。

在JVM中，对象在内存中分为三个区域：

1. 对象头
2. 示例数据
3. 字节对齐

下面主要介绍对象头。

#### 对象头

<font color="red">synchronized用的锁是存在Java对象头里的。</font>如果对象是数组类型，则虚拟机用3个字宽（Word）存储对象头，如果对象是非数组类型，则用2字宽存储对象头。在32位虚拟机中，1字宽等于4字节，即32bit，如下表所示

| 长度     | 内容                   | 说明                             |
| -------- | ---------------------- | -------------------------------- |
| 32/64bit | Mark word              | 存储对象的hashCode或锁信息等     |
| 32/64bit | Class Metadata Address | 存储对象类型数据的指针           |
| 32/64bit | Array length           | 数组的长度（如果当前对象是数组） |

Java对象头里的Mark Word里默认存储对象的HashCode、分代年龄和锁标记位。32位JVM的Mark Word的默认存储结构如下表：

| 锁状态   | 25bit          | 4bit         | 1bit是否是偏向锁 | 2bit锁标志 |
| -------- | -------------- | ------------ | ---------------- | ---------- |
| 无状态锁 | 对象的hashCode | 对象分代年龄 | 0                | 01         |

在运行期间，Mark Word里存储的数据会随着锁标志位的变化而变化。Mark Word可能变化为存储以下4种数据，如下表所示：

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/20230424111910.png)

在64位虚拟机下，Mark Word是64bit大小的，其存储结构如下表所示：

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/20230424111932.png)

其实这个的重点就是锁升级与锁对比。

下面将针对这部分内容进行总结。

### 锁升级与对比

上面已经说过，从Java6开始，所功能进行升级，将锁划分成了四种状态：

1. 无锁装填
2. 偏向锁装填
3. 轻量级锁状态
4. 重量级状态。

先说明几个简单的概念：

1. 锁可以升级但是是不可以降级。
2. 目的是为了条噶获得锁和释放锁的效率。

### 偏向锁

大多数情况下在多线程中，使用锁不存在竞争，并且总是有一个线程进行获得，因此出现了对应的偏向锁。

偏向锁在进行使用的时候流程如下：

1. 首先当一个线程访问所记录里存储偏向的线程ID。
2. 第二次进入同步块时不需要进行CAS操作和加锁以及解锁操作。只需要要简单的测试一下对象头的Mark  Word里是否存储着指向当前线程的偏向锁。
   1. 如果说指向当前对象，则证明已经拿到偏向锁，进行操作。
   2. 如果说没有指向当前对象，那么需要测试一个Mark Word中偏向锁的标识是否视之为1
      1. 如果没有设置，则使用CAS竞争锁。
      2. 如果设置了，则尝试使用CAS将对象头的偏向锁指向当前线程。
3. 在上面一系列操作之后，需要将偏向锁进行撤销，撤销条件：当其他线程尝试竞争偏向锁是，持有偏向锁的线程才会释放锁。 撤销步骤如下：
   1. 需要等待全局安全点（这个时间点上没有正在执行的字节码）
   2. 首先暂停又有偏向锁的线程
   3. 检查持有偏向锁是否还活着
      1. 如果当前线程不属于活动状态，则将当前对象头设置为无所状态。
      2. 如果线程仍然活着，拥有偏向锁的栈将会执行，遍历偏向对象的锁记录，
         1. 栈中锁记录和对象头的Mark Word要么重新偏向于其他线程
         2. 要么恢复到无锁或者标价对象不适合作为偏向锁。
   4. 最后唤醒线程。
4. 偏向锁在Java 6和Java 7里是默认启用的，但是它在应用程序启动几秒钟之后才激活，如有必要可以使用JVM参数来关闭延迟：-XX:BiasedLockingStartupDelay=0。如果你确定应用程序里所有的锁通常情况下处于竞争状态，可以通过JVM参数关闭偏向锁：-XX:-UseBiasedLocking=false，那么程序默认会进入轻量级锁状态。

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/20230424134229.png)

### 轻量级锁

#### 轻量级锁加锁

线程执行同步块之前，

1. JVM会先再当前线程的栈帧中创建用于存储锁记录的空间。
2. 将对象头中的Mark Word复制到锁记录中，官方称之为Displaced Mark Word。
3. 线程尝试使用CAS将对象头中Mark Word替换为指向锁记录的指针。
   1. 如果成功，当前线程获得锁。
   2. 如果失败，表示其他线程竞争所，当前西安测绘给你边长是使用自旋来获取锁。

#### 轻量级锁解锁

1. 使用原子CAS操作将Displaced Mark Word替换回到对象头。
   1. 如果成功，则表示没有竞争发生。
   2. 如果失败，表示当前锁存在竞争，锁就会膨胀为重量级锁。

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/20230424134408.png)

因为自旋会消耗CPU，为了避免无用的自旋（比如获得锁的线程被阻塞住了），一旦锁升级成重量级锁，就不会再恢复到轻量级锁状态。当锁处于这个状态下，其他线程试图获取锁时，都会被阻塞住，当持有锁的线程释放锁之后会唤醒这些线程，被唤醒的线程就会进行新一轮的夺锁之争。

| 锁       | 优点                                                         | 缺点                                          | 适用场景                          |
| :------- | :----------------------------------------------------------- | :-------------------------------------------- | :-------------------------------- |
| 偏向锁   | 加锁和解锁不需要额外的消耗，和执行非同步方法相比仅存在纳秒级的差距 | 如果线程间存在锁竞争会带来额外的锁撒销的消耗  | 适用于只有一个线程访问同步块场景  |
| 轻量级锁 | 竞争的线程不会阻塞，提高了程序的响应速度                     | 如果始终得不到锁竞争的线程，使用自旋会消耗CPU | 追求响应时间 同步块执行速度非常快 |
| 重量级锁 | 县城竞争不使用自旋，不会消耗CPU                              | 线程阻塞，响应时间缓慢                        | 追求吞吐量 同步块执行速度较长     |

OK，这个问题会带结束，顺带将第二个问题进行回答了，“你知道锁升级的过程吗”

## 你知道锁升级的过程吗

见上

## 对于CurrentHashMap你是怎么理解的

这个话自己的回答算是70分，说出了锁分段，put和set的过程，这个具体的看笔记，这个记得比较清楚。

## 场景题

核心线程池为4，最大线程数位10，队列大小为10，同时启动6个任务，每个任务10秒，执行多少时间，这个线程池会启动多少个线程来处理任务。

这个题目就是对线程池的考虑，我回答20秒。

有一篇很好的文章：https://tech.meituan.com/2020/04/02/java-pooling-pratice-in-meituan.html 这个文章看懂了这一类问题就没问题了。

## 对于ThreadLocal的理解

这个不是很熟悉。

> TODO：专门写一篇笔记加深印象。

https://javaguide.cn/java/concurrent/java-concurrent-questions-03.html

## JVM垃圾回收处理器

这个是必须会背的。

## MySQL数据库innodedb的存储结构，为社么使用这种结构

个人认为70分。

## MySQL中的MVCC

0分，感觉这个就是挂了我的主要原因，这个是必会的确回答的细碎。

> 这个需要重点复习总结

https://javaguide.cn/database/mysql/innodb-implementation-of-mvcc.html

## Redis中用到的数据结构

这个必会，每个细节都需要会。

75分。

**其中zset的运用原理回答的不是很好！！！**

## Redis当中持久化方式

70分

## Netty的IO方式

0分

## TCP粘包问题如何解决

0分

这个当时忘了，其实根本不知道....

有空看看https://segmentfault.com/a/1190000039691657

## Netty默认启动多少个线程

0分

## Spring当中数据注入的方式

100分

## Spring当中是线程安全的吗

70分

## 分布式锁与线程锁的区别

20分。。。

结束

## 总结

到后面Netty开始全盘崩。

对于Redis 常见的背会。

Netty也需要背会。

Spring中一些常见的需要背会。

这一面有点类似于kpi面。。。。但是可能确实是后面崩了。。。。
