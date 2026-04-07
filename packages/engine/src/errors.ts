/**
 * Error types for @seatkit/engine business logic operations
 * @module errors
 */

/**
 * Returned by assignTables() / assignTablesManual() when no valid assignment exists
 */
export type AssignmentError = {
	readonly code:
		| 'NO_TABLES_AVAILABLE'
		| 'INSUFFICIENT_CAPACITY'
		| 'STARTING_TABLE_NOT_FOUND'
		| 'STARTING_TABLE_OCCUPIED';
	readonly message: string;
};

/**
 * Returned by isTableOccupied() when a requested table is already occupied
 */
export type ConflictError = {
	readonly code: 'TABLE_CONFLICT';
	readonly message: string;
	readonly tableId: string;
	readonly conflictingReservationId: string;
};

/**
 * Returned by classifyReservationType() on invalid input
 */
export type ClassificationError = {
	readonly code: 'INVALID_CLASSIFICATION_INPUT';
	readonly message: string;
};
