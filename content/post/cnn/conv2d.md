---
title: "Conv2d的简单理解"
description: 
date: 2023-12-05T14:30:19+08:00
image: 
math: true
license: Apache Licence 2.0
categories:
    - 机器学习
tags:
    - 机器学习
    - 源码阅读
hidden: false
comments: true
draft: false
---

在我们炼丹的时候，一般卷积神经网络是我们 不可避免 接触到的概念，就算你 使用使用时 Transformer，其实也是跟卷积神将网络中的 部分思想是相关，本文将会 解析 Pytorch 中 conv2d 中的源码，简单说明其中 的原理，只有深度了解了对应的 原理，才能更好的进行 修改。

首先的话还是老规矩，看官方[链接](https://pytorch.org/docs/stable/generated/torch.nn.Conv2d.html)。

从连接上面虽然可以对每个变量有深刻的理解，但是还是迷迷糊糊，为了更改好的理解，本文从一个例子说起，说明其中对应的内容，然后与 前面编写 e2cnn 的群卷积神经网络 进行对比，争取彻底理解二者之间 每一步的关联以及对应的意思。

这个例子很简单，就是下面一句代码：

```python
 m = nn.Conv2d(16, 33, 3, stride=2)
```

其中16时我们输入特征的通道数，33时我们设置的输出特征的通道数，3时卷积核的大小（$3 \times 3$），stride是步长。然后我们看`Conv2d`的源码。

```python
class Conv2d(_ConvNd):
    __doc__ = r"""Applies a 2D convolution over an input signal composed of several input
    planes.

    In the simplest case, the output value of the layer with input size
    :math:`(N, C_{\text{in}}, H, W)` and output :math:`(N, C_{\text{out}}, H_{\text{out}}, W_{\text{out}})`
    can be precisely described as:

    .. math::
        \text{out}(N_i, C_{\text{out}_j}) = \text{bias}(C_{\text{out}_j}) +
        \sum_{k = 0}^{C_{\text{in}} - 1} \text{weight}(C_{\text{out}_j}, k) \star \text{input}(N_i, k)


    where :math:`\star` is the valid 2D `cross-correlation`_ operator,
    :math:`N` is a batch size, :math:`C` denotes a number of channels,
    :math:`H` is a height of input planes in pixels, and :math:`W` is
    width in pixels.
    """ + r"""

    This module supports :ref:`TensorFloat32<tf32_on_ampere>`.

    * :attr:`stride` controls the stride for the cross-correlation, a single
      number or a tuple.

    * :attr:`padding` controls the amount of padding applied to the input. It
      can be either a string {{'valid', 'same'}} or a tuple of ints giving the
      amount of implicit padding applied on both sides.

    * :attr:`dilation` controls the spacing between the kernel points; also
      known as the à trous algorithm. It is harder to describe, but this `link`_
      has a nice visualization of what :attr:`dilation` does.

    {groups_note}

    The parameters :attr:`kernel_size`, :attr:`stride`, :attr:`padding`, :attr:`dilation` can either be:

        - a single ``int`` -- in which case the same value is used for the height and width dimension
        - a ``tuple`` of two ints -- in which case, the first `int` is used for the height dimension,
          and the second `int` for the width dimension

    Note:
        {depthwise_separable_note}

    Note:
        {cudnn_reproducibility_note}

    Note:
        ``padding='valid'`` is the same as no padding. ``padding='same'`` pads
        the input so the output has the shape as the input. However, this mode
        doesn't support any stride values other than 1.

    Args:
        in_channels (int): Number of channels in the input image
        out_channels (int): Number of channels produced by the convolution
        kernel_size (int or tuple): Size of the convolving kernel
        stride (int or tuple, optional): Stride of the convolution. Default: 1
        padding (int, tuple or str, optional): Padding added to all four sides of
            the input. Default: 0
        padding_mode (string, optional): ``'zeros'``, ``'reflect'``,
            ``'replicate'`` or ``'circular'``. Default: ``'zeros'``
        dilation (int or tuple, optional): Spacing between kernel elements. Default: 1
        groups (int, optional): Number of blocked connections from input
            channels to output channels. Default: 1
        bias (bool, optional): If ``True``, adds a learnable bias to the
            output. Default: ``True``
    """.format(**reproducibility_notes, **convolution_notes) + r"""

    Shape:
        - Input: :math:`(N, C_{in}, H_{in}, W_{in})` or :math:`(C_{in}, H_{in}, W_{in})`
        - Output: :math:`(N, C_{out}, H_{out}, W_{out})` or :math:`(C_{out}, H_{out}, W_{out})`, where

          .. math::
              H_{out} = \left\lfloor\frac{H_{in}  + 2 \times \text{padding}[0] - \text{dilation}[0]
                        \times (\text{kernel\_size}[0] - 1) - 1}{\text{stride}[0]} + 1\right\rfloor

          .. math::
              W_{out} = \left\lfloor\frac{W_{in}  + 2 \times \text{padding}[1] - \text{dilation}[1]
                        \times (\text{kernel\_size}[1] - 1) - 1}{\text{stride}[1]} + 1\right\rfloor

    Attributes:
        weight (Tensor): the learnable weights of the module of shape
            :math:`(\text{out\_channels}, \frac{\text{in\_channels}}{\text{groups}},`
            :math:`\text{kernel\_size[0]}, \text{kernel\_size[1]})`.
            The values of these weights are sampled from
            :math:`\mathcal{U}(-\sqrt{k}, \sqrt{k})` where
            :math:`k = \frac{groups}{C_\text{in} * \prod_{i=0}^{1}\text{kernel\_size}[i]}`
        bias (Tensor):   the learnable bias of the module of shape
            (out_channels). If :attr:`bias` is ``True``,
            then the values of these weights are
            sampled from :math:`\mathcal{U}(-\sqrt{k}, \sqrt{k})` where
            :math:`k = \frac{groups}{C_\text{in} * \prod_{i=0}^{1}\text{kernel\_size}[i]}`

    Examples:

        >>> # With square kernels and equal stride
        >>> m = nn.Conv2d(16, 33, 3, stride=2)
        >>> # non-square kernels and unequal stride and with padding
        >>> m = nn.Conv2d(16, 33, (3, 5), stride=(2, 1), padding=(4, 2))
        >>> # non-square kernels and unequal stride and with padding and dilation
        >>> m = nn.Conv2d(16, 33, (3, 5), stride=(2, 1), padding=(4, 2), dilation=(3, 1))
        >>> input = torch.randn(20, 16, 50, 100)
        >>> output = m(input)

    .. _cross-correlation:
        https://en.wikipedia.org/wiki/Cross-correlation

    .. _link:
        https://github.com/vdumoulin/conv_arithmetic/blob/master/README.md
    """

    def __init__(
        self,
        in_channels: int,
        out_channels: int,
        kernel_size: _size_2_t,
        stride: _size_2_t = 1,
        padding: Union[str, _size_2_t] = 0,
        dilation: _size_2_t = 1,
        groups: int = 1,
        bias: bool = True,
        padding_mode: str = 'zeros',  # TODO: refine this type
        device=None,
        dtype=None
    ) -> None:
        factory_kwargs = {'device': device, 'dtype': dtype}
        kernel_size_ = _pair(kernel_size)
        stride_ = _pair(stride)
        padding_ = padding if isinstance(padding, str) else _pair(padding)
        dilation_ = _pair(dilation)
        super(Conv2d, self).__init__(
            in_channels, out_channels, kernel_size_, stride_, padding_, dilation_,
            False, _pair(0), groups, bias, padding_mode, **factory_kwargs)
```

ok，在了解了我们输入的变量之后，下面一句来看其中的内容。

`factory_kwargs = {'device': device, 'dtype': dtype}`这个就是指定你先使用的 设备 是什么（CPU  or CUDA）。

`kernel_size_ = _pair(kernel_size)`就是将对应 我们输入的卷积核大小变成对应的pair形式(3 -> $3 \times 3$)。

`stride_ = _pair(stride)`这个的话同理，将数值变成 对应的pair形式(2 -> $2 \times 2$)。

`padding_ = padding if isinstance(padding, str) else _pair(padding)`也是同理，不过是这里你再输入的时候可能已经是对应padding形式。

`dilation_ = _pair(dilation)`这句话依然是同理，将数值变成对应的pair形式()。

`super(Conv2d, self).__init__(in_channels, out_channels, kernel_size_, stride_, padding_, dilation_,False, _pair(0), groups, bias, padding_mode, **factory_kwargs)`这个函数是我们需要着重关注的 。

```python
def __init__(self,
             in_channels: int,
             out_channels: int,
             kernel_size: Tuple[int, ...],
             stride: Tuple[int, ...],
             padding: Tuple[int, ...],
             dilation: Tuple[int, ...],
             transposed: bool,
             output_padding: Tuple[int, ...],
             groups: int,
             bias: bool,
             padding_mode: str,
             device=None,
             dtype=None) -> None:
    factory_kwargs = {'device': device, 'dtype': dtype}
    super(_ConvNd, self).__init__()
    if in_channels % groups != 0:
        raise ValueError('in_channels must be divisible by groups')
    if out_channels % groups != 0:
        raise ValueError('out_channels must be divisible by groups')
    valid_padding_strings = {'same', 'valid'}
    if isinstance(padding, str):
        if padding not in valid_padding_strings:
            raise ValueError(
                "Invalid padding string {!r}, should be one of {}".format(
                    padding, valid_padding_strings))
        if padding == 'same' and any(s != 1 for s in stride):
            raise ValueError("padding='same' is not supported for strided convolutions")

    valid_padding_modes = {'zeros', 'reflect', 'replicate', 'circular'}
    if padding_mode not in valid_padding_modes:
        raise ValueError("padding_mode must be one of {}, but got padding_mode='{}'".format(
            valid_padding_modes, padding_mode))
    self.in_channels = in_channels
    self.out_channels = out_channels
    self.kernel_size = kernel_size
    self.stride = stride
    self.padding = padding
    self.dilation = dilation
    self.transposed = transposed
    self.output_padding = output_padding
    self.groups = groups
    self.padding_mode = padding_mode
    # `_reversed_padding_repeated_twice` is the padding to be passed to
    # `F.pad` if needed (e.g., for non-zero padding types that are
    # implemented as two ops: padding + conv). `F.pad` accepts paddings in
    # reverse order than the dimension.
    if isinstance(self.padding, str):
        self._reversed_padding_repeated_twice = [0, 0] * len(kernel_size)
        if padding == 'same':
            for d, k, i in zip(dilation, kernel_size,
                               range(len(kernel_size) - 1, -1, -1)):
                total_padding = d * (k - 1)
                left_pad = total_padding // 2
                self._reversed_padding_repeated_twice[2 * i] = left_pad
                self._reversed_padding_repeated_twice[2 * i + 1] = (
                    total_padding - left_pad)
    else:
        self._reversed_padding_repeated_twice = _reverse_repeat_tuple(self.padding, 2)

    if transposed:
        self.weight = Parameter(torch.empty(
            (in_channels, out_channels // groups, *kernel_size), **factory_kwargs))
    else:
        self.weight = Parameter(torch.empty(
            (out_channels, in_channels // groups, *kernel_size), **factory_kwargs))
    if bias:
        self.bias = Parameter(torch.empty(out_channels, **factory_kwargs))
    else:
        self.register_parameter('bias', None)

    self.reset_parameters()
```

这个函数中仍然是相同的，最开始进行初始化，指定 `weight`，`bias`的大小。然后看 `reset_parameters`这个函数。

```python
def reset_parameters(self) -> None:
    # Setting a=sqrt(5) in kaiming_uniform is the same as initializing with
    # uniform(-1/sqrt(k), 1/sqrt(k)), where k = weight.size(1) * prod(*kernel_size)
    # For more details see: https://github.com/pytorch/pytorch/issues/15314#issuecomment-477448573
    init.kaiming_uniform_(self.weight, a=math.sqrt(5))
    if self.bias is not None:
        fan_in, _ = init._calculate_fan_in_and_fan_out(self.weight)
        if fan_in != 0:
            bound = 1 / math.sqrt(fan_in)
            init.uniform_(self.bias, -bound, bound)
```

这段代码的作用时重新初始化层的 参数（权重和偏置）。

然后我们逐步检查这个方法的功能：

`init.kaiming_uniform_(self.weight, a=math.sqrt(5))`：这个的话使用了PyTorch的`kaiming_uniform_`初始化方法 ，采用Kaiming He等人提出的初始化策略，针对ReLU激活函数的权重初始化方法。然后的话看这个函数。

```python
def kaiming_uniform_(tensor, a=0, mode='fan_in', nonlinearity='leaky_relu'):
    r"""Fills the input `Tensor` with values according to the method
    described in `Delving deep into rectifiers: Surpassing human-level
    performance on ImageNet classification` - He, K. et al. (2015), using a
    uniform distribution. The resulting tensor will have values sampled from
    :math:`\mathcal{U}(-\text{bound}, \text{bound})` where

    .. math::
        \text{bound} = \text{gain} \times \sqrt{\frac{3}{\text{fan\_mode}}}

    Also known as He initialization.

    Args:
        tensor: an n-dimensional `torch.Tensor`
        a: the negative slope of the rectifier used after this layer (only
            used with ``'leaky_relu'``)
        mode: either ``'fan_in'`` (default) or ``'fan_out'``. Choosing ``'fan_in'``
            preserves the magnitude of the variance of the weights in the
            forward pass. Choosing ``'fan_out'`` preserves the magnitudes in the
            backwards pass.
        nonlinearity: the non-linear function (`nn.functional` name),
            recommended to use only with ``'relu'`` or ``'leaky_relu'`` (default).

    Examples:
        >>> w = torch.empty(3, 5)
        >>> nn.init.kaiming_uniform_(w, mode='fan_in', nonlinearity='relu')
    """
    if torch.overrides.has_torch_function_variadic(tensor):
        return torch.overrides.handle_torch_function(
            kaiming_uniform_,
            (tensor,),
            tensor=tensor,
            a=a,
            mode=mode,
            nonlinearity=nonlinearity)

    if 0 in tensor.shape:
        warnings.warn("Initializing zero-element tensors is a no-op")
        return tensor
    fan = _calculate_correct_fan(tensor, mode)
    gain = calculate_gain(nonlinearity, a)
    std = gain / math.sqrt(fan)
    bound = math.sqrt(3.0) * std  # Calculate uniform bounds from standard deviation
    with torch.no_grad():
        return tensor.uniform_(-bound, bound)
```

这段代码的作用初始化权重的代码之一，使用均匀分布初始化权重。

计算`_calculate_correct_fan`函数计算对应 的权重张量。然后的话看这个函数。

```python
def _calculate_correct_fan(tensor, mode):
    mode = mode.lower()
    valid_modes = ['fan_in', 'fan_out']
    if mode not in valid_modes:
        raise ValueError("Mode {} not supported, please use one of {}".format(mode, valid_modes))

    fan_in, fan_out = _calculate_fan_in_and_fan_out(tensor)
    return fan_in if mode == 'fan_in' else fan_out
```

套娃函数，看`_calculate_fan_in_and_fan_out`这个函数。

```python
def _calculate_fan_in_and_fan_out(tensor):
    dimensions = tensor.dim()
    if dimensions < 2:
        raise ValueError("Fan in and fan out can not be computed for tensor with fewer than 2 dimensions")

    num_input_fmaps = tensor.size(1)
    num_output_fmaps = tensor.size(0)
    receptive_field_size = 1
    if tensor.dim() > 2:
        # math.prod is not always available, accumulate the product manually
        # we could use functools.reduce but that is not supported by TorchScript
        for s in tensor.shape[2:]:
            receptive_field_size *= s
    fan_in = num_input_fmaps * receptive_field_size
    fan_out = num_output_fmaps * receptive_field_size

    return fan_in, fan_out
```

这个函数算是看到对应的 内容是怎么计算的了，首先，我们先获取权重，通过权重的大小计算`fan_in`和 `fan_out`。

`dimensions = tensor.dim()`: 获取张量的维度数。

如果张量的维度数小于 2，则抛出异常，因为无法为少于 2 维的张量计算 fan_in 和 fan_out。

计算 `num_input_fmaps` 和 `num_output_fmaps`：

- `num_input_fmaps` 是输入特征图的数量，通常对应于输入张量的第二个维度的大小（索引为 1）。

- `num_output_fmaps` 是输出特征图的数量，通常对应于输出张量的第一个维度的大小（索引为 0）。

如果张量的维度大于 2：

- 初始化 `receptive_field_size` 为 1。
- 对张量的除了前两个维度（通常是批量大小和通道数）之外的维度进行遍历，计算这些维度的乘积，以计算感受野的大小。
- 这里采用了一个循环，将除前两个维度外的所有维度大小相乘，得到 `receptive_field_size`。

然后计算`fan_in`和`fan_out`：

- `fan_in` 是输入通道数量，是输入特征图数量乘以感受野大小的结果。
- `fan_out` 是输出通道数量，是输出特征图数量乘以感受野大小的结果。

然后计算返回计算得到的`fan_in`和`fan_out`。

ok，现在我们得到对应的权重张量，然后接着看下面的函数。

```python
gain = calculate_gain(nonlinearity, a)
std = gain / math.sqrt(fan)
bound = math.sqrt(3.0) * std  # Calculate uniform bounds from standard deviation
with torch.no_grad():
    return tensor.uniform_(-bound, bound)
```

然后这里我们需要看计算gain(增益)的函数。

```python
def calculate_gain(nonlinearity, param=None):
    r"""Return the recommended gain value for the given nonlinearity function.
    The values are as follows:

    ================= ====================================================
    nonlinearity      gain
    ================= ====================================================
    Linear / Identity :math:`1`
    Conv{1,2,3}D      :math:`1`
    Sigmoid           :math:`1`
    Tanh              :math:`\frac{5}{3}`
    ReLU              :math:`\sqrt{2}`
    Leaky Relu        :math:`\sqrt{\frac{2}{1 + \text{negative\_slope}^2}}`
    SELU              :math:`\frac{3}{4}`
    ================= ====================================================

    .. warning::
        In order to implement `Self-Normalizing Neural Networks`_ ,
        you should use ``nonlinearity='linear'`` instead of ``nonlinearity='selu'``.
        This gives the initial weights a variance of ``1 / N``,
        which is necessary to induce a stable fixed point in the forward pass.
        In contrast, the default gain for ``SELU`` sacrifices the normalisation
        effect for more stable gradient flow in rectangular layers.

    Args:
        nonlinearity: the non-linear function (`nn.functional` name)
        param: optional parameter for the non-linear function

    Examples:
        >>> gain = nn.init.calculate_gain('leaky_relu', 0.2)  # leaky_relu with negative_slope=0.2

    .. _Self-Normalizing Neural Networks: https://papers.nips.cc/paper/2017/hash/5d44ee6f2c3f71b73125876103c8f6c4-Abstract.html
    """
    linear_fns = ['linear', 'conv1d', 'conv2d', 'conv3d', 'conv_transpose1d', 'conv_transpose2d', 'conv_transpose3d']
    if nonlinearity in linear_fns or nonlinearity == 'sigmoid':
        return 1
    elif nonlinearity == 'tanh':
        return 5.0 / 3
    elif nonlinearity == 'relu':
        return math.sqrt(2.0)
    elif nonlinearity == 'leaky_relu':
        if param is None:
            negative_slope = 0.01
        elif not isinstance(param, bool) and isinstance(param, int) or isinstance(param, float):
            # True/False are instances of int, hence check above
            negative_slope = param
        else:
            raise ValueError("negative_slope {} not a valid number".format(param))
        return math.sqrt(2.0 / (1 + negative_slope ** 2))
    elif nonlinearity == 'selu':
        return 3.0 / 4  # Value found empirically (https://github.com/pytorch/pytorch/pull/50664)
    else:
        raise ValueError("Unsupported nonlinearity {}".format(nonlinearity))
```

LeakyReLU: 返回$\sqrt\frac{2}{1 +  negative\_slope}$

计算出对应的gain，然后接着往下走。

```python
std = gain / math.sqrt(fan)
bound = math.sqrt(3.0) * std  # Calculate uniform bounds from standard deviation
with torch.no_grad():
    return tensor.uniform_(-bound, bound)
```

这个的话就是数值 计算出对应的标准差以及均匀分布的边界`bound`，这个是$\sqrt 3$乘以对应的 标准差。

计算出来这些之后，进行返回。然后接着看返回后的 下面的 函数。

```python
if self.bias is not None:
    fan_in, _ = init._calculate_fan_in_and_fan_out(self.weight)
    if fan_in != 0:
        bound = 1 / math.sqrt(fan_in)
        init.uniform_(self.bias, -bound, bound)
```

这几句话的作用时 如果当前 偏置参数不为空，通过权重计算出对应`fain_in`（输入通道数量），如果说当前输入通道数不为0，则对方法偏执参数的均匀分布的重新初始化。

这些都计算完毕之后，就返回了。

返回的内容如下 ：

![](https://img-1312072469.cos.ap-nanjing.myqcloud.com/202312061102227.png)

得到了对应的内容，然后我们看官网中有这么 一个公式：
$$
out(N_{i},C_{out_{j}}) = bias(C_{out_{j}}) + \sum_{k = 0}^{C_m - 1} weight(C_{out_{j}},k) \star input(N_{i},k)
$$
其实上面的过程，就是这个公式的计算。

## 总结

其实我们在使用的 时候，一般不会看着详细的计算过程，因为这个公式已经介绍的很清楚了，但是最近在看群卷积神经网络，对于卷积这块突然间不知道对应的滤波是怎么进行设置，因此将这部分重新简单看下，这部分比较简单，但是其中也有很多细节值得深究，象何凯明大佬里面的leaky_relu这个函数的设置等等，不得不承认好的开源社区就是充满活力，代码写的真的好。

