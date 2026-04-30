import type { FormEvent } from 'react';
import classNames from 'classnames';
import type { Room } from './types';

type DeleteRoomDialogProps = {
  confirmation: string;
  isClosing?: boolean;
  onCancel: () => void;
  onConfirmationChange: (confirmation: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  room: Room;
};

function DeleteRoomDialog({
  confirmation,
  isClosing,
  onCancel,
  onConfirmationChange,
  onSubmit,
  room,
}: DeleteRoomDialogProps) {
  return (
    <div
      // isClosing lets the CSS play the exit animation before unmounting.
      className={classNames('modal-backdrop', {
        'modal-closing': isClosing,
      })}
      role="presentation"
    >
      <form
        className={classNames('delete-room-dialog', {
          'dialog-closing': isClosing,
        })}
        onSubmit={onSubmit}
      >
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
            className={classNames('app-button', 'danger', 'solid')}
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
