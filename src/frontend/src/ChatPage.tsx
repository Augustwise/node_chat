import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import classNames from 'classnames';
import {
  createRoom,
  fetchMessages,
  fetchRooms,
  joinRoom,
  leaveRoom,
  postMessage,
} from './api';
import type { ChatMessage, Room } from './types';

const usernameKey = 'chat.username';
const duplicateRoomMessage = 'A room with that name already exists.';
const messageRefreshIntervalMs = 3000;

type DisplayMessage = ChatMessage & {
  shouldAnimate?: boolean;
};

function markNewMessages(
  nextMessages: ChatMessage[],
  currentMessages: DisplayMessage[],
  shouldAnimateNewMessages: boolean
): DisplayMessage[] {
  if (!shouldAnimateNewMessages) {
    return nextMessages;
  }

  const currentMessageIds = new Set(
    currentMessages.map((message) => message.id)
  );
  const animatedMessageIds = new Set(
    currentMessages
      .filter((message) => message.shouldAnimate)
      .map((message) => message.id)
  );

  return nextMessages.map((message) => ({
    ...message,
    shouldAnimate:
      animatedMessageIds.has(message.id) || !currentMessageIds.has(message.id),
  }));
}

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
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [activeRoomName, setActiveRoomName] = useState(getHashRoomName());
  const [messageText, setMessageText] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [error, setError] = useState('');
  const loadedRoomNameRef = useRef<string | null>(null);
  const displayedMessages = activeRoomName ? messages : [];
  const joinedRooms = useMemo(
    () => rooms.filter((room) => room.joined),
    [rooms]
  );

  const activeRoom = useMemo(
    () => rooms.find((room) => room.name === activeRoomName),
    [activeRoomName, rooms]
  );

  const refreshRooms = useCallback(async () => {
    const nextRooms = await fetchRooms(username);

    setRooms(nextRooms);

    const firstJoinedRoom = nextRooms.find((room) => room.joined);

    if (!getHashRoomName() && firstJoinedRoom) {
      window.history.replaceState(
        null,
        '',
        `/chat#${encodeURIComponent(firstJoinedRoom.name)}`
      );
      setActiveRoomName(firstJoinedRoom.name);
    }
  }, [username]);

  useEffect(() => {
    let ignore = false;

    fetchRooms(username)
      .then((nextRooms) => {
        if (ignore) {
          return;
        }

        setRooms(nextRooms);

        const firstJoinedRoom = nextRooms.find((room) => room.joined);

        if (!getHashRoomName() && firstJoinedRoom) {
          window.history.replaceState(
            null,
            '',
            `/chat#${encodeURIComponent(firstJoinedRoom.name)}`
          );
          setActiveRoomName(firstJoinedRoom.name);
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
  }, [username]);

  useEffect(() => {
    if (!activeRoomName) {
      return;
    }

    let ignore = false;

    joinRoom(activeRoomName, username)
      .then((room) => {
        if (ignore) {
          return;
        }

        setRooms((currentRooms) =>
          currentRooms.some((currentRoom) => currentRoom.name === room.name)
            ? currentRooms.map((currentRoom) =>
                currentRoom.name === room.name ? room : currentRoom
              )
            : [...currentRooms, room]
        );
      })
      .catch(() => {
        if (!ignore) {
          setError('Could not join that room.');
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeRoomName, username]);

  useEffect(() => {
    if (!activeRoomName) {
      return;
    }

    let ignore = false;
    let hasLoadedMessages = false;
    let isRefreshingMessages = false;

    const refreshMessages = () => {
      if (isRefreshingMessages) {
        return;
      }

      isRefreshingMessages = true;

      fetchMessages(activeRoomName)
        .then((nextMessages) => {
          if (ignore) {
            return;
          }

          setMessages((currentMessages) =>
            markNewMessages(
              nextMessages,
              currentMessages,
              loadedRoomNameRef.current === activeRoomName
            )
          );
          loadedRoomNameRef.current = activeRoomName;
          hasLoadedMessages = true;
        })
        .catch(() => {
          if (!ignore) {
            if (!hasLoadedMessages) {
              setMessages([]);
            }

            setError('Could not load messages.');
          }
        })
        .finally(() => {
          isRefreshingMessages = false;
        });
    };

    refreshMessages();
    const refreshInterval = setInterval(
      refreshMessages,
      messageRefreshIntervalMs
    );

    return () => {
      ignore = true;
      clearInterval(refreshInterval);
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
    } catch (error) {
      setError(
        error instanceof Error && error.message === duplicateRoomMessage
          ? error.message
          : 'Could not create that room.'
      );
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

      setMessages((currentMessages) => [
        ...currentMessages,
        { ...message, shouldAnimate: true },
      ]);
      setMessageText('');
      refreshRooms().catch(() => undefined);
    } catch {
      setError('Could not send your message.');
    }
  };

  const handleLeaveActiveRoom = async () => {
    if (!activeRoom) {
      return;
    }

    try {
      await leaveRoom(activeRoom.name, username);
      window.location.assign('/rooms');
    } catch {
      setError('Could not leave that room.');
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
              <button
                className={classNames('app-button', 'primary')}
                type="submit"
              >
                create
              </button>
            </form>
          ) : null}

          <nav className="room-list">
            {joinedRooms.map((room) => (
              <a
                className={classNames('room-link', {
                  active: room.name === activeRoomName,
                })}
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
          <div className="chat-header-actions">
            {activeRoom?.joined ? (
              <button
                className={classNames('app-button', 'danger')}
                type="button"
                onClick={handleLeaveActiveRoom}
              >
                Leave Room
              </button>
            ) : null}
            <a
              className={classNames('app-button', 'rooms-link-button')}
              href="/rooms"
            >
              rooms
            </a>
          </div>
        </header>

        <div className="message-scroll">
          {error ? <p className="chat-status error">{error}</p> : null}
          {activeRoom ? <time className="day-pill">Today</time> : null}

          {activeRoom && displayedMessages.length ? (
            <ol className="message-list">
              {displayedMessages.map((message) => (
                <li
                  className={classNames('message-row', {
                    mine: message.author === username,
                    'message-appear': message.shouldAnimate,
                  })}
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
