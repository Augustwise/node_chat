type LoginResponse = {
  username: string;
};

export const loginErrors = {
  duplicateUsername: 'duplicate-username',
  failed: 'login-failed',
  unreachable: 'server-unreachable',
} as const;

export async function login(username: string): Promise<LoginResponse> {
  let response: Response;

  try {
    response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });
  } catch {
    throw new Error(loginErrors.unreachable);
  }

  if (response.status === 409) {
    throw new Error(loginErrors.duplicateUsername);
  }

  if (!response.ok) {
    throw new Error(loginErrors.failed);
  }

  return response.json();
}
