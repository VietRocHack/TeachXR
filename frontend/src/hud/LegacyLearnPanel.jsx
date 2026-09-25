// The original TeachXR /learn page (TeachXR-frontend: Learn.jsx, NavigationBar,
// NavItem, CenterButton, Mute, ChatBox, ChatField), ported as-is to float in
// the room as the tutor window. Markup and Tailwind classes are kept from the
// original; only the wiring changed: Vapi calls became the Gemini Live session
// (useTutor), and fixed h-screen sizes became the window's own size.
//
// Mapping from the original:
//   center "+" button  -> start a tutor session (tutor.connect), "Turn Off" ends it
//   Mute               -> mic on/off
//   Home               -> take the glasses off
//   avatar (female2)   -> shown while a session is live, like the old voice mode
//   History / Profile  -> decorative, as they were

import { useState } from 'react';
import { FaUserCircle } from 'react-icons/fa';
import female2 from '../assets/female2.png';

function NavItem({ icon, label, onClick }) {
  const getIcon = (iconName) => {
    switch (iconName) {
      case 'home':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case 'mute':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        );
      case 'mic':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        );
      case 'clock':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'user':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <button className="flex flex-col items-center px-4 py-2 text-white w-32 rounded-full" onClick={onClick}>
      {getIcon(icon)}
      <span className="text-lg mt-1">{label}</span>
    </button>
  );
}

function CenterButton({ startCall, connecting, connected, endCall }) {
  return !connected ? (
    <button
      onClick={startCall}
      className="bg-blue-500 text-white p-4 rounded-full mx-2"
      disabled={connecting}
    >
      {connecting ? (
        'Loading...'
      ) : (
        <svg className="w-20 h-20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M13 17H11V13H7V11H11V7H13V11H17V13H13V17ZM12 2C10.6868 2 9.38642 2.25866 8.17317 2.7612C6.95991 3.26375 5.85752 4.00035 4.92893 4.92893C3.05357 6.8043 2 9.34784 2 12C2 14.6522 3.05357 17.1957 4.92893 19.0711C5.85752 19.9997 6.95991 20.7362 8.17317 21.2388C9.38642 21.7413 10.6868 22 12 22C14.6522 22 17.1957 20.9464 19.0711 19.0711C20.9464 17.1957 22 14.6522 22 12C22 10.6868 21.7413 9.38642 21.2388 8.17317C20.7362 6.95991 19.9997 5.85752 19.0711 4.92893C18.1425 4.00035 17.0401 3.26375 15.8268 2.7612C14.6136 2.25866 13.3132 2 12 2Z"
            fill="currentColor"
          />
        </svg>
      )}
    </button>
  ) : (
    <button onClick={endCall}>Turn Off</button>
  );
}

function NavigationBar({ tutor, onHome }) {
  const isMuted = !tutor.micOn;
  const connected = tutor.status === 'live';
  return (
    <nav className="flex justify-center w-full">
      <div className="bg-gray-900 rounded-full py-4 px-3 flex justify-around items-center w-full">
        <NavItem icon="home" label="Home" onClick={onHome} />
        <NavItem icon={isMuted ? 'mute' : 'mic'} label={isMuted ? 'Unmute' : 'Mute'} onClick={tutor.toggleMic} />
        <CenterButton
          startCall={tutor.connect}
          endCall={tutor.hangup}
          connecting={tutor.status === 'connecting'}
          connected={connected}
        />
        <NavItem icon="clock" label="History" />
        <NavItem icon="user" label="Profile" />
      </div>
    </nav>
  );
}

