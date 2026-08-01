CREATE TABLE `coach_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`xp` int NOT NULL DEFAULT 0,
	`level` int NOT NULL DEFAULT 1,
	`coins` int NOT NULL DEFAULT 0,
	`badges` json,
	`filmsAnalyzed` int NOT NULL DEFAULT 0,
	`plansGenerated` int NOT NULL DEFAULT 0,
	`challengesWon` int NOT NULL DEFAULT 0,
	`playsDesigned` int NOT NULL DEFAULT 0,
	`predictionsLogged` int NOT NULL DEFAULT 0,
	`accuracySum` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coach_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `coach_progress_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `custom_plays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`set` varchar(80),
	`playType` varchar(32),
	`positions` json,
	`routes` json,
	`notes` text,
	`aiGrade` json,
	`shareId` varchar(24),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `custom_plays_id` PRIMARY KEY(`id`),
	CONSTRAINT `custom_plays_shareId_unique` UNIQUE(`shareId`)
);
--> statement-breakpoint
CREATE TABLE `game_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`userId` int NOT NULL,
	`ourScore` int NOT NULL,
	`theirScore` int NOT NULL,
	`predictedTheirScore` int,
	`accuracyPct` int,
	`won` int NOT NULL DEFAULT 0,
	`notes` text,
	`aiReview` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_results_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_results_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `player_dna` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`playerProfileId` int NOT NULL,
	`overall` int NOT NULL,
	`rarity` enum('bronze','silver','gold','diamond') NOT NULL DEFAULT 'bronze',
	`tendencies` json,
	`attributes` json,
	`hotZones` json,
	`badges` json,
	`clutchRating` int NOT NULL DEFAULT 50,
	`underPressure` int NOT NULL DEFAULT 50,
	`lateShotClock` int NOT NULL DEFAULT 50,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `player_dna_id` PRIMARY KEY(`id`)
);
