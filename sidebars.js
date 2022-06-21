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
      ],
    },
  ]
}

module.exports = sidebars
