import classNames from 'classnames';
import DeleteRoomDialog from './DeleteRoomDialog';
import RenameRoomDialog from './RenameRoomDialog';
import useRoomsPage from './useRoomsPage';

function RoomsPage() {
  const {
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
  } = useRoomsPage();

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

        {error ? <p className="rooms-status error">{error}</p> : null}

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
          {visibleRooms.map((room) => {
            const canManage = canManageRoom(room);

            return (
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
                  <button
                    className="app-button"
                    disabled={!canManage}
                    title={
                      canManage
                        ? 'Rename room'
                        : 'Only the room creator can rename it'
                    }
                    type="button"
                    onClick={() => openRenameModal(room)}
                  >
                    rename
                  </button>
                  <button
                    className={classNames('app-button', 'danger')}
                    disabled={!canManage}
                    title={
                      canManage
                        ? 'Delete room'
                        : 'Only the room creator can delete it'
                    }
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
            );
          })}
        </ol>

        {!visibleRooms.length ? (
          <p className="rooms-status">No rooms found.</p>
        ) : null}
      </section>

      {renameTarget ? (
        <RenameRoomDialog
          name={renameName}
          room={renameTarget}
          open={renameDialogOpen}
          onOpenChange={handleRenameDialogOpenChange}
          onNameChange={setRenameName}
          onSubmit={handleRenameRoom}
        />
      ) : null}

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
