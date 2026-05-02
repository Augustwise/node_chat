import type { ChatMessage } from './types';

export const usernameKey = 'chat.username';
export const duplicateRoomMessage = 'A room with that name already exists.';
export const messageRefreshIntervalMs = 3000;

export type DisplayMessage = ChatMessage & {
  shouldAnimate?: boolean;
};

export function getHashRoomName() {
  return decodeURIComponent(window.location.hash.replace(/^#/, '')).trim();
}

/**
 * Formats a date string into a human-readable label.
 * Returns 'Today' or 'Yesterday' for recent dates, otherwise formats as "Month Day" or "Month Day, Year".
 */
export function formatDayLabel(isoString: string): string {
  const date = new Date(isoString);
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (messageDate.getTime() === today.getTime()) return 'Today';
  if (messageDate.getTime() === yesterday.getTime()) return 'Yesterday';

  return messageDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(messageDate.getFullYear() !== today.getFullYear() && { year: 'numeric' }),
  });
}

export function markNewMessages(
  nextMessages: ChatMessage[],
  currentMessages: DisplayMessage[],
  shouldAnimateNewMessages: boolean,
): DisplayMessage[] {
  if (!shouldAnimateNewMessages) {
    return nextMessages;
  }

  const currentMessageIds = new Set(
    currentMessages.map((message) => message.id),
  );
  const animatedMessageIds = new Set(
    currentMessages
      .filter((message) => message.shouldAnimate)
      .map((message) => message.id),
  );

  return nextMessages.map((message) => ({
    ...message,
    shouldAnimate:
      animatedMessageIds.has(message.id) || !currentMessageIds.has(message.id),
  }));
}
