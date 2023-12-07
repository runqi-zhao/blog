---
title: "e2cnn内容理解-群的输入类型"
description: 
date: 2023-12-03T20:56:54+08:00
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

然后我们卡一下官网的解释，在官网中进行解释的时候，使用对应一个例子解释，可以直接看对应的[连接](https://quva-lab.github.io/e2cnn/api/e2cnn.nn.html#field-type)。

结合这个例子可以看到，在官网中，依旧是进行直积操作，因此，说到底，这个输入类型的创建就将你设置的通道进行直积操作 ，就是将对应内容拼接在一起，为了验证这个想法，我们下面看一个例子。

现在假设我们输入的是一个图像，输入的是3通道 ，现在调用下面的语句：

```python
self.in_type = build_enn_trivial_feature(3)
```

在这一条调用 完成之后，相当于我们现在设置的输入通道是3通道（一个RGB图像）。现在我们看函数里面的具体内容：

```python
def build_enn_trivial_feature(planes):
    """build a enn trivial feature map with the specified number of
    channels."""
    return enn.FieldType(gspace, planes * [gspace.trivial_repr])
```

通过函数里面的具体内容可知，在进行创建的时候，使用到了我们上篇文章创建的gspace，但是在上一篇中，我们在进行创建的时候没有使用trival_rper函数，因此，则会里面我们跳到对应的函数中，查看这个函数对应的变量。

```python
@property
def trivial_repr(self) -> e2cnn.group.Representation:
    r"""
    The trivial representation of the fiber group of this space.

    .. seealso::

        :attr:`e2cnn.group.Group.trivial_representation`

    """
    return self.fibergroup.trivial_representation
```

然后我们看了这里面对应的内容，根据上面注释的解释，这里是该空间纤维群的平凡表示，然后为了彻底搞懂这个内容，跳到这个函数里面查看里面的内容：

```python
 @property
@abstractmethod
def trivial_representation(self) -> e2cnn.group.IrreducibleRepresentation:
    r"""
    Builds the trivial representation of the group.
    The trivial representation is a 1-dimensional representation which maps any element to 1,
    i.e. :math:`\forall g \in G,\ \rho(g) = 1`.

    Returns:
        the trivial representation of the group

    """
    pass
```

在这个函数里面，我们构建群的平凡表示，这个平凡 表示是一种以为表示，可以将任何元素映射为1，例如
$$
\forall g \in G,\ \rho(g) = 1
$$
总结一下上面函数，相当于我们创建了群中的元素都是1，然后再创建完成之后，直接与其中的通道相乘，设置成对应的输入类型。因此，在这个里面 ，应该是3个相同的变量 。

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/202312041519976.png)

从这里面可以看出，不过是将对应1映射到对应的维度上面，然后将里面每个内容都复制对应的三份，然后直接更新对应的representation与representations，然后直接进行返回，然后这里用出现了新东西，里面的fields_star与fileds_end没有出现，这里的话我们还是通过源码进行调试，找到生成对应值的函数。

但是单点调试了很久，都没有跳到对应的程序里面，这里是不是出现了问题？

TODO：这里是一个 带及觉得 点。

ok，先不纠结这个问题，然后我们直接将里面的内容进行 对应的直积操作，在进行的时候，我们刚开始使用的是$1 \times 1$大小的核心，因此这里的直积是将里面的内容进行拼接，然后进行返回。

这里说一下直积的公式：
$$
\rho_{in} = irrpe\_0 \oplus irrpe\_0 \oplus irrpe\_0 =\left[\begin{array}{ccc}
irrpe\_0 & 0 & 0 \\
0 & irrpe\_0 & 0 \\
0 & 0 & irrpe\_0
\end{array}\right]
$$


因此，上面的内容就是将里面的内容进行拼接。从数据返回来看，也是将里面内容进行拼接。

但是里面的代码确实没有找到 ，我现在直接跳转到对应直积和函数，然后向上找到其中对应的断点。

```python
def directsum(reprs: List[e2cnn.group.Representation],
              change_of_basis: np.ndarray = None,
              name: str = None
              ) -> e2cnn.group.Representation:
    r"""

    Compute the *direct sum* of a list of representations of a group.
    
    The direct sum of two representations is defined as follow:
    
    .. math::
        \rho_1(g) \oplus \rho_2(g) = \begin{bmatrix} \rho_1(g) & 0 \\ 0 & \rho_2(g) \end{bmatrix}
    
    This can be generalized to multiple representations as:
    
    .. math::
        \bigoplus_{i=1}^I \rho_i(g) = (\rho_1(g) \oplus (\rho_2(g) \oplus (\rho_3(g) \oplus \dots = \begin{bmatrix}
            \rho_1(g) &         0 &  \dots &      0 \\
                    0 & \rho_2(g) &  \dots & \vdots \\
               \vdots &    \vdots & \ddots &      0 \\
                    0 &     \dots &      0 & \rho_I(g) \\
        \end{bmatrix}
    

    .. note::
        All the input representations need to belong to the same group.

    Args:
        reprs (list): the list of representations to sum.
        change_of_basis (~numpy.ndarray, optional): an invertible square matrix to use as change of basis after computing the direct sum.
                By default (``None``), an identity matrix is used, such that only the direct sum is evaluated.
        name (str, optional): a name for the new representation.

    Returns:
        the direct sum

    """
    
    group = reprs[0].group
    for r in reprs:
        assert group == r.group
    
    if name is None:
        name = "_".join([f"[{r.name}]" for r in reprs])
    
    irreps = []
    for r in reprs:
        irreps += r.irreps
    
    size = sum([r.size for r in reprs])
    
    cob = np.zeros((size, size))
    cob_inv = np.zeros((size, size))
    p = 0
    for r in reprs:
        cob[p:p + r.size, p:p + r.size] = r.change_of_basis
        cob_inv[p:p + r.size, p:p + r.size] = r.change_of_basis_inv
        p += r.size

    if change_of_basis is not None:
        change_of_basis = change_of_basis @ cob
        change_of_basis_inv = sp.linalg.inv(change_of_basis)
    else:
        change_of_basis = cob
        change_of_basis_inv = cob_inv

    supported_nonlinearities = set.intersection(*[r.supported_nonlinearities for r in reprs])
    
    return Representation(group, name, irreps, change_of_basis, supported_nonlinearities, change_of_basis_inv=change_of_basis_inv)
```

从程序上面来看，就是将里面的内容进行拼接，然后返回对应的值。

## 总结

输入的 内容就是将里面的内容直接进行拼接操作，然后进行返回。



