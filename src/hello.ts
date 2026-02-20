/**
 * Returns a personalised greeting string.
 *
 * When a name is provided the greeting uses it; otherwise it falls back to
 * "World". For example:
 *   greet()          // "Hello, World!"
 *   greet('Nathan')  // "Hello, Nathan!"
 *
 * @param name - Optional name of the person to greet.
 * @returns A greeting string of the form "Hello, <name>!".
 */
export function greet(name?: string): string {
	return `Hello, ${name ?? 'World'}!`
}
