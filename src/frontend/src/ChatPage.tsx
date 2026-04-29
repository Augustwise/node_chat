import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createRoom,
  fetchMessages,
  fetchRooms,
  postMessage,
} from './api';
import type { ChatMessage, Room } from './types';

const usernameKey = 'chat.username';

type FormSubmitEvent = {
  preventDefault: () => void;
  currentTarget: HTMLFormElement;
};

function getHashRoomName() {
  return decodeURIComponent(window.location.hash.replace(/^#/, '')).trim();
}

function ChatPage() {
  const storedUsername = localStorage.getItem(usernameKey);
  const username = storedUsername?.trim() || 'guest';
  const [rooms, setRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeRoomName, setActiveRoomName] = useState(getHashRoomName());
  const [messageText, setMessageText] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [error, setError] = useState('');
  const displayedMessages = activeRoomName ? messages : [];

  const activeRoom = useMemo(
    () => rooms.find((room) => room.name === activeRoomName),
    [activeRoomName, rooms]
  );

  const refreshRooms = useCallback(async () => {
    const nextRooms = await fetchRooms();

    setRooms(nextRooms);

    if (!getHashRoomName() && nextRooms[0]) {
      window.history.replaceState(
        null,
        '',
        `/chat#${encodeURIComponent(nextRooms[0].name)}`
      );
      setActiveRoomName(nextRooms[0].name);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    fetchRooms()
      .then((nextRooms) => {
        if (ignore) {
          return;
        }

        setRooms(nextRooms);

        if (!getHashRoomName() && nextRooms[0]) {
          window.history.replaceState(
            null,
            '',
            `/chat#${encodeURIComponent(nextRooms[0].name)}`
          );
          setActiveRoomName(nextRooms[0].name);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError('Could not load rooms.');
        }
      });

    const handleHashChange = () => {
      setActiveRoomName(getHashRoomName());
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      ignore = true;
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (!activeRoomName) {
      return;
    }

    let ignore = false;

    fetchMessages(activeRoomName)
      .then((nextMessages) => {
        if (!ignore) {
          setMessages(nextMessages);
        }
      })
      .catch(() => {
        if (!ignore) {
          setMessages([]);
          setError('Could not load messages.');
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeRoomName]);

  const handleCreateRoom = async (event: FormSubmitEvent) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('roomName') || '').trim();

    if (!name) {
      setError('Enter a room name.');

      return;
    }

    try {
      const room = await createRoom(name, username);

      setRooms((currentRooms) => [...currentRooms, room]);
      setIsCreatingRoom(false);
      setError('');
      form.reset();
      window.location.hash = encodeURIComponent(room.name);
      setActiveRoomName(room.name);
    } catch {
      setError('Could not create that room.');
    }
  };

  const handlePostMessage = async (event: FormSubmitEvent) => {
    event.preventDefault();

    const body = messageText.trim();

    if (!activeRoomName || !body) {
      return;
    }

    try {
      const message = await postMessage(activeRoomName, username, body);

      setMessages((currentMessages) => [...currentMessages, message]);
      setMessageText('');
      refreshRooms().catch(() => undefined);
    } catch {
      setError('Could not send your message.');
    }
  };

  return (
    <main className="chat-page">
      <aside className="rooms-sidebar">
        <div>
          <h1 className="chat-brand">Chat App</h1>

          <div className="rooms-heading">
            <span>Rooms</span>
            <button
              className="app-icon-button"
              type="button"
              onClick={() => setIsCreatingRoom((current) => !current)}
            >
              +
            </button>
          </div>

          {isCreatingRoom ? (
            <form className="room-create-form" onSubmit={handleCreateRoom}>
              <label htmlFor="sidebar-room-name">Room name</label>
              <input
                id="sidebar-room-name"
                name="roomName"
                placeholder="new-room"
              />
              <button className="app-button primary" type="submit">
                create
              </button>
            </form>
          ) : null}

          <nav className="room-list">
            {rooms.map((room) => (
              <a
                className={
                  room.name === activeRoomName ? 'room-link active' : 'room-link'
                }
                href={`/chat#${encodeURIComponent(room.name)}`}
                key={room.name}
              >
                <span className="room-name">
                  <span>#</span>
                  {room.name}
                </span>
                {room.unread ? (
                  <span className="room-count">
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
          </div>
        </section>
      </aside>

      <section className="chat-shell">
        <header className="chat-header">
          <div>
            <h2 id="room-title">
              {activeRoom ? `# ${activeRoom.name}` : 'No room selected'}
            </h2>
            <p>
              {activeRoom
                ? `${activeRoom.members} members - shared room`
                : 'Create a room to start chatting'}
            </p>
          </div>
          <a className="app-button rooms-link-button" href="/rooms">
            rooms
          </a>
        </header>

        <div className="message-scroll">
          {error ? <p className="chat-status">{error}</p> : null}
          {activeRoom ? <time className="day-pill">Today</time> : null}

          {activeRoom && displayedMessages.length ? (
            <ol className="message-list">
              {displayedMessages.map((message) => (
                <li
                  className={
                    message.author === username
                      ? 'message-row mine'
                      : 'message-row'
                  }
                  key={message.id}
                >
                  {message.author !== username ? (
                    <div className="message-meta">
                      <strong>{message.author}</strong>
                      <span>&middot;</span>
                      <time>{message.time}</time>
                    </div>
                  ) : null}
                  <p className="message-bubble">{message.body}</p>
                  {message.author === username ? (
                    <time className="message-time">{message.time}</time>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="chat-status">
              {activeRoom ? 'No messages yet.' : 'No rooms yet.'}
            </p>
          )}
        </div>

        <form className="composer" onSubmit={handlePostMessage}>
          <label htmlFor="message">
            {activeRoom ? `Message #${activeRoom.name}` : 'Message'}
          </label>
          <input
            disabled={!activeRoom}
            id="message"
            name="message"
            placeholder={
              activeRoom ? `Message #${activeRoom.name}...` : 'Create a room...'
            }
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
          />
        </form>
      </section>
    </main>
  );
}

export default ChatPage;
