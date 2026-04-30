export type LoginResponse = {
  username: string;
};

export type Room = {
  name: string;
  creatorUsername: string;
  creatorUsernameKey: string;
  members: number;
  preview: string;
  time: string;
  unread: number;
  joined: boolean;
};

export type ChatMessage = {
  id: number;
  author: string;
  time: string;
  body: string;
};
