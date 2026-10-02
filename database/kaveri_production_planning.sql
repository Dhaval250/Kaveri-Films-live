-- ============================================================
-- Kaveri Metallising - Full Production System
-- Database: MySQL (phpMyAdmin ready)
-- Includes: Planning + Production Department + Operator Module
-- ============================================================

CREATE DATABASE IF NOT EXISTS `kaveri_production`
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `kaveri_production`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `production_records`;
DROP TABLE IF EXISTS `production_assignments`;
DROP TABLE IF EXISTS `party_allocations`;
DROP TABLE IF EXISTS `production_plans`;
DROP TABLE IF EXISTS `machines`;
DROP TABLE IF EXISTS `shifts`;
DROP TABLE IF EXISTS `parties`;
DROP TABLE IF EXISTS `departments`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `density` DECIMAL(10,4) NOT NULL DEFAULT 1.3900,
  `email` VARCHAR(150) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('Super Admin','Admin','Shift Manager','Operator') NOT NULL DEFAULT 'Operator',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `density` DECIMAL(10,4) NOT NULL DEFAULT 1.3900,
  `description` VARCHAR(255) NULL,
  `permissions` TEXT NOT NULL,
  `is_system` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `products` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `density` DECIMAL(10,4) NOT NULL DEFAULT 1.3900,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_products_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `departments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `density` DECIMAL(10,4) NOT NULL DEFAULT 1.3900,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_departments_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `parties` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parties_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `machines` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `density` DECIMAL(10,4) NOT NULL DEFAULT 1.3900,
  `department_id` INT UNSIGNED NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_machines_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shifts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `density` DECIMAL(10,4) NOT NULL DEFAULT 1.3900,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shifts_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `production_plans` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `planning_number` VARCHAR(50) NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `department_id` INT UNSIGNED NOT NULL,
  `width_mm` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `thickness_micron` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `density` DECIMAL(10,4) NOT NULL DEFAULT 0,
  `weight_kg` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `calculated_length` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `apply_scrapping` TINYINT(1) NOT NULL DEFAULT 0,
  `scrap_width_cm` DECIMAL(10,2) NULL,
  `scrap_weight_kg` DECIMAL(12,3) NULL DEFAULT 0,
  `scrap_length_m` DECIMAL(14,2) NULL DEFAULT 0,
  `scrap_percentage` DECIMAL(8,4) NULL DEFAULT 0,
  `total_input_kg` DECIMAL(12,3) NULL DEFAULT 0,
  `total_expected_kg` DECIMAL(12,3) NULL DEFAULT 0,
  `waste_kg` DECIMAL(12,3) NULL DEFAULT 0,
  `waste_percentage` DECIMAL(8,4) NULL DEFAULT 0,
  `productivity_pct` DECIMAL(8,4) NULL DEFAULT 0,
  `net_length_m` DECIMAL(14,2) NULL DEFAULT 0,
  `status` ENUM('Draft','Planned','Ready for Production','In Progress','Partially Completed','Completed','On Hold','Cancelled') NOT NULL DEFAULT 'Draft',
  `plan_date` DATE NOT NULL,
  `created_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_planning_number` (`planning_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `party_allocations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `production_plan_id` INT UNSIGNED NOT NULL,
  `party_id` INT UNSIGNED NOT NULL,
  `width_mm` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `weight_kg` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `length_m` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_alloc_plan` (`production_plan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `production_assignments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `production_plan_id` INT UNSIGNED NOT NULL,
  `shift_manager_id` INT UNSIGNED NOT NULL,
  `shift_id` INT UNSIGNED NOT NULL,
  `machine_id` INT UNSIGNED NOT NULL,
  `operator_id` INT UNSIGNED NOT NULL,
  `start_date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `is_shift_change` TINYINT(1) NOT NULL DEFAULT 0,
  `remarks` TEXT NULL,
  `status` ENUM('Not Started','In Progress','Submitted','Completed','On Hold') NOT NULL DEFAULT 'Not Started',
  `actual_start_datetime` DATETIME NULL,
  `start_remarks` TEXT NULL,
  `created_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_asg_plan` (`production_plan_id`),
  KEY `idx_asg_operator` (`operator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `production_records` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `assignment_id` INT UNSIGNED NOT NULL,
  `production_plan_id` INT UNSIGNED NOT NULL,
  `operator_id` INT UNSIGNED NOT NULL,
  `input_weight_kg` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `output_weight_kg` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `actual_length_m` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `waste_weight_kg` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `waste_percentage` DECIMAL(8,4) NOT NULL DEFAULT 0,
  `actual_width_mm` DECIMAL(10,2) NULL,
  `actual_thickness_micron` DECIMAL(10,2) NULL,
  `remarks` TEXT NULL,
  `status` ENUM('Draft','Submitted','Approved','Rejected') NOT NULL DEFAULT 'Draft',
  `manager_remarks` TEXT NULL,
  `submitted_at` DATETIME NULL,
  `reviewed_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rec_asg` (`assignment_id`),
  KEY `idx_rec_plan` (`production_plan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SEED
INSERT INTO `users` (`name`, `email`, `password`, `role`) VALUES
('Admin User', 'admin@kaveri.com', '$2b$10$.u9V561PaxikwOSk9zRLEuCeSEocOsWwNAnPMkC4LdKX9u7ZNi.Wq', 'Super Admin'),
('Vijay Sharma', 'vijay@kaveri.com', '$2b$10$.u9V561PaxikwOSk9zRLEuCeSEocOsWwNAnPMkC4LdKX9u7ZNi.Wq', 'Shift Manager'),
('Sanjay Verma', 'sanjay@kaveri.com', '$2b$10$.u9V561PaxikwOSk9zRLEuCeSEocOsWwNAnPMkC4LdKX9u7ZNi.Wq', 'Shift Manager'),
('Rahul Verma', 'rahul@kaveri.com', '$2b$10$.u9V561PaxikwOSk9zRLEuCeSEocOsWwNAnPMkC4LdKX9u7ZNi.Wq', 'Shift Manager'),
('Vishal Kumar', 'vishal@kaveri.com', '$2b$10$.u9V561PaxikwOSk9zRLEuCeSEocOsWwNAnPMkC4LdKX9u7ZNi.Wq', 'Operator'),
('Ramesh Patel', 'ramesh@kaveri.com', '$2b$10$.u9V561PaxikwOSk9zRLEuCeSEocOsWwNAnPMkC4LdKX9u7ZNi.Wq', 'Operator'),
('Operator User', 'operator@kaveri.com', '$2b$10$.u9V561PaxikwOSk9zRLEuCeSEocOsWwNAnPMkC4LdKX9u7ZNi.Wq', 'Operator');

INSERT INTO `roles` (`name`, `description`, `permissions`, `is_system`, `is_active`) VALUES
('Super Admin', 'Full system access', '["dashboard","production_planning","products","production_department","my_assignments","work_history","reports","users","roles","settings","profile"]', 1, 1),
('Admin', 'Admin without role management', '["dashboard","production_planning","products","production_department","my_assignments","work_history","reports","users","settings","profile"]', 1, 1),
('Shift Manager', 'Planning and production department', '["dashboard","production_planning","products","production_department","reports","profile"]', 1, 1),
('Operator', 'Operator assignments only', '["dashboard","my_assignments","work_history","profile"]', 1, 1);

INSERT INTO `products` (`name`, `density`) VALUES
('BOPP', 0.9100),
('PET', 1.3900),
('MET PET', 1.4000),
('CPP', 0.9000),
('BOPET', 1.4000);
INSERT INTO `departments` (`name`) VALUES ('Slitting'), ('Coating'), ('Lamination'), ('Metallizing'), ('Printing');
INSERT INTO `parties` (`name`) VALUES ('Gopal Weffer'), ('Samart Weffer'), ('Rajesh Packaging'), ('Sunrise Films'), ('Metro Poly'), ('Global Plastics');
INSERT INTO `machines` (`name`, `department_id`) VALUES ('Machine_01', 1), ('Machine_02', 2), ('Machine_03', 3), ('Machine_04', 1), ('Machine_05', 4);
INSERT INTO `shifts` (`name`, `start_time`, `end_time`) VALUES ('Day Shift', '08:00:00', '20:00:00'), ('Night Shift', '20:00:00', '08:00:00');

INSERT INTO `production_plans` (
  `planning_number`, `product_id`, `department_id`,
  `width_mm`, `thickness_micron`, `density`, `weight_kg`, `calculated_length`,
  `apply_scrapping`, `scrap_width_cm`, `scrap_weight_kg`, `scrap_length_m`, `scrap_percentage`,
  `total_input_kg`, `total_expected_kg`, `waste_kg`, `waste_percentage`, `productivity_pct`, `net_length_m`,
  `status`, `plan_date`, `created_by`
) VALUES
('P_20260824_001', 1, 1, 1000.00, 12.00, 1.3900, 500.000, 29976.02, 1, 10.00, 2.000, 119.90, 0.4000, 500.000, 498.000, 2.000, 0.4000, 99.6000, 29856.12, 'Ready for Production', '2026-08-24', 1),
('P_20260824_002', 2, 2, 1250.00, 12.00, 1.4000, 400.000, 19047.62, 1, 10.00, 2.000, 95.24, 0.5000, 400.000, 398.000, 2.000, 0.5000, 99.5000, 18952.38, 'In Progress', '2026-08-24', 1),
('P_20260823_004', 1, 1, 900.00, 12.00, 1.3900, 420.000, 25179.86, 1, 10.00, 1.890, 113.31, 0.4500, 420.000, 418.110, 1.890, 0.4500, 99.5500, 25066.55, 'Partially Completed', '2026-08-23', 1),
('P_20260822_003', 3, 3, 1100.00, 12.00, 1.4000, 350.000, 18939.39, 1, 10.00, 1.925, 104.17, 0.5500, 350.000, 348.075, 1.925, 0.5500, 99.4500, 18835.22, 'Completed', '2026-08-22', 1),
('P_20260821_002', 1, 1, 800.00, 12.00, 1.3900, 250.000, 14988.01, 1, 10.00, 1.500, 89.93, 0.6000, 250.000, 248.500, 1.500, 0.6000, 99.4000, 14898.08, 'On Hold', '2026-08-21', 1);

INSERT INTO `production_assignments` (
  `production_plan_id`, `shift_manager_id`, `shift_id`, `machine_id`, `operator_id`,
  `start_date`, `start_time`, `is_shift_change`, `status`, `created_by`
) VALUES
(1, 2, 1, 1, 5, '2026-08-24', '08:00:00', 0, 'Not Started', 1),
(1, 2, 1, 1, 7, '2026-08-24', '08:00:00', 0, 'Not Started', 1),
(2, 3, 1, 2, 5, '2026-08-24', '08:00:00', 0, 'In Progress', 1),
(3, 2, 2, 1, 5, '2026-08-23', '20:00:00', 0, 'Submitted', 1),
(4, 3, 2, 3, 5, '2026-08-22', '20:00:00', 0, 'Completed', 1),
(5, 2, 1, 1, 5, '2026-08-21', '08:00:00', 0, 'Completed', 1);

-- App settings (also auto-created by API)
CREATE TABLE IF NOT EXISTS `app_settings` (
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES
('company_name', 'Kaveri Metallising'),
('default_density', '1.39'),
('default_thickness', '12'),
('date_format', 'dd/mm/yyyy'),
('currency', 'INR'),
('report_footer', 'Kaveri Metallising — Confidential')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Performance indexes (safe to re-run)
ALTER TABLE `production_plans`
  ADD INDEX IF NOT EXISTS `idx_plans_date` (`plan_date`),
  ADD INDEX IF NOT EXISTS `idx_plans_status` (`status`),
  ADD INDEX IF NOT EXISTS `idx_plans_product` (`product_id`),
  ADD INDEX IF NOT EXISTS `idx_plans_dept` (`department_id`);

ALTER TABLE `party_allocations`
  ADD INDEX IF NOT EXISTS `idx_alloc_party` (`party_id`);

ALTER TABLE `production_assignments`
  ADD INDEX IF NOT EXISTS `idx_asg_status` (`status`),
  ADD INDEX IF NOT EXISTS `idx_asg_start` (`start_date`);

ALTER TABLE `users`
  ADD INDEX IF NOT EXISTS `idx_users_role` (`role`),
  ADD INDEX IF NOT EXISTS `idx_users_active` (`is_active`);

ALTER TABLE `production_records`
  ADD INDEX IF NOT EXISTS `idx_rec_status` (`status`);
