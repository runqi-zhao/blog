require("dotenv").config();
module.exports = {
  title: "Runqi",
  tagline: "Learning is a Lifelong Process",
  //disableTitleTagline: true,
  //titleDelimiter: "*",
  url: "https://runqi.com/",
  baseUrl: "/",
  customFields: {
    // Put your custom environment here
    formAPI: process.env.FORM_SPREE,
    test: "test",
  },
  //onBrokenLinks: "throw",
  //onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",
  //organizationName: "zrsaber", // Usually your GitHub org/user name.
  projectName: "blog", // Usually your repo name.
  stylesheets: ["https://fonts.font.im/css?family=Raleway:500,700"],
  themeConfig: {
    navbar: {
      title: "Runqi",
      logo: {
        alt: "My Site Logo",
        src: "img/Runqi.png",
      },
      items: [
        {
          to: "docs/",
          activeBasePath: "docs",
          label: "Docs",
          position: "left",
        },
        { type: "localeDropdown", position: "right" },
        { to: "blog", label: "Blog", position: "right" },

        {
          href: "https://github.com/zrsaber",
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
              href: "https://github.com/zrsaber",
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
          editUrl:
            "https://github.com/zrsaber/blog/edit/master/website/",
        },
        blog: {
          path: "./blog",
          //routeBasePath: "/",
          showReadingTime: true,
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
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
