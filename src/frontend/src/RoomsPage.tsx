import rooms from './rooms';

function RoomsPage() {
  return (
    <main className="rooms-page">
      <header className="rooms-topbar">
        <a href="/chat">back to chat</a>
        <h1>
          <span className="desktop-title">All rooms</span>
          <span className="mobile-title">Rooms</span>
        </h1>
        <button type="button">
          +
        </button>
      </header>

      <section className="rooms-content">
        <h2 id="rooms-title">Rooms</h2>
        <div className="rooms-search-row">
          <label htmlFor="room-search">Search rooms</label>
          <input id="room-search" placeholder="Search rooms..." />
          <button type="button">+ New room</button>
        </div>

        <ol className="all-room-list">
          {rooms.map((room) => (
            <li className="all-room-row" key={room.name}>
              <a className="room-summary" href={`/chat#${room.name}`}>
                <span className="room-summary-main">
                  <span>#</span>
                  <strong>{room.name}</strong>
                  <small>{room.members} members</small>
                </span>
                <span className="room-summary-preview">
                  <span>{room.preview}</span>
                  <time>{room.time}</time>
                  {room.unread ? (
                    <strong>
                      {room.unread}
                    </strong>
                  ) : null}
                </span>
              </a>

              <div className="room-actions">
                <button type="button">rename</button>
                <button className="danger" type="button">
                  delete
                </button>
                <a href={`/chat#${room.name}`}>
                  {room.joined ? 'open' : 'join'}
                </a>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

export default RoomsPage;
