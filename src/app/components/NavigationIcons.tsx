import { FiSettings } from "react-icons/fi";

export function GearsNavIcon() {
  return (
    <span className="nav-symbol nav-symbol-gears" aria-hidden="true">
      <FiSettings className="nav-gear nav-gear-large" />
      <FiSettings className="nav-gear nav-gear-small" />
    </span>
  );
}

export function EinsteinNavIcon() {
  return (
    <span className="nav-symbol nav-symbol-einstein" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path
          className="nav-einstein-hair"
          d="M6.8 8.4 4.4 7.2l1.7-1.1-1-2 3 .9.7-2.3 2 1.8L12.3 2l1.2 2.4 2.5-1.5.1 2.8 2.8-.5-1.2 2.5 2 .8-2.5 1.4"
        />
        <path d="M7 8.2c-.5 1.1-.8 2.4-.8 3.8 0 4.1 2.5 7.1 5.8 7.1s5.8-3 5.8-7.1c0-1.4-.3-2.7-.8-3.8" />
        <path d="M6.4 11.1c-1.5-.5-2.1.5-1.5 1.8.4.8 1 1.2 1.7 1.2M17.6 11.1c1.5-.5 2.1.5 1.5 1.8-.4.8-1 1.2-1.7 1.2" />
        <path className="nav-einstein-brow" d="m8 10.2 2-.5M14 9.7l2 .5" />
        <g className="nav-einstein-eyes" fill="currentColor" stroke="none">
          <circle cx="9.2" cy="11.2" r=".55" />
          <circle cx="14.8" cy="11.2" r=".55" />
        </g>
        <path d="m12 11.3-.6 2.1.9.3" />
        <path className="nav-einstein-moustache" d="M8.6 14.5c1-.8 2.2-.6 3.4.2 1.2-.8 2.4-1 3.4-.2-.4 1.1-1.6 1.5-3.4.8-1.8.7-3 .3-3.4-.8Z" />
        <path className="nav-einstein-mouth" d="M10.4 16.2c1 .6 2.2.6 3.2 0" />
        <path className="nav-einstein-tongue" d="M10.7 16.3c.2 2.4 2.4 2.8 2.7 0" fill="currentColor" />
      </svg>
    </span>
  );
}

export function BulletinNavIcon() {
  return (
    <span className="nav-symbol nav-symbol-bulletin" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.8" y="4.2" width="18.4" height="15.6" rx=".8" />
        <path d="M5.2 6.5h13.6" />
        <g className="nav-bulletin-note nav-bulletin-note-left">
          <path d="M5.7 9.1h5.2v6.6H5.7zM7 11.2h2.6M7 13h2.2" />
          <circle cx="8.3" cy="9.1" r=".55" fill="currentColor" stroke="none" />
        </g>
        <g className="nav-bulletin-note nav-bulletin-note-right">
          <path d="M13.1 8.3h5.2v7.7h-5.2z" />
          <path className="nav-bulletin-line nav-bulletin-line-one" pathLength={1} d="M14.3 10.6h2.7" />
          <path className="nav-bulletin-line nav-bulletin-line-two" pathLength={1} d="M14.3 12.4h2.7" />
          <path className="nav-bulletin-line nav-bulletin-line-three" pathLength={1} d="M14.3 14.2h1.8" />
          <circle className="nav-bulletin-pin" cx="15.7" cy="8.3" r=".55" fill="currentColor" stroke="none" />
        </g>
      </svg>
    </span>
  );
}

export function CameraNavIcon() {
  return (
    <span className="nav-symbol nav-symbol-camera" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.2 8.2h3l1.4-2.1h6.8l1.4 2.1h3c.8 0 1.4.6 1.4 1.4v8.1c0 .8-.6 1.4-1.4 1.4H4.2c-.8 0-1.4-.6-1.4-1.4V9.6c0-.8.6-1.4 1.4-1.4Z" />
        <circle className="nav-camera-lens" cx="12" cy="13.4" r="3.4" />
        <path className="nav-camera-shutter" d="m10.3 10.5 1.7 2.9 3.3-.1M13.7 16.3 12 13.4l-3.3.1" />
        <g className="nav-camera-flash">
          <path d="M18.2 5.1 20 3.3M20.2 6.8h2.1M16.5 3V1" />
        </g>
      </svg>
    </span>
  );
}

export function BookNavIcon() {
  return (
    <span className="nav-symbol nav-symbol-book" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.2 5.2c3.5-.9 6.4-.3 8.8 1.7v12.2c-2.4-2-5.3-2.6-8.8-1.7V5.2Z" />
        <path d="M20.8 5.2c-3.5-.9-6.4-.3-8.8 1.7v12.2c2.4-2 5.3-2.6 8.8-1.7V5.2Z" />
        <g className="nav-book-new-copy">
          <path className="nav-book-line nav-book-line-one" pathLength={1} d="M14.2 9.6c1-.5 2.1-.7 3.3-.6" />
          <path className="nav-book-line nav-book-line-two" pathLength={1} d="M14.2 11.6c1-.5 2.1-.7 3.3-.6" />
          <path className="nav-book-line nav-book-line-three" pathLength={1} d="M14.2 13.6c.8-.4 1.7-.6 2.7-.6" />
          <path className="nav-book-caret" d="M17.7 13v1.3" />
        </g>
        <g className="nav-book-page">
          <path d="M18.7 7.6c-2.4-.4-4.2.1-5.6 1.2v7.1c1.4-1.1 3.2-1.6 5.6-1.2V7.6Z" />
          <path d="M14.2 10.2c1-.5 2.1-.7 3.3-.6M14.2 12.1c1-.5 2.1-.7 3.3-.6" />
        </g>
      </svg>
    </span>
  );
}

export function CvNavIcon() {
  return (
    <span className="nav-symbol nav-symbol-cv" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2.8h8l4 4v14.4H6zM14 2.8v4h4" />
        <circle cx="10" cy="10.7" r="1.5" />
        <path d="M7.9 14.1c.7-1 1.4-1.4 2.1-1.4s1.4.4 2.1 1.4M14.2 10.3h2M14.2 13h2M8 17.1h8" />
        <path className="nav-cv-scan" d="M7.5 8.4h9" />
      </svg>
    </span>
  );
}
