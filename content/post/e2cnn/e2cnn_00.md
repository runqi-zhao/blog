---
title: "e2cnn 内容理解 - 群的创建源码详解 "
description: 
date: 2023-12-02T16:55:17+08:00
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

## 创建 循环群 

这里的话考虑的是简单情况，使用对应的循环群。对应的方法如下：

```python
N = 8
gspace = gspaces.Rot2dOnR2(N=N)
```

然后看这个函数里面的东西：

```python
def __init__(self, N: int = None, maximum_frequency: int = None, fibergroup: Group = None):
        r"""

        Describes rotation symmetries of the plane :math:`\R^2`.

        If ``N > 1``, the class models *discrete* rotations by angles which are multiple of :math:`\frac{2\pi}{N}`
        (:class:`~e2cnn.group.CyclicGroup`).
        Otherwise, if ``N=-1``, the class models *continuous* planar rotations (:class:`~e2cnn.group.SO2`).
        In that case the parameter ``maximum_frequency`` is required to specify the maximum frequency of the irreps of
        :class:`~e2cnn.group.SO2` (see its documentation for more details)

        Args:
            N (int): number of discrete rotations (integer greater than 1) or ``-1`` for continuous rotations
            maximum_frequency (int): maximum frequency of :class:`~e2cnn.group.SO2`'s irreps if ``N = -1``
            fibergroup (Group, optional): use an already existing instance of the symmetry group.
                   In that case, the other parameters should not be provided.

        """
        
        assert N is not None or fibergroup is not None, "Error! Either use the parameter `N` or the parameter `group`!"
    
        if fibergroup is not None:
            assert isinstance(fibergroup, CyclicGroup) or isinstance(fibergroup, SO2)
            assert maximum_frequency is None, "Maximum Frequency can't be set when the group is already provided in input"
            N = fibergroup.order()
            
        assert isinstance(N, int)
        
        if N > 1:
            assert maximum_frequency is None, "Maximum Frequency can't be set for finite cyclic groups"
            name = '{}-Rotations'.format(N)
        elif N == -1:
            name = 'Continuous-Rotations'
        else:
            raise ValueError(f'Error! "N" has to be an integer greater than 1 or -1, but got {N}')

        if fibergroup is None:
            if N > 1:
                fibergroup = cyclic_group(N)
            elif N == -1:
                fibergroup = so2_group(maximum_frequency)

        super(Rot2dOnR2, self).__init__(fibergroup, name)
```

这个注释里面描述的是：描述平面$R^2$的旋转对称性。然后，咱们一句一句看：

```python
assert N is not None or fibergroup is not None, "Error! Either use the parameter `N` or the parameter `group`!"
```

这段代码要求在使用这段代码所在的函数或程序时，要么提供变量 `N` 的值，要么提供变量 `fibergroup` 的值。如果两者都没有提供一个非空的值，就会触发断言错误，以防止程序进一步执行下去。

接着看下面这段话：

```python
 if fibergroup is not None:
            assert isinstance(fibergroup, CyclicGroup) or isinstance(fibergroup, SO2)
            assert maximum_frequency is None, "Maximum Frequency can't be set when the group is already provided in input"
            N = fibergroup.order()
            
        assert isinstance(N, int)
```

`assert isinstance(fibergroup, CyclicGroup) or isinstance(fibergroup, SO2)`：这是一个断言语句，用于检查 `fibergroup` 是否是 `CyclicGroup` 类型或者 `SO2` 类型的实例。如果 `fibergroup` 不是这两种类型的实例，则会引发一个断言错误。

`N = fibergroup.order()`：如果之前的条件检查通过（即 `fibergroup` 不是 `None` 并且是 `CyclicGroup` 或 `SO2` 的实例），则计算 `N` 的值为 `fibergroup` 的阶数（order）。

上面几句，其实一般不会用到，看下面语句：

```python
if N > 1:
    assert maximum_frequency is None, "Maximum Frequency can't be set for finite cyclic groups"
    name = '{}-Rotations'.format(N)
elif N == -1:
    name = 'Continuous-Rotations'
else:
    raise ValueError(f'Error! "N" has to be an integer greater than 1 or -1, but got {N}')
```

然后看下面这些语句，这里的话就是根据你输入参数的给不同的群命令，比如现在 我们输入$N=8$，那么这个时候名字就是`8-Rotations`。代表 8 个循环群轮换。

然后看下面：

```python
if fibergroup is None:
    if N > 1:
        fibergroup = cyclic_group(N)
    elif N == -1:
        fibergroup = so2_group(maximum_frequency)
```

这里的话我们先说明对应循环群，即看`cyclic_group`这个函数。

