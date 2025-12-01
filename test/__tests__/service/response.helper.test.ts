import { Response } from 'express';
import ResponseHelper from '../../../src/service/response.helper';
import { RESPONSES, CONST_NAME } from '../../../src/constant';

describe('ResponseHelper', () => {
  let mockResponse: Partial<Response>;
  let responseHelper: typeof ResponseHelper;

  beforeEach(() => {
    // Mock the response object
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    responseHelper = ResponseHelper;
  });

  describe('success', () => {
    it('should send success response with default data', () => {
      const responseData = { error: false, message: 'Success', data: {} };
      
      responseHelper.success(mockResponse as Response, responseData);

      expect(mockResponse.status).toHaveBeenCalledWith(RESPONSES.SUCCESS);
      expect(mockResponse.send).toHaveBeenCalledWith(responseData);
    });

    it('should send success response with custom data', () => {
      const customData = { id: 1, name: 'Test' };
      const responseData = { error: false, message: 'Success', data: customData };
      
      responseHelper.success(mockResponse as Response, responseData);

      expect(mockResponse.status).toHaveBeenCalledWith(RESPONSES.SUCCESS);
      expect(mockResponse.send).toHaveBeenCalledWith(responseData);
    });
  });

  describe('error', () => {
    it('should handle not found error', () => {
      const errorMessage = `${CONST_NAME.NOT_FOUND} user`;
      const responseData = { error: true, message: errorMessage };
      
      responseHelper.error(mockResponse as Response, responseData);

      expect(mockResponse.status).toHaveBeenCalledWith(RESPONSES.NOTFOUND);
      expect(mockResponse.send).toHaveBeenCalledWith(responseData);
    });

    it('should handle bad request error with custom status', () => {
      const responseData = { 
        error: true, 
        message: 'Validation error',
        status: RESPONSES.BADREQUEST 
      };
      
      responseHelper.error(mockResponse as Response, responseData);

      expect(mockResponse.status).toHaveBeenCalledWith(RESPONSES.BADREQUEST);
      expect(mockResponse.send).toHaveBeenCalledWith(responseData);
    });

    it('should handle bad request error without custom status', () => {
      const responseData = { 
        error: true, 
        message: 'Bad request error'
      };
      
      responseHelper.error(mockResponse as Response, responseData);

      expect(mockResponse.status).toHaveBeenCalledWith(RESPONSES.BADREQUEST);
      expect(mockResponse.send).toHaveBeenCalledWith(responseData);
    });

    it('should handle internal server error when no message is provided', () => {
      const responseData = { error: true };
      
      responseHelper.error(mockResponse as Response, responseData);

      expect(mockResponse.status).toHaveBeenCalledWith(RESPONSES.INTERNAL_SERVER);
      expect(mockResponse.send).toHaveBeenCalledWith(responseData);
    });

    it('should handle empty response data', () => {
      responseHelper.error(mockResponse as Response, {});

      expect(mockResponse.status).toHaveBeenCalledWith(RESPONSES.INTERNAL_SERVER);
      expect(mockResponse.send).toHaveBeenCalledWith({});
    });
  });
});