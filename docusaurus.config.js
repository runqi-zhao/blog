require("dotenv").config();
const math = require("remark-math");
const katex = require("rehype-katex");
module.exports = {
  title: "Runqi",
  tagline: "Learning is a Lifelong Process",
  //disableTitleTagline: true,
  //titleDelimiter: "*",
  url: "https://blog-delta-three-87.vercel.app/",
  baseUrl: "/",
  customFields: {
    // Put your custom environment here
    formAPI: process.env.FORM_SPREE,
    test: "test",
  },
  //onBrokenLinks: "throw",
  //onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",
  //organizationName: "runqi-zhao", // Usually your GitHub org/user name.
  projectName: "blog", // Usually your repo name.
  stylesheets: ["https://fonts.font.im/css?family=Raleway:500,700"],
  themeConfig: {
    announcementBar: {
      id: "feature_release", // Any value that will identify this message.
      content: `⭐️ If you like it, give it a star on <a href="https://github.com/runqi-zhao/blog">GitHub</a>`,
      backgroundColor: "#fafbfc", // Defaults to `#fff`.
      textColor: "#091E42", // Defaults to `#000`.
    },
    // prism: {
    //   additionalLanguages: ['java'],
    // },
    prism: {
      additionalLanguages: ['powershell','java','sql','cpp','c','docker','git','antlr4'],
    },
    navbar: {
      title: "Runqi",
      logo: {
        alt: "My Site Logo",
        src: "img/Runqi.png",
      },
      items: [
        {
          to: "docs/skill",
          activeBasePath: "docs",
          label: "Docs",
          position: "left",
        },
        { type: "localeDropdown", position: "right" },
        { to: "blog", label: "Blog", position: "right" },

        {
          href: "https://github.com/runqi-zhao",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Social Media",
          items: [
            {
              label: "Email",
              href: "mailto:z529978097@gmail.com",
            },
            {
              label: "Facebook",
              href: "https://www.facebook.com/profile.php?id=100063797510792",
            },
          ],
        },
        // {
        //   title: "Docusaurus",
        //   items: [
        //     {
        //       label: "Style Guide",
        //       to: "docs/",
        //     },
        //     {
        //       label: "Second Doc",
        //       to: "docs/doc2/",
        //     },
        //   ],
        // },
        // {
        //   title: "Community",
        //   items: [
        //     {
        //       label: "Stack Overflow",
        //       href: "https://stackoverflow.com/questions/tagged/docusaurus",
        //     },
        //     {
        //       label: "Discord",
        //       href: "https://discordapp.com/invite/docusaurus",
        //     },
        //     {
        //       label: "Twitter",
        //       href: "https://twitter.com/docusaurus",
        //     },
        //   ],
        // },
        {
          title: "More",
          items: [
            {
              label: "Blog",
              to: "blog",
            },
            {
              label: "GitHub",
              href: "https://github.com/runqi-zhao",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Runqi. Built with Docusaurus.`,
    },
  },
  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          // Please change this to your repo.
          // editUrl:
          //   "https://github.com/runqi-zhao/blog/edit/master/website/",
          remarkPlugins: [math],
          rehypePlugins: [katex],
          showLastUpdateTime: true,
        },
        blog: {
          path: "./blog",
          //routeBasePath: "/",
          remarkPlugins: [math],
          rehypePlugins: [katex],
          showReadingTime: true,
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],
  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.13.24/dist/katex.min.css',
      type: 'text/css',
      integrity:
        'sha384-odtC+0UGzzFL/6PNoE8rX/SPcQDXBJ+uRepguP4QkPCm2LBxH3FA3y+fKSiJ+AmM',
      crossorigin: 'anonymous',
    },
  ],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh-cn"],
    localeConfigs: {
      en: {
        label: "English",
      },
      "zh-cn": {
        label: "中文",
      },
    },
  },
};
