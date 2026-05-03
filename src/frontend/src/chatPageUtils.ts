import type { ChatMessage } from './types';

export const usernameKey = 'chat.username';
export const duplicateRoomMessage = 'A room with that name already exists.';

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
  const messageDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (messageDate.getTime() === today.getTime()) return 'Today';
  if (messageDate.getTime() === yesterday.getTime()) return 'Yesterday';

  return messageDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(messageDate.getFullYear() !== today.getFullYear() && {
      year: 'numeric',
    }),
  });
}

/**
 * Determines which messages should be animated based on previous state.
 *
 * This function compares the current list of messages with the next list to identify:
 * - Messages that were already animated (preserve animation state)
 * - New messages that weren't in the previous list (mark for animation)
 * - Existing messages that weren't animated before (no animation)
 *
 * @param nextMessages - The new list of messages from the server
 * @param currentMessages - The current list of messages with animation states
 * @param shouldAnimateNewMessages - Whether new messages should animate at all
 * @returns The next messages with shouldAnimate flags
 */
export function markNewMessages(
  nextMessages: ChatMessage[],
  currentMessages: DisplayMessage[],
  shouldAnimateNewMessages: boolean,
): DisplayMessage[] {
  if (!shouldAnimateNewMessages) {
    return nextMessages;
  }

  // Create a Set of all current message IDs for quick lookup
  const currentMessageIds = new Set(
    currentMessages.map((message) => message.id),
  );

  // Create a Set of message IDs that were already animated
  const animatedMessageIds = new Set(
    currentMessages
      .filter((message) => message.shouldAnimate)
      .map((message) => message.id),
  );

  // Map through next messages, setting shouldAnimate based on:
  // - If it was already animated, keep it animated
  // - If it's a new message (not in current), animate it
  return nextMessages.map((message) => ({
    ...message,
    shouldAnimate:
      animatedMessageIds.has(message.id) || !currentMessageIds.has(message.id),
  }));
}
