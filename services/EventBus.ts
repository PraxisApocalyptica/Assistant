import { EventEmitter } from 'eventemitter3';

// Create a single, shared instance of the event emitter.
const eventBus = new EventEmitter();

export default eventBus;