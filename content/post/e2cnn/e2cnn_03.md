---
title: "e2cnn 内容理解-R2Conv 详解"
description: 
date: 2023-12-04T18:47:52+08:00
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

下面开始讲解对应R2Conv对应的 模块，这里的话我们还是从ReResNet中进行运行，然后拿到对应的数据，在拿到对应的数据之后，将里面的值进行传递，然后供面进行使用。

在对应的前面三节中，我们已经创建了对应循环群，输入类型，输出类型，这个里面，是将里面内容进行利用。

还是从ReResNet中开始看起，在我们进行初始化的时候，会运行下面语句：

```python
self._make_stem_layer(in_channels, stem_channels)
```

然后看这个函数里面的内容

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

然后继续看ennTrivialConv这个函数

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

这里的话在前两讲中以及说明了对应的 输入类型和输出类型，这里的话直接将对应的内容进行截图，不再进行详细阐述，如果说不了解的话去看前面两节。

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/202312042048059.png)

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/202312042048204.png)

ok，知道了这些内容 ，下面来看本文的核心函数 ：R2Conv函数。

```python
class R2Conv(EquivariantModule):
    
    def __init__(self,
                 in_type: FieldType,
                 out_type: FieldType,
                 kernel_size: int,
                 padding: int = 0,
                 stride: int = 1,
                 dilation: int = 1,
                 padding_mode: str = 'zeros',
                 groups: int = 1,
                 bias: bool = True,
                 basisexpansion: str = 'blocks',
                 sigma: Union[List[float], float] = None,
                 frequencies_cutoff: Union[float, Callable[[float], int]] = None,
                 rings: List[float] = None,
                 maximum_offset: int = None,
                 recompute: bool = False,
                 basis_filter: Callable[[dict], bool] = None,
                 initialize: bool = True,
                 ):
        r"""
        
        
        G-steerable planar convolution mapping between the input and output :class:`~e2cnn.nn.FieldType` s specified by
        the parameters ``in_type`` and ``out_type``.
        This operation is equivariant under the action of :math:`\R^2\rtimes G` where :math:`G` is the
        :attr:`e2cnn.nn.FieldType.fibergroup` of ``in_type`` and ``out_type``.
        
        Specifically, let :math:`\rho_\text{in}: G \to \GL{\R^{c_\text{in}}}` and
        :math:`\rho_\text{out}: G \to \GL{\R^{c_\text{out}}}` be the representations specified by the input and output
        field types.
        Then :class:`~e2cnn.nn.R2Conv` guarantees an equivariant mapping
        
        .. math::
            \kappa \star [\mathcal{T}^\text{in}_{g,u} . f] = \mathcal{T}^\text{out}_{g,u} . [\kappa \star f] \qquad\qquad \forall g \in G, u \in \R^2
            
        where the transformation of the input and output fields are given by
 
        .. math::
            [\mathcal{T}^\text{in}_{g,u} . f](x) &= \rho_\text{in}(g)f(g^{-1} (x - u)) \\
            [\mathcal{T}^\text{out}_{g,u} . f](x) &= \rho_\text{out}(g)f(g^{-1} (x - u)) \\

        The equivariance of G-steerable convolutions is guaranteed by restricting the space of convolution kernels to an
        equivariant subspace.
        As proven in `3D Steerable CNNs <https://arxiv.org/abs/1807.02547>`_, this parametrizes the *most general
        equivariant convolutional map* between the input and output fields.
        For feature fields on :math:`\R^2` (e.g. images), the complete G-steerable kernel spaces for :math:`G \leq \O2`
        is derived in `General E(2)-Equivariant Steerable CNNs <https://arxiv.org/abs/1911.08251>`_.

        During training, in each forward pass the module expands the basis of G-steerable kernels with learned weights
        before calling :func:`torch.nn.functional.conv2d`.
        When :meth:`~torch.nn.Module.eval()` is called, the filter is built with the current trained weights and stored
        for future reuse such that no overhead of expanding the kernel remains.
        
        .. warning ::
            
            When :meth:`~torch.nn.Module.train()` is called, the attributes :attr:`~e2cnn.nn.R2Conv.filter` and
            :attr:`~e2cnn.nn.R2Conv.expanded_bias` are discarded to avoid situations of mismatch with the
            learnable expansion coefficients.
            See also :meth:`e2cnn.nn.R2Conv.train`.
            
            This behaviour can cause problems when storing the :meth:`~torch.nn.Module.state_dict` of a model while in
            a mode and lately loading it in a model with a different mode, as the attributes of the class change.
            To avoid this issue, we recommend converting the model to eval mode before storing or loading the state
            dictionary.
 
 
        The learnable expansion coefficients of the this module can be initialized with the methods in
        :mod:`e2cnn.nn.init`.
        By default, the weights are initialized in the constructors using :func:`~e2cnn.nn.init.generalized_he_init`.
        
        .. warning ::
            
            This initialization procedure can be extremely slow for wide layers.
            In case initializing the model is not required (e.g. before loading the state dict of a pre-trained model)
            or another initialization method is preferred (e.g. :func:`~e2cnn.nn.init.deltaorthonormal_init`), the
            parameter ``initialize`` can be set to ``False`` to avoid unnecessary overhead.
        
        
        The parameters ``basisexpansion``, ``sigma``, ``frequencies_cutoff``, ``rings`` and ``maximum_offset`` are
        optional parameters used to control how the basis for the filters is built, how it is sampled on the filter
        grid and how it is expanded to build the filter. We suggest to keep these default values.
        
        
        Args:
            in_type (FieldType): the type of the input field, specifying its transformation law
            out_type (FieldType): the type of the output field, specifying its transformation law
            kernel_size (int): the size of the (square) filter
            padding (int, optional): implicit zero paddings on both sides of the input. Default: ``0``
            padding_mode(str, optional): ``zeros``, ``reflect``, ``replicate`` or ``circular``. Default: ``zeros``
            stride (int, optional): the stride of the kernel. Default: ``1``
            dilation (int, optional): the spacing between kernel elements. Default: ``1``
            groups (int, optional): number of blocked connections from input channels to output channels.
                                    It allows depthwise convolution. When used, the input and output types need to be
                                    divisible in ``groups`` groups, all equal to each other.
                                    Default: ``1``.
            bias (bool, optional): Whether to add a bias to the output (only to fields which contain a
                    trivial irrep) or not. Default ``True``
            basisexpansion (str, optional): the basis expansion algorithm to use
            sigma (list or float, optional): width of each ring where the bases are sampled. If only one scalar
                    is passed, it is used for all rings.
            frequencies_cutoff (callable or float, optional): function mapping the radii of the basis elements to the
                    maximum frequency accepted. If a float values is passed, the maximum frequency is equal to the
                    radius times this factor. By default (``None``), a more complex policy is used.
            rings (list, optional): radii of the rings where to sample the bases
            maximum_offset (int, optional): number of additional (aliased) frequencies in the intertwiners for finite
                    groups. By default (``None``), all additional frequencies allowed by the frequencies cut-off
                    are used.
            recompute (bool, optional): if ``True``, recomputes a new basis for the equivariant kernels.
                    By Default (``False``), it  caches the basis built or reuse a cached one, if it is found.
            basis_filter (callable, optional): function which takes as input a descriptor of a basis element
                    (as a dictionary) and returns a boolean value: whether to preserve (``True``) or discard (``False``)
                    the basis element. By default (``None``), no filtering is applied.
            initialize (bool, optional): initialize the weights of the model. Default: ``True``
        
        Attributes:
            
            ~.weights (torch.Tensor): the learnable parameters which are used to expand the kernel
            ~.filter (torch.Tensor): the convolutional kernel obtained by expanding the parameters
                                    in :attr:`~e2cnn.nn.R2Conv.weights`
            ~.bias (torch.Tensor): the learnable parameters which are used to expand the bias, if ``bias=True``
            ~.expanded_bias (torch.Tensor): the equivariant bias which is summed to the output, obtained by expanding
                                    the parameters in :attr:`~e2cnn.nn.R2Conv.bias`
        
        """

        # 输入类型和输出类型必须是一个群
        assert in_type.gspace == out_type.gspace
        assert isinstance(in_type.gspace, GeneralOnR2)

        # 初始化对应的内容
        super(R2Conv, self).__init__()

        self.space = in_type.gspace
        self.in_type = in_type
        self.out_type = out_type
        
        self.kernel_size = kernel_size
        self.stride = stride
        self.dilation = dilation
        self.padding = padding
        self.padding_mode = padding_mode
        self.groups = groups

        # 检查是padding是否是元组
        if isinstance(padding, tuple) and len(padding) == 2:
            _padding = padding
        # 检查padding是否是int，是int则直接将对应的内容直接进行赋值
        elif isinstance(padding, int):
            _padding = (padding, padding)
        else:
            raise ValueError('padding needs to be either an integer or a tuple containing two integers but {} found'.format(padding))
        
        padding_modes = {'zeros', 'reflect', 'replicate', 'circular'}
        if padding_mode not in padding_modes:
            raise ValueError("padding_mode must be one of [{}], but got padding_mode='{}'".format(padding_modes, padding_mode))
        self._reversed_padding_repeated_twice = tuple(x for x in reversed(_padding) for _ in range(2))

        # 检查输入和输出类可以分为“groups”组，所有组都彼此相等
        # TODO: 搞懂这个变量的作用
        if groups > 1:
            # Check the input and output classes can be split in `groups` groups, all equal to each other
            # first, check that the number of fields is divisible by `groups`
            assert len(in_type) % groups == 0
            assert len(out_type) % groups == 0
            in_size = len(in_type) // groups
            out_size = len(out_type) // groups
            
            # then, check that all groups are equal to each other, i.e. have the same types in the same order
            assert all(in_type.representations[i] == in_type.representations[i % in_size] for i in range(len(in_type)))
            assert all(out_type.representations[i] == out_type.representations[i % out_size] for i in range(len(out_type)))
            
            # finally, retrieve the type associated to a single group in input.
            # this type will be used to build a smaller kernel basis and a smaller filter
            # as in PyTorch, to build a filter for grouped convolution, we build a filter which maps from one input
            # group to all output groups. Then, PyTorch's standard convolution routine interpret this filter as `groups`
            # different filters, each mapping an input group to an output group.
            in_type = in_type.index_select(list(range(in_size)))

        # 这段代码检查`bias`是否为真值。如果`bias`为镇，则执行以下步骤：
        if bias:
            # bias can be applied only to trivial irreps inside the representation
            # to apply bias to a field we learn a bias for each trivial irreps it contains
            # and, then, we transform it with the change of basis matrix to be able to apply it to the whole field
            # this is equivalent to transform the field to its irreps through the inverse change of basis,
            # sum the bias only to the trivial irrep and then map it back with the change of basis
            
            # count the number of trivial irreps
            # 计算具有平凡表示的数量
            trivials = 0
            # 遍历out_type中每个元素r
            # 对于 r 中的每个 irr（表示），检查 self.out_type.fibergroup.irreps[irr] 是否为“trivial”（平凡的）。
            # 如果是，则将 trivials 加 1
            for r in self.out_type:
                for irr in r.irreps:
                    if self.out_type.fibergroup.irreps[irr].is_trivial():
                        trivials += 1
            
            # if there is at least 1 trivial irrep
            # 如果至少有一个平凡表示
            if trivials > 0:
                
                # matrix containing the columns of the change of basis which map from the trivial irreps to the
                # field representations. This matrix allows us to map the bias defined only over the trivial irreps
                # to a bias for the whole field more efficiently
                # 创建一个大小为 (self.out_type.size, trivials) 的零张量 bias_expansion，用于存储变换矩阵，该矩阵能够将平凡表示映射到字段表示中。
                bias_expansion = torch.zeros(self.out_type.size, trivials)

                # 通过循环遍历 self.out_type 中的每个元素 r，并且对于 r 中的每个 irr：
                # 检查 self.out_type.fibergroup.irreps[irr] 是否为平凡表示。
                # 如果是平凡表示，将 r.change_of_basis[:, pi] 赋值给 bias_expansion 的相应位置，并更新索引 c。
                p, c = 0, 0
                for r in self.out_type:
                    pi = 0
                    for irr in r.irreps:
                        irr = self.out_type.fibergroup.irreps[irr]
                        if irr.is_trivial():
                            bias_expansion[p:p+r.size, c] = torch.tensor(r.change_of_basis[:, pi])
                            c += 1
                        pi += irr.size
                    p += r.size

                # 注册属性 bias_expansion 为类的缓冲区（buffer）属性，表示此属性的值不需要进行梯度计算。
                # 创建参数 self.bias，它是一个大小为 trivials 的张量，并将其设置为需要梯度计算。
                # 注册属性 expanded_bias 为类的缓冲区（buffer）属性，表示此属性的值不需要进行梯度计算，并初始化为大小为 out_type.size 的零张量。
                self.register_buffer("bias_expansion", bias_expansion)
                self.bias = Parameter(torch.zeros(trivials), requires_grad=True)
                self.register_buffer("expanded_bias", torch.zeros(out_type.size))
            else:
                self.bias = None
                self.expanded_bias = None
        else:
            self.bias = None
            self.expanded_bias = None

        # compute the parameters of the basis
        grid, basis_filter, rings, sigma, maximum_frequency = compute_basis_params(kernel_size,
                                                                                   frequencies_cutoff,
                                                                                   rings,
                                                                                   sigma,
                                                                                   dilation,
                                                                                   basis_filter)
        
        # BasisExpansion: submodule which takes care of building the filter
        self._basisexpansion = None
        
        # notice that `in_type` is used instead of `self.in_type` such that it works also when `groups > 1`
        if basisexpansion == 'blocks':
            # 这里是整个核心
            self._basisexpansion = BlocksBasisExpansion(in_type, out_type,
                                                        basis_generator=self.space.build_kernel_basis,
                                                        points=grid,
                                                        sigma=sigma,
                                                        rings=rings,
                                                        maximum_offset=maximum_offset,
                                                        maximum_frequency=maximum_frequency,
                                                        basis_filter=basis_filter,
                                                        recompute=recompute)

        else:
            raise ValueError('Basis Expansion algorithm "%s" not recognized' % basisexpansion)
        
        if self.basisexpansion.dimension() == 0:
            raise ValueError('''
                The basis for the steerable filter is empty!
                Tune the `frequencies_cutoff`, `kernel_size`, `rings`, `sigma` or `basis_filter` parameters to allow
                for a larger basis.
            ''')

        self.weights = Parameter(torch.zeros(self.basisexpansion.dimension()), requires_grad=True)
        self.register_buffer("filter", torch.zeros(out_type.size, in_type.size, kernel_size, kernel_size))
        
        if initialize:
            # by default, the weights are initialized with a generalized form of He's weight initialization
            init.generalized_he_init(self.weights.data, self.basisexpansion)
```

这个函数不算短，咱们还是老规矩，一句一句看。

对应的初始化咱们这就不看了，直接看对应代码我写的注释吧。

`if groups > 1`：这里的group代表是输入通道到输出通道的阻塞连接数，在这里允许 深度卷积，使用时，输入和输出类型需要可分为`groups`组，并且彼此相等。

然后，我们在这里默认是1，因此在这里，我们暂时不考虑对应的内容。这个 if分支暂时跳过。

`if bias:` 这个分支在代码中解释的比较清楚 ，直接看对应的代码就好。

`grid, basis_filter, rings, sigma, maximum_frequency = compute_basis_params(kernel_size,frequencies_cutoff,rings,sigma,dilation,basis_filter)`：这个函数 的作用是计算basis的变量。然后看这个函数中的细节。

```python
def compute_basis_params(kernel_size: int,
                         frequencies_cutoff: Union[float, Callable[[float], float]] = None,
                         rings: List[float] = None,
                         sigma: List[float] = None,
                         dilation: int = 1,
                         custom_basis_filter: Callable[[dict], bool] = None,
                         ):
    
    # compute the coordinates of the centers of the cells in the grid where the filter is sampled
    # 计算对滤波器进行采样的网格中单元格中心的坐标
    grid = get_grid_coords(kernel_size, dilation)

    # 计算滤波器的最大半径
    max_radius = np.sqrt((grid **2).sum(0)).max()
    # max_radius = kernel_size // 2
    
    # by default, the number of rings equals half of the filter size
    if rings is None:
        n_rings = math.ceil(kernel_size / 2)
        # if self.group.order() > 0:
        #     # compute the number of edges of the polygon inscribed in the filter (which is a square)
        #     # whose points stay inside the filter under the action of the group
        #     # the number of edges is lcm(group's order, 4)
        #     n_edges = self.group.order()
        #     while n_edges % 4 > 0:
        #         n_edges *= 2
        #     # the largest ring we can sample has radius equal to the circumradius of the polygon described above
        #     n_rings /= math.cos(math.pi/n_edges)
        
        # n_rings = s // 2 + 1

        # torch.linspace(start, end, steps) 是一个 PyTorch 函数，它生成一个包含在指定范围内、包括起始值和结束值的均匀间隔的一维张量（Tensor），此处用于生成环的半径（rings）。
        # start 是起始值，这里为0，表示张量中第一个元素的值。
        # end 是结束值，即(kernel_size - 1) // 2，这个值是由卷积核大小减去1，然后整除2得到的。这个值决定了张量中最后一个元素的值。
        # n_rings 是生成的张量中元素的数量，即生成的环数目。
        # dilation 将整个生成的张量元素乘以 dilation。这个步骤将按照 dilation 的倍数来调整生成的环的半径值。
        # rings = torch.linspace(1 - s % 2, s // 2, n_rings)
        rings = torch.linspace(0, (kernel_size - 1) // 2, n_rings) * dilation
        rings = rings.tolist()
    
    assert all([max_radius >= r >= 0 for r in rings])
    
    if sigma is None:
        sigma = [0.6] * (len(rings) - 1) + [0.4]
        for i, r in enumerate(rings):
            if r == 0.:
                sigma[i] = 0.005
                
    elif isinstance(sigma, float):
        sigma = [sigma] * len(rings)
        
    # TODO - use a string name for this setting
    if frequencies_cutoff is None:
        frequencies_cutoff = -1.
    
    if isinstance(frequencies_cutoff, float):
        if frequencies_cutoff == -3:
            frequencies_cutoff = _manual_fco3(kernel_size // 2)
        elif frequencies_cutoff == -2:
            frequencies_cutoff = _manual_fco2(kernel_size // 2)
        elif frequencies_cutoff == -1:
            frequencies_cutoff = _manual_fco1(kernel_size // 2)
        else:
            frequencies_cutoff = lambda r, fco=frequencies_cutoff: fco * r
    
    # check if the object is a callable function
    assert callable(frequencies_cutoff)
    
    maximum_frequency = int(max(frequencies_cutoff(r) for r in rings))

    fco_filter = bandlimiting_filter(frequencies_cutoff)

    if custom_basis_filter is not None:
        basis_filter = lambda d, custom_basis_filter=custom_basis_filter, fco_filter=fco_filter: (custom_basis_filter(d) and fco_filter(d))
    else:
        basis_filter = fco_filter
    
    return grid, basis_filter, rings, sigma, maximum_frequency
```

这个代码也是 一个稍微长点的代码，ok，咱们还是一行一行看。

`grid = get_grid_coords(kernel_size, dilation)`这个函数计算滤波器采样网格中单元中心的坐标，首先先看 这个函数。

```python
def get_grid_coords(kernel_size: int, dilation: int = 1):

    # 这里面就是在那个电科大的硕士论文中写的东西，根据卷积核的大小与转换函数的得到对应的标志矩阵
    actual_size = dilation * (kernel_size -1) + 1
    
    origin = actual_size / 2 - 0.5
    
    points = []
    
    for y in range(kernel_size):
        y *= dilation
        for x in range(kernel_size):
            x *= dilation
            p = (x - origin, -y + origin)
            points.append(p)
    
    points = np.array(points)
    assert points.shape == (kernel_size ** 2, 2), points.shape
    return points.T
```

这个内容其实很清楚，就是根据卷积核的大小以及转换函数生成对应的转换矩阵。具体内容可以看电科大的硕士论文中对于这个过程的描述，这里截个图。

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/202312042102612.png)

然后我们看下面的代码：`max_radius = np.sqrt((grid **2).sum(0)).max()`计算对应滤波器的最大半径。

`if rings is None:n_rings = math.ceil(kernel_size / 2)`这个的话如果rings这个变量不存在，则直接指定为卷积核大小的一半。

`rings = torch.linspace(0, (kernel_size - 1) // 2, n_rings) * dilation`:Torch.linspace(start, end, steps) 是一个 PyTorch 函数，它生成一个包含在指定范围内、包括起始值和结束值的均匀间隔的一维张量（Tensor），此处用于生成环的半径（rings）。start 是起始值，这里为0，表示张量中第一个元素的值。end 是结束值，即(kernel_size - 1) // 2，这个值是由卷积核大小减去1，然后整除2得到的。这个值决定了张量中最后一个元素的值。n_rings 是生成的张量中元素的数量，即生成的环数目。dilation 将整个生成的张量元素乘以 dilation。这个步骤将按照 dilation 的倍数来调整生成的环的半径值。

`rings = rings.tolist()`转换成对应的列表。

这里的话其实就是设置一个变量，然后接着往下面看。

```python
if sigma is None:
    sigma = [0.6] * (len(rings) - 1) + [0.4]
    for i, r in enumerate(rings):
        if r == 0.:
            sigma[i] = 0.005
```

这里的话还是生成对应的sigma变量，根据上面 生成rings，指定其中sigma角度。

ok，再往下面很长，但是在本次运行中，有很多没有走到，所以这里直接看运行时使用的内容，剩下的等有时间再去看吧。

```python
maximum_frequency = int(max(frequencies_cutoff(r) for r in rings))
fco_filter = bandlimiting_filter(frequencies_cutoff)
 basis_filter = fco_filter
```

这个的就是取得rings中的最大值，然后进行返回。

下面的函数用于根据给定的属性来决定是否保留基础元素，这个函数也不是很重要 ，由于时间有限，先不写，标记一个TODO。

ok，这个 函数阶数，然后接着向下看。

```python
self._basisexpansion = None
# notice that `in_type` is used instead of `self.in_type` such that it works also when `groups > 1`
if basisexpansion == 'blocks':
    # 这里是整个核心
    self._basisexpansion = BlocksBasisExpansion(in_type, out_type,
                                                basis_generator=self.space.build_kernel_basis,
                                                points=grid,
                                                sigma=sigma,
                                                rings=rings,
                                                maximum_offset=maximum_offset,
                                                maximum_frequency=maximum_frequency,
                                                basis_filter=basis_filter,
                                                recompute=recompute)
```

在我们生成了对应 的内容之后，下面`BlocksBasisExpansion`就是整个函数的核心，整个函数的作用就是卷积核的设置。ok，下面看这个函数。

```python
class BlocksBasisExpansion(BasisExpansion):
    
    def __init__(self,
                 in_type: FieldType,
                 out_type: FieldType,
                 basis_generator: Callable[[Representation, Representation], Basis],
                 points: np.ndarray,
                 basis_filter: Callable[[dict], bool] = None,
                 recompute: bool = False,
                 **kwargs
                 ):
        r"""
        
        With this algorithm, the expansion is done on the intertwiners of the fields' representations pairs in input and
        output.
        
        Args:
            in_type (FieldType): the input field type
            out_type (FieldType): the output field type
            basis_generator (callable): method that generates the analytical filter basis
            points (~numpy.ndarray): points where the analytical basis should be sampled
            basis_filter (callable, optional): filter for the basis elements. Should take a dictionary containing an
                                               element's attributes and return whether to keep it or not.
            recompute (bool, optional): whether to recompute new bases or reuse, if possible, already built tensors.
            **kwargs: keyword arguments to be passed to ```basis_generator```
        
        Attributes:
            S (int): number of points where the filters are sampled
            
        """

        assert in_type.gspace == out_type.gspace
        assert isinstance(in_type.gspace, GeneralOnR2)
        
        super(BlocksBasisExpansion, self).__init__()
        self._in_type = in_type
        self._out_type = out_type
        self._input_size = in_type.size
        self._output_size = out_type.size
        self.points = points
        
        # int: number of points where the filters are sampled
        self.S = self.points.shape[1]

        # we group the basis vectors by their input and output representations
        _block_expansion_modules = {}
        
        # iterate through all different pairs of input/output representationions
        # and, for each of them, build a basis
        for i_repr in in_type._unique_representations:
            for o_repr in out_type._unique_representations:
                reprs_names = (i_repr.name, o_repr.name)
                try:
                    basis = basis_generator(i_repr, o_repr, **kwargs)
                    
                    block_expansion = block_basisexpansion(basis, points, basis_filter, recompute=recompute)
                    _block_expansion_modules[reprs_names] = block_expansion
                    
                    # register the block expansion as a submodule
                    self.add_module(f"block_expansion_{reprs_names}", block_expansion)
                    
                except EmptyBasisException:
                    # print(f"Empty basis at {reprs_names}")
                    pass
        
        if len(_block_expansion_modules) == 0:
            print('WARNING! The basis for the block expansion of the filter is empty!')

        self._n_pairs = len(in_type._unique_representations) * len(out_type._unique_representations)

        # the list of all pairs of input/output representations which don't have an empty basis
        self._representations_pairs = sorted(list(_block_expansion_modules.keys()))
        
        # retrieve for each representation in both input and output fields:
        # - the number of its occurrences,
        # - the indices where it occurs and
        # - whether its occurrences are contiguous or not
        self._in_count, _in_indices, _in_contiguous = _retrieve_indices(in_type)
        self._out_count, _out_indices, _out_contiguous = _retrieve_indices(out_type)
        
        # compute the attributes and an id for each basis element (and, so, of each parameter)
        # attributes, basis_ids = _compute_attrs_and_ids(in_type, out_type, _block_expansion_modules)
        basis_ids = _compute_attrs_and_ids(in_type, out_type, _block_expansion_modules)
        
        self._weights_ranges = {}

        last_weight_position = 0

        self._ids_to_basis = {}
        self._basis_to_ids = []
        
        self._contiguous = {}
        
        # iterate through the different group of blocks
        # i.e., through all input/output pairs
        for io_pair in self._representations_pairs:
    
            self._contiguous[io_pair] = _in_contiguous[io_pair[0]] and _out_contiguous[io_pair[1]]
    
            # build the indices tensors
            if self._contiguous[io_pair]:
                # in_indices = torch.LongTensor([
                in_indices = [
                    _in_indices[io_pair[0]].min(),
                    _in_indices[io_pair[0]].max() + 1,
                    _in_indices[io_pair[0]].max() + 1 - _in_indices[io_pair[0]].min()
                ]# )
                # out_indices = torch.LongTensor([
                out_indices = [
                    _out_indices[io_pair[1]].min(),
                    _out_indices[io_pair[1]].max() + 1,
                    _out_indices[io_pair[1]].max() + 1 - _out_indices[io_pair[1]].min()
                ] #)
                
                setattr(self, 'in_indices_{}'.format(io_pair), in_indices)
                setattr(self, 'out_indices_{}'.format(io_pair), out_indices)

            else:
                out_indices, in_indices = torch.meshgrid([_out_indices[io_pair[1]], _in_indices[io_pair[0]]])
                in_indices = in_indices.reshape(-1)
                out_indices = out_indices.reshape(-1)
                
                # register the indices tensors and the bases tensors as parameters of this module
                self.register_buffer('in_indices_{}'.format(io_pair), in_indices)
                self.register_buffer('out_indices_{}'.format(io_pair), out_indices)
                
            # count the actual number of parameters
            total_weights = len(basis_ids[io_pair])

            for i, id in enumerate(basis_ids[io_pair]):
                self._ids_to_basis[id] = last_weight_position + i
            
            self._basis_to_ids += basis_ids[io_pair]
            
            # evaluate the indices in the global weights tensor to use for the basis belonging to this group
            self._weights_ranges[io_pair] = (last_weight_position, last_weight_position + total_weights)
    
            # increment the position counter
            last_weight_position += total_weights
```

这个也是一个长函数，首先也是初始化变量，然后直接看这个算法中对应的核心：

```python
 for i_repr in in_type._unique_representations:
    for o_repr in out_type._unique_representations:
        reprs_names = (i_repr.name, o_repr.name)
        try:
            basis = basis_generator(i_repr, o_repr, **kwargs)

            block_expansion = block_basisexpansion(basis, points, basis_filter, recompute=recompute)
            _block_expansion_modules[reprs_names] = block_expansion
```

看这段代码的时候，直接看里面的函数吧。`block_basisexpansion`这个函数是本文需要重点讲解的内容。

```python
def block_basisexpansion(basis: Basis,
                         points: np.ndarray,
                         basis_filter: Callable[[dict], bool] = None,
                         recompute: bool = False
                         ) -> SingleBlockBasisExpansion:
    r"""
    
    Return an instance of :class:`~e2cnn.nn.modules.r2_conv.SingleBlockBasisExpansion`.
    
    This function support caching through the argument ``recompute``.

    Args:
        basis (Basis): basis defining the space of kernels
        points (~np.ndarray): points where the analytical basis should be sampled
        basis_filter (callable, optional): filter for the basis elements. Should take a dictionary containing an
                                           element's attributes and return whether to keep it or not.
        recompute (bool, optional): whether to recompute new bases (``True``) or reuse, if possible,
                                    already built tensors (``False``, default).

    """
    
    if not recompute:
        # compute the mask of the sampled basis containing only the elements allowed by the filter
        mask = np.zeros(len(basis), dtype=bool)
        for b, attr in enumerate(basis):
            mask[b] = basis_filter(attr)
        
        key = (basis, mask.tobytes(), points.tobytes())
        if key not in _stored_filters:
            _stored_filters[key] = SingleBlockBasisExpansion(basis, points, basis_filter)
        
        return _stored_filters[key]
    
    else:
        return SingleBlockBasisExpansion(basis, points, basis_filter)
```

咱们前面已经计算得到对应的point等内容，这些内容都传过来，由于recompute的值时False，这个时候走的是else分支，使用 的`SingleBlockBasisExpansion`函数。

```python
class SingleBlockBasisExpansion(BasisExpansion):
    
 
```

这个函数是对给定基础的一部分进行采样，并进行一系列处理（过滤、归一化等），以便在模型中使用。`basis` 是一个代表分析基函数的对象。

- `points` 是基函数应该被采样的点。
- `basis_filter` 是一个可选的回调函数，用于过滤基函数元素。它接受一个包含元素属性的字典，并返回是否保留该元素。
- 在初始化过程中，首先调用父类 `BasisExpansion` 的构造函数。
- 接下来，基于 `basis_filter` 过滤基函数，并提取属性信息。如果过滤后的基函数为空，则引发 `EmptyBasisException` 异常。
- 计算基函数元素的实际输出大小，以便执行归一化操作。
- 在网格上对基函数进行采样，并过滤掉被过滤器丢弃的基函数元素。
- 使用 `torch.Tensor` 创建基函数张量，并对其进行一些处理和归一化操作。
- 丢弃几乎全为零的基函数元素。
- 将最终的掩码（mask）存储为类的私有属性 `_mask`。
- 将符合条件的属性信息和采样后的基函数张量作为模块参数进行注册。

上面的函数在经过操作之后，会存储对应的变量，这个时候里面存储的变量如下：

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/202312050932959.png)

上述操作的内容都会存储下来，然后存储到对应的位置 。如果说 有哪个变量不知道 什么含义的，请看上文的解释，解释的比较清楚。

ok，现在我们设置完了所有变量 ，出了对应的 循环，即`block_expansion`已经设置完成了，接着看下面的内容。

```python
 self._n_pairs = len(in_type._unique_representations) * len(out_type._unique_representations)
```

设置`_n_pairs`，这个的话就是将里面的输入类型的长度以及初始类型的长度进行相乘，得到对应的`_n_pairs`长度。

```python
self._in_count, _in_indices, _in_contiguous = _retrieve_indices(in_type)
```

然后看`retreve_indices`这个函数。

```python
def _retrieve_indices(type: FieldType):
    fiber_position = 0
    _indices = defaultdict(list)
    _count = defaultdict(int)
    _contiguous = {}
    
    for repr in type.representations:
        _indices[repr.name] += list(range(fiber_position, fiber_position + repr.size))
        fiber_position += repr.size
        _count[repr.name] += 1
    
    for name, indices in _indices.items():
        # _contiguous[o_name] = indices == list(range(indices[0], indices[0]+len(indices)))
        _contiguous[name] = utils.check_consecutive_numbers(indices)
        _indices[name] = torch.LongTensor(indices)
    
    return _count, _indices, _contiguous
```

看这个函数 ，这个函数的作用就是根据字段类型，生成一个字典 `_indices`，其中包含了不同表示（representation）的索引列表，并检查这些索引列表是否是连续的。这些表示通常代表了某种类型的向量或数据集合在某个高维空间中的表示。

1. `fiber_position` 被初始化为 0，用于追踪索引的位置。

2. 创建了 `_indices` 字典，用于存储不同表示的索引列表。

3. 创建了 `_count` 字典，用于统计每个表示的出现次数。

4. 创建了一个空字典 `_contiguous`，用于存储每个表示的索引列表是否是连续的。

5. 对于给定的 `type.representations` 中的每个表示（`repr`）：

   - 将表示的名称作为键，将该表示的索引范围（从 `fiber_position` 到 `fiber_position + repr.size`）添加到 `_indices` 中。

   - 将 `fiber_position` 更新为下一个表示的起始位置。

   - 增加该表示的计数器 `_count`。

6. 对于 `_indices`中的每个表示名称和对应的索引列表：

   - 使用 `utils.check_consecutive_numbers` 函数检查索引列表是否连续，并将结果存储在 `_contiguous` 中。

   - 将索引列表转换为 `torch.LongTensor` 类型，并将其重新赋值给 `_indices`。

7. 返回包含 `_count`（表示计数）、`_indices`（表示的索引列表）和 `_contiguous`（表示索引是否连续的字典）的元组。

在处理完了这些变量之后，对应内容 就是 ：

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/202312050954791.png)

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/202312050955920.png)

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/202312050955912.png)

在了解 这些变量之后，看下面一句：

```python
 self._out_count, _out_indices, _out_contiguous = _retrieve_indices(out_type)
```

这一句的作用和上面一句的作用相同 ，这里不再进行详细赘述。

ok，接着往下看 

```python
 basis_ids = _compute_attrs_and_ids(in_type, out_type, _block_expansion_modules)
```

这个函数的作用是计算每个基本元素的属性和 id。

```python
def _compute_attrs_and_ids(in_type, out_type, block_submodules):
    
    basis_ids = defaultdict(lambda: [])
    
    # iterate over all blocks
    # each block is associated to an input/output representations pair
    out_fiber_position = 0
    out_irreps_count = 0
    for o, o_repr in enumerate(out_type.representations):
        in_fiber_position = 0
        in_irreps_count = 0
        for i, i_repr in enumerate(in_type.representations):
            
            reprs_names = (i_repr.name, o_repr.name)
            
            # if a basis for the space of kernels between the current pair of representations exists
            if reprs_names in block_submodules:
                
                # retrieve the attributes of each basis element and build a new list of
                # attributes adding information specific to the current block
                ids = []
                for attr in block_submodules[reprs_names].get_basis_info():
                    # build the ids of the basis vectors
                    # add names and indices of the input and output fields
                    id = '({}-{},{}-{})'.format(i_repr.name, i, o_repr.name, o)
                    # add the original id in the block submodule
                    id += "_" + attr["id"]
                    
                    ids.append(id)

                # append the ids of the basis vectors
                basis_ids[reprs_names] += ids
            
            in_fiber_position += i_repr.size
            in_irreps_count += len(i_repr.irreps)
        out_fiber_position += o_repr.size
        out_irreps_count += len(o_repr.irreps)
        
    # return attributes, basis_ids
    return basis_ids
```

1. 首先 创建一个默认值为列表的defaultdict队形，用于存储基础ids。
2. 然后迭代输出类型的表示。
3. 接着初始化输出表示的起始位置 和不可约的计数。
4. 然后迭代输入类型的表示。
5. 接着如果当前表示对存在于`block_submodules`中。
6. 然后获取当前白哦是对应的模块的基础信息。
7.   构建基础向量的标识符
8.   将基础向量的标识符添加到对应表示对的 basis_ids 列表中
9. 更新输入表示的位置和不可约表示的计数
10. 更新输出表示的位置和不可约表示的计数
11. 返回基础 ids

这个函数的主要流程是对输入和输出类型的表示进行迭代，检查对应的表示对是否存在于 `block_submodules` 中，如果存在，则根据模块的基础信息构建基础向量的标识符，并将其存储在 `basis_ids` 中。最后返回这些基础 ids。

然后看完了这个函数 ，发现这个 函数其实并不是重点，里面不过是将一些变量进行初始化，真正的重点还在下面。

然后接着往下走，发现走到下面几句：

```python
self.weights = Parameter(torch.zeros(self.basisexpansion.dimension()), requires_grad=True)
self.register_buffer("filter", torch.zeros(out_type.size, in_type.size, kernel_size, kernel_size))
if initialize:
    # by default, the weights are initialized with a generalized form of He's weight initialization
    init.generalized_he_init(self.weights.data, self.basisexpansion)
```

这里的其那两句相当于将里面的数据进行放入，暂时先不管对应的内容。然后看初始化，也就是看`generalized_he_init`这个函数。

```python
def generalized_he_init(tensor: torch.Tensor, basisexpansion: BasisExpansion, cache: bool = False):
    r"""
    可算是找到了重点...
    Initialize the weights of a convolutional layer with a generalized He's weight initialization method.

    Because the computation of the variances can be expensive, to save time on consecutive runs of the same model,
    it is possible to cache the tensor containing the variance of each weight, for a specific ```basisexpansion```.
    This can be useful if a network contains multiple convolution layers of the same kind (same input and output types,
    same kernel size, etc.) or if one needs to train the same network from scratch multiple times (e.g. to perform
    hyper-parameter search over learning rate or to repeat an experiment with different random seeds).

    .. note ::
        The variance tensor is cached in memory and therefore is only available to the current process.

    Args:
        tensor (torch.Tensor): the tensor containing the weights
        basisexpansion (BasisExpansion): the basis expansion method
        cache (bool, optional): cache the variance tensor. By default, ```cache=False```

    """
    # Initialization
    
    assert tensor.shape == (basisexpansion.dimension(),)
    
    if cache and basisexpansion not in cached_he_vars:
        cached_he_vars[basisexpansion] = _generalized_he_init_variances(basisexpansion)
    
    if cache:
        vars = cached_he_vars[basisexpansion]
    else:
        vars = _generalized_he_init_variances(basisexpansion)
    
    tensor[:] = vars * torch.randn_like(tensor)
```

这个函数的作用是使用广义he权重初始化卷积层的权重，这个函数首先先判断输入的数据是否符合条件，如果不符合，则直接进行返回，然后判断是否存在对应的缓存，有的话，直接使用上次已经初始化好的变量进行初始化，没有的话，调用对应的`_generalized_he_init_variances`函数进行初始化。

```python
def _generalized_he_init_variances(basisexpansion: BasisExpansion):
    r"""
    使用广义 He 权重初始化方法计算卷积层权重的方差。
    Compute the variances of the weights of a convolutional layer with a generalized He's weight initialization method.

    Args:
        basisexpansion (BasisExpansion): the basis expansion method

    """
    
    vars = torch.ones((basisexpansion.dimension(),))
    
    inputs_count = defaultdict(lambda: set())
    basis_count = defaultdict(int)
    
    basis_info = list(basisexpansion.get_basis_info())
    
    for attr in basis_info:
        i, o = attr["in_irreps_position"], attr["out_irreps_position"]
        in_irrep, out_irrep = attr["in_irrep"], attr["out_irrep"]
        inputs_count[o].add(in_irrep)
        basis_count[(in_irrep, o)] += 1
    
    for o in inputs_count.keys():
        inputs_count[o] = len(inputs_count[o])
    
    for w, attr in enumerate(basis_info):
        i, o = attr["in_irreps_position"], attr["out_irreps_position"]
        in_irrep, out_irrep = attr["in_irrep"], attr["out_irrep"]
        vars[w] = 1. / math.sqrt(inputs_count[o] * basis_count[(in_irrep, o)])
    
    return vars
```

这个函数使用广义he权重初始化方法 计算卷积层权重的方差，然后我们仍然是一行一行的看这个代码。

首先的话仍然是拿到对应的变量 ，将对应的变量进行初始化。

这里将每个初始化的变量截图： 

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/202312051351600.png)

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/202312051351435.png)

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/202312051351232.png)

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/202312051352657.png)

一个即兴提问：为什么都是960个维度，这个是怎么得出来的，这里标记一个TODO。

然后接着往下面看，看到第一个循环：

```python
 for attr in basis_info:
    i, o = attr["in_irreps_position"], attr["out_irreps_position"]
    in_irrep, out_irrep = attr["in_irrep"], attr["out_irrep"]
    inputs_count[o].add(in_irrep)
    basis_count[(in_irrep, o)] += 1
```

`attr` 在每次循环中代表 `basis_info` 列表中的一个元素（或者是一个字典）。

`i` 和 `o` 分别用于存储 `attr` 字典中的键 `"in_irreps_position"` 和 `"out_irreps_position"` 对应的值。

`in_irrep` 和 `out_irrep` 存储了 `attr` 字典中键为 `"in_irrep"` 和 `"out_irrep"` 的对应值。

`inputs_count[o].add(in_irrep)`这行代码在创建一个数据结构（可能是字典或集合），其中 `o` 是键，`inputs_count[o]` 可能是一个集合，代码尝试将 `in_irrep` 的值添加到该集合中。

`basis_count[(in_irrep, o)] += 1`这行代码在一个名为 `basis_count` 的字典中记录某些键的计数。它使用了一个元组 `(in_irrep, o)` 作为键，并且将该键对应的值（假设是一个整数）增加了 1。

按照我的 理解，这里面是对其中变量进行了复制，统计其中basis的个数，共下面使用。

```python
 for o in inputs_count.keys():
    inputs_count[o] = len(inputs_count[o])
```

这句话的意思是统计其中输入的 不可约表示的总数。

然后下面就是对应的卷积计算：

```python
for w, attr in enumerate(basis_info):
    i, o = attr["in_irreps_position"], attr["out_irreps_position"]
    in_irrep, out_irrep = attr["in_irrep"], attr["out_irrep"]
    vars[w] = 1. / math.sqrt(inputs_count[o] * basis_count[(in_irrep, o)])
```

这里面在进行对应位置 的方差，使用遍历的方式遍历`basis_info`中的每个基，并且获取其属性信息，对于每个基，利用输入不可约表示的 数量和输入到输出不可约表示的数量，计算权重方差，并将其存储在`vars`中。

总体而言，这个函数通过基扩展方法 `basisexpansion` 来计算卷积层权重初始化时的方差。它首先统计输入和基的信息，然后根据这些信息计算每个基对应的权重方差，并将结果作为张量返回。

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/202312051406107.png)

在计算出来对应的方差之后，将其中的 值进行返回，对应的广义he就初始化完成。整个函数就完成。

看到了 这里，我最大的疑问出来了，核的定义到底是什么，为什么这里计算出对应的方差，就算是将核初始化完成了？

关于卷积神经网络的核，这里的话还是在单独写一篇文章，普及其中的概念吧。

