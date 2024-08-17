export const GAME_EVENT_LABEL = "gameEvent";

const createQueuedEvent = (event) => ({
    id: crypto.randomUUID(),
    type: event.type ?? "generic",
    createdAt: new Date(),
    ...event.detail,
});

const createArchivedEvent = (queuedEvent) => ({
    id: queuedEvent.id,
    type: queuedEvent.type,
    target: queuedEvent.target,
    createdAt: queuedEvent.createdAt?.toISOString?.(),
    completedAt: new Date().toISOString(),
});

export const getEventManager = (containerElement) => {
    const eventManagerState = {
        pendingQueue: [],
        completedIds: {},
        archive: [],
        addEventToQueue(newEvent) {
            this.pendingQueue = [
                ...Array.from(this.pendingQueue),
                createQueuedEvent(newEvent),
            ];
            return this;
        },
        snapshotPendingEvents() {
            const newThis = this.removeAcknowledgedEvents();
            return newThis.pendingQueue;
        },
        acknowledgeEvent(eventId) {
            this.completedIds[eventId] = true;
            return this;
        },
        removeAcknowledgedEvents() {
            if (!Object.entries(this.completedIds)?.length > 0) {
                return this;
            }

            const newArchiveRecords = this.pendingQueue.filter(
                (pending) => this.completedIds[pending.id]
            );
            this.pendingQueue = this.pendingQueue.filter(
                (pending) => !this.completedIds[pending.id]
            );

            this.archive = [
                ...this.archive,
                newArchiveRecords.map((eventRecord) => {
                    delete this.completedIds[eventRecord.id];
                    return createArchivedEvent(eventRecord);
                }),
            ];
            return this;
        },
    };

    containerElement.addEventListener(GAME_EVENT_LABEL, (event) => {
        eventManagerState.addEventToQueue(event);
    });

    return eventManagerState;
};
