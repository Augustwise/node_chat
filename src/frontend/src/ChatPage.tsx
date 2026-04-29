import rooms from './rooms';
import messages from './messages';

const usernameKey = 'chat.username';

function ChatPage() {
  const storedUsername = localStorage.getItem(usernameKey);
  const username = storedUsername?.trim() || 'guest';

  return (
    <main className="chat-page">
      <aside className="rooms-sidebar" aria-label="Rooms">
        <div>
          <h1 className="chat-brand">chat.app</h1>

          <div className="rooms-heading">
            <span>Rooms</span>
            <button type="button" aria-label="Create room">
              +
            </button>
          </div>

          <nav className="room-list" aria-label="Chat rooms">
            {rooms.map((room) => (
              <a
                className={
                  room.name === 'general' ? 'room-link active' : 'room-link'
                }
                href={`/chat#${room.name}`}
                key={room.name}
              >
                <span className="room-name">
                  <span aria-hidden="true">#</span>
                  {room.name}
                </span>
                {room.unread ? (
                  <span
                    className="room-count"
                    aria-label={`${room.unread} unread`}
                  >
                    {room.unread}
                  </span>
                ) : null}
              </a>
            ))}
          </nav>
        </div>

        <section className="current-user">
          <div className="user-avatar">
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <strong>{username}</strong>
            <span>online</span>
          </div>
        </section>
      </aside>

      <section className="chat-shell">
        <header className="chat-header">
          <div>
            <h2 id="room-title"># general</h2>
            <p>12 people - shared room</p>
          </div>
          <a className="rooms-link-button" href="/rooms">
            rooms
          </a>
        </header>

        <div className="message-scroll">
          <time className="day-pill">Today</time>

          <ol className="message-list">
            {messages.map((message) => (
              <li
                className={message.mine ? 'message-row mine' : 'message-row'}
                key={message.id}
              >
                {!message.mine ? (
                  <div className="message-meta">
                    <strong>{message.author}</strong>
                    <span>&middot;</span>
                    <time>{message.time}</time>
                  </div>
                ) : null}
                <p className="message-bubble">{message.body}</p>
                {message.mine ? (
                  <time className="message-time">{message.time}</time>
                ) : null}
              </li>
            ))}
          </ol>
        </div>

        <form className="composer">
          <label htmlFor="message">Message #general</label>
          <input
            id="message"
            name="message"
            placeholder="Message #general..."
          />
        </form>
      </section>
    </main>
  );
}

export default ChatPage;
