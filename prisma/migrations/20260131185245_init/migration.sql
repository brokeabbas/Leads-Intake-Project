-- CreateTable
CREATE TABLE `Lead` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `website` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyDomain` VARCHAR(191) NULL,
    `companyName` VARCHAR(191) NULL,
    `companySize` VARCHAR(191) NULL,
    `industry` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `emailStatus` VARCHAR(191) NULL,
    `domainEmailCount` INTEGER NULL,
    `enrichmentError` VARCHAR(191) NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `qualified` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Lead_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
