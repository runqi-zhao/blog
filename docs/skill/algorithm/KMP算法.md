---
id: kmp算法
title: kmp算法
sidebar_label: kmp算法
description: kmp算法
---

这节课的笔记其实只能说是辅助作用，如果想要复习，听课最好。

**题目：给定一个字符串 str1 和一个字符串 str2，在字符串 str1 中找出字符串 str2 出现的第一个位置 (从0开始)。如果不存在，则返回 -1。**

这道题目，可以说明KMP算法，分为两个方法

1. 暴力方法
2. KMP算法

## 暴力方法

暴力方法使用的很简单，就是两个位置进行比较匹配，如果说不符合对应的位置，那么则开始遍历下一个位置。具体步骤可以描述为：

这里的给 str1 一个 i 指针，给 str2 一个 j 指针。i 的第一个初始位置是 0，最后一个初始位置是 str1.length - 1。

1. str1[ i ] 和 str2[ j ]相等: i 和 j 都往后移动一位。
2. str1[ i ] 和 str2[ j ]不等，j 归 0， i 从下一个初始位置开始比较。

如果 j 能够到 length 这个位置上，说明从第 0 位到第 str2.length - 1 位都已经相等了，此时返回 i - j ，就是 str2 在 str1 中出现的第一个位置的 index 。

如果 i 到达了最后一个初始位置，也就是 str1.length - 1 ,此时还没有匹配成功，那么说明永远都没办法匹配到 str2 。 这个时候返回 -1 。

```java
public static int baoLi(String str1, String str2) {
        int length1 = str1.length();
        int length2 = str2.length();
        if (length2 == 0) {
            return 0;
        }
        if (length1 < length2) {
            return -1;
        }
        int i = 0;
        while (i < length1) {
            int j = 0;
            while (i < length1 && j < length2) {
                if (str1.charAt(1) == str2.charAt(2)) {
                    i++;
                    j++;
                }
                if (j == length2) {
                    return i - j;
                }
                i = i - j + 1;
            }
        }
        return -1;
    }
```

## KMP方法

这里暂时先不讨论 next 是如何来的。你需要知道它存放的是 str2 的一些信息。他的值等于 str2 前面的所有字符形成的字串的前缀等于后缀的最大值。这里非常绕，举个例子来说明：

index 等于 6 的时候， 字串是 `a b c a b c`。

前后缀取 1 的时候，前缀为 a， 后缀为 c，此时不等。 next 不能取 1 。

前后缀取 2 的时候，前缀为 ab， 后缀为 bc， next 不能取 2 。

前后缀取 3 的时候，前缀为 abc， 后缀为 abc， 此时相等， next 可以取 。

前后缀取 4 的时候，前缀为 abca， 后缀为 cabc， next 不可以取 4 。

前后缀取 5 的时候，前缀为 abcab， 后缀为 bcabc， next 不可以取 5 。

前后缀不可以取 6 。因为前后缀不可以为字符串本身。

```
index：0 1 2 3 4 5 6 7 8 9
str1 = a a a a a b c a b c
str2 = a b c a b c a a
next：-1 0 0 0 1 2 3 1
```

接下来是 KMP 算法的流程。按照暴力的解法，我们还是有两根指针 i 和 j。

1. 两个元素相等时： i 和 j 往后移动一位。
2. 两个元素不等时： j = next [ j ]，如果此时 next[ j ] 等于 -1，说明 j 指针已经移动到了最前面。

我们来仔细理解这个不相等的两种情况，这里是难点。

`next[j] != -1`，这种情况下，j 指针直接跳到 `str2[next[j]]`去。为什么这样做可以？举例子。

index `0 1 2 3 4 5 6 7`

str1 = `a b c f a b c x`

str2 = `a b c f a b c y`

next=`-1 0 0 0 0 1 2 3`

在 index 为 6的时候，i = j = 7，这个时候两个元素不相等，我们会把 j 跳到 `str2[next[j]]`，也就是 `j = 3`。这个时候 str1 前面的子串 和 str2 前面的子串是相等的，他们拥有共同的 next 数组。j 跳到 3，这个 3 代表： y/x 前面这个子串他的前三位和后三位相等。那么，我们的 y 的子串前三位 和 x 子串的后三位这个时候是不是就不需要比较了，因为这个 3 默认了他们相等。那么前三位（index为 0 1 2）就不需要比较了，直接比较第四（index 为 3 ）位。这里就是 next 数组的核心。在左神的视频里面讲得更直观。

str1 = `a b c f a b c x`

str2 = `* * * * a b c f a b c y`

比较 x 与 f 是否相等。

`next[j] == -1`，这种情况下，j 已经来到最前面了，没办法继续前移，那么只能 i 向后移。

```
 public static int getIndexOf(String m, String n) {
        if (m == null || n == null || m.length() < 1 || n.length() < 1) {
            return -1;
        }
        char[] str1 = m.toCharArray();
        char[] str2 = n.toCharArray();
        int x = 0;
        int y = 0;
        int[] next = getNextArray(str2);
        while (x < str1.length && y < str2.length) {
            if (str1[x] == str2[y]) {
                x++;
                y++;
            } else if (next[y] == -1) {
                x++;
            } else {
                y = next[y];
            }
        }
        return y == str2.length ? y - x : -1;
    }
```

### next数组

str2 = `a b c f a b c y`

next= `-1 0 * * * * * *`

