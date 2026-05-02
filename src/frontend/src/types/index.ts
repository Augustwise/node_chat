export type LoginResponse = {
  username: string;
};

export type Room = {
  name: string;
  creatorUsername: string;
  creatorUsernameKey: string;
  ownerUserId: number | null;
  members: number;
  preview: string;
  time: string;
  unread: number;
  joined: boolean;
};

export type ChatMessage = {
  id: number;
  author: string;
  date: string;
  time: string;
  body: string;
};
