CREATE TABLE `time_machine_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`possessions` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `time_machine_sessions_id` PRIMARY KEY(`id`)
);
