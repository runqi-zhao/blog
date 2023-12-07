---
title: "e2cnn 内容理解 - 群的输出类型"
description: 
date: 2023-12-04T17:01:17+08:00
image: 
math: true
license: Apache Licence 2.0
hidden: false
categories:
    - 机器学习
tags:
    - 机器学习
    - 源码阅读
    - 群论
comments: true
draft: false
---

在有了上面的群的创建，输入类型的创建，下面看看输出类型的创建。

输出类型的创建其实 与输入类型的创建有很多相似之处。

首先看看对应输出类型的创建语句：

```python
self._make_stem_layer(in_channels, stem_channels)
```

然后进到这个函数 

```python
 def _make_stem_layer(self, in_channels, stem_channels):
    """Build stem layer."""
    if not self.deep_stem:
        self.conv1 = ennTrivialConv(
            in_channels, stem_channels, kernel_size=7, stride=2, padding=3)
        self.norm1_name, norm1 = build_enn_norm_layer(
            stem_channels, postfix=1)
        self.add_module(self.norm1_name, norm1)
        self.relu = ennReLU(stem_channels)
    self.maxpool = ennMaxPool(
        stem_channels, kernel_size=3, stride=2, padding=1)
```

然后对进到ennTrivialConv这个函数里面

```python
def ennTrivialConv(inplanes,
                   outplanes,
                   kernel_size=3,
                   stride=1,
                   padding=0,
                   groups=1,
                   bias=False,
                   dilation=1):
    """enn convolution with trivial input feature.

    Args:
        in_channels (List[int]): Number of input channels per scale.
        out_channels (int): Number of output channels (used at each scale).
        kernel_size (int, optional): The size of kernel.
        stride (int, optional): Stride of the convolution. Default: 1.
        padding (int or tuple): Zero-padding added to both sides of the input.
            Default: 0.
        groups (int): Number of blocked connections from input.
            channels to output channels. Default: 1.
        bias (bool): If True, adds a learnable bias to the output.
            Default: False.
        dilation (int or tuple): Spacing between kernel elements. Default: 1.
    """

    in_type = build_enn_trivial_feature(inplanes)
    out_type = build_enn_divide_feature(outplanes)
    return enn.R2Conv(
        in_type,
        out_type,
        kernel_size,
        stride=stride,
        padding=padding,
        groups=groups,
        bias=bias,
        dilation=dilation,
        sigma=None,
        frequencies_cutoff=lambda r: 3 * r,
    )
```

里面创建了对应的输入类型和输出类型，输入类型和上一节中是一样的，这里的话不再进行详细的讲解，输出类型是本节的重点，将会进行重点讲解。

下面我们来看对应的输出类型的函数。

```python
def build_enn_divide_feature(planes):
    """build a enn regular feature map with the specified number of channels
    divided by N."""
    assert gspace.fibergroup.order() > 0
    N = gspace.fibergroup.order()
    planes = planes / N
    planes = int(planes)
    return enn.FieldType(gspace, [gspace.regular_repr] * planes)
```

上面这一段是重新设对应的planes的 大小，这里为什么要处理对应的总数？这里其实不是很明白，标记一个TODO。

然后我们在进去对应FiledType之前，我们系要使用对应regular_repr函数，这里的话就是我们在创建群是创建的平凡表示（碎碎念：其实平凡表示我搞得也不是很懂，但是这个内容是群中的一个概念，这个系列对于一个没有学习过群论的人来说确实有点难度，这里的话还是先放在这里吧）。

然后我们拿到这个变量，对应的内容如下：

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/202312041840576.png)

这里面的东西就是我们在初始化群已经初始化好的内容。

在我们经过输出类型的设置之后，对应的内容是什么？

这里的话我们输入的是64，在讲过相除之后，输入FieldType里面的planes是8，这个时候我们还是上一讲中讲的直积操作，将里面的内容直接 进行拼接，然后返回，对应的输出如下：

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/202312041844803.png)

这个时候对应的就是矩阵拼接，然后这里咱们主要看一下对应的fileds_star与fileds_end，这两个内容跟上一讲中内容还是有点差别的，这是因为上一讲中我们是以1为间隔单位进行的设置，这里的话是以8为间隔单位进行设置。

上述内容设置完，相当于对应的输出类型已经创建完成，下一讲将会讲述本文的核心内容，也就是对应的R2Conv。

