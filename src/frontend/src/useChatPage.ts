import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  createRoom,
  fetchMessages,
  fetchRooms,
  joinRoom,
  leaveRoom,
  postMessage,
} from './api';
import {
  duplicateRoomMessage,
  getHashRoomName,
  markNewMessages,
  messageRefreshIntervalMs,
  usernameKey,
  type DisplayMessage,
} from './chatPageUtils';
import type { Room } from './types';

function useChatPage() {
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
    [rooms],
  );

  const activeRoom = useMemo(
    () => rooms.find((room) => room.name === activeRoomName),
    [activeRoomName, rooms],
  );

  const refreshRooms = useCallback(async () => {
    const nextRooms = await fetchRooms(username);

    setRooms(nextRooms);

    const firstJoinedRoom = nextRooms.find((room) => room.joined);

    if (!getHashRoomName() && firstJoinedRoom) {
      window.history.replaceState(
        null,
        '',
        `/chat#${encodeURIComponent(firstJoinedRoom.name)}`,
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
            `/chat#${encodeURIComponent(firstJoinedRoom.name)}`,
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
                currentRoom.name === room.name ? room : currentRoom,
              )
            : [...currentRooms, room],
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
              loadedRoomNameRef.current === activeRoomName,
            ),
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
      messageRefreshIntervalMs,
    );

    return () => {
      ignore = true;
      clearInterval(refreshInterval);
    };
  }, [activeRoomName]);

  const handleCreateRoom = async (event: FormEvent<HTMLFormElement>) => {
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
          : 'Could not create that room.',
      );
    }
  };

  const handlePostMessage = async (event: FormEvent<HTMLFormElement>) => {
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

  return {
    activeRoom,
    activeRoomName,
    displayedMessages,
    error,
    handleCreateRoom,
    handleLeaveActiveRoom,
    handlePostMessage,
    isCreatingRoom,
    joinedRooms,
    messageText,
    setIsCreatingRoom,
    setMessageText,
    username,
  };
}

export default useChatPage;
