// module.exports = {
//   someSidebar: {
//     // Docusaurus: [
//     //   'doc1', 
//     //   'doc2', 
//     //   'doc3',
//     // ],
//     Features: ['mdx'],
//     算法与程序设计: [
//       '前缀树与排序总结',
//     ],
//   },
// };

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
		'skill/algorithm/评价算法常用方法'
        'skill/algorithm/前缀树与排序总结',
      ],
    },
  ]
}

module.exports = sidebars
