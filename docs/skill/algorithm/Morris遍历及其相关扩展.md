---
id:  Morris遍历及其相关扩展
title: Morris遍历及其相关扩展
sidebar_label: Morris遍历及其相关扩展
description: Morris遍历及其相关扩展
---

一种遍历二叉树的方式，并且时间复杂度O(N)，额外空间复杂度O(1)通过利用原树中大量空闲指针的方式，达到节省空间的目的

## 流程

当前节点cur，一开始cur来到整个树头

1. cur无左树，cur=cur.right
2. cur有左树，找到左树最右的节点，记为mostRight
   1. mostRight的右指针指向null，mostRight.right =cur, cur = cur.left
   2. mostRight的右指针指向当前节点，mostRight.right = null, cur = cur.right
3. 当cur==cur.right时候，停止

![image-20220719173001103](https://zrsaber-blog.oss-cn-hangzhou.aliyuncs.com/img/image-20220719173001103.png)



```java
public static void morris(Node head) {
        if (head == null) {
            return;
        }
        Node cur = head;
        Node mostRight = null;
        while (cur != null) {
            mostRight = cur.left;
            if (mostRight != null) {
                while (mostRight.right != null & mostRight.right != cur) {
                    mostRight = mostRight.right;
                }
                if (mostRight.right == null) {
                    mostRight.right = cur;
                    cur = cur.left;
                    continue;
                } else {
                    mostRight.right = null;
                }
            }
            cur = cur.right;
        }
    }
```

基于此，可以实现先序，中序，后序遍历

先序遍历即在第一次到达这个节点的时候就打印

```java
public static void morrisPre(Node head) {
        if (head == null) {
            return;
        }
        Node cur = head;
        Node mostRight = null;
        while (cur != null) {
            mostRight = cur.left;
            if (mostRight != null) {
                while (mostRight.right != null & mostRight.right != cur) {
                    mostRight = mostRight.right;
                }
                if (mostRight.right == null) {
                    mostRight.right = cur;
                    System.out.println(cur.value + " ");
                    cur = cur.left;
                    continue;
                } else {
                    mostRight.right = null;
                }
            } else {
                System.out.println(cur.value + " ");
            }
            cur = cur.right;
        }
        System.out.println();
    }
```

中序是如果这个节点来了两次，那么第二次打印这个节点。

```java
public static void morrisIn(Node head) {
        if (head == null) {
            return;
        }
        Node cur = head;
        Node mostRight = null;
        while (cur != null) {
            mostRight = cur.left;
            if (mostRight != null) {
                while (mostRight.right != null & mostRight.right != cur) {
                    mostRight = mostRight.right;
                }
                if (mostRight.right == null) {
                    mostRight.right = cur;
                    cur = cur.left;
                    continue;
                } else {
                    mostRight.right = null;
                }
            }
            //如果说只来一次，肯定要走这一句，如果说第二次，中else分支，也会来到这一句
            System.out.println(cur.value + " ");
            cur = cur.right;
        }
        System.out.println();
    }
```

后序的话， 找到第二次出现的位置，逆序打印这个值的左树的右边界，在所有的过程完成之后，单独打印如现在Mirrors遍历的序列是1，2，4，2，5，1，3，6，3，7；现在逆序打印2的左树的右边界，打印出4，然后找到1，逆序打印左树的右边界就是5，2，然后找到3，逆序打印左边界就是6，最后单独打印一下整个树的右边界7，3，1

逆序打印可以使用单链表反转进行实现

```java
 public static void morrisPos(Node head) {
        if (head == null) {
            return;
        }
        Node cur = head;
        Node mostRight = null;
        while (cur != null) {
            mostRight = cur.left;
            if (mostRight != null) {
                while (mostRight.right != null & mostRight.right != cur) {
                    mostRight = mostRight.right;
                }
                if (mostRight.right == null) {
                    mostRight.right = cur;
                    cur = cur.left;
                    continue;
                } else {
                    mostRight.right = null;
                    printEdge(cur.left);
                }
            }
            cur = cur.right;
        }
        printEdge(head);
        System.out.println();
    }

    private static void printEdge(Node head) {
        Node tail = reverseEdge(head);
        Node cur = tail;
        while (cur != null) {
            System.out.println(cur.value + " ");
            cur = cur.right;
        }
        reverseEdge(head);
    }

    private static Node reverseEdge(Node head) {
        Node pre = null;
        Node next = null;
        while (head != null) {
            next = head.right;
            head.right = pre;
            pre = head;
            head = next;
        }
        return pre;
    }
```

## 实质

建立一种机制：

1. 对于没有左子树的节点只到达一次
2. 对于有左子树的节点会到达两次
3. morris遍历时间复杂度依然是O(N)

## 题目

给定一棵二叉树的头节点head求以head为头的树中，最小深度是多少？

### 思路与解析

#### 常规思路

遍历左右子树，找到最小的深度，进行返回。

时间复杂度O(n)，需要遍历所有的节点。
空间复杂度为O(h)。其中，h 表示二叉树的高度，也就是递归使用的系统调用栈的高度。

1. 记头节点为 root
2. 左子树为空，求右子树的最小高度 + 1
3. 右子树为空，求左子树的最小高度 + 1
4. 左、右子树不为空，求左子树的最小高度 + 1，求右子树的最小高度 + 1
5. 左、右子树都为空，最小高度为 1

```java
public static int minHeight1(Node head) {
        if (head == null) {
            return 0;
        }
        return process(head);
    }

    private static int process(Node head) {
        if (head.left == null && head.right == null) {
            return 1;
        }
        int leftHeight = Integer.MAX_VALUE;
        if (head.left != null) {
            leftHeight = process(head.left);
        }
        int rightHeight = Integer.MAX_VALUE;
        if (head.right != null) {
            rightHeight = process(head.right);
        }
        return 1 + Math.min(leftHeight, rightHeight);
    }
```

#### Morris遍历

上面的的思路在进行遍历的时候，空间复杂度高。可以优化。

Morris遍历，时间复杂度O(n)，需要遍历所有的节点。空间复杂度为O(1)。

思路：

1. 首先,解决在morris遍历中得到每一个当前节点的深度。
2. 遍历的当前节点记为 cur，cur的深度是 level
3. morris遍历中，下一个节点深度是多少?

morris遍历的规则:

1. 如果cur没有左子树，cur向右移动（cur = cur.right），那么下一个节点就是cur的右孩子，深度：level+1。
2. 如果cur有左子树，找到cur左子树上最右的节点，记mostRight。
   1. 如果 mostRight 的 right 指针指向null，让其指向cur（mostRight.right = cur），cur向左移动（cur =.cur.left），那么下一个节点就是cur的左孩子，深度：level+1。
   2. 如果 mostRight 的right 指针指向 cur，让其指向空（ mostRight.right = null），cur向右移动（cur= cur.right）假设下一个节点记为next,根据 morris遍历可知，cur是next左子树上最右的节点。next 的深度 = level - next左子树的右边界的节点数。

利用以上策略，就能在morris遍历中得到每一个节点的深度。

其次，解决如何在morris遍历中发现每一个叶节点

- 因为在morris遍历中，我们会人为修改某些节点的 right 指针，让其指向上级的某个节点。这样，当用morris遍历到某个节点×的时候，也许×原本是叶节点，但此时却发现不了，因为此时X的 right 指针指向上级了(不满足X.left == null && X.right = null)。

- 所以，为了发现所有的叶节点，我们把发现叶节点的时机放在morris遍历中回到自己两次，且第二次回到这个节点的时候。

![在这里插入图片描述](https://img-blog.csdnimg.cn/img_convert/4f72928fab7f9bf57607322c6877cce6.png)


比如，使用Mirror遍历二叉树时（上图所示）：

- 当第二次回到2的时候，看看1是不是叶节点;
- 当第二次回到4的时候，看看3是不是叶节点;
- 当第二次回到6的时候，看看5是不是叶节点;
- 最后单独看一下整棵树的最右节点是不是叶节点。

这样就能在morris遍历中找到所有的叶节点了。做到了在morris遍历中，每一个节点的深度都能得到;也做到了在morris遍历中发现所有的叶节点。这个问题自然可以求解，遍历的代价就是morris 遍历的代价，时间复杂度为O(N)，额外空间复杂度O(1)。

```java
 public static int minHeight2(Node head) {
        if (head == null) {
            return 0;
        }
        Node cur = head;
        Node mostRight = null;
        int curLevel = 0;
        int minHeight = Integer.MAX_VALUE;
        while (cur != null) {
            mostRight = cur.left;
            if (mostRight != null) {
                int leftHeight = 1;
                while (mostRight.right != null && mostRight.right != cur) {
                    leftHeight++;
                    mostRight = mostRight.right;
                }
                if (mostRight.right == null) {
                    mostRight.right = cur;
                    cur = cur.left;
                    curLevel += 1;
                    continue;
                } else {
                    if (mostRight.left == null) {
                        minHeight = Math.min(minHeight, curLevel);
                    }
                    curLevel -= leftHeight;
                    mostRight.right = null;
                }
            } else {
                curLevel++;
            }
            cur = cur.right;
        }
        //最后遍历对应的最子树
        int finalRight = 1;
        cur = head;
        while (cur.right != null) {
            finalRight++;
            cur = cur.right;
        }
        if (cur.left == null && cur.right == null) {
            minHeight = Math.min(finalRight, minHeight);
        }
        return minHeight;
    }
```

## 使用

什么时候使用Morris遍历？

当我们不需要左右两个树的信息时，可以使用此遍历
