import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDoubleRight } from "@fortawesome/free-solid-svg-icons";
import Translate from "@docusaurus/Translate";
const experience = [
  {
    company: "University of Jms",
    position: "Master of Computer Science Technology",
    date: "September 2021 - June 2024 ",
    desc: {
      1: "Gained knowledge about fundamentals of the fields of Information Technology and Computer Science.",
      2: "In-depth understanding of modern cloud-driven network architecture with practice with Unimelb advanced cloud platform-Nectar.",
      3: "Acquired a comprehensive understanding of the integration of Machine Learning models and modern Web Development by finishing the graduation project.",
    },
  },
  {
    company: "UESTC",
    position: "Exchange Graduate",
    date: "September 2019 - June 2021 ",
    desc: {
      1: "Learnt modern web development and got familar with several modern web framworks.",
      2: "Refined web development skills with hands on projects",
      3: "Excelled in user experience and user interfaces.",
    },
  },
  {
    company: "UESTC,Zhongshan Institute",
    position: "Computer Science Graduate",
    date: "September 2017 - July 2019 ",
    desc: {
      1: "Implemented reusable components which helped save development time and budget for our team.",
      2: "Involved in the planning and web design of a new project, designed the structure of the website with java and spring.",
      3: "Collaborated with product team members to implement new feature development.",
    },
  },
];
function Experience() {
  const [value, setValue] = useState(0);
  const { company, position, date, desc } = experience[value];

  return (
    <section className="experience">
      <h2 className="experience-title">
        <Translate>Experience</Translate>
      </h2>
      <div className="underline"></div>
      <div className="experiences-center">
        <div className="btn-container">
          {experience.map((item, index) => {
            return (
              <button
                key={index}
                onClick={() => setValue(index)}
                className={`experience-btn ${index === value && "active-btn"}`}
              >
                {item.company}
              </button>
            );
          })}
        </div>
        <article className="experience-info">
          <h3>{position}</h3>
          <h4>{company}</h4>
          <p className="experience-date">{date}</p>
          {Object.keys(desc).map((key, index) => {
            return (
              <div key={index} className="experience-desc">
                <FontAwesomeIcon
                  icon={faAngleDoubleRight}
                  className="experience-icon"
                ></FontAwesomeIcon>
                <p>{desc[key]}</p>
              </div>
            );
          })}
        </article>
      </div>
    </section>
  );
}

export default Experience;
