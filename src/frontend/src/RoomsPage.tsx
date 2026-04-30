import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import classNames from 'classnames';
import { createRoom, deleteRoom, fetchRooms } from './api';
import DeleteRoomDialog from './DeleteRoomDialog';
import type { Room } from './types';

const usernameKey = 'chat.username';

function RoomsPage() {
  const storedUsername = localStorage.getItem(usernameKey);
  const username = storedUsername?.trim() || 'guest';
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState('');

  const visibleRooms = useMemo(
    () =>
      rooms.filter((room) =>
        room.name.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [rooms, search]
  );

  useEffect(() => {
    let ignore = false;

    fetchRooms()
      .then((nextRooms) => {
        if (!ignore) {
          setRooms(nextRooms);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError('Could not load rooms.');
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

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
    } catch {
      setError('Could not create that room.');
    }
  };

  const openDeleteModal = (room: Room) => {
    setDeleteTarget(room);
    setDeleteConfirmation('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteDialogOpenChange = useCallback(
    (open: boolean) => {
      setDeleteDialogOpen(open);
      if (!open) {
        setDeleteTarget(null);
        setDeleteConfirmation('');
      }
    },
    []
  );

  const handleDeleteRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!deleteTarget || deleteConfirmation !== deleteTarget.name) {
      return;
    }

    try {
      await deleteRoom(deleteTarget.name);
      setRooms((currentRooms) =>
        currentRooms.filter((room) => room.name !== deleteTarget.name)
      );
      setDeleteDialogOpen(false);
      setError('');
    } catch {
      setError('Could not delete that room.');
    }
  };

  return (
    <main className="rooms-page">
      <header className="rooms-topbar">
        <a href="/chat">back to chat</a>
        <h1>
          <span className="desktop-title">All rooms</span>
          <span className="mobile-title">Rooms</span>
        </h1>
        <button
          className="app-icon-button"
          type="button"
          onClick={() => setIsCreatingRoom(true)}
        >
          +
        </button>
      </header>

      <section className="rooms-content">
        <h2 id="rooms-title">Rooms</h2>
        <div className="rooms-search-row">
          <label htmlFor="room-search">Search rooms</label>
          <input
            id="room-search"
            placeholder="Search rooms..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button
            className={classNames('app-button', 'primary')}
            type="button"
            onClick={() => setIsCreatingRoom(true)}
          >
            + New room
          </button>
        </div>

        {error ? <p className="rooms-status">{error}</p> : null}

        {isCreatingRoom ? (
          <form className="room-create-panel" onSubmit={handleCreateRoom}>
            <label htmlFor="room-name">Room name</label>
            <input id="room-name" name="roomName" placeholder="new-room" />
            <div>
              <button
                className="app-button"
                type="button"
                onClick={() => setIsCreatingRoom(false)}
              >
                cancel
              </button>
              <button
                className={classNames('app-button', 'primary')}
                type="submit"
              >
                create
              </button>
            </div>
          </form>
        ) : null}

        <ol className="all-room-list">
          {visibleRooms.map((room) => (
            <li className="all-room-row" key={room.name}>
              <a
                className="room-summary"
                href={`/chat#${encodeURIComponent(room.name)}`}
              >
                <span className="room-summary-main">
                  <span>#</span>
                  <strong>{room.name}</strong>
                  <small>{room.members} members</small>
                </span>
                <span className="room-summary-preview">
                  <span>{room.preview || 'No messages yet'}</span>
                  <time>{room.time}</time>
                  {room.unread ? <strong>{room.unread}</strong> : null}
                </span>
              </a>

              <div className="room-actions">
                <button className="app-button" type="button">
                  rename
                </button>
                <button
                  className={classNames('app-button', 'danger')}
                  type="button"
                  onClick={() => openDeleteModal(room)}
                >
                  delete
                </button>
                <a
                  className="app-button"
                  href={`/chat#${encodeURIComponent(room.name)}`}
                >
                  {room.joined ? 'open' : 'join'}
                </a>
              </div>
            </li>
          ))}
        </ol>

        {!visibleRooms.length ? (
          <p className="rooms-status">No rooms found.</p>
        ) : null}
      </section>

      {deleteTarget ? (
        <DeleteRoomDialog
          confirmation={deleteConfirmation}
          room={deleteTarget}
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogOpenChange}
          onConfirmationChange={setDeleteConfirmation}
          onSubmit={handleDeleteRoom}
        />
      ) : null}
    </main>
  );
}

export default RoomsPage;
