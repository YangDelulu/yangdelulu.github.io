import { Link } from 'react-router-dom'
import './About.css'

export default function About() {
  return (
    <div className="about-page">
      <Link to="/" className="back-link">&larr; Home</Link>

      {/* Hero */}
      <header className="hero">
        <h1 className="hero-name">Yang Lu</h1>
        <p className="hero-tagline">Software Engineer</p>
        <div className="hero-contact">
          <a href="mailto:YangLu.dev@gmail.com">YangLu.dev@gmail.com</a>
        </div>
      </header>

      {/* Skills */}
      <section className="section">
        <h2 className="section-title">Skills</h2>
        <div className="skills-grid">
          <div className="skill-row">
            <span className="skill-label">Languages</span>
            <span className="skill-tags">
              {['Python', 'C++', 'TypeScript', 'JavaScript', 'Java', 'Obj-C', 'SQL'].map(s => (
                <span key={s} className="tag">{s}</span>
              ))}
            </span>
          </div>
          <div className="skill-row">
            <span className="skill-label">Frameworks</span>
            <span className="skill-tags">
              {['React', 'Electron', 'Node.js', 'OpenCV', 'EasyOCR', 'Next.js', 'Node-Addon-API'].map(s => (
                <span key={s} className="tag">{s}</span>
              ))}
            </span>
          </div>
          <div className="skill-row">
            <span className="skill-label">Tools</span>
            <span className="skill-tags">
              {['Azure', 'Git', 'Power BI', 'KQL', 'CMake', 'Mocha', 'Fiddler', 'Ollama'].map(s => (
                <span key={s} className="tag">{s}</span>
              ))}
            </span>
          </div>
        </div>
      </section>

      {/* Experience */}
      <section className="section">
        <h2 className="section-title">Experience</h2>

        <div className="experience-block">
          <div className="exp-header">
            <h3 className="company">Microsoft</h3>
            <span className="location">Redmond, WA</span>
          </div>

          <div className="role">
            <div className="role-header">
              <span className="role-title">Software Engineer &middot; Authentication Telemetry System</span>
              <span className="role-dates">2023 &ndash; 2025</span>
            </div>
            <ul>
              <li>Architected and unified fragmented telemetry across client and servers for authentication, establishing key metrics that led to a <strong>7-hour reduction in time-to-detection</strong> for critical outages affecting <strong>2M users</strong></li>
              <li>Engineered scalable Azure Data Factory pipelines to monitor authentication reliability, delivering insights that <strong>reduced auth errors by 32%</strong> for over 100 core clients and services</li>
              <li>Led cross-team initiatives to enhance authentication UX, building telemetry instrumentation and PowerBI dashboards for SSO and silent sign-in scenarios <strong>averaging 80K users weekly</strong></li>
              <li>Deployed Azure AI Metrics Advisor alerting to proactively <strong>prevent 2-3 high-severity outages weekly</strong>, significantly stabilizing critical production systems</li>
              <li>Redesigned data gathering for the <strong>Secure Future Initiative</strong>, enabling MATS to scale and support a <strong>700% increase</strong> in partners and services</li>
            </ul>
          </div>

          <div className="role">
            <div className="role-header">
              <span className="role-title">Software Engineer &middot; OneAuth</span>
              <span className="role-dates">2020 &ndash; 2023</span>
            </div>
            <ul>
              <li>Engineered reliability and performance for the cross-platform authentication library, directly serving <strong>1.2 billion daily active users</strong></li>
              <li>Architected Intune MAM APIs to manage custom startup sequences, enabling <strong>application security control and governance</strong> across all Microsoft Office products</li>
              <li>Automated Azure DevOps CI/CD pipelines using Mocha/WebdriverIO, maintaining <strong>zero production incidents</strong> across 5 internal teams and 20 million users</li>
              <li>Drove code reusability by developing <strong>Electron test applications</strong>, building a streamlined stack between the app, node-addon-api-wrapper, and the core C++ library</li>
            </ul>
          </div>
        </div>

        <div className="experience-block">
          <div className="exp-header">
            <h3 className="company">Zynga</h3>
            <span className="location">Toronto, ON</span>
          </div>
          <div className="role">
            <div className="role-header">
              <span className="role-title">SWE Intern &middot; Boggle With Friends</span>
              <span className="role-dates">2018</span>
            </div>
            <ul>
              <li>Built and deployed a full-stack Daily Quests feature, directly <strong>increasing user retention and engagement</strong></li>
              <li>Developed a robust Android UI layer to ensure seamless cross-device display across <strong>dozens of screen ratios and resolutions</strong></li>
            </ul>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="section">
        <h2 className="section-title">Projects</h2>

        <div className="project-card">
          <div className="project-header">
            <h3 className="project-name">AI Play Games</h3>
            <span className="project-tech">React &middot; Flask &middot; OCR &middot; Computer Vision</span>
          </div>
          <ul>
            <li>Developed a high-accuracy <strong>computer vision pipeline</strong> using OpenCV and EasyOCR to dynamically automate repetitive in-game tasks</li>
            <li>Designed and built a React front-end for remote configuration and monitoring, <strong>removing 90% of un-fun play time</strong></li>
          </ul>
        </div>

        <div className="project-card">
          <div className="project-header">
            <h3 className="project-name">Discord LLM</h3>
            <span className="project-tech">Ollama &middot; RAG &middot; Web Scrapers</span>
          </div>
          <ul>
            <li>Built a RAG-augmented LLM chatbot to answer complex game inquiries, leveraging a targeted web scraper for <strong>ground-truth data enrichment</strong></li>
            <li>Sustained high response accuracy despite bi-weekly game patches</li>
          </ul>
        </div>
      </section>

      {/* Education */}
      <section className="section">
        <h2 className="section-title">Education</h2>
        <div className="education-block">
          <div className="edu-header">
            <h3 className="edu-school">University of Waterloo</h3>
            <span className="edu-year">2020</span>
          </div>
          <p className="edu-degree">Bachelor's of Software Engineering</p>
        </div>
      </section>

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} Yang Lu</p>
      </footer>
    </div>
  )
}
