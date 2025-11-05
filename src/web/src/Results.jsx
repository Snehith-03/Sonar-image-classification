import React from 'react';
import { Download, X, Fish, User, Ship, Plane, Mountain, AlertCircle, Waves } from 'lucide-react'; 
import './SonarDashboard.css';

const Results = ({ classificationResult, onReset, onBack }) => {
  if (!classificationResult) {
    return (
      <div className="results-container">
        <div className="no-results">
          <Waves size={64} color="#64748b" />
          <h2>No Analysis Results</h2>
          <p>Please upload and analyze a SONAR image first</p>
          <button onClick={onBack} className="back-button">
            Back to Upload
          </button>
        </div>
      </div>
    );
  }

  const downloadResults = () => {
    const link = document.createElement('a');
    link.href = classificationResult.processed;
    link.download = `classified_${classificationResult.filename}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <div className="header-content">
          <div className="header-title">
            <Waves size={32} color="#60a5fa" />
            <h1>SONAR AI Analysis Results</h1>
          </div>
          <div className="header-actions">
            <button onClick={downloadResults} className="download-button">
              <Download size={20} />
              Download Report
            </button>
            <button onClick={onReset} className="reset-button">
              <X size={20} />
              New Analysis
            </button>
          </div>
        </div>
      </div>

      <div className="results-content">
        <div className="results-grid">
          {/* Left Column - Main Content */}
          <div className="main-column">
            {/* AI Description */}
            <div className="analysis-card">
              <h3>AI Analysis Description</h3>
              <div className="description-box">
                <p>{classificationResult.aiDescription}</p>
              </div>
              <p className="description-note">
                Automatically generated description based on AI analysis of sonar imagery
              </p>
            </div>

            {/* Images Section */}
            <div className="images-grid">
              {/* Original Image */}
              <div className="image-card">
                <h4>Original SONAR Image</h4>
                <div className="image-container">
                  <img
                    src={classificationResult.original}
                    alt="Original sonar scan"
                  />
                </div>
                <div className="image-meta">
                  <span>{classificationResult.filename}</span>
                </div>
              </div>

              {/* Heatmap */}
              <div className="image-card">
                <h4>Classification Heatmap</h4>
                <div className="image-container">
                  <img
                    src={classificationResult.heatmap}
                    alt="Classification heatmap"
                  />
                </div>
                <div className="heatmap-legend">
                  <span className="legend-low">Low Confidence</span>
                  <div className="legend-colors">
                    <div className="color-blue"></div>
                    <div className="color-green"></div>
                    <div className="color-yellow"></div>
                    <div className="color-red"></div>
                  </div>
                  <span className="legend-high">High Confidence</span>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="metadata-card">
              <h4>SONAR Parameters</h4>
              <div className="metadata-grid">
                <div className="metadata-item">
                  <span className="metadata-label">Depth:</span>
                  <span className="metadata-value">{classificationResult.metadata.depth}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Frequency:</span>
                  <span className="metadata-value">{classificationResult.metadata.frequency}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Resolution:</span>
                  <span className="metadata-value">{classificationResult.metadata.resolution}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Processed:</span>
                  <span className="metadata-value">{classificationResult.metadata.timestamp}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Classifications */}
          <div className="sidebar-column">
            {/* Classifications */}
            <div className="classifications-card">
              <h4>AI Classifications</h4>
              <div className="classifications-list">
                {classificationResult.classifications.map((classification, index) => (
                  <div key={index} className="classification-item">
                    <div className="classification-header">
                      <div className="classification-info">
                        <div className={`classification-icon ${classification.color}`}>
                          {classification.icon}
                        </div>
                        <span className="classification-name">{classification.category}</span>
                      </div>
                      <span className="classification-confidence">{classification.confidence}%</span>
                    </div>
                    <div className="confidence-bar-bg">
                      <div 
                        className="confidence-bar"
                        style={{ width: `${classification.confidence}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Analysis Summary */}
            <div className="summary-card">
              <h4>Analysis Summary</h4>
              <div className="summary-list">
                <div className="summary-item">
                  <span className="summary-label">Primary Detection:</span>
                  <span className="summary-value">Ship</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Confidence Level:</span>
                  <span className="summary-value high-confidence">High (89.7%)</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Processing Time:</span>
                  <span className="summary-value">3.2s</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Model Version:</span>
                  <span className="summary-value">v2.1.4</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;