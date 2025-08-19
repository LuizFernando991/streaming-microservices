export const mockRedis = {
  hvals: jest.fn(),
  hset: jest.fn(),
  expire: jest.fn(),
  hlen: jest.fn(),
  hgetall: jest.fn(),
  multi: jest.fn().mockReturnThis(),
  hdel: jest.fn().mockReturnThis(),
  del: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
}

export const mockBucketClient = {
  createNewMultipartUpload: jest.fn(),
  uploadPart: jest.fn(),
  completeMultPartUpload: jest.fn(),
}

export const mockQueueAdapter = {
  onUploadCompleted: jest.fn(),
}

export const mockRedlock = {
  acquire: jest.fn().mockResolvedValue({
    release: jest.fn().mockResolvedValue(undefined),
  }),
}

export const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}
