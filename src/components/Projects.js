import React from "react";
import Project from "./Project";
import Translate from "@docusaurus/Translate";
const Projects = () => {
  const works = [
    {
      stack: ["rust", "axum", "openGauss"],
      description:
        "邮件列表是开源项目最长使用的交流工具，但是当前的邮件列表服务在国内运营过程中存在邮件到达率、访问性方面有很多困难。使用Rust开发邮件列表服务，用户通过邮箱列表进行交互，管理员（由命令行创建）出邮箱列表，用户通过邮箱进行交流，相互进行回信。",
      title: "使用Rust开发邮件列表服务",
      github: "https://github.com/runqi-zhao/mail2list",
      url: "https://github.com/runqi-zhao/mail2list",
      image: "img/furniture-store.png",
      index: 0,
    },

    {
      stack: ["java", "apeing boot", "Restful API"],
      description:
        "管理员可以管理用户，并重置用户密码，可以禁用普通账号等相关操作 记录用户的登录IP、操作记录，管理员可以查询登录IP和操作记录。",
      title: "piflow-web",
      github: "https://github.com/cas-bigdatalab/piflow-web",
      url: "https://github.com/runqi-zhao/vue-flask-ocr",
      image: "img/Recipe-hub.png",
      index: 1,
    },
    {
      stack: ["Python", "CNN", "Backend"],
      description:"纸质医药处方信息提取系统最为重要的是信息提取，即将医生所写文字进行识别，转化为计算机中文本格式。纸质医药处方信息提取算法主要分为文字检测与文字识别两个部分，原始图像在进行传入之后，经过CTPN神经网络的文字检测，生成文本框。在生成文本框后会进行文字识别，文字识别是基于CRNN模型的文字识别，经过文字识别后会输出识别结果。",
      title: "纸质医药处方信息提取系统的设计与实现",
      github: "https://github.com/runqi-zhao/vue-flask-ocr",
      url: "https://github.com/runqi-zhao/vue-flask-ocr",
      image: "img/django-blog.png",
      index: 2,
    },
    // {
    //   stack: ["Mobile APP", "React Native"],
    //   description:
    //     "DoneWithIt is a cross-platform mobile application built with React Native(expo). It is a place where you can make your old staff become valuable again or get good products at preferential prices.",
    //   title: "Done With It",
    //   github: "https://github.com/HaochenQ/DoneWithIt",
    //   url: "https://expo.io/@haochen/projects/DoneWithIt",
    //   image: "img/APP.jpg",
    //   index: 3,
    // },
  ];
  return (
    <div className="projects">
      <h1 className="recent-projects">
        <Translate>Recent Projects</Translate>
      </h1>
      <div className="underline"></div>
      <div className="section-center projects-center">
        {works.map(
          ({ description, stack, title, github, url, image, index }) => (
            <Project
              stack={stack}
              key={index}
              description={description}
              title={title}
              url={url}
              github={github}
              image={image}
              index={index}
            />
          )
        )}
      </div>
    </div>
  );
};

export default Projects;
