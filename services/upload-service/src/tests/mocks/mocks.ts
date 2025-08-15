export const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}

export const mockBucketClient = {
  createNewMultipartUpload: jest.fn(),
  uploadPart: jest.fn(),
  completeMultPartUpload: jest.fn(),
}
