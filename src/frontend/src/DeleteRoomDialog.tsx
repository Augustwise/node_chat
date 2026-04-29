import type { FormEvent } from 'react';
import type { Room } from './types';

type DeleteRoomDialogProps = {
  confirmation: string;
  onCancel: () => void;
  onConfirmationChange: (confirmation: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  room: Room;
};

function DeleteRoomDialog({
  confirmation,
  onCancel,
  onConfirmationChange,
  onSubmit,
  room,
}: DeleteRoomDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="delete-room-dialog" onSubmit={onSubmit}>
        <h2 id="delete-room-title">delete #{room.name} ?</h2>
        <label htmlFor="delete-room-confirm">
          type the room name to confirm
        </label>
        <input
          autoFocus
          id="delete-room-confirm"
          value={confirmation}
          onChange={(event) => onConfirmationChange(event.target.value)}
          placeholder={room.name}
        />
        <div>
          <button className="app-button" type="button" onClick={onCancel}>
            cancel
          </button>
          <button
            className="app-button danger solid"
            disabled={confirmation !== room.name}
            type="submit"
          >
            delete
          </button>
        </div>
      </form>
    </div>
  );
}

export default DeleteRoomDialog;
