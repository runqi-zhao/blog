---
title: "Tcp粘包"
description: 总结自https://segmentfault.com/a/1190000039691657
date: 2023-09-27T10:42:04+08:00
image: https://segmentfault.com/img/bVcQHML?spec=cover
math: 
license: 
categories:
    - 计算机基础
tags:
    - 计算机网络
hidden: false
comments: true
draft: true
---

从三个方面进行总结：

1. 什么是TCP粘包
2. 为什么会出现TCP粘包
3. 怎么解决TCP粘包

然后从TCP粘包进行拓展：

1. UDP会出现粘包情况吗
2. IP会出此案粘包情况吗

下面开始进行总结

## 什么是TCP粘包

首先 ，我们知道，在网络协议中，一个包进行传输的时候会经过下面几层结构：

![四层网络协议](https://img-1312072469.cos.ap-nanjing.myqcloud.com/1460000039691660)

在每一层，我们都需要加上对应的头部信息：

![四层网络协议 (1)](https://img-1312072469.cos.ap-nanjing.myqcloud.com/1460000039691663)

最终，到达物理层（网络接口层），发送的保重除了对应的消息，还包括了`tcp头部`，`ip头部`、`mac头部`

下面，说明什么是TCP粘包。

我们知道，由于网络资源的限制，在进行包发送时，需要将对应的消息进行分段发送，例如我现在发送了两个消息：

- 你拿到录用通知了
- 没有

这里引入两个概念：

- `MSS`:消息在`传输层(TCP)`是会被切成一个个数据包，这个数据包的长度就称为`MSS`。
- `MTU`：把网络比喻成一个水管，是有一定`粗细`的，这个粗细由`网络接口层(数据链路层)`提供给`网络层`，一般认为是`MTU(1500)`。

![MSS和MTU的区别](https://img-1312072469.cos.ap-nanjing.myqcloud.com/1460000039691670)

- **MTU: Maximum Transmit Unit**，最大传输单元。 由**网络接口层（数据链路层）**提供给**网络层**最大一次传输数据的大小；一般 MTU=**1500 Byte**。 假设IP层有 <= 1500 byte 需要发送，只需要一个 IP 包就可以完成发送任务；假设 IP 层有> 1500 byte 数据需要发送，需要分片才能完成发送，分片后的 IP Header ID 相同。
- **MSS：Maximum Segment Size** 。 TCP 提交给 IP 层最大分段大小，不包含 TCP Header 和 TCP Option，只包含 TCP Payload ，MSS 是 TCP 用来限制应用层最大的发送字节数。 假设 MTU= 1500 byte，那么 **MSS = 1500- 20(IP Header) -20 (TCP Header) = 1460 byte**，如果应用层有 **2000 byte** 发送，那么需要两个切片才可以完成发送，第一个 TCP 切片 = 1460，第二个 TCP 切片 = 540。

有了这连个概念，我们再回到对应的两句话，现在假设MSS能够发送两个字符，那么，这两句话就会被切分成：

- 你拿
- 到录
- 用通
- 知了
- 没有

在进行发送的时候，如果说网络状况良好，那么可以发送成功，如果说网络存在波动，在进行切片换份的时候，导致TCP在最终组包出现错误，上面的话变成了下面这段话：

- 你拿到录用通知了没
- 有

相当于“知了”作为上一个包与下一个包“没”粘在一起呗错误的当成一个包解析出来了，这就称之为“粘包”。

## 为什么会出现TCP粘包

我们知道，TCP再进行发送的时候，一般里面的数据是采用字节流进行传送的，即将对应的内容都转换为对应的字符进行发送。

![二进制字节流](https://segmentfault.com/img/remote/1460000039691666)

最终将对应的字节流进行转换，得到对应的包。

### 为什么要组装发送的数据

上面提到的`TCP切割`数据包是为了能顺利通过这根水管。还有一个**组装**的情况。如果前后两次 TCP 发的数据都远小于 MSS，比如就几个字节，每次都单独发送这几个字节，就比较**浪费**网络 io 。

因此，在1984年 ，提出`Naggle算法`。

具体做法就是当一个包来了之后，首先判断对应的包长度是否已满（是否等于MSS），如果说没有满，则等待下个包的来到，然后进行判断此时是否比MSS长，长的话进行切割，将对应的包进行分割。

当然，里面有等待超时机制，这个相当于等待一定时间后如果说没有对应的包到来，则直接进行分割。

下面说明启动`Naggle算法`出现的问题：

- 由于启动了**Nagle算法**， msg1 小于 mss ，此时等待`200ms`内来了一个 msg2 ，msg1 + msg2 > MSS，因此把 msg2 分为 msg2(1) 和 msg2(2)，msg1 + msg2(1) 包的大小为`MSS`。此时发送出去。
- 剩余的 msg2(2) 也等到了 msg3， 同样 msg2(2) + msg3 > MSS，因此把 msg3 分为 msg3(1) 和 msg3(2)，msg2(2) + msg3(1) 作为一个包发送。
- 剩余的 msg3(2) 长度不足`mss`，同时在`200ms`内没有等到下一个包，等待超时，直接发送。
- 此时三个包虽然在图里**颜色不同**，但是实际场景中，他们都是**一整个 01 串**，如果处理开发者把第一个收到的 msg1 + msg2(1) 就当做是一个完整消息进行处理，就会看上去就**像是两个包粘在一起**，就会导致**粘包问题**。

### 不使用Naggle算法就没事了吗

今天网络环境比以前好太多，Nagle 的优化帮助就没那么大了。而且它的延迟发送，有时候还可能导致调用延时变大，比如打游戏的时候，你操作如此丝滑，但却因为 Nagle 算法延迟发送导致慢了一拍，就问你难受不难受。

所以现在**一般也会把它关掉**。

```
TCP_NODELAY = 1
```

看下面一种情况：

![关闭Negle就不会粘包了吗](https://segmentfault.com/img/remote/1460000039691676)

- 接受端应用层在收到 **msg1** 时立马就取走了，那此时 **msg1** 没粘包问题
- **msg2** 到了后，应用层在忙，没来得及取走，就呆在 **TCP Recv Buffer** 中了
- **msg3** 此时也到了，跟 **msg2** 和 **msg3** 一起放在了 **TCP Recv Buffer** 中
- 这时候应用层忙完了，来取数据，图里是两个颜色作区分，但实际场景中**都是 01 串**，此时一起取走，发现还是粘包。

这种情况下，仍然存在粘包

## 怎么处理粘包

粘包出现的根本原因是不确定**消息的边界**。接收端在面对**"无边无际"的二进制流**的时候，根本不知道收了多少 01 才算**一个消息**。一不小心拿多了就说是**粘包**。其实粘包根本不是 TCP 的问题，是使用者对于 TCP 的理解有误导致的一个问题。

### 处理方法1：加入特殊标志

![消息边界头尾标志](https://img-1312072469.cos.ap-nanjing.myqcloud.com/1460000039691673)

可以通过特殊的标志作为头尾，比如当收到了`0xfffffe`或者回车符，则认为收到了新消息的头，此时继续取数据，直到收到下一个头标志`0xfffffe`或者尾部标记，才认为是一个完整消息。类似的像 HTTP 协议里当使用 **chunked 编码** 传输时，使用若干个 chunk 组成消息，最后由一个标明长度为 0 的 chunk 结束。

但是消息中可能存在跟我们设置的头标志相同的内容，因此，我们需要使用一种方式将这个特殊字段“特殊化”，一般是采用校验字段进行特殊化。

![消息边界头尾加校验标志](https://img-1312072469.cos.ap-nanjing.myqcloud.com/1460000039691688)

### 处理方式2：加入消息长度信息

![消息边界长度标志](https://img-1312072469.cos.ap-nanjing.myqcloud.com/1460000039691674)

这个一般配合上面的特殊标志一起使用，在收到头标志时，里面还可以带上消息长度，以此表明在这之后多少 byte 都是属于这个消息的。如果在这之后正好有符合长度的 byte，则取走，作为一个完整消息给应用层使用。在实际场景中，HTTP 中的`Content-Length`就起了类似的作用，当接收端收到的消息长度小于 Content-Length 时，说明还有些消息没收到。那接收端会一直等，直到拿够了消息或超时。

## UDP中存在粘包吗

直接说结论：UDP直接没有连接嘛，来一个发送一个，怎么可能存在粘包。

这部分具体内容还是查看博客，没啥好说的。

### 为什么长度字段冗余还要加到 UDP 首部中

![为什么UDP要冗余一个长度字段](https://segmentfault.com/img/remote/1460000039691684)

这个有意思，这个直接引用原文的话：

> 可能是因为要用于计算校验和。也有的说是因为UDP底层使用的可以不是IP协议，毕竟 IP 头里带了总长度，正好可以用于计算 UDP 数据的长度，万一 UDP 的底层不是IP层协议，而是其他网络层协议，就不能继续这么计算了。
>
> 但我觉得，最重要的原因是，IP 层是网络层的，而 UDP 是传输层的，到了传输层，数据包就已经不存在IP头信息了，那么此时的UDP数据会被放在 UDP 的 `Socket Buffer` 中。当应用层来不及取这个 UDP 数据报，那么两个数据报在数据层面其实都是一堆 01 串。此时读取第一个数据报的时候，会先读取到 UDP 头部，**如果这时候 UDP 头不含 UDP 长度信息，那么应用层应该取多少数据才算完整的一个数据报呢**？
>
> 因此 UDP 头的这个长度其实跟 TCP 为了防止粘包而在消息体里加入的边界信息是起一样的作用的。

## IP会粘包嘛

不会

先看看 IP 层的切片分包是怎么回事。

![P分包与重组](https://segmentfault.com/img/remote/1460000039691687)

- 如果消息过长，`IP层`会按 **MTU 长度**把消息分成 **N 个切片**，每个切片带有自身在**包里的位置（offset）**和**同样的IP头信息**。
- 各个切片在网络中进行传输。每个数据包切片可以在不同的路由中流转，然后**在最后的终点汇合后再组装**。
- 在接收端收到第一个切片包时会申请一块新内存，创建IP包的数据结构，等待其他切片分包数据到位。
- 等消息全部到位后就把整个消息包给到上层（传输层）进行处理。

可以看出整个过程，`IP 层`从按长度切片到把切片组装成一个数据包的过程中，都只管运输，都不需要在意消息的边界和内容，都不在意消息内容了，那就不会有粘包一说了。

`IP 层`表示：我只管把发送端给我的数据传到接收端就完了，我也不了解里头放了啥东西。

听起来就像 “**我不管产品的需求傻不傻X，我实现了就行，我不问，也懒得争了**”

## 总结

粘包这个问题的根因是由于开发人员没有正确理解 TCP 面向字节流的数据传输方式，本身并不是 TCP 的问题，是开发者的问题。

- TCP 不管发送端要发什么，都基于字节流把数据发到接收端。这个字节流里可能包含上一次想要发的数据的部分信息。接收端根据需要在消息里加上识别消息边界的信息。不加就可能出现粘包问题。
- TCP 粘包跟Nagle算法有关系，但关闭 Nagle 算法并不解决粘包问题。
- UDP 是基于数据报的传输协议，不会有粘包问题。
- IP 层也切片，但是因为不关心消息里有啥，因此有不会有粘包问题。
- `TCP` 发送端可以发 `10 次`字节流数据，接收端可以分 `100 次`去取；`UDP` 发送端发了 `10 次`数据报，那接收端就要在 `10 次`收完。