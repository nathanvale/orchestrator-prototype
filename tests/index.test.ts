import { describe, expect, it } from 'bun:test'
import type { OrchestratorEvent } from '../src'

describe('OrchestratorEvent', () => {
	it('should accept a valid event shape', () => {
		const event: OrchestratorEvent = {
			type: 'task.started',
			timestamp: new Date().toISOString(),
			payload: { taskId: '1' },
		}
		expect(event.type).toBe('task.started')
		expect(event.payload.taskId).toBe('1')
	})
})
