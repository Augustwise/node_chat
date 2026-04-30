import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { createRoom, deleteRoom, fetchRooms, renameRoom } from './api';
import type { Room } from './types';

const usernameKey = 'chat.username';
const duplicateRoomMessage = 'A room with that name already exists.';

function getUsernameKey(username: string) {
  return username.toLowerCase();
}

function getStoredUsername() {
  const storedUsername = localStorage.getItem(usernameKey);

  return storedUsername?.trim() || 'guest';
}

function useRoomsPage() {
  const username = getStoredUsername();
  const currentUsernameKey = getUsernameKey(username);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Room | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState('');

  const visibleRooms = useMemo(
    () =>
      rooms.filter((room) =>
        room.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [rooms, search],
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
    } catch (error) {
      setError(
        error instanceof Error && error.message === duplicateRoomMessage
          ? error.message
          : 'Could not create that room.',
      );
    }
  };

  const canManageRoom = (room: Room) =>
    room.creatorUsernameKey === currentUsernameKey;

  const openRenameModal = (room: Room) => {
    setRenameTarget(room);
    setRenameName(room.name);
    setRenameDialogOpen(true);
  };

  const handleRenameDialogOpenChange = useCallback((open: boolean) => {
    setRenameDialogOpen(open);
    if (!open) {
      setRenameTarget(null);
      setRenameName('');
    }
  }, []);

  const handleRenameRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextName = renameName.trim();

    if (!renameTarget || !nextName || nextName === renameTarget.name) {
      return;
    }

    try {
      const room = await renameRoom(renameTarget.name, nextName, username);

      setRooms((currentRooms) =>
        currentRooms.map((currentRoom) =>
          currentRoom.name === renameTarget.name ? room : currentRoom,
        ),
      );
      setRenameDialogOpen(false);
      setError('');
    } catch {
      setError('Could not rename that room.');
    }
  };

  const openDeleteModal = (room: Room) => {
    setDeleteTarget(room);
    setDeleteConfirmation('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setDeleteTarget(null);
      setDeleteConfirmation('');
    }
  }, []);

  const handleDeleteRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!deleteTarget || deleteConfirmation !== deleteTarget.name) {
      return;
    }

    try {
      await deleteRoom(deleteTarget.name, username);
      setRooms((currentRooms) =>
        currentRooms.filter((room) => room.name !== deleteTarget.name),
      );
      setDeleteDialogOpen(false);
      setError('');
    } catch {
      setError('Could not delete that room.');
    }
  };

  return {
    canManageRoom,
    deleteConfirmation,
    deleteDialogOpen,
    deleteTarget,
    error,
    handleCreateRoom,
    handleDeleteDialogOpenChange,
    handleDeleteRoom,
    handleRenameDialogOpenChange,
    handleRenameRoom,
    isCreatingRoom,
    openDeleteModal,
    openRenameModal,
    renameDialogOpen,
    renameName,
    renameTarget,
    search,
    setDeleteConfirmation,
    setIsCreatingRoom,
    setRenameName,
    setSearch,
    visibleRooms,
  };
}

export default useRoomsPage;
