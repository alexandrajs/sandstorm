CREATE DATABASE `sandstorm_test_cursor`CHARACTER SET utf8 COLLATE utf8_general_ci;
USE `sandstorm_test_cursor`;
CREATE TABLE `sandstorm_test_cursor`.`Sub`( `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, `name` VARCHAR(511), `value` VARCHAR(511), PRIMARY KEY (`id`) ) ENGINE=INNODB;
CREATE TABLE `sandstorm_test_cursor`.`Base`( `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, `name` VARCHAR(511), `array` JSON, PRIMARY KEY (`id`) ) ENGINE=INNODB;
CREATE TABLE `sandstorm_test_cursor`.`Collated`( `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, `name` VARCHAR(511), `array` JSON, PRIMARY KEY (`id`) ) ENGINE=INNODB;
