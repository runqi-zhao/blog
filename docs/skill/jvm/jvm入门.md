---
id: jvm入门
title: jvm入门
sidebar_label: jvm入门
description: jvm入门
---

## java从编码到执行

 ![未命名文件](https://zrsaber-blog.oss-cn-hangzhou.aliyuncs.com/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E6%96%87%E4%BB%B6.png)

这是jvm的基本结构，java文件通过javac生成class文件，class loder进入内存classLoder中，在java文件中，可能调用了String等等的类库，因此需要同步调用，然后通过字节编码器以及JIT及时编译器进行编译，在编译完成之后，有执行引擎开始执行。

jvm：从跨平台的语言到跨语言的平台

![image-20220726220912639](https://zrsaber-blog.oss-cn-hangzhou.aliyuncs.com/img/image-20220726220912639.png)

JVM与java无关

![image-20220726221205269](https://zrsaber-blog.oss-cn-hangzhou.aliyuncs.com/img/image-20220726221205269.png)

jvm是一种规范

虚构出来的一台计算机

字节码指令集

内存管理：栈 堆 方法区

javac的编译过程：

![image-20220726222125402](C:\Users\root\AppData\Roaming\Typora\typora-user-images\image-20220726222125402.png)

常见的JVM实现

![image-20220726222204009](C:\Users\root\AppData\Roaming\Typora\typora-user-images\image-20220726222204009.png)

![image-20220726222715978](C:\Users\root\AppData\Roaming\Typora\typora-user-images\image-20220726222715978.png)

  
