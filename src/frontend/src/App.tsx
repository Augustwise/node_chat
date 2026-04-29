import type { FormEvent } from 'react';
import './App.css';
import ChatPage from './ChatPage';
import RoomsPage from './RoomsPage';

const usernameKey = 'chat.username';

function App() {
  const storedUsername = localStorage.getItem(usernameKey);

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const nextUsername = String(formData.get('username') || '').trim();

    if (!nextUsername) {
      return;
    }

    localStorage.setItem(usernameKey, nextUsername);
    window.location.assign('/chat');
  };

  if (window.location.pathname === '/rooms') {
    return <RoomsPage />;
  }

  if (window.location.pathname === '/chat') {
    return <ChatPage />;
  }

  if (window.location.pathname !== '/login') {
    window.history.replaceState(null, '', '/login');
  }

  return (
    <main className="login-page">
      <section className="login-shell">
        <div className="login-panel">
          <h1 id="login-title">Chat App</h1>
          <p>Pick a name to join the chat.</p>

          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="your name"
              autoComplete="username"
              defaultValue={storedUsername || ''}
            />
            <button type="submit">
              <span className="desktop-label">
                Join chat
                <img
                  className="button-arrow"
                  src="/src/assets/arrow.svg"
                  alt=""
                />
              </span>
              <span className="mobile-label">Continue</span>
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default App;