```python
def cyclic_group(N: int):
    r"""

    Builds a cyclic group :math:`C_N`of order ``N``, i.e. the group of ``N`` discrete planar rotations.
    
    You should use this factory function to build an instance of :class:`e2cnn.group.CyclicGroup`.
    Only one instance is built and, in case of multiple calls to this function, the same instance is returned.
    In case of multiple calls of this function with different parameters or in case new representations are built
    (eg. through the method :meth:`~e2cnn.group.Group.quotient_representation`), this unique instance is updated with
    the new representations and, therefore, all its references will see the new representations.

    Args:
        N (int): number of discrete rotations in the group

    Returns:
        the cyclic group of order ``N``

    """
    return CyclicGroup._generator(N)
```

这个的话就是构建结束为`N`的循环群 $C_{N}$。然后，我们  跳进去这个函数里面看看对应的细节。**注意，里面的内容是对应的核心**。

```python
def _generator(N: int) -> 'CyclicGroup':
    global _cached_group_instances
    if N not in _cached_group_instances:
        _cached_group_instances[N] = CyclicGroup(N)

    return _cached_group_instances[N]
```

这段代码定义了一个函数 `_generator`，它接受一个整数 `N` 作为参数，并返回一个 `CyclicGroup` 对象。函数使用了一个全局变量 `_cached_group_instances`，该变量可能用于存储已经创建过的 `CyclicGroup` 实例。

然后，现如何说没有创建对应的循环群，这个时候 需要调用`CyclicGroup`的初始化，下面看这个函数。

```python
 def __init__(self, N: int):
        r"""
        Build an instance of the cyclic group :math:`C_N` which contains :math:`N` discrete planar rotations.
        
        The group elements are :math:`\{e, r, r^2, r^3, \dots, r^{N-1}\}`, with group law
        :math:`r^a \cdot r^b = r^{\ a + b \!\! \mod \!\! N \ }`.
        The cyclic group :math:`C_N` is isomorphic to the integers *modulo* ``N``.
        For this reason, elements are stored as the integers between :math:`0` and :math:`N-1`, where the :math:`k`-th
        element can also be interpreted as the discrete rotation by :math:`k\frac{2\pi}{N}`.
        
        Args:
            N (int): order of the group
            
        """
        
        assert (isinstance(N, int) and N > 0)
        
        super(CyclicGroup, self).__init__("C%d" % N, False, True)
        
        self.elements = list(range(N))

        self.elements_names = ['e'] + ['r%d' % i for i in range(1, N)]

        self.identity = 0
        
        self._build_representations()
```

这个函数就是构建包含$N$离散平面旋转的循环群$C_{N}$的实例。

`def __init__(self, N: int):`：这是 Python 类的构造函数（initializer），用于创建 `CyclicGroup` 类的实例。它接受一个整数 `N` 作为参数，代表循环群的阶或元素的数量。

`assert (isinstance(N, int) and N > 0)`：这是一个断言语句，用于确保输入的 `N` 是正整数。如果 `N` 不是整数或者小于等于零，将会触发 AssertionError。这里的话是因为当小于 0 的时候，我们创建的是离散群，这个时候应该

`super(CyclicGroup, self).__init__("C%d" % N, False, True)`：这行代码调用了 `super()` 函数来调用父类的构造函数。它将创建一个新的 `CyclicGroup` 类的实例，并将群的名称设置为字符串形式的 `C` 后跟阶数 `N`。

`self.elements = list(range(N))`：创建了一个存储群元素的列表，列表中的元素是从 `0` 到 `N-1` 的整数，代表循环群中的元素。**注意，这个参数很重要，就是因为有了这个参数，我们才能说使用先缓缓创建对应的循环群**。现在我们`N=8`，这个时候 elements 是`[0,1,2,3,4,5,6,7]`

`self.elements_names = ['e'] + ['r%d' % i for i in range(1, N)]`：创建了一个包含群元素名称的列表。群元素名字中 `e` 代表群的单位元素，其他的元素用 `r1`, `r2`, ..., `rN-1` 表示。现在`N=8`，`elements_name`就是`['e', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7']`。

`self.identity = 0`：将群的单位元素（标识为 `e`）的索引设为 `0`。

`self._build_representations()`：调用了一个名为 `_build_representations()` 的方法。下面看看这个方法：

```python
 def _build_representations(self):
    r"""
    Build the irreps and the regular representation for this group

    """

    N = self.order()

    # Build all the Irreducible Representations
    for k in range(0, int(N // 2) + 1):
        self.irrep(k)

    # Build all Representations

    # add all the irreps to the set of representations already built for this group
    self.representations.update(**self.irreps)

    # build the regular representation
    self.representations['regular'] = self.regular_representation
    self.representations['regular'].supported_nonlinearities.add('vectorfield')
```

先看对应的 第一句，调用的是 order 函数，对应的函数如下：

```python
 def order(self) -> int:
    r"""
    Returns the number of elements in this group if it is a finite group, otherwise -1 is returned

    Returns:
        the size of the group or ``-1`` if it is a continuous group

    """
    if self.elements is not None:
        return len(self.elements)
    else:
        return -1
```

