/** An event emitted by the orchestrator for observability. */
export interface OrchestratorEvent {
	/** Event type identifier. */
	type: string
	/** ISO 8601 timestamp. */
	timestamp: string
	/** Arbitrary event payload. */
	payload: Record<string, unknown>
}
