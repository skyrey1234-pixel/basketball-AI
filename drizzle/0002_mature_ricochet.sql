CREATE TABLE `attack_packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`package` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attack_packages_id` PRIMARY KEY(`id`)
);