现在咱们元素不为 0，这个时候返回的就是 elements 数组的长度，即返回 8。然后再看下面的语句：

```python
# Build all the Irreducible Representations
for k in range(0, int(N // 2) + 1):
    self.irrep(k)
```

`for k in range(0, int(N // 2) + 1):`：这是一个循环结构，用于迭代地构建循环群的不可约表示。`range(0, int(N // 2) + 1)` 用来生成从 `0` 到 `N // 2` 的整数序列，包括 `N // 2`。在每次迭代中，调用 `self.irrep(k)` 方法，这个方法可能用来生成和存储循环群的不可约表示。

注意，我么要时刻记住我们是在一个循环中进来了这里，因此，这里其实会调用四次。

**但是，在后续的代码调试中，其实这部分虽然是进去了，但是里面的函数都没有运行，这是因为 lamda 表达式的特性：lambda 函数将在之后被调用或使用时执行。只有在你实际调用 `irrep` 变量作为函数，并传递参数 `element` 和可能的其他参数时，lambda 函数内部的代码才会执行。可以看下图：**

![image-20231203093702515](https://img-1312072469.cos.ap-nanjing.myqcloud.com/image-20231203093702515.png)

其中的等到`build_representations,cyclicgroup.py:221`这一行的时候才能进行才会开始调用，相当于函数中的这一句：

```python
self.representations['regular'] = self.regular_representation
```

这里面会使用到 irrep 变量，这个时候才会执行对应函数，我们先说明这个函数的执行过程，出现的变量需要集合后续步骤才能解释明白。

然后，关于群的 不可约表示可以理解成：群的一个表示，如果它的所有矩阵可以借助于某一个相似变换变
成相同形式的对角方块化矩阵，则此表示是可约的，否则是不可约的。

ok，下面我们先看`irrep`这部分的代码。

```python
  def irrep(self, k: int) -> IrreducibleRepresentation:
r"""
Build the irrep of frequency ``k`` of the current cyclic group.
The frequency has to be a non-negative integer in :math:`\{0, \dots, \left \lfloor N/2 \right \rfloor \}`,
where :math:`N` is the order of the group.

Args:
    k (int): the frequency of the representation

Returns:
    the corresponding irrep

"""
assert 0 <= k <= self.order()//2

name = f"irrep_{k}"

if name not in self.irreps:

    n = self.order()

    base_angle = 2.0 * np.pi / n

    if k == 0:
        # Trivial representation

        irrep = lambda element, identity=np.eye(1): identity
        character = lambda e: 1
        supported_nonlinearities = ['pointwise', 'gate', 'norm', 'gated', 'concatenated']
        self.irreps[name] = IrreducibleRepresentation(self, name, irrep, 1, 1,
                                                      supported_nonlinearities=supported_nonlinearities,
                                                      # character=character,
                                                      # trivial=True,
                                                      frequency=k)
    elif n % 2 == 0 and k == int(n/2):
        # 1 dimensional Irreducible representation (only for even order groups)
        irrep = lambda element, k=k, base_angle=base_angle: np.array([[np.cos(k * element * base_angle)]])
        supported_nonlinearities = ['norm', 'gated', 'concatenated']
        self.irreps[name] = IrreducibleRepresentation(self, name, irrep, 1, 1,
                                                      supported_nonlinearities=supported_nonlinearities,
                                                      frequency=k)
    else:
        # 2 dimensional Irreducible Representations

        # build the rotation matrix with rotation frequency 'frequency'
        irrep = lambda element, k=k, base_angle=base_angle: utils.psi(element * base_angle, k=k)

        supported_nonlinearities = ['norm', 'gated']
        self.irreps[name] = IrreducibleRepresentation(self, name, irrep, 2, 2,
                                                      supported_nonlinearities=supported_nonlinearities,
                                                      frequency=k)
return self.irreps[name]
```

这个`irrrp`对应的代码，通过代码的注释，可以知道，是建立当前循环群频率为 ``k`` 的次循环。这个时候我们跳进来，看对应 的内容。

`assert 0 <= k <= self.order()//2`：首先的话还是老规矩，这个的话断言判断，可以分成两部分进行查看：

1. `0 <= k`：确保频率 `k` 是非负整数，因为频率通常是一个非负的整数。在这里，频率表示不可约表示的特定特征，因此必须为非负整数。
2. `k <= self.order()//2`：保证频率 `k` 不超过循环群的阶数 `N` 的一半。在数学上，对于循环群的不可约表示，频率 `k` 的范围通常被限制在 `0` 到 `N/2` 之间，因此这个断言确保了频率 `k` 不会超出有效范围。

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/20231203223205.png)

当然，**第二个正确性有待考究！！！**

`name = f"irrep_{k}"`：构建表示的名称，用于存储在 `self.irreps` 字典中。

