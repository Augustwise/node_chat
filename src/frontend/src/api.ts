import type { LoginResponse, Room, ChatMessage } from './types';

export type { Room, ChatMessage };

export const loginErrors = {
  duplicateUsername: 'duplicate-username',
  failed: 'login-failed',
  unreachable: 'server-unreachable',
} as const;

async function request<T>(input: RequestInfo | URL, init?: RequestInit) {
  let response: Response;

  try {
    response = await fetch(input, init);
  } catch {
    throw new Error(loginErrors.unreachable);
  }

  return response as Response & { json(): Promise<T> };
}

export async function login(username: string): Promise<LoginResponse> {
  const response = await request<LoginResponse>('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username }),
  });

  if (response.status === 409) {
    throw new Error(loginErrors.duplicateUsername);
  }

  if (!response.ok) {
    throw new Error(loginErrors.failed);
  }

  return response.json();
}

export async function fetchRooms(): Promise<Room[]> {
  const response = await request<Room[]>('/api/rooms');

  if (!response.ok) {
    throw new Error('rooms-failed');
  }

  return response.json();
}

export async function createRoom(
  name: string,
  username: string,
): Promise<Room> {
  const response = await request<Room>('/api/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, username }),
  });

  if (!response.ok) {
    throw new Error('room-create-failed');
  }

  return response.json();
}

export async function deleteRoom(name: string): Promise<void> {
  const response = await request<void>(
    `/api/rooms/${encodeURIComponent(name)}`,
    {
      method: 'DELETE',
    },
  );

  if (!response.ok) {
    throw new Error('room-delete-failed');
  }
}

export async function fetchMessages(roomName: string): Promise<ChatMessage[]> {
  const response = await request<ChatMessage[]>(
    `/api/rooms/${encodeURIComponent(roomName)}/messages`,
  );

  if (!response.ok) {
    throw new Error('messages-failed');
  }

  return response.json();
}

export async function postMessage(
  roomName: string,
  author: string,
  body: string,
): Promise<ChatMessage> {
  const response = await request<ChatMessage>(
    `/api/rooms/${encodeURIComponent(roomName)}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ author, body }),
    },
  );

  if (!response.ok) {
    throw new Error('message-post-failed');
  }

  return response.json();
}
