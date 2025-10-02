import '@testing-library/jest-dom';

// Mock TextEncoder/TextDecoder for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock XMLHttpRequest
global.XMLHttpRequest = jest.fn(() => ({
  open: jest.fn(),
  send: jest.fn(),
  setRequestHeader: jest.fn(),
  addEventListener: jest.fn(),
  upload: {
    addEventListener: jest.fn()
  },
  status: 200,
  responseText: JSON.stringify({ success: true, data: [] })
})) as any;

// Mock File and FileList
global.File = class MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;

  constructor(chunks: any[], filename: string, options: any = {}) {
    this.name = filename;
    this.size = chunks.reduce((acc, chunk) => acc + (chunk.length || chunk.byteLength || 0), 0);
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
  }
} as any;

// Mock DataTransfer for drag and drop tests
global.DataTransfer = class MockDataTransfer {
  files: File[] = [];
  types: string[] = [];
  
  constructor() {
    this.files = [];
    this.types = [];
  }
} as any;

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn()
  }
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams()
}));