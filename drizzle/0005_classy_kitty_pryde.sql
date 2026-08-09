CREATE TABLE `form_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int,
	`playerName` varchar(255),
	`videoUrl` text,
	`analysisJson` text,
	`status` enum('pending','analyzing','complete','error') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `form_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `highlight_reels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255),
	`momentsJson` text,
	`status` enum('pending','generating','complete','error') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `highlight_reels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shot_charts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int,
	`teamName` varchar(255) NOT NULL,
	`opponentName` varchar(255),
	`gameDate` varchar(32),
	`shotsJson` text NOT NULL DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shot_charts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shot_detection_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`userId` int NOT NULL,
	`analyticsJson` text,
	`status` enum('pending','analyzing','complete','error') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shot_detection_reports_id` PRIMARY KEY(`id`)
);
