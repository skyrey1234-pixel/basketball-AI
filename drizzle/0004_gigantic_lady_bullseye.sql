CREATE TABLE `possessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`data` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `possessions_id` PRIMARY KEY(`id`)
);
