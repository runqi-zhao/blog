---
title: "e2cnn内容理解-群的输入类型"
description: 
date: 2023-12-03T20:56:54+08:00
image: 
math: true
license: 
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

上一个内容之中，我们已经解释了 对应e2cnn的创建，现在我们解释对应的输入类型的创建。

首先我们要知道，我们现在已经创建了一个循环群，创建完成循环群之后里面已经有对应的平凡表示，这些内容都有了之后，下面会使用 上一讲中已经创建的内容，构建群的如数类型$\rho_{in}$。

本文使用的是ReDet的ReResNet进行说明，因此，里面会出现对应的内容 。

首先，在我们创建完成对应的循环群 之后，会使用下面代码创建对应的输入类型 ：

```python
self.in_type = build_enn_trivial_feature(3)

def build_enn_trivial_feature(planes):
    """build a enn trivial feature map with the specified number of
    channels."""
    return enn.FieldType(gspace, planes * [gspace.trivial_repr])
```

gspace是我们上一讲中创建的类型，trivial_repr是对应“琐碎表示”，这个的话可以看论文之中的解释，在这里我们依然使用的是上面对应已经创建好的循环群中的第一个元素，这里是有理论支撑的，但是里面的内容确实不简单，先按下不表。

然后接下来将会使用FieldType，可以说，这个是本文的重头戏，这个理解好了，输入类型就理解好了。

```python
class FieldType:
    
    def __init__(self,
                 gspace: GSpace,
                 representations: List[Representation]):
        r"""
        
        An ``FieldType`` can be interpreted as the *data type* of a feature space. It describes:
        
        - the base space on which a feature field is living and its symmetries considered
        
        - the transformation law of feature fields under the action of the fiber group
        
        The former is formalize by a choice of ``gspace`` while the latter is determined by a choice of group
        representations (``representations``), passed as a list of :class:`~e2cnn.group.Representation` instances.
        Each single representation in this list corresponds to one independent feature field contained in the feature
        space.
        The input ``representations`` need to belong to ``gspace``'s fiber group
        (:attr:`e2cnn.gspaces.GSpace.fibergroup`).
        
        .. note ::
            
            Mathematically, this class describes a *(trivial) vector bundle*, *associated* to the symmetry group
            :math:`(\R^D, +) \rtimes G`.
            
            Given a *principal bundle* :math:`\pi: (\R^D, +) \rtimes G \to \R^D, tg \mapsto tG`
            with fiber group :math:`G`, an *associated vector bundle* has the same base space
            :math:`\R^D` but its fibers are vector spaces like :math:`\mathbb{R}^c`.
            Moreover, these vector spaces are associated to a :math:`c`-dimensional representation :math:`\rho` of the
            fiber group :math:`G` and transform accordingly.
            
            The representation :math:`\rho` is defined as the *direct sum* of the representations :math:`\{\rho_i\}_i`
            in ``representations``. See also :func:`~e2cnn.group.directsum`.
            
        
        Args:
            gspace (GSpace): the space where the feature fields live and its symmetries
            representations (list): a list of :class:`~e2cnn.group.Representation` s of the ``gspace``'s fiber group,
                            determining the transformation laws of the feature fields
        
        Attributes:
            ~.gspace (GSpace)
            ~.representations (list)
            ~.size (int): dimensionality of the feature space described by the :class:`~e2cnn.nn.FieldType`.
                          It corresponds to the sum of the dimensionalities of the individual feature fields or
                          group representations (:attr:`e2cnn.group.Representation.size`).
 
            
        """
        assert len(representations) > 0
        
        for repr in representations:
            assert repr.group == gspace.fibergroup
        
        # GSpace: Space where data lives and its (abstract) symmetries
        self.gspace = gspace
        
        # list: List of representations of each feature field composing the feature space of this type
        self.representations = representations
        
        # int: size of the field associated to this type.
        # as the representation associated to the field is the direct sum of the representations
        # in :attr:`e2cnn.nn.fieldtype.representations`, its size is the sum of each of these
        # representations' size
        self.size = sum([repr.size for repr in representations])

        self._unique_representations = set(self.representations)
        
        self._representation = None
        
        self._field_start = None
        self._field_end = None

        self._hash = hash(self.gspace.name + ': {' + ', '.join([r.name for r in self.representations]) + '}')
```

一个 ``FieldType` 可以解释为一个特征空间的*数据类型*。它描述
- 特征域所处的基础空间及其对称性

- 特征场在纤维群作用下的变换规律

    前者是通过选择 "特征空间 "来形式化的，而后者则是由选择群来决定的 表征（``representations``），以 :class:`~e2cnn.group.Representation` 实例列表的形式传递。
    该列表中的每个表示法都对应于特征空间中的一个独立特征字段空间。

上面是作者给的 解释，其实看的还是云里雾里。

还是老规矩，一行一行代码查看，首先的话还是先进性初始化。

初始化完成之后，下面这一步进行哈希操作：

```python
self._hash = hash(self.gspace.name + ': {' + ', '.join([r.name for r in self.representations]) + '}')
```

通过将 `gspace.name` 和 `representations` 中每个表示的名称连接起来，并计算哈希值来表示 `FieldType` 的唯一性。

这里第一个坑点来了，从程序上面来看，我们初始化完成之后，输入类型就已经创建结束，但是我们看论文中的解释：

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/20231203212843.png)

这里的话论文中是这么说的：在第 5 行，我们定义了输入 $\rho_{in}$ 的字段类型，指定它包含 3 个标量字段，由平凡表示$\psi $ 描述（例如 RGB 图像，另见第 3.2 节）。

然后我们查看对应的3.2节。

其实看这个图就好了

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/202312032255517.png)

但是除了这个，链的群卷积让然需要进行了解，今天先这样，剩下的明天再干。

