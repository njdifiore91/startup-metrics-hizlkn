/**
 * Express Request interface extension for the Startup Metrics Benchmarking Platform.
 * Provides type definitions for authentication, session management, and request-specific data.
 * @version 1.0.0
 */

import { Express } from 'express';
import { IUser } from '../interfaces/IUser';

declare global {
  namespace Express {
    /**
     * Extended Express Request interface with authentication and session properties.
     * Implements comprehensive type safety for user sessions and request handling.
     * 
     * @interface Request
     * @extends Express.Request
     * @property {IUser | undefined} user - Authenticated user object from Google OAuth
     * @property {string | undefined} token - JWT token for request authentication
     * @property {string} sessionID - Unique session identifier for Redis tracking
     */
    interface Request {
      /**
       * Authenticated user object containing user details and role.
       * Undefined if request is not authenticated.
       */
      user?: IUser;

      /**
       * JWT token used for request authentication.
       * Undefined if no token is present in the request.
       */
      token?: string;

      /**
       * Unique session identifier for Redis-based session tracking.
       * Generated for each authenticated session.
       */
      sessionID: string;
    }
  }
}