function ChatField({ isFromUser, text, url }) {
  return (
    <div className={`flex items-start ${isFromUser ? 'justify-end' : 'justify-start'}`}>
      {!isFromUser && <FaUserCircle className="text-3xl text-blue-400 mr-3" />}
      <div className={`max-w-xs p-3 rounded-lg ${isFromUser ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
        {url && <img src={url} className="w-80 transition-transform hover:scale-105" />}
        {text && <p className={url ? 'mt-2 text-lg' : 'text-2xl'}>{text}</p>}
      </div>
    </div>
  );
}

function ChatBox({ tutor }) {
  const [text, setText] = useState('');
  const live = tutor.status === 'live';
  // Newest first, like the original (it prepended each message).
  const messages = [...tutor.messages].reverse();
  return (
    <div className="w-full h-full flex flex-col justify-between bg-gray-900 text-white rounded-lg shadow-lg p-4 overflow-hidden">
      {/* Typing wasn't in the original (voice only); kept small for when the mic is off. */}
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          tutor.sendText(text);
          setText('');
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!live}
          maxLength={1000}
          placeholder={live ? 'Type a question…' : 'Press + to start TeachXR'}
          className="min-w-0 flex-1 rounded-lg bg-gray-800 px-3 py-2 text-base text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </form>
      {tutor.notice && <p className="mb-2 text-sm text-amber-200/90">{tutor.notice}</p>}
      <div className="flex-grow overflow-y-auto p-3 space-y-4">
        {tutor.thinking && (
          <div className="flex items-center gap-1 pl-12 text-blue-300">
            <span className="dot" />
            <span className="dot" style={{ animationDelay: '0.15s' }} />
            <span className="dot" style={{ animationDelay: '0.3s' }} />
          </div>
        )}
        {messages.map((m) => (
          <ChatField key={m.id} isFromUser={m.role === 'user'} url={m.image} text={m.text} />
        ))}
      </div>
    </div>
  );
}

function IdleOrb() {
  return (
    <>
      <div className="relative">
        {/* Outermost Gradient Circle with Shadow */}
        <div className="bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-full h-64 w-64 animate-pulse shadow-[0_0_50px_15px_rgba(139,92,246,0.3)]"></div>
        {/* Additional Outer Circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-gradient-to-r from-blue-400 to-indigo-600 rounded-full h-60 w-60 animate-pulse"></div>
        </div>
        {/* Original Outer Gradient Circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-full h-56 w-56 animate-pulse"></div>
        </div>
        {/* Additional Middle Circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full h-52 w-52"></div>
        </div>
        {/* Original Middle Circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-gradient-to-r from-indigo-700 to-purple-700 rounded-full h-48 w-48"></div>
        </div>
        {/* Additional Inner Circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-gradient-to-r from-purple-800 to-indigo-800 rounded-full h-44 w-44 flex items-center justify-center shadow-lg"></div>
        </div>
        {/* Original Inner Circle with Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-gradient-radial from-teal-400 via-emerald-500 to-cyan-600 rounded-full h-40 w-40 flex items-center justify-center shadow-lg">
            <span className="text-white text-xl font-semibold"></span>
          </div>
        </div>
      </div>
      {/* Informative Message */}
      <p className="text-blue-200 text-center mt-8 text-2xl opacity-75">Touch to empower your learning</p>
    </>
  );
}

export default function LegacyLearnPanel({ tutor, onHome, compact = false }) {
  const isVoiceMode = tutor.status === 'live';
  return (
    <div
      className={`legacy-learn bg-gradient-to-b from-purple-900 to-indigo-900 h-full w-full flex overflow-hidden rounded-2xl ${
        compact ? 'flex-col' : ''
      }`}
    >
      <div className={`${compact ? 'w-full' : 'w-2/3'} flex items-center justify-center mt-8 mb-8`}>
        <div className={`flex flex-col items-center justify-center w-full h-full m-8 ${compact ? 'space-y-10' : 'space-y-24'}`}>
          <div className="flex flex-col relative items-center justify-center w-full h-100 mt-8">
            {isVoiceMode ? (
              <div className="bg-purple-500 rounded-[15px]">
                <img
                  src={female2}
                  alt="AI Assistant Avatar"
                  className={`transition-transform ${compact ? 'h-64' : 'h-[340px]'}`}
                />
              </div>
            ) : (
              <IdleOrb />
            )}
          </div>
          <NavigationBar tutor={tutor} onHome={onHome} />
        </div>
      </div>

      {/* Right section: ChatBot (1/3 of the screen) */}
      <div className={`${compact ? 'h-[420px] w-full' : 'h-full w-1/3'} flex items-center justify-center bg-black`}>
        <ChatBox tutor={tutor} />
      </div>
    </div>
  );
}
