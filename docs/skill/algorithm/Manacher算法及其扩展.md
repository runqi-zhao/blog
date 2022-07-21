---
id: Manacher算法及其扩展
title: Manacher算法及其扩展
sidebar_label: Manacher算法及其扩展
description: Manacher算法及其扩展
---

## 原始问题

Manacher算法是由题目“求字符串中最长回文子串的长度”而来。比如abcdcb的最长回文子串为bcdcb，其长度为5。

我们可以遍历字符串中的每个字符，当遍历到某个字符时就比较一下其左边相邻的字符和其右边相邻的字符是否相同，如果相同则继续比较其右边的右边和其左边的左边是否相同，如果相同则继续比较……，我们暂且称这个过程为向外“扩”。当“扩”不动时，经过的所有字符组成的子串就是以当前遍历字符为中心的最长回文子串。

我们每次遍历都能得到一个最长回文子串的长度，使用一个全局变量保存最大的那个，遍历完后就能得到此题的解。但分析这种方法的时间复杂度：当来到第一个字符时，只能扩其本身即1个；来到第二个字符时，最多扩两个；……；来到字符串中间那个字符时，最多扩(n-1)/2+1个；因此时间复杂度为1+2+……+(n-1)/2+1即O(N^2)。但Manacher算法却能做到O(N)。

注意：在找回文的过程中，一般要在每个字符中间插入#之类的间隔符，来避免奇数和偶数的差别回文

## Manacher算法

补充概念：
回文直径：以一个位置为中心，扩出来整个串的长度为回文直径
回文半径：以一个位置为中心，扩出来半个串长度为回文半径
回文数组：对于字符串而言，从0位置开始，一直到最后，新建一个数组，数组中保存对应位置的回文半径。
最右回文右边界：所有回文半径中，最靠右的边界，回文右边界只要没更新，记录最早取得此处的回文中心。

Manacher在向外扩展的过程整体跟之前的算法相似，但是有加速。

### 步骤

1. 回文右边界R不包含i，此时暴力进行拓展，知道R包含i。
2. i位置在回文边界内时，知道了回文的右边界，也就知道了回文左边界，对称中心为c，右边界为R，此时关于c做i的对称点i'。
   1. i'在c为中心的回文串里面，此时i的回文半径与i'相同
   2. i位置的对称位置i’的回文半径越过了以c为中心的左边范围。（i‘扩出的范围以c为中心的回文没包住，存在一部分在回文直径外面）此时i的回文半径是R-i。
   3. 正好i'的回文半径正好跟左边L相等，此时可以直到i的回文半径大于等于i-R，然后需要判断R后面的位置，重新返回第一步。

这个原理还算好理解，但是coding中存在大量的边界条件，需要仔细学习

```java
public static int manacher(String s) {
        if (s == null || s.length() == 0) {
            return 0;
        }
        //将字符串转换为特殊形式
        char[] str = manacherString(s);
        // 回文半径的大小
        int[] pArr = new int[str.length];
        int C = -1;
        // 讲述中：R代表最右的扩成功的位置。中：最右的扩成功位置的，再下一个位置
        int R = -1;
        int max = Integer.MIN_VALUE;
        for (int i = 0; i != str.length; i++) {
            // i位置扩出来的答案，i位置扩的区域，至少是多大。
            pArr[i] = R > i ? Math.min(pArr[2 * C - i], R - i) : 1;
            while (i + pArr[i]  < str.length && i - pArr[i] > -1) {
                if (str[i + pArr[i]] == str[i - pArr[i]]) {
                    pArr[i]++;
                } else {
                    break;
                }
            }
            if (i + pArr[i] > R) {
                R = i + pArr[i];
                C = i;
            }
            max = Math.max(max,pArr[i]);
        }
        return max - 1;

    }

    private static char[] manacherString(String s) {
        char[] chars = s.toCharArray();
        char[] res = new char[2 * s.length() + 1];
        int index = 0;
        for (int i = 0; i != res.length; i++) {
            res[i] = (i & 1) == 0 ? '#' : chars[index++];
        }
        return res;
    }
```

## 练习

在末尾加最少字符，使整体为回文串

【思路】改写Manacher，整个字符串一旦出现回文右边界到达最后一位，回文字符串之前的内容全部倒序添加到最后，即可形成回文字符串

```java
 public static String shortestEnd(String str) {
        if (str == null || str.length() == 0) {
            return null;
        }
        char[] charArr = manacherString(str);
        int[] pArr = new int[charArr.length];
        int c = -1;
        int r = -1;
        int maxContainsEnd = -1;
        for (int i = 0; i < charArr.length; i++) {
            pArr[i] = i < r ? Math.min(pArr[2 * c - i], r - i) : 1;
            while (i + pArr[i] < charArr.length && i - pArr[i] > -1) {
                if (charArr[i + pArr[i]] == charArr[i - pArr[i]]) {
                    pArr[i]++;
                } else {
                    break;
                }
            }
            if (i + pArr[i] > r) {
                r = i + pArr[i];
                c = i;
            }
            if (r == charArr.length) {
                maxContainsEnd = pArr[i];
                break;
            }
        }
        char[] res = new char[str.length() - maxContainsEnd + 1];
        for (int i = 0; i < res.length; i++) {
            res[res.length - 1 - i] = charArr[i * 2 + 1];
        }
        return String.valueOf(res);
    }

    private static char[] manacherString(String str) {
        char[] chars = str.toCharArray();
        char[] res = new char[str.length() * 2 + 1];
        int index = 0;
        for (int i = 0; i < res.length; i++) {
            res[i] = (i & 1) == 0 ? '#' : chars[index++];
        }
        return res;
    }
```

