---
id: BFPRT算法
title: BFPRT算法
sidebar_label: BFPRT算法
description: BFPRT算法
---

在一个[数组](https://so.csdn.net/so/search?q=数组&spm=1001.2101.3001.7020)中找出第k大的数

1. 暴力解法：先排序，再找

2. [快速排序](https://so.csdn.net/so/search?q=快速排序&spm=1001.2101.3001.7020)：参考荷兰国旗问题，随机选数，分为左中右三个部分，然后按数量选择左边或右边区域，继续按荷兰国旗问题分三块，直到取到序号k在中间等于区域，则此时的中间数就是第k大的数。

3. BFPRT算法。

## 暴力解法

使用排序，然后查找。

这里使用大根堆进行排序

```java
 // 利用大根堆，时间复杂度O(N*logK)
    public static int minKth1(int[] arr, int k) {
        PriorityQueue<Integer> maxHeap = new PriorityQueue<>(new MaxHeapComparator());
        for (int i = 0; i < k; i++) {
            maxHeap.add(arr[i]);
        }
        for (int i = k; i < arr.length; i++) {
            if (arr[i] < maxHeap.peek()) {
                maxHeap.poll();
                maxHeap.add(arr[i]);
            }
        }
        return maxHeap.peek();
    }

    private static class MaxHeapComparator implements Comparator<Integer> {
        @Override
        public int compare(Integer o1, Integer o2) {
            return o2 - o1;
        }
    }
```

## 快速排序

```java
public static int minKth2(int[] array, int k) {
    int[] arr = copyArray(array);
    return process2(arr, 0, arr.length - 1, k - 1);
}

private static int process2(int[] arr, int L, int R, int index) {
    if (L == R) {
        return arr[L];
    }
    int pivot = arr[L + (int) (Math.random() * (R - L + 1))];
    int[] range = partition(arr, L, R, pivot);
    if (index >= range[0] && index <= range[1]) {
        return arr[index];
    } else if (index < range[0]) {
        return process2(arr, L, range[0] - 1, index);
    } else {
        return process2(arr, range[1] + 1, R, index);
    }
}

private static int[] partition(int[] arr, int L, int R, int pivot) {
    int less = L - 1;
    int more = R + 1;
    int cur = L;
    while (cur < more) {
        if (arr[cur] < pivot) {
            swap(arr, ++ less, cur++);
        } else if (arr[cur] >pivot) {
            swap(arr, cur, --more);
        } else {
            cur++;
        }
    }
    return new int[] {less + 1, more - 1};
}
```

## BFPRT算法

这里其实建议在听课，总结的肯定有缺陷

随机选出一个数，将数组以该数作比较划分为三个部分，则`=`部分的数是数组中第几小的数不难得知，接着对（如果第K小的数在>部分）部分的数递归该过程，直到=部分的数正好是整个数组中第K小的数。这种做法不难求得时间复杂度的数学期望为O(NlogN)（以2为底）。但这毕竟是数学期望，在实际工程中的表现可能会有偏差，而BFPRT算法能够做到时间复杂度就是O(NlogN)。

BFPRT算法首先将数组按5个元素一组划分成N/5个小部分（最后不足5个元素自成一个部分），再这些小部分的内部进行排序，然后将每个小部分的中位数取出来再排序得到中位数：



![img](https://pic4.zhimg.com/80/v2-d99a7223264be6ae816eedb0a19b9713_1440w.png)



BFPRT求解此题的步骤和开头所说的步骤大体类似，但是“随机选出一个的作为比较的那个数”这一步替换为上图所示最终选出来的那个数。

O(NlogN)的证明，为什么每一轮partition中的随机选数改为BFPRT定义的选数逻辑之后，此题的时间复杂度就彻底变为O(NlogN)了呢？下面分析一下这个算法的步骤：

BFPRT算法，接收一个数组和一个K值，返回数组中的一个数

1. 数组被划分为了N/5个小部分，每个部分的5个数排序需要O(1)，所有部分排完需要O(N/5)=O(N)、
2. 取出每个小部分的中位数，一共有N/5个，递归调用BFPRT算法得到这些数中第(N/5)/2小的数（即这些数的中位数），记为pivot
3. 以pivot作为比较，将整个数组划分为pivot三个区域
4. 判断第K小的数在哪个区域，如果在=区域则直接返回pivot，如果在`区域，则将这个区域的数递归调用BFPRT算法 `
5. `base case`：在某次递归调用BFPRT算法时发现这个区域只有一个数，那么这个数就是我们要找的数。

```java
 public static int minKth3(int[] array, int k) {
        int[] arr = copyArray(array);
        return bfprt(arr, 0, arr.length - 1, k - 1);
    }

    private static int bfprt(int[] arr, int L, int R, int index) {
        if (L == R) {
            return arr[L];
        }
        int pivot = medianOfMedians(arr, L, R);
        int[] range = partition(arr, L, R, pivot);
        if (index >= range[0] && index <= range[1]) {
            return arr[index];
        } else if (index < range[0]) {
            return bfprt(arr, L, range[0] - 1, index);
        } else {
            return bfprt(arr, range[1] + 1, R, index);
        }
    }

    private static int medianOfMedians(int[] arr, int L, int R) {
        int size = R - L + 1;
        int offset = size % 5 == 0 ? 0 : 1;
        int[] mArr = new int[size / 5 + offset];
        for (int team = 0; team < mArr.length; team++) {
            int teamFirst = L + team * 5;
            mArr[team] = getMedians(arr, teamFirst, Math.min(R, teamFirst + 4));
        }
        return bfprt(mArr, 0, mArr.length - 1, mArr.length /2);
    }

    private static int getMedians(int[] arr, int L, int R) {
        insertSort(arr, L, R);
        return arr[(L + R) / 2];
    }

    private static void insertSort(int[] arr, int L, int R) {
        for (int i = L + 1; i <= R; i++) {
            for (int j = i - 1; j >= L && arr[j] > arr[j + 1] ; j--) {
                swap(arr, j, j + 1);
            }
        }
    }
```

重新理解 反复理解 这个挺重要
