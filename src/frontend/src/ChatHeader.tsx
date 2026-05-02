import classNames from 'classnames';
import type { Room } from './types';

type ChatHeaderProps = {
  activeRoom: Room | undefined;
  onLeaveActiveRoom: () => void;
};

function ChatHeader({ activeRoom, onLeaveActiveRoom }: ChatHeaderProps) {
  return (
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
            onClick={onLeaveActiveRoom}
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
  );
}

export default ChatHeader;
