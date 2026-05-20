import cardBGImage from '../assets/about_devs_bg.png';

import './versions.css';


export function AboutSystemVersion() {
  return (
    <section>
      <div className="body-content-text-versions">
        EARIST Student Affairs and Services (SAS) Digital Inventory System
      </div>

      <div className="body-header-font-versions">
        <details>
          <summary>Version 0.2</summary>
          <div className="versions-card"
            style={{
              marginTop: '8px',
              backgroundImage: `url(${cardBGImage})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat'
            }}
          >
            <div className="body-content-text-versions" style={{ color: '#2c3e50' }}>
              <p>
                May 19, 2026 - May 20, 2026
              </p>
            </div>
          </div>
        </details>
        <details>
          <summary>Version 0.1</summary>
          <div className="versions-card"
            style={{
              marginTop: '8px',
              backgroundImage: `url(${cardBGImage})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat'
            }}
          >
            <div className="body-content-text-versions" style={{ color: '#2c3e50' }}>
              <p>
                May 04, 2026 - May 18, 2026
              </p>
            </div>
          </div>
        </details>
      </div>

      <div className="body-header-font-versions">
        <details>
          <summary>About Devs</summary>
          <div className="versions-card"
            style={{
              marginTop: '8px',
              backgroundImage: `url(${cardBGImage})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat'
            }}
          >
            <div className="body-content-text-versions" style={{ color: '#2c3e50', listStyleType: 'none', paddingLeft: '0', marginTop: '10px' }}>
              <p>
                This system is developed by Data Science Interns of Management Information Services (MIS) from Eulogio "Amang" Rodriguez Institute of Science and Technology (EARIST) as part of their On-the-Job Training (OJT) program. The team is composed of:
              </p>
              <p style={{ listStyleType: 'none', paddingLeft: '0', marginTop: '10px' }}>
                <li><strong>Rolan Jay P. Samonte</strong> - Lead Back-end Developer</li>
                <li><strong>Acee Medinaceli</strong> - Lead Front-end Developer</li>
                <li><strong>John Clifford O. Martinez</strong> - Cross-Stack Developer</li>
              </p>
            </div>
          </div>
        </details>
      </div>

    </section>
  );
}