```python
if name not in self.irreps:
    n = self.order()
    base_angle = 2.0 * np.pi / n
```

还是一样，首先读取对应 群元素阶数，这个可以看上面的`order`的 介绍，得到`n=8`。

然后，我们创建对应的`base_angle`,这里的话 就是$\frac{2 \pi}{n}$。相当于我们现在的基本角度是 360/群 元素阶数，因为循环群中的元素是围绕一个圆周循环的，所以 `2.0 * np.pi / n` 计算出了循环群中每个元素之间的角度间隔。通过将整个圆周（`2.0 * np.pi`）分成循环群的阶数 `n` 份，可以得到每个群元素之间的平均角度间隔，这个角度间隔在表示不同群元素的线性变换中很有用。

在构建循环群的不可约表示时，这个 `base_angle` 变量被用来计算表示矩阵中角度的变换。具体地，在不同频率的不可约表示中，元素与 `base_angle` 的乘积用来确定对应元素的矩阵表示。这种方式有效地利用了循环群元素之间的角度关系来构建不同频率的表示。

然后，接着看面对应的代码：

```python
 if k == 0:
    # Trivial representation
    irrep = lambda element, identity=np.eye(1): identity
    character = lambda e: 1
    supported_nonlinearities = ['pointwise', 'gate', 'norm', 'gated', 'concatenated']
    self.irreps[name] = IrreducibleRepresentation(self, name, irrep, 1, 1,
                                                  supported_nonlinearities=supported_nonlinearities,
                                                  # character=character,
                                                  # trivial=True,
                                                  frequency=k)
```

当 `k` 为 0 时，构建了一个平凡表示（Trivial representation），对应于单位矩阵。

> 平凡表示（Trivial representation）是群论中的一个概念，指的是一个群的每个元素都被映射成一个恒等矩阵或单位矩阵。对于每个群元素，这个表示都将其映射为相同的单位矩阵。

如果循环群的阶数 `n` 为偶数且 `k` 等于 `n/2`，构建一个一维不可约表示。

```Java
elif n % 2 == 0 and k == int(n/2):
# 1 dimensional Irreducible representation (only for even order groups)
irrep = lambda element, k=k, base_angle=base_angle: np.array([[np.cos(k * element * base_angle)]])
supported_nonlinearities = ['norm', 'gated', 'concatenated']
self.irreps[name] = IrreducibleRepresentation(self, name, irrep, 1, 1,
                                              supported_nonlinearities=supported_nonlinearities,
                                              frequency=k)
```

TDOO：解释对应的参数 

其他情况（k=1,2,3）都会来到下面：

```python
else:
    # 2 dimensional Irreducible Representations

    # build the rotation matrix with rotation frequency 'frequency'
    irrep = lambda element, k=k, base_angle=base_angle: utils.psi(element * base_angle, k=k)

    supported_nonlinearities = ['norm', 'gated']
    self.irreps[name] = IrreducibleRepresentation(self, name, irrep, 2, 2,
                                                  supported_nonlinearities=supported_nonlinearities,
                                                  frequency=k)
```

- `lambda element, k=k, base_angle=base_angle:`：这定义了一个匿名函数，接受两个参数 `element`、`k` 和一个默认参数 `base_angle`。这个函数可以根据传入的 `element` 参数以及已定义的 `k` 和 `base_angle` 参数来计算结果。
- `utils.psi(element * base_angle, k=k)`：这是函数的返回表达式。它调用了一个名为 `utils.psi` 的函数（假设 `utils` 是一个模块或对象的名称）。此函数可能用于计算给定元素乘以基础角度（`element * base_angle`）所得的结果，然后以及给定的频率 `k` 为参数。这个函数的具体操作和实现由 `utils.psi` 定义。这个函数的目的是计算表示矩阵的元素。

这里需要简单看一眼 psi 这个函数：

```python
def psi(theta: float, k: int = 1, gamma: float = 0.):
    r"""
    Rotation matrix corresponding to the angle :math:`k \theta + \gamma`.
    """
    x = k * theta + gamma
    c, s = np.cos(x), np.sin(x)
    return np.array(([
        [c, -s],
        [s,  c],
    ]))
```

现在举一个例子，假设我们现在$k = 1, elements= [0,1,2,3,4,5,6,7]$，这个时候，对应计算结果应该出来 8 个。手写出来对应的 例子，如下：

