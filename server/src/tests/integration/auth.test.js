const request = require('supertest');
const { app, truncateAll, pool } = require('./setup');

beforeEach(async () => {
  await truncateAll();
});

describe('session configuration', () => {
  it('includes the standard Vite dev origin in the configured allowlist', async () => {
    const { allowedOrigins } = require('../../config/env');
    expect(allowedOrigins).toEqual(expect.arrayContaining(['http://localhost:5173']));
  });
});

afterAll(async () => {
  await pool.end();
});

describe('POST /api/v1/auth/register', () => {
  it('registers a new user and seeds default categories', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'alice@example.com',
      password: 'Password123',
      name: 'Alice',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.headers['set-cookie'].some((c) => c.startsWith('access_token='))).toBe(true);

    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({
      email: 'bob@example.com',
      password: 'Password123',
      name: 'Bob',
    });
    const cats = await agent.get('/api/v1/categories');
    expect(cats.body.categories.length).toBe(15); // 5 income + 10 expense defaults
  });

  it('rejects duplicate email registration', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'dup@example.com',
      password: 'Password123',
      name: 'Dup',
    });
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'dup@example.com',
      password: 'Password123',
      name: 'Dup2',
    });
    expect(res.status).toBe(409);
  });

  it('rejects weak passwords', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'weak@example.com',
      password: '123',
      name: 'Weak',
    });
    expect(res.status).toBe(422);
  });

  it('never returns the password hash', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'nohash@example.com',
      password: 'Password123',
      name: 'NoHash',
    });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('$2');
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'login@example.com',
      password: 'Password123',
      name: 'Login User',
    });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'login@example.com',
      password: 'Password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('login@example.com');
  });

  it('rejects invalid credentials without revealing whether the email exists', async () => {
    const wrongPassword = await request(app).post('/api/v1/auth/login').send({
      email: 'login@example.com',
      password: 'WrongPassword1',
    });
    const noSuchUser = await request(app).post('/api/v1/auth/login').send({
      email: 'doesnotexist@example.com',
      password: 'WrongPassword1',
    });
    expect(wrongPassword.status).toBe(401);
    expect(noSuchUser.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(noSuchUser.body.error.message);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user when authenticated via cookie', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({
      email: 'me@example.com',
      password: 'Password123',
      name: 'Me User',
    });
    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@example.com');
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('clears the session so subsequent /me calls are unauthorized', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({
      email: 'logout@example.com',
      password: 'Password123',
      name: 'Logout User',
    });
    const logoutRes = await agent.post('/api/v1/auth/logout').set('X-Requested-With', 'finance-app');
    expect(logoutRes.status).toBe(204);
    const meRes = await agent.get('/api/v1/auth/me');
    expect(meRes.status).toBe(401);
  });

  it('refreshes a valid session and keeps the user authenticated', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({
      email: 'refresh@example.com',
      password: 'Password123',
      name: 'Refresh User',
    });

    const refreshRes = await agent.post('/api/v1/auth/refresh');
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.user.email).toBe('refresh@example.com');

    const meRes = await agent.get('/api/v1/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('refresh@example.com');
  });
});

describe('CSRF guard', () => {
  it('rejects mutating requests without the CSRF header even with a valid session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({
      email: 'csrf@example.com',
      password: 'Password123',
      name: 'Csrf User',
    });
    const res = await agent.post('/api/v1/accounts').send({
      name: 'No CSRF header',
      type: 'CASH',
      currency: 'INR',
    });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/v1/auth/forgot-password', () => {
  it('responds the same way whether or not the email is registered (no user enumeration)', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'forgot@example.com',
      password: 'Password123',
      name: 'Forgot User',
    });
    const existing = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'forgot@example.com' });
    const missing = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'nope@example.com' });
    expect(existing.status).toBe(200);
    expect(missing.status).toBe(200);
    expect(existing.body.message).toBe(missing.body.message);
  });
});

describe('POST /api/v1/auth/change-password', () => {
  it('requires the correct current password', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({
      email: 'changepw@example.com',
      password: 'Password123',
      name: 'ChangePw User',
    });
    const res = await agent
      .post('/api/v1/auth/change-password')
      .set('X-Requested-With', 'finance-app')
      .send({ currentPassword: 'WrongOne1', newPassword: 'NewPassword123' });
    expect(res.status).toBe(401);
  });

  it('changes the password and invalidates the session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({
      email: 'changepw2@example.com',
      password: 'Password123',
      name: 'ChangePw2 User',
    });
    const res = await agent
      .post('/api/v1/auth/change-password')
      .set('X-Requested-With', 'finance-app')
      .send({ currentPassword: 'Password123', newPassword: 'NewPassword123' });
    expect(res.status).toBe(200);

    const loginOld = await request(app).post('/api/v1/auth/login').send({
      email: 'changepw2@example.com',
      password: 'Password123',
    });
    expect(loginOld.status).toBe(401);

    const loginNew = await request(app).post('/api/v1/auth/login').send({
      email: 'changepw2@example.com',
      password: 'NewPassword123',
    });
    expect(loginNew.status).toBe(200);
  });
});
