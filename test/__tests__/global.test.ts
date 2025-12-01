import { setGlobalEnvironment } from '../../src/global';
import Environment from '../../src/environments/environment';

describe('Global Environment', () => {
  const originalEnv = (global as any).environment;

  afterEach(() => {
    (global as any).environment = originalEnv;
  });

  it('should set the global environment variable', () => {
    const mockEnvironment: Environment = {
      env: 'test',
      port: 3000,
      databaseUrl: 'test-db-url',
      redisHost: 'localhost',
      redisPort: '6379',
      redisExpiry: 3600,
      evmHost: 'http://test-evm',
      secretKey: 'test-secret',
      sendgrid_key: 'test-sendgrid-key',
      service_email: 'test@example.com',
      gitbook_url: 'https://test.gitbook.com'
    } as Environment;

    setGlobalEnvironment(mockEnvironment);

    expect((global as any).environment).toBeDefined();
    expect((global as any).environment).toEqual(mockEnvironment);
    expect((global as any).environment.env).toBe('test');
  });

  it('should override existing global environment', () => {
    const initialEnv = { env: 'initial' } as Environment;
    const newEnv = { env: 'new' } as Environment;
    
    (global as any).environment = initialEnv;
    
    setGlobalEnvironment(newEnv);

    expect((global as any).environment).toBe(newEnv);
    expect((global as any).environment).toBe(newEnv);
    expect((global as any).environment.env).toBe('new');
  });
});