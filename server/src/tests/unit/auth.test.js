const {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
  generateOpaqueToken,
  hashToken,
} = require('../../utils/auth');

describe('password hashing', () => {
  it('never stores the plaintext password', async () => {
    const hash = await hashPassword('SuperSecret123!');
    expect(hash).not.toBe('SuperSecret123!');
    expect(hash.startsWith('$2')).toBe(true); // bcrypt hash format
  });

  it('verifies a correct password', async () => {
    const hash = await hashPassword('SuperSecret123!');
    expect(await verifyPassword('SuperSecret123!', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('SuperSecret123!');
    expect(await verifyPassword('WrongPassword!', hash)).toBe(false);
  });

  it('produces different hashes for the same password (random salt)', async () => {
    const [h1, h2] = await Promise.all([hashPassword('same-pw'), hashPassword('same-pw')]);
    expect(h1).not.toBe(h2);
  });
});

describe('access tokens', () => {
  it('signs and verifies a valid access token', () => {
    const token = signAccessToken({ id: 'user-123', email: 'a@b.com' });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('user-123');
    expect(decoded.email).toBe('a@b.com');
  });

  it('throws when verifying a tampered token', () => {
    const token = signAccessToken({ id: 'user-123', email: 'a@b.com' });
    const tampered = token.slice(0, -2) + 'xx';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

describe('opaque refresh/reset tokens', () => {
  it('generates a sufficiently long random token', () => {
    const token = generateOpaqueToken();
    expect(token.length).toBeGreaterThanOrEqual(64);
  });

  it('hashes tokens deterministically for lookup', () => {
    const token = generateOpaqueToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('produces different hashes for different tokens', () => {
    expect(hashToken(generateOpaqueToken())).not.toBe(hashToken(generateOpaqueToken()));
  });
});
