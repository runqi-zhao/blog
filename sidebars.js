/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  skill: [
    'skill/introduction',
    {
      label: '算法',
      type: 'category',
      link: {
        type: 'generated-index',
      },
      items: [
        'skill/algorithm/评价算法常用方法',
        'skill/algorithm/递归与哈希表',
        'skill/algorithm/排序',
        'skill/algorithm/比较器与堆',
        'skill/algorithm/前缀树与排序总结',
        'skill/algorithm/链表以及常见面试题',
        'skill/algorithm/二叉树',
        'skill/algorithm/二叉树的递归套路',
        'skill/algorithm/贪心算法',
        'skill/algorithm/图',
        'skill/algorithm/暴力递归',
        'skill/algorithm/动态规划',
        'skill/algorithm/滑动窗口与单调栈',
        'skill/algorithm/类似斐波那契数列的递归',
        'skill/algorithm/kmp算法',
        'skill/algorithm/BFPRT算法',
        'skill/algorithm/Manacher算法及其扩展',
        'skill/algorithm/Morris遍历及其相关扩展',
        'skill/algorithm/线段树',
        'skill/algorithm/打表技巧和矩阵处理技巧',
        'skill/algorithm/数组问题',
      ],
    },
    {
      label: 'jvm',
      type: 'category',
      link: {
        type: 'generated-index',
      },
      items: [
        'skill/jvm/jvm入门',
        'skill/jvm/class文件格式',
      ],
    },
  ],
}

module.exports = sidebars