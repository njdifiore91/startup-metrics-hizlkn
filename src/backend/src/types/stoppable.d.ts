declare module 'stoppable' {
  import { Server } from 'http';

  interface StoppableServer extends Server {
    stop(callback?: () => void): void;
  }

  function stoppable(server: Server, grace?: number): StoppableServer;

  export = stoppable;
  export type { StoppableServer };
} 