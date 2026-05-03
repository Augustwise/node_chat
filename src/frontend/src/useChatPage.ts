import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { getChatSocket } from './chatSocket';
import {
  duplicateRoomMessage,
  getHashRoomName,
  markNewMessages,
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
  const chatSocket = useMemo(() => getChatSocket(username), [username]);
  const activeRoomNameRef = useRef(activeRoomName);
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

  useEffect(() => {
    activeRoomNameRef.current = activeRoomName;
  }, [activeRoomName]);

  const showRooms = useCallback((nextRooms: Room[]) => {
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
  }, []);

  useEffect(() => {
    let ignore = false;

    chatSocket
      .fetchRooms()
      .then((nextRooms) => {
        if (ignore) {
          return;
        }

        showRooms(nextRooms);
      })
      .catch(() => {
        if (!ignore) {
          setError('Could not load rooms.');
        }
      });

    const stopRoomUpdates = chatSocket.on('rooms:update', (nextRooms) => {
      if (!ignore) {
        showRooms(nextRooms);
      }
    });

    const stopRoomRenames = chatSocket.on('room:renamed', (event) => {
      if (activeRoomNameRef.current !== event.oldName) {
        return;
      }

      window.history.replaceState(
        null,
        '',
        `/chat#${encodeURIComponent(event.room.name)}`,
      );
      setActiveRoomName(event.room.name);
    });

    const stopRoomDeletes = chatSocket.on('room:deleted', (event) => {
      if (activeRoomNameRef.current !== event.name) {
        return;
      }

      window.history.replaceState(null, '', '/chat');
      loadedRoomNameRef.current = null;
      setMessages([]);
      setActiveRoomName('');
    });

    const handleHashChange = () => {
      setActiveRoomName(getHashRoomName());
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      ignore = true;
      stopRoomUpdates();
      stopRoomRenames();
      stopRoomDeletes();
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [chatSocket, showRooms]);

  useEffect(() => {
    if (!activeRoomName) {
      return;
    }

    let ignore = false;

    chatSocket
      .joinRoom(activeRoomName)
      .then((room) => {
        if (ignore) {
          return;
        }

        if (activeRoomName !== room.name) {
          window.history.replaceState(
            null,
            '',
            `/chat#${encodeURIComponent(room.name)}`,
          );
          setActiveRoomName(room.name);
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
  }, [activeRoomName, chatSocket]);

  useEffect(() => {
    if (!activeRoomName) {
      return;
    }

    let ignore = false;

    chatSocket
      .fetchMessages(activeRoomName)
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
  }, [activeRoomName, chatSocket]);

  useEffect(() => {
    return chatSocket.on('messages:created', (event) => {
      if (
        activeRoomNameRef.current.toLowerCase() !== event.roomName.toLowerCase()
      ) {
        return;
      }

      setMessages((currentMessages) => {
        if (
          currentMessages.some(
            (currentMessage) => currentMessage.id === event.message.id,
          )
        ) {
          return currentMessages;
        }

        return [
          ...currentMessages,
          {
            ...event.message,
            shouldAnimate: true,
          },
        ];
      });
      loadedRoomNameRef.current = event.roomName;
    });
  }, [chatSocket]);

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
      const room = await chatSocket.createRoom(name);

      setRooms((currentRooms) =>
        currentRooms.some((currentRoom) => currentRoom.name === room.name)
          ? currentRooms.map((currentRoom) =>
              currentRoom.name === room.name ? room : currentRoom,
            )
          : [...currentRooms, room],
      );
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
      await chatSocket.postMessage(activeRoomName, body);

      setMessageText('');
    } catch {
      setError('Could not send your message.');
    }
  };

  const handleLeaveActiveRoom = async () => {
    if (!activeRoom) {
      return;
    }

    try {
      await chatSocket.leaveRoom(activeRoom.name);
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