第一位默认为 -1。 因为第一位元素没有子串。

第二位默认为 0。因为第二位元素的子串只有一个元素，那他的前后缀最大相等数目只能为0。

接下来是第三位，第三位的子串是`a b`，这里是难点。如何求出它的 next 值。`j = 3`

用 j - 1 的 next 的值，`cn = next[j-1]`的 str2 对应的元素, 和 `str2[j-1]` 比较。这里的cn = 0， 那比较的就是第 0 号元素和第 1 号元素的值。比较出来一定有两种情况，相等，不相等。而在不相等的时候又要分两种情况。

index `0 1 2 3 4 5 6 7`

str2 = `a b c f a b c y`

next=`-1 0 0 0 0 1 * *`

为了更直观看见，我换个例子。j = 6.

```
cn = next[j-1] = 1, str2[cn] = b
str2[j-1] = b
```

这个时候是相等的，因此 `next[6] = ++cn = 2` 。为什么？

这个 cn 代表的是什么？cn 代表的是 `j-1` 位的 next 值，这个值代表 `j-1` 位的前后缀最大值。这个最大值是 1，说明他第一位和最后一位相等。那么比较他的第二位（`str2[cn]`）和最后一位的下一位（`str2[j-1]`）是否相等。相等的话，`next[6] = ++cn = 2` 。不相等怎么办？分为两种情况。

1. `cn > 0,cn = next[cn]`
2. `cn<= 0,next[j] = 0`

这里又是为什么，就是在子串的情况下继续分，去找到和`str[j-1]`相等的 `cn`，如果一直找不到呢？怎么办，那`next[j] = 0`。

```java
private static int[] getNextArray(char[] ms) {
        if (ms.length == 1) {
            return new int[]{-1};
        }
        int[] next = new int[ms.length];
        next[0] = -1;
        int i = 2;
        // cn代表，cn位置的字符，是当前和i-1位置比较的字符
        int cn = 0;
        while (i < next.length) {
            if (ms[i - 1] < ms[cn]) {
                next[i] = ++cn;
            } else if (cn > 0) {
                cn = next[cn];
            } else {
                next[i++] = 0;
            }
        }
        return next;
    }
```

## 练习

你两棵二叉树 root 和 subRoot 。检验 root 中是否包含和 subRoot 具有相同结构和节点值的子树。如果存在，返回 true ；否则，返回 false 。

二叉树 tree 的一棵子树包括 tree 的某个节点和这个节点的所有后代节点。tree 也可以看做它自身的一棵子树。

示例 1：

![img](https://assets.leetcode.com/uploads/2021/04/28/subtree1-tree.jpg)

输入：root = [3,4,5,1,2], subRoot = [4,1,2]
输出：true

示例 2：

![img](https://assets.leetcode.com/uploads/2021/04/28/subtree2-tree.jpg)

输入：root = [3,4,5,1,2,null,null,null,null,0], subRoot = [4,1,2]
输出：false

来源：力扣（LeetCode）
链接：https://leetcode.cn/problems/subtree-of-another-tree

### 思路与解析

这道题目可以使用KMP解决。

将两个树的先序遍历拿到其中的先序序列，然后进行子串对比，如果说存在对应的字串，那么就返回true

```java
public static boolean isSubtree(TreeNode root, TreeNode subRoot) {
        if (subRoot == null) {
            return true;
        }
        if (root == null) {
            return false;
        }
        ArrayList<String> rootStr = preSerial(root);
        ArrayList<String> subRootStr = preSerial(subRoot);
        String[] str = new String[rootStr.size()];
        for (int i = 0; i < str.length; i++) {
            str[i] = rootStr.get(i);
        }

        String[] match = new String[subRootStr.size()];
        for (int i = 0; i < match.length; i++) {
            match[i] = subRootStr.get(i);
        }

        return getIndexOf(str, match) != -1;

    }

    private static int getIndexOf(String[] str, String[] match) {
        if (str == null || match == null || str.length < 1 || str.length < match.length) {
            return -1;
        }
        int x = 0;
        int y = 0;
        int[] next = getNextArray(match);
        while (x < str.length && y < match.length) {
            if (isEqual(str[x], match[y])) {
                x++;
                y++;
            } else if (next[y] == -1) {
                x++;
            } else {
                y = next[y];
            }
        }
        return y == match.length ? x - y : -1;
    }

    private static int[] getNextArray(String[] match) {
        if (match.length == 1) {
            return new int[]{-1};
        }
        int[] next = new int[match.length];
        int i = 2;
        int cn = 0;
        next[0] = -1;
        next[1] = 0;
        while (i < match.length) {
            if (isEqual(match[i - 1], match[cn])) {
                next[i++] = ++cn;
            } else if (cn > 0) {
                cn = next[cn];
            } else {
                next[i++] = 0;
            }
        }
        return next;
    }

    private static boolean isEqual(String a, String b) {
        if (a == null && b == null) {
            return true;
        } else {
            if (a== null || b == null) {
                return false;
            } else {
                return a.equals(b);
            }
        }
    }

    private static ArrayList<String> preSerial(TreeNode root) {
        ArrayList<String> result = new ArrayList<>();
        pre(result, root);
        return result;
    }

    private static void pre(ArrayList<String> result, TreeNode root) {
        if (root == null) {
            result.add(null);
        } else {
            result.add(String.valueOf(root.value));
            pre(result, root.left);
            pre(result, root.right);
        }
    }
```

