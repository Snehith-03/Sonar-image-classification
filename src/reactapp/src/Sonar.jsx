import React, { useState, useRef } from 'react';
import { Upload, Home, Clock, Info, LogOut, Loader2, X, ChevronRight, Sparkles, SatelliteDishIcon, Fish, Ship, Mountain, AlertCircle, User, Plane, Waves, Download } from 'lucide-react';
import './SonarDashboard.css';

const Sonar = ({ username }) => {
  const [currentPage, setCurrentPage] = useState('home');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const [showResults, setShowResults] = useState(false);
  const [classificationResult, setClassificationResult] = useState(null);
  const [uploadError, setUploadError] = useState('');

  // Upload image to backend
  const uploadImageToBackend = async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('name', file.name);

      const response = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.text();
      console.log(result);
      return true;
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload image to server');
      return false;
    }
  };

  // Fetch image from backend
  const fetchImageFromBackend = async (filename) => {
    try {
      const response = await fetch(`http://localhost:3000/image/${filename}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Fetch error:', error);
      return null;
    }
  };

  const processImage = async (file) => {
    setIsProcessing(true);
    setUploadError('');

    // Upload to backend first
    const uploadSuccess = await uploadImageToBackend(file);
    
    if (!uploadSuccess) {
      setIsProcessing(false);
      return;
    }

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Fetch the processed image from backend
    const processedImageUrl = await fetchImageFromBackend(file.name);
    
    // Mock classification result (in production, this would come from your AI model)
    const mockResult = {
      original: uploadedImage,
      processed: processedImageUrl || uploadedImage,
      heatmap: uploadedImage, // Replace with actual heatmap from your AI model
      filename: file.name,
      aiDescription: "Side-scan sonar image captured at 45.2m depth showing a large metallic object on the seafloor. The object displays characteristic acoustic shadows and high reflectivity consistent with a shipwreck. Secondary targets visible include scattered debris field and possible ordnance. Seafloor composition appears to be sandy with some rocky outcrops in the northern section.",
      classifications: [
        { 
          category: 'Ship', 
          confidence: 89.7, 
          icon: <Ship size={16} />, 
          color: 'blue' 
        },
        { 
          category: 'Mine', 
          confidence: 23.4, 
          icon: <AlertCircle size={16} />, 
          color: 'red' 
        },
        { 
          category: 'Seafloor', 
          confidence: 78.9, 
          icon: <Mountain size={16} />, 
          color: 'amber' 
        },
        { 
          category: 'Fish', 
          confidence: 12.1, 
          icon: <Fish size={16} />, 
          color: 'green' 
        },
        { 
          category: 'Human', 
          confidence: 2.3, 
          icon: <User size={16} />, 
          color: 'purple' 
        },
        { 
          category: 'Plane', 
          confidence: 0.6, 
          icon: <Plane size={16} />, 
          color: 'slate' 
        }
      ],
      metadata: {
        depth: '45.2m',
        frequency: '200 kHz',
        resolution: '0.5m/pixel',
        timestamp: new Date().toLocaleString(),
        uploadedBy: username
      }
    };
    
    setClassificationResult(mockResult);
    setIsProcessing(false);
    setShowResults(true);
  };

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
        processImage(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleUploadClick = (e) => {
    const target = e.target;
    if (target.closest('.upload-prompt') || 
        target.closest('.select-file-button') ||
        target.classList.contains('upload-prompt') ||
        target.classList.contains('select-file-button')) {
      fileInputRef.current?.click();
    }
  };

  const clearUpload = () => {
    setUploadedImage(null);
    setIsProcessing(false);
    setShowResults(false);
    setClassificationResult(null);
    setUploadError('');
  };

  const handleResetResults = () => {
    setShowResults(false);
    setClassificationResult(null);
    setUploadedImage(null);
    setUploadError('');
  };

  const handleBackToUpload = () => {
    setShowResults(false);
  };

  const handleLogout = () => {
    // Clear any stored data
    localStorage.removeItem(`privateKey_${username}`);
    window.location.reload(); // Reload to go back to login
  };

  // Results Component (embedded)
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
            <div className="main-column">
              <div className="analysis-card">
                <h3>AI Analysis Description</h3>
                <div className="description-box">
                  <p>{classificationResult.aiDescription}</p>
                </div>
                <p className="description-note">
                  Automatically generated description based on AI analysis of sonar imagery
                </p>
              </div>

              <div className="images-grid">
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

                <div className="image-card">
                  <h4>Processed Image</h4>
                  <div className="image-container">
                    <img
                      src={classificationResult.processed}
                      alt="Processed sonar scan"
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
                  <div className="metadata-item">
                    <span className="metadata-label">Uploaded By:</span>
                    <span className="metadata-value">{classificationResult.metadata.uploadedBy}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sidebar-column">
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

  return (
    <div className="sonar-dashboard">
      <div className="grid-background"></div>
      <div className="glow-effect glow-top"></div>
      <div className="glow-effect glow-bottom"></div>

      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-content">
            <div className="logo-section">
              <div className="logo-wrapper">
                <div className="logo-glow"></div>
                <div className="logo-box">
                  <SatelliteDishIcon size={28} color="#ffffff" strokeWidth={2.5} />
                </div>
              </div>
              <div className="logo-text">
                <h1>SONAR AI</h1>
                <p>Underwater Detection System</p>
              </div>
            </div>
            
            <div className="nav-links">
              {[
                { icon: Home, label: 'Home', page: 'home' },
                { icon: Clock, label: 'History', page: 'history' },
                { icon: Info, label: 'About', page: 'about' }
              ].map(({ icon: Icon, label, page }) => (
                <button
                  key={page}
                  onClick={() => {
                    setCurrentPage(page);
                    if (page === 'home') {
                      setShowResults(false);
                    }
                  }}
                  className={`nav-button ${currentPage === page ? 'active' : ''}`}
                >
                  {currentPage === page && <div className="nav-button-bg"></div>}
                  <div className="nav-button-content">
                    <Icon size={18} />
                    {label}
                  </div>
                </button>
              ))}
              
              <div className="nav-divider"></div>
              
              <button className="logout-button" onClick={handleLogout}>
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {showResults ? (
          <Results 
            classificationResult={classificationResult}
            onReset={handleResetResults}
            onBack={handleBackToUpload}
          />
        ) : (
          <>
            {currentPage === 'home' && (
              <div>
                <div className="page-header">
                  <div className="header-title">
                    <Sparkles color="#60a5fa" size={24} />
                    <h2>Analyze SONAR Images</h2>
                  </div>
                  <p className="header-subtitle">
                    Upload underwater SONAR imagery for real-time AI classification across 6 object categories. Welcome, {username}!
                  </p>
                </div>

                <div className="upload-container">
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={handleUploadClick}
                    className={`upload-zone ${isDragging ? 'dragging' : ''} ${uploadedImage ? 'has-image' : ''}`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e.target.files[0])}
                      className="file-input"
                    />
                    
                    {!uploadedImage ? (
                      <div className="upload-prompt">
                        <div className="upload-icon-wrapper">
                          <div className="upload-icon-glow"></div>
                          <div className="upload-icon">
                            <Upload size={40} color="#ffffff" strokeWidth={2.5} />
                          </div>
                        </div>
                        
                        <div className="upload-text">
                          <h3>Upload SONAR Image</h3>
                          <p>Drag and drop your file here, or click to browse</p>
                        </div>
                        
                        <button
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          className="select-file-button"
                        >
                          Select File
                          <ChevronRight size={20} />
                        </button>
                        
                        <p className="file-format-text">Supports PNG, JPEG, JPG formats</p>
                        
                        {uploadError && (
                          <p className="login-error">{uploadError}</p>
                        )}
                      </div>
                    ) : (
                      <div className="image-preview-section">
                        <div className="image-preview-wrapper">
                          <div className="image-preview-glow"></div>
                          <div className="image-preview-container">
                            <img
                              src={uploadedImage}
                              alt="Uploaded SONAR"
                              className="preview-image"
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); clearUpload(); }}
                              className="clear-button"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        </div>
                        
                        {isProcessing && (
                          <div className="processing-indicator">
                            <Loader2 className="spinner" size={24} color="#60a5fa" />
                            <span>Analyzing image...</span>
                          </div>
                        )}  
                      </div>
                    )}
                  </div>
                </div>

                <div className="features-section">
                  <div className="features-grid">
                    <div className="feature-card blue">
                      <Fish size={32} />
                      <h3 className="feature-title">Multi-Class Detection</h3>
                      <p className="feature-description">Classify fish, ships, planes, mines, humans, and seafloor features</p>
                    </div>
                    <div className="feature-card amber">
                      <Ship size={32} />
                      <h3 className="feature-title">Maritime Objects</h3>
                      <p className="feature-description">Detect vessels, aircraft, ordnance, and human activity</p>
                    </div>
                    <div className="feature-card green">
                      <Mountain size={32} />
                      <h3 className="feature-title">AI Descriptions</h3>
                      <p className="feature-description">Automated analysis with detailed contextual descriptions</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentPage === 'history' && (
              <div className="page-card">
                <h2>Classification History</h2>
                <p className="page-description">Your previous analysis results will appear here</p>
              </div>
            )}

            {currentPage === 'about' && (
              <div className="page-card">
                <div className="about-content">
                  <h2>About SONAR AI</h2>
                  <div className="about-text">
                    <p>
                      Advanced AI-powered classification system for underwater SONAR imagery. Built with the DenseNet121 architecture and enhanced with LIME-based explainable AI for transparent decision-making.
                    </p>
                    <p>
                      Trained on 2,988 balanced images across six categories: Ship, Plane, Seafloor, Mine, Fish, and Human. 
                      The model achieves industry-leading 98.21% accuracy with real-time processing capabilities.
                    </p>
                  </div>
                </div>
                
                <div className="about-stats">
                  <div className="about-stat-card blue">
                    <p className="about-stat-value">98.21%</p>
                    <p className="about-stat-label">Classification Accuracy</p>
                  </div>
                  <div className="about-stat-card cyan">
                    <p className="about-stat-value">2,988</p>
                    <p className="about-stat-label">Training Samples</p>
                  </div>
                  <div className="about-stat-card purple">
                    <p className="about-stat-value">6</p>
                    <p className="about-stat-label">Object Categories</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Sonar;