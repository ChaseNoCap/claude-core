import { EventEmitter } from 'events';
export class EventBus {
    emitter = new EventEmitter();
    async emit(event) {
        this.emitter.emit(event.type, event);
    }
    on(eventType, handler) {
        this.emitter.on(eventType, handler);
    }
    off(eventType, handler) {
        this.emitter.off(eventType, handler);
    }
}
//# sourceMappingURL=index.js.map