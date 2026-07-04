import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Camera, Check, RefreshCw, Upload } from 'lucide-react';

export default function CameraScreen({ session, onNext, onGoTo }) {
  const [stream, setStream] = useState(null);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [statusText, setStatusText] = useState('Pose in the frame below.');
  const [countdownNum, setCountdownNum] = useState(null);
  const [cameraError, setCameraError] = useState(false);
  const [flashVisible, setFlashVisible] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const countdownRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let activeStream = null;

    async function initCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: 'user' },
          audio: false,
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
        setStatusText('Align your face, then tap Snap Photo.');
      } catch (err) {
        console.error('Camera access error:', err);
        setCameraError(true);
        setStatusText('No camera detected. Upload a portrait photo to continue.');
      }
    }

    if (!photoDataUrl) initCamera();

    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }
    );

    return () => {
      if (activeStream) activeStream.getTracks().forEach((track) => track.stop());
    };
  }, [photoDataUrl]);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const animateCountdown = () => {
    if (!countdownRef.current) return;
    gsap.fromTo(
      countdownRef.current,
      { scale: 0.4, opacity: 0 },
      {
        scale: 1.1,
        opacity: 1,
        duration: 0.4,
        ease: 'back.out(1.5)',
        onComplete: () => {
          gsap.to(countdownRef.current, { opacity: 0, scale: 1.35, duration: 0.25, delay: 0.1 });
        },
      }
    );
  };

  const startCountdown = () => {
    setStatusText('Hold still... capturing portrait.');
    let count = 3;
    setCountdownNum(count);
    animateCountdown();

    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        setCountdownNum(null);
        snap();
      } else {
        setCountdownNum(count);
        animateCountdown();
      }
    }, 850);
  };

  const snap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 960;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    setFlashVisible(true);
    window.setTimeout(() => setFlashVisible(false), 300);
    handleCapture(canvas.toDataURL('image/jpeg', 0.92));
  };

  const handleCapture = (dataUrl) => {
    session.photo = dataUrl;
    setPhotoDataUrl(dataUrl);
    stopStream();
    setStatusText('Portrait captured. Use this image for mask alignment?');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => handleCapture(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    session.photo = null;
    setPhotoDataUrl(null);
    setCameraError(false);
    onGoTo('camera');
  };

  return (
    <section ref={containerRef} className="view-screen active">
      <div className="glass-card glass-card-sm camera-card">
        <div className="ornament ornament-tl" />
        <div className="ornament ornament-tr" />
        <div className="ornament ornament-bl" />
        <div className="ornament ornament-br" />

        <div className="camera-header">
          <div className="tag-pill">Final Step</div>
          <h2 className="font-serif">{photoDataUrl ? 'Portrait captured' : 'Are you ready to know your artform?'}</h2>
          <p>{statusText}</p>
        </div>

        <div className="camera-viewport">
          {!photoDataUrl && !cameraError && (
            <video ref={videoRef} autoPlay playsInline muted />
          )}

          {photoDataUrl && (
            <img src={photoDataUrl} alt="Visitor portrait preview" />
          )}

          {cameraError && !photoDataUrl && (
            <div className="camera-fallback">
              <Camera size={48} strokeWidth={1.5} />
              <p>Camera unavailable. Select a portrait image from this device.</p>
            </div>
          )}

          {!photoDataUrl && !cameraError && (
            <div className="silhouette-guide">
              <svg viewBox="0 0 400 300" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M 90 270 L 90 140 A 110 110 0 0 1 310 140 L 310 270" strokeLinecap="round" />
                <ellipse cx="200" cy="140" rx="50" ry="65" strokeDasharray="5 3" strokeWidth="1.5" />
                <circle cx="200" cy="130" r="3.5" fill="currentColor" opacity="0.5" />
              </svg>
              <span className="silhouette-label">Align Face Here</span>
            </div>
          )}

          {countdownNum !== null && (
            <div className="countdown-overlay">
              <span ref={countdownRef}>{countdownNum}</span>
              <p>Hold Your Pose...</p>
            </div>
          )}

          {flashVisible && <div className="camera-flash" />}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="camera-controls">
          {!photoDataUrl ? (
            <>
              {!cameraError && (
                <button
                  type="button"
                  onClick={startCountdown}
                  disabled={countdownNum !== null}
                  className="btn-royal"
                >
                  <Camera size={18} />
                  <span>Snap Photo</span>
                </button>
              )}

              <label className={cameraError ? 'btn-royal' : 'btn-outline'}>
                <Upload size={18} />
                <span>{cameraError ? 'Upload Portrait' : 'Upload Photo'}</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </>
          ) : (
            <>
              <button type="button" onClick={handleRetake} className="btn-outline">
                <RefreshCw size={18} />
                <span>Retake</span>
              </button>
              <button type="button" onClick={onNext} className="btn-royal">
                <Check size={18} />
                <span>Use Photo</span>
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