![微信图片_20231203094929](https://img-1312072469.cos.ap-nanjing.myqcloud.com/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20231203094929.jpg)

**然后，在后面使用时对里面的值有一个操作，这里的话还有一个疑问，后面那句话不是已经使用了嘛，为什么不是这个时候进行初始化？** 先看后面程序，等回头在解决这个问题。

然后，来到最后一种情况，相当于现在是 n 是偶数并 k=n/2 是才会进入。

```python
elif n % 2 == 0 and k == int(n/2):
    # 1 dimensional Irreducible representation (only for even order groups)
    irrep = lambda element, k=k, base_angle=base_angle: np.array([[np.cos(k * element * base_angle)]])
    supported_nonlinearities = ['norm', 'gated', 'concatenated']
    self.irreps[name] = IrreducibleRepresentation(self, name, irrep, 1, 1,
                                                  supported_nonlinearities=supported_nonlinearities,
                                                  frequency=k)
```

跟上面的进行对比，这个区别就是里面创建的矩阵不一样了，成了一个$1 \times 1$的矩阵。

上面这个函数疑问重重，为什么一个频率有 7 个表示，然后他们后面会进行什么操作，这些都要看下面的代码，然后才能进行解答。

ok，现在看下面的代码，回答上面的问题。

```python
# Build all Representations
# add all the irreps to the set of representations already built for this group
self.representations.update(**self.irreps)
# build the regular representation
self.representations['regular'] = self.regular_representation
self.representations['regular'].supported_nonlinearities.add('vectorfield')
```

如果说现在已经有了不可约表示，直接更新。

如果说不存在，这个是将会将群与`rugular`的键与`self.regular_representation`关联起来，存储在`slef.reular_representation`中。

下面的话看这个里面的代码，是**重头戏**：

```python
def regular_representation(self) -> e2cnn.group.Representation:
    r"""
    Builds the regular representation of the group if the group has a *finite* number of elements;
    returns ``None`` otherwise.

    The regular representation of a finite group :math:`G` acts on a vector space :math:`\R^{|G|}` by permuting its
    axes.
    Specifically, associating each axis :math:`e_g` of :math:`\R^{|G|}` to an element :math:`g \in G`, the
    representation of an element :math:`\tilde{g}\in G` is a permutation matrix which maps :math:`e_g` to
    :math:`e_{\tilde{g}g}`.
    For instance, the regular representation of the group :math:`C_4` with elements
    :math:`\{r^k | k=0,\dots,3 \}` is instantiated by:

    +-----------------------------------+------------------------------------------------------------------------------------------------------------+------------------------------------------------------------------------------------------------------------+------------------------------------------------------------------------------------------------------------+------------------------------------------------------------------------------------------------------------+
    |    :math:`g`                      |          :math:`e`                                                                                         |          :math:`r`                                                                                         |        :math:`r^2`                                                                                         |        :math:`r^3`                                                                                         |
    +===================================+============================================================================================================+============================================================================================================+============================================================================================================+============================================================================================================+
    |  :math:`\rho_\text{reg}^{C_4}(g)` | :math:`\begin{bmatrix} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\  0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ \end{bmatrix}` | :math:`\begin{bmatrix} 0 & 0 & 0 & 1 \\ 1 & 0 & 0 & 0 \\  0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ \end{bmatrix}` | :math:`\begin{bmatrix} 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\  1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ \end{bmatrix}` | :math:`\begin{bmatrix} 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\  0 & 0 & 0 & 1 \\ 1 & 0 & 0 & 0 \\ \end{bmatrix}` |
    +-----------------------------------+------------------------------------------------------------------------------------------------------------+------------------------------------------------------------------------------------------------------------+------------------------------------------------------------------------------------------------------------+------------------------------------------------------------------------------------------------------------+

    A vector :math:`v=\sum_g v_g e_g` in :math:`\R^{|G|}` can be interpreted as a scalar function
    :math:`v:G \to \R,\, g \mapsto v_g` on :math:`G`.

    Returns:
        the regular representation of the group

    """
    if self.order() < 0:
        raise ValueError(f"Regular representation is supported only for finite groups but "
                         f"the group {self.name} has an infinite number of elements")
    else:
        if "regular" not in self.representations:
            irreps, change_of_basis, change_of_basis_inv = e2cnn.group.representation.build_regular_representation(self)
            supported_nonlinearities = ['pointwise', 'norm', 'gated', 'concatenated']
            self.representations["regular"] = e2cnn.group.Representation(self,
                                                                         "regular",
                                                                         [r.name for r in irreps],
                                                                         change_of_basis,
                                                                         supported_nonlinearities,
                                                                         change_of_basis_inv=change_of_basis_inv,
                                                                         )
        return self.representations["regular"]
```

如果说现在是有限循环群，这段代码将构建群的正则表示。

然后，我们看到里面`irreps`这个变量将会进行创建，执行的是这个语句：

```python
irreps, change_of_basis, change_of_basis_inv = e2cnn.group.representation.build_regular_representation(self)
```

那么下面，需要看`build_regular_representation`这个函数：

```python
def build_regular_representation(group: e2cnn.group.Group) -> Tuple[List[e2cnn.group.IrreducibleRepresentation], np.ndarray, np.ndarray]:
    r"""
    
    Build the regular representation of the input ``group``.
    As the regular representation has size equal to the number of elements in the group, only
    finite groups are accepted.
    
    Args:
        group (Group): the group whose representations has to be built

    Returns:
        a tuple containing the list of irreps, the change of basis and the inverse change of basis of
        the regular representation

    """
    assert group.order() > 0
    assert group.elements is not None and len(group.elements) > 0
    
    size = group.order()

    index = {e: i for i, e in enumerate(group.elements)}
    
    representation = {}
    character = {}
    
    for e in group.elements:
        # print(index[e], e)
        r = np.zeros((size, size), dtype=float)
        for g in group.elements:
            
            eg = group.combine(e, g)

            i = index[g]
            j = index[eg]
            
            r[j, i] = 1.0
        
        representation[e] = r
        # the character maps an element to the trace of its representation
        character[e] = np.trace(r)

    # compute the multiplicities of the irreps from the dot product between
    # their characters and the character of the representation
    irreps = []
    multiplicities = []
    for irrep_name, irrep in group.irreps.items():
        # for each irrep
        multiplicity = 0.0
    
        # compute the inner product with the representation's character
        for element, char in character.items():
            multiplicity += char * irrep.character(group.inverse(element))
    
        multiplicity /= len(character) * irrep.sum_of_squares_constituents
    
        # the result has to be an integer
        assert math.isclose(multiplicity, round(multiplicity), abs_tol=1e-9), \
            "Multiplicity of irrep %s is not an integer: %f" % (irrep_name, multiplicity)
        # print(irrep_name, multiplicity)

        multiplicity = int(round(multiplicity))
        irreps += [irrep]*multiplicity
        multiplicities += [(irrep, multiplicity)]
    
    P = directsum(irreps, name="irreps")
    
    v = np.zeros((size, 1), dtype=float)
    
    p = 0
    for irr, m in multiplicities:
        assert irr.size >= m
        s = irr.size
        v[p:p+m*s, 0] = np.eye(m, s).reshape(-1) * np.sqrt(s)
        p += m*s
        
    change_of_basis = np.zeros((size, size))
    
    np.set_printoptions(precision=4, threshold=10*size**2, suppress=False, linewidth=25*size + 5)
    
    for e in group.elements:
        ev = P(e) @ v
        change_of_basis[index[e], :] = ev.T
    
    change_of_basis /= np.sqrt(size)
    
    # the computed change of basis is an orthonormal matrix
    
    # change_of_basis_inv = sp.linalg.inv(change_of_basis)
    change_of_basis_inv = change_of_basis.T
    
    return irreps, change_of_basis, change_of_basis_inv
```

这个函数其实是核心中的核心，这个就是将每个频率进行相加，然后得到一个值。下面将这个进行逐行解析。

```python
assert group.order() > 0
assert group.elements is not None and len(group.elements) > 0

size = group.order()

index = {e: i for i, e in enumerate(group.elements)}
```

这个还是老规矩，首先先判断，然后设置群的结束，以及对应的索引号。然后创建 index 的字典。

- `group.elements`：这个部分可能是一个群（group）对象或类中的属性，其中包含了群的元素。
- `enumerate(group.elements)`：`enumerate()` 函数用于迭代一个可迭代对象（比如列表、元组等），并返回索引值和对应的元素。这里对群中的元素进行了枚举，`i` 是索引，`e` 是群中的元素。
- `{e: i for i, e in enumerate(group.elements)}`：这是一个字典推导式。它遍历了 `enumerate(group.elements)` 返回的枚举对象，对每个元素创建了一个键值对。字典的键是群中的元素 `e`，而值是它们在群中的索引 `i`。

在本文的情况下 index 的值就是`{0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7}`

然后看下面的代码：

```python
for e in group.elements:
    print(index[e], e)
    r = np.zeros((size, size), dtype=float)
    for g in group.elements:

        eg = group.combine(e, g)

        i = index[g]
        j = index[eg]

        r[j, i] = 1.0

    representation[e] = r
    # the character maps an element to the trace of its representation
    character[e] = np.trace(r)
```

这段代码首先先遍历里面的元素，创建一个大小为 (size,size) 大小的二维数组`r`。

在每个元素 `e` 的循环内，这段代码嵌套了一个循环，遍历群 `group` 中的每个元素 `g`。将对应的群`e`和`g`结合起来，创建一个新的群元素`eg`。

`i = index[g]` 和 `j = index[eg]`：这两行代码分别获取了群元素 `g` 和 `eg` 在 `index` 字典中的索引值，即它们在表示矩阵 `r` 中对应的位置。

`r[j, i] = 1.0`：这行代码将表示矩阵 `r` 中的位置 `(j, i)`（根据群元素 `eg` 和 `g` 的索引值计算得到）的元素设置为 1.0。这是表示矩阵中的一个元素，用于表示群操作后的结果。

`representation[e] = r`：将表示矩阵 `r` 存储到表示字典 `representation` 中，其中键是群元素 `e`。

`character[e] = np.trace(r)`：这行代码计算了表示矩阵 `r` 的迹（trace），并将其存储在字符（character）字典 `character` 中，键是群元素 `e`。在群论中，表示的迹（trace）通常被称为字符（character），它是表示理论中的一个重要性质之一。

还是从一个例子出发，这里的话还使用对应的`e=0`，`g= 0,1,2,3,4,5,6,7`这种情况。

这个时候，`eg=0,1,2,3,4,5,6,7`，在遍历完成之后，对应的`r`矩阵应该就是$8  \times 8$的单位矩阵，然后此时 representation 应该就是 (0) 位置是 1，其他位置都是 0。character[0]应该是 矩阵的迹，是 8。

![image-20231203103758920](https://img-1312072469.cos.ap-nanjing.myqcloud.com/image-20231203103758920.png)

![image-20231203103830708](https://img-1312072469.cos.ap-nanjing.myqcloud.com/image-20231203103830708.png)

![image-20231203103854946](https://img-1312072469.cos.ap-nanjing.myqcloud.com/image-20231203103854946.png)

以此类推，创建完对应的数组。

然后接着看下面的代码：

```python
irreps = []
multiplicities = []
for irrep_name, irrep in group.irreps.items():
    # for each irrep
    multiplicity = 0.0

    # compute the inner product with the representation's character
    for element, char in character.items():
        multiplicity += char * irrep.character(group.inverse(element))

    multiplicity /= len(character) * irrep.sum_of_squares_constituents

    # the result has to be an integer
    assert math.isclose(multiplicity, round(multiplicity), abs_tol=1e-9), \
        "Multiplicity of irrep %s is not an integer: %f" % (irrep_name, multiplicity)
    # print(irrep_name, multiplicity)

    multiplicity = int(round(multiplicity))
    irreps += [irrep]*multiplicity
    multiplicities += [(irrep, multiplicity)]
```

计算群的不可约表示（irreducible representations）的重复数量（multiplicities），并将结果存储在 `irreps` 和 `multiplicities` 中。下面逐行分析对应的代码。

首先的话创建对应的变量进行存储。

`for irrep_name, irrep in group.irreps.items():`：这段代码遍历了群 `group` 的不可约表示字典（`group.irreps`）中的每一个不可约表示，其中 `irrep_name` 是表示的名称，`irrep` 是表示对象。

 group.irreps.items() 就是我们 上面创建好的群元素。

`for element, char in character.items():`：这段代码遍历了字符（character）字典 `character` 中的每个群元素和对应的字符值（character value）。

`multiplicity += char * irrep.character(group.inverse(element))`：在每个不可约表示 `irrep` 的循环内，计算了该不可约表示与表示对应群元素的字符的内积（inner product）。这个内积计算用于确定表示的重复次数。

`multiplicity /= len(character) * irrep.sum_of_squares_constituents`：在内积计算之后，对结果进行了归一化，除以表示的元素数乘以不可约表示的总元素平方和。

`assert math.isclose(multiplicity, round(multiplicity), abs_tol=1e-9)`：这行代码检查 `multiplicity` 是否接近于整数，如果不是，则会触发断言错误。

`multiplicity = int(round(multiplicity))`：将 `multiplicity` 舍入为最接近的整数值，确保它是整数。

`irreps += [irrep]*multiplicity` 和 `multiplicities += [(irrep, multiplicity)]`：将不可约表示 `irrep` 重复 `multiplicity` 次添加到 `irreps` 列表中，并将表示和其重复次数的元组添加到 `multiplicities` 列表中。

然后看下面的代码：

```python
P = directsum(irreps, name="irreps")
v = np.zeros((size, 1), dtype=float)
p = 0
for irr, m in multiplicities:
    assert irr.size >= m
    s = irr.size
    v[p:p+m*s, 0] = np.eye(m, s).reshape(-1) * np.sqrt(s)
    p += m*s
```

`directsum(irreps, name="irreps")`：这里使用了一个名为 `directsum` 的函数，它的目的是将不可约表示列表 `irreps` 中的不可约表示按照其给定的重数信息相加，构建一个直和表示 `P`。

看`directsum`这个函数：

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

这个函数作用是计算群的代表列表的直积。两个数的直积可以表示成：
$$
\rho_1(g) \oplus \rho_2(g) = \begin{bmatrix} \rho_1(g) & 0 \\ 0 & \rho_2(g) \end{bmatrix}
$$
这可以推广为多种表示形式：
$$
\bigoplus_{i=1}^I \rho_i(g) = (\rho_1(g) \oplus (\rho_2(g) \oplus (\rho_3(g) \oplus \dots = \begin{bmatrix}
            \rho_1(g) &         0 &  \dots &      0 \\
                    0 & \rho_2(g) &  \dots & \vdots \\
               \vdots &    \vdots & \ddots &      0 \\
                    0 &     \dots &      0 & \rho_I(g) \\
        \end{bmatrix}
$$
里面拿到很多变量进行直积操作，相当于矩阵的拼接以及填充，里面没有什么好讲的。

然后，我们现在讲不可约群 进行直接操作，命名成`irreps`，接下来将创建一个大小为 `(size, 1)` 的全零列向量 `v`，该向量将用作基的变换矩阵的一部分。

然后接下就到循环部分：

```python
p = 0
for irr, m in multiplicities:
    assert irr.size >= m
    s = irr.size
    v[p:p+m*s, 0] = np.eye(m, s).reshape(-1) * np.sqrt(s)
    p += m*s
```

- 对于每个不可约表示`irr`和其对应的重数`m`:
  - `s = irr.size`：获取不可约表示的维度。
  - `np.eye(m, s).reshape(-1) * np.sqrt(s)`：生成一个大小为 `(m, s)` 的单位矩阵，并对其进行重塑（reshape）以变成一个列向量，并乘以 $\sqrt{s}$。
  - `v[p:p+m*s, 0] = ...`：将生成的列向量放置在 `v` 的适当位置，根据当前 `p` 的值和表示的维度 `s`。
  - `p += m*s`：更新下一个表示的起始位置。

然后的话看接下来的代码：

```python
change_of_basis = np.zeros((size, size))
np.set_printoptions(precision=4, threshold=10*size**2, suppress=False, linewidth=25*size + 5)
for e in group.elements:
    ev = P(e) @ v
    change_of_basis[index[e], :] = ev.T
change_of_basis /= np.sqrt(size)
```

这一部分代码是计算群的正则表示的基之间的变换矩阵。它使用之前构建的直和表示 `P` 和基的变换矩阵 `v`，来计算群的元素之间的表示矩阵，最终得到基的变换矩阵 `change_of_basis`。

1. **`change_of_basis = np.zeros((size, size))`**：

- 创建一个大小为 `(size, size)` 的全零矩阵 `change_of_basis`，该矩阵将存储基之间的变换矩阵。

2. **`np.set_printoptions(...)`**：
   - 设置打印选项，以便后续打印变换矩阵时能够更好地显示数值。
3. **`for e in group.elements:`**：
   - 对于群中的每个元素 `e`：
4. **`ev = P(e) @ v`**：
   - 计算群元素 `e` 对应的表示矩阵，通过用直和表示 `P` 对 `e` 作用于基的变换矩阵 `v`
5. **`change_of_basis[index[e], :] = ev.T`**：
   - 将得到的表示矩阵 `ev` 的转置（为了匹配矩阵维度）存储在 `change_of_basis` 中，位置由 `index[e]` 确定。
6. **`change_of_basis /= np.sqrt(size)`**：
   - 对整个 `change_of_basis` 矩阵进行归一化处理，以确保该变换矩阵是正交的。

7. `change_of_basis_inv = change_of_basis.T`
   - 将矩阵进行转置。

然后返回对应的 变量，一致返回到最开始。

## 总结

上面虽然介绍了 e2cnn 等变群卷积创建群 的过程，但是 实话实说，整体流程仍然是云里雾里，因此我们需要对里面 的流程做一个重新的梳理。

1. 指定群的阶数，调用 Rot2dOnR2 进行初始化。
2. 判断传入 N 的大小，如果说现在是大于 0 的话创建 循环群，小于 0 的话创建的 是离散群。这篇博客仅仅讨论 循环群的创建。
3. 确定为循环群，调用循环群`cyclic_group`的初始化。将回调用`_generator`里面的 CyclicGroup 函数，初始化对应的循环群。
4. 初始化群元素的给个数，名称，表示，然后调用`_build_representations`构建群。
5. 首先构建群的不可约表示，因为现在使用的是 循环群（对称群），这个时候不可约表示肯定不会超过其中的一半。
6. 根据传入的群的阶数不同，每个群中的元素需要分别使用不同的初始化方式进行构建，这个详细请看上面的介绍。
   1.  注意，这里面有坑点，里面使用了 lamda 表达式，会在 使用的时候才会进行初始化。
7. 下面将会构建对应的 regular 层，这里的话其实就是根据我们上面计算出来的 irreps（不可约表示），计算对应的 irreps, change_of_basis, change_of_basis_inv。这个就像与 构建 了群的 常规表示。

以上 就是循环群的创建，但是在第 7 点，里面的细节没有讲清楚，这里的话其实应该结合论文来看。

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/20231203202637.png)

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/20231203203118.png)

讲道理，上面的源码当中，表示了循环群的常规表示法，也构建了向量$v$，构建了对应的表示，在构建对应的表示的时候，使用到了每个群元素中的 表示，对应上面公式，就能解释的通

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/20231203203749.png)

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/20231203204110.png)

最关键就是这里的转换，就是有了着了的转换，才能使用上面对应的内容进行表示